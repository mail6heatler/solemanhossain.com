// Site-wide settings. Stored as JSON in the database; anything missing falls back to these defaults,
// so new fields can be added later without a migration.

export type Link = { label: string; url: string };
export type Social = { label: string; url: string; icon: string };

export const REACTION_EMOJIS = ["❤️", "🔥", "😂", "🤯", "👏"] as const;

/** One photo or video attached to an entry. The first one is the cover. */
export type Media = { url: string; type: "image" | "video" };
export const MAX_MEDIA = 30;
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const looksLikeVideo = (url: string) => /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);

/** Reads the media list stored with an entry; older entries with only a single photo get that photo as their list. */
export function parseMedia(raw: unknown, fallbackImage = ""): Media[] {
  let arr: unknown = raw;
  try { if (typeof raw === "string") arr = JSON.parse(raw); } catch { arr = []; }
  const list = (Array.isArray(arr) ? arr : [])
    .filter((m) => m && typeof m.url === "string" && isSafeUrl(m.url))
    .map((m) => ({ url: String(m.url).trim().slice(0, 600), type: (m.type === "video" || (m.type !== "image" && looksLikeVideo(m.url)) ? "video" : "image") as Media["type"] }))
    .slice(0, MAX_MEDIA);
  if (!list.length && fallbackImage && isSafeUrl(fallbackImage)) list.push({ url: fallbackImage, type: looksLikeVideo(fallbackImage) ? "video" : "image" });
  return list;
}

export const SKINS = ["day", "night", "playful", "techy", "auto"] as const;
export type Skin = (typeof SKINS)[number];
export const SKIN_LABELS: Record<Skin, string> = {
  day: "☀️ Day calm", night: "🌙 Night neon", playful: "🎈 Playful", techy: "💻 Techy", auto: "🕕 Auto (night after 6 PM)",
};

/** Every effect on the public site. Each one can be switched off on the Appearance page. */
export const EFFECTS = [
  { key: "decode", group: "Hero", label: "Decoding headline" },
  { key: "aurora", group: "Hero", label: "Aurora background" },
  { key: "tilt", group: "Hero", label: "3D photo (tilt, wave, confetti on click)" },
  { key: "magnetic", group: "Hero", label: "Magnetic buttons" },
  { key: "greeting", group: "Hero", label: "Time greeting under the clock" },
  { key: "typewriter", group: "Hero", label: "Typewriter text" },
  { key: "emojis", group: "Hero", label: "Floating draggable emojis" },
  { key: "cursor", group: "Hero", label: "Mint cursor + connecting dots" },
  { key: "smooth", group: "Motion", label: "Smooth scrolling" },
  { key: "countup", group: "Motion", label: "Count-up numbers" },
  { key: "stagger", group: "Motion", label: "Cards drop in one by one" },
  { key: "sideways", group: "Motion", label: "Photo-trail sections slide sideways" },
  { key: "timeline", group: "Motion", label: "Timeline draws itself" },
  { key: "morph", group: "Motion", label: "Photo morph into entry pages" },
  { key: "reactions", group: "Fun", label: "Emoji reactions on entries" },
  { key: "confetti", group: "Fun", label: "Confetti on poll votes" },
  { key: "plane", group: "Fun", label: "Paper plane on “Say hello”" },
  { key: "surprise", group: "Fun", label: "🎲 Surprise me button" },
  { key: "explorer", group: "Fun", label: "Explorer badge" },
  { key: "party", group: "Fun", label: "Secret party mode" },
  { key: "sparkles", group: "Fun", label: "Click sparkles" },
  { key: "visitors", group: "Fun", label: "“People here now” counter" },
  { key: "game404", group: "Fun", label: "404 page mini game" },
  { key: "bento", group: "Layout", label: "Bento grid for card sections" },
  { key: "flip", group: "Layout", label: "Flip cards for list sections" },
  { key: "lightbox", group: "Layout", label: "Photo viewer for photo sections" },
  { key: "bottombar", group: "Layout", label: "App-style menu on phones" },
] as const;
export type EffectKey = (typeof EFFECTS)[number]["key"];
export type Effects = Record<EffectKey, boolean>;
const ALL_ON = Object.fromEntries(EFFECTS.map((e) => [e.key, true])) as Effects;

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
  effects: ALL_ON,
};

export function mergeSettings(raw: unknown): SiteSettings {
  let obj: Partial<SiteSettings> = {};
  try {
    obj = typeof raw === "string" ? JSON.parse(raw) : (raw as Partial<SiteSettings>) ?? {};
  } catch {}
  const s: SiteSettings = {
    ...DEFAULT_SETTINGS,
    ...obj,
    effects: { ...DEFAULT_SETTINGS.effects, ...(obj.effects ?? {}) },
  };
  if (!SKINS.includes(s.defaultTheme)) s.defaultTheme = DEFAULT_SETTINGS.defaultTheme;
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

export const LAYOUTS = [
  { value: "cards", label: "Cards grid — projects" },
  { value: "strip", label: "Photo trail — trips (scrolls sideways)" },
  { value: "list", label: "Shelf list — books, songs, people" },
  { value: "stream", label: "Feed stream — thoughts, polls" },
  { value: "timeline", label: "Timeline — milestones" },
  { value: "photos", label: "Photo grid — life snapshots" },
  { value: "notes", label: "Notes — bio, beliefs, facts (full text)" },
  { value: "connect", label: "Connect — links, hello form, guest wall" },
] as const;

/** color = the accent itself; deep = a darker shade that stays readable as text on light backgrounds. */
export const MOODS: Record<string, { label: string; emoji: string; color: string; deep: string }> = {
  happy: { label: "bright", emoji: "☀️", color: "#f2c14e", deep: "#8a5d00" },
  excited: { label: "electric", emoji: "⚡", color: "#7ee8a2", deep: "#2f7a52" },
  calm: { label: "calm", emoji: "🌊", color: "#6fc3d4", deep: "#1d6878" },
  reflective: { label: "quiet", emoji: "🌙", color: "#b49be6", deep: "#6a4bb0" },
  sad: { label: "heavy", emoji: "🌧️", color: "#8a97b8", deep: "#4a5878" },
};

/** Inline script for <head>: picks the theme before the first paint, so there is no flash. */
export function skinScript(s: Pick<SiteSettings, "defaultTheme" | "themeSwitch" | "timezone">) {
  const cfg = JSON.stringify({ d: s.defaultTheme, sw: s.themeSwitch, tz: s.timezone || "UTC" }).replace(/</g, "\\u003c");
  return `(function(){var c=${cfg},h=document.documentElement;if(location.pathname.indexOf("/admin")===0)return;` +
    `var p=c.d;try{var v=localStorage.getItem("lc_skin");if(c.sw&&/^(day|night|playful|techy|auto)$/.test(v||""))p=v}catch(e){}` +
    `var s=p;if(p==="auto"){var hr=0;try{hr=parseInt(new Date().toLocaleString("en-US",{timeZone:c.tz,hour:"numeric",hourCycle:"h23"}),10)%24}catch(e){hr=new Date().getHours()}s=(hr>=18||hr<6)?"night":"day"}` +
    `h.setAttribute("data-skin",s);h.setAttribute("data-skin-pref",p)})();`;
}

const LAYOUT_ICONS: Record<string, string> = {
  notes: "user", cards: "tool", strip: "map-2", list: "book", stream: "bolt", timeline: "trending-up", photos: "camera", connect: "send",
};
export const layoutIcon = (l: string) => LAYOUT_ICONS[l] ?? "layout-grid";
