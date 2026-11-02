import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

// 🎲 "Surprise me": jumps to a random visible entry.
export async function GET(req: Request) {
  const r = await queryOne(
    `SELECT i.id, s.slug FROM items i JOIN sections s ON s.id = i.section_id
     WHERE i.visible AND s.visible AND s.layout <> 'connect' ORDER BY random() LIMIT 1`);
  const to = r ? `/s/${r.slug}/${r.id}` : "/";
  return Response.redirect(new URL(to, req.url), 307);
}
