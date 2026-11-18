import { cleanBoxes, type BoxState } from "./boxes";
import { cleanStyle, type ContentStyle } from "./contentStyle";

// Site-wide settings. Stored as JSON in the database; anything missing falls back to these defaults,
// so new fields can be added later without a migration.

export type Link = { label: string; url: string };
export type Social = { label: string; url: string; icon: string };

export const REACTION_EMOJIS = ["❤️", "🔥", "😂", "🤯", "👏"] as const;

/** One photo, video, PDF or sound file attached to an entry. The first picture or video is the cover, and sound always comes last. A PDF carries a picture of its first page (`thumb`) when one could be made. */
export type Media = { url: string; type: "image" | "video" | "pdf" | "audio"; thumb?: string; name?: string };
export const MAX_MEDIA = 30;
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/m4a", "audio/aac", "audio/wav", "audio/x-wav", "audio/wave", "audio/ogg", "audio/webm", "audio/flac"];
const looksLikeAudio = (url: string) => /\.(mp3|m4a|aac|wav|ogg|oga|flac)(\?|#|$)/i.test(url);
const looksLikeVideo = (url: string) => /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);
const looksLikePdf = (url: string) => /\.pdf(\?|#|$)/i.test(url);

/** Reads the media list stored with an entry; older entries with only a single photo get that photo as their list. */
export function parseMedia(raw: unknown, fallbackImage = ""): Media[] {
  let arr: unknown = raw;
  try { if (typeof raw === "string") arr = JSON.parse(raw); } catch { arr = []; }
  const list = (Array.isArray(arr) ? arr : [])
    .filter((m) => m && typeof m.url === "string" && isSafeUrl(m.url))
    .map((m): Media => {
      const url = String(m.url).trim().slice(0, 600);
      if (m.type === "pdf" || (m.type !== "image" && m.type !== "video" && looksLikePdf(url))) {
        const thumb = typeof m.thumb === "string" && isSafeUrl(m.thumb) ? m.thumb.trim().slice(0, 600) : "";
        return { url, type: "pdf", name: String(m.name ?? "").slice(0, 120), ...(thumb ? { thumb } : {}) };
      }
      if (m.type === "audio" || (m.type !== "image" && m.type !== "video" && looksLikeAudio(url))) return { url, type: "audio", name: String(m.name ?? "").slice(0, 120) };
      return { url, type: m.type === "video" || (m.type !== "image" && looksLikeVideo(m.url)) ? "video" : "image" };
    })
    .sort((a, b) => Number(a.type === "audio") - Number(b.type === "audio")) // sound is never the cover
    .slice(0, MAX_MEDIA);
  if (!list.length && fallbackImage && isSafeUrl(fallbackImage)) list.push({ url: fallbackImage, type: looksLikeVideo(fallbackImage) ? "video" : "image" });
  return list;
}

/** Real themes (each has its own look in site.css). */
export const FAN_THEME_KEYS = ["messi", "batman", "spiderman", "verstappen", "khabib", "arthur", "naruto", "sparrow", "dabbe", "salman", "palestine", "islamic", "travel", "rangers", "tomjerry", "ben10", "bangladesh", "got", "potter", "interstellar"] as const;
export const THEMES = ["day", "night", "playful", "techy", "sunset", "ocean", "forest", "paper", "retro", "candy", ...FAN_THEME_KEYS] as const;
/** Everything that can be chosen: the themes plus Auto (day/night by clock) and Random (a different one every visit). */
export const SKINS = [...THEMES, "auto", "random"] as const;
export type Skin = (typeof SKINS)[number];
/** Themes visitors can use now. The fan themes are under maintenance: visible in the menu but not selectable, and only reachable through a ?theme= preview link. */
export const LIVE_THEMES: Skin[] = ["day", "night", "playful", "techy", "sunset", "ocean", "forest", "paper", "retro", "candy"];
export const SELECTABLE: Skin[] = [...LIVE_THEMES, "auto", "random"];
export const SKIN_LABELS: Record<Skin, string> = {
  day: "☀️ Day calm", night: "🌙 Night neon", playful: "🎈 Playful", techy: "💻 Techy",
  sunset: "🌅 Sunset", ocean: "🌊 Ocean", forest: "🌲 Forest", paper: "📰 Paper", retro: "🕹️ Retro", candy: "🍬 Candy",
  messi: "⚽ Lionel Messi", batman: "🦇 Batman", spiderman: "🕷️ Spider-Man", verstappen: "🏎️ Max Verstappen", khabib: "🥊 Khabib", arthur: "🤠 Arthur Morgan", naruto: "🍥 Naruto", sparrow: "🏴‍☠️ Jack Sparrow", dabbe: "🕯️ Dabbe", salman: "🎬 Salman Khan",
  palestine: "🕊️ Palestine", islamic: "☪️ Islamic", travel: "✈️ Travel", rangers: "⚡ Power Rangers", tomjerry: "🐭 Tom and Jerry", ben10: "⌚ Ben 10", bangladesh: "🌾 Bangladesh", got: "⚔️ Game of Thrones", potter: "🧙 Harry Potter", interstellar: "🌌 Interstellar",
  auto: "🕕 Auto (night after 6 PM)", random: "🔀 Random (different every visit)",
};
/** Short description + two swatch colours for the theme menu. */
export const SKIN_INFO: Record<Skin, { d: string; c: [string, string] }> = {
  day: { d: "Cream and mint", c: ["#f5f2ee", "#7ee8a2"] },
  night: { d: "Dark, with a glow", c: ["#0b100d", "#7ee8a2"] },
  playful: { d: "Bright and bouncy", c: ["#fff6e6", "#ff5ca8"] },
  techy: { d: "Terminal style", c: ["#07090c", "#7ee8a2"] },
  sunset: { d: "Warm dusk colours", c: ["#1b1020", "#ff8a5b"] },
  ocean: { d: "Deep blue and teal", c: ["#06141f", "#3fd8d0"] },
  forest: { d: "Moss, wood and paper", c: ["#f1efe4", "#5f8f3a"] },
  paper: { d: "Black ink on newsprint", c: ["#f6f3ea", "#c8341f"] },
  retro: { d: "80s synthwave neon", c: ["#12002a", "#ff3cac"] },
  candy: { d: "Soft pastels", c: ["#fff5fb", "#ff8fc7"] },
  messi: { d: "Sky blue, the pitch, the number 10", c: ["#75c3f0", "#ffffff"] },
  batman: { d: "Night city, rain, a yellow signal", c: ["#0b0d12", "#f5c518"] },
  spiderman: { d: "Red, blue and webs", c: ["#ea2e33", "#2f77ff"] },
  verstappen: { d: "Race car and checkered flags", c: ["#0a1128", "#ff1e3c"] },
  khabib: { d: "The cage, peaks and an eagle", c: ["#141210", "#c9a24a"] },
  arthur: { d: "The frontier at dusk", c: ["#1e140c", "#c8893d"] },
  naruto: { d: "Village, orange, ninja dash", c: ["#2a160a", "#f7821b"] },
  sparrow: { d: "Pirate ship on a moonlit sea", c: ["#0b1a22", "#d4a742"] },
  dabbe: { d: "Fog, candles, a creepy house", c: ["#0a0808", "#a32222"] },
  salman: { d: "Bollywood stage and gold", c: ["#160a14", "#f2b01e"] },
  palestine: { d: "Flag colours and olive branches", c: ["#141414", "#007a3d"] },
  islamic: { d: "Geometry, gold and lanterns", c: ["#06231f", "#d8b15a"] },
  travel: { d: "Skies, landmarks, a plane", c: ["#16a6b6", "#ff7a45"] },
  rangers: { d: "Five colours and energy bolts", c: ["#ff2a3c", "#1e7bff"] },
  tomjerry: { d: "A cartoon cat-and-mouse chase", c: ["#f8dd96", "#6d8fb3"] },
  ben10: { d: "Alien green and circuits", c: ["#07130a", "#39ff14"] },
  bangladesh: { d: "Red sun, green fields, rickshaw", c: ["#006a4e", "#f42a41"] },
  got: { d: "Ice, fire and a dragon", c: ["#122538", "#d9481c"] },
  potter: { d: "Castle, candles and owls", c: ["#0e0b1e", "#e3b341"] },
  interstellar: { d: "A black hole and deep space", c: ["#05070d", "#ff9d42"] },
  auto: { d: "Night after 6 PM", c: ["#f5f2ee", "#0b100d"] },
  random: { d: "A surprise every visit", c: ["#ff8a5b", "#3fd8d0"] },
};

/** How the theme menu is grouped. */
export const SKIN_GROUPS: { label: string; keys: Skin[] }[] = [
  { label: "Classic", keys: ["day", "night", "playful", "techy", "sunset", "ocean", "forest", "paper", "retro", "candy"] },
  { label: "Let the site choose", keys: ["auto", "random"] },
  { label: "🚧 Under maintenance: back soon", keys: [...FAN_THEME_KEYS] },
];
/** Fonts for the fan themes. Only the active theme's are downloaded (see skinScript). */
export const THEME_FONTS: Partial<Record<Skin, string>> = {
  messi: "Anton&family=Barlow:wght@400;500;700", batman: "Bebas+Neue&family=Barlow:wght@400;500;700", spiderman: "Bangers", verstappen: "Russo+One&family=Titillium+Web:wght@400;600;700", khabib: "Teko:wght@500;700",
  arthur: "Rye&family=Bitter:wght@400;500;700", naruto: "Potta+One&family=Nunito:wght@400;600;700", sparrow: "Pirata+One&family=Alegreya:wght@400;500;700", dabbe: "Creepster&family=Special+Elite", salman: "Yatra+One&family=Poppins:wght@400;500;600",
  palestine: "Cairo:wght@400;600;800", islamic: "Aref+Ruqaa:wght@700&family=Lato:wght@400;700", travel: "Pacifico&family=Nunito:wght@400;600;700", rangers: "Bungee", tomjerry: "Luckiest+Guy&family=Baloo+2:wght@400;500;700",
  ben10: "Audiowide", bangladesh: "Baloo+Da+2:wght@500;800&family=Hind+Siliguri:wght@400;500;600", got: "Cinzel:wght@700;800&family=Crimson+Text:wght@400;600", potter: "Almendra:wght@400;700&family=Crimson+Text:wght@400;600", interstellar: "Exo+2:wght@400;500;700;800",
};

/** Every effect on the public site. Each one can be switched off on the Appearance page. */
export const EFFECTS = [
  { key: "shuffle", group: "Themes", label: "🔀 Shuffle-theme button in the menu bar" },
  { key: "themefx", group: "Themes", label: "Each theme's own living effects (waves, hacking, neon, paper…)" },
  { key: "decode", group: "Hero", label: "Decoding headline" },
  { key: "aurora", group: "Hero", label: "Aurora background" },
  { key: "tilt", group: "Hero", label: "3D photo (tilt, wave, confetti on click)" },
  { key: "sticker", group: "Hero", label: "Photo hangs from the menu bar, paper cut-out buttons" },
  { key: "magnetic", group: "Hero", label: "Magnetic buttons (all over the site)" },
  { key: "greeting", group: "Hero", label: "Time greeting under the clock" },
  { key: "typewriter", group: "Hero", label: "Typewriter text" },
  { key: "emojis", group: "Hero", label: "Floating draggable emojis" },
  { key: "cursor", group: "Hero", label: "Mint cursor + connecting dots" },
  { key: "smooth", group: "Motion", label: "Smooth scrolling" },
  { key: "autolite", group: "Motion", label: "Lighter version on devices that can't keep up" },
  { key: "countup", group: "Motion", label: "Count-up numbers" },
  { key: "stagger", group: "Motion", label: "Cards drop in one by one" },
  { key: "sideways", group: "Motion", label: "Rows that don't fit slide by themselves" },
  { key: "timeline", group: "Motion", label: "Timeline draws itself" },
  { key: "morph", group: "Motion", label: "Photo morph into entry pages" },
  { key: "intro", group: "Transitions", label: "Opening curtain on the first visit" },
  { key: "pagefx", group: "Transitions", label: "Pages glide into each other" },
  { key: "themewipe", group: "Transitions", label: "New theme spreads out from the click" },
  { key: "hero3d", group: "3D", label: "3D particle sculpture in the hero" },
  { key: "cardtilt", group: "3D", label: "Cards tilt in 3D with a light glare" },
  { key: "kinetic", group: "Text", label: "Headline letters react to the mouse" },
  { key: "splittext", group: "Text", label: "Titles rise letter by letter, labels decode" },
  { key: "wordscrub", group: "Text", label: "Subtitles light up word by word" },
  { key: "footername", group: "Text", label: "Giant name rises at the end of the page" },
  { key: "heroexit", group: "Scrolling", label: "Hero sinks away as you scroll" },
  { key: "sheets", group: "Scrolling", label: "Chapters slide up like stacked sheets" },
  { key: "sectionfx", group: "Scrolling", label: "Every chapter moves as you scroll (shrink, tilt, slide, swing)" },
  { key: "ghost", group: "Scrolling", label: "Giant chapter marks drift in the background" },
  { key: "ribbons", group: "Scrolling", label: "Sliding headlines before chapters" },
  { key: "velocity", group: "Scrolling", label: "Ribbons react to scroll speed" },
  { key: "imgreveal", group: "Scrolling", label: "Photos wipe in, grids drift" },
  { key: "milemap", group: "Scrolling", label: "Timeline sections become a lively map" },
  { key: "rowcount", group: "Scrolling", label: "Counter on sideways rows" },
  { key: "totop", group: "Scrolling", label: "Progress ring + back-to-top button" },
  { key: "smartcursor", group: "Hover", label: "Cursor ring grows and labels what you can do" },
  { key: "spotlight", group: "Hover", label: "Card borders light up near the mouse" },
  { key: "ambient", group: "Hover", label: "Chapter background glows under the mouse" },
  { key: "liquid", group: "Hover", label: "Colour pours into buttons" },
  { key: "navpill", group: "Hover", label: "Sliding menu highlight + rolling labels" },
  { key: "bannerfall", group: "Fun", label: "Things fall from the banner when it's pulled" },
  { key: "reactions", group: "Fun", label: "Emoji reactions on entries" },
  { key: "reactfx", group: "Fun", label: "Reaction emojis come alive" },
  { key: "confetti", group: "Fun", label: "Confetti on poll votes" },
  { key: "plane", group: "Fun", label: "Paper plane on “Say hello”, and the chat's sending animation" },
  { key: "surprise", group: "Fun", label: "🎲 Surprise me button" },
  { key: "explorer", group: "Fun", label: "Explorer badge" },
  { key: "party", group: "Fun", label: "Secret party mode" },
  { key: "sparkles", group: "Fun", label: "Click sparkles" },
  { key: "visitors", group: "Fun", label: "“People here now” counter" },
  { key: "game404", group: "Fun", label: "404 page mini game" },
  { key: "tripfx", group: "Layout", label: "Boarding passes: a vehicle travels the route, stamps thump" },
  { key: "studyfx", group: "Layout", label: "Study shelf: a lamp travels along, TVs power on, books and phones wake up" },
  { key: "comicfx", group: "Layout", label: "Comic strip: a brain flies along and pops each panel" },
  { key: "awardfx", group: "Layout", label: "Achievement wall: a spotlight travels along and each card comes alive" },
  { key: "notefx", group: "Layout", label: "Notes: a manual, a protest sign, a story and a collectible card come alive" },
  { key: "fullfx", group: "Layout", label: "Full view: an opened note arrives piece by piece, and its details and picture move" },
  { key: "scrapfx", group: "Layout", label: "Scrapbook pages: a pencil travels along and each page comes alive" },
  { key: "windowfx", group: "Layout", label: "App windows pop open and their apps come alive, with a bouncing dock" },
  { key: "bento", group: "Layout", label: "Bento grid for card sections" },
  { key: "flip", group: "Layout", label: "Flip cards for list sections" },
  { key: "lightbox", group: "Layout", label: "Photo viewer for photo sections" },
  { key: "bottombar", group: "Layout", label: "App-style menu on phones" },
] as const;
export type EffectKey = (typeof EFFECTS)[number]["key"];
export type Effects = Record<EffectKey, boolean>;
const ALL_ON = Object.fromEntries(EFFECTS.map((e) => [e.key, true])) as Effects;

/** The announcement that hangs from the top of the site. Dates are as typed, in the site's clock time zone. */
export const BANNER_KINDS = {
  urgent: { emoji: "🚨", label: "Emergency", tab: "Important", desc: "red, with flashing hazard stripes" },
  upcoming: { emoji: "📅", label: "Coming up", tab: "Coming up", desc: "your accent colour" },
  news: { emoji: "📣", label: "News", tab: "News", desc: "dark and calm" },
  party: { emoji: "🎉", label: "Celebrate", tab: "Pull me!", desc: "bright, with confetti" },
} as const;
export type BannerKind = keyof typeof BANNER_KINDS;
export type Banner = {
  on: boolean; kind: BannerKind; title: string; text: string; tab: string; linkLabel: string; linkUrl: string;
  countdownTo: string; hideAfter: string; autoDrop: boolean;
};
export const DEFAULT_BANNER: Banner = { on: false, kind: "urgent", title: "", text: "", tab: "", linkLabel: "", linkUrl: "", countdownTo: "", hideAfter: "", autoDrop: true };
/** What the site needs to draw the banner: dates as exact moments. */
export type BannerView = Pick<Banner, "kind" | "title" | "text" | "tab" | "linkLabel" | "linkUrl" | "autoDrop"> & { countdownIso: string; hideIso: string };

/** "2026-12-31T20:00" typed in a time zone → the exact moment, as an ISO date. */
export function zonedIso(naive: string, timeZone: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(naive || "");
  if (!m) return "";
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" })
      .formatToParts(new Date(guess)).map((x) => [x.type, x.value]));
    const shown = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    return new Date(guess - (shown - guess)).toISOString();
  } catch { return new Date(guess).toISOString(); }
}
export function bannerView(b: Banner, timeZone: string): BannerView {
  const { kind, title, text, tab, linkLabel, linkUrl, autoDrop } = b;
  return { kind, title, text, tab, linkLabel, linkUrl, autoDrop, countdownIso: zonedIso(b.countdownTo, timeZone), hideIso: zonedIso(b.hideAfter, timeZone) };
}

