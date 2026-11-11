import { awardFields, awardLookOf, EMPTY_AWARD, isCurrent, isNow, jobFromTitle, jobSpan, type AwardInfo } from "@/lib/awardItem";

/**
 * An achievement on the wall: the whole card looks like the thing itself, chosen by the dashboard's own words. Career is an RFID staff card, bright for a job
 * they still have and faded for one they've left. Certificates are a certificate, a win the front page of a newspaper, a heavy Mood a card mended in gold, and
 * the Hall of fame a star on the red carpet. The site and the dashboard's Size & look preview both draw with this. It draws the part above the writing, which
 * takes whatever the writing leaves, and takes the part that scrolls as `body`, so everything a card must do stays the same.
 */
const TITLE_LONG = 70; // a longer title is cut where the card shows it, and shown whole in the writing
const letters = (word: string) => Array.from(word).length;

type AwardEntry = { category: string; title: string; subtitle: string; status: string; date_label: string; mood?: string; award?: AwardInfo };

export type AwardView = ReturnType<typeof awardView>;

export function awardView(it: AwardEntry, c: { fallback: string; index: number; code?: string; hideSubtitle?: boolean; hideDate?: boolean; hasPic?: boolean; owner: string; nickname?: string; avatar?: string; initials?: string }) {
  const a = it.award ?? EMPTY_AWARD;
  const look = awardLookOf(it.category, it.mood ?? "", it.date_label, a);
  const isJob = look === "id" || look === "plate";
  const current = isCurrent(it.date_label, a);
  const job = jobFromTitle(it.title);
  const status = it.status.trim();
  const heading = isJob ? a.position || job.position || it.title : it.title;
  const order = Math.max(c.index, 0);
  return {
    look,
    title: it.title,
    heading,
    /** the position was typed and the title says something else, so the title still needs showing */
    titleToo: isJob && !!a.position && !it.title.toLowerCase().includes(a.position.toLowerCase()),
    company: isJob ? a.company || job.company : "",
    span: isJob ? jobSpan(a, look === "id") : "",
    no: `ID ${String(order + 1).padStart(4, "0")}${c.code ? ` · ${c.code}` : ""}`,
    issuer: a.issuer,
    issued: a.issued,
    // a certificate with no picture says these on its paper
    fields: awardFields(look, a).filter(([k]) => c.hasPic || look !== "cert" || (k !== "Issued by" && k !== "Issued")),
    long: heading.length > TITLE_LONG,
    /** a longer title gets smaller lettering on the front page */
    size: heading.length > 60 ? " s-long" : heading.length > 30 ? " s-mid" : "",
    /** how many letters are in the heading's longest word, which sets how big it can be without splitting a word */
    word: Math.max(1, ...heading.split(/\s+/).map(letters)),
    subtitle: c.hideSubtitle ? "" : it.subtitle,
    subsection: it.category || c.fallback,
    stamp: look === "id" ? status || (current ? "Now" : "") : "",
    dateline: c.hideDate ? "" : it.date_label,
    /** what the card itself already says, so the writing needn't */
    dateInArt: (look === "id" && !status && current && isNow(it.date_label)) || look === "medal" || look === "crack",
    statusInArt: look === "id" && !!status,
    paper: (c.nickname || c.owner).trim().split(/\s+/)[0] || "Daily",
    owner: c.owner,
    avatar: c.avatar ?? "",
    initials: c.initials || c.owner.slice(0, 1),
  };
}

const Waves = () => <svg className="arf-waves" viewBox="0 0 30 30" aria-hidden="true"><path d="M8 11a7 7 0 0 1 0 8" /><path d="M13 7a13 13 0 0 1 0 16" /><path d="M18 3a19 19 0 0 1 0 24" /></svg>;

const Chip = () => (
  <svg className="arf-chip" viewBox="0 0 44 34" aria-hidden="true">
    <rect x="1" y="1" width="42" height="32" rx="6" fill="var(--gold)" stroke="var(--on-parch)" strokeWidth="1.5" />
    <path d="M1 12h13M1 22h13M43 12H30M43 22H30M14 1v32M30 1v32M14 17h16" fill="none" stroke="var(--on-parch)" strokeWidth="1.3" />
  </svg>
);

