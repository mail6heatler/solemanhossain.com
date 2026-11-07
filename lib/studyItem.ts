/**
 * What the owner enters in the dashboard for one entry of a Study shelf section (items.study). Its Subsection picks the object it looks
 * like unless they choose one, and its words pick what a player's screen shows unless they press a Type button.
 */
export const STUDY_LOOKS = [
  ["book", "Book"],
  ["player", "TV player"],
  ["portrait", "Framed portrait"],
  ["phone", "Phone"],
  ["note", "Note"],
] as const;
export type StudyLook = (typeof STUDY_LOOKS)[number][0];

export const STUDY_MEDIA = [
  ["song", "Song"],
  ["music", "Music"],
  ["podcast", "Podcast"],
  ["radio", "Radio"],
  ["video", "Video"],
] as const;
export type StudyMedia = (typeof STUDY_MEDIA)[number][0];

export type StudyInfo = {
  look: StudyLook | "";
  media: StudyMedia | "";
  /** the words on a player's screen, such as FM 98.4 or EP 12 */
  screen: string;
  /** the line that stuck: a quote or lyric, shown highlighted */
  line: string;
};

export const EMPTY_STUDY: StudyInfo = { look: "", media: "", screen: "", line: "" };

export function cleanStudy(raw: unknown): StudyInfo {
  let o: Record<string, unknown> = {};
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (v && typeof v === "object" && !Array.isArray(v)) o = v as Record<string, unknown>;
  } catch { /* unreadable: treat as empty */ }
  return {
    look: STUDY_LOOKS.some(([k]) => k === o.look) ? (o.look as StudyLook) : "",
    media: STUDY_MEDIA.some(([k]) => k === o.media) ? (o.media as StudyMedia) : "",
    screen: String(o.screen ?? "").trim().slice(0, 24),
    line: String(o.line ?? "").trim().slice(0, 300),
  };
}

/** The object an entry looks like: what the owner chose, or else the words in its subsection's name. */
export function studyLookOf(subsection: string, chosen: StudyLook | "" = ""): StudyLook {
  if (chosen) return chosen;
  const s = subsection.toLowerCase();
  if (/\b(books?|novels?|reads?|reading|stories|essays?)\b/.test(s)) return "book";
  if (/\b(songs?|music|albums?|podcasts?|radio|videos?|films?|movies?|tv|shows?|listen\w*|watch\w*|play\w*)\b/.test(s)) return "player";
  if (/\b(people|persons?|heroes|hero|mentors?|teachers?)\b/.test(s)) return "portrait";
  if (/\b(internet|web|online|links?|articles?|posts?|threads?|memes?|sites?)\b/.test(s)) return "phone";
  return "note";
}

const KINDS: [StudyMedia, RegExp][] = [
  ["podcast", /\b(podcasts?|episodes?)\b/],
  ["radio", /\b(radio|fm|stations?)\b/],
  ["video", /\b(videos?|films?|movies?|tv|shows?|channels?|watch\w*|youtube)\b/],
  ["music", /\b(music|albums?|instrumentals?)\b/],
  ["song", /\b(songs?|lyrics?|tracks?|listen\w*)\b/],
];

/** What a player's screen shows: the Type button if one is pressed, a video if one is uploaded, then the entry's own words, and last its subsection's words when they point at one kind only. */
export function studyMediaOf(it: { category: string; title: string; subtitle: string; tags: string[]; study: StudyInfo; hasVideo: boolean }): StudyMedia {
  if (it.study.media) return it.study.media;
  if (it.hasVideo) return "video";
  const own = `${it.title} ${it.subtitle} ${it.tags.join(" ")}`.toLowerCase();
  for (const [kind, words] of KINDS) if (words.test(own)) return kind;
  const named = KINDS.filter(([, words]) => words.test(it.category.toLowerCase()));
  return named.length === 1 ? named[0][0] : "song";
}
