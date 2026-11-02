// Site-wide settings. Stored as JSON in the database; anything missing falls back to these defaults,
// so new fields can be added later without a migration.

export type Link = { label: string; url: string };
export type Social = { label: string; url: string; icon: string };

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
  effects: { cursor: boolean; emojis: boolean; typewriter: boolean };
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
  effects: { cursor: true, emojis: true, typewriter: true },
};

export function mergeSettings(raw: unknown): SiteSettings {
  let obj: Partial<SiteSettings> = {};
  try {
    obj = typeof raw === "string" ? JSON.parse(raw) : (raw as Partial<SiteSettings>) ?? {};
  } catch {}
  return {
    ...DEFAULT_SETTINGS,
    ...obj,
    effects: { ...DEFAULT_SETTINGS.effects, ...(obj.effects ?? {}) },
  };
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

export const MOODS: Record<string, { label: string; emoji: string; color: string }> = {
  happy: { label: "bright", emoji: "☀️", color: "#f2c14e" },
  excited: { label: "electric", emoji: "⚡", color: "#7ee8a2" },
  calm: { label: "calm", emoji: "🌊", color: "#6fc3d4" },
  reflective: { label: "quiet", emoji: "🌙", color: "#b49be6" },
  sad: { label: "heavy", emoji: "🌧️", color: "#8a97b8" },
};

const LAYOUT_ICONS: Record<string, string> = {
  notes: "user", cards: "tool", strip: "map-2", list: "book", stream: "bolt", timeline: "trending-up", photos: "camera", connect: "send",
};
export const layoutIcon = (l: string) => LAYOUT_ICONS[l] ?? "layout-grid";
