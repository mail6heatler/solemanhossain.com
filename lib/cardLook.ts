/**
 * Which card a G1 note (layout "notes") or a G2 window (layout "windows") is, chosen by the dashboard's own words: the Subsection's name picks it,
 * unless the owner chooses one in the entry's Card look box. Stored as items.card.
 */
export const NOTE_LOOKS = [
  ["manual", "Instruction manual"],
  ["sign", "Protest sign"],
  ["story", "Story"],
  ["fact", "Collectible card"],
  ["plain", "Plain note"],
] as const;
export const WIN_LOOKS = [
  ["sheet", "Spreadsheet"],
  ["code", "Code editor with a terminal"],
  ["notes", "Notes app"],
  ["console", "Pocket games console"],
  ["browser", "Browser window"],
] as const;
export type NoteLook = (typeof NOTE_LOOKS)[number][0];
export type WinLook = (typeof WIN_LOOKS)[number][0];
export type CardInfo = { look: NoteLook | WinLook | "" };
export const EMPTY_CARD: CardInfo = { look: "" };

const KEYS: string[] = [...NOTE_LOOKS.map(([k]) => k), ...WIN_LOOKS.map(([k]) => k)];

export function cleanCard(raw: unknown): CardInfo {
  let o: Record<string, unknown> = {};
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (v && typeof v === "object" && !Array.isArray(v)) o = v as Record<string, unknown>;
  } catch { /* unreadable: treat as empty */ }
  return { look: KEYS.includes(String(o.look)) ? (o.look as CardInfo["look"]) : "" };
}

/** G1: the manual for who they are, a protest sign for beliefs, a story for what's on now, a collectible card for facts. */
export function noteLookOf(subsection: string, chosen: CardInfo["look"] = ""): NoteLook {
  if (chosen && NOTE_LOOKS.some(([k]) => k === chosen)) return chosen as NoteLook;
  const s = subsection.toLowerCase();
  if (/\b(manual|unfiltered|about|bio\w*|who|intro\w*|guide)\b/.test(s)) return "manual";
  if (/\b(belie\w*|values?|principles?|rules?|die on|opinions?|manifesto)\b/.test(s)) return "sign";
  if (/\b(currently|current|obsess\w*|now|lately|playing|watching|reading|listening|loving)\b/.test(s)) return "story";
  if (/\b(facts?|random|trivia|define\w*|quirks?)\b/.test(s)) return "fact";
  return "plain";
}

/** G2: a spreadsheet for data, an editor for code, a notes app for brain dumps, a games console for side quests. */
export function winLookOf(subsection: string, chosen: CardInfo["look"] = ""): WinLook {
  if (chosen && WIN_LOOKS.some(([k]) => k === chosen)) return chosen as WinLook;
  const s = subsection.toLowerCase();
  if (/\b(data\w*|analy\w*|dashboards?|charts?|reports?|excel|sheets?|numbers|statistic\w*)\b/.test(s)) return "sheet";
  if (/\b(code|coding|problems?|program\w*|dev\w*|engineer\w*|scripts?|algorithms?|software|apps?)\b/.test(s)) return "code";
  if (/\b(brain|dumps?|ideas?|notes?|thoughts?|sketch\w*|drafts?)\b/.test(s)) return "notes";
  if (/\b(side|quests?|fun|games?|hobb\w*|play\w*|experiments?)\b/.test(s)) return "console";
  return "browser";
}

/** A quest's progress from its Status: done fills the bar, anything under way half of it, nothing an empty one. */
export function questProgress(status: string): { level: number; label: string } {
  const s = status.toLowerCase().trim();
  if (!s) return { level: 0, label: "New quest" };
  if (/\b(done|finished|complete\w*|shipped|launched|live)\b/.test(s)) return { level: 10, label: "Quest complete" };
  return { level: 5, label: `Quest ${s}` };
}
