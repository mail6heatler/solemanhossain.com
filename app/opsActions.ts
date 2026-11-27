"use server";
// Settings → the buttons and switches added on 2026-11-27 (lib/ops.ts, lib/opsServer.ts). Every one checks the login first.
import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { getSettings } from "@/lib/data";
import { checkCurrentPassword, currentSid, hashPassword, requireAdmin } from "@/lib/auth";
import { cleanOps, type OpsSettings } from "@/lib/ops";
import {
  allPictures, delSecret, getSecret, hashCodes, healthCheck, historyPush, makeBackup, newRecoveryCodes, newTotpSecret, readSnapshot,
  restoreBin, restoreHistory, restoreSnapshot, setSecret, telegram, totpOk,
} from "@/lib/opsServer";
import { chatWhere } from "@/lib/chat";
import { overviewLive as overviewLiveData, scanHealth as scanHealthNow, speedTest as speedTestNow } from "@/lib/opsServer";

type R = { ok: true; note?: string } | { ok: false; error: string };
const refresh = () => revalidatePath("/", "layout");
const fail = (error: string): R => ({ ok: false, error });

async function patchSettings(patch: Record<string, unknown>, label: string) {
  await historyPush(label).catch(() => {});
  const cur = await queryOne("SELECT data FROM settings WHERE id=1");
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(String(cur?.data ?? "{}")); } catch { /* */ }
  await query("UPDATE settings SET data=$1 WHERE id=1", [JSON.stringify({ ...data, ...patch })]);
}

/** every switch and option on the Settings tabs, and the time zone */
export async function saveOps(raw: OpsSettings, timezone?: string): Promise<R> {
  await requireAdmin();
  try {
    const ops = cleanOps(raw);
    const cur = await getSettings();
    // two-step login is switched on by setting it up, and off with the password (twoStepOff), never by this form
    ops.twoStep.on = cur.ops.twoStep.on;
    const patch: Record<string, unknown> = { ops };
    if (typeof timezone === "string" && timezone && isZone(timezone)) patch.timezone = timezone;
    await patchSettings(patch, "Settings saved");
    refresh();
    return { ok: true };
  } catch (e) { console.error("saveOps", e); return fail("That didn't save. Nothing was lost: try Save again."); }
}
const isZone = (z: string) => { try { new Intl.DateTimeFormat("en", { timeZone: z }); return true; } catch { return false; } };

// ---------- backups ----------
export async function backupNow(): Promise<R> { await requireAdmin(); await makeBackup("manual"); return { ok: true, note: "Backup made." }; }
export async function deleteBackup(id: number): Promise<R> { await requireAdmin(); await query("DELETE FROM backups WHERE id=$1", [Number(id)]); return { ok: true }; }
export async function restoreBackup(id: number, withSettings: boolean): Promise<R> {
  await requireAdmin();
  const r = await queryOne("SELECT data FROM backups WHERE id=$1", [Number(id)]);
  if (!r) return fail("That backup is gone.");
  const { gunzipSync } = await import("zlib");
  let json: unknown;
  try { json = JSON.parse(gunzipSync(Buffer.from(String(r.data), "base64")).toString()); } catch { return fail("That backup can't be read."); }
  const s = readSnapshot(json);
  if (!s.ok) return fail(s.error);
  await restoreSnapshot(s.snap, withSettings);
  refresh();
  return { ok: true, note: `Restored: ${s.summary}. A copy of how it was just before is in the list.` };
}

// ---------- recycle bin ----------
export async function binRestore(id: number): Promise<R> {
  await requireAdmin();
  const err = await restoreBin(Number(id));
  if (err) return fail(err);
  refresh();
  return { ok: true, note: "Put back." };
}
export async function binDelete(id: number): Promise<R> { await requireAdmin(); await query("DELETE FROM bin WHERE id=$1", [Number(id)]); return { ok: true }; }
export async function binEmpty(): Promise<R> { await requireAdmin(); await query("DELETE FROM bin"); return { ok: true, note: "The bin is empty." }; }

