/** What an Achievement wall entry stores (items.award): the object it's chosen to be, if the owner chose one. */
export const AWARD_LOOKS = [
  ["trophy", "Trophy on a shelf"],
  ["cert", "Framed certificate with a seal"],
  ["id", "Staff ID on a lanyard"],
  ["plate", "Brass door plate"],
  ["medal", "Medal on a ribbon"],
  ["crack", "Cracked frame, mended with tape"],
] as const;

export type AwardLook = (typeof AWARD_LOOKS)[number][0];
export type AwardInfo = { look: AwardLook | "" };
export const EMPTY_AWARD: AwardInfo = { look: "" };

export function cleanAward(raw: unknown): AwardInfo {
  let o: unknown = raw;
  if (typeof raw === "string") { try { o = JSON.parse(raw); } catch { o = {}; } }
  const look = (o as { look?: unknown } | null)?.look;
  return { look: AWARD_LOOKS.some(([k]) => k === look) ? (look as AwardLook) : "" };
}

/** A Date saying this means it's still going on: a job like this gets a staff ID, and its stamp. */
export const isNow = (date: string) => /\b(now|present|current|currently|today|ongoing)\b/i.test(date);

/** The object an entry gets: what the owner chose, or else the words in its Subsection, its Date and its Mood. */
export function awardLookOf(subsection: string, mood: string, date: string, chosen: AwardLook | "" = ""): AwardLook {
  if (chosen) return chosen;
  const s = subsection.toLowerCase();
  if (/\b(hall|fame|proud\w*|greatest|legend\w*)\b/.test(s)) return "trophy";
  if (/\b(skills?|certif\w*|courses?|diplomas?|degrees?|licen[cs]es?|training|education)\b/.test(s)) return "cert";
  if (/\b(careers?|jobs?|work\w*|roles?|positions?|milestones?)\b/.test(s)) return isNow(date) ? "id" : "plate";
  return mood === "sad" ? "crack" : "medal"; // the Mood called "heavy"
}
