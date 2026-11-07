/**
 * What the owner enters in the dashboard for one entry of a Comic strip section (items.comic). Its Subsection picks the panel unless they
 * choose one, and a burst appears when there's a sound effect word. A poll is always a poll panel.
 */
export const COMIC_LOOKS = [
  ["say", "Speech bubble"],
  ["hot", "Hot take: a shout with a burst"],
  ["cloud", "Thought cloud"],
  ["dump", "Brain dump: scribbles and scattered bubbles"],
] as const;
export type ComicLook = (typeof COMIC_LOOKS)[number][0];

export type ComicInfo = {
  look: ComicLook | "";
  /** the word in the panel's burst, such as Pow! or Zap! */
  sfx: string;
};

export const EMPTY_COMIC: ComicInfo = { look: "", sfx: "" };
export const SFX_MAX = 14;

export function cleanComic(raw: unknown): ComicInfo {
  let o: Record<string, unknown> = {};
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (v && typeof v === "object" && !Array.isArray(v)) o = v as Record<string, unknown>;
  } catch { /* unreadable: treat as empty */ }
  return {
    look: COMIC_LOOKS.some(([k]) => k === o.look) ? (o.look as ComicLook) : "",
    sfx: String(o.sfx ?? "").trim().slice(0, SFX_MAX),
  };
}

/** The panel an entry gets: what the owner chose, or else the words in its subsection's name. */
export function comicLookOf(subsection: string, chosen: ComicLook | "" = ""): ComicLook {
  if (chosen) return chosen;
  const s = subsection.toLowerCase();
  if (/\b(hot|takes?|rants?|opinions?|unpopular)\b/.test(s)) return "hot";
  if (/\b(poems?|poetry|verses?|sayings?|quotes?|lines?)\b/.test(s)) return "cloud";
  if (/\b(dumps?|chaos|random|scribbles?)\b/.test(s)) return "dump";
  return "say";
}

/** The word in the burst: what the owner typed, or for a hot take its own name. Nothing else gets a burst by itself. */
export const sfxOf = (look: ComicLook | "poll", typed: string) => typed || (look === "hot" ? "Hot take!" : "");
