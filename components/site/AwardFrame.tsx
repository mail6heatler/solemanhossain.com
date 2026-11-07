import { awardLookOf, EMPTY_AWARD, isNow, type AwardInfo } from "@/lib/awardItem";

/**
 * An achievement on the wall, chosen by the dashboard's own words: the Subsection picks the object, a Date saying Now makes a job a staff ID, and a
 * heavy Mood cracks the frame. The site and the dashboard's Size & look preview both draw with this. It draws what's above the writing and takes the
 * part that scrolls as `body`, so everything a card must do stays the same.
 */
const TITLE_LONG = 70; // a longer title is cut where the object shows it, and shown whole in the writing
const RIBBONS = ["var(--pop2)", "var(--pop3)", "var(--mint)"];
const letters = (word: string) => Array.from(word).length;

type AwardEntry = { category: string; title: string; subtitle: string; status: string; date_label: string; mood?: string; award?: AwardInfo };

export type AwardView = ReturnType<typeof awardView>;

export function awardView(it: AwardEntry, c: { fallback: string; index: number; hideSubtitle?: boolean; owner: string; avatar?: string; initials?: string }) {
  const look = awardLookOf(it.category, it.mood ?? "", it.date_label, (it.award ?? EMPTY_AWARD).look);
  const status = it.status.trim();
  const fromDate = look === "id" && !status && isNow(it.date_label);
  return {
    look,
    title: it.title,
    long: it.title.length > TITLE_LONG,
    /** how many letters are in the title's longest word, which sets how big it can be without splitting a word */
    word: Math.max(1, ...it.title.split(/\s+/).map(letters)),
    subtitle: c.hideSubtitle ? "" : it.subtitle,
    subsection: it.category || c.fallback,
    stamp: look === "id" ? status || (fromDate ? "Now" : "") : "",
    /** what the stamp already says, so the rest of the card needn't */
    stampIsDate: fromDate,
    stampIsStatus: look === "id" && !!status,
    ribbon: RIBBONS[Math.max(c.index, 0) % RIBBONS.length],
    owner: c.owner,
    avatar: c.avatar ?? "",
    initials: c.initials || c.owner.slice(0, 1),
  };
}

const Cup = () => (
  <svg className="aw-cup" viewBox="0 0 124 138" aria-hidden="true">
    <path d="M30 16H10c0 22 8 32 24 34M94 16h20c0 22-8 32-24 34" fill="none" stroke="var(--fg)" strokeWidth="5" />
    <path d="M30 8h64v8c0 34-12 54-32 58-20-4-32-24-32-58Z" fill="var(--gold)" stroke="var(--fg)" strokeWidth="3" />
    <path d="M54 74h16v22H54Z" fill="var(--gold-deep)" stroke="var(--fg)" strokeWidth="3" />
    <path d="M36 96h52l6 26H30Z" fill="var(--wood)" stroke="var(--fg)" strokeWidth="3" />
    <path d="m62 26 4.5 9.5L77 37l-7.5 7 2 10.5-9.5-5-9.5 5 2-10.5-7.5-7 10.5-1.5Z" fill="var(--parch)" />
  </svg>
);

const Seal = () => (
  <svg className="aw-seal" viewBox="0 0 62 78" aria-hidden="true">
    <path d="m18 44-8 32 21-11 21 11-8-32Z" fill="var(--pop2)" stroke="var(--fg)" strokeWidth="2" />
    <circle cx="31" cy="30" r="27" fill="var(--gold)" stroke="var(--fg)" strokeWidth="2.5" />
    <circle cx="31" cy="30" r="19" fill="none" stroke="var(--fg)" strokeWidth="1.5" strokeDasharray="3 3" />
    <path d="m31 18 3.6 7.4 8.1 1.1-5.9 5.7 1.4 8-7.2-3.8-7.2 3.8 1.4-8-5.9-5.7 8.1-1.1Z" fill="var(--parch)" />
  </svg>
);

const Medal = ({ ribbon }: { ribbon: string }) => (
  <svg className="aw-medal" viewBox="0 0 120 150" aria-hidden="true">
    <path d="M26 0h26l14 56-20 8ZM94 0H68L54 56l20 8Z" fill={ribbon} stroke="var(--fg)" strokeWidth="2.5" strokeLinejoin="round" />
    <circle cx="60" cy="102" r="44" fill="var(--gold)" stroke="var(--fg)" strokeWidth="3" />
    <circle cx="60" cy="102" r="33" fill="none" stroke="var(--fg)" strokeWidth="1.5" strokeDasharray="4 4" />
    <path d="m60 80 6.8 14 15.2 2-11 10.6 2.6 15.2L60 114.6l-13.6 7.2 2.6-15.2-11-10.6 15.2-2Z" fill="var(--parch)" />
  </svg>
);

