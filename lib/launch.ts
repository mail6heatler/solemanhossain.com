// The launch screen: what plays the instant a visitor arrives, while the website loads behind it, then opens onto the site.
// Stored in settings.launch, cleaned on read and save (cleanLaunch). Drawn by components/site/LaunchScreen.tsx and moved by
// components/site/launchScenes.ts; whether it plays and which design is decided before the first paint by skinScript.
// The dashboard page is /admin/launch (components/admin/LaunchStudio.tsx). The owner liked all six designs (2026-11-27).

export const LAUNCH_KEYS = ["gate", "rocket", "particles", "movie", "street", "book"] as const;
export type LaunchKey = (typeof LAUNCH_KEYS)[number];

export const LAUNCH_DESIGNS: Record<LaunchKey, { name: string; line: string; icon: string }> = {
  gate: { name: "Boarding gate", line: "A boarding pass prints, gets stamped, the stub tears off and the gate doors slide open.", icon: "plane-departure" },
  rocket: { name: "Rocket launch", line: "Mini Shourobh fuels the rocket, hops in, counts down and lifts off into smoke.", icon: "rocket" },
  particles: { name: "Name from particles", line: "Glowing dots gather into your name as the site loads, then burst into it. Visitors can push them around.", icon: "sparkles" },
  movie: { name: "Movie opening", line: "A production card, a film countdown, then the title slams in and the screen opens.", icon: "movie" },
  street: { name: "Dhaka street race", line: "A CNG and a rickshaw race along the loading bar past a night skyline to the finish line.", icon: "road" },
  book: { name: "Scrapbook cover", line: "A sticker lands for each part that loads, then the band snaps and the book opens.", icon: "notebook" },
};

export type LaunchSettings = {
  on: boolean;
  /** one design, or "random": a different one from `pool` each visit */
  design: LaunchKey | "random";
  pool: LaunchKey[];
  /** opens by itself when the site is ready, or waits for the Enter button */
  ready: "auto" | "enter";
  /** how often a visitor sees it: once per visit, once a day, or only on their very first visit */
  freq: "visit" | "day" | "ever";
  /** on whichever page a visit starts, or only when it starts on the homepage */
  where: "any" | "home";
  phones: boolean;
  /** shortest time it shows even on a fast connection, and the longest it waits for a slow one before opening anyway */
  minSec: number;
  maxSec: number;
  skip: boolean;
  skipLabel: string;
  enterLabel: string;
  /** a click or tap anywhere skips (or enters, once ready); a key always does */
  clickSkips: boolean;
  /** "own": the launch screen's own colours; "theme": its accent follows the site's theme */
  colors: "own" | "theme";
  gate: { band: string; board: string; fromCode: string; fromName: string; toCode: string; toName: string; passenger: string; gate: string; seat: string; flight: string; stamp: string; stub: string };
  rocket: { name: string; lines: string; countFrom: number; mini: boolean };
  particles: { word: string; sub: string; hint: string; touch: boolean };
  movie: { pre: string; studio: string; post: string; title: string; starring: string; grain: boolean };
  street: { lines: string; sign: string; done: string; honk: string };
  book: { title: string; by: string; welcome: string; signed: string; collecting: string; allIn: string };
};

export const LAUNCH_LIMITS = { minSec: [1, 8], maxSec: [4, 25], countFrom: [3, 10] } as const;

export const DEFAULT_LAUNCH: LaunchSettings = {
  on: true, design: "random", pool: [...LAUNCH_KEYS], ready: "auto", freq: "visit", where: "any", phones: true,
  minSec: 2.6, maxSec: 12, skip: true, skipLabel: "Skip ›", enterLabel: "Enter the site", clickSkips: true, colors: "own",
  gate: { band: "✈ BOARDING PASS", board: "LIFE CHRONICLE", fromCode: "YOU", fromName: "Anywhere", toCode: "DAC", toName: "{nick}'s world", passenger: "YOU, THE VISITOR", gate: "S1", seat: "1A", flight: "LC 2026", stamp: "WELCOME ABOARD", stub: "{NAME}" },
  rocket: { name: "", lines: "Fuelling up {rocket}…\nChecking the engines…\nPacking snacks for the trip…\nPointing it at the website…", countFrom: 3, mini: true },
  particles: { word: "{NICK}", sub: "Life Chronicle", hint: "Move your mouse (or finger) through the dots", touch: true },
  movie: { pre: "A", studio: "{NICK}", post: "production", title: "LIFE CHRONICLE", starring: "starring {name}", grain: true },
  street: { lines: "Brewing cha…\nDodging traffic on Mirpur Road…\nSqueezing past a bus…\nHonking politely…\nAlmost there…", sign: "WEBSITE ➜", done: "Made it!", honk: "PEEP PEEP!" },
  book: { title: "Life Chronicle", by: "by {nick}", welcome: "Welcome in!", signed: "— {nick}", collecting: "Collecting the pages…", allIn: "All the pages are in!" },
};

