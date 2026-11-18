/**
 * The hero's design (settings.heroDesign): which of its two looks it wears (the owner kept the hanging photo and the magazine cover, 2026-11-19), its background, which pieces show, which numbers, extra buttons,
 * headlines that take turns, and the size and place of each piece the owner dragged in the dashboard's hero editor. Cleaned on every read and save.
 * The words themselves (name, headline, subtitle, chips…) stay in their own settings fields, so every look shows the same content.
 */
import { cleanPartSizes, type PartSizes } from "./partSize";

export const HERO_LOOKS = [
  ["hang", "Hanging photo", "Your photo on tape, swinging, with the words beside it (as before)"],
  ["magazine", "Magazine cover", "Your photo is the cover, your nickname the masthead, roles and numbers the cover lines"],
] as const;
export type HeroLook = (typeof HERO_LOOKS)[number][0];

export const HERO_BGS = [
  ["own", "As on the Appearance page"],
  ["aurora", "Aurora glow"],
  ["dots", "Dot grid"],
  ["blur", "My photo, blurred"],
  ["plain", "Plain"],
] as const;
export type HeroBg = (typeof HERO_BGS)[number][0];

/** Pieces of the hero that can be turned off one by one. */
export const HERO_PIECES = [
  ["status", "Status line"], ["mood", "Mood"], ["live", "People here now"], ["roles", "Role chips"], ["now", "Now line"], ["clock", "Local time"],
  ["greeting", "Greeting"], ["stats", "Numbers"], ["skills", "Skills strip"], ["cue", "Scroll hint"], ["emojis", "Floating emojis"], ["buttons", "Buttons"],
] as const;
export type HeroPiece = (typeof HERO_PIECES)[number][0];

export type HeroButton = { label: string; url: string };
export type HeroDesign = {
  look: HeroLook;
  /** a different look on phones; empty means the same */
  phoneLook: HeroLook | "";
  bg: HeroBg;
  hide: Partial<Record<HeroPiece, true>>;
  /** more headlines that take turns with the main one */
  rotate: string[];
  rotateOn: boolean;
  /** which numbers show: section slugs, and "reactions"; empty picks them by itself */
  stats: string[];
  /** buttons after Résumé and the second button */
  buttons: HeroButton[];
  /** the magazine's masthead; empty is the nickname */
  mast: string;
  /** the poster's line above the photo */
  presents: string;
  /** the terminal's prompt name */
  prompt: string;
  /** the photo's shape in the looks that crop it */
  shape: "round" | "square" | "arch";
  parts?: PartSizes;
};

export const MAX_HERO_BUTTONS = 6, MAX_ROTATE = 6;
export const DEFAULT_HERO_DESIGN: HeroDesign = { look: "hang", phoneLook: "", bg: "own", hide: {}, rotate: [], rotateOn: false, stats: [], buttons: [], mast: "", presents: "", prompt: "", shape: "arch" };

const LOOK_KEYS = HERO_LOOKS.map(([k]) => k) as string[];
const text = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
const safe = (u: string) => (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(u) ? u : "");

export function cleanHeroDesign(raw: unknown): HeroDesign {
  let o: Record<string, unknown> = {};
  try {
    const v = typeof raw === "string" ? JSON.parse(raw || "{}") : raw;
    if (v && typeof v === "object" && !Array.isArray(v)) o = v as Record<string, unknown>;
  } catch { /* unreadable: the defaults */ }
  const d = DEFAULT_HERO_DESIGN;
  const hide: HeroDesign["hide"] = {};
  if (o.hide && typeof o.hide === "object") for (const [k] of HERO_PIECES) if ((o.hide as Record<string, unknown>)[k] === true) hide[k] = true;
  const list = (v: unknown) => (Array.isArray(v) ? v : []);
  const parts = cleanPartSizes(o.parts);
  return {
    look: LOOK_KEYS.includes(String(o.look)) ? (o.look as HeroLook) : d.look,
    phoneLook: LOOK_KEYS.includes(String(o.phoneLook)) ? (o.phoneLook as HeroLook) : "",
    bg: HERO_BGS.some(([k]) => k === o.bg) ? (o.bg as HeroBg) : d.bg,
    hide,
    rotate: list(o.rotate).map((x) => text(x, 120)).filter(Boolean).slice(0, MAX_ROTATE),
    rotateOn: o.rotateOn === true,
    stats: list(o.stats).map((x) => text(x, 60)).filter((x) => /^[a-z0-9-]+$/.test(x)).slice(0, 6),
    buttons: list(o.buttons).map((b) => ({ label: text((b as HeroButton)?.label, 40), url: safe(text((b as HeroButton)?.url, 500)) })).filter((b) => b.label && b.url).slice(0, MAX_HERO_BUTTONS),
    mast: text(o.mast, 24),
    presents: text(o.presents, 60),
    prompt: text(o.prompt, 24).replace(/\s+/g, "-"),
    shape: o.shape === "round" || o.shape === "square" ? o.shape : "arch",
    ...(Object.keys(parts).length ? { parts } : {}),
  };
}
