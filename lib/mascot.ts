/**
 * The ring around the hero photo (settings.ring) and the mascot (settings.mascot): what's stored, the choices,
 * and the cleaning that runs on every read and every save, so a bad value can never reach the page.
 */

// ---------- the ring around the hero photo ----------
export const RING_STYLES = {
  solid: { label: "Solid", desc: "A steady line in one colour" },
  glow: { label: "Pulsing glow", desc: "Breathes softly, like someone's online" },
  neon: { label: "Neon", desc: "A bright line with a soft halo that flickers" },
  story: { label: "Rainbow story", desc: "Spinning rainbow, like a story ring" },
  duo: { label: "Two-colour spin", desc: "Your colour and the theme's second colour, turning slowly" },
} as const;
export type RingStyle = keyof typeof RING_STYLES;
export const RING_COLORS = { status: "My status colour (grey when I'm away)", theme: "The theme's main colour", mood: "Today's mood colour", custom: "My own colour" } as const;
export type RingColor = keyof typeof RING_COLORS;
export type Ring = { on: boolean; style: RingStyle; color: RingColor; custom: string; width: number; gap: number; speed: number };
export const RING_WIDTH = [2, 16] as const;
export const RING_GAP = [0, 12] as const;
export const RING_SPEED = [25, 250] as const;
export const DEFAULT_RING: Ring = { on: true, style: "glow", color: "status", custom: "#35c46f", width: 6, gap: 0, speed: 100 };

const num = (v: unknown, [lo, hi]: readonly [number, number], d: number) => {
  const n = Number(v);
  return v !== "" && v != null && Number.isFinite(n) ? Math.round(Math.min(hi, Math.max(lo, n))) : d;
};
const hex = (v: unknown, d: string) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v.trim()) ? v.trim().toLowerCase() : d);
const oneOf = <T extends string>(v: unknown, list: Record<T, unknown> | readonly T[], d: T): T =>
  (Array.isArray(list) ? (list as readonly string[]).includes(v as string) : typeof v === "string" && v in (list as object)) ? (v as T) : d;
const text = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

export function cleanRing(raw: unknown): Ring {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Ring>;
  return {
    on: r.on === true,
    style: oneOf(r.style, RING_STYLES, DEFAULT_RING.style),
    color: oneOf(r.color, RING_COLORS, DEFAULT_RING.color),
    custom: hex(r.custom, DEFAULT_RING.custom),
    width: num(r.width, RING_WIDTH, DEFAULT_RING.width),
    gap: num(r.gap, RING_GAP, DEFAULT_RING.gap),
    speed: num(r.speed, RING_SPEED, DEFAULT_RING.speed),
  };
}

// ---------- the mascot ----------
export const MASCOT_CHARACTERS = {
  mini: { label: "Mini Shourobh", desc: "You, as an avatar: curly hair, trimmed beard, big smile, plaid shirt, jeans and sneakers" },
  inky: { label: "Inky", desc: "A squishy ink drop that wobbles and goes splat with joy" },
  bagh: { label: "Bagh", desc: "A Royal Bengal tiger cub with a tail that never stops wagging" },
  cha: { label: "Cha", desc: "A cup of milk tea with alpona dots, always warm and ready to chat" },
  megh: { label: "Megh", desc: "A little monsoon cloud: drizzles asleep, makes a rainbow when happy" },
} as const;
export type MascotCharacter = keyof typeof MASCOT_CHARACTERS;

export const MASCOT_ACTS = {
  peek: { label: "Peeks in from the side", emoji: "👀" },
  hang: { label: "Hangs from the menu bar", emoji: "🙌" },
  spider: { label: "Drops in upside down", emoji: "🙃" },
  rope: { label: "Bungees down on a rope", emoji: "🪢" },
  pop: { label: "Pops up from the bottom", emoji: "🐹" },
  sit: { label: "Sits on a card, swinging his legs", emoji: "🪑" },
  hide: { label: "Hides behind a heading", emoji: "🫣" },
} as const;
export type MascotAct = keyof typeof MASCOT_ACTS;
export const ACT_KEYS = Object.keys(MASCOT_ACTS) as MascotAct[];

export const MASCOT_OUTFITS = { plaid: "Plaid shirt over a tee", hoodie: "Black hoodie", denim: "Denim jacket", sharp: "Sharp blazer", jersey: "Bangladesh jersey" } as const;
export type MascotOutfit = keyof typeof MASCOT_OUTFITS;
export const MASCOT_BEARDS = { beard: "Trimmed beard", stubble: "Light stubble", clean: "Clean shave" } as const;
export type MascotBeard = keyof typeof MASCOT_BEARDS;
export const MASCOT_HAIR = { "#3a2a22": "Dark brown", "#1b1714": "Black", "#6b3a22": "Auburn", "#8a6a4a": "Light brown" } as const;
export const MASCOT_SKIN = { "#eaa982": "Warm", "#f1c19f": "Light", "#d4946a": "Tan", "#a8704c": "Deep" } as const;
export const MASCOT_MOVES = {
  wave: "Wave 👋", heart: "Share a heart 💚", think: "Curious 🤔", flex: "Flex 💪", fire: "Fired up 🔥", wink: "Wink 😉", laugh: "Laugh 😂",
} as const;
export type MascotMove = keyof typeof MASCOT_MOVES;
export const MOVE_KEYS = Object.keys(MASCOT_MOVES) as MascotMove[];
export const MASCOT_SIDES = { both: "Both sides", left: "Left side only", right: "Right side only" } as const;
export type MascotSide = keyof typeof MASCOT_SIDES;

