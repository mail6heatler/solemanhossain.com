import { EMPTY_COMIC, comicLookOf, comicPollOf, sfxOf, voteWordOf, type ComicInfo } from "@/lib/comicItem";
import { MOODS, type Media } from "@/lib/settings";
import { BrainShape, Burst, Flames, Floaty, Head, Scribble, Spikes, Splat, Waves } from "./comicArt";
import { isSplittable } from "./Split";
import { excerpt } from "./Markdown";
import { Cover } from "./Media";
import { ComicReveal } from "./ComicPoll";

/**
 * A comic panel, chosen by the dashboard's own words: the Subsection picks it unless the entry chooses one, and a poll's also goes by how many
 * options it has. The site and the dashboard's Size & look preview both draw with this, so the preview shows the real thing.
 */
const TITLE_MAX = 110; // a longer title goes in whole under the panel, and its bubble keeps the start of it
const CHIP_MAX = 60; // a brain dump's line longer than this stays in the caption box
const WIDE_WORD = 9; // past this many letters, a title drops a weight so that its longest word still fits
const letters = (word: string) => Array.from(word).length;
/** How many letters are in the longest word, which is what sets how big the lettering can be. */
const longestWord = (text: string) => Math.max(1, ...text.split(/\s+/).map(letters));

type ComicEntry = { category: string; type: string; title: string; subtitle: string; body: string; mood?: string; pinned?: boolean; poll_options: string[]; comic: ComicInfo };

export type ComicView = ReturnType<typeof comicView>;

export function comicView(it: ComicEntry, c: { code: string; fallback: string; index: number; hideSubtitle?: boolean; hasPic?: boolean }) {
  const s = it.comic ?? EMPTY_COMIC;
  const isPoll = it.type === "poll";
  const look = isPoll ? comicPollOf(it.category, it.poll_options, s.look, c.hasPic) : comicLookOf(it.category, s.look);
  const order = Math.max(c.index, 0);
  const long = it.title.length > TITLE_MAX;
  const short = long ? `${it.title.slice(0, TITLE_MAX).replace(/\s+\S*$/, "")}…` : it.title;
  const lines = it.body.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  // a brain dump's first short lines get bubbles of their own, and the rest stays in the box
  const chips: string[] = [];
  if (look === "dump" && !c.hasPic) for (const line of lines.slice(0, 2)) { const t = excerpt(line, 400); if (t.length > CHIP_MAX) break; chips.push(t); }
  // only whole words go on scraps, so scripts that join their letters stay correct
  const tiles = look === "chaos" ? short.split(/\s+/).filter(Boolean) : [];
  const magnet = look === "stuck" ? s.sfx || "Stuck" : "";
  const titleWord = longestWord(short);
  return {
    isPoll,
    look,
    no: `${c.code || "G5"}-${String(order + 1).padStart(2, "0")}`,
    seed: order + 1,
    title: it.title,
    bubble: `${it.pinned ? "📌 " : ""}${short}`,
    long,
    /** a longer title gets smaller lettering, so it stays inside whatever holds it */
    size: `${short.length > 80 ? " s-long" : short.length > 46 ? " s-mid" : ""}${titleWord > WIDE_WORD ? " w7" : ""}`,
    titleWord,
    subtitle: c.hideSubtitle ? "" : it.subtitle,
    subsection: it.category || c.fallback,
    chips,
    verses: look === "poem" ? lines : [],
    tiles,
    letters: magnet && isSplittable(magnet) ? Array.from(magnet.toUpperCase().replace(/\s+/g, "")) : magnet ? [magnet] : [],
    text: chips.length ? lines.slice(chips.length).join("\n\n") : it.body,
    sfx: look === "stuck" || (isPoll && look !== "buttons") ? "" : sfxOf(look, s.sfx),
    word: voteWordOf(look, s.sfx),
    mood: it.mood && MOODS[it.mood] ? MOODS[it.mood] : null,
  };
}

