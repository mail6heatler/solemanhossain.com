/**
 * The menu bar's and the footer's designs (settings.menu, settings.footer), set on their dashboard pages (/admin/menu, /admin/footer) and chosen
 * by the owner from the preview at https://claude.ai/artifact/6bgaziF1gNeXq4fcK96gni ("go for all those", 2026-11-19). Cleaned on every read and
 * save, so a missing field is always its default. The footer's two lines stay in settings.footerLeft and footerRight.
 */

export const MENU_LOOKS = [
  ["classic", "Classic bar (as before)", "Your name, the sections and the round buttons, as the site always had"],
  ["play", "Now playing", "Your site is an album, each section a track; an equalizer dances, harder when people scroll fast"],
  ["sky", "Live sky", "The sky over Dhaka right now: sun or moon moving, clouds drifting, stars at night"],
  ["neon", "Neon nights", "Your name a neon sign on a brick wall; the section you're in glows in its own colour"],
  ["comic", "Comic pop", "Comic captions on halftone dots; the section you reach gets a POW! and a shake"],
  ["blob", "Gooey blob", "A wobbling candy blob slides to whatever is pointed at"],
  ["ticker", "Live ticker", "A news strip runs on top; a pen line draws itself under the section you're in"],
  ["dhaka", "Dhaka window", "A sunset skyline in layers that slide as you scroll, with a rickshaw"],
  ["aurora", "Aurora spotlight", "Northern lights flow behind; a spotlight swings to the section you're in"],
] as const;
export type MenuLook = (typeof MENU_LOOKS)[number][0];

export const MENU_BGS = [
  ["own", "The look's own"], ["sky", "Live sky"], ["eq", "Equalizer"], ["aurora", "Aurora"], ["brick", "Neon brick"], ["halftone", "Comic dots"],
  ["dhaka", "Dhaka skyline"], ["candy", "Candy blobs"], ["confetti", "Falling confetti"], ["theme", "Follows the theme"], ["solid", "Plain"],
] as const;
export type MenuBg = (typeof MENU_BGS)[number][0];
/** Each look's own background. */
export const OWN_BG: Record<MenuLook, Exclude<MenuBg, "own">> = { classic: "theme", play: "eq", sky: "sky", neon: "brick", comic: "halftone", blob: "candy", ticker: "confetti", dhaka: "dhaka", aurora: "aurora" };

export const PHONE_MENUS = [["bottom", "Bottom bar (as before)"], ["orb", "Orb that blooms"], ["sheet", "Pull-up sheet"], ["full", "Full-screen menu"]] as const;
export type PhoneMenu = (typeof PHONE_MENUS)[number][0];
export const SKY_TIMES = [["now", "Follows Dhaka's clock"], ["dawn", "Always dawn"], ["day", "Always day"], ["sunset", "Always sunset"], ["night", "Always night"]] as const;
export type SkyTime = (typeof SKY_TIMES)[number][0];

export const MENU_EXTRAS = [
  ["react", "Reacts to scroll speed"], ["slim", "Slims down after the hero"], ["hide", "Hides while scrolling down, back on the way up"],
  ["prog", "Reading progress line"], ["newdots", "\"New since your last visit\" dots"],
] as const;
/** Every button on the bar, each with its own show/hide switch (the owner's rule, 2026-11-21). Stored in `extras` with the rest. */
export const MENU_BUTTONS = [
  ["search", "🔍 Search (press / )"], ["dice", "🎲 Surprise me"], ["shuffle", "🔀 Random theme"], ["theme", "🎨 Theme picker"],
  ["hello", "👋 Say hello"], ["menubtn", "☰ Menu button (phones)"],
] as const;
export type MenuExtra = (typeof MENU_EXTRAS)[number][0] | (typeof MENU_BUTTONS)[number][0];