export type SiteSettings = {
  siteTitle: string;
  siteDescription: string;
  fullName: string;
  nickname: string;
  initials: string;
  brandPhrases: string[];
  statusText: string;
  headline1: string;
  headline2: string;
  subtitle: string;
  roleChips: string[];
  skills: string[];
  location: string;
  timezone: string;
  clockLabel: string;
  avatarUrl: string;
  resumeUrl: string;
  ctaPrimaryLabel: string;
  ctaSecondaryLabel: string;
  ctaSecondaryUrl: string;
  heroEmojis: string;
  scrollCue: string;
  heroHidden: boolean;
  /** which boxes on the hero's dashboard page are open, as last saved */
  heroBoxes: BoxState;
  /** How thick the sliding belts between sections are, percent of the normal size (RIBBON_SIZE). */
  ribbonSize: number;
  socials: Social[];
  footerLeft: string;
  footerRight: string;
  connectFormTitle: string;
  adminUsername: string;
  defaultTheme: Skin;
  themeSwitch: boolean;
  mood: string;
  showMood: boolean;
  nowStatus: string;
  partyWord: string;
  banner: Banner;
  /** Pictures the owner added to themes, by theme key. Empty means the theme's built-in art. */
  themePics: Record<string, string>;
  /** Size and look for all content; sections and entries can override it (lib/contentStyle.ts). */
  contentStyle: ContentStyle;
  effects: Effects;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  siteTitle: "Shourobh — Life Chronicle",
  siteDescription: "A running record of what I'm making, where I'm going, and what's stuck in my head along the way.",
  fullName: "Soleman Hossain",
  nickname: "Shourobh",
  initials: "SH",
  brandPhrases: ["Soleman Hossain", "Nicknamed Shourobh", "Also known as Shou ✌️"],
  statusText: "Currently online · Dhaka, Bangladesh 🇧🇩",
  headline1: "Data by day,",
  headline2: "builder by *night.*",
  subtitle: "This is the chronicle — a running record of what I'm making, where I'm going, and what's stuck in my head along the way.",
  roleChips: ["Data Officer · T.K. Group", "Algorithmic problem-solver", "Dhaka, BD 🌏"],
  skills: ["⚡ Data Analysis", "🧠 Problem Solving", "🛠 Building Things", "📊 Excel / Power BI", "🌍 Traveling", "🤖 AI Tinkering", "📝 Writing"],
  location: "Dhaka, Bangladesh",
  timezone: "Asia/Dhaka",
  clockLabel: "BDT",
  avatarUrl: "",
  resumeUrl: "",
  ctaPrimaryLabel: "Résumé",
  ctaSecondaryLabel: "Say Hello",
  ctaSecondaryUrl: "#connect",
  heroEmojis: "🚀 💡 ✨ 🌙 ⚡ 🔮",
  scrollCue: "Scroll to begin",
  heroHidden: false,
  heroBoxes: {},
  ribbonSize: 100,
  socials: [
    { label: "Email", url: "mailto:you@example.com", icon: "mail" },
    { label: "LinkedIn", url: "https://linkedin.com/in/", icon: "brand-linkedin" },
    { label: "GitHub", url: "https://github.com/", icon: "brand-github" },
  ],
  footerLeft: "© {year} Soleman Hossain — Shourobh",
  footerRight: "Built section by section, from the dashboard up. 🛠️",
  connectFormTitle: "Say hello 👋",
  adminUsername: "admin",
  defaultTheme: "night",
  themeSwitch: true,
  mood: "excited",
  showMood: true,
  nowStatus: "",
  partyWord: "shou",
  banner: DEFAULT_BANNER,
  themePics: {},
  contentStyle: {},
  effects: ALL_ON,
};

