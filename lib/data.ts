import { cleanStudy, type StudyInfo } from "./studyItem";
import { cleanComic, type ComicInfo } from "./comicItem";
import { cleanAward, type AwardInfo } from "./awardItem";
import { cleanScrap, type ScrapInfo } from "./scrapItem";
import { cleanCard, type CardInfo } from "./cardLook";
import { cleanBoxes, type BoxState } from "./boxes";
import { cleanTalk, type TalkInfo } from "./talk";
import { cleanPass, type TripPass } from "./tripPass";
import { query, queryOne, Row } from "./db";
import { mergeSettings, parseLinks, parseMedia, type Link, type Media, type SiteSettings } from "./settings";
import { cleanStyle, type ContentStyle } from "./contentStyle";

export type Section = {
  id: number; slug: string; code: string; nav_label: string; nav_emoji: string; eyebrow: string;
  eyebrow_emoji: string; title: string; subtitle: string; layout: string; emojis: string;
  categories: string[]; empty_text: string; home_limit: number; sort: number; visible: boolean; ribbon: boolean;
  /** size and look for this section's content */
  style: ContentStyle;
  /** which boxes on its dashboard page are open, as last saved */
  boxes: BoxState;
};

export type Item = {
  id: number; section_id: number; category: string; type: "post" | "poll"; title: string; subtitle: string;
  body: string; image_url: string; tags: string[]; links: Link[]; date_label: string; status: string;
  mood: string; location: string; poll_options: string[]; pinned: boolean; visible: boolean; sort: number;
  created_at: string;
  /** photos + videos; media[0] is the cover */
  media: Media[];
  /** size and look for this entry */
  style: ContentStyle;
  /** what its boarding pass says, and its note's tick lines */
  pass: TripPass;
  /** what it looks like on a study shelf, and what it adds there */
  study: StudyInfo;
  /** which panel it gets in a comic strip, and the word in its burst */
  comic: ComicInfo;
  /** which boxes on its dashboard page are open, as last saved */
  boxes: BoxState;
  /** which of the reaction bar's extra features it has switched on, comments among them */
  talk: TalkInfo;
  /** which object it is on an Achievement wall, if the owner chose one */
  award: AwardInfo;
  /** which page it is in a Scrapbook, if the owner chose one, and a ritual's ticked days */
  scrap: ScrapInfo;
  /** which card a G1 note or a G2 window is, if the owner chose one (lib/cardLook.ts) */
  card: CardInfo;
};

export type Message = {
  id: number; name: string; email: string; body: string; wants_public: boolean; approved: boolean;
  read: boolean; created_at: string;
};

const splitList = (s: string) => String(s || "").split(",").map((t) => t.trim()).filter(Boolean);

