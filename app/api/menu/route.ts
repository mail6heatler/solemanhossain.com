import { query } from "@/lib/db";

/**
 * What the menu bar asks for (SiteNav's NavFx): `GET /api/menu` gives each visible section's newest entry date, for the "new since your
 * last visit" dots and the receipt's "new since" line; `GET /api/menu?q=words` searches visible entries' titles and stories.
 * Only what visitors can already see on the site comes back.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 60) ?? "";
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
    const rows = await query(
      `SELECT i.id, i.title, s.slug, s.nav_label, s.title AS stitle, s.nav_emoji FROM items i JOIN sections s ON s.id = i.section_id
       WHERE i.visible AND s.visible AND (i.title ILIKE $1 OR i.body ILIKE $1 OR i.subtitle ILIKE $1) ORDER BY i.created_at DESC LIMIT 12`, [like]);
    return Response.json({ items: rows.map((r) => ({ id: Number(r.id), title: String(r.title), href: `/s/${r.slug}/${r.id}`, section: String(r.nav_label || r.stitle), emoji: String(r.nav_emoji || "") })) },
      { headers: { "Cache-Control": "no-store" } });
  }
  const rows = await query(`SELECT s.slug, MAX(i.created_at) AS newest, COUNT(*)::int AS n FROM items i JOIN sections s ON s.id = i.section_id WHERE i.visible AND s.visible GROUP BY s.slug`);
  return Response.json({ newest: Object.fromEntries(rows.map((r) => [String(r.slug), new Date(r.newest).toISOString()])), counts: Object.fromEntries(rows.map((r) => [String(r.slug), Number(r.n)])) },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}