// ---------- settings history ----------
export async function historyGoBack(id: number): Promise<R> {
  await requireAdmin();
  if (!(await restoreHistory(Number(id)))) return fail("That copy can't be read.");
  refresh();
  return { ok: true, note: "Your settings are back as they were then. How they were a moment ago is now at the top of the list." };
}

// ---------- devices ----------
export async function signOutDevice(sid: string): Promise<R> {
  await requireAdmin();
  if (sid === (await currentSid())) return fail("That's this device. Use Log out instead.");
  await query("UPDATE sessions SET revoked=true WHERE sid=$1", [String(sid)]);
  return { ok: true, note: "That device is signed out." };
}

// ---------- two-step login ----------
export async function twoStepStart(): Promise<{ ok: true; secret: string; uri: string } | { ok: false; error: string }> {
  await requireAdmin();
  const s = await getSettings();
  const secret = newTotpSecret();
  await setSecret("2fa_pending", secret);
  const label = encodeURIComponent(`${s.nickname || s.fullName} site:${s.adminUsername}`);
  return { ok: true, secret, uri: `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(`${s.nickname || "My"} site`)}&period=30&digits=6` };
}
export async function twoStepConfirm(code: string): Promise<{ ok: true; codes: string[] } | { ok: false; error: string }> {
  await requireAdmin();
  const pending = await getSecret("2fa_pending");
  if (!pending) return { ok: false, error: "Start again: press Set up two-step login." };
  if (!totpOk(pending, code)) return { ok: false, error: "That code didn't match. Type the 6 digits showing in the app now." };
  const codes = newRecoveryCodes();
  await setSecret("2fa_secret", pending);
  await setSecret("2fa_codes", hashCodes(codes));
  await delSecret("2fa_pending");
  const s = await getSettings();
  await patchSettings({ ops: { ...s.ops, twoStep: { on: true } } }, "Two-step login switched on");
  return { ok: true, codes };
}
export async function twoStepOff(password: string): Promise<R> {
  await requireAdmin();
  if (!(await checkCurrentPassword(String(password)))) return fail("That password is wrong.");
  await delSecret("2fa_secret"); await delSecret("2fa_codes");
  const s = await getSettings();
  await patchSettings({ ops: { ...s.ops, twoStep: { on: false } } }, "Two-step login switched off");
  return { ok: true, note: "Two-step login is off. Signing in needs only your password again." };
}
export async function twoStepNewCodes(password: string): Promise<{ ok: true; codes: string[] } | { ok: false; error: string }> {
  await requireAdmin();
  if (!(await checkCurrentPassword(String(password)))) return { ok: false, error: "That password is wrong." };
  const codes = newRecoveryCodes();
  await setSecret("2fa_codes", hashCodes(codes));
  return { ok: true, codes };
}

// ---------- private mode's password ----------
export async function setPrivatePassword(pw: string): Promise<R> {
  await requireAdmin();
  const p = String(pw ?? "");
  if (p.length < 4) return fail("Use at least 4 characters.");
  await setSecret("private_pw", hashPassword(p));
  refresh();
  return { ok: true, note: "Saved. Visitors who unlocked the site before need the new password." };
}

