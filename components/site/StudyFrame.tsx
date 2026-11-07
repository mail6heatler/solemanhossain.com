import { EMPTY_STUDY, STUDY_MEDIA, studyLookOf, studyMediaOf, type StudyInfo } from "@/lib/studyItem";
import type { Media } from "@/lib/settings";
import { Cover } from "./Media";

/**
 * What a Study shelf entry looks like, chosen by the dashboard's own words: its Subsection picks the object (a book, a TV player, a framed
 * portrait, a phone or a note), its Type what a player's screen shows, and its Status the book's ribbon, the player's sticker or the phone's
 * notification. The site and the dashboard's Size & look preview both draw with this, so the preview shows the real thing.
 */
type StudyEntry = { category: string; status: string; title: string; subtitle: string; tags: string[]; media: Media[]; study: StudyInfo };

export type StudyView = ReturnType<typeof studyView>;

export function studyView(it: StudyEntry, c: { code: string; fallback: string; index: number; hideSubtitle?: boolean }) {
  const s = it.study ?? EMPTY_STUDY;
  const media = studyMediaOf({ ...it, study: s, hasVideo: it.media.some((m) => m.type === "video") });
  const order = Math.max(c.index, 0);
  return {
    look: studyLookOf(it.category, s.look),
    media,
    mediaName: STUDY_MEDIA.find(([k]) => k === media)?.[1] ?? "Song",
    no: `${c.code || "G4"}-${String(order + 1).padStart(2, "0")}`,
    seed: order + 1,
    title: it.title,
    subtitle: c.hideSubtitle ? "" : it.subtitle,
    subsection: it.category || c.fallback,
    status: it.status,
    line: s.line,
    screen: s.screen,
  };
}

const Tri = () => <svg viewBox="0 0 14 16" aria-hidden><path d="M1 1 13 8 1 15Z" /></svg>;

/** Music bars or a sound wave. Each third bar is its own drawing, so three layers move instead of one per bar, however many bars there are. */
function Bars({ n, seed, wave }: { n: number; seed: number; wave?: boolean }) {
  let s = (seed * 2654435761 + 7) >>> 0;
  const next = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const hs = Array.from({ length: n }, (_, i) => (wave ? 14 + next() * 86 * Math.abs(Math.sin(i * 0.55)) : 30 + next() * 70));
  const path = (g: number) => hs.map((h, i) => (i % 3 !== g ? "" : `M${i * 4 + 0.5} ${(wave ? 50 - h / 2 : 100 - h).toFixed(1)}h3v${h.toFixed(1)}h-3z`)).join("");
  return (
    <span className={`tv-bars${wave ? " wave" : ""}`} aria-hidden>
      {[0, 1, 2].map((g) => <svg key={g} viewBox={`0 0 ${n * 4} 100`} preserveAspectRatio="none"><path d={path(g)} /></svg>)}
    </span>
  );
}

/** Where a radio's needle sits, from the number in the words on its screen. */
const needleAt = (screen: string) => {
  const f = parseFloat(screen.replace(/[^\d.]/g, ""));
  return f >= 88 && f <= 108 ? ((f - 88) / 20) * 100 : 46;
};

function Screen({ v, first }: { v: StudyView; first?: Media }) {
  const pic = first ? <Cover m={first} className="tv-pic" /> : null;
  if (v.media === "video") return (
    <>
      {first?.type === "video"
        ? <video className="tv-video" src={`${first.url}#t=0.1`} muted playsInline loop preload="metadata" aria-label={`Video: ${v.title}`} />
        : first ? <Cover m={first} className="tv-pic" /> : <span className="tv-test" aria-hidden />}
      <span className="tv-word">{v.screen || "NOW SHOWING"}</span>
      <span className="tv-big" aria-hidden><Tri /></span>
    </>
  );
  if (v.media === "radio") return (
    <>
      {pic && <span className="tv-behind">{pic}</span>}
      <span className="tv-word"><i className="tv-air" />ON AIR</span>
      <span className="tv-freq">{v.screen || "FM"}</span>
      <span className="tv-dial" aria-hidden>
        <span className="tv-scale" />
        <span className="tv-nums"><span>88</span><span>92</span><span>96</span><span>100</span><span>104</span><span>108</span></span>
        <i className="tv-needle" style={{ left: `calc(10px + (100% - 20px) * ${(needleAt(v.screen) / 100).toFixed(3)})` }} />
      </span>
    </>
  );
  if (v.media === "podcast") return (
    <>
      {pic && <span className="tv-guest">{pic}</span>}
      <span className="tv-word">{v.screen || "ON THE PODCAST"}</span>
      {!pic && <svg className="tv-mic" viewBox="0 0 20 24" aria-hidden><rect x="6" y="1" width="8" height="14" rx="4" /><path d="M2 11c0 5 4 7 8 7s8-2 8-7M10 18v5" /></svg>}
      <Bars n={30} seed={v.seed} wave />
    </>
  );
  return (
    <>
      <span className="tv-word">{v.screen || "NOW PLAYING"}</span>
      <span className="tv-song">
        <span className="tv-cover">{pic}</span>
        <Bars n={10} seed={v.seed} />
      </span>
    </>
  );
}

export type StudyBody = (parts: {
  /** at the top of the part that scrolls */
  above?: React.ReactNode;
  /** the title and subtitle go in the text, when the frame doesn't show them */
  showTitle?: boolean;
}) => React.ReactNode;

