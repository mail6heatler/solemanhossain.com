/**
 * The status by the hero photo (settings.status): what you're up to, with a live "updated … ago" clock and a 👁 count,
 * in one of five looks. After `staleHours` it greys out and says "last seen". Cleaned on every read and save.
 */
export const STATUS_LOOKS = {
  line: { label: "Line under your name", desc: "A pill under your headline with a dot in your status colour" },
  bubble: { label: "Bubble by the photo", desc: "A speech bubble beside your hanging photo" },
  badge: { label: "Corner badge", desc: "Your emoji on the photo's corner, the words under the photo" },
  ticker: { label: "Live ticker", desc: "LIVE, then your status typing itself out under your name" },
  story: { label: "Story: tap to open", desc: "A chip under the photo; tapping opens your status like a story" },
} as const;
export type StatusLook = keyof typeof STATUS_LOOKS;
export const STATUS_KINDS = {
  auto: { label: "Pick from the emoji", color: "" },
  online: { label: "Online", color: "#35c46f" },
  busy: { label: "Busy", color: "#f2a93b" },
  away: { label: "Away", color: "#8b6fd6" },
} as const;
export type StatusKind = keyof typeof STATUS_KINDS;
export const STATUS_EMOJIS = ["☕", "💻", "🎧", "📚", "🏃", "😴", "🎮", "✈️", "⚽", "🍜", "🎬", "🏏", "🕌", "🎉", "🤒", "📊"];
export const STATUS_PRESETS: [string, string][] = [["💻", "Coding something new"], ["🏃", "At the gym"], ["😴", "Sleeping, back tomorrow"], ["✈️", "Travelling"], ["⚽", "Watching football"], ["📚", "Reading a good book"], ["☕", "Drinking tea and planning a trip"], ["📊", "Crunching numbers at work"]];
export const STALE_HOURS = [1, 72] as const;

export type Status = { on: boolean; emoji: string; text: string; updatedAt: string; look: StatusLook; kind: StatusKind; staleHours: number; showAgo: boolean; showViews: boolean };
export const DEFAULT_STATUS: Status = { on: true, emoji: "☕", text: "Drinking tea and planning a trip", updatedAt: "", look: "line", kind: "auto", staleHours: 6, showAgo: true, showViews: true };

export function cleanStatus(raw: unknown): Status {
  const s = (raw && typeof raw === "object" ? raw : {}) as Partial<Status>;
  const d = DEFAULT_STATUS;
  const n = Number(s.staleHours);
  const at = typeof s.updatedAt === "string" && !Number.isNaN(Date.parse(s.updatedAt)) ? new Date(s.updatedAt).toISOString() : "";
  return {
    on: typeof s.on === "boolean" ? s.on : d.on,
    emoji: typeof s.emoji === "string" ? Array.from(s.emoji.trim()).slice(0, 4).join("") : d.emoji,
    text: typeof s.text === "string" ? s.text.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 80) : d.text,
    updatedAt: at,
    look: typeof s.look === "string" && s.look in STATUS_LOOKS ? s.look : d.look,
    kind: typeof s.kind === "string" && s.kind in STATUS_KINDS ? s.kind : d.kind,
    staleHours: Number.isFinite(n) && s.staleHours != null ? Math.round(Math.min(STALE_HOURS[1], Math.max(STALE_HOURS[0], n))) : d.staleHours,
    showAgo: typeof s.showAgo === "boolean" ? s.showAgo : d.showAgo,
    showViews: typeof s.showViews === "boolean" ? s.showViews : d.showViews,
  };
}

/** Online, Busy or Away, and its colour; "auto" reads it from the emoji. */
export function statusKind(s: Pick<Status, "kind" | "emoji">): { label: string; color: string } {
  const k = s.kind !== "auto" ? s.kind : s.emoji === "😴" || s.emoji === "🤒" ? "away" : ["💻", "📚", "🎬", "📊"].includes(s.emoji) ? "busy" : "online";
  return { label: STATUS_KINDS[k].label, color: STATUS_KINDS[k].color };
}
