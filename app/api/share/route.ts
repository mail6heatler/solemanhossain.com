import { cookies } from "next/headers";
import { query, queryOne } from "@/lib/db";

// A card's Share button tells the site it was used, so its LIVE strip can say "Someone shared this". No name, nothing about who:
// only which entry and when. The same browser counts once per entry every ten minutes, and any entry at most once every 20 seconds.
export async function POST(req: Request) {
  const { id } = await req.json().catch(() => ({}));
  const itemId = Number(id);
  if (!Number.isInteger(itemId) || itemId <= 0) return Response.json({ error: "Bad share" }, { status: 400 });
  const ok = await queryOne("SELECT 1 AS ok FROM items i JOIN sections s ON s.id = i.section_id WHERE i.id=$1 AND i.visible AND s.visible", [itemId]);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  const voter = (await cookies()).get("lc_voter")?.value ?? "";
  const recent = voter
    ? await queryOne("SELECT 1 AS r FROM shares WHERE item_id=$1 AND voter=$2 AND created_at > NOW() - INTERVAL '10 minutes'", [itemId, voter])
    : await queryOne("SELECT 1 AS r FROM shares WHERE item_id=$1 AND created_at > NOW() - INTERVAL '20 seconds'", [itemId]);
  if (!recent) await query("INSERT INTO shares (item_id, voter) VALUES ($1, $2)", [itemId, voter]);
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
