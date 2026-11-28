/**
 * Automatic headlines for the news pop-up (lib/popnews.ts, app/api/popnews/route.ts): every outlet's public feed by category, read and mixed
 * on the server, newest first, each with its best picture. Self-contained (no project imports) so it can be tried on its own with Node.
 *
 * Every feed here was tested on 2026-11-28 and answered with stories from the last day: CNN's feeds stopped updating years ago, and CBS
 * News, New Scientist, ESPN's main feed, NYT Sports, bdnews24 and New Age refused or were empty, so they're left out. A feed that fails
 * later is simply skipped, and the others carry on.
 *
 * Pictures: the feed's own (media:content, media:thumbnail, an image enclosure or the first <img> in the story's text, the largest one);
 * BBC's small thumbnails are asked for at 976 px. A story without one gets the picture its article shares for link previews (og:image),
 * read from the first part of the page, for the few stories that will be shown.
 */
export type NewsSource = { id: string; name: string; cat: string; url: string; /** its name on the dashboard, where a site has two feeds */ label?: string; /** hours its clock is ahead: a feed that writes local time and calls it UTC */ shift?: number };
export type NewsItem = { title: string; text: string; link: string; source: string; src: string; when: number; image: string };

export const NEWS_SOURCES: NewsSource[] = [
  // 🌍 world
  { id: "bbc-world", name: "BBC News", cat: "world", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { id: "nyt-world", name: "The New York Times", cat: "world", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
  { id: "aljazeera", name: "Al Jazeera", cat: "world", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { id: "france24", name: "France 24", cat: "world", url: "https://www.france24.com/en/rss" },
  { id: "independent", name: "The Independent", cat: "world", url: "https://www.independent.co.uk/news/world/rss" },
  { id: "abc-intl", name: "ABC News", cat: "world", url: "https://abcnews.go.com/abcnews/internationalheadlines" },
  { id: "wapo-world", name: "The Washington Post", cat: "world", url: "https://feeds.washingtonpost.com/rss/world" },
  { id: "npr-world", name: "NPR", cat: "world", url: "https://feeds.npr.org/1004/rss.xml" },
  { id: "dw", name: "DW", cat: "world", url: "https://rss.dw.com/rdf/rss-en-world" },
  { id: "sky-world", name: "Sky News", cat: "world", url: "https://feeds.skynews.com/feeds/rss/world.xml" },
  { id: "un-news", name: "UN News", cat: "world", url: "https://news.un.org/feed/subscribe/en/news/all/rss.xml" },
  // 💻 technology
  { id: "hn", name: "Hacker News", cat: "tech", url: "https://hnrss.org/frontpage?count=25" },
  { id: "verge", name: "The Verge", cat: "tech", url: "https://www.theverge.com/rss/index.xml" },
  { id: "wired", name: "WIRED", cat: "tech", url: "https://www.wired.com/feed/rss" },
  { id: "ars", name: "Ars Technica", cat: "tech", url: "https://feeds.arstechnica.com/arstechnica/index" },
  { id: "bbc-tech", name: "BBC News", cat: "tech", url: "https://feeds.bbci.co.uk/news/technology/rss.xml" },
  { id: "guardian-tech", name: "The Guardian", cat: "tech", url: "https://www.theguardian.com/technology/rss" },
  { id: "engadget", name: "Engadget", cat: "tech", url: "https://www.engadget.com/rss.xml" },
  { id: "gizmodo", name: "Gizmodo", cat: "tech", url: "https://gizmodo.com/feed" },
  { id: "zdnet", name: "ZDNET", cat: "tech", url: "https://www.zdnet.com/news/rss.xml" },
  { id: "mittr", name: "MIT Technology Review", cat: "tech", url: "https://www.technologyreview.com/feed/" },
  { id: "nyt-tech", name: "The New York Times", cat: "tech", url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml" },
  { id: "techcrunch", name: "TechCrunch", cat: "tech", url: "https://techcrunch.com/feed/" },
  // 🔬 science
  { id: "bbc-sci", name: "BBC News", cat: "science", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml" },
  { id: "nyt-sci", name: "The New York Times", cat: "science", url: "https://rss.nytimes.com/services/xml/rss/nyt/Science.xml" },
  { id: "phys", name: "Phys.org", cat: "science", url: "https://phys.org/rss-feed/" },
  { id: "space", name: "Space.com", cat: "science", url: "https://www.space.com/feeds/all" },
  { id: "livescience", name: "Live Science", cat: "science", url: "https://www.livescience.com/feeds/all" },
  { id: "nasa", name: "NASA", cat: "science", url: "https://www.nasa.gov/feed/" },
  { id: "guardian-sci", name: "The Guardian", cat: "science", url: "https://www.theguardian.com/science/rss" },
  { id: "sciam", name: "Scientific American", cat: "science", url: "https://www.scientificamerican.com/platform/syndication/rss/" },
  { id: "sciencedaily", name: "ScienceDaily", cat: "science", url: "https://www.sciencedaily.com/rss/top/science.xml" },
  // 🏏 sports
  { id: "bbc-sport", name: "BBC Sport", label: "BBC Sport (top)", cat: "sports", url: "https://feeds.bbci.co.uk/sport/rss.xml" },
  { id: "bbc-football", name: "BBC Sport", label: "BBC Sport (football)", cat: "sports", url: "https://feeds.bbci.co.uk/sport/football/rss.xml" },
  { id: "bbc-cricket", name: "BBC Sport", label: "BBC Sport (cricket)", cat: "sports", url: "https://feeds.bbci.co.uk/sport/cricket/rss.xml" },
  { id: "cricinfo", name: "ESPNcricinfo", cat: "sports", url: "https://www.espncricinfo.com/rss/content/story/feeds/0.xml" },
  { id: "sky-sports", name: "Sky Sports", cat: "sports", url: "https://www.skysports.com/rss/12040" },
  { id: "guardian-sport", name: "The Guardian", cat: "sports", url: "https://www.theguardian.com/sport/rss" },
  { id: "cbs-sports", name: "CBS Sports", cat: "sports", url: "https://www.cbssports.com/rss/headlines/" },
  // 📈 business
  { id: "nyt-biz", name: "The New York Times", cat: "business", url: "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml" },
  { id: "bbc-biz", name: "BBC News", cat: "business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { id: "guardian-biz", name: "The Guardian", cat: "business", url: "https://www.theguardian.com/business/rss" },
  { id: "fortune", name: "Fortune", cat: "business", url: "https://fortune.com/feed/fortune-feeds/?id=3230629" },
  { id: "cnbc", name: "CNBC", cat: "business", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
  { id: "marketwatch", name: "MarketWatch", cat: "business", url: "https://feeds.content.dowjones.io/public/rss/mw_topstories" },
  // 🇧🇩 Bangladesh
  { id: "prothomalo", name: "Prothom Alo", cat: "bd", url: "https://en.prothomalo.com/feed" },
  { id: "dhakatribune", name: "Dhaka Tribune", cat: "bd", url: "https://www.dhakatribune.com/feed/" },
  { id: "tbs", name: "The Business Standard", label: "The Business Standard (top)", cat: "bd", url: "https://www.tbsnews.net/top-news/rss.xml" },
  { id: "dailystar", name: "The Daily Star", cat: "bd", url: "https://www.thedailystar.net/top-news/rss.xml" },
  { id: "observer", name: "Daily Observer", cat: "bd", url: "https://www.observerbd.com/rss.php", shift: 6 },
  { id: "tbs-bd", name: "The Business Standard", label: "The Business Standard (Bangladesh)", cat: "bd", url: "https://www.tbsnews.net/bangladesh/rss.xml" },
];

// an ordinary browser's name: some outlets refuse unknown readers; nothing about the site or its owner is sent
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36", Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8, */*;q=0.5" };
const HOUR = 3600_000;

const NAMED: Record<string, string> = { rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", mdash: "—", ndash: "–", hellip: "…", bull: "•", middot: "·", eacute: "é", aacute: "á", oacute: "ó", iacute: "í", uacute: "ú", ntilde: "ñ", uuml: "ü", ouml: "ö", auml: "ä", ccedil: "ç", pound: "£", euro: "€", copy: "©", reg: "®", trade: "™", deg: "°" };
const unescape = (s: string) => s.replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0*39;|&apos;/g, "'").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const cdata = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
/** the inside of the first <name>…</name>, its CDATA unwrapped and its entities decoded once (HTML inside stays HTML) */
function inner(block: string, name: string) { const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i")); return m ? unescape(cdata(m[1])).trim() : ""; }
const plain = (html: string) => unescape(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
function clip(s: string, n: number) { if (s.length <= n) return s; const c = s.slice(0, n); return c.slice(0, Math.max(c.lastIndexOf(" "), n - 20)).replace(/[,;:\s]+$/, "") + "…"; }
const attr = (tag: string, name: string) => { const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i")); return m ? unescape(m[2] ?? m[3] ?? "") : ""; };
const abs = (u: string, base: string) => { try { const x = new URL(u, base); return /^https?:$/.test(x.protocol) ? x.href.replace(/^http:/, "https:") : ""; } catch { return ""; } };

/** the best picture a feed gives a story: the widest of its media tags and enclosures, or the first picture in its text */
function feedImage(block: string, base: string): string {
  const found: { url: string; w: number }[] = [];
  for (const m of block.matchAll(/<(media:content|media:thumbnail|enclosure|media:group)\b[^>]*>/gi)) {
    const tag = m[0], url = attr(tag, "url"), type = attr(tag, "type"), medium = attr(tag, "medium");
    if (!url || (type && !/^image\//i.test(type)) || (medium && medium !== "image")) continue;
    if (!type && !medium && /\.(mp4|mp3|m4a|webm|mov)(\?|$)/i.test(url)) continue;
    found.push({ url, w: Number(attr(tag, "width")) || (m[1].toLowerCase() === "media:thumbnail" ? 1 : 2) });
  }
  if (!found.length) { const html = unescape(cdata(block)); const im = html.match(/<img\b[^>]*>/i); const src = im && (attr(im[0], "src") || attr(im[0], "data-src")); if (src) found.push({ url: src, w: 0 }); }
  if (!found.length) return "";
  found.sort((a, b) => b.w - a.w);
  return bigger(abs(found[0].url, base));
}
/** a larger copy where the picture service allows it in the address */
function bigger(u: string) {
  return u.replace(/(ichef\.bbci\.co\.uk\/(?:ace\/(?:standard|ws|branded_news|branded_sport)|news|images\/ic))\/\d{2,4}(x\d{2,4})?\//, "$1/976/");
}
function linkOf(block: string, base: string) {
  const rss = inner(block, "link");
  if (rss && /^https?:/i.test(rss)) return rss;
  for (const m of block.matchAll(/<link\b[^>]*>/gi)) { const rel = attr(m[0], "rel"); if (!rel || rel === "alternate") { const h = attr(m[0], "href"); if (h) return abs(h, base); } }
  return abs(inner(block, "guid"), base);
}
function whenOf(block: string, shift = 0) {
  for (const n of ["pubDate", "published", "updated", "dc:date", "a10:updated"]) { const v = inner(block, n); if (v) { const t = Date.parse(v); if (!isNaN(t)) return Math.min(t - shift * HOUR, Date.now()); } } // a clock still ahead of ours counts as now
  return 0;
}

/** one feed's stories (up to 15), or none if it can't be read */
export async function readSource(src: NewsSource, timeout = 5000): Promise<NewsItem[]> {
  try {
    const r = await fetch(src.url, { headers: UA, signal: AbortSignal.timeout(timeout), redirect: "follow", cache: "no-store" });
    if (!r.ok) return [];
    const xml = await r.text();
    let blocks = [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map((m) => m[0]);
    if (!blocks.length) blocks = [...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)].map((m) => m[0]);
    return blocks.slice(0, 15).map((b): NewsItem => {
      const title = plain(inner(b, "title")), link = linkOf(b, src.url);
      let text = plain(inner(b, "description") || inner(b, "summary") || inner(b, "content:encoded") || inner(b, "content"));
      if (src.id === "hn") { const pts = text.match(/Points:\s*(\d+)/i), com = text.match(/# Comments:\s*(\d+)/i); text = pts ? `${pts[1]} points${com ? ` · ${com[1]} comments` : ""} on Hacker News` : "On the Hacker News front page"; }
      if (text.toLowerCase().startsWith(title.toLowerCase())) text = text.slice(title.length).replace(/^[\s:.\-–—]+/, "");
      return { title: clip(title, 160), text: clip(text, 220), link, source: src.name, src: src.id, when: whenOf(b, src.shift), image: feedImage(b, src.url) };
    }).filter((i) => i.title && i.link);
  } catch { return []; }
}

/** the picture an article shares for link previews (og:image or twitter:image), from the first 400 KB of its page */
export async function shareImage(url: string, timeout = 3500): Promise<string> {
  try {
    const r = await fetch(url, { headers: { ...UA, Accept: "text/html,*/*;q=0.5" }, signal: AbortSignal.timeout(timeout), redirect: "follow", cache: "no-store" });
    if (!r.ok || !/html/i.test(r.headers.get("content-type") || "") || !r.body) return "";
    const reader = r.body.getReader(), dec = new TextDecoder();
    let html = "";
    while (html.length < 400_000) { const { done, value } = await reader.read(); if (done) break; html += dec.decode(value, { stream: true }); if (/<\/head>/i.test(html)) break; }
    reader.cancel().catch(() => {});
    for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
      const key = (attr(m[0], "property") || attr(m[0], "name")).toLowerCase();
      if (key === "og:image" || key === "og:image:url" || key === "og:image:secure_url" || key === "twitter:image" || key === "twitter:image:src") { const u = abs(attr(m[0], "content"), r.url || url); if (u) return bigger(u); }
    }
    const ln = html.match(/<link\b[^>]*rel=["']image_src["'][^>]*>/i);
    return ln ? abs(attr(ln[0], "href"), r.url || url) : "";
  } catch { return ""; }
}
/** a headline's main words; two headlines sharing most of them are the same story told by two sites */
const SKIP = new Set(["the", "and", "for", "with", "from", "that", "this", "are", "was", "has", "have", "its", "his", "her", "after", "into", "over", "more", "than", "says", "said", "new"]);
const words = (t: string) => new Set(t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").split(" ").filter((w) => w.length > 2 && !SKIP.has(w) && !/^\d+$/.test(w)));
function sameStory(a: Set<string>, b: Set<string>) { let n = 0; for (const w of a) if (b.has(w)) n++; return n >= 3 && n / Math.min(a.size, b.size) >= 0.6; }

/**
 * The newest stories of the chosen categories from every feed that's on, mixed so one outlet doesn't fill them all: the last day's stories (two days
 * if that's too few), the same story from a second site dropped, then the outlets take turns, each giving its newest; stories without a picture get their
 * article's, and those with one go first. Newest first.
 */
export async function latestNews(cats: string | string[], off: string[], count: number): Promise<NewsItem[]> {
  const cl = typeof cats === "string" ? [cats] : cats;
  const srcs = NEWS_SOURCES.filter((s) => cl.includes(s.cat) && !off.includes(s.id));
  const all = (await Promise.all(srcs.map((s) => readSource(s)))).flat();
  const now = Date.now();
  let fresh = all.filter((i) => i.when && now - i.when < 24 * HOUR);
  if (fresh.length < count) fresh = all.filter((i) => !i.when || now - i.when < 48 * HOUR);
  const seen: Set<string>[] = [], byNew = fresh.sort((a, b) => b.when - a.when).filter((i) => { const w = words(i.title); if (seen.some((x) => sameStory(x, w))) return false; seen.push(w); return true; });
  // the outlets take turns, newest outlet first
  const groups = new Map<string, NewsItem[]>();
  for (const i of byNew) { const g = groups.get(i.src); if (g) g.push(i); else groups.set(i.src, [i]); }
  const turns = [...groups.values()], picked: NewsItem[] = [], want = Math.min(byNew.length, count * 2);
  for (let r = 0; picked.length < want; r++) { let any = false; for (const g of turns) { if (g[r]) { picked.push(g[r]); any = true; if (picked.length >= want) break; } } if (!any) break; }
  await Promise.all(picked.map(async (i) => { if (!i.image) i.image = await shareImage(i.link); }));
  const withPic = picked.filter((i) => i.image), without = picked.filter((i) => !i.image);
  return [...withPic, ...without].slice(0, count).sort((a, b) => b.when - a.when);
}
