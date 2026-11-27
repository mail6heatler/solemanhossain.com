// Settings → backups, recycle bin, settings history, login protection, two-step login, Telegram alerts, spam control,
// clean-up and the health check (2026-11-27). Server only. The switches are settings.ops (lib/ops.ts); private values are
// in the `secrets` table, never in the settings document.
import { createHash, createHmac, randomBytes } from "crypto";
import { gunzipSync, gzipSync } from "zlib";
import { query, queryOne, type Row } from "./db";
import { getSettings } from "./data";
import type { OpsSettings } from "./ops";

// ---------- secrets ----------
export async function getSecret(key: string) { return String((await queryOne("SELECT value FROM secrets WHERE key=$1", [key]))?.value ?? ""); }
export async function setSecret(key: string, value: string) {
  await query("INSERT INTO secrets (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [key, value]);
}
export async function delSecret(key: string) { await query("DELETE FROM secrets WHERE key=$1", [key]); }

// ---------- who is asking ----------
export const ipOf = (h: Headers) => (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
/** a scrambled address: enough to recognise the same visitor again, never the address itself */
export const ipHash = (ip: string) => createHash("sha256").update(`${process.env.AUTH_SECRET ?? ""}:${ip}`).digest("hex").slice(0, 24);
/** the first half of an address, to tell your own logins apart from a stranger's */
export const ipHint = (ip: string) => (ip.includes(".") ? ip.split(".").slice(0, 2).join(".") + ".•.•" : ip.includes(":") ? ip.split(":").slice(0, 2).join(":") + ":…" : ip);

// ---------- backups ----------
const TABLES = ["sections", "items", "messages", "comments", "reactions", "votes"] as const;
type Snapshot = { version: 1; createdAt: string; settings: unknown; tables: Record<string, Row[]> };

async function snapshot(): Promise<Snapshot> {
  const settings = await queryOne("SELECT data FROM settings WHERE id=1");
  const tables: Record<string, Row[]> = {};
  for (const t of TABLES) tables[t] = await query(`SELECT * FROM ${t}`);
  let data: unknown = {};
  try { data = JSON.parse(String(settings?.data ?? "{}")); } catch { /* */ }
  return { version: 1, createdAt: new Date().toISOString(), settings: data, tables };
}
const summaryOf = (s: Snapshot) => `${s.tables.sections?.length ?? 0} sections · ${s.tables.items?.length ?? 0} entries · ${s.tables.messages?.length ?? 0} messages · ${s.tables.comments?.length ?? 0} comments`;

export async function makeBackup(kind: "auto" | "manual" | "before-restore") {
  const snap = await snapshot();
  const raw = JSON.stringify(snap);
  const data = gzipSync(Buffer.from(raw)).toString("base64");
  await query("INSERT INTO backups (kind, size, summary, data) VALUES ($1,$2,$3,$4)", [kind, raw.length, summaryOf(snap), data]);
  const keep = (await getSettings()).ops.backups.keep;
  // automatic ones beyond the number kept are removed; ones you made by hand and safety copies keep their own 10
  await query(`DELETE FROM backups WHERE kind='auto' AND id NOT IN (SELECT id FROM backups WHERE kind='auto' ORDER BY id DESC LIMIT ${Math.round(keep)})`);
  await query("DELETE FROM backups WHERE kind<>'auto' AND id NOT IN (SELECT id FROM backups WHERE kind<>'auto' ORDER BY id DESC LIMIT 10)");
}
export async function listBackups() {
  return (await query("SELECT id, created_at, kind, size, summary FROM backups ORDER BY id DESC LIMIT 60")).map((r) => ({
    id: Number(r.id), at: new Date(r.created_at).toISOString(), kind: String(r.kind), size: Number(r.size), summary: String(r.summary),
  }));
}
export async function backupJson(id: number) {
  const r = await queryOne("SELECT data FROM backups WHERE id=$1", [id]);
  return r ? gunzipSync(Buffer.from(String(r.data), "base64")).toString() : null;
}

/** what a backup or exported file holds, read without changing anything */
export function readSnapshot(raw: unknown): { ok: true; snap: Snapshot; summary: string } | { ok: false; error: string } {
  const o = (raw && typeof raw === "object" ? raw : null) as Record<string, unknown> | null;
  if (!o) return { ok: false, error: "That file isn't a backup of this site." };
  // a backup made here, or the older Export file (settings, sections, items, messages, comments at the top)
  const tables: Record<string, Row[]> = {};
  const src = (o.tables && typeof o.tables === "object" ? o.tables : o) as Record<string, unknown>;
  for (const t of TABLES) if (Array.isArray(src[t])) tables[t] = src[t] as Row[];
  if (!tables.sections || !tables.items) return { ok: false, error: "That file has no sections or entries, so it isn't a backup of this site." };
  const snap: Snapshot = { version: 1, createdAt: String(o.createdAt ?? o.exportedAt ?? ""), settings: o.settings ?? null, tables };
  return { ok: true, snap, summary: summaryOf(snap) };
}

const columnsCache = new Map<string, Set<string>>();
async function columnsOf(t: string) {
  if (!columnsCache.has(t)) columnsCache.set(t, new Set((await query("SELECT column_name FROM information_schema.columns WHERE table_name=$1", [t])).map((r) => String(r.column_name))));
  return columnsCache.get(t)!;
}
async function insertRows(t: string, rows: Row[]) {
  const cols = await columnsOf(t);
  for (const row of rows) {
    const keys = Object.keys(row).filter((k) => cols.has(k));
    if (!keys.length) continue;
    const vals = keys.map((k) => { const v = row[k]; return v !== null && typeof v === "object" && !(v instanceof Date) ? JSON.stringify(v) : v; });
    await query(`INSERT INTO ${t} (${keys.join(",")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(",")}) ON CONFLICT DO NOTHING`, vals);
  }
}
async function fixCounters() {
  for (const t of ["sections", "items", "messages", "comments"]) {
    await query(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM ${t}), 0), 1))`);
  }
}

/** puts everything back as a backup had it. A safety copy of what's there now is made first, so this can be undone. */
export async function restoreSnapshot(snap: Snapshot, withSettings: boolean) {
  await makeBackup("before-restore");
  for (const t of ["comments", "reactions", "votes", "messages", "items", "sections"]) if (snap.tables[t]) await query(`DELETE FROM ${t}`);
  for (const t of TABLES) if (snap.tables[t]) await insertRows(t, snap.tables[t]);
  await fixCounters();
  if (withSettings && snap.settings && typeof snap.settings === "object") {
    // your security switches stay as they are now: an old backup must not switch off two-step login or let a lockout lapse
    const cur = await queryOne("SELECT data FROM settings WHERE id=1");
    let now: Record<string, unknown> = {};
    try { now = JSON.parse(String(cur?.data ?? "{}")); } catch { /* */ }
    await query("UPDATE settings SET data=$1 WHERE id=1", [JSON.stringify({ ...(snap.settings as object), ops: now.ops, adminUsername: now.adminUsername ?? (snap.settings as Record<string, unknown>).adminUsername })]);
  }
}

// ---------- recycle bin ----------
/** keeps what's about to be deleted for a while (settings.ops.bin). Call it just before the DELETE. */
export async function toBin(kind: "entry" | "section" | "chat" | "message" | "comment", label: string, tables: Record<string, Row[]>) {
  const s = await getSettings();
  if (!s.ops.bin.on) return;
  if (!Object.values(tables).some((r) => r.length)) return;
  await query("INSERT INTO bin (kind, label, data) VALUES ($1,$2,$3)", [kind, label.slice(0, 160), JSON.stringify(tables)]);
}
export async function binItems(ids: number[]) {
  for (const id of ids) {
    const items = await query("SELECT * FROM items WHERE id=$1", [id]);
    if (!items.length) continue;
    const [comments, reactions, votes] = await Promise.all(["comments", "reactions", "votes"].map((t) => query(`SELECT * FROM ${t} WHERE item_id=$1`, [id])));
    await toBin("entry", String(items[0].title || "Untitled entry"), { items, comments, reactions, votes });
  }
}
export async function binSection(id: number) {
  const sections = await query("SELECT * FROM sections WHERE id=$1", [id]);
  if (!sections.length) return;
  const items = await query("SELECT * FROM items WHERE section_id=$1", [id]);
  const ids = items.map((r) => Number(r.id));
  const kids = ids.length ? await Promise.all(["comments", "reactions", "votes"].map((t) => query(`SELECT * FROM ${t} WHERE item_id = ANY($1::int[])`, [ids]))) : [[], [], []];
  await toBin("section", `${sections[0].title || "Section"} (${items.length} entries)`, { sections, items, comments: kids[0], reactions: kids[1], votes: kids[2] });
}
export async function binWhere(kind: "chat" | "message" | "comment", table: "messages" | "comments", where: string, params: unknown[], label: (rows: Row[]) => string) {
  const s = await getSettings();
  if (!s.ops.bin.on) return;
  const rows = await query(`SELECT * FROM ${table} WHERE ${where}`, params);
  if (rows.length) await toBin(kind, label(rows), { [table]: rows });
}
export async function listBin() {
  return (await query("SELECT id, kind, label, deleted_at FROM bin ORDER BY id DESC LIMIT 200")).map((r) => ({ id: Number(r.id), kind: String(r.kind), label: String(r.label), at: new Date(r.deleted_at).toISOString() }));
}
export async function restoreBin(id: number): Promise<string | null> {
  const r = await queryOne("SELECT data FROM bin WHERE id=$1", [id]);
  if (!r) return "That's no longer in the bin.";
  const t = JSON.parse(String(r.data)) as Record<string, Row[]>;
  if (t.items?.length && !t.sections?.length) {
    const sec = await queryOne("SELECT id FROM sections WHERE id=$1", [t.items[0].section_id]);
    if (!sec) return "Its section was deleted too. Restore the section first.";
  }
  for (const k of TABLES) if (t[k]?.length) await insertRows(k, t[k]);
  await fixCounters();
  await query("DELETE FROM bin WHERE id=$1", [id]);
  return null;
}

// ---------- settings history ----------
/** keeps a copy of the settings as they are, before a save changes them (settings.ops.history) */
export async function historyPush(label: string) {
  const cur = await queryOne("SELECT data FROM settings WHERE id=1");
  let ops: OpsSettings | null = null;
  try { ops = JSON.parse(String(cur?.data ?? "{}")).ops ?? null; } catch { /* */ }
  if (ops && ops.history && ops.history.on === false) return;
  const keep = Math.min(100, Math.max(10, Number(ops?.history?.keep ?? 30)));
  const last = await queryOne("SELECT data, created_at FROM settings_history ORDER BY id DESC LIMIT 1");
  // several saves within two minutes count as one change, and an unchanged copy isn't kept twice
  if (last && (String(last.data) === String(cur?.data ?? "") || Date.now() - new Date(last.created_at).getTime() < 120_000)) return;
  await query("INSERT INTO settings_history (label, data) VALUES ($1,$2)", [label.slice(0, 80), String(cur?.data ?? "{}")]);
  await query(`DELETE FROM settings_history WHERE id NOT IN (SELECT id FROM settings_history ORDER BY id DESC LIMIT ${Math.round(keep)})`);
}
export async function listHistory() {
  return (await query("SELECT id, created_at, label, LENGTH(data) AS size FROM settings_history ORDER BY id DESC LIMIT 100")).map((r) => ({ id: Number(r.id), at: new Date(r.created_at).toISOString(), label: String(r.label), size: Number(r.size) }));
}
export async function restoreHistory(id: number) {
  const r = await queryOne("SELECT data FROM settings_history WHERE id=$1", [id]);
  if (!r) return false;
  const cur = await queryOne("SELECT data FROM settings WHERE id=1");
  let old: Record<string, unknown> = {}, now: Record<string, unknown> = {};
  try { old = JSON.parse(String(r.data)); now = JSON.parse(String(cur?.data ?? "{}")); } catch { return false; }
  await query("INSERT INTO settings_history (label, data) VALUES ($1,$2)", ["Before going back", String(cur?.data ?? "{}")]);
  // security switches and the login name stay as they are now
  await query("UPDATE settings SET data=$1 WHERE id=1", [JSON.stringify({ ...old, ops: now.ops, adminUsername: now.adminUsername })]);
  return true;
}

// ---------- login protection ----------
export async function loginBlocked(ipH: string): Promise<number> {
  const o = (await getSettings()).ops.lockout;
  if (!o.on) return 0;
  const r = await queryOne(`SELECT COUNT(*)::int AS n, MIN(at) AS first FROM (SELECT at FROM login_log WHERE ip_hash=$1 AND NOT ok AND at > NOW() - ($2 || ' minutes')::interval ORDER BY at DESC LIMIT $3) x`, [ipH, String(o.minutes), o.tries]);
  if (Number(r?.n ?? 0) < o.tries) return 0;
  const waited = (Date.now() - new Date(r!.first).getTime()) / 60000;
  return Math.max(1, Math.ceil(o.minutes - waited));
}
export async function logLogin(ok: boolean, ip: string, device: string, note = "") {
  const s = await getSettings();
  // failed tries are always kept a while, because the lockout counts them; successful ones only with the history switch on
  if (ok && !s.ops.loginLog.on) return;
  await query("INSERT INTO login_log (ok, ip_hash, ip_hint, device, note) VALUES ($1,$2,$3,$4,$5)", [ok, ipHash(ip), ipHint(ip), device.slice(0, 60), note.slice(0, 80)]);
}
export async function listLogins() {
  const s = await getSettings();
  return (await query(`SELECT at, ok, ip_hint, device, note FROM login_log ${s.ops.loginLog.on ? "" : "WHERE NOT ok"} ORDER BY id DESC LIMIT 40`)).map((r) => ({ at: new Date(r.at).toISOString(), ok: !!r.ok, ip: String(r.ip_hint), device: String(r.device), note: String(r.note) }));
}

// ---------- two-step login (codes from an authenticator app, RFC 6238) ----------
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function newTotpSecret() {
  const bytes = randomBytes(20);
  let bits = "", out = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}
function b32bytes(s: string) {
  let bits = "";
  for (const ch of s.replace(/=+$/, "").toUpperCase()) { const v = B32.indexOf(ch); if (v >= 0) bits += v.toString(2).padStart(5, "0"); }
  const out: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}
function totp(secret: string, step: number) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(step));
  const h = createHmac("sha1", b32bytes(secret)).update(msg).digest();
  const o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000)).padStart(6, "0");
}
/** a code is good for its 30 seconds and the ones either side, for a phone whose clock is a little off */
export function totpOk(secret: string, code: string) {
  const c = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(c) || !secret) return false;
  const now = Math.floor(Date.now() / 30000);
  return [now - 1, now, now + 1].some((s) => totp(secret, s) === c);
}
const codeHash = (c: string) => createHash("sha256").update(`${process.env.AUTH_SECRET ?? ""}:rc:${c.replace(/[\s-]/g, "").toLowerCase()}`).digest("hex");
export function newRecoveryCodes() { return Array.from({ length: 8 }, () => randomBytes(5).toString("hex").replace(/(.{5})/, "$1-")); }
export const hashCodes = (codes: string[]) => JSON.stringify(codes.map(codeHash));
/** a recovery code works once */
export async function useRecoveryCode(code: string) {
  let list: string[] = [];
  try { list = JSON.parse(await getSecret("2fa_codes")); } catch { /* */ }
  const h = codeHash(code), i = list.indexOf(h);
  if (i < 0) return false;
  list.splice(i, 1);
  await setSecret("2fa_codes", JSON.stringify(list));
  return true;
}

// ---------- Telegram alerts ----------
/** a message to the owner's Telegram, when that kind of alert is on; never slows down or breaks what called it */
export async function alertOwner(kind: "chat" | "comments" | "reactions", text: string) {
  try {
    const a = (await getSettings()).ops.alerts;
    if (!a.on || !a[kind]) return;
    const [token, chat] = await Promise.all([getSecret("tg_token"), getSecret("tg_chat")]);
    if (!token || !chat) return;
    await telegram(token, "sendMessage", { chat_id: chat, text: text.slice(0, 3500), disable_web_page_preview: true });
    await setSecret("tg_last", new Date().toISOString());
  } catch { /* an alert that can't be sent is skipped */ }
}
export async function telegram(token: string, method: string, body: object) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
  return (await r.json().catch(() => ({}))) as { ok?: boolean; result?: unknown; description?: string };
}

// ---------- spam control ----------
export async function spamVerdict(text: string, ipH: string, conv: string | null): Promise<"ok" | "blocked" | "words" | "busy"> {
  const s = (await getSettings()).ops.spam;
  let blocked: string[] = [];
  try { blocked = JSON.parse((await getSecret("blocked")) || "[]"); } catch { /* */ }
  if (blocked.includes(ipH) || (conv && blocked.includes(conv))) return "blocked";
  if (!s.on) return "ok";
  const words = (await getSecret("spam_words")).split(/[\n,]/).map((w) => w.trim().toLowerCase()).filter(Boolean);
  const low = text.toLowerCase();
  if (words.some((w) => low.includes(w))) return "words";
  const n = await queryOne("SELECT COUNT(*)::int AS n FROM messages WHERE ip_hash=$1 AND NOT from_owner AND created_at > NOW() - INTERVAL '1 hour'", [ipH]);
  if (Number(n?.n ?? 0) >= s.perHour) return "busy";
  return "ok";
}

// ---------- housekeeping: automatic backups and clean-up, at most every 10 minutes, after a response ----------
const g = globalThis as unknown as { __lcHk?: number };
export async function housekeeping() {
  if (g.__lcHk && Date.now() - g.__lcHk < 600_000) return;
  g.__lcHk = Date.now();
  try {
    const o = (await getSettings()).ops;
    if (o.backups.on) {
      const last = await queryOne("SELECT created_at FROM backups WHERE kind='auto' ORDER BY id DESC LIMIT 1");
      const every = o.backups.every === "week" ? 7 * 86400_000 : 86400_000;
      if (!last || Date.now() - new Date(last.created_at).getTime() > every) await makeBackup("auto");
    }
    await query(`DELETE FROM bin WHERE deleted_at < NOW() - ($1 || ' days')::interval`, [String(o.bin.days)]);
    await query("DELETE FROM login_log WHERE id NOT IN (SELECT id FROM login_log ORDER BY id DESC LIMIT 500)");
    await query("DELETE FROM sessions WHERE revoked OR last_seen < NOW() - INTERVAL '45 days'");
    await dailyChecks(); // the Overview's broken-picture scan and speed test, once a day
    if (o.cleanup.on) {
      const old = "created_at < NOW() - ($1 || ' months')::interval";
      await binWhere("chat", "messages", old, [String(o.cleanup.months)], (rows) => `Old messages cleaned up (${rows.length})`);
      await query(`DELETE FROM messages WHERE ${old}`, [String(o.cleanup.months)]);
    }
  } catch (e) { console.error("housekeeping", e); }
}

// ---------- pictures ----------
const PIC = /(https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/[^"'\s)\\]+|\/media\/[0-9a-f]{32})/gi;
/** every uploaded file the site uses, with where it's used */
export async function allPictures() {
  const out = new Map<string, string>();
  const s = await queryOne("SELECT data FROM settings WHERE id=1");
  for (const m of String(s?.data ?? "").match(PIC) ?? []) if (!out.has(m)) out.set(m, "Settings, hero or a theme");
  const items = await query("SELECT i.id, i.title, s.title AS section, i.* FROM items i JOIN sections s ON s.id = i.section_id");
  for (const it of items) {
    const where = `${it.section}: ${it.title || "Untitled"}`;
    for (const m of JSON.stringify(it).match(PIC) ?? []) if (!out.has(m)) out.set(m, where);
  }
  return [...out].map(([url, where]) => ({ url, where, name: decodeURIComponent(url.split("/").pop() || "file").replace(/-[A-Za-z0-9]{20,}(?=\.)/, "") }));
}

// ---------- health check ----------
export async function healthCheck() {
  const t0 = Date.now();
  await queryOne("SELECT 1");
  const dbMs = Date.now() - t0;
  const [files, counts] = await Promise.all([
    queryOne("SELECT COUNT(*)::int AS n, COALESCE(SUM(size),0)::bigint AS bytes FROM files"),
    queryOne("SELECT (SELECT COUNT(*) FROM sections)::int AS sections, (SELECT COUNT(*) FROM items)::int AS items, (SELECT COUNT(*) FROM messages)::int AS messages, (SELECT COUNT(*) FROM backups)::int AS backups"),
  ]);
  const pics = await allPictures();
  const local = new Set((await query("SELECT id FROM files")).map((r) => `/media/${r.id}`));
  const broken: { url: string; where: string }[] = [];
  const blobs = pics.filter((p) => p.url.startsWith("https://")).slice(0, 300);
  for (const p of pics) if (p.url.startsWith("/media/") && !local.has(p.url)) broken.push(p);
  let i = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (i < blobs.length) {
      const p = blobs[i++];
      try { const r = await fetch(p.url, { method: "HEAD", signal: AbortSignal.timeout(6000) }); if (r.status === 404 || r.status === 410) broken.push(p); }
      catch { /* a timeout isn't proof it's gone */ }
    }
  }));
  const c = (k: string) => Number((counts as Row | null)?.[k] ?? 0);
  return { dbMs, files: Number(files?.n ?? 0), mb: Number(files?.bytes ?? 0) / 1048576, sections: c("sections"), items: c("items"), messages: c("messages"), backups: c("backups"), pictures: pics.length, checked: blobs.length, broken };
}

// ---------- private mode: the token a visitor keeps after typing the password (checked before the first paint by skinScript) ----------
export const unlockToken = (storedHash: string) => createHmac("sha256", process.env.AUTH_SECRET ?? "dev").update(`unlock:${storedHash}`).digest("hex");
export const unlockHashFor = (storedHash: string) => createHash("sha256").update(unlockToken(storedHash)).digest("hex");

// ---------- the Overview's live cards (components/admin/LiveCards.tsx): daily checks kept here, refreshed by housekeeping ----------
export type HealthLast = { at: string; pictures: number; checked: number; broken: { url: string; where: string }[] };
export type SpeedLast = { at: string; score: number; lcp: string; fcp: string; tbt: string };
export async function scanHealth() {
  const h = await healthCheck();
  const last: HealthLast = { at: new Date().toISOString(), pictures: h.pictures, checked: h.checked, broken: h.broken.slice(0, 50) };
  await setSecret("health_last", JSON.stringify(last));
  return last;
}
/** Google's free speed test of the homepage on a phone (PageSpeed Insights); about 20–40 seconds */
export async function speedTest(): Promise<SpeedLast | null> {
  const site = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!site) return null;
  try {
    const r = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(`https://${site}`)}&strategy=mobile&category=performance`, { signal: AbortSignal.timeout(55_000) });
    const lh = ((await r.json()) as { lighthouseResult?: { categories: { performance: { score: number } }; audits: Record<string, { displayValue?: string }> } }).lighthouseResult;
    if (!lh) return null;
    const last: SpeedLast = { at: new Date().toISOString(), score: Math.round(lh.categories.performance.score * 100), lcp: lh.audits["largest-contentful-paint"]?.displayValue ?? "", fcp: lh.audits["first-contentful-paint"]?.displayValue ?? "", tbt: lh.audits["total-blocking-time"]?.displayValue ?? "" };
    await setSecret("speed_last", JSON.stringify(last));
    return last;
  } catch { return null; }
}
const readJson = <T,>(s: string): T | null => { try { return s ? (JSON.parse(s) as T) : null; } catch { return null; } };
export async function dailyChecks() {
  const day = 86400_000;
  const h = readJson<HealthLast>(await getSecret("health_last"));
  if (!h || Date.now() - new Date(h.at).getTime() > day) await scanHealth().catch(() => {});
  const s = readJson<SpeedLast>(await getSecret("speed_last"));
  if (!s || Date.now() - new Date(s.at).getTime() > day) await speedTest();
}
export async function overviewLive() {
  const s = await getSettings();
  const t0 = Date.now();
  await queryOne("SELECT 1");
  const dbMs = Date.now() - t0;
  const [files, last, bin, failed, unanswered, bot, chat, tgLast, health, speed] = await Promise.all([
    queryOne("SELECT COALESCE(SUM(size),0)::bigint AS bytes FROM files"),
    queryOne("SELECT created_at FROM backups ORDER BY id DESC LIMIT 1"),
    queryOne("SELECT COUNT(*)::int AS n FROM bin"),
    queryOne("SELECT COUNT(*)::int AS n FROM login_log WHERE NOT ok AND at > NOW() - INTERVAL '1 day'"),
    // chats where the visitor wrote last (older messages from before replies existed can't be answered on the site)
    queryOne("SELECT COUNT(*)::int AS n FROM (SELECT DISTINCT ON (conv) from_owner FROM messages WHERE conv IS NOT NULL ORDER BY conv, created_at DESC) t WHERE NOT from_owner"),
    getSecret("tg_bot"), getSecret("tg_chat"), getSecret("tg_last"), getSecret("health_last"), getSecret("speed_last"),
  ]);
  const o = s.ops;
  return {
    at: new Date().toISOString(), dbMs, mb: Number(files?.bytes ?? 0) / 1048576,
    lastBackup: last ? new Date(last.created_at).toISOString() : null, backups: o.backups,
    twoStep: o.twoStep.on, lockout: o.lockout.on, bin: Number(bin?.n ?? 0), failed: Number(failed?.n ?? 0),
    status: { maintenance: o.maintenance.on, private: o.private.on, noindex: o.noindex },
    unanswered: Number(unanswered?.n ?? 0),
    alerts: { on: o.alerts.on, connected: !!(bot && chat), last: tgLast || null },
    health: readJson<HealthLast>(health), speed: readJson<SpeedLast>(speed),
  };
}
export type OverviewLive = Awaited<ReturnType<typeof overviewLive>>;
