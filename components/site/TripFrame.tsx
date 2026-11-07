import { EMPTY_PASS, TRIP_VEHICLES, type TickLine, type TripPass } from "@/lib/tripPass";
import { isNextTrip, Vehicle, vehicleFor } from "./vehicles";

/**
 * What a Boarding passes entry looks like, chosen by the dashboard's own words: the entry's Subsection picks its frame, its Status is the
 * stamp, and its boarding-pass fields are what the pass says. The site, the entry's page and the dashboard's Size & look preview all draw
 * with these, so the preview shows the real thing.
 */
export type FrameKind = "ticket" | "camera" | "bucket" | "polaroid" | "postcard";

/** Goes by the words in the subsection's name, so "My bucket" still gets the bucket list's note. A new subsection gets the ticket unless its name says otherwise. */
export function frameFor(subsection: string): FrameKind {
  const s = subsection.toLowerCase();
  if (/\b(quests?|missions?|challenges?)\b/.test(s)) return "camera";
  if (/\b(buckets?|dreams?|wish(es)?|someday)\b/.test(s)) return "bucket";
  if (/\b(eyes?|photos?|snapshots?|lens)\b/.test(s)) return "polaroid";
  if (/\b(moments?|wander\w*|postcards?|memor(y|ies))\b/.test(s)) return "postcard";
  return "ticket";
}

/** The start of a place's name in capitals, skipping little words. Empty for a name in a script without capitals, which then shows on its own. */
export function codeFor(name: string) {
  const word = name.normalize("NFKD").split(/[\s,]+/).find((w) => w && !/^(the|a|an|my|to)$/i.test(w)) ?? "";
  const letters = word.replace(/[^A-Za-z]/g, "");
  return letters.length >= 2 ? letters.slice(0, 3).toUpperCase() : "";
}

type TripEntry = { category: string; status: string; title: string; subtitle: string; location: string; date_label: string; tags: string[]; pass: TripPass };

/** The owner's Status; without one, the entry's words and date decide. Without a date, nothing claims a trip was made. */
export const stampFor = (it: TripEntry, frame: FrameKind) =>
  it.status || (isNextTrip(it) ? (frame === "bucket" ? "Dream place" : "Next destination") : it.date_label ? "Visited" : "");

/** What these frames need from the site's settings and the entry's section. */
export const tripContext = (settings: { location: string; fullName: string; nickname: string }, section?: { code: string; nav_label: string; title: string } | null) => ({
  home: settings.location.split(",")[0].trim() || "Home",
  passenger: settings.fullName || settings.nickname,
  code: section?.code || "TR",
  fallback: section?.nav_label || section?.title || "",
});

export type PassView = ReturnType<typeof passView>;

/** Everything the frames show for one entry. Each field on a pass is what the owner typed, or otherwise what can be worked out. */
export function passView(it: TripEntry, c: ReturnType<typeof tripContext> & { index: number; hideDate?: boolean }) {
  const p = it.pass ?? EMPTY_PASS;
  const frame = frameFor(it.category);
  const kind = vehicleFor(it);
  const order = String(Math.max(c.index, 0) + 1).padStart(2, "0");
  const no = `${c.code}-${order}`;
  const from = p.from || c.home;
  const to = p.to || it.title;
  const date = c.hideDate ? "" : it.date_label;
  return {
    frame, kind, no, title: it.title,
    subsection: it.category || c.fallback,
    stamp: stampFor(it, frame),
    /** Status says it's been done, which ticks a note's box */
    done: /\b(done|visited|completed?|achieved|ticked)\b/i.test(it.status),
    ticks: p.ticks,
    date,
    name: p.name || TRIP_VEHICLES.find(([v]) => v === kind)?.[2] || "Boarding pass",
    from, fromCode: p.fromCode || codeFor(from),
    to, toCode: p.toCode || codeFor(p.to || it.location || it.title),
    /** the route shows the entry's own title, so the text below it doesn't repeat it */
    toIsTitle: !p.to || p.to.toLowerCase() === it.title.trim().toLowerCase(),
    passenger: p.passenger || c.passenger,
    numberLabel: kind === "plane" ? "Flight" : "Trip",
    number: p.flight || no,
    passDate: c.hideDate ? "" : it.date_label || "Open",
    seat: p.seat || `${order}A`,
    report: p.report, depart: p.depart, journey: p.journey,
    /** where its barcode starts, so each pass has its own */
    bars: (Math.max(c.index, 0) * 37 + 11) % 97,
  };
}

