"use server";
// Settings → Tools (2026-11-27): find and replace, the link checker, unused uploads, copying a section, many entries at once.
// Every one checks the login first; anything that changes content makes a backup before it does.
import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { allPictures, binItems, makeBackup } from "@/lib/opsServer";

type R = { ok: true; note?: string } | { ok: false; error: string };
const refresh = () => revalidatePath("/", "layout");

// ---------- find and replace ----------
const FIELDS = ["title", "subtitle", "body", "category", "tags", "date_label", "status", "location", "links", "poll_options"] as const;
const FIELD_NAME: Record<string, string> = { title: "Title", subtitle: "Subtitle", body: "Story", category: "Subsection", tags: "Tags", date_label: "Date", status: "Status", location: "Place", links: "Buttons", poll_options: "Poll options" };
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export type Match = { id: number; field: string; fieldName: string; section: string; title: string; before: string; hit: string; after: string; count: number };

export async function findText(q: string, matchCase: boolean): Promise<{ ok: true; matches: Match[] } | { ok: false; error: string }> {
  await requireAdmin();
  const term = String(q ?? "");
  if (term.trim().length < 2) return { ok: false, error: "Type at least 2 letters to look for." };
  const rows = await query(`SELECT i.id, i.title AS t, s.title AS section, ${FIELDS.map((f) => `i.${f}`).join(", ")} FROM items i JOIN sections s ON s.id = i.section_id
    WHERE ${FIELDS.map((f) => `i.${f} ILIKE $1`).join(" OR ")} ORDER BY s.sort, i.sort, i.id LIMIT 400`, [`%${term}%`]);
  const re = new RegExp(esc(term), matchCase ? "g" : "gi");
  const matches: Match[] = [];
  for (const r of rows) for (const f of FIELDS) {
    const text = String(r[f] ?? ""); const all = text.match(re);
    if (!all?.length) continue;
    const at = text.search(re);
    matches.push({ id: Number(r.id), field: f, fieldName: FIELD_NAME[f], section: String(r.section), title: String(r.t || "Untitled"), before: text.slice(Math.max(0, at - 40), at), hit: text.slice(at, at + all[0].length), after: text.slice(at + all[0].length, at + all[0].length + 40), count: all.length });
  }
  return { ok: true, matches };
}

export async function replaceText(q: string, withText: string, matchCase: boolean, targets: { id: number; field: string }[]): Promise<R> {
  await requireAdmin();
  const term = String(q ?? "");
  if (term.trim().length < 2 || !Array.isArray(targets) || !targets.length) return { ok: false, error: "Nothing is ticked to change." };
  await makeBackup("before-restore");
  const re = new RegExp(esc(term), matchCase ? "g" : "gi");
  let changed = 0;
  for (const t of targets.slice(0, 400)) {
    if (!(FIELDS as readonly string[]).includes(t.field)) continue;
    const row = await queryOne(`SELECT ${t.field} AS v FROM items WHERE id=$1`, [Number(t.id)]);
    if (!row) continue;
    const before = String(row.v ?? ""), after = before.replace(re, String(withText ?? ""));
    if (after !== before) { await query(`UPDATE items SET ${t.field}=$1 WHERE id=$2`, [after, Number(t.id)]); changed++; }
  }
  refresh();
  return { ok: true, note: `Changed ${changed} place${changed === 1 ? "" : "s"}. A backup from just before is under Backups.` };
}

// ---------- link checker ----------
export type LinkReport = { url: string; where: string; status: string; bad: boolean };
export async function checkLinks(): Promise<{ checked: number; found: number; broken: LinkReport[]; blocked: LinkReport[] }> {
  await requireAdmin();
  const found = new Map<string, string>();
  const URL_RE = /https?:\/\/[^\s"'<>)\]\\]+/g;
  const skip = (u: string) => /public\.blob\.vercel-storage\.com|^https?:\/\/(localhost|127\.)/.test(u);
  const s = await queryOne("SELECT data FROM settings WHERE id=1");
  for (const u of String(s?.data ?? "").match(URL_RE) ?? []) if (!skip(u) && !found.has(u)) found.set(u, "Settings, hero, Connect or the footer");
  const items = await query("SELECT i.title, s.title AS section, i.body, i.links, i.subtitle FROM items i JOIN sections s ON s.id = i.section_id");
  for (const it of items) for (const u of `${it.body} ${it.links} ${it.subtitle}`.match(URL_RE) ?? []) {
    const clean = u.replace(/[.,;:!?]+$/, "");
    if (!skip(clean) && !found.has(clean)) found.set(clean, `${it.section}: ${it.title || "Untitled"}`);
  }
  const list = [...found].slice(0, 150), broken: LinkReport[] = [], blocked: LinkReport[] = [];
  let i = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (i < list.length) {
      const [url, where] = list[i++];
      let status = 0, err = "";
      try {
        let r = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "Mozilla/5.0 (link check)" } });
        if (r.status === 405 || r.status === 403 || r.status === 404) r = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "Mozilla/5.0 (link check)" } });
        status = r.status;
      } catch (e) { err = e instanceof Error && e.name === "TimeoutError" ? "took too long" : "couldn't be reached"; }
      // some big sites (Facebook, LinkedIn, Instagram) refuse checkers but work for people: those are listed apart
      if (err) broken.push({ url, where, status: err, bad: true });
      else if (status === 404 || status === 410 || status >= 500) broken.push({ url, where, status: status === 404 ? "page not found (404)" : status === 410 ? "gone (410)" : `server error (${status})`, bad: true });
      else if (status === 401 || status === 403 || status === 429 || status === 999) blocked.push({ url, where, status: `refuses checkers (${status})`, bad: false });
    }
  }));
  return { checked: list.length, found: found.size, broken, blocked };
}