export type MenuDesign = {
  look: MenuLook;
  bg: MenuBg;
  phone: PhoneMenu;
  sky: SkyTime;
  extras: Partial<Record<MenuExtra, boolean>>;
  /** the live ticker's lines; {time} is the time in Dhaka */
  ticker: string[];
  /** sections left out of the menu (by slug); they stay on the page */
  hidden: string[];
  helloLabel: string;
  /** the menu bar shows on the site (the owner's switch on its dashboard page); off hides the bar on top, the phone menus stay */
  show: boolean;
  /** sizes the owner sets (2026-11-20): the name and the links as percentages, the space between links in px, the bar's height as a percentage */
  size: MenuSize;
};
export type MenuSize = { name: number; links: number; gap: number; height: number };
export const MENU_SIZE_LIMITS: Record<keyof MenuSize, [number, number, number]> = { name: [60, 170, 100], links: [60, 150, 100], gap: [0, 30, 2], height: [50, 180, 100] };
export const DEFAULT_MENU: MenuDesign = {
  look: "play", bg: "own", phone: "bottom", sky: "now", show: true,
  extras: { react: true, slim: true, hide: false, prog: true, hello: true, newdots: true, search: true, dice: true, shuffle: true, theme: true, menubtn: true },
  ticker: ["● Online now", "🕐 {time} in Dhaka", "👋 Say hello, I read every message"],
  hidden: [], helloLabel: "Say hello 👋",
  size: { name: 100, links: 100, gap: 2, height: 100 },
};

export const FOOTER_LOOKS = [
  ["receipt", "Visit receipt", "A handheld POS machine prints this visitor's own colour receipt: what they saw, badges, a fortune, your links, a QR code and a coupon"],
  ["rcpass", "Boarding pass", "Thanks for flying with you: their route through the sections, your links on the stub"],
  ["tmap", "Treasure map", "Sections as islands, their trail between them, your links on the compass"],
  ["credits", "End credits", "Your sections roll up like a film's cast, then THE END"],
  ["letter", "Signed letter", "A thank-you note whose signature writes itself, with Dhaka's time on the stamp"],
  ["skyline", "Dhaka at night", "A skyline whose windows twinkle; each tall building is a section"],
  ["map", "Map & links", "Who you are, every section with its entries, your links"],
  ["giant", "Giant name (as before)", "Your nickname huge and outlined"],
] as const;
export type FooterLook = (typeof FOOTER_LOOKS)[number][0];
export const FOOTER_EXTRAS = [
  ["links", "Your links"], ["time", "Local time in Dhaka"], ["top", "Ride back to the top"], ["egg", "Easter egg (tap your name 5 times)"], ["surprise", "🎲 Surprise me"],
] as const;
export type FooterExtra = (typeof FOOTER_EXTRAS)[number][0];

export type FooterDesign = {
  look: FooterLook;
  extras: Partial<Record<FooterExtra, boolean>>;
  /** the receipt's shop name, its last line, the coupon, the airline, the map's title, the letter and its signature, the credits' tagline */
  shop: string;
  thanks: string;
  coupon: string;
  airline: string;
  mapTitle: string;
  letter: string;
  signature: string;
  tagline: string;
  /** the receipt footer's line under your name */
  hi: string;
  /** the footer shows on the site (the owner's switch on its dashboard page) */
  show: boolean;
  /** the receipt footer's sizes: its height in px, the machine and its keys as percentages */
  size: FooterSize;
};
export type FooterSize = { height: number; machine: number; buttons: number };
export const FOOTER_SIZE_LIMITS: Record<keyof FooterSize, [number, number, number]> = { height: [300, 640, 420], machine: [70, 130, 100], buttons: [70, 150, 100] };
export const DEFAULT_FOOTER: FooterDesign = {
  look: "receipt", extras: { links: true, time: true, top: true, egg: true, surprise: true }, show: true,
  shop: "SHOUROBH'S CHRONICLE", thanks: "THANK YOU · COME BACK SOON", coupon: "1 FREE HELLO · redeem in the chat · never expires",
  airline: "SHOUROBH AIR", mapTitle: "Shourobh's isles",
  letter: "Thanks for scrolling all the way down. If something here made you smile, say hello: I read every message.",
  signature: "", tagline: "a life chronicle", hi: "Thanks for scrolling all the way down 👋",
  size: { height: 420, machine: 100, buttons: 100 },
};

