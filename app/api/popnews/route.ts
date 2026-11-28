import { query } from "@/lib/db";
import { POP_ARTS, POP_FEEDS, artOf, type PopItem } from "@/lib/popnews";
import { NEWS_SOURCES, latestNews } from "@/lib/newsSources";

/*
 * The news pop-up's server side (lib/popnews.ts).
 * GET: automatic headlines (lib/newsSources.ts): the newest stories of the chosen categories from every news site that's on, mixed so the
 * sites take turns, each with its picture and a link to the full story on its own site. Kept for 30 minutes, here and at Vercel's edge, so
 * a visitor never waits on the news sites, and everything is read afresh every 30 minutes.
 * POST: one view or one tap of a story's button (PopNews.tsx sends each once per story per day per browser); only the story and the day are kept.
 */
export const maxDuration = 30;

const FRESH = 30 * 60_000;
const EMOJI: Record<string, string> = { bd: "🇧🇩", world: "🌍", tech: "💻", sports: "🏏", business: "📈", science: "🔬" };
const memo = new Map<string, { at: number; items: PopItem[] }>();
const FEEDS = POP_FEEDS.map(([k]) => k) as string[];
const IDS = new Set(NEWS_SOURCES.map((s) => s.id));
const catOf = new Map(NEWS_SOURCES.map((s) => [s.id, s.cat]));

async function headlines(cats: string[], off: string[], count: number): Promise<PopItem[]> {
  const key = `${cats.join(",")}|${off.join(",")}|${count}`, hit = memo.get(key);
  if (hit && Date.now() - hit.at < FRESH) return hit.items;
  try {
    const news = await latestNews(cats, off, count);
    const items = news.map((n, i): PopItem => {
      const cat = catOf.get(n.src) || cats[0], label = (POP_FEEDS.find(([k]) => k === cat) || POP_FEEDS[0])[1];
      return { id: "auto", tag: label, title: n.title, text: n.text, media: n.image ? { url: n.image, type: "image" } : null, emoji: EMOJI[cat] || "📰",
        art: artOf(POP_ARTS[i % POP_ARTS.length][0]), source: n.source, button: "Read the full story", link: n.link, when: n.when || undefined };
    });
    if (items.length) memo.set(key, { at: Date.now(), items });
    if (memo.size > 40) memo.delete(memo.keys().next().value as string);
    return items.length ? items : hit?.items ?? [];
  } catch (e) {
    console.error("popnews", key, e);
    return hit?.items ?? []; // an older list is better than none while the sites are away
  }
}

export async function GET(req: Request) {
  const u = new URL(req.url), p = u.searchParams;
  const asked = (p.get("feeds") || p.get("feed") || "bd").split(",");
  const cats = FEEDS.filter((k) => asked.includes(k));
  const off = [...new Set((p.get("off") || "").split(",").filter((x) => IDS.has(x) && cats.includes(catOf.get(x) as string)))].sort();
  const count = Math.min(10, Math.max(1, Number(p.get("count")) || 5));
  const items = await headlines(cats.length ? cats : ["bd"], off, count);
  return Response.json({ items }, { headers: { "Cache-Control": items.length ? "public, s-maxage=1800, stale-while-revalidate=900" : "no-store" } });
}

export async function POST(req: Request) {
  const { story, kind } = (await req.json().catch(() => ({}))) as { story?: unknown; kind?: unknown };
  const id = String(story ?? "").replace(/[^a-z0-9]/gi, "").slice(0, 12);
  if (!id || (kind !== "view" && kind !== "click")) return Response.json({ error: "Bad count" }, { status: 400 });
  const col = kind === "view" ? "views" : "clicks";
  await query(`INSERT INTO popnews_stats (story, ${col}) VALUES ($1, 1) ON CONFLICT (story, day) DO UPDATE SET ${col} = popnews_stats.${col} + 1`, [id]);
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