// the third colour is an outline, for the accent colours whose contrast depends on the theme
const TILE_COLOURS = [["var(--pop2)", "var(--bg)", "var(--fg)"], ["var(--mint)", "var(--on-mint)"], ["var(--card)", "var(--fg)"], ["var(--pop3)", "var(--bg)", "var(--fg)"], ["var(--inv-bg)", "var(--inv-fg)"]];
const LETTER_COLOURS = [["var(--pop2)", "var(--bg)", "var(--fg)"], ["var(--mint)", "var(--on-mint)"], ["var(--pop3)", "var(--bg)", "var(--fg)"], ["var(--inv-fg)", "var(--inv-bg)"]];
const next = (s: number) => (s * 9301 + 49297) % 233280;

function Tiles({ words, seed }: { words: string[]; seed: number }) {
  let s = seed * 77 + 11;
  const r = () => { s = next(s); return s / 233280; };
  return (
    <h3 className={`cm-tiles${words.length > 9 ? " many" : ""}`}>
      {words.map((w, i) => {
        const c = TILE_COLOURS[i % TILE_COLOURS.length];
        return <b key={i} style={{ "--tile": letters(w), "--c": c[0], "--c2": c[1], "--c3": c[2], "--r": `${((r() - 0.5) * 13).toFixed(1)}deg`, "--d": i, "--dx": `${((r() - 0.5) * 180).toFixed(0)}px`, "--dy": `${((r() - 0.5) * 180).toFixed(0)}px` } as React.CSSProperties}>{w} </b>;
      })}
    </h3>
  );
}

const Figure = ({ thinking }: { thinking?: boolean }) => <span className="cm-who" aria-hidden><Head />{thinking && <><i className="cm-dot a" /><i className="cm-dot b" /></>}</span>;

export type ComicBody = (parts: {
  /** at the top of the part that scrolls: the title, when the panel doesn't show it all */
  above?: React.ReactNode;
  /** the poll goes here, when the panel's art isn't itself the poll */
  withPoll: boolean;
}) => React.ReactNode;

