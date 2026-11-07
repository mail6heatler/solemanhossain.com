/** What an Achievement wall entry stores (items.award): the object it's chosen to be, if the owner chose one, and the details its Details box asks for. */
export const AWARD_LOOKS = [
  ["trophy", "Trophy on a shelf"],
  ["cert", "Framed certificate with a seal"],
  ["id", "Staff ID on a lanyard"],
  ["plate", "Brass door plate"],
  ["medal", "Medal on a ribbon"],
  ["crack", "Cracked frame, mended with tape"],
] as const;

export type AwardLook = (typeof AWARD_LOOKS)[number][0];
export type AwardInfo = {
  look: AwardLook | "";
  /** a job's */
  position: string; company: string; start: string; end: string; still: boolean;
  /** a certificate's */
  issuer: string; issued: string; expires: string; credential: string;
  /** a medal's or a trophy's */
  by: string;
};
export const EMPTY_AWARD: AwardInfo = { look: "", position: "", company: "", start: "", end: "", still: false, issuer: "", issued: "", expires: "", credential: "", by: "" };

const TEXT_FIELDS = ["position", "company", "start", "end", "issuer", "issued", "expires", "credential", "by"] as const;
export const AWARD_TEXT_MAX = 80;

export function cleanAward(raw: unknown): AwardInfo {
  let parsed: unknown = raw;
  if (typeof raw === "string") { try { parsed = JSON.parse(raw); } catch { parsed = {}; } }
  const o = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  const out: AwardInfo = { ...EMPTY_AWARD };
  if (AWARD_LOOKS.some(([k]) => k === o.look)) out.look = o.look as AwardLook;
  for (const k of TEXT_FIELDS) if (typeof o[k] === "string") out[k] = o[k].trim().slice(0, AWARD_TEXT_MAX);
  out.still = o.still === true;
  return out;
}

/** A Date saying this means it's still going on. */
export const isNow = (date: string) => /\b(now|present|current|currently|today|ongoing)\b/i.test(date);

/** Whether this is a job they still have: the tick says so, or with no End given, a Date saying Now. */
export const isCurrent = (date: string, a: Pick<AwardInfo, "still" | "end">) => a.still || (!a.end.trim() && isNow(date));

/** The object an entry gets: what the owner chose, or else the words in its Subsection, whether it's a job they still have, and its Mood. */
export function awardLookOf(subsection: string, mood: string, date: string, a: Pick<AwardInfo, "look" | "still" | "end"> = EMPTY_AWARD): AwardLook {
  if (a.look) return a.look;
  const s = subsection.toLowerCase();
  if (/\b(hall|fame|proud\w*|greatest|legend\w*)\b/.test(s)) return "trophy";
  if (/\b(skills?|certif\w*|courses?|diplomas?|degrees?|licen[cs]es?|training|education)\b/.test(s)) return "cert";
  if (/\b(careers?|jobs?|work\w*|roles?|positions?|milestones?)\b/.test(s)) return isCurrent(date, a) ? "id" : "plate";
  return mood === "sad" ? "crack" : "medal"; // the Mood called "heavy"
}

/** A title like "Data Officer at T.K. Group" already names the position and the company, so those boxes can stay empty. */
export function jobFromTitle(title: string) {
  const m = /^(.+?)\s+at\s+(.+)$/i.exec(title.trim());
  return m ? { position: m[1], company: m[2] } : { position: title.trim(), company: "" };
}

/** When a job was: "Since March 2024" or "2021 – 2023". */
export function jobSpan(a: Pick<AwardInfo, "start" | "end" | "still">, current: boolean) {
  const end = a.still ? "" : a.end;
  if (a.start && end) return `${a.start} – ${end}`;
  if (a.start) return current ? `Since ${a.start}` : a.start;
  return end ? `Until ${end}` : "";
}

/** What a certificate, a medal or a trophy lists under its writing, once filled in. */
export function awardFields(look: AwardLook, a: AwardInfo): [string, string][] {
  const fields: [string, string][] = look === "cert"
    ? [["Issued by", a.issuer], ["Issued", a.issued], ["Expires", a.expires], ["Credential ID", a.credential]]
    : look === "trophy" || look === "medal" ? [["Awarded by", a.by]] : [];
  return fields.filter(([, v]) => v);
}

/** Everything the Details box says, for the entry's own page, which always shows it all. */
export function awardFacts(it: { category: string; title: string; mood?: string; date_label: string; award: AwardInfo }): [string, string][] {
  const a = it.award;
  const look = awardLookOf(it.category, it.mood ?? "", it.date_label, a);
  if (look !== "id" && look !== "plate") return awardFields(look, a);
  const job = jobFromTitle(it.title);
  const facts: [string, string][] = [["Position", a.position || job.position], ["Company", a.company || job.company], ["When", jobSpan(a, isCurrent(it.date_label, a))]];
  return facts.filter(([, v]) => v);
}
