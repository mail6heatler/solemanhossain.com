/**
 * The Connect section's chat window design (settings.connect), set in its live editor (components/admin/studio/ConnectStudio.tsx): its own photo and
 * name, availability, the words in the window (greeting bubbles, automatic reply, quick starters, the box's placeholders), its wallpaper and bubbles,
 * which pieces show, and the size and place of each piece the owner dragged. The links themselves stay in settings.socials, now with their own
 * second line and an uploaded logo. Cleaned on every read and save, so a missing field is always its default.
 */
import { cleanPartSizes, type PartSizes } from "./partSize";
import type { Social } from "./settings";

export const AVAILS = [
  ["online", "Available", "● Online · reads every message"],
  ["busy", "Busy", "Busy right now · I'll reply later"],
  ["away", "Away", "Away for a bit · leave a message"],
  ["holiday", "On holiday", "On holiday ✈️ · replies may be slow"],
  ["off", "Offline", "Offline · I'll see it when I'm back"],
] as const;
export type Avail = (typeof AVAILS)[number][0];

export const WALLPAPERS = [
  ["dots", "Dots (as before)"], ["doodles", "Emoji doodles"], ["aurora", "Moving glow"], ["grid", "Grid"], ["waves", "Waves"], ["plain", "Plain"], ["photo", "My picture"],
] as const;
export type Wallpaper = (typeof WALLPAPERS)[number][0];

export const BUBBLES = [["round", "Round"], ["soft", "Soft corners"], ["comic", "Comic"], ["glass", "Outline"]] as const;
export type BubbleShape = (typeof BUBBLES)[number][0];

/** Theme colours a bubble can wear: the theme's text colour, its two accents and its main colour. */
export const BUBBLE_COLORS = [["fg", "Dark (text colour)"], ["pop2", "Accent 1"], ["pop3", "Accent 2"], ["mint", "Main colour"]] as const;
export type BubbleColor = (typeof BUBBLE_COLORS)[number][0];

export const WALL_BTNS = [["badge", "Pin badge in the top bar"], ["tab", "Sticky tab on the side"], ["fab", "Round cork button"]] as const;
export type WallBtn = (typeof WALL_BTNS)[number][0];
export const BOARDS = [["cork", "Cork board"], ["fridge", "Fridge door"], ["chalk", "Chalkboard"], ["line", "Clothesline"]] as const;
export type Board = (typeof BOARDS)[number][0];

/** Pieces of the chat window that can be turned off one by one. */
export const CONNECT_PIECES = [
  ["face", "Photo"], ["sub", "Second name line"], ["avail", "Availability"], ["reply", "Reply time"], ["links", "Links"], ["pins", "Pinned testimonials / wall note"],
  ["headnote", "Line beside the title"], ["days", "Day lines in the chat"], ["quick", "Quick starters"], ["emoji", "Emoji button"], ["email", "Email box"],
  ["wall", "📌 Wall tick in the box"], ["wallbtn", "The Wall button and board"], ["autoreply", "Automatic reply"], ["typing", "Typing dots"], ["hearts", "Double-tap hearts"],
] as const;
export type ConnectPiece = (typeof CONNECT_PIECES)[number][0];

export type ConnectDesign = {
  /** the chat's own photo; empty uses the hero photo */
  face: string;
  /** the name at the top; empty is the nickname */
  name: string;
  /** the line under it; empty is the full name */
  sub: string;
  avail: Avail;
  /** what the availability says; empty is that availability's own words */
  availText: string;
  replyTime: string;
  linksTitle: string;
  headNote: string;
  /** the owner's greeting, one bubble per line; empty is the form heading with a line inviting a message */
  greet: string[];
  /** the automatic reply after a message; {name} becomes the visitor's name */
  autoReply: string;
  /** ready-made first lines a visitor can tap */
  quick: string[];
  wallNote: string;
  namePh: string;
  emailPh: string;
  msgPh: string;
  wallLabel: string;
  /** the emojis in the box's emoji tray */
  emojis: string;
  wallpaper: Wallpaper;
  wallPic: string;
  bubbles: BubbleShape;
  mine: BubbleColor;
  theirs: BubbleColor;
  /** links' logos in each brand's own colour, or the theme's */
  brandColors: boolean;
  /** the Wall: its button and notice board, and what the board shows */
  wallBtn: WallBtn;
  board: Board;
  boardReply: boolean;
  boardHearts: boolean;
  boardTesti: boolean;
  /** approved notes also stay in the chat, as before the Wall */
  wallInChat: boolean;
  /** replies: what the visitor sees, and the owner's saved replies in the Inbox */
  seen: boolean;
  typing: boolean;
  online: boolean;
  react: boolean;
  badge: boolean;
  chatLink: boolean;
  saved: string[];
  hide: Partial<Record<ConnectPiece, true>>;
  parts?: PartSizes;
};