/** The top of a boarding pass: coloured band, big codes, and the details. */
export function PassHead({ view: v, link }: { view: PassView; link?: React.ReactNode }) {
  const times = ([["Reporting", v.report], ["Departure", v.depart], ["Journey", v.journey]] as const).filter(([, t]) => t);
  return (
    <div className="tkt-head">
      {link}
      <div className="tkt-band">
        <span className="tkt-carrier"><Vehicle kind={v.kind} className="tkt-ink" /><span>{v.subsection}</span></span>
        <span className="tkt-kind">{v.name}</span>
      </div>
      <div className="tkt-route">
        <div className={`tkt-end${v.fromCode ? "" : " nocode"}`}>{v.fromCode && <b>{v.fromCode}</b>}<span>{v.from}</span></div>
        <div className="tkt-path" aria-hidden><Vehicle kind={v.kind} /></div>
        <div className={`tkt-end to${v.toCode ? "" : " nocode"}`}>{v.toCode && <b>{v.toCode}</b>}{v.toIsTitle ? <h3>{v.to}</h3> : <span>{v.to}</span>}</div>
      </div>
      <dl className="tkt-grid">
        <div><dt>Passenger</dt><dd>{v.passenger}</dd></div>
        <div><dt>{v.numberLabel}</dt><dd className="m">{v.number}</dd></div>
        {v.passDate && <div><dt>Date</dt><dd>{v.passDate}</dd></div>}
        <div><dt>Seat</dt><dd className="m">{v.seat}</dd></div>
      </dl>
      {times.length > 0 && <dl className="tkt-grid tkt-times">{times.map(([label, time]) => <div key={label}><dt>{label}</dt><dd>{time}</dd></div>)}</dl>}
    </div>
  );
}

/** The bottom of a boarding pass: the tear line with a punched cut at each side, and the stub with its barcode. */
export function PassStub({ view: v, link }: { view: PassView; link?: React.ReactNode }) {
  return (
    <>
      <div className="tkt-tear" aria-hidden />
      <div className="tkt-stub">
        {link}
        <i className="tkt-bars" style={{ "--bx": `${v.bars}px` } as React.CSSProperties} aria-hidden />
        <i className="tkt-scan" aria-hidden />
        <small aria-hidden>{[v.number, [v.fromCode, v.toCode].filter(Boolean).join("-"), v.seat].filter(Boolean).join(" · ")}</small>
      </div>
    </>
  );
}

/** A whole pass by itself, at the top of the entry's own page. */
export const PassCard = ({ view }: { view: PassView }) => (
  <div className="trip tkt fr-ticket entry-pass"><PassHead view={view} /><PassStub view={view} /></div>
);

const Box = ({ on }: { on: boolean }) => (
  <span className={`bkl-box${on ? " on" : ""}`} role="img" aria-label={on ? "Done" : "Not yet"}>
    {on && <svg viewBox="0 0 27 27" aria-hidden><path d="M3 15 10 23 24 3" /></svg>}
  </span>
);

export function TickList({ ticks }: { ticks: TickLine[] }) {
  if (!ticks.length) return null;
  return <ul className="bkl-ticks">{ticks.map((t, i) => <li key={i}><Box on={t.done} /><span>{t.text}</span></li>)}</ul>;
}

