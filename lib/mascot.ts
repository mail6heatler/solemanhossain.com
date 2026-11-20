/**
 * Mini Shourobh, the site's mascot (settings.mascot). What the dashboard's Mascot page stores, its defaults, and the
 * cleaning that runs on every read and save. The drawing and the show are components/site/mascotRig.ts (one living
 * copy of him) and components/site/mascotEngine.ts (him on the page: sections, chat, games, rocket, throwing).
 * Chosen by the owner on 2026-11-21 from the preview https://claude.ai/artifact/S14ayCZy8ZurmMfkwP5CsA.
 */

export const MZ_SKINS = ["#f0c7a1", "#dba27a", "#c58a62", "#a36b45", "#7f4f31"] as const;
export const MZ_SHIRTS = { teal: ["#1f7f7c", "#0f3b3a", "Teal plaid"], maroon: ["#8c2f3c", "#45131b", "Maroon plaid"], navy: ["#2d4f86", "#14254a", "Navy plaid"], olive: ["#6b7a2e", "#333b12", "Olive plaid"] } as const;
export const MZ_JEANS = { light: ["#8fb3dc", "#6d93c2", "Light blue"], dark: ["#3f5a86", "#2b3f63", "Dark blue"], black: ["#3a3d45", "#25272d", "Black"] } as const;
export type MzShirt = keyof typeof MZ_SHIRTS;
export type MzJeans = keyof typeof MZ_JEANS;

/** His move in each section, picked by the section's layout. */
export const MZ_BITS = [
  ["hero", "Hero", "Waves hello"], ["me", "Me (notes)", "Hand on heart, proud nod"], ["made", "Made (projects)", "Types on his laptop"],
  ["adventures", "Adventures (trips)", "Looks through binoculars"], ["influences", "Influences (shelf)", "Reads a book"], ["feed", "Feed (thoughts)", "Shouts through a megaphone"],
  ["growth", "Growth (milestones)", "Lifts a trophy and jumps"], ["life", "Life (snapshots)", "Snaps a photo"], ["connect", "Connect", "Sends a paper plane"],
] as const;
export type MzBit = (typeof MZ_BITS)[number][0];
export const MZ_BIT_OF_LAYOUT: Record<string, MzBit> = {
  notes: "me", windows: "made", cards: "made", tickets: "adventures", strip: "adventures", study: "influences", list: "influences",
  comic: "feed", stream: "feed", awards: "growth", timeline: "growth", scrapbook: "life", photos: "life", chat: "connect", connect: "connect",
};

export const MZ_TRICKS = [["wave", "👋 Wave"], ["flex", "💪 Flex"], ["dance", "🕺 Dance"], ["cheer", "🙌 Cheer"], ["backflip", "🤸 Backflip"], ["think", "💡 Big idea"], ["highfive", "✋ High five"], ["fireup", "🔥 Fired up"]] as const;
export type MzTrick = (typeof MZ_TRICKS)[number][0];

export const MZ_QA = [
  ["who", "Proud pose with a cape and shades"], ["job", "Glasses on, types on his laptop"], ["from", "Waves a Bangladesh flag"], ["joke", "Drum hit, then rolls on the floor laughing"],
  ["food", "Sips cha, then a spicy fuchka"], ["single", "Blushes and kicks his foot"], ["sing", "Sings into a microphone"], ["trick", "Does his next trick"],
  ["game", "Rock, paper, scissors"], ["tour", "Takes you to the next section"], ["bye", "Rocket ship, back by parachute"],
] as const;
export type MzQa = (typeof MZ_QA)[number][0];
export type MzQaItem = { on: boolean; q: string; a: string };

export const MZ_GAMES = [["football", "⚽ Keepy-ups"], ["cricket", "🏏 Cricket six"], ["yawn", "🥱 Yawn and stretch"], ["whistle", "🎵 Whistles"], ["phone", "📱 Laughs at his phone"]] as const;
export type MzGame = (typeof MZ_GAMES)[number][0];