export const DEFAULT_CONNECT: ConnectDesign = {
  face: "", name: "", sub: "", avail: "online", availText: "", replyTime: "Usually replies within a day",
  linksTitle: "Other ways to reach me", headNote: "🔒 Private: only I see what you write here",
  greet: [], autoReply: "Got it, {name}! 🙌 I'll read it soon.",
  quick: ["👋 Just saying hi", "💼 I have a work idea", "☕ Let's meet up", "😂 Your site made me smile"],
  wallNote: "Messages land in my inbox and I reply right here. Tap 📌 when you write, and once I approve your note it goes up on the Wall for everyone.",
  namePh: "Your name", emailPh: "Email, if you'd like a reply", msgPh: "What's on your mind?", wallLabel: "Wall",
  emojis: "😀 😂 😍 🥹 👋 🙌 👏 🔥 ❤️ ✨ 🎉 🙏 ☕ 🚀 🤝 💡",
  wallpaper: "dots", wallPic: "", bubbles: "round", mine: "fg", theirs: "pop2", brandColors: true, hide: {},
  wallBtn: "badge", board: "cork", boardReply: true, boardHearts: true, boardTesti: true, wallInChat: false,
  seen: true, typing: true, online: true, react: true, badge: true, chatLink: false,
  saved: ["Thank you so much! 🙌", "I'll get back to you soon.", "Let's talk on LinkedIn?", "Glad you liked it ❤️"],
};
/** Words the window said before it was a private chat; a saved copy of one of them follows the new default. */
const OLD_DEFAULTS: Record<string, string[]> = {
  headNote: ["🌍 The wall: approved notes, everyone can read them"],
  wallNote: ["Messages land in my inbox. Tap 📌 when you write, and once I approve it, everyone can read it in this chat."],
};

export const MAX_LINKS = 16, MAX_GREET = 5, MAX_QUICK = 6, MAX_SAVED = 10;