/** A little original bucket. The handle is its own layer, because only a whole <svg> moves without redrawing. */
const Pail = () => (
  <span className="bkl-pail" aria-hidden>
    <span className="bkl-handle"><svg viewBox="0 0 80 86"><path d="M13 36C13 2 67 2 67 36" /></svg></span>
    <svg viewBox="0 0 80 86">
      <rect className="bkl-paper" x="33" y="9" width="20" height="30" rx="2" transform="rotate(8 43 24)" />
      <path className="bkl-line" d="M38 15l11 1.5M37.5 20l11 1.5" />
      <path className="v-c" d="M11 37H69L62 81Q61.4 85 57 85H23Q18.6 85 18 81Z" />
      <path className="bkl-shade" d="M57 37H69L62 81Q61.4 85 57 85H50Z" />
      <rect className="bkl-rim" x="7" y="32" width="66" height="8" rx="4" />
      <path className="bkl-mark" d="M28 60 37 70 54 49" />
    </svg>
  </span>
);

export type FrameBody = (parts: {
  /** at the top of the part that scrolls */
  above?: React.ReactNode;
  /** the title goes in the text, when the frame doesn't show it */
  showTitle?: boolean;
  /** first in the text */
  inText?: React.ReactNode;
  /** after the details, before the story */
  list?: React.ReactNode;
  /** between the part that scrolls and the reactions */
  stub?: React.ReactNode;
}) => React.ReactNode;

export function TripFrame({ view: v, link, picture, drawn, body }: {
  view: PassView;
  /** The entry's link over the parts that don't scroll. */
  link?: React.ReactNode;
  picture: React.ReactNode;
  /** `picture` is the drawn vehicle, not the owner's photo. */
  drawn: boolean;
  body: FrameBody;
}) {
  const stamp = v.stamp ? <span className="tkt-stamp">{v.stamp}</span> : null;
  if (v.frame === "camera") return (
    <>
      <div className="cam-top">
        {link}
        <span className="cam-lens" aria-hidden />
        <span className="cam-name">{v.subsection}</span>
        <span className="tkt-no">{v.no}</span>
        <span className="cam-shutter" aria-hidden />
      </div>
      {body({
        showTitle: true,
        above: picture && (
          <div className={`cam-screen${drawn ? " drawn" : ""}`}>
            {picture}
            <span className="cam-focus" aria-hidden />
            <span className="cam-rec" aria-hidden><i />REC</span>
            <span className="cam-shot" aria-hidden />
          </div>
        ),
      })}
      {stamp}
    </>
  );
  if (v.frame === "bucket") return (
    <>
      <span className="bkl-margin" aria-hidden />
      <span className="bkl-rings" aria-hidden />
      <Pail />
      <div className="bkl-head">
        {link}
        <div className="bkl-sub"><span>{v.subsection}</span><span className="tkt-no">{v.no}</span></div>
        <div className="bkl-title"><Box on={v.done} /><h3>{v.title}</h3></div>
      </div>
      {body({
        above: picture && !drawn ? <div className="bkl-photo"><span className="bkl-tape" aria-hidden />{picture}</div> : null,
        inText: stamp && <p className="bkl-stamp">{stamp}</p>,
        list: <TickList ticks={v.ticks} />,
      })}
    </>
  );
  if (v.frame === "polaroid") return (
    <>
      <span className="pol-tape" aria-hidden />
      {body({ above: picture, showTitle: true })}
      {stamp}
    </>
  );
  if (v.frame === "postcard") return (
    <>
      <div className="pc-head">
        {link}
        <span className="pc-air" aria-hidden />
        <div className="pc-greet"><small>Greetings from</small><h3>{v.title}</h3></div>
        <span className="pc-stamp" aria-hidden><Vehicle kind={v.kind} /></span>
        {v.date && <span className="pc-mark" aria-hidden>{v.date}</span>}
      </div>
      {body({ above: picture })}
      {stamp}
    </>
  );
  return (
    <>
      <PassHead view={v} link={link} />
      {body({ above: <>{picture}{stamp}</>, showTitle: !v.toIsTitle, stub: <PassStub view={v} link={link} /> })}
    </>
  );
}