export type MascotSettings = {
  show: boolean; phones: boolean;
  place: "corner" | "peek" | "host"; side: "right" | "left"; size: number;
  skin: string; hair: "curly" | "swept" | "short"; beard: "trim" | "stubble" | "clean"; glasses: boolean; shirt: MzShirt; jeans: MzJeans;
  chat: "quiet" | "normal" | "chatty"; follow: boolean; duck: boolean; cheer: boolean; nap: boolean; napAfter: number;
  tricks: Record<MzTrick, boolean>;
  acts: Record<MzBit, boolean>;
  greet: string;
  lines: Record<Exclude<MzBit, "hero">, string>;
  qa: Record<MzQa, MzQaItem>;
  fun: {
    ground: boolean; throw: boolean; tickle: boolean; bored: boolean; boredAfter: number; games: Record<MzGame, boolean>;
    rocket: boolean; backAfter: number; notice: { fast: boolean; end: boolean; back: boolean; point: boolean }; hearts: boolean; sounds: boolean;
  };
  moments: { auto: boolean; morning: boolean; night: boolean; rain: boolean; eid: boolean; birthday: string };
};

export const MZ_LIMITS = { size: [70, 140], napAfter: [15, 300], boredAfter: [5, 120], backAfter: [2, 30] } as const;

const allOn = <K extends string>(keys: readonly (readonly [K, ...unknown[]])[]) => Object.fromEntries(keys.map(([k]) => [k, true])) as Record<K, boolean>;

export const DEFAULT_MASCOT: MascotSettings = {
  show: true, phones: true, place: "corner", side: "right", size: 100,
  skin: "#c58a62", hair: "curly", beard: "trim", glasses: false, shirt: "teal", jeans: "light",
  chat: "normal", follow: true, duck: true, cheer: true, nap: true, napAfter: 45,
  tricks: allOn(MZ_TRICKS),
  acts: allOn(MZ_BITS),
  greet: "Hey, I'm Mini Shourobh! Good {time} from Dhaka.",
  lines: {
    me: "This bit is all about me. The big me, I mean.", made: "Built all of these myself. Click one, they're real.", adventures: "Next stop? Somewhere with a sea view.",
    influences: "These shaped how I think. Borrow one?", feed: "Hot takes ahead! Tap the art to vote.", growth: "Every one of these took a while. Worth it.",
    life: "Say cheese! The everyday stuff.", connect: "Say hello! I do reply, promise.",
  },
  qa: {
    who: { on: true, q: "Who are you?", a: "I'm Shourobh! Well, the mini one.\nData officer by day, maker by night.\nBorn and raised in Dhaka.\nThis whole site? Mine. 😎" },
    job: { on: true, q: "What do you do?", a: "I make sense of data at work. 📊\nAnd I build things like this site for fun." },
    from: { on: true, q: "Where are you from?", a: "Dhaka, Bangladesh!\nHome of fuchka, cha and epic traffic." },
    joke: { on: true, q: "Tell me a joke", a: "Why don't programmers like nature?\nToo many bugs." },
    food: { on: true, q: "Favourite food?", a: "Cha, always. ☕\nAnd fuchka. Extra spicy!" },
    single: { on: true, q: "Are you single?", a: "Haha… 🙈\nAsk the big me. 😉" },
    sing: { on: true, q: "Sing a song", a: "🎵 La la la, welcome to my site…\n🎶 Scroll around, stay a while!" },
    trick: { on: true, q: "Do a trick!", a: "" },
    game: { on: true, q: "Let's play a game", a: "Rock, paper, scissors! You pick first." },
    tour: { on: true, q: "Show me around", a: "Follow me!" },
    bye: { on: true, q: "Goodbye!", a: "Bye! See you soon! 👋" },
  },
  fun: {
    ground: true, throw: true, tickle: true, bored: true, boredAfter: 12, games: allOn(MZ_GAMES),
    rocket: true, backAfter: 4, notice: { fast: true, end: true, back: true, point: true }, hearts: true, sounds: false,
  },
  moments: { auto: true, morning: true, night: true, rain: false, eid: false, birthday: "" },
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, max: number, fallback: string) => (typeof v === "string" ? v.replace(/[\u0000-\u0009\u000b-\u001f]/g, " ").slice(0, max) : fallback);
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const num = (v: unknown, [lo, hi]: readonly [number, number], fallback: number) => { const n = Number(v); return v !== "" && v !== null && Number.isFinite(n) ? Math.round(Math.min(hi, Math.max(lo, n))) : fallback; };
const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);
const flags = <K extends string>(raw: unknown, def: Record<K, boolean>) => { const r = isObj(raw) ? raw : {}; return Object.fromEntries(Object.keys(def).map((k) => [k, bool(r[k], def[k as K])])) as Record<K, boolean>; };

