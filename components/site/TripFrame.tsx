import { isNextTrip, Vehicle, type VehicleKind } from "./vehicles";

/**
 * What a Boarding passes entry looks like, chosen by the dashboard's own words: the entry's Subsection picks its frame and its Status is
 * the stamp. The site and the dashboard's Size & look preview both draw frames with this, so the preview shows the real thing.
 */
export type FrameKind = "ticket" | "camera" | "bucket" | "polaroid" | "postcard";

/** Goes by the words in the subsection's name, so "My bucket" still gets the bucket. A new subsection gets the ticket unless its name says otherwise. */
export function frameFor(subsection: string): FrameKind {
  const s = subsection.toLowerCase();
  if (/\b(quests?|missions?|challenges?)\b/.test(s)) return "camera";
  if (/\b(buckets?|dreams?|wish(es)?|someday)\b/.test(s)) return "bucket";
  if (/\b(eyes?|photos?|snapshots?|lens)\b/.test(s)) return "polaroid";
  if (/\b(moments?|wander\w*|postcards?|memor(y|ies))\b/.test(s)) return "postcard";
  return "ticket";
}

/** The owner's Status; without one, the entry's words and date decide. Without a date, nothing claims a trip was made. */
export const stampFor = (it: { category: string; status: string; title: string; location: string; date_label: string }, frame: FrameKind) =>
  it.status || (isNextTrip(it) ? (frame === "bucket" ? "Dream place" : "Next destination") : it.date_label ? "Visited" : "");

export function TripFrame({ frame, subsection, no, home, title, date, kind, link, picture, drawn, body }: {
  frame: FrameKind;
  subsection: string;
  no: string;
  home: string;
  title: string;
  /** Empty when the date is hidden. */
  date: string;
  kind: VehicleKind;
  /** The entry's link over the parts that don't scroll. */
  link?: React.ReactNode;
  picture: React.ReactNode;
  /** `picture` is the drawn vehicle, not the owner's photo. */
  drawn: boolean;
  /** The part that scrolls: `above` goes at its top, and `showTitle` puts the title in its text when the frame doesn't show it. */
  body: (above: React.ReactNode, showTitle: boolean) => React.ReactNode;
}) {
  if (frame === "camera") return (
    <>
      <div className="cam-top">
        {link}
        <span className="cam-lens" aria-hidden />
        <span className="cam-name">{subsection}</span>
        <span className="tkt-no">{no}</span>
        <span className="cam-shutter" aria-hidden />
      </div>
      {body(picture && (
        <div className={`cam-screen${drawn ? " drawn" : ""}`}>
          {picture}
          <span className="cam-focus" aria-hidden />
          <span className="cam-rec" aria-hidden><i />REC</span>
          <span className="cam-shot" aria-hidden />
        </div>
      ), true)}
    </>
  );
  if (frame === "bucket") return (
    <>
      <span className="bkt-handle" aria-hidden><i /></span>
      <svg className="bkt-shape" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <path className="bkt-fill" d="M1 0H99L91 98.5Q90.8 100 89 100H11Q9.2 100 9 98.5Z" />
        <path className="bkt-shade" d="M92.5 0H99L91 98.5Q90.8 100 89 100H87.5Z" />
        <path className="bkt-base" d="M8.700 95H91.300L91 98.5Q90.800 100 89 100H11Q9.200 100 9 98.5Z" />
      </svg>
      <div className="bkt-top">
        {link}
        {picture && <div className={`bkt-photo${drawn ? " drawn" : ""}`}>{picture}</div>}
      </div>
      <span className="bkt-rim" aria-hidden />
      {body(null, true)}
    </>
  );
  if (frame === "polaroid") return (
    <>
      <span className="pol-tape" aria-hidden />
      {body(picture, true)}
    </>
  );
  if (frame === "postcard") return (
    <>
      <div className="pc-head">
        {link}
        <span className="pc-air" aria-hidden />
        <div className="pc-greet"><small>Greetings from</small><h3>{title}</h3></div>
        <span className="pc-stamp" aria-hidden><Vehicle kind={kind} /></span>
        {date && <span className="pc-mark" aria-hidden>{date}</span>}
      </div>
      {body(picture, false)}
    </>
  );
  return (
    <>
      <div className="tkt-head">
        {link}
        <div className="tkt-band"><span className="tkt-carrier">{subsection}</span><span className="tkt-no">{no}</span></div>
        <div className="tkt-route">
          <div className="tkt-end"><small>From</small><b>{home}</b></div>
          <div className="tkt-path" aria-hidden><Vehicle kind={kind} /></div>
          <div className="tkt-end to"><small>To</small><h3>{title}</h3></div>
        </div>
      </div>
      <div className="tkt-tear" aria-hidden />
      {body(picture, false)}
    </>
  );
}
