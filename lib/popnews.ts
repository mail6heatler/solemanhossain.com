/**
 * The news pop-up (2026-11-28, the owner's "go with all" on https://claude.ai/artifact/6ymLk9wQqJBvkj88CAxevP): after the launch screen has
 * opened onto the site, a pop-up brings a trend, a viral story or news, like an app's offer window. Stored in settings.popnews, cleaned on read
 * and save. The owner writes each story (`manual`, on by default) and/or switches on `auto`: the latest headlines of the chosen categories
 * from dozens of news sites, with their pictures, renewed every 30 minutes (lib/newsSources.ts). Each has its own switch; with both on, the
 * owner's stories come first and the headlines follow (2026-11-28; until then turning one on turned the other off). Drawn by components/site/PopNews.tsx and popNewsShow.ts; the dashboard page is
 * /admin/popnews (components/admin/PopnewsStudio.tsx).
 */
import type { Media } from "./settings";

export const POP_LOOKS = [["breaking", "Breaking news"], ["story", "Story card"], ["gift", "Gift box"], ["paper", "Newspaper"], ["random", "A different one each time"]] as const;
export const POP_WHERE = [["middle", "Middle of the screen"], ["corner", "Corner card"]] as const;
export const POP_WHEN = [["visit", "Once per visit"], ["day", "Once a day"], ["new", "Only when a story is new"]] as const;
export const POP_PAGES = [["home", "Homepage only"], ["any", "Any page"]] as const;
/** the categories automatic headlines can come from; each has its own news sites in lib/newsSources.ts */
export const POP_FEEDS = [["bd", "🇧🇩 Bangladesh"], ["world", "🌍 World"], ["tech", "💻 Technology"], ["science", "🔬 Science"], ["sports", "🏏 Sports"], ["business", "📈 Business"]] as const;
/** the colour behind a story without a picture */
export const POP_ARTS = [["violet", "linear-gradient(135deg, #3b2a8f, #8b5cf6 60%, #f0abfc)"], ["green", "linear-gradient(135deg, #0f766e, #22c55e 65%, #bbf7d0)"], ["sunset", "linear-gradient(135deg, #b45309, #f97316 60%, #fde68a)"],
  ["ocean", "linear-gradient(135deg, #1e3a8a, #3b82f6 60%, #bfdbfe)"], ["rose", "linear-gradient(135deg, #9f1239, #f43f5e 60%, #fecdd3)"], ["night", "linear-gradient(135deg, #0b1020, #312e81 60%, #6366f1)"]] as const;
export type PopLook = (typeof POP_LOOKS)[number][0];
export type PopFeed = (typeof POP_FEEDS)[number][0];
export type PopArt = (typeof POP_ARTS)[number][0];

export type PopStory = {
  /** a few letters that never change, so its numbers and "already seen" survive edits */
  id: string;
  on: boolean;
  tag: string; title: string; text: string;
  /** pictures, GIFs or videos uploaded or linked (the first one shows) */
  media: Media[];
  emoji: string; art: PopArt;
  source: string; button: string; link: string;
  /** shows from and until these days (YYYY-MM-DD in the owner's time zone), empty for always */
  start: string; end: string;
};

export type PopnewsSettings = {
  on: boolean;
  manual: boolean; auto: boolean;
  look: PopLook; where: "middle" | "corner"; when: "visit" | "day" | "new"; pages: "home" | "any"; phones: boolean;
  /** seconds after the site is ready (and the launch screen has opened) */
  wait: number;
  /** seconds each story stays before the next slides in by itself (0: only by hand) */
  slide: number;
  stories: PopStory[];
  /** the categories automatic headlines mix (at least one), the news sites switched off (lib/newsSources.ts ids) and how many headlines */
  feeds: PopFeed[]; off: string[]; count: number;
  /** the newspaper's name on the Newspaper look */
  paperName: string;
};

export const POP_LIMITS = { wait: [1, 30], slide: [0, 20], count: [1, 10], stories: 12 } as const;

export const DEFAULT_POPNEWS: PopnewsSettings = {
  on: true, manual: true, auto: false, look: "breaking", where: "middle", when: "visit", pages: "any", phones: true, wait: 3, slide: 7,
  stories: [{
    id: "first", on: true, tag: "🔥 Trending", title: "New: lock Mini Shourobh in a tarot card",
    text: "Pick him up and a tarot card pops up. Drop him in and he's sealed inside, until someone taps him free.",
    media: [], emoji: "🃏", art: "violet", source: "Life Chronicle", button: "Try it", link: "/", start: "", end: "",
  }],
  feeds: ["bd"], off: [], count: 5, paperName: "The Daily Shourobh",
};

