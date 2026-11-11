/**
 * What a Scrapbook pages entry stores (items.scrap): the page it's chosen to be, if the owner chose one, and a ritual's ticked days.
 * Its Subsection picks the page otherwise: a photo diary gets a diary page with a taped photo, where they've lived a scrap of map with a pin,
 * rituals a habit tracker, and random snapshots a pile of photos under a paperclip.
 */
export const SCRAP_LOOKS = [
  ["diary", "Diary page with a taped photo"],
  ["lived", "Scrap of map with a pin"],
  ["ritual", "Habit tracker with ticks"],
  ["snaps", "Pile of photos under a paperclip"],
] as const;
export type ScrapLook = (typeof SCRAP_LOOKS)[number][0];

/** Monday first. The tracker ticks the days in `days`. */
export const SCRAP_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type ScrapInfo = { look: ScrapLook | ""; days: number[] };
export const EMPTY_SCRAP: ScrapInfo = { look: "", days: [] };

export function cleanScrap(raw: unknown): ScrapInfo {
  let o: Record<string, unknown> = {};
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (v && typeof v === "object" && !Array.isArray(v)) o = v as Record<string, unknown>;
  } catch { /* unreadable: treat as empty */ }
  const days = Array.isArray(o.days) ? o.days.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d < 7) : [];
  return {
    look: SCRAP_LOOKS.some(([k]) => k === o.look) ? (o.look as ScrapLook) : "",
    days: Array.from(new Set(days)).sort((a, b) => a - b),
  };
}

/** The page an entry gets: what the owner chose, or else the words in its Subsection's name. */
export function scrapLookOf(subsection: string, chosen: ScrapLook | "" = ""): ScrapLook {
  if (chosen) return chosen;
  const s = subsection.toLowerCase();
  if (/\b(diar\w*|journal\w*)\b/.test(s)) return "diary";
  if (/\b(lived?|living|homes?|hous\w*|moved|moving|cit(y|ies)|towns?|places?|neighbou?rhoods?|address\w*)\b/.test(s)) return "lived";
  if (/\b(rituals?|habits?|routines?|daily|every\w*|mornings?|nights?|weekly)\b/.test(s)) return "ritual";
  if (/\b(snap\w*|random|dumps?|misc\w*|bits|moments?|photos?|pics?)\b/.test(s)) return "snaps";
  return "diary";
}

/** The longest run of ticked days, going round the week, for the tracker's "days in a row". */
export function streakOf(days: number[]) {
  if (days.length >= 7) return 7;
  const on = new Set(days);
  let best = 0;
  for (let start = 0; start < 7; start++) {
    let n = 0;
    while (n < 7 && on.has((start + n) % 7)) n++;
    best = Math.max(best, n);
  }
  return best;
}