const text = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
const pick = <T extends string>(v: unknown, list: readonly (readonly [T, ...string[]])[], d: T): T => (list.some(([k]) => k === v) ? (v as T) : d);
const safeImg = (u: string) => (/^(https?:\/\/|\/)/i.test(u) ? u.replace(/[\s"'<>()]/g, "") : "");

export function cleanConnect(raw: unknown): ConnectDesign {
  let o: Record<string, unknown> = {};
  try {
    const v = typeof raw === "string" ? JSON.parse(raw || "{}") : raw;
    if (v && typeof v === "object" && !Array.isArray(v)) o = v as Record<string, unknown>;
  } catch { /* unreadable: the defaults */ }
  const d = DEFAULT_CONNECT;
  const has = (k: string) => typeof o[k] === "string";
  const t = (k: keyof ConnectDesign, max: number) => (has(k) && !OLD_DEFAULTS[k]?.includes(String(o[k])) ? text(o[k], max) : (d[k] as string));
  const yes = (k: keyof ConnectDesign) => (typeof o[k] === "boolean" ? (o[k] as boolean) : (d[k] as boolean));
  const list = (k: keyof ConnectDesign, n: number, max: number) => (Array.isArray(o[k]) ? (o[k] as unknown[]).map((x) => text(x, max)).filter(Boolean).slice(0, n) : (d[k] as string[]));
  const hide: ConnectDesign["hide"] = {};
  if (o.hide && typeof o.hide === "object") for (const [k] of CONNECT_PIECES) if ((o.hide as Record<string, unknown>)[k] === true) hide[k] = true;
  const parts = cleanPartSizes(o.parts);
  return {
    face: safeImg(text(o.face, 500)), name: t("name", 60), sub: t("sub", 120),
    avail: pick(o.avail, AVAILS, d.avail), availText: t("availText", 80), replyTime: t("replyTime", 80),
    linksTitle: t("linksTitle", 60), headNote: t("headNote", 120),
    greet: list("greet", MAX_GREET, 300), autoReply: t("autoReply", 300), quick: list("quick", MAX_QUICK, 60), wallNote: t("wallNote", 300),
    namePh: t("namePh", 40), emailPh: t("emailPh", 60), msgPh: t("msgPh", 60), wallLabel: t("wallLabel", 20), emojis: t("emojis", 200),
    wallpaper: pick(o.wallpaper, WALLPAPERS, d.wallpaper), wallPic: safeImg(text(o.wallPic, 500)),
    bubbles: pick(o.bubbles, BUBBLES, d.bubbles), mine: pick(o.mine, BUBBLE_COLORS, d.mine), theirs: pick(o.theirs, BUBBLE_COLORS, d.theirs),
    brandColors: o.brandColors !== false, hide,
    wallBtn: pick(o.wallBtn, WALL_BTNS, d.wallBtn), board: pick(o.board, BOARDS, d.board),
    boardReply: yes("boardReply"), boardHearts: yes("boardHearts"), boardTesti: yes("boardTesti"), wallInChat: yes("wallInChat"),
    seen: yes("seen"), typing: yes("typing"), online: yes("online"), react: yes("react"), badge: yes("badge"), chatLink: yes("chatLink"),
    saved: list("saved", MAX_SAVED, 200),
    ...(Object.keys(parts).length ? { parts } : {}),
  };
}

// ---------- links: a logo and a line found from the link itself ----------

/** A known site: what its link looks like, its logo (an icon name), its name, a line saying what it's for, and its own colour. */
type Brand = { re: RegExp; icon: string; label: string; note: string; color: string; ink?: string };
const BRANDS: Brand[] = [
  { re: /^mailto:/i, icon: "mail", label: "Email", note: "Write to me directly", color: "#ea4335" },
  { re: /^tel:/i, icon: "phone", label: "Phone", note: "Call me", color: "#34a853" },
  { re: /(^|\.)(wa\.me|whatsapp\.com)/i, icon: "brand-whatsapp", label: "WhatsApp", note: "Message me", color: "#25d366" },
  { re: /(^|\.)(t\.me|telegram\.(me|org))/i, icon: "brand-telegram", label: "Telegram", note: "Message me", color: "#229ed9" },
  { re: /(^|\.)(m\.me|messenger\.com)/i, icon: "brand-messenger", label: "Messenger", note: "Chat with me", color: "#0084ff" },
  { re: /(^|\.)(facebook\.com|fb\.com|fb\.me)/i, icon: "brand-facebook", label: "Facebook", note: "Friends and family", color: "#1877f2" },
  { re: /(^|\.)(instagram\.com|instagr\.am)/i, icon: "brand-instagram", label: "Instagram", note: "Pictures from my days", color: "#e1306c" },
  { re: /(^|\.)threads\.(net|com)/i, icon: "brand-threads", label: "Threads", note: "Quick thoughts", color: "#101010" },
  { re: /(^|\.)(x\.com|twitter\.com)/i, icon: "brand-x", label: "X", note: "Thoughts, short and often", color: "#101010" },
  { re: /(^|\.)bsky\.app/i, icon: "brand-bluesky", label: "Bluesky", note: "Thoughts, short and often", color: "#1185fe" },
  { re: /(^|\.)linkedin\.com/i, icon: "brand-linkedin", label: "LinkedIn", note: "Work and career", color: "#0a66c2" },
  { re: /(^|\.)github\.com/i, icon: "brand-github", label: "GitHub", note: "What I'm building", color: "#24292f" },
  { re: /(^|\.)gitlab\.com/i, icon: "brand-gitlab", label: "GitLab", note: "What I'm building", color: "#fc6d26" },
  { re: /(^|\.)(youtube\.com|youtu\.be)/i, icon: "brand-youtube", label: "YouTube", note: "Videos", color: "#ff0000" },
  { re: /(^|\.)tiktok\.com/i, icon: "brand-tiktok", label: "TikTok", note: "Short videos", color: "#101010" },
  { re: /(^|\.)(discord\.gg|discord\.com)/i, icon: "brand-discord", label: "Discord", note: "Come hang out", color: "#5865f2" },
  { re: /(^|\.)reddit\.com/i, icon: "brand-reddit", label: "Reddit", note: "Where I lurk", color: "#ff4500" },
  { re: /(^|\.)medium\.com/i, icon: "brand-medium", label: "Medium", note: "Longer writing", color: "#101010" },
  { re: /(^|\.)dribbble\.com/i, icon: "brand-dribbble", label: "Dribbble", note: "Designs", color: "#ea4c89" },
  { re: /(^|\.)behance\.net/i, icon: "brand-behance", label: "Behance", note: "Designs", color: "#1769ff" },
  { re: /(^|\.)figma\.com/i, icon: "brand-figma", label: "Figma", note: "Designs", color: "#a259ff" },
  { re: /(^|\.)(pinterest\.|pin\.it)/i, icon: "brand-pinterest", label: "Pinterest", note: "Things I like", color: "#e60023" },
  { re: /(^|\.)snapchat\.com/i, icon: "brand-snapchat", label: "Snapchat", note: "Snaps", color: "#fffc00", ink: "#101010" },
  { re: /(^|\.)(spotify\.com|spoti\.fi)/i, icon: "brand-spotify", label: "Spotify", note: "What I'm listening to", color: "#1db954" },
  { re: /(^|\.)soundcloud\.com/i, icon: "brand-soundcloud", label: "SoundCloud", note: "Sounds", color: "#ff5500" },
  { re: /(^|\.)vimeo\.com/i, icon: "brand-vimeo", label: "Vimeo", note: "Videos", color: "#1ab7ea" },
  { re: /(^|\.)twitch\.tv/i, icon: "brand-twitch", label: "Twitch", note: "Live streams", color: "#9146ff" },
  { re: /(^|\.)steamcommunity\.com|(^|\.)steampowered\.com/i, icon: "brand-steam", label: "Steam", note: "Let's play", color: "#1b2838" },
  { re: /(^|\.)stackoverflow\.com/i, icon: "brand-stackoverflow", label: "Stack Overflow", note: "Questions and answers", color: "#f48024" },
  { re: /(^|\.)leetcode\.com/i, icon: "brand-leetcode", label: "LeetCode", note: "Problems I've solved", color: "#ffa116" },
  { re: /(^|\.)upwork\.com/i, icon: "brand-upwork", label: "Upwork", note: "Hire me", color: "#14a800" },
  { re: /(^|\.)fiverr\.com/i, icon: "brand-fiverr", label: "Fiverr", note: "Hire me", color: "#1dbf73" },
  { re: /(^|\.)(paypal\.me|paypal\.com)/i, icon: "brand-paypal", label: "PayPal", note: "Buy me a coffee", color: "#003087" },
  { re: /(^|\.)patreon\.com/i, icon: "brand-patreon", label: "Patreon", note: "Support my work", color: "#ff424d" },
  { re: /(^|\.)linktr\.ee/i, icon: "brand-linktree", label: "Linktree", note: "All my links", color: "#43e55e", ink: "#101010" },
  { re: /(^|\.)notion\.(so|site)/i, icon: "brand-notion", label: "Notion", note: "My notes", color: "#101010" },
  { re: /(^|\.)drive\.google\.com/i, icon: "brand-google-drive", label: "Google Drive", note: "Files", color: "#1fa463" },
  { re: /(^|\.)(line\.me)/i, icon: "brand-line", label: "LINE", note: "Message me", color: "#06c755" },
  { re: /(^|\.)(weixin|wechat)\./i, icon: "brand-wechat", label: "WeChat", note: "Message me", color: "#07c160" },
  { re: /(^|\.)skype\.com|^skype:/i, icon: "brand-skype", label: "Skype", note: "Call me", color: "#00aff0" },
  { re: /(^|\.)tumblr\.com/i, icon: "brand-tumblr", label: "Tumblr", note: "My corner", color: "#36465d" },
  { re: /(^|\.)producthunt\.com/i, icon: "brand-producthunt", label: "Product Hunt", note: "Things I launched", color: "#da552f" },
  { re: /(^|\.)(mastodon\.|mstdn\.)/i, icon: "brand-mastodon", label: "Mastodon", note: "Thoughts, short and often", color: "#6364ff" },
  { re: /(^|\.)maps\.(google|apple)\.|goo\.gl\/maps/i, icon: "map-pin", label: "Map", note: "Where to find me", color: "#ea4335" },
  { re: /(^|\.)calendly\.com|cal\.com/i, icon: "calendar", label: "Book a time", note: "Pick a time to talk", color: "#006bff" },
];

/** What a link's address says about it: its logo, name, line and colour (a website, if it's none of the known ones). */
export function linkBrand(url: string): { icon: string; label: string; note: string; color: string; ink: string } {
  const u = url.trim();
  let host = u;
  try { if (/^https?:\/\//i.test(u)) host = new URL(u).hostname.replace(/^www\./, "") + new URL(u).pathname; } catch { /* keep the text */ }
  const b = BRANDS.find((x) => x.re.test(/^(mailto|tel|skype):/i.test(u) ? u : host));
  if (b) return { icon: b.icon, label: b.label, note: b.note, color: b.color, ink: b.ink ?? "#ffffff" };
  const site = host.split("/")[0];
  return { icon: "world", label: site ? site.replace(/\.[a-z]+$/i, "").replace(/^./, (c) => c.toUpperCase()) : "Website", note: "My other corner of the web", color: "", ink: "" };
}

/** Turns what was pasted into a link: an email becomes mailto:, a phone number tel:, a bare address https://. */
export function normaliseLink(raw: string) {
  const v = raw.trim();
  if (!v) return "";
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(v)) return v;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return `mailto:${v}`;
  if (/^\+?[\d\s()-]{6,}$/.test(v)) return `tel:${v.replace(/[\s()-]/g, "")}`;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v)) return `https://${v}`;
  return v;
}

/** A link as the chat draws it: the owner's own line, else what its address is for, else where it goes. */
export function linkView(s: Social) {
  const b = linkBrand(s.url);
  const where = s.url.startsWith("mailto:") ? s.url.slice(7).split("?")[0] : s.url.startsWith("tel:") ? s.url.slice(4) : s.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  const icon = s.icon && s.icon !== "link" ? s.icon : b.icon;
  return { ...b, icon, note: s.note?.trim() || (b.icon === "world" ? where : b.note), logo: s.logo || "" };
}

/** Cleans the links the editor sends: label, address, logo, own line and icon. */
export function cleanSocials(raw: unknown): Social[] {
  return (Array.isArray(raw) ? raw : []).flatMap((r) => {
    const o = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
    const url = normaliseLink(text(o.url, 500));
    if (!/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(url)) return [];
    const label = text(o.label, 60) || linkBrand(url).label;
    const icon = text(o.icon, 40).replace(/[^a-z0-9-]/gi, "") || linkBrand(url).icon;
    const out: Social = { label, url, icon };
    const note = text(o.note, 80), logo = safeImg(text(o.logo, 500));
    if (note) out.note = note;
    if (logo) out.logo = logo;
    return [out];
  }).slice(0, MAX_LINKS);
}

/** Every logo the editor offers to choose by hand. */
export const LOGO_CHOICES: [string, string][] = [
  ...Array.from(new Map(BRANDS.map((b) => [b.icon, b.label])).entries()),
  ["world", "Website"], ["link", "Link"], ["file-cv", "Résumé"], ["message-circle", "Chat"], ["heart", "Heart"], ["star", "Star"], ["camera", "Camera"], ["music", "Music"], ["briefcase", "Work"], ["home", "Home"],
];

/** What the chat shows, with every empty field filled in from the site's other settings. */
export function connectView(c: ConnectDesign, s: { nickname: string; fullName: string; avatarUrl: string; initials: string; connectFormTitle: string }) {
  const owner = c.name || s.nickname.trim() || s.fullName.trim().split(/\s+/)[0] || "me";
  const sub = c.sub || (s.fullName && s.fullName !== owner ? s.fullName : "");
  const title = s.connectFormTitle || "Say hello 👋";
  return {
    owner, sub, title,
    face: c.face || s.avatarUrl,
    initials: s.initials || Array.from(owner)[0] || "?",
    availText: c.availText || AVAILS.find(([k]) => k === c.avail)![2],
    greet: c.greet.length ? c.greet : [`${title} Write anything below. I read every message.`],
    emojis: c.emojis.split(/\s+/).filter(Boolean).slice(0, 40),
  };
}
