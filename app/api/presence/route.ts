import { query } from "@/lib/db";
import { getLiveCount, getSettings } from "@/lib/data";

// "People here now": each open browser tab checks in about every 30 seconds with a random id
// kept in its own localStorage. Nothing personal is stored.
export async function POST(req: Request) {
  if (!(await getSettings()).effects.visitors) return Response.json({ n: 0, off: true });
  const ua = req.headers.get("user-agent") ?? "";
  const { id } = await req.json().catch(() => ({}));
  if (!/bot|crawl|spider|preview|headless/i.test(ua) && typeof id === "string" && /^[a-f0-9]{16,32}$/.test(id)) {
    await query(
      `INSERT INTO presence (visitor, last_seen) VALUES ($1, NOW())
       ON CONFLICT (visitor) DO UPDATE SET last_seen = NOW()`, [id]);
    if (Math.random() < 0.05) await query("DELETE FROM presence WHERE last_seen < NOW() - INTERVAL '10 minutes'");
  }
  return Response.json({ n: await getLiveCount() }, { headers: { "Cache-Control": "no-store" } });
}
