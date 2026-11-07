import { EMPTY_COMIC, comicLookOf, sfxOf, type ComicInfo } from "@/lib/comicItem";
import type { Media } from "@/lib/settings";
import { excerpt } from "./Markdown";
import { Cover } from "./Media";

/**
 * A comic panel, chosen by the dashboard's own words: the Subsection picks the panel unless the entry chooses one, and any poll is a poll panel.
 * The Title is in the bubble, the story in the caption box under it, and a word typed under Sound effect gets a burst. The site and the dashboard's
 * Size & look preview both draw with this, so the preview shows the real thing.
 */
const TITLE_MAX = 110; // a longer title goes in whole under the panel, and its bubble keeps the start of it
const CHIP_MAX = 60; // a brain dump's line longer than this stays in the caption box

type ComicEntry = { category: string; type: string; title: string; subtitle: string; body: string; pinned?: boolean; poll_options: string[]; comic: ComicInfo };

export type ComicView = ReturnType<typeof comicView>;

export function comicView(it: ComicEntry, c: { code: string; fallback: string; index: number; hideSubtitle?: boolean; hasPic?: boolean }) {
  const s = it.comic ?? EMPTY_COMIC;
  const look = it.type === "poll" ? ("poll" as const) : comicLookOf(it.category, s.look);
  const order = Math.max(c.index, 0);
  const long = it.title.length > TITLE_MAX;
  // a brain dump's first short lines get bubbles of their own, and the rest stays in the box
  const lines = it.body.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const chips: string[] = [];
  if (look === "dump" && !c.hasPic) for (const line of lines.slice(0, 2)) { const t = excerpt(line, 400); if (t.length > CHIP_MAX) break; chips.push(t); }
  return {
    look,
    faceoff: look === "poll" && it.poll_options.length === 2 && !c.hasPic,
    no: `${c.code || "G5"}-${String(order + 1).padStart(2, "0")}`,
    seed: order + 1,
    title: it.title,
    bubble: `${it.pinned ? "📌 " : ""}${long ? `${it.title.slice(0, TITLE_MAX).replace(/\s+\S*$/, "")}…` : it.title}`,
    long,
    subtitle: c.hideSubtitle ? "" : it.subtitle,
    subsection: it.category || c.fallback,
    chips,
    text: chips.length ? lines.slice(chips.length).join("\n\n") : it.body,
    sfx: sfxOf(look, s.sfx),
  };
}

const next = (s: number) => (s * 9301 + 49297) % 233280;

function Burst({ spikes, seed, className }: { spikes: number; seed: number; className: string }) {
  const pts: string[] = [];
  let s = seed * 97 + 13;
  for (let i = 0; i < spikes * 2; i++) {
    s = next(s);
    const r = i % 2 ? 36 + (s / 233280) * 7 : 52 + (s / 233280) * 8, a = (i * Math.PI) / spikes;
    pts.push(`${(60 + r * Math.cos(a)).toFixed(1)},${(60 + r * Math.sin(a)).toFixed(1)}`);
  }
  return <svg className={className} viewBox="0 0 120 120" aria-hidden><polygon points={pts.join(" ")} /></svg>;
}

function Scribble({ seed }: { seed: number }) {
  let s = seed * 51 + 7, x = 60, y = 60, d = "M60 60";
  for (let i = 0; i < 22; i++) {
    s = next(s); const a = s / 233280;
    s = next(s); const b = s / 233280;
    const nx = 20 + a * 280, ny = 24 + b * 224;
    d += `Q${((x + nx) / 2 + 30 * (a - 0.5)).toFixed(0)} ${((y + ny) / 2 + 40 * (b - 0.5)).toFixed(0)} ${nx.toFixed(0)} ${ny.toFixed(0)}`;
    x = nx; y = ny;
  }
  return <svg className="cm-scribble" viewBox="0 0 320 268" preserveAspectRatio="none" aria-hidden><path d={d} /></svg>;
}