// ---------- unused uploads ----------
export type Upload = { url: string; size: number; at: string; where: "database" | "blob" };
export async function unusedUploads(): Promise<{ ok: true; list: Upload[]; total: number } | { ok: false; error: string }> {
  await requireAdmin();
  const used = new Set((await allPictures()).map((p) => p.url));
  const out: Upload[] = [];
  for (const f of await query("SELECT id, size, created_at FROM files")) {
    const url = `/media/${f.id}`;
    if (!used.has(url)) out.push({ url, size: Number(f.size), at: new Date(f.created_at).toISOString(), where: "database" });
  }
  let total = 0;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { list } = await import("@vercel/blob");
      let cursor: string | undefined;
      for (let page = 0; page < 10; page++) {
        const r = await list({ cursor, limit: 1000 });
        for (const b of r.blobs) { total++; if (!used.has(b.url)) out.push({ url: b.url, size: b.size, at: new Date(b.uploadedAt).toISOString(), where: "blob" }); }
        if (!r.hasMore) break;
        cursor = r.cursor;
      }
    } catch (e) { console.error("unusedUploads", e); return { ok: false, error: "Your picture storage couldn't be listed right now. Try again in a minute." }; }
  }
  return { ok: true, list: out.sort((a, b) => b.size - a.size), total: total + Number((await queryOne("SELECT COUNT(*)::int AS n FROM files"))?.n ?? 0) };
}
export async function deleteUploads(urls: string[]): Promise<R> {
  await requireAdmin();
  const used = new Set((await allPictures()).map((p) => p.url));
  const safe = (Array.isArray(urls) ? urls : []).map(String).filter((u) => !used.has(u)).slice(0, 500);
  const local = safe.filter((u) => /^\/media\/[0-9a-f]{32}$/.test(u)).map((u) => u.slice(7));
  const blobs = safe.filter((u) => /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//.test(u));
  if (local.length) await query("DELETE FROM files WHERE id = ANY($1::text[])", [local]);
  if (blobs.length && process.env.BLOB_READ_WRITE_TOKEN) { const { del } = await import("@vercel/blob"); await del(blobs); }
  return { ok: true, note: `Deleted ${local.length + blobs.length} unused file${local.length + blobs.length === 1 ? "" : "s"}.` };
}

// ---------- copy a section ----------
async function cols(t: string) { return (await query("SELECT column_name FROM information_schema.columns WHERE table_name=$1 AND column_name <> 'id' ORDER BY ordinal_position", [t])).map((r) => String(r.column_name)); }
export async function copySection(id: number): Promise<R> {
  await requireAdmin();
  const src = await queryOne("SELECT slug, title FROM sections WHERE id=$1", [Number(id)]);
  if (!src) return { ok: false, error: "That section is gone." };
  let slug = `${src.slug}-copy`, n = 2;
  while (await queryOne("SELECT 1 FROM sections WHERE slug=$1", [slug])) slug = `${src.slug}-copy-${n++}`;
  const sc = await cols("sections");
  const pick = sc.map((c) => (c === "slug" ? "$2" : c === "title" ? "$3" : c === "visible" ? "FALSE" : c === "sort" ? "(SELECT COALESCE(MAX(sort), 0) + 1 FROM sections)" : c)).join(", ");
  const made = await queryOne(`INSERT INTO sections (${sc.join(", ")}) SELECT ${pick} FROM sections WHERE id=$1 RETURNING id`, [Number(id), slug, `${src.title} (copy)`]);
  const ic = await cols("items");
  await query(`INSERT INTO items (${ic.join(", ")}) SELECT ${ic.map((c) => (c === "section_id" ? "$2" : c)).join(", ")} FROM items WHERE section_id=$1 ORDER BY sort, id`, [Number(id), Number(made!.id)]);
  refresh();
  return { ok: true, note: `Made “${src.title} (copy)”. It's hidden until you show it in its Section settings.` };
}

// ---------- many entries at once ----------
export async function bulkEntries(ids: number[], op: "hide" | "show" | "move" | "delete", target?: number): Promise<R> {
  await requireAdmin();
  const list = (Array.isArray(ids) ? ids : []).map(Number).filter(Number.isInteger).slice(0, 500);
  if (!list.length) return { ok: false, error: "Tick some entries first." };
  if (op === "hide" || op === "show") await query("UPDATE items SET visible=$1 WHERE id = ANY($2::int[])", [op === "show", list]);
  else if (op === "move") {
    if (!(await queryOne("SELECT 1 FROM sections WHERE id=$1", [Number(target)]))) return { ok: false, error: "Pick the section to move them to." };
    await query("UPDATE items SET section_id=$1, sort = sort + 10000 WHERE id = ANY($2::int[])", [Number(target), list]);
  } else if (op === "delete") { await binItems(list); await query("DELETE FROM items WHERE id = ANY($1::int[])", [list]); }
  else return { ok: false, error: "Unknown action." };
  refresh();
  const n = list.length, what = `${n} entr${n === 1 ? "y" : "ies"}`;
  return { ok: true, note: op === "hide" ? `${what} hidden.` : op === "show" ? `${what} showing.` : op === "move" ? `${what} moved (they go to the end of that section).` : `${what} deleted (in the recycle bin, if it's on).` };
}