const Hanger = () => (
  <>
    <i className="aw-nail" aria-hidden="true" />
    <svg className="aw-wire" viewBox="0 0 130 31" aria-hidden="true"><path d="M2 31 65 2l63 29" /></svg>
  </>
);

export type AwardBody = (parts: {
  /** at the top of the writing: the whole title, when the object can't show it all */
  above?: React.ReactNode;
  showTitle: boolean;
  showSubtitle: boolean;
  /** the picture, when the object doesn't hold it */
  inBody?: React.ReactNode;
}) => React.ReactNode;

export function AwardFrame({ view: v, link, picture, body }: { view: AwardView; link?: React.ReactNode; picture?: React.ReactNode; body: AwardBody }) {
  const titled = v.look === "id" || v.look === "plate" || v.look === "crack"; // the object itself says the title
  const holdsPicture = v.look === "cert" || v.look === "id" || v.look === "crack";
  return (
    <>
      {v.look === "id" && <svg className="aw-lanyard" viewBox="0 0 84 56" aria-hidden="true"><path d="M4 0 42 52 80 0" /></svg>}
      {v.look !== "id" && v.look !== "trophy" && <Hanger />}
      <div className={`aw-art aw-a-${v.look}`} style={{ "--tw": v.word } as React.CSSProperties}>
        {link}
        {v.look === "trophy" && (
          <>
            <Cup />
            <i className="aw-spark a" aria-hidden="true" /><i className="aw-spark b" aria-hidden="true" /><i className="aw-spark c" aria-hidden="true" />
            <i className="aw-gleam" aria-hidden="true" />
            <div className="aw-shelf" aria-hidden="true" />
          </>
        )}
        {v.look === "cert" && (
          <>
            <div className="aw-paper">
              {picture ?? <div className="aw-blank"><b>Certificate</b><span>awarded to</span><em>{v.owner}</em></div>}
            </div>
            <Seal />
          </>
        )}
        {v.look === "id" && (
          <>
            <div className="aw-band"><i className="aw-clip" aria-hidden="true" /><span>{v.subsection}</span></div>
            <div className="aw-idrow">
              <div className="aw-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {picture ?? (v.avatar ? <img src={v.avatar} alt="" loading="lazy" /> : <span aria-hidden="true">{v.initials}</span>)}
              </div>
              <div className="aw-idtext"><h3>{v.title}</h3>{v.subtitle && <p className="sub">{v.subtitle}</p>}</div>
            </div>
            {v.stamp && <span className="aw-stamp">{v.stamp}</span>}
            <div className="aw-bars" aria-hidden="true" />
          </>
        )}
        {v.look === "plate" && (
          <>
            <i className="aw-screw l" aria-hidden="true" /><i className="aw-screw r" aria-hidden="true" />
            <span className="aw-sub">{v.subsection}</span>
            <h3>{v.title}</h3>
            <i className="aw-gleam" aria-hidden="true" />
          </>
        )}
        {v.look === "medal" && <Medal ribbon={v.ribbon} />}
        {v.look === "crack" && (
          <>
            <div className="aw-glass">
              {picture}
              <span className="aw-sub">{v.subsection}</span>
              <h3>{v.title}</h3>
              <svg className="aw-cracks" viewBox="0 0 300 180" preserveAspectRatio="none" aria-hidden="true"><path d="M190 60 300 10M190 60l60 120M190 60 90 0M190 60 40 180M190 60 300 110M140 34l-30 60M238 86l-52 30" vectorEffect="non-scaling-stroke" /></svg>
            </div>
            <i className="aw-tape" aria-hidden="true" />
          </>
        )}
      </div>
      {body({
        above: titled && v.long ? <h3 className="aw-whole">{v.title}</h3> : undefined,
        showTitle: !titled,
        showSubtitle: v.look !== "id",
        inBody: holdsPicture ? undefined : picture ?? undefined,
      })}
    </>
  );
}

/** The end of a short row. It isn't an entry, so the row doesn't count it. */
export const AwardMore = () => (
  <div className="aw-more" data-rider aria-hidden="true">
    <div className="aw-more-in"><Hanger /><span>More on the way</span></div>
  </div>
);