// ---------- Telegram alerts ----------
export async function telegramToken(token: string): Promise<R> {
  await requireAdmin();
  const t = String(token ?? "").trim();
  if (!/^\d{5,}:[\w-]{20,}$/.test(t)) return fail("That doesn't look like a bot token. It looks like 123456789:AAH… and comes from @BotFather.");
  const me = await telegram(t, "getMe", {}).catch(() => ({ ok: false } as { ok?: boolean; result?: unknown }));
  if (!me.ok) return fail("Telegram didn't accept that token. Copy it again from @BotFather.");
  await setSecret("tg_token", t);
  const name = (me.result as { username?: string })?.username ?? "your bot";
  await setSecret("tg_bot", name);
  return { ok: true, note: `Connected to @${name}. Now open it in Telegram, press Start (or send any message), then press Find my chat.` };
}
export async function telegramFindChat(): Promise<R> {
  await requireAdmin();
  const t = await getSecret("tg_token");
  if (!t) return fail("Add the bot's token first.");
  const u = await telegram(t, "getUpdates", { limit: 20 }).catch(() => ({ ok: false } as { ok?: boolean; result?: unknown }));
  const list = (Array.isArray(u.result) ? u.result : []) as { message?: { chat?: { id?: number; first_name?: string } } }[];
  const chat = [...list].reverse().find((x) => x.message?.chat?.id)?.message?.chat;
  if (!chat?.id) return fail("No message found yet. Open your bot in Telegram, press Start, then try again.");
  await setSecret("tg_chat", String(chat.id));
  await telegram(t, "sendMessage", { chat_id: chat.id, text: "✅ Your website will tell you here when someone writes, comments or reacts (whichever you switched on)." });
  return { ok: true, note: `Found your chat${chat.first_name ? ` (${chat.first_name})` : ""}. A welcome message is on its way.` };
}
export async function telegramTest(): Promise<R> {
  await requireAdmin();
  const [t, c] = await Promise.all([getSecret("tg_token"), getSecret("tg_chat")]);
  if (!t || !c) return fail("Connect your bot and find your chat first.");
  const r = await telegram(t, "sendMessage", { chat_id: c, text: "🔔 Test from your website's dashboard. Alerts work!" }).catch(() => ({ ok: false }));
  return r.ok ? { ok: true, note: "Sent. Check Telegram." } : fail("Telegram didn't take it. Try Find my chat again.");
}
export async function telegramForget(): Promise<R> {
  await requireAdmin();
  for (const k of ["tg_token", "tg_chat", "tg_bot"]) await delSecret(k);
  return { ok: true, note: "Telegram is disconnected." };
}

// ---------- spam control ----------
export async function saveSpamWords(words: string): Promise<R> {
  await requireAdmin();
  await setSecret("spam_words", String(words ?? "").slice(0, 4000));
  return { ok: true, note: "Saved." };
}
async function blockedList(): Promise<string[]> { try { return JSON.parse((await getSecret("blocked")) || "[]"); } catch { return []; } }
/** from the Inbox: this chat's visitor can't send messages or comments any more (their chat and their address) */
export async function blockChat(chat: string): Promise<R> {
  await requireAdmin();
  const w = chatWhere(String(chat ?? "").slice(0, 80));
  if (!w) return fail("That chat can't be blocked.");
  const rows = await query(`SELECT DISTINCT conv, ip_hash, name FROM messages WHERE ${w[0]} AND NOT from_owner`, [w[1]]);
  if (!rows.length) return fail("There's nothing from a visitor in that chat.");
  const list = await blockedList();
  for (const r of rows) for (const v of [r.conv, r.ip_hash]) if (v && !list.includes(String(v))) list.push(String(v));
  await setSecret("blocked", JSON.stringify(list.slice(-500)));
  const names = JSON.parse((await getSecret("blocked_names")) || "{}") as Record<string, string>;
  for (const r of rows) for (const v of [r.conv, r.ip_hash]) if (v) names[String(v)] = String(r.name);
  await setSecret("blocked_names", JSON.stringify(names));
  return { ok: true, note: `${rows[0].name} is blocked. Unblock them under Settings → Visitors & messages.` };
}
export async function unblock(key: string): Promise<R> {
  await requireAdmin();
  const names = JSON.parse((await getSecret("blocked_names")) || "{}") as Record<string, string>;
  const who = names[key];
  // the same person's chat and address go together
  const drop = new Set(Object.keys(names).filter((k) => k === key || (who && names[k] === who)));
  drop.add(key);
  await setSecret("blocked", JSON.stringify((await blockedList()).filter((k) => !drop.has(k))));
  for (const k of drop) delete names[k];
  await setSecret("blocked_names", JSON.stringify(names));
  return { ok: true, note: "Unblocked." };
}

