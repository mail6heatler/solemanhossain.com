import { query } from "@/lib/db";
import { getSettings } from "@/lib/data";
import { KEY_RE, hashKey, ownerState } from "@/lib/chat";

/**
 * A visitor's own chat with the owner (Connect, ChatWall): their browser sends its private key, and gets back only that conversation,
 * whether the owner is around and typing, and which replies are new to them. `look` means the chat is really on their screen, so the
 * owner's replies count as seen. Nothing comes back without a valid key, and no email or other visitor's message ever does.
 */
export async function POST(req: Request) {
  const { k, look } = (await req.json().catch(() => ({}))) as { k?: unknown; look?: unknown };
  const none = { msgs: [], online: false, typing: false };
  if (typeof k !== "string" || !KEY_RE.test(k)) return Response.json(none, { headers: { "Cache-Control": "no-store" } });
  const conv = hashKey(k);
  const rows = await query("SELECT id, from_owner, body, created_at, seen_at, react, wants_public, approved FROM messages WHERE conv=$1 ORDER BY created_at, id LIMIT 300", [conv]);
  const s = await getSettings();
  const live = s.connect.online || s.connect.typing ? await ownerState(conv) : { online: false, typing: false };
  if (look === true && rows.some((r) => r.from_owner && !r.seen_at)) await query("UPDATE messages SET seen_at=NOW() WHERE conv=$1 AND from_owner AND seen_at IS NULL", [conv]);
  const msgs = rows.map((r) => ({
    id: Number(r.id), owner: !!r.from_owner, body: String(r.body), at: new Date(r.created_at).toISOString(),
    // a visitor's message: seen by the owner (only if the owner shows seen ticks); an owner's reply: new to the visitor
    seen: !r.from_owner && s.connect.seen ? !!r.seen_at : false, fresh: !!r.from_owner && !r.seen_at,
    react: s.connect.react ? String(r.react ?? "") : "", pub: !!r.wants_public, wall: !!r.approved,
  }));
  return Response.json({ msgs, online: s.connect.online && live.online, typing: s.connect.typing && live.typing }, { headers: { "Cache-Control": "no-store" } });
}
