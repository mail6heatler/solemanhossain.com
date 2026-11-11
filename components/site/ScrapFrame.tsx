import { MOODS } from "@/lib/settings";
import { EMPTY_SCRAP, SCRAP_DAYS, scrapLookOf, streakOf, type ScrapInfo } from "@/lib/scrapItem";

/**
 * A Scrapbook pages entry: a page torn from a scrapbook, chosen by the dashboard's own words. A photo diary is a diary page with a taped photo and the
 * date in the corner, where they've lived a scrap of map with a pin and the place on a label strip, a ritual a habit tracker with its days ticked, and
 * random snapshots a pile of photos under a paperclip. This draws the part above the writing; the writing is `children` (Box), so everything a card
 * must do stays the same. The site and the dashboard's Size & look preview both draw with it.
 */
type ScrapEntry = { category: string; date_label: string; location: string; mood?: string; scrap?: ScrapInfo };

export type ScrapView = ReturnType<typeof scrapView>;

export function scrapView(it: ScrapEntry, c: { fallback: string; hideDate?: boolean }) {
  const s = it.scrap ?? EMPTY_SCRAP;
  const look = scrapLookOf(it.category, s.look);
  const date = c.hideDate ? "" : it.date_label.trim();
  const place = c.hideDate ? "" : it.location.trim();
  return {
    look,
    label: it.category || c.fallback,
    date,
    place: look === "lived" ? place : "",
    days: s.days,
    streak: streakOf(s.days),
    /** the washi tape takes the entry's Mood colour */
    tape: MOODS[it.mood ?? ""]?.color ?? "",
    /** what the page already says, so the writing below needn't */
    dateInArt: !!date && look !== "snaps",
    placeInArt: look === "lived" && !!place,
  };
}

const Tick = () => <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 11l4 4 8-10" /></svg>;
const Heart = () => <svg className="sb-doodle" viewBox="0 0 44 40" aria-hidden="true"><path d="M22 36C8 26 2 18 6 10c4-7 13-6 16 2 3-8 12-9 16-2 4 8-2 16-16 26Z" /></svg>;
const House = () => <svg className="sb-doodle" viewBox="0 0 40 36" aria-hidden="true"><path d="M4 18 20 4l16 14M8 15v18h24V15M17 33V23h6v10" /></svg>;
const Sun = () => <svg className="sb-doodle" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="7" /><path d="M20 3v6M20 31v6M3 20h6M31 20h6M8 8l4 4M28 28l4 4M32 8l-4 4M12 28l-4 4" /></svg>;
const Clip = () => <svg className="sb-clip" viewBox="0 0 20 56" aria-hidden="true"><path d="M6 20V8a5 5 0 0 1 10 0v34a7 7 0 0 1-14 0V14" /></svg>;

/** The pencil that travels along the bottom of the row. */
export const Pencil = () => (
  <svg viewBox="0 0 120 28" aria-hidden="true">
    <path d="M14 4h82v20H14z" fill="#ffc94a" stroke="var(--fg)" strokeWidth="2" />
    <path d="M96 4h12a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H96z" fill="#ff9ecb" stroke="var(--fg)" strokeWidth="2" />
    <path d="M14 4 1 14l13 10z" fill="#f4d3a1" stroke="var(--fg)" strokeWidth="2" strokeLinejoin="round" />
    <path d="M5 11 1 14l4 3z" fill="var(--fg)" />
    <path d="M14 11h82M14 17h82" stroke="#e0a92a" strokeWidth="1.5" />
  </svg>
);

export function ScrapFrame({ view: v, link, pics, zoom, fixedPic = false, children }:
  { view: ScrapView; link?: React.ReactNode; pics: React.ReactNode[]; zoom?: React.ReactNode; fixedPic?: boolean; children: React.ReactNode }) {
  const pic = pics[0];
  const ticked = SCRAP_DAYS.filter((_, i) => v.days.includes(i));
  return (
    <>
      <i className="sb-holes" aria-hidden="true" />
      <div className={`sb-art sb-${v.look}${pic ? " has-pic" : ""}${fixedPic ? " fixed" : ""}`}>
        {link}
        <span className="sb-lbl">{v.label}</span>

        {v.look === "diary" && (
          <>
            {v.date && <span className="sb-date">{v.date}</span>}
            {pic ? <div className="sb-photo-wrap"><div className="sb-photo">{pic}</div><i className="sb-tape" /><Heart /></div> : <Heart />}
          </>
        )}

        {v.look === "lived" && (
          <>
            <div className="sb-map">
              {pic && <div className="sb-snap">{pic}</div>}
              <i className="sb-pin" />
              {v.place && <span className="sb-lbl sb-place">{v.place}</span>}
              <i className="sb-tape" />
            </div>
            {v.date && <div className="sb-line"><span className="sb-when">{v.date}</span><House /></div>}
          </>
        )}

        {v.look === "ritual" && (
          <>
            {pic && <div className="sb-stk">{pic}</div>}
            {v.date && <span className="sb-when">{v.date}</span>}
            <div className="sb-hab" role="img" aria-label={ticked.length ? `Done on ${ticked.join(", ")}` : "No days ticked yet"}>
              {SCRAP_DAYS.map((d, i) => <span key={d} className={`sb-d${v.days.includes(i) ? " on" : ""}`} style={{ "--i": i } as React.CSSProperties}>{d.slice(0, 2)}<Tick /></span>)}
            </div>
            {ticked.length > 0 && <div className="sb-line"><span className="sb-streak">{v.streak >= 2 ? `${v.streak} days in a row` : `${ticked.length} of 7 days`}</span><Sun /></div>}
          </>
        )}

        {v.look === "snaps" && pics.length > 0 && (
          <div className={`sb-pile n${Math.min(pics.length, 3)}`}>
            {pics.slice(0, 3).map((p, i) => <div key={i} className={`sb-pp p${i}`}>{p}</div>)}
            <Clip />
          </div>
        )}
        {zoom}
      </div>
      {children}
    </>
  );
}

/** The end of a short row. It isn't an entry, so the row doesn't count it. */
export const ScrapMore = () => (
  <div className="sb-more" data-rider aria-hidden="true">
    <div className="sb-more-in"><span>More pages on the way</span></div>
  </div>
);