// ---------- tools ----------
export async function refreshSite(): Promise<R> { await requireAdmin(); refresh(); return { ok: true, note: "Every page is being made fresh. Visitors see the new version on their next visit." }; }
export async function runHealthCheck() { await requireAdmin(); return healthCheck(); }
export async function pictureList() { await requireAdmin(); return allPictures(); }

const DANGER: Record<string, { sql: string[]; note: string }> = {
  reactions: { sql: ["DELETE FROM reactions"], note: "Every reaction is cleared." },
  votes: { sql: ["DELETE FROM votes"], note: "Every poll vote is cleared." },
  messages: { sql: ["DELETE FROM messages"], note: "Every chat and message is deleted." },
  comments: { sql: ["DELETE FROM comments"], note: "Every comment is deleted." },
  stats: { sql: ["DELETE FROM stats_daily", "DELETE FROM section_views", "DELETE FROM presence"], note: "Visitor numbers start again from zero." },
};
/** the danger zone: each needs the word DELETE typed, and a backup is made first (except for visitor numbers, which aren't in backups) */
export async function dangerZone(op: string, typed: string): Promise<R> {
  await requireAdmin();
  const d = DANGER[op];
  if (!d) return fail("Unknown action.");
  if (String(typed).trim().toUpperCase() !== "DELETE") return fail("Type DELETE to confirm.");
  if (op !== "stats") await makeBackup("before-restore");
  for (const q of d.sql) await query(q);
  refresh();
  return { ok: true, note: d.note + (op !== "stats" ? " A backup from just before is under Backups." : "") };
}

// ---------- one box at a time: each feature saves the moment it's changed (components/admin/settings) ----------
/** one feature's switch and options (settings.ops[key]), merged into what's saved now, so two boxes saving at once can't undo each other */
export async function saveOpsGroup(key: keyof OpsSettings, value: unknown): Promise<R> {
  await requireAdmin();
  try {
    const cur = (await getSettings()).ops;
    const next = cleanOps({ ...cur, [key]: value });
    next.twoStep = cur.twoStep; // switched on by setting it up and off with the password, never from here
    if (key === "private" && next.private.on && !cur.private.on && !(await getSecret("private_pw"))) return fail("Set private mode's password first (in this box), then switch it on.");
    await patchSettings({ ops: next }, "Settings saved");
    refresh();
    return { ok: true };
  } catch (e) { console.error("saveOpsGroup", e); return fail("That didn't save. Try again."); }
}
export async function saveTimezone(tz: string): Promise<R> {
  await requireAdmin();
  if (!isZone(String(tz))) return fail("That time zone isn't known.");
  await patchSettings({ timezone: String(tz) }, "Time zone changed");
  refresh();
  return { ok: true };
}
export async function saveSiteText(siteTitle: string, siteDescription: string): Promise<R> {
  await requireAdmin();
  await patchSettings({ siteTitle: String(siteTitle ?? "").trim().slice(0, 120), siteDescription: String(siteDescription ?? "").trim().slice(0, 300) }, "Site name changed");
  refresh();
  return { ok: true };
}
export async function saveUsername(name: string): Promise<R> {
  await requireAdmin();
  const u = String(name ?? "").trim().slice(0, 60);
  if (u.length < 3) return fail("Use at least 3 characters.");
  await patchSettings({ adminUsername: u }, "Login name changed");
  return { ok: true, note: `Saved. Sign in with “${u}” from now on.` };
}

// ---------- the Overview's live cards ----------
export async function liveOverview() { await requireAdmin(); return overviewLiveData(); }
export async function healthNow() { await requireAdmin(); return scanHealthNow(); }
export async function speedNow() { await requireAdmin(); return speedTestNow(); }
