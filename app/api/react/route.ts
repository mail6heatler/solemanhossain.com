import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { query, queryOne } from "@/lib/db";
import { getReactionCounts, getSettings } from "@/lib/data";
import { REACTION_EMOJIS } from "@/lib/settings";

// Emoji reactions on entries. Each browser (random cookie id, like poll votes) can add each emoji once.
const ALLOWED = new Set<string>(REACTION_EMOJIS);

async function visibleItem(id: number) {
  if (!Number.isInteger(id) || id <= 0) return null;
  return queryOne(
    `SELECT i.id FROM items i JOIN sections s ON s.id = i.section_id WHERE i.id=$1 AND i.visible AND s.visible`, [id]);
}

async function mine(id: number, voter?: string) {
  if (!voter) return [];
  const rows = await query("SELECT emoji FROM reactions WHERE item_id=$1 AND voter=$2", [id, voter]);
  return rows.map((r) => String(r.emoji));
}

export async function GET(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!(await visibleItem(id))) return Response.json({ error: "Not found" }, { status: 404 });
  const voter = (await cookies()).get("lc_voter")?.value;
  return Response.json({ counts: await getReactionCounts(id), mine: await mine(id, voter) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!(await getSettings()).effects.reactions) return Response.json({ error: "Reactions are switched off" }, { status: 403 });
  const { id, emoji } = await req.json().catch(() => ({}));
  const itemId = Number(id);
  if (!ALLOWED.has(String(emoji)) || !(await visibleItem(itemId))) return Response.json({ error: "Bad reaction" }, { status: 400 });
  const jar = await cookies();
  let voter = jar.get("lc_voter")?.value;
  if (!voter || !/^[a-f0-9]{24}$/.test(voter)) {
    voter = randomBytes(12).toString("hex");
    jar.set("lc_voter", voter, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365, secure: process.env.NODE_ENV === "production" });
  }
  // tap once to add, tap again to take it back
  const removed = await query("DELETE FROM reactions WHERE item_id=$1 AND voter=$2 AND emoji=$3 RETURNING emoji", [itemId, voter, emoji]);
  if (removed.length === 0)
    await query("INSERT INTO reactions (item_id, voter, emoji) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [itemId, voter, emoji]);
  return Response.json({ counts: await getReactionCounts(itemId), mine: await mine(itemId, voter) });
}
