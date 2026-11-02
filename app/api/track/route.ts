import { query } from "@/lib/db";

// Tiny privacy-friendly analytics: counts per day, no personal data stored.
export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") ?? "";
  if (/bot|crawl|spider|preview|headless/i.test(ua)) return new Response(null, { status: 204 });
  const body = await req.json().catch(() => ({}));
  if (body.type === "view") {
    const newVisitor = body.newVisitor ? 1 : 0;
    await query(
      `INSERT INTO stats_daily (day, visitors, views) VALUES (CURRENT_DATE, $1, 1)
       ON CONFLICT (day) DO UPDATE SET visitors = stats_daily.visitors + $1, views = stats_daily.views + 1`, [newVisitor]);
  } else if (body.type === "section" && typeof body.slug === "string" && /^[a-z0-9-]{1,60}$/.test(body.slug)) {
    await query(
      `INSERT INTO section_views (day, slug, n) VALUES (CURRENT_DATE, $1, 1)
       ON CONFLICT (day, slug) DO UPDATE SET n = section_views.n + 1`, [body.slug]);
  }
  return new Response(null, { status: 204 });
}
