import { query, queryOne, Row } from "./db";
import { mergeSettings, parseLinks, type Link, type SiteSettings } from "./settings";

export type Section = {
  id: number; slug: string; code: string; nav_label: string; nav_emoji: string; eyebrow: string;
  eyebrow_emoji: string; title: string; subtitle: string; layout: string; emojis: string;
  categories: string[]; empty_text: string; home_limit: number; sort: number; visible: boolean;
};

export type Item = {
  id: number; section_id: number; category: string; type: "post" | "poll"; title: string; subtitle: string;
  body: string; image_url: string; tags: string[]; links: Link[]; date_label: string; status: string;
  mood: string; location: string; poll_options: string[]; pinned: boolean; visible: boolean; sort: number;
  created_at: string;
};

export type Message = {
  id: number; name: string; email: string; body: string; wants_public: boolean; approved: boolean;
  read: boolean; created_at: string;
};

const splitList = (s: string) => String(s || "").split(",").map((t) => t.trim()).filter(Boolean);

const toSection = (r: Row): Section => ({ ...(r as any), id: Number(r.id), categories: splitList(r.categories) });
const toItem = (r: Row): Item => ({
  ...(r as any),
  id: Number(r.id),
  section_id: Number(r.section_id),
  tags: splitList(r.tags),
  links: parseLinks(r.links),
  poll_options: (() => { try { const a = JSON.parse(r.poll_options); return Array.isArray(a) ? a.map(String) : []; } catch { return []; } })(),
  created_at: new Date(r.created_at).toISOString(),
});
const toMessage = (r: Row): Message => ({ ...(r as any), id: Number(r.id), created_at: new Date(r.created_at).toISOString() });

// ---------- settings ----------
export async function getSettings(): Promise<SiteSettings> {
  const r = await queryOne("SELECT data FROM settings WHERE id = 1");
  return mergeSettings(r?.data);
}

export async function getAuthRow() {
  const r = await queryOne("SELECT password_hash, session_version FROM settings WHERE id = 1");
  return { passwordHash: String(r?.password_hash ?? ""), sessionVersion: Number(r?.session_version ?? 1) };
}

// ---------- sections & items ----------
export async function getSections(opts: { visibleOnly?: boolean } = {}) {
  const rows = await query(`SELECT * FROM sections ${opts.visibleOnly ? "WHERE visible" : ""} ORDER BY sort, id`);
  return rows.map(toSection);
}

export async function getSection(by: { id?: number; slug?: string }, visibleOnly = false) {
  const r = by.id != null
    ? await queryOne("SELECT * FROM sections WHERE id = $1", [by.id])
    : await queryOne("SELECT * FROM sections WHERE slug = $1", [by.slug]);
  if (!r || (visibleOnly && !r.visible)) return null;
  return toSection(r);
}

export async function getItems(sectionId: number, opts: { visibleOnly?: boolean; limit?: number } = {}) {
  const params: unknown[] = [sectionId];
  let sql = `SELECT * FROM items WHERE section_id = $1 ${opts.visibleOnly ? "AND visible" : ""} ORDER BY pinned DESC, sort, id`;
  if (opts.limit) { params.push(opts.limit); sql += " LIMIT $2"; }
  return (await query(sql, params)).map(toItem);
}

export async function getItemCounts(visibleOnly = false) {
  const rows = await query(`SELECT section_id, COUNT(*)::int AS n FROM items ${visibleOnly ? "WHERE visible" : ""} GROUP BY section_id`);
  return new Map(rows.map((r) => [Number(r.section_id), Number(r.n)]));
}

export async function getItem(id: number) {
  const r = await queryOne("SELECT * FROM items WHERE id = $1", [id]);
  return r ? toItem(r) : null;
}

export async function getRecentItems(limit = 6) {
  const rows = await query(
    `SELECT i.*, s.title AS section_title, s.slug AS section_slug FROM items i JOIN sections s ON s.id = i.section_id
     ORDER BY i.created_at DESC LIMIT $1`, [limit]);
  return rows.map((r) => ({ ...toItem(r), section_title: String(r.section_title), section_slug: String(r.section_slug) }));
}

// ---------- polls ----------
export async function getPollCounts(itemId: number, optionCount: number) {
  const rows = await query("SELECT option, COUNT(*)::int AS n FROM votes WHERE item_id=$1 GROUP BY option", [itemId]);
  const counts = Array(optionCount).fill(0);
  for (const r of rows) if (r.option >= 0 && r.option < optionCount) counts[r.option] = Number(r.n);
  return counts;
}

// ---------- reactions ----------
export async function getReactionCounts(itemId: number) {
  const rows = await query("SELECT emoji, COUNT(*)::int AS n FROM reactions WHERE item_id=$1 GROUP BY emoji", [itemId]);
  return Object.fromEntries(rows.map((r) => [String(r.emoji), Number(r.n)])) as Record<string, number>;
}

// ---------- people here now ----------
export const LIVE_WINDOW_SECONDS = 75;
export async function getLiveCount() {
  const r = await queryOne(`SELECT COUNT(*)::int AS n FROM presence WHERE last_seen > NOW() - INTERVAL '${LIVE_WINDOW_SECONDS} seconds'`);
  return Number(r?.n ?? 0);
}

// ---------- messages ----------
export async function getMessages(filter: "all" | "unread" | "public" = "all") {
  const where = filter === "unread" ? "WHERE NOT read" : filter === "public" ? "WHERE approved" : "";
  return (await query(`SELECT * FROM messages ${where} ORDER BY created_at DESC LIMIT 200`)).map(toMessage);
}

export async function countUnread() {
  const r = await queryOne("SELECT COUNT(*)::int AS n FROM messages WHERE NOT read");
  return Number(r?.n ?? 0);
}

// ---------- stats ----------
export async function getStats() {
  const today = await queryOne("SELECT visitors, views FROM stats_daily WHERE day = CURRENT_DATE");
  const week = await queryOne("SELECT COALESCE(SUM(visitors),0)::int AS v FROM stats_daily WHERE day > CURRENT_DATE - 7");
  const top = await queryOne(
    `SELECT sv.slug, SUM(sv.n)::int AS n, COALESCE(NULLIF(MAX(s.nav_label), ''), MAX(s.title)) AS title FROM section_views sv LEFT JOIN sections s ON s.slug = sv.slug
     WHERE sv.day > CURRENT_DATE - 30 GROUP BY sv.slug ORDER BY n DESC LIMIT 1`);
  const polls = await queryOne("SELECT COUNT(*)::int AS n FROM items WHERE type='poll' AND visible");
  const last14 = await query(
    `SELECT to_char(d::date, 'YYYY-MM-DD') AS day, COALESCE(s.visitors, 0)::int AS visitors
     FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, '1 day') d
     LEFT JOIN stats_daily s ON s.day = d::date ORDER BY d`);
  return {
    visitorsToday: Number(today?.visitors ?? 0),
    viewsToday: Number(today?.views ?? 0),
    visitorsWeek: Number(week?.v ?? 0),
    topSection: top ? String(top.title ?? top.slug) : "—",
    activePolls: Number(polls?.n ?? 0),
    last14: last14.map((r) => ({ day: String(r.day), visitors: Number(r.visitors) })),
  };
}