const toSection = (r: Row): Section => ({ ...(r as any), id: Number(r.id), categories: splitList(r.categories), style: cleanStyle(r.style), boxes: cleanBoxes(r.boxes) });
const toItem = (r: Row): Item => ({
  ...(r as any),
  id: Number(r.id),
  section_id: Number(r.section_id),
  tags: splitList(r.tags),
  links: parseLinks(r.links),
  poll_options: (() => { try { const a = JSON.parse(r.poll_options); return Array.isArray(a) ? a.map(String) : []; } catch { return []; } })(),
  created_at: new Date(r.created_at).toISOString(),
  media: parseMedia(r.media, String(r.image_url ?? "")),
  style: cleanStyle(r.style),
  pass: cleanPass(r.pass),
  study: cleanStudy(r.study),
  comic: cleanComic(r.comic),
  boxes: cleanBoxes(r.boxes),
  talk: cleanTalk(r.talk),
  award: cleanAward(r.award),
  scrap: cleanScrap(r.scrap),
  card: cleanCard(r.card),
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

/** How many entries in each section have their own size and look settings. */
export async function getLookCounts() {
  const rows = await query(`SELECT section_id, COUNT(*)::int AS n FROM items WHERE style <> '{}' GROUP BY section_id`);
  return new Map(rows.map((r) => [Number(r.section_id), Number(r.n)]));
}

/** A real entry for the size and look preview, with a photo if there is one. */
export async function getSampleItem(sectionId?: number) {
  const where = sectionId ? "WHERE section_id = $1" : "";
  const rows = await query(`SELECT * FROM items ${where} ORDER BY (media <> '[]') DESC, pinned DESC, sort, id LIMIT 1`, sectionId ? [sectionId] : []);
  return rows[0] ? toItem(rows[0]) : null;
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
export type ReactionCounts = Record<string, number>;

export async function getReactionCounts(itemId: number) {
  const rows = await query("SELECT emoji, COUNT(*)::int AS n FROM reactions WHERE item_id=$1 GROUP BY emoji", [itemId]);
  return Object.fromEntries(rows.map((r) => [String(r.emoji), Number(r.n)])) as ReactionCounts;
}

const placeholders = (n: number, from = 1) => Array.from({ length: n }, (_, i) => `$${i + from}`).join(",");

/** Counts for many entries at once: { itemId: { "❤️": 3, ... } } */
export async function getReactionCountsFor(ids: number[]) {
  const out: Record<number, ReactionCounts> = {};
  if (!ids.length) return out;
  const rows = await query(
    `SELECT item_id, emoji, COUNT(*)::int AS n FROM reactions WHERE item_id IN (${placeholders(ids.length)}) GROUP BY item_id, emoji`, ids);
  for (const r of rows) (out[Number(r.item_id)] ??= {})[String(r.emoji)] = Number(r.n);
  return out;
}

/** Which emojis this visitor already gave, for many entries at once. */
export async function getMyReactionsFor(ids: number[], voter: string) {
  const out: Record<number, string[]> = {};
  if (!ids.length || !voter) return out;
  const rows = await query(
    `SELECT item_id, emoji FROM reactions WHERE voter=$1 AND item_id IN (${placeholders(ids.length, 2)})`, [voter, ...ids]);
  for (const r of rows) (out[Number(r.item_id)] ??= []).push(String(r.emoji));
  return out;
}

export async function getReactionTotals() {
  const r = await queryOne(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE NOT seen)::int AS fresh FROM reactions`);
  return { total: Number(r?.total ?? 0), fresh: Number(r?.fresh ?? 0) };
}

export async function getReactionTotalsByEmoji() {
  const rows = await query("SELECT emoji, COUNT(*)::int AS n FROM reactions GROUP BY emoji");
  return Object.fromEntries(rows.map((r) => [String(r.emoji), Number(r.n)])) as ReactionCounts;
}

export type ReactionEvent = {
  item_id: number; emoji: string; visitor: string; seen: boolean; created_at: string;
  title: string; section_id: number; section_title: string; section_slug: string;
};
/** Newest reactions for the inbox. "visitor" is the name they typed; older reactions without one show a short tag from their random browser id. */
export async function getRecentReactions(limit = 200, onlyNew = false): Promise<ReactionEvent[]> {
  const rows = await query(
    `SELECT r.item_id, r.emoji, r.voter, r.name, r.seen, r.created_at, i.title, i.section_id, s.title AS section_title, s.slug AS section_slug
     FROM reactions r JOIN items i ON i.id = r.item_id JOIN sections s ON s.id = i.section_id
     ${onlyNew ? "WHERE NOT r.seen" : ""} ORDER BY r.created_at DESC LIMIT $1`, [limit]);
  return rows.map((r) => ({
    item_id: Number(r.item_id), emoji: String(r.emoji), visitor: String(r.name || "") || visitorTag(String(r.voter)), seen: !!r.seen,
    created_at: new Date(r.created_at).toISOString(), title: String(r.title), section_id: Number(r.section_id),
    section_title: String(r.section_title), section_slug: String(r.section_slug),
  }));
}

export const visitorTag = (voter: string) => `Visitor #${voter.slice(0, 4)}`;

/** Who gave which emoji on one entry, newest first. Only the owner ever sees names. */
export async function getReactionPeople(itemId: number, limit = 100) {
  const rows = await query("SELECT emoji, voter, name, created_at FROM reactions WHERE item_id=$1 ORDER BY created_at DESC LIMIT $2", [itemId, limit]);
  return rows.map((r) => ({ emoji: String(r.emoji), name: String(r.name || "") || visitorTag(String(r.voter)), created_at: new Date(r.created_at).toISOString() }));
}

// ---------- comments ----------
export type Comment = { id: number; item_id: number; name: string; body: string; reply: string; pinned: boolean; hidden: boolean; seen: boolean; created_at: string };
const toComment = (r: Row): Comment => ({
  id: Number(r.id), item_id: Number(r.item_id), name: String(r.name), body: String(r.body), reply: String(r.reply ?? ""),
  pinned: !!r.pinned, hidden: !!r.hidden, seen: !!r.seen, created_at: new Date(r.created_at).toISOString(),
});

/** One entry's comments, pinned first and then newest first. Hidden ones are only for the owner's page. */
export async function getComments(itemId: number, withHidden = false) {
  const rows = await query(`SELECT * FROM comments WHERE item_id=$1 ${withHidden ? "" : "AND NOT hidden"} ORDER BY pinned DESC, created_at DESC LIMIT 200`, [itemId]);
  return rows.map(toComment);
}

/** How many visitors can see, for many entries at once. */
export async function getCommentCountsFor(ids: number[]) {
  const out: Record<number, number> = {};
  if (!ids.length) return out;
  const rows = await query(`SELECT item_id, COUNT(*)::int AS n FROM comments WHERE NOT hidden AND item_id IN (${placeholders(ids.length)}) GROUP BY item_id`, ids);
  for (const r of rows) out[Number(r.item_id)] = Number(r.n);
  return out;
}

export async function getCommentTotals() {
  const r = await queryOne("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE NOT seen)::int AS fresh FROM comments");
  return { total: Number(r?.total ?? 0), fresh: Number(r?.fresh ?? 0) };
}

export type CommentEvent = Comment & { title: string; section_title: string; section_slug: string };
/** Newest comments for the inbox and the bell. */
export async function getRecentComments(limit = 200, onlyNew = false): Promise<CommentEvent[]> {
  const rows = await query(
    `SELECT c.*, i.title, s.title AS section_title, s.slug AS section_slug
     FROM comments c JOIN items i ON i.id = c.item_id JOIN sections s ON s.id = i.section_id
     ${onlyNew ? "WHERE NOT c.seen" : ""} ORDER BY c.created_at DESC LIMIT $1`, [limit]);
  return rows.map((r) => ({ ...toComment(r), title: String(r.title), section_title: String(r.section_title), section_slug: String(r.section_slug) }));
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