export const newStory = (): PopStory => ({
  id: Math.random().toString(36).slice(2, 8), on: true, tag: "📰 News", title: "", text: "", media: [], emoji: "📰", art: "green", source: "", button: "Read more", link: "", start: "", end: "",
});

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, max: number, fallback: string) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").slice(0, max) : fallback);
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const num = (v: unknown, [lo, hi]: readonly [number, number], fallback: number) => { const n = Number(v); return v !== "" && v !== null && Number.isFinite(n) ? Math.round(Math.min(hi, Math.max(lo, n))) : fallback; };
const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);
const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
/** a link the pop-up's button may open: the site's own pages, or http(s) */
const link = (v: unknown) => { const s = text(v, 500, "").trim(); return /^(https?:\/\/|\/)/i.test(s) ? s : s ? `https://${s.replace(/^\/+/, "")}` : ""; };
const media = (v: unknown): Media[] => (Array.isArray(v) ? v : []).filter(isObj).flatMap((m) => {
  const url = text(m.url, 1000, ""), type = m.type === "video" ? "video" : m.type === "image" ? "image" : null;
  return url && type && /^(https?:\/\/|\/)/.test(url) ? [{ url, type, ...(typeof m.thumb === "string" ? { thumb: text(m.thumb, 1000, "") } : {}), ...(typeof m.name === "string" ? { name: text(m.name, 120, "") } : {}) } as Media] : [];
}).slice(0, 6);

const FEED_KEYS = POP_FEEDS.map(([k]) => k) as PopFeed[];
/** the chosen categories, in the dashboard's order; a single `feed` saved before 2026-11-28 becomes a list of one */
function feedsOf(r: Record<string, unknown>): PopFeed[] {
  const want = Array.isArray(r.feeds) ? r.feeds : typeof r.feed === "string" ? [r.feed] : DEFAULT_POPNEWS.feeds;
  const l = FEED_KEYS.filter((k) => want.includes(k));
  return l.length ? l : [...DEFAULT_POPNEWS.feeds];
}

/** Anything stored or sent becomes complete, safe settings. `manual` and `auto` can both be on. */
export function cleanPopnews(raw: unknown): PopnewsSettings {
  const r = isObj(raw) ? raw : {}, D = DEFAULT_POPNEWS;
  const auto = bool(r.auto, D.auto), manual = bool(r.manual, D.manual);
  const ids = new Set<string>();
  const stories = (Array.isArray(r.stories) ? r.stories : D.stories).filter(isObj).slice(0, POP_LIMITS.stories).map((s) => {
    let id = text(s.id, 12, "").replace(/[^a-z0-9]/gi, "") || Math.random().toString(36).slice(2, 8);
    while (ids.has(id)) id += "x";
    ids.add(id);
    return {
      id, on: bool(s.on, true), tag: text(s.tag, 30, ""), title: text(s.title, 140, ""), text: text(s.text, 400, ""), media: media(s.media),
      emoji: text(s.emoji, 8, "📰"), art: oneOf(s.art, POP_ARTS.map(([k]) => k), "green"), source: text(s.source, 40, ""), button: text(s.button, 24, "Read more"),
      link: link(s.link), start: day(s.start), end: day(s.end),
    };
  });
  return {
    on: bool(r.on, D.on), manual, auto,
    look: oneOf(r.look, POP_LOOKS.map(([k]) => k), D.look), where: oneOf(r.where, ["middle", "corner"] as const, D.where), when: oneOf(r.when, ["visit", "day", "new"] as const, D.when),
    pages: oneOf(r.pages, ["home", "any"] as const, D.pages), phones: bool(r.phones, D.phones), wait: num(r.wait, POP_LIMITS.wait, D.wait), slide: num(r.slide, POP_LIMITS.slide, D.slide),
    stories, feeds: feedsOf(r), off: (Array.isArray(r.off) ? r.off : []).filter((x): x is string => typeof x === "string" && /^[a-z0-9-]{1,24}$/.test(x)).slice(0, 80),
    count: num(r.count, POP_LIMITS.count, D.count),
    paperName: text(r.paperName, 40, D.paperName).trim() || D.paperName,
  };
}

/** what a visitor's browser gets for one story: the same shape for the owner's stories and the automatic headlines (which add when they were published) */
export type PopItem = { id: string; tag: string; title: string; text: string; media: Media | null; emoji: string; art: string; source: string; button: string; link: string; when?: number };
export const artOf = (k: string) => (POP_ARTS.find(([x]) => x === k) || POP_ARTS[1])[1];
