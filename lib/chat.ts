/**
 * Connect's chat as real conversations (server only). A visitor's browser keeps a random private key (localStorage lc_chat) and sends it with
 * each message; the database stores only its hash (messages.conv), so the key itself never sits anywhere but their browser. The owner's replies
 * are messages with from_owner. Messages from before replies existed have no conv, and each is its own chat, keyed "m<id>".
 * owner_live (one row) says when the owner last had the Inbox open and which chat they're typing in.
 */
import { createHash } from "crypto";
import { query, queryOne } from "./db";

export const KEY_RE = /^[A-Za-z0-9_-]{20,64}$/;
export const hashKey = (k: string) => createHash("sha256").update(`lc-chat:${k}`).digest("hex").slice(0, 40);
/** A chat's id in the Inbox: the conversation hash, or "m<id>" for a message from before replies. */
export const isConvId = (k: string) => /^[a-f0-9]{40}$/.test(k);
const legacyId = (k: string) => (/^m\d{1,10}$/.test(k) ? Number(k.slice(1)) : 0);

export type ChatSummary = {
  key: string; name: string; email: string; last: string; lastFromOwner: boolean; lastAt: string; unread: number; count: number;
  /** a visitor message here asked to be on the Wall and isn't yet */ wallAsk: boolean; onWall: boolean; canReply: boolean;
};
export type ChatMsg = {
  id: number; fromOwner: boolean; name: string; body: string; at: string; seen: boolean; react: string;
  wantsPublic: boolean; approved: boolean; wallReply: string; hearts: number;
};

type Row = Record<string, any>;
const iso = (v: unknown) => new Date(v as string).toISOString();
const toMsg = (r: Row): ChatMsg => ({
  id: Number(r.id), fromOwner: !!r.from_owner, name: String(r.name ?? ""), body: String(r.body ?? ""), at: iso(r.created_at), seen: !!r.seen_at,
  react: String(r.react ?? ""), wantsPublic: !!r.wants_public, approved: !!r.approved, wallReply: String(r.wall_reply ?? ""), hearts: Number(r.hearts ?? 0),
});

/** Every chat, newest first, built from the newest 3000 messages. */
export async function listChats(): Promise<ChatSummary[]> {
  const rows = await query("SELECT id, conv, name, email, body, from_owner, read, wants_public, approved, created_at FROM messages ORDER BY created_at DESC, id DESC LIMIT 3000");
  const map = new Map<string, ChatSummary>();
  for (const r of rows) {
    const key = r.conv ? String(r.conv) : `m${r.id}`;
    let c = map.get(key);
    if (!c) {
      c = { key, name: "", email: "", last: String(r.body), lastFromOwner: !!r.from_owner, lastAt: iso(r.created_at), unread: 0, count: 0, wallAsk: false, onWall: false, canReply: !!r.conv };
      map.set(key, c);
    }
    c.count++;
    if (!r.from_owner) {
      if (!c.name) c.name = String(r.name);
      if (!c.email && r.email) c.email = String(r.email);
      if (!r.read) c.unread++;
      if (r.wants_public && !r.approved) c.wallAsk = true;
      if (r.approved) c.onWall = true;
    }
  }
  return [...map.values()].map((c) => ({ ...c, name: c.name || "Visitor" }));
}

/** One chat's messages, oldest first. */
export async function chatThread(key: string): Promise<ChatMsg[]> {
  const id = legacyId(key);
  const rows = id
    ? await query("SELECT * FROM messages WHERE id=$1 AND conv IS NULL", [id])
    : isConvId(key) ? await query("SELECT * FROM messages WHERE conv=$1 ORDER BY created_at, id LIMIT 500", [key]) : [];
  return rows.map(toMsg);
}

/** What a chat's id picks out of messages: the SQL condition and its parameter, or null for an id that isn't one. */
export function chatWhere(key: string): [string, unknown] | null {
  const id = legacyId(key);
  if (id) return ["id=$1 AND conv IS NULL", id];
  if (isConvId(key)) return ["conv=$1", key];
  return null;
}

/** Everything visitors wrote lately, newest first, for the Inbox's All tab. */
export async function recentVisitorMessages(limit = 120) {
  const rows = await query("SELECT id, conv, name, body, read, created_at FROM messages WHERE NOT from_owner ORDER BY created_at DESC, id DESC LIMIT $1", [limit]);
  return rows.map((r) => ({ id: Number(r.id), key: r.conv ? String(r.conv) : `m${r.id}`, name: String(r.name), body: String(r.body), read: !!r.read, at: iso(r.created_at) }));
}

/** The owner opened a chat: what the visitor wrote is read and seen. */
export async function markChatSeen(key: string) {
  const id = legacyId(key);
  if (id) await query("UPDATE messages SET read=TRUE, seen_at=COALESCE(seen_at, NOW()) WHERE id=$1", [id]);
  else if (isConvId(key)) await query("UPDATE messages SET read=TRUE, seen_at=COALESCE(seen_at, NOW()) WHERE conv=$1 AND NOT from_owner AND (NOT read OR seen_at IS NULL)", [key]);
}

/** The Inbox is open; `typing` is the chat the owner is typing in, or empty. */
export async function ownerPing(typing = "") {
  await query(`INSERT INTO owner_live (id, seen_at, typing_conv, typing_at) VALUES (1, NOW(), $1::text, CASE WHEN $1::text = '' THEN NULL ELSE NOW() END)
    ON CONFLICT (id) DO UPDATE SET seen_at = NOW(), typing_conv = $1::text, typing_at = CASE WHEN $1::text = '' THEN owner_live.typing_at ELSE NOW() END`, [typing]);
}

/** Whether the owner is around (Inbox open in the last 70 seconds) and typing in this chat (the last 8 seconds). */
export async function ownerState(conv: string) {
  const r = await queryOne("SELECT seen_at, typing_conv, typing_at FROM owner_live WHERE id=1");
  const ago = (v: unknown) => (v ? Date.now() - new Date(v as string).getTime() : Infinity);
  return { online: ago(r?.seen_at) < 70_000, typing: !!r && r.typing_conv === conv && ago(r.typing_at) < 8_000 };
}