export const RIBBON_SIZE = [60, 180] as const;
export function cleanRibbonSize(v: unknown) {
  const n = Number(v);
  return v !== "" && Number.isFinite(n) ? Math.round(Math.min(RIBBON_SIZE[1], Math.max(RIBBON_SIZE[0], n))) : 100;
}

export function mergeSettings(raw: unknown): SiteSettings {
  let obj: Partial<SiteSettings> = {};
  try {
    obj = typeof raw === "string" ? JSON.parse(raw) : (raw as Partial<SiteSettings>) ?? {};
  } catch {}
  const s: SiteSettings = {
    ...DEFAULT_SETTINGS,
    ...obj,
    effects: { ...DEFAULT_SETTINGS.effects, ...(obj.effects ?? {}) },
    banner: { ...DEFAULT_BANNER, ...(obj.banner ?? {}) },
    contentStyle: cleanStyle(obj.contentStyle),
    heroBoxes: cleanBoxes(obj.heroBoxes),
  };
  s.ribbonSize = cleanRibbonSize(s.ribbonSize);
  if (!(s.banner.kind in BANNER_KINDS)) s.banner.kind = DEFAULT_BANNER.kind;
  if (!SELECTABLE.includes(s.defaultTheme)) s.defaultTheme = DEFAULT_SETTINGS.defaultTheme;
  if (s.mood && !MOODS[s.mood]) s.mood = "";
  s.partyWord = String(s.partyWord ?? "").toLowerCase().replace(/[^a-z]/g, "").slice(0, 12);
  return s;
}

