import { query } from "@/lib/db";
import { POP_ARTS, POP_FEEDS, artOf, type PopItem } from "@/lib/popnews";

/*
 * The news pop-up's server side (lib/popnews.ts).
 * GET: automatic headlines, from Google News's public RSS feeds (English, Bangladesh edition), the newest first; each links to the full story on
 * its own site. Kept for an hour, here and at Vercel's edge, so visitors never wait on the feed and it's asked at most once an hour per feed.
 * POST: one view or one tap of a story's button (PopNews.tsx sends each once per story per day per browser); only the story and the day are kept.
 */
const BASE = "hl=en-BD&gl=BD&ceid=BD:en";
const FEEDS: Record<string, string> = {
  bd: `https://news.google.com/rss?${BASE}`,
  world: `https://news.google.com/rss/headlines/section/topic/WORLD?${BASE}`,
  tech: `https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?${BASE}`,
  sports: `https://news.google.com/rss/headlines/section/topic/SPORTS?${BASE}`,
  business: `https://news.google.com/rss/headlines/section/topic/BUSINESS?${BASE}`,
  science: `https://news.google.com/rss/headlines/section/topic/SCIENCE?${BASE}`,
};
const EMOJI: Record<string, string> = { bd: "🇧🇩", world: "🌍", tech: "💻", sports: "🏏", business: "📈", science: "🔬" };
const HOUR = 3600_000;
const memo: Record<string, { at: number; items: PopItem[] }> = {};

const decode = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const field = (block: string, name: string) => { const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`)); return m ? decode(m[1]) : ""; };

async function headlines(feed: string): Promise<PopItem[]> {
  const hit = memo[feed];
  if (hit && Date.now() - hit.at < HOUR) return hit.items;
  try {
    // a plain reader's name: nothing about the site or its owner goes to the feed
    const r = await fetch(FEEDS[feed], { headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsReader/1.0)" }, signal: AbortSignal.timeout(6000), cache: "no-store" });
    if (!r.ok) throw new Error(String(r.status));
    const xml = await r.text(), label = (POP_FEEDS.find(([k]) => k === feed) || POP_FEEDS[0])[1];
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 8).map((m, i): PopItem => {
      const b = m[1], source = field(b, "source");
      let title = field(b, "title");
      if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3)); // Google puts the source after the headline
      const link = field(b, "link");
      return { id: "auto", tag: `📰 ${label.replace(/^\S+\s/, "")}`, title: title.slice(0, 160), text: "", media: null, emoji: EMOJI[feed] || "📰",
        art: artOf(POP_ARTS[i % POP_ARTS.length][0]), source: source.slice(0, 60), button: "Read on its site", link: /^https?:\/\//.test(link) ? link : "" };
    }).filter((x) => x.title);
    memo[feed] = { at: Date.now(), items };
    return items;
  } catch (e) {
    console.error("popnews feed", feed, e);
    return hit?.items ?? []; // an old list is better than none while the feed is away
  }
}

export async function GET(req: Request) {
  const u = new URL(req.url), f = u.searchParams.get("feed") || "bd", feed = FEEDS[f] ? f : "bd";
  const count = Math.min(6, Math.max(1, Number(u.searchParams.get("count")) || 3));
  const items = (await headlines(feed)).slice(0, count);
  return Response.json({ items }, { headers: { "Cache-Control": items.length ? "public, s-maxage=3600, stale-while-revalidate=600" : "no-store" } });
}

export async function POST(req: Request) {
  const { story, kind } = (await req.json().catch(() => ({}))) as { story?: unknown; kind?: unknown };
  const id = String(story ?? "").replace(/[^a-z0-9]/gi, "").slice(0, 12);
  if (!id || (kind !== "view" && kind !== "click")) return Response.json({ error: "Bad count" }, { status: 400 });
  const col = kind === "view" ? "views" : "clicks";
  await query(`INSERT INTO popnews_stats (story, ${col}) VALUES ($1, 1) ON CONFLICT (story, day) DO UPDATE SET ${col} = popnews_stats.${col} + 1`, [id]);
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