const text = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
const pick = <T extends string>(v: unknown, list: readonly (readonly [T, ...string[]])[], d: T): T => (list.some(([k]) => k === v) ? (v as T) : d);
const obj = (raw: unknown): Record<string, unknown> => {
  try { const v = typeof raw === "string" ? JSON.parse(raw || "{}") : raw; return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {}; } catch { return {}; }
};
function flags<K extends string>(raw: unknown, list: readonly (readonly [K, string])[], d: Partial<Record<K, boolean>>) {
  const o = obj(raw), out: Partial<Record<K, boolean>> = {};
  for (const [k] of list) out[k] = typeof o[k] === "boolean" ? (o[k] as boolean) : !!d[k];
  return out;
}

export function cleanMenu(raw: unknown): MenuDesign {
  const o = obj(raw), d = DEFAULT_MENU;
  return {
    look: pick(o.look, MENU_LOOKS, d.look), bg: pick(o.bg, MENU_BGS, d.bg), phone: pick(o.phone, PHONE_MENUS, d.phone), sky: pick(o.sky, SKY_TIMES, d.sky),
    extras: flags<MenuExtra>(o.extras, [...MENU_EXTRAS, ...MENU_BUTTONS], d.extras),
    ticker: Array.isArray(o.ticker) ? o.ticker.map((x) => text(x, 120)).filter(Boolean).slice(0, 8) : d.ticker,
    hidden: Array.isArray(o.hidden) ? o.hidden.map((x) => text(x, 60)).filter((x) => /^[a-z0-9-]+$/.test(x)).slice(0, 40) : d.hidden,
    helloLabel: typeof o.helloLabel === "string" ? text(o.helloLabel, 30) : d.helloLabel,
    show: typeof o.show === "boolean" ? o.show : true,
    size: cleanSize(o.size),
  };
}

function cleanSize(raw: unknown): MenuSize {
  const o = obj(raw), out = {} as MenuSize;
  for (const k of Object.keys(MENU_SIZE_LIMITS) as (keyof MenuSize)[]) {
    const [lo, hi, def] = MENU_SIZE_LIMITS[k], v = Number(o[k]);
    out[k] = Number.isFinite(v) && o[k] !== null && o[k] !== "" ? Math.round(Math.min(hi, Math.max(lo, v))) : def;
  }
  return out;
}

export function cleanFooter(raw: unknown): FooterDesign {
  const o = obj(raw), d = DEFAULT_FOOTER;
  const t = (k: keyof FooterDesign, max: number) => (typeof o[k] === "string" ? text(o[k], max) : (d[k] as string));
  return {
    look: pick(o.look, FOOTER_LOOKS, d.look), extras: flags(o.extras, FOOTER_EXTRAS, d.extras),
    shop: t("shop", 40), thanks: t("thanks", 60), coupon: t("coupon", 90), airline: t("airline", 30), mapTitle: t("mapTitle", 40),
    letter: t("letter", 400), signature: t("signature", 40), tagline: t("tagline", 60), hi: t("hi", 80), show: typeof o.show === "boolean" ? o.show : true,
    size: (() => {
      const z = obj(o.size), out = {} as FooterSize;
      for (const k of Object.keys(FOOTER_SIZE_LIMITS) as (keyof FooterSize)[]) {
        const [lo, hi, def] = FOOTER_SIZE_LIMITS[k], n = Number(z[k]);
        out[k] = z[k] != null && z[k] !== "" && Number.isFinite(n) ? Math.round(Math.min(hi, Math.max(lo, n))) : def;
      }
      return out;
    })(),
  };
}
export const menuBg = (m: MenuDesign): Exclude<MenuBg, "own"> => (m.bg === "own" ? OWN_BG[m.look] : m.bg);