export function isSafeUrl(url: string) {
  return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(url.trim());
}

export function parseLinks(raw: unknown): Link[] {
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((l) => l && typeof l.label === "string" && typeof l.url === "string")
      .map((l) => ({ label: l.label.trim().slice(0, 80), url: l.url.trim() }))
      .filter((l) => l.label && isSafeUrl(l.url));
  } catch {
    return [];
  }
}

/** One-click choices for Status on a Boarding passes entry. It shows on the frame as the stamp. */
export const TRIP_STATUSES = ["Visited", "Next destination", "Dream place", "On the way", "Done"] as const;
/** The same for a Study shelf entry: the book's ribbon, the player's sticker, the phone's notification. */
export const STUDY_STATUSES = ["Reading", "Finished", "On repeat", "Still thinking", "Changed my mind"] as const;

export const LAYOUTS = [
  { value: "windows", label: "App windows — projects on a desktop" },
  { value: "cards", label: "Cards grid — projects" },
  { value: "tickets", label: "Boarding passes — trips on a route" },
  { value: "strip", label: "Photo trail — trips (scrolls sideways)" },
  { value: "study", label: "Study shelf — books, players, portraits, phones" },
  { value: "list", label: "Shelf list — books, songs, people" },
  { value: "comic", label: "Comic strip — thoughts, hot takes, polls" },
  { value: "awards", label: "Achievement wall — staff cards, certificates, front pages, stars" },
  { value: "stream", label: "Feed stream — thoughts, polls" },
  { value: "timeline", label: "Timeline — milestones" },
  { value: "scrapbook", label: "Scrapbook pages — diary, places lived, rituals, snapshots" },
  { value: "photos", label: "Photo grid — life snapshots" },
  { value: "notes", label: "Notes — bio, beliefs, facts (full text)" },
  { value: "chat", label: "Chat window — links, say hello, the wall as a chat" },
  { value: "connect", label: "Connect — links, hello form, guest wall" },
] as const;