export type MascotSettings = {
  on: boolean;
  character: MascotCharacter;
  /** "mix" plays every act in `mixActs`, one after another */
  act: MascotAct | "mix";
  mixActs: MascotAct[];
  side: MascotSide;
  /** percent of his normal size */
  size: number;
  /** seconds he stays away between appearances */
  gap: number;
  /** seconds without anyone moving before he dozes off; 0 never */
  sleepAfter: number;
  outfit: MascotOutfit;
  beard: MascotBeard;
  glasses: boolean;
  hair: string;
  skin: string;
  moves: MascotMove[];
  hello: string;
  lines: string[];
  /** what he says when a visitor reaches each section, by its slug; empty means its emoji and title */
  guide: Record<string, string>;
  talk: boolean;
  guideOn: boolean;
  eyes: boolean;
  duck: boolean;
  cheer: boolean;
  costumes: boolean;
  phones: boolean;
  everyPage: boolean;
};
export const MASCOT_SIZE = [60, 160] as const;
export const MASCOT_GAP = [1, 40] as const;
export const MASCOT_SLEEP = [0, 120] as const;
export const DEFAULT_LINES = ["Psst… 👀", "Hey you! 😄", "Did you see me?", "Boo! 😁", "Just hanging out 😎", "Nice of you to drop by!"];
export const DEFAULT_MASCOT: MascotSettings = {
  on: true, character: "mini", act: "mix", mixActs: [...ACT_KEYS], side: "both", size: 100, gap: 3, sleepAfter: 25,
  outfit: "plaid", beard: "beard", glasses: false, hair: "#3a2a22", skin: "#eaa982", moves: [...MOVE_KEYS],
  hello: "Hey! I'm Mini Shourobh. Glad you're here 😄", lines: DEFAULT_LINES, guide: {},
  talk: true, guideOn: true, eyes: true, duck: true, cheer: true, costumes: true, phones: true, everyPage: false,
};

export function cleanMascot(raw: unknown): MascotSettings {
  const m = (raw && typeof raw === "object" ? raw : {}) as Partial<MascotSettings>;
  const d = DEFAULT_MASCOT;
  const bool = (v: unknown, def: boolean) => (typeof v === "boolean" ? v : def);
  const list = <T extends string>(v: unknown, all: readonly T[], def: T[]) => (Array.isArray(v) ? all.filter((k) => v.includes(k)) : def);
  const guide: Record<string, string> = {};
  if (m.guide && typeof m.guide === "object") for (const [k, v] of Object.entries(m.guide)) if (/^[a-z0-9-]{1,60}$/.test(k) && text(v, 120)) guide[k] = text(v, 120);
  const mixActs = list(m.mixActs, ACT_KEYS, d.mixActs);
  return {
    on: bool(m.on, d.on),
    character: oneOf(m.character, MASCOT_CHARACTERS, d.character),
    act: m.act === "mix" ? "mix" : oneOf(m.act, MASCOT_ACTS, "peek"),
    mixActs: mixActs.length ? mixActs : d.mixActs,
    side: oneOf(m.side, MASCOT_SIDES, d.side),
    size: num(m.size, MASCOT_SIZE, d.size),
    gap: num(m.gap, MASCOT_GAP, d.gap),
    sleepAfter: num(m.sleepAfter, MASCOT_SLEEP, d.sleepAfter),
    outfit: oneOf(m.outfit, MASCOT_OUTFITS, d.outfit),
    beard: oneOf(m.beard, MASCOT_BEARDS, d.beard),
    glasses: bool(m.glasses, d.glasses),
    hair: oneOf(m.hair, MASCOT_HAIR, d.hair as keyof typeof MASCOT_HAIR),
    skin: oneOf(m.skin, MASCOT_SKIN, d.skin as keyof typeof MASCOT_SKIN),
    moves: list(m.moves, MOVE_KEYS, d.moves),
    hello: m.hello === undefined ? d.hello : text(m.hello, 120),
    lines: Array.isArray(m.lines) ? m.lines.map((l) => text(l, 80)).filter(Boolean).slice(0, 20) : d.lines,
    guide,
    talk: bool(m.talk, d.talk),
    guideOn: bool(m.guideOn, d.guideOn),
    eyes: bool(m.eyes, d.eyes),
    duck: bool(m.duck, d.duck),
    cheer: bool(m.cheer, d.cheer),
    costumes: bool(m.costumes, d.costumes),
    phones: bool(m.phones, d.phones),
    everyPage: bool(m.everyPage, d.everyPage),
  };
}

/** What the site's mascot needs: the settings, plus each section's line with the empty ones filled in. */
export type MascotView = Omit<MascotSettings, "guide"> & { guide: { slug: string; line: string }[] };
export function mascotView(m: MascotSettings, sections: { slug: string; title: string; nav_emoji?: string | null }[]): MascotView {
  return { ...m, guide: sections.map((s) => ({ slug: s.slug, line: m.guide[s.slug] || `${s.nav_emoji ? s.nav_emoji + " " : ""}${s.title}!` })) };
}