const Seal = () => (
  <svg className="ace-seal" viewBox="0 0 62 78" aria-hidden="true">
    <path d="m18 44-8 32 21-11 21 11-8-32Z" fill="var(--pop2)" stroke="var(--on-parch)" strokeWidth="2" />
    <circle cx="31" cy="30" r="27" fill="var(--gold)" stroke="var(--on-parch)" strokeWidth="2.5" />
    <circle cx="31" cy="30" r="19" fill="none" stroke="var(--on-parch)" strokeWidth="1.5" strokeDasharray="3 3" />
    <path d="m31 18 3.6 7.4 8.1 1.1-5.9 5.7 1.4 8-7.2-3.8-7.2 3.8 1.4-8-5.9-5.7 8.1-1.1Z" fill="var(--parch)" />
  </svg>
);

const SEAL_STARS = [["-60px", "-50px"], ["40px", "-64px"], ["-80px", "6px"], ["-34px", "50px"], ["34px", "40px"]];
const FLASHES = [["16%", "22%"], ["84%", "30%"], ["24%", "70%"], ["78%", "74%"], ["50%", "14%"]];

const Cup = () => (
  <svg viewBox="0 0 124 138" aria-hidden="true">
    <path d="M30 16H10c0 22 8 32 24 34M94 16h20c0 22-8 32-24 34" fill="none" stroke="var(--on-parch)" strokeWidth="5" />
    <path d="M30 8h64v8c0 34-12 54-32 58-20-4-32-24-32-58Z" fill="var(--parch)" stroke="var(--on-parch)" strokeWidth="3" />
    <path d="M54 74h16v22H54ZM36 96h52l6 26H30Z" fill="var(--parch)" stroke="var(--on-parch)" strokeWidth="3" />
  </svg>
);

const Hanger = () => (
  <>
    <i className="aw-nail" aria-hidden="true" />
    <svg className="aw-wire" viewBox="0 0 130 31" aria-hidden="true"><path d="M2 31 65 2l63 29" /></svg>
  </>
);

export type AwardBody = (parts: {
  /** at the top of the writing: the whole title, when the card can't show it all */
  above?: React.ReactNode;
  showTitle: boolean;
  showSubtitle: boolean;
  /** the picture, when the card doesn't hold it */
  inBody?: React.ReactNode;
}) => React.ReactNode;