export function StudyFrame({ view: v, link, picture, first, zoom, play, canPlay, body }: {
  view: StudyView;
  /** The entry's link over the parts that don't scroll. */
  link?: React.ReactNode;
  /** A picture box, for the frames that show one as it is. */
  picture: React.ReactNode;
  /** The picture or video itself, for the book's cover and the player's screen. */
  first?: Media;
  zoom?: React.ReactNode;
  play?: React.ReactNode;
  /** It has sound or a video to play, so a click on the screen plays it. */
  canPlay?: boolean;
  body: StudyBody;
}) {
  if (v.look === "book") return (
    <>
      <span className="bk-edge" aria-hidden />
      <span className="bk-spine" aria-hidden><b>{v.title}</b></span>
      {v.status && <span className="bk-ribbon"><span>{v.status}</span></span>}
      <span className="bk-turn" aria-hidden><i /><i /><i /></span>
      <div className="bk-in">
        <div className={`bk-cover${first ? " has-pic" : ""}`}>
          {link}
          {first && <Cover m={first} className="bk-pic" />}
          <div className="bk-band"><span>{v.subsection}</span><span className="tkt-no">{v.no}</span></div>
          <h3>{v.title}</h3>
          {v.subtitle && <p>{v.subtitle}</p>}
          {zoom}
        </div>
        {body({})}
      </div>
    </>
  );
  if (v.look === "player") return (
    <>
      <div className={`tv-head${canPlay ? " can-play" : ""}`}>
        {link}
        <svg className="tv-ant" viewBox="0 0 110 40" aria-hidden><path d="M55 40 24 5M55 40 90 2" /><circle cx="24" cy="5" r="3.5" /><circle cx="90" cy="2" r="3.5" /></svg>
        <div className="tv-bezel">
          {v.status && <span className="tv-sticker">{v.status}</span>}
          <div className="tv-screen">
            <Screen v={v} first={first} />
            <i className="tv-lines" /><i className="tv-glare" /><i className="tv-band" /><i className="tv-on" />
          </div>
          {zoom}
        </div>
        <div className="tv-panel">
          {play}
          <span className="tv-kind">{v.mediaName}</span>
          <span className="tv-grille" aria-hidden><i className="tv-fill" /></span>
          <span className="tv-time" aria-hidden />
          <span className="tv-knob" aria-hidden /><span className="tv-knob b" aria-hidden />
        </div>
      </div>
      {body({ showTitle: true })}
    </>
  );
  if (v.look === "portrait") return (
    <>
      <svg className="pt-wire" viewBox="0 0 130 34" aria-hidden><path d="M4 34 65 5 126 34" /><circle cx="65" cy="5" r="4" /></svg>
      <div className="pt-mat">
        <div className="pt-top">
          {link}
          {picture ?? (
            <svg className="pt-nobody" viewBox="0 0 120 120" preserveAspectRatio="xMidYMax slice" aria-hidden><circle cx="60" cy="48" r="24" /><path d="M14 120c4-34 22-46 46-46s42 12 46 46Z" /></svg>
          )}
          {v.status && <span className="pt-tag">{v.status}</span>}
          <div className="pt-plate"><h3>{v.title}</h3>{v.subtitle && <p>{v.subtitle}</p>}</div>
          <div className="pt-sub"><span>{v.subsection}</span><span className="tkt-no">{v.no}</span></div>
        </div>
        {body({})}
      </div>
    </>
  );
  if (v.look === "phone") return (
    <div className="pn-screen">
      <span className="pn-notch" aria-hidden />
      <span className="pn-turn" aria-hidden><i /><i /></span>
      <span className="pn-fly" aria-hidden><i>♥</i><i>♥</i><i>♥</i></span>
      <div className="pn-top">
        {link}
        <div className="pn-status" aria-hidden><span>9:41</span><em><i /><i /><i /></em></div>
        <div className="pn-note"><span className="pn-ping" aria-hidden /><b>{v.subsection}</b>{v.status || v.no}</div>
      </div>
      {body({ showTitle: true, above: picture ?? <div className="pn-art" aria-hidden /> })}
    </div>
  );
  return (
    <>
      <span className="nt-tape" aria-hidden />
      <div className="nt-head">{link}<span>{v.subsection}</span><span className="tkt-no">{v.no}</span></div>
      {v.status && <span className="pt-tag nt-tag">{v.status}</span>}
      {body({ showTitle: true, above: picture })}
    </>
  );
}

/** The end of a short shelf: a few books and a plant, so it doesn't look empty. It isn't a card, so the row doesn't count it. */
export const ShelfDecor = () => (
  <div className="sty-decor" data-rider aria-hidden>
    <div className="sty-rail" />
    <div className="sty-decor-row">
      <span className="sty-books"><i /><i /><i /><i /></span>
      <svg className="sty-plant" viewBox="0 0 80 122"><path className="leaf" d="M40 72C40 46 22 38 10 34c2 22 12 36 30 38ZM40 66c0-30 12-44 30-52 2 26-8 46-30 52ZM40 74c-2-26 0-48 2-68 10 18 8 48-2 68Z" /><path className="pot" d="M18 72H62L56 118Q55.5 122 52 122H28Q24.5 122 24 118Z" /></svg>
    </div>
    <div className="sty-plank" />
  </div>
);

/** The lamp that travels along the shelf. */
export const ShelfLamp = () => (
  <>
    <span className="sty-cone" />
    <svg viewBox="0 0 48 44" className="sty-lamp-art"><rect className="stem" x="21" y="0" width="6" height="12" /><path className="shade" d="M12 30 18 12H30L36 30Z" /><circle className="bulb" cx="24" cy="33" r="6" /></svg>
  </>
);
