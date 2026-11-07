/**
 * What the owner enters in the dashboard for one entry of a Comic strip section (items.comic). Its Subsection picks the panel unless they choose
 * one. A poll's panel also goes by how many options it has, and the Sound effect is a word that bursts on the panel, or pops when someone votes.
 */
export const COMIC_LOOKS = [
  ["say", "Speech bubble"],
  ["hot", "Hot take: a jagged shout, flames and a burst"],
  ["poem", "Poem: a night sky and a thought cloud"],
  ["stuck", "Saying: stuck on a fridge with magnets"],
  ["loop", "On repeat: a spinning record"],
  ["vibe", "Vibing: waves in the colour of its Mood"],
  ["dump", "Brain dump: thoughts tumbling into a bin"],
  ["chaos", "Creative chaos: words on scraps, paint flying"],
  ["quick", "Quick fire: a quiz show, with a buzzer that reveals the answer"],
] as const;
export type ComicLook = (typeof COMIC_LOOKS)[number][0];

/** Panels for polls, and how many options each can hold. */
export const COMIC_POLL_LOOKS = [
  ["scale", "Balance scale", 2, 3],
  ["vs", "Face-off", 2, 2],
  ["quick", "Quiz show with buzzers", 2, 4],
  ["slash", "Three slashes", 3, 3],
  ["quad", "Four small panels", 4, 4],
  ["buttons", "Big comic buttons", 2, 8],
] as const;
export type ComicPollLook = (typeof COMIC_POLL_LOOKS)[number][0];
export type ComicAnyLook = ComicLook | ComicPollLook;

export type ComicInfo = {
  look: ComicAnyLook | "";
  /** the word in the panel's burst, such as Pow! or Zap! */
  sfx: string;
};

export const EMPTY_COMIC: ComicInfo = { look: "", sfx: "" };
export const SFX_MAX = 14;
const LOOK_KEYS: string[] = [...COMIC_LOOKS.map(([k]) => k), ...COMIC_POLL_LOOKS.map(([k]) => k)];

export function cleanComic(raw: unknown): ComicInfo {
  let o: Record<string, unknown> = {};
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (v && typeof v === "object" && !Array.isArray(v)) o = v as Record<string, unknown>;
  } catch { /* unreadable: treat as empty */ }
  const look = o.look === "cloud" ? "poem" : o.look; // what the thought cloud was called at first
  return {
    look: LOOK_KEYS.includes(String(look)) ? (look as ComicAnyLook) : "",
    sfx: String(o.sfx ?? "").trim().slice(0, SFX_MAX),
  };
}

/** The panel an entry gets: what the owner chose, or else the words in its subsection's name. */
export function comicLookOf(subsection: string, chosen: ComicAnyLook | "" = ""): ComicLook {
  if (chosen && COMIC_LOOKS.some(([k]) => k === chosen)) return chosen as ComicLook;
  const s = subsection.toLowerCase();
  if (/\b(hot|takes?|rants?|opinions?|unpopular)\b/.test(s)) return "hot";
  if (/\b(poems?|poetry|verses?)\b/.test(s)) return "poem";
  if (/\b(sayings?|quotes?|lines?|stuck)\b/.test(s)) return "stuck";
  if (/\b(repeat|loop|songs?|music|listen\w*)\b/.test(s)) return "loop";
  if (/\b(vib\w*|moods?|feeling)\b/.test(s)) return "vibe";
  if (/\b(dumps?|random|scribbles?)\b/.test(s)) return "dump";
  if (/\b(chaos|creative|mess)\b/.test(s)) return "chaos";
  if (/\b(quick|fire|quiz|rapid|questions?)\b/.test(s)) return "quick";
  return "say";
}

const SCALE_WORD_MAX = 22; // a pan can't hold a longer option
const QUICK_WORD_MAX = 24; // nor can a buzzer's label

const fits = (look: ComicPollLook, options: string[]) => {
  const row = COMIC_POLL_LOOKS.find(([k]) => k === look);
  if (!row || options.length < row[2] || options.length > row[3]) return false;
  if (look === "scale") return options.every((o) => o.length <= SCALE_WORD_MAX);
  if (look === "quick") return options.every((o) => o.length <= QUICK_WORD_MAX);
  return true;
};

/** The panels a poll with these options can use. */
export const comicPollChoices = (options: string[]) => COMIC_POLL_LOOKS.filter(([k]) => fits(k, options));

/** A poll's panel. A picture needs the art to itself, so it gets big buttons. Otherwise its subsection's words, then how many options it has. */
export function comicPollOf(subsection: string, options: string[], chosen: ComicAnyLook | "" = "", hasPic = false): ComicPollLook {
  if (hasPic) return "buttons";
  if (chosen && COMIC_POLL_LOOKS.some(([k]) => k === chosen) && fits(chosen as ComicPollLook, options)) return chosen as ComicPollLook;
  const s = subsection.toLowerCase();
  if (/\b(overrated|underrated|rated)\b/.test(s) && fits("scale", options)) return "scale";
  if (/\b(quick|fire|quiz|rapid|questions?)\b/.test(s) && fits("quick", options)) return "quick";
  if (options.length === 2) return "vs";
  if (options.length === 3) return "slash";
  if (options.length === 4) return "quad";
  return "buttons";
}

/** The word in the burst: what the owner typed, or a panel's own. Nothing else gets a burst by itself. */
export function sfxOf(look: ComicAnyLook, typed: string) {
  if (typed) return typed;
  return look === "hot" ? "Hot take!" : look === "loop" ? "On loop!" : look === "chaos" ? "Splat!" : "";
}

/** The word that pops when someone votes. */
export function voteWordOf(look: ComicAnyLook, typed: string) {
  if (typed) return typed;
  return look === "scale" ? "Clunk!" : look === "vs" ? "Pow!" : look === "quick" ? "Ding!" : look === "slash" ? "Slash!" : "Bam!";
}

/** Options the dashboard can fill in for a poll, from its subsection's words. */
export function comicReadyOptions(subsection: string): string[] | null {
  const s = subsection.toLowerCase();
  if (/\b(overrated|underrated|rated)\b/.test(s)) return ["Overrated", "Underrated", "Perfectly rated"];
  if (/\brather\b/.test(s)) return ["This one", "That one"];
  if (/\b(quick|fire|quiz|rapid)\b/.test(s)) return ["Yes", "No", "Maybe", "Ask me later"];
  return null;
}

/** A title that already names its choices ("Messi or Ronaldo?") can fill in the options when an entry becomes a poll. */
export function comicOptionsFromTitle(title: string): string[] | null {
  const parts = title.trim().replace(/[?!.\s]+$/, "").split(/\s+(?:or|vs\.?|versus|বা|নাকি)\s+/i);
  if (parts.length !== 2) return null;
  const list = [...parts[0].split(/\s*,\s*/), parts[1]].map((x) => x.trim()).filter(Boolean);
  if (list.length < 2 || list.length > 8 || list.some((x) => x.length > 30 || x.includes(":") || x.split(/\s+/).length > 4)) return null;
  return list.map((x) => x[0].toUpperCase() + x.slice(1));
}

/** A subsection whose panel only makes sense as a poll, so the dashboard can say so on a plain entry. */
export const comicWantsPoll = (subsection: string) => /\b(overrated|underrated|rated|rather)\b/.test(subsection.toLowerCase());