const Head = () => <svg className="cm-head" viewBox="0 0 120 120"><circle cx="60" cy="44" r="26" /><path d="M12 120c4-36 24-48 48-48s44 12 48 48Z" /></svg>;

export type ComicBody = (parts: {
  /** at the top of the part that scrolls: the title, when the panel doesn't show it all */
  above?: React.ReactNode;
  /** the poll goes here, when the panel isn't itself the poll */
  withPoll: boolean;
  text: string;
}) => React.ReactNode;

export function ComicFrame({ view: v, link, first, fixedPic, picStyle, zoom, poll, body }: {
  view: ComicView;
  /** The entry's link over the panel's art. */
  link?: React.ReactNode;
  first?: Media;
  /** The owner set the picture's height, so it stays that height instead of taking what the writing leaves. */
  fixedPic?: boolean;
  picStyle?: React.CSSProperties;
  zoom?: React.ReactNode;
  poll?: React.ReactNode;
  body: ComicBody;
}) {
  const bare = !first; // with a picture, the picture is the art
  return (
    <>
      <div className={`cm-art cm-${v.look}${first ? ` has-pic${fixedPic ? " fixed" : ""}` : ""}${v.faceoff ? " has-vs" : ""}`}>
        {first && <Cover m={first} className="cm-pic" style={picStyle} />}
        {link}
        {bare && v.look === "hot" && <span className="cm-lines" aria-hidden />}
        {bare && v.look === "dump" && <Scribble seed={v.seed} />}
        {bare && v.look !== "poll" && v.look !== "dump" && <span className="cm-who" aria-hidden><Head />{v.look === "cloud" && <><i className="cm-dot a" /><i className="cm-dot b" /></>}</span>}
        {v.faceoff && <div className="cm-vs">{poll}</div>}
        <div className="cm-cap">{v.subsection}</div>
        <div className="cm-no">{v.no}</div>
        {v.faceoff ? (
          <><Burst spikes={11} seed={v.seed} className="cm-vsb" /><span className="cm-vst" aria-hidden>VS</span></>
        ) : v.chips.length > 0 ? (
          <div className="cm-chips"><h3 className="cm-chip">{v.bubble}</h3>{v.chips.map((c, i) => <span key={i} className="cm-chip">{c}</span>)}</div>
        ) : (
          <div className={`cm-bubble${v.look === "cloud" ? " cm-think" : ""}${v.look === "poll" || v.look === "dump" ? " up" : ""}${v.long ? " long" : ""}`}><h3>{v.bubble}</h3></div>
        )}
        {v.sfx && <><Burst spikes={13} seed={v.seed + 3} className="cm-burst" /><span className={`cm-sfx${v.sfx.length > 9 ? " small" : ""}`} aria-hidden>{v.sfx}</span></>}
        {zoom}
      </div>
      {body({ above: v.faceoff || v.long ? <h3 className="cm-q">{v.title}</h3> : undefined, withPoll: v.look === "poll" && !v.faceoff, text: v.text })}
    </>
  );
}

/** The end of a short row. It isn't an entry, so the row doesn't count it. */
export const ComicMore = ({ sky }: { sky: boolean }) => (
  <div className="cm-more" data-rider aria-hidden>
    {sky && <div className="cm-sky" />}
    <div className="cm-more-in"><span>To be continued…</span></div>
  </div>
);

/** The brain that flies along the row. */
export const FlyingBrain = () => (
  <svg viewBox="0 0 56 44">
    <ellipse className="wing" cx="9" cy="22" rx="9" ry="5" /><ellipse className="wing" cx="47" cy="22" rx="9" ry="5" />
    <path className="brain" d="M15 26c-3-8 3-14 7-13 1-6 11-7 14-1 6-1 10 6 6 13 1 6-6 10-11 7-4 3-13 1-16-6Z" />
    <path className="fold" d="M22 20c3-3 6 2 9-1s5 1 7 0M20 27c4-2 7 1 10-1s5 0 7-1" />
  </svg>
);