export function ComicFrame({ view: v, link, first, fixedPic, picStyle, zoom, poll, still, body }: {
  view: ComicView;
  /** The entry's link over the panel's art. */
  link?: React.ReactNode;
  first?: Media;
  /** The owner set the picture's height, so it stays that height instead of taking what the writing leaves. */
  fixedPic?: boolean;
  picStyle?: React.CSSProperties;
  zoom?: React.ReactNode;
  poll?: React.ReactNode;
  /** In the dashboard's preview, where nothing reacts. */
  still?: boolean;
  body: ComicBody;
}) {
  // a record shows a picture as its label; otherwise a picture is the art, and the panel's own scenery stays out of its way
  const onRecord = v.look === "loop" && !!first && (first.type === "image" || (first.type === "pdf" && !!first.thumb));
  const picArt = !!first && !onRecord;
  const bare = !picArt;
  const fullPoll = v.look === "vs" || v.look === "slash" || v.look === "quad";
  const artPoll = v.isPoll && (v.look === "scale" || v.look === "quick");
  const bubble = v.look === "buttons" || v.look === "scale" || v.look === "say" || v.look === "loop" || v.look === "vibe" || (picArt && v.look === "dump");
  return (
    <>
      <div className={`cm-art cm-${v.look}${picArt ? ` has-pic${fixedPic ? " fixed" : ""}` : ""}`} style={{ "--tw": v.titleWord, ...(v.look === "vibe" && v.mood ? { "--m": v.mood.color } : {}) } as React.CSSProperties}>
        {picArt && <Cover m={first} className="cm-pic" style={picStyle} />}
        {link}
        {v.look === "hot" && bare && <span className="cm-lines" aria-hidden />}
        {(v.look === "say" || v.look === "hot") && bare && <Figure />}
        {v.look === "hot" && <Flames seed={v.seed} />}
        {v.look === "poem" && bare && <><span className="cm-moon" aria-hidden /><svg className="cm-hill" viewBox="0 0 320 86" preserveAspectRatio="none" aria-hidden><path d="M0 60C60 20 130 18 190 46S290 66 320 42V86H0Z" /></svg><Figure thinking /></>}
        {v.look === "stuck" && bare && <span className="cm-handle" aria-hidden />}
        {v.look === "vibe" && <Waves />}
        {v.look === "vibe" && bare && <Floaty />}
        {v.look === "dump" && bare && <><Scribble seed={v.seed} /><svg className="cm-dbrain" viewBox="0 0 56 44" aria-hidden><BrainShape /></svg></>}
        {v.look === "chaos" && <><Splat seed={v.seed + 4} className="a" /><Splat seed={v.seed + 9} className="b" /><Splat seed={v.seed + 15} className="c" /></>}
        {fullPoll && poll}
        <div className="cm-cap">{v.subsection}</div>
        <div className="cm-no">{v.no}</div>

        {v.look === "hot" && <div className={`cm-shout${v.size}`}><Spikes seed={v.seed} /><h3>{v.bubble}</h3></div>}
        {v.look === "poem" && <div className={`cm-bubble cm-think${v.size}`}><h3>{v.bubble}</h3></div>}
        {v.look === "stuck" && <div className={`cm-note${v.size}`}><i className="cm-mag a" aria-hidden /><i className="cm-mag b" aria-hidden /><h3>{v.bubble}</h3></div>}
        {v.look === "stuck" && (
          <div className={`cm-letters${v.letters.length > 7 ? " many" : ""}`} aria-hidden>
            {v.letters.map((l, i) => { const c = LETTER_COLOURS[i % LETTER_COLOURS.length]; return <i key={i} style={{ "--c": c[0], "--c2": c[1], "--c3": c[2] } as React.CSSProperties}>{l}</i>; })}
          </div>
        )}
        {bubble && <div className={`cm-bubble${v.look === "scale" || v.look === "buttons" || v.look === "dump" ? " up" : ""}${v.long ? " long" : ""}${v.size}`}><h3>{v.bubble}</h3></div>}
        {v.look === "quick" && <><div className={`cm-board${v.size}`}><h3>{v.bubble}</h3></div><div className="cm-time" aria-hidden><i /></div></>}
        {v.look === "dump" && bare && <div className="cm-chips"><h3 className="cm-chip">{v.bubble}</h3>{v.chips.map((c, i) => <span key={i} className="cm-chip">{c}</span>)}</div>}
        {v.look === "dump" && bare && <svg className="cm-bin" viewBox="0 0 128 62" aria-hidden><path d="M4 3H124L112 62H16Z" /><path className="rib" d="M38 12 44 56M64 12V56M90 12 84 56" /></svg>}
        {v.look === "chaos" && <Tiles words={v.tiles} seed={v.seed} />}
        {v.look === "vibe" && v.mood && <span className="cm-vibe-tag">{v.mood.emoji} Vibe: {v.mood.label}</span>}

        {v.look === "loop" && (
          <>
            <div className="cm-vy">
              <div className="cm-disc">{onRecord ? <Cover m={first} className="cm-label" style={picStyle} /> : <span className="cm-label cm-nolabel" aria-hidden>♪</span>}</div>
              <svg className="cm-arm" viewBox="0 0 76 106" aria-hidden><path d="M62 12 54 66 26 94" /><circle cx="62" cy="12" r="8" /></svg>
            </div>
            <div className="cm-notes" aria-hidden><i style={{ "--x": "18%" } as React.CSSProperties}>♪</i><i style={{ "--x": "70%" } as React.CSSProperties}>♫</i><i style={{ "--x": "30%" } as React.CSSProperties}>♪</i></div>
          </>
        )}
        {artPoll && poll}
        {v.look === "quick" && !v.isPoll && <ComicReveal hasAnswer={!!v.text.trim()} word={v.word} still={still} />}
        {v.sfx && <><Burst spikes={13} seed={v.seed + 3} className="cm-burst" /><span className={`cm-sfx${v.sfx.length > 9 ? " small" : ""}`} aria-hidden>{v.sfx}</span></>}
        {zoom}
      </div>
      {body({ above: fullPoll || v.long ? <h3 className="cm-q">{v.title}</h3> : undefined, withPoll: v.look === "buttons" })}
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
