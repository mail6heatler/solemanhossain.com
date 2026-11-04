import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { query, queryOne } from "@/lib/db";
import { getMyReactionsFor, getReactionCountsFor, getSettings } from "@/lib/data";
import { REACTION_EMOJIS } from "@/lib/settings";

// Emoji reactions on entries. Each browser (random cookie id, like poll votes) can add each emoji once, and has to
// give a name to do it so the owner knows who it's from. Names are never sent back to visitors, only counts.
const ALLOWED = new Set<string>(REACTION_EMOJIS);

async function visibleIds(ids: number[]) {
  const clean = Array.from(new Set(ids.filter((n) => Number.isInteger(n) && n > 0))).slice(0, 100);
  if (!clean.length) return [];
  const rows = await query(
    `SELECT i.id FROM items i JOIN sections s ON s.id = i.section_id
     WHERE i.visible AND s.visible AND i.id IN (${clean.map((_, k) => `$${k + 1}`).join(",")})`, clean);
  return rows.map((r) => Number(r.id));
}

/** GET /api/react?ids=1,2,3 → { items: { "1": { counts, mine } } }   (also ?id=1 → { counts, mine }) */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const single = sp.get("id");
  const ids = await visibleIds((single ?? sp.get("ids") ?? "").split(",").map(Number));
  const voter = (await cookies()).get("lc_voter")?.value ?? "";
  const [counts, mine] = await Promise.all([getReactionCountsFor(ids), getMyReactionsFor(ids, voter)]);
  const headers = { "Cache-Control": "no-store" };
  if (single !== null) {
    if (!ids.length) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ counts: counts[ids[0]] ?? {}, mine: mine[ids[0]] ?? [] }, { headers });
  }
  const items = Object.fromEntries(ids.map((id) => [id, { counts: counts[id] ?? {}, mine: mine[id] ?? [] }]));
  return Response.json({ items }, { headers });
}

export async function POST(req: Request) {
  if (!(await getSettings()).effects.reactions) return Response.json({ error: "Reactions are switched off" }, { status: 403 });
  const { id, emoji, name: rawName } = await req.json().catch(() => ({}));
  const name = String(rawName ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
  const itemId = Number(id);
  if (!ALLOWED.has(String(emoji)) || !(await visibleIds([itemId])).length) return Response.json({ error: "Bad reaction" }, { status: 400 });
  const jar = await cookies();
  let voter = jar.get("lc_voter")?.value;
  if (!voter || !/^[a-f0-9]{24}$/.test(voter)) {
    voter = randomBytes(12).toString("hex");
    jar.set("lc_voter", voter, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365, secure: process.env.NODE_ENV === "production" });
  }
  // tap once to add (it shows up in the admin inbox), tap again to take it back
  const removed = await queryOne("DELETE FROM reactions WHERE item_id=$1 AND voter=$2 AND emoji=$3 RETURNING emoji", [itemId, voter, emoji]);
  if (!removed) {
    if (!name) return Response.json({ error: "Your name is needed to react", needName: true }, { status: 400 });
    await query("INSERT INTO reactions (item_id, voter, emoji, name) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING", [itemId, voter, emoji, name]);
  }
  // the same browser is the same person: their earlier reactions pick up the name too
  if (name) await query("UPDATE reactions SET name=$1 WHERE voter=$2 AND name <> $1", [name, voter]);
  const [counts, mine] = await Promise.all([getReactionCountsFor([itemId]), getMyReactionsFor([itemId], voter)]);
  return Response.json({ counts: counts[itemId] ?? {}, mine: mine[itemId] ?? [] });
}