export function AwardFrame({ view: v, link, picture, back, body }: { view: AwardView; link?: React.ReactNode; picture?: React.ReactNode; /** a blurred copy of the picture, behind a staff card's photo */ back?: React.ReactNode; body: AwardBody }) {
  const isJob = v.look === "id" || v.look === "plate";
  return (
    <>
      {isJob ? <svg className="aw-lanyard" viewBox="0 0 84 56" aria-hidden="true"><path d="M4 0 42 52 80 0" /></svg> : <Hanger />}

      {isJob && (
        <div className="aw-art arf" style={{ "--tw": v.word } as React.CSSProperties}>
          {link}
          <div className="arf-face">
            <i className="arf-slot" aria-hidden="true" />
            <div className="arf-top"><b className="arf-co">{v.company || v.subsection}</b><Waves /></div>
            {/* the whole photo, never cut, over a blurred copy of itself that fills what its shape leaves */}
            <div className="arf-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <span className="arf-back" aria-hidden="true">{picture ? back : v.avatar ? <img className="arf-fill" src={v.avatar} alt="" loading="lazy" /> : null}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {picture ?? (v.avatar ? <img className="arf-own" src={v.avatar} alt="" loading="lazy" /> : <span className="arf-ini" aria-hidden="true">{v.initials}</span>)}
            </div>
            <div className="arf-who">
              <span className="aw-lab">Position</span>
              <h3>{v.heading}</h3>
              {v.span && <span className="arf-when">{v.span}</span>}
              {v.subtitle && <p className="sub">{v.subtitle}</p>}
            </div>
            <div className="arf-chips">
              <Chip />
              <i className="arf-rip" aria-hidden="true" /><i className="arf-rip b" aria-hidden="true" /><i className="arf-rip c" aria-hidden="true" />
              <span className="arf-no">{v.no}</span>
              <div className="arf-holo" aria-hidden="true"><i /></div>
            </div>
            {v.stamp && <span className="aw-stamp">{v.stamp}</span>}
          </div>
          <div className="arf-reader" aria-hidden="true">
            <i className="arf-led" />
            <div className="arf-say"><span className="scan">Scanning…</span><span className="done">{v.look === "id" ? "Access granted ✓" : "Badge retired. Well done."}</span></div>
            <i className="arf-beam" />
          </div>
        </div>
      )}

      {v.look === "cert" && (
        <div className="aw-art ace" style={{ "--tw": v.word, "--nw": v.owner.length } as React.CSSProperties}>
          {link}
          <div className="ace-paper">
            {picture ? (
              <>
                <div className="ace-photo">{picture}</div>
                <h3 className="ace-under">{v.heading}</h3>
              </>
            ) : (
              <>
                <i className="ace-burst" aria-hidden="true" />
                <span className="ace-big">Certificate</span>
                <span className="ace-sm">This certifies that</span>
                <span className="ace-name">{v.owner}</span>
                <span className="ace-sm">has earned</span>
                <h3>{v.heading}</h3>
                <div className="ace-sign">
                  <div><div className="ace-line"><svg viewBox="0 0 110 24" preserveAspectRatio="none" aria-hidden="true"><path d="M3 18c8-12 12-14 13-9s-5 12-3 12 8-14 12-13 1 9 5 8 5-9 9-8 0 7 4 7 6-8 11-8 2 6 6 6 7-5 13-4 11 1 23-2" /></svg><i /></div>{v.issuer ? `Issued by ${v.issuer}` : "Signed"}</div>
                  {v.issued && <div><div className="ace-line"><b>{v.issued}</b></div>Date</div>}
                </div>
              </>
            )}
          </div>
          <Seal />
          {SEAL_STARS.map(([x, y]) => <i key={x + y} className="ace-star" style={{ "--x": x, "--y": y } as React.CSSProperties} aria-hidden="true" />)}
        </div>
      )}

      {v.look === "medal" && (
        <div className={`aw-art anw${v.size}`} style={{ "--tw": v.word } as React.CSSProperties}>
          {link}
          <div className="anw-mast"><b>The {v.paper} Times</b><span><i>Special edition</i><i>{v.dateline || "Late edition"}</i></span></div>
          <span className="anw-extra">EXTRA! EXTRA!</span>
          <h3>{v.heading}</h3>
          <div className="anw-photo">{picture ?? <Cup />}</div>
          <span className="anw-stamp" aria-hidden="true">WINNER</span>
        </div>
      )}

      {v.look === "crack" && (
        <div className="aw-art akg" style={{ "--tw": v.word } as React.CSSProperties}>
          {link}
          {picture
            ? <div className="akg-pic">{picture}</div>
            : <><i className="akg-sh a" aria-hidden="true" /><i className="akg-sh b" aria-hidden="true" /><i className="akg-sh c" aria-hidden="true" /><i className="akg-sh d" aria-hidden="true" /></>}
          <svg className="akg-veins" viewBox="0 0 320 300" preserveAspectRatio="none" aria-hidden="true"><path className="glow" d="M120 0 150 60 190 130 250 105 320 90M190 130 215 200 230 300M190 130 100 165 0 190" vectorEffect="non-scaling-stroke" /><path d="M120 0 150 60 190 130 250 105 320 90M190 130 215 200 230 300M190 130 100 165 0 190" vectorEffect="non-scaling-stroke" /></svg>
          <div className="akg-words"><span className="aw-lab">{v.subsection}</span><h3>{v.heading}</h3>{v.dateline && <span className="akg-chip">{v.dateline}</span>}</div>
        </div>
      )}

      {v.look === "trophy" && (
        <div className="aw-art ast" style={{ "--tw": v.word } as React.CSSProperties}>
          {link}
          <i className="ast-bulbs" aria-hidden="true" /><i className="ast-bulbs two" aria-hidden="true" />
          <span className="aw-lab">★ {v.subsection} ★</span>
          <svg className="ast-star" viewBox="0 0 200 190" aria-hidden="true">
            <path d="m100 8 26 58 63 7-47 42 13 62-55-32-55 32 13-62-47-42 63-7Z" fill="var(--gold)" stroke="var(--parch)" strokeWidth="3" strokeLinejoin="round" />
            <path d="m100 42 15 34 37 4-28 25 8 36-32-19-32 19 8-36-28-25 37-4Z" fill="var(--carpet-lite)" stroke="var(--gold-deep)" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          <h3>{v.heading}</h3>
          {FLASHES.map(([left, top], i) => <i key={i} className="ast-flash" style={{ left, top, "--d": i } as React.CSSProperties} aria-hidden="true" />)}
          <i className="ast-white" aria-hidden="true" />
          <svg className="ast-rope" viewBox="0 0 320 26" preserveAspectRatio="none" aria-hidden="true"><path d="M0 4C60 28 100 28 160 8S260 -12 320 8" /></svg>
        </div>
      )}

      {body({
        above: v.long ? <h3 className="aw-whole">{v.heading}</h3> : undefined,
        showTitle: v.titleToo,
        showSubtitle: !isJob,
        inBody: v.look === "trophy" ? picture ?? undefined : undefined,
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