const txt = (v: unknown, d: string, max: number) => (typeof v === "string" ? v.slice(0, max) : d);
const num = (v: unknown, d: number, [lo, hi]: readonly [number, number]) => (typeof v === "number" && isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v * 10) / 10)) : d);
const one = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);
const flag = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
/** every text field of a group, each kept to its length; anything missing or wrong takes the default */
function texts<T extends Record<string, unknown>>(raw: unknown, d: T, max: Partial<Record<keyof T, number>> = {}): T {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = { ...d } as Record<string, unknown>;
  for (const k of Object.keys(d)) {
    const dv = d[k];
    out[k] = typeof dv === "string" ? txt(o[k], dv, (max[k as keyof T] as number) ?? 60) : typeof dv === "boolean" ? flag(o[k], dv) : dv;
  }
  return out as T;
}

export function cleanLaunch(raw: unknown): LaunchSettings {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_LAUNCH;
  const pool = Array.isArray(o.pool) ? LAUNCH_KEYS.filter((k) => (o.pool as unknown[]).includes(k)) : d.pool;
  const rk = (o.rocket && typeof o.rocket === "object" ? o.rocket : {}) as Record<string, unknown>;
  const minSec = num(o.minSec, d.minSec, LAUNCH_LIMITS.minSec);
  return {
    on: flag(o.on, d.on),
    design: one(o.design, [...LAUNCH_KEYS, "random"] as const, d.design),
    pool: pool.length ? pool : [...LAUNCH_KEYS],
    ready: one(o.ready, ["auto", "enter"] as const, d.ready),
    freq: one(o.freq, ["visit", "day", "ever"] as const, d.freq),
    where: one(o.where, ["any", "home"] as const, d.where),
    phones: flag(o.phones, d.phones),
    minSec,
    maxSec: Math.max(minSec + 1, num(o.maxSec, d.maxSec, LAUNCH_LIMITS.maxSec)),
    skip: flag(o.skip, d.skip),
    skipLabel: txt(o.skipLabel, d.skipLabel, 24) || d.skipLabel,
    enterLabel: txt(o.enterLabel, d.enterLabel, 30) || d.enterLabel,
    clickSkips: flag(o.clickSkips, d.clickSkips),
    colors: one(o.colors, ["own", "theme"] as const, d.colors),
    gate: texts(o.gate, d.gate, { band: 28, board: 18, fromCode: 4, toCode: 4, fromName: 22, toName: 24, passenger: 24, gate: 4, seat: 4, flight: 10, stamp: 24, stub: 30 }),
    rocket: { ...texts(rk, { name: d.rocket.name, lines: d.rocket.lines }, { name: 24, lines: 600 }), countFrom: Math.round(num(rk.countFrom, d.rocket.countFrom, LAUNCH_LIMITS.countFrom)), mini: flag(rk.mini, d.rocket.mini) },
    particles: texts(o.particles, d.particles, { word: 14, sub: 30, hint: 70 }),
    movie: texts(o.movie, d.movie, { pre: 12, studio: 18, post: 20, title: 24, starring: 50 }),
    street: texts(o.street, d.street, { lines: 600, sign: 18, done: 24, honk: 18 }),
    book: texts(o.book, d.book, { title: 30, by: 30, welcome: 30, signed: 30, collecting: 40, allIn: 40 }),
  };
}

export type LaunchNames = { nick: string; name: string; rocket: string };
/** fills {nick}, {name} and {rocket} (and {NICK}, {NAME} in capitals) */
export function launchWords(s: string, n: LaunchNames) {
  return s.replace(/\{(nick|name|rocket|NICK|NAME)\}/g, (_, k: string) => {
    const v = k === "nick" ? n.nick : k === "name" ? n.name : k === "rocket" ? n.rocket : k === "NICK" ? n.nick.toUpperCase() : n.name.toUpperCase();
    return v;
  });
}
/** a list typed one per line, without empty lines */
export const launchLines = (s: string, n: LaunchNames) => s.split("\n").map((l) => launchWords(l.trim(), n)).filter(Boolean);