/** Anything stored or sent becomes a complete, safe MascotSettings (missing parts take the defaults). */
export function cleanMascot(raw: unknown): MascotSettings {
  const r = isObj(raw) ? raw : {}, D = DEFAULT_MASCOT;
  const lr = isObj(r.lines) ? r.lines : {}, qr = isObj(r.qa) ? r.qa : {}, fr = isObj(r.fun) ? r.fun : {}, nr = isObj(fr.notice) ? fr.notice : {}, mr = isObj(r.moments) ? r.moments : {};
  return {
    show: bool(r.show, D.show), phones: bool(r.phones, D.phones),
    place: oneOf(r.place, ["corner", "peek", "host"] as const, D.place), side: oneOf(r.side, ["right", "left"] as const, D.side), size: num(r.size, MZ_LIMITS.size, D.size),
    skin: typeof r.skin === "string" && /^#[0-9a-f]{6}$/i.test(r.skin) ? r.skin : D.skin,
    hair: oneOf(r.hair, ["curly", "swept", "short"] as const, D.hair), beard: oneOf(r.beard, ["trim", "stubble", "clean"] as const, D.beard), glasses: bool(r.glasses, D.glasses),
    shirt: oneOf(r.shirt, Object.keys(MZ_SHIRTS) as MzShirt[], D.shirt), jeans: oneOf(r.jeans, Object.keys(MZ_JEANS) as MzJeans[], D.jeans),
    chat: oneOf(r.chat, ["quiet", "normal", "chatty"] as const, D.chat), follow: bool(r.follow, D.follow), duck: bool(r.duck, D.duck), cheer: bool(r.cheer, D.cheer),
    nap: bool(r.nap, D.nap), napAfter: num(r.napAfter, MZ_LIMITS.napAfter, D.napAfter),
    tricks: flags(r.tricks, D.tricks), acts: flags(r.acts, D.acts),
    greet: text(r.greet, 160, D.greet),
    lines: Object.fromEntries(Object.keys(D.lines).map((k) => [k, text(lr[k], 160, D.lines[k as keyof typeof D.lines])])) as MascotSettings["lines"],
    qa: Object.fromEntries(MZ_QA.map(([k]) => { const q = isObj(qr[k]) ? qr[k] : {}; return [k, { on: bool(q.on, D.qa[k].on), q: text(q.q, 60, D.qa[k].q).replace(/\n/g, " "), a: text(q.a, 500, D.qa[k].a) }]; })) as MascotSettings["qa"],
    fun: {
      ground: bool(fr.ground, D.fun.ground), throw: bool(fr.throw, D.fun.throw), tickle: bool(fr.tickle, D.fun.tickle), bored: bool(fr.bored, D.fun.bored),
      boredAfter: num(fr.boredAfter, MZ_LIMITS.boredAfter, D.fun.boredAfter), games: flags(fr.games, D.fun.games),
      rocket: bool(fr.rocket, D.fun.rocket), backAfter: num(fr.backAfter, MZ_LIMITS.backAfter, D.fun.backAfter),
      notice: flags(nr, D.fun.notice), hearts: bool(fr.hearts, D.fun.hearts), sounds: bool(fr.sounds, D.fun.sounds),
    },
    moments: {
      auto: bool(mr.auto, D.moments.auto), morning: bool(mr.morning, D.moments.morning), night: bool(mr.night, D.moments.night),
      rain: bool(mr.rain, D.moments.rain), eid: bool(mr.eid, D.moments.eid),
      birthday: typeof mr.birthday === "string" && /^\d{4}-\d{2}-\d{2}$/.test(mr.birthday) ? mr.birthday : "",
    },
  };
}

/** What the public page needs besides the settings: the owner's clock, for "good evening" and the moments. */
export type MascotView = { m: MascotSettings; timezone: string };