/** Layouts whose dashboard page is the live editor (components/admin/studio). The others keep the older boxes until their turn. */
export const hasStudio = (layout: string) => layout === "notes";

/** Layouts that hold the links, the hello form and the guest wall. */
export const isConnectLayout = (layout: string) => layout === "connect" || layout === "chat";

/** color = the accent itself; deep = a darker shade that stays readable as text on light backgrounds. */
export const MOODS: Record<string, { label: string; emoji: string; color: string; deep: string }> = {
  happy: { label: "bright", emoji: "☀️", color: "#f2c14e", deep: "#8a5d00" },
  excited: { label: "electric", emoji: "⚡", color: "#7ee8a2", deep: "#2f7a52" },
  calm: { label: "calm", emoji: "🌊", color: "#6fc3d4", deep: "#1d6878" },
  reflective: { label: "quiet", emoji: "🌙", color: "#b49be6", deep: "#6a4bb0" },
  sad: { label: "heavy", emoji: "🌧️", color: "#8a97b8", deep: "#4a5878" },
};

/** Inline script for <head>: picks the theme before the first paint, so there is no flash. */
export function skinScript(s: Pick<SiteSettings, "defaultTheme" | "themeSwitch" | "timezone" | "effects">) {
  // lt: a device already found to be too slow stays on the lighter version for this visit (see Effects.tsx)
  const cfg = JSON.stringify({ d: s.defaultTheme, sw: s.themeSwitch, tz: s.timezone || "UTC", all: SELECTABLE, pv: SKINS, t: LIVE_THEMES, vt: s.effects.morph || s.effects.pagefx, gl: s.effects.pagefx, lt: s.effects.autolite, f: THEME_FONTS }).replace(/</g, "\\u003c");
  // order: ?theme= preview link (not saved) > the visitor's own choice > the site default; then resolve auto/random
  return `(function(){var c=${cfg},h=document.documentElement;if(location.pathname.indexOf("/admin")===0)return;` +
    `var p=c.d;try{var v=localStorage.getItem("lc_skin");if(c.sw&&c.all.indexOf(v)>=0)p=v}catch(e){}` +
    `try{var q=new URLSearchParams(location.search).get("theme");if(q&&c.pv.indexOf(q)>=0){p=q;h.setAttribute("data-skin-preview","1")}}catch(e){}` +
    `var s=p;if(p==="auto"){var hr=0;try{hr=parseInt(new Date().toLocaleString("en-US",{timeZone:c.tz,hour:"numeric",hourCycle:"h23"}),10)%24}catch(e){hr=new Date().getHours()}s=(hr>=18||hr<6)?"night":"day"}` +
    `if(p==="random"){s=c.t[Math.floor(Math.random()*c.t.length)]}` +
    `h.setAttribute("data-skin",s);h.setAttribute("data-skin-pref",p);` +
    `try{if(c.lt&&sessionStorage.getItem("lc_lite"))h.classList.add("lite")}catch(e){}` +
    // a fan theme's fonts download only when that theme is showing, now or after switching
    `var ff=function(){var k=h.getAttribute("data-skin"),u=c.f[k];if(!u||document.getElementById("lf-"+k))return;var l=document.createElement("link");l.id="lf-"+k;l.rel="stylesheet";l.href="https://fonts.googleapis.com/css2?family="+u+"&display=swap";document.head.appendChild(l)};ff();try{new MutationObserver(ff).observe(h,{attributes:true,attributeFilter:["data-skin"]})}catch(e){}` +
    // photo morph + page glide: browsers that support cross-page view transitions animate, others just navigate
    `if(c.vt){var st=document.createElement("style");st.textContent="@view-transition{navigation:auto}";document.head.appendChild(st)}if(c.gl)h.classList.add("vt-glide");` +
    // opening a card: it answers the click at once, a bar shows the page is coming, and the page starts loading on hover (see "opening a page" in site.css)
    `if(c.gl&&!matchMedia("(prefers-reduced-motion: reduce)").matches){var CK=".card,.note,.trip,.post,.tl-row,.flip-wrap,.ph-cell,.wall-note,.shelf-row,.cw-pin",clear=function(){h.classList.remove("navigating");var b=document.querySelector(".nav-progress");if(b)b.remove();document.querySelectorAll(".opening").forEach(function(x){x.classList.remove("opening");x.style.viewTransitionName=""})};` +
    `addEventListener("click",function(e){if(e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||!e.target.closest)return;var a=e.target.closest("a[href]");if(!a||a.target==="_blank"||a.hasAttribute("download"))return;var u;try{u=new URL(a.href)}catch(x){return}if(u.origin!==location.origin||(u.pathname===location.pathname&&u.search===location.search))return;var k=a.closest(CK);window.__lcCard=k||null;h.classList.add("navigating");if(k)k.classList.add("opening");var s=document.querySelector(".site");if(s&&!document.querySelector(".nav-progress")){var cs=getComputedStyle(s),i=document.createElement("i");i.className="nav-progress";i.style.background="linear-gradient(90deg,"+cs.getPropertyValue("--mint")+","+cs.getPropertyValue("--pop2")+")";document.body.appendChild(i)}});` +
    `addEventListener("pageshow",function(e){if(e.persisted)clear()});` +
    // the clicked card grows to fill the screen and becomes the new page; Back shrinks the page away and the card lands again
    `addEventListener("pageswap",function(e){if(!e.viewTransition||h.classList.contains("lite"))return;var t=e.activation&&e.activation.navigationType;var k=window.__lcCard;if(k&&t!=="traverse"&&k.isConnected){k.style.viewTransitionName="open-card";try{sessionStorage.setItem("lc_open","1")}catch(x){}}});` +
    `addEventListener("pagereveal",function(e){var v=e.viewTransition;if(!v)return;var n=window.navigation&&navigation.activation,back=n&&n.navigationType==="traverse",open=false;try{open=sessionStorage.getItem("lc_open")==="1";sessionStorage.removeItem("lc_open")}catch(x){}var done=function(){h.classList.remove("vt-back");var p=document.querySelector(".vt-panel");if(p)p.remove();var q=window.__lcCard;if(q)q.style.viewTransitionName=""};` +
    `if(back){h.classList.add("vt-back");var k=window.__lcCard;if(k&&k.isConnected){var r=k.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth)k.style.viewTransitionName="open-card"}}else if(open){var s=document.querySelector(".site");if(s&&document.body){var p=document.createElement("i");p.className="vt-panel";p.style.background=getComputedStyle(s).getPropertyValue("--bg");document.body.appendChild(p)}}v.finished.then(done,done)});` +
    `try{if(HTMLScriptElement.supports&&HTMLScriptElement.supports("speculationrules")){var sr=document.createElement("script");sr.type="speculationrules";sr.textContent=JSON.stringify({prefetch:[{where:{href_matches:"/s/*"},eagerness:"moderate"}]});document.head.appendChild(sr)}else{var seen={},pf=function(e){var a=e.target.closest&&e.target.closest('a[href^="/s/"]');if(!a||seen[a.href])return;seen[a.href]=1;var l=document.createElement("link");l.rel="prefetch";l.href=a.href;document.head.appendChild(l)};addEventListener("pointerover",pf,{passive:true});addEventListener("touchstart",pf,{passive:true})}}catch(e){}}` +
    // the opening curtain plays once per session, and never over a preview link or a jump to a section
    `try{var u=new URLSearchParams(location.search),dm=u.get("demo");if(sessionStorage.getItem("lc_intro")||location.hash||u.get("theme")||(dm&&dm!=="intro"))h.classList.add("intro-skip");else if(location.pathname==="/")sessionStorage.setItem("lc_intro","1")}catch(e){h.classList.add("intro-skip")}` +
    `})();`;
}

const LAYOUT_ICONS: Record<string, string> = {
  notes: "user", cards: "tool", strip: "map-2", list: "book", stream: "bolt", timeline: "trending-up", awards: "trophy", photos: "camera", connect: "send", scrapbook: "notebook", chat: "message-circle",
};
export const layoutIcon = (l: string) => LAYOUT_ICONS[l] ?? "layout-grid";
