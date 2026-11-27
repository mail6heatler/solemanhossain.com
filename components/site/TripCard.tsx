import type { Item } from "@/lib/data";
import type { Look } from "@/lib/contentStyle";
import Markdown from "./Markdown";
import PollCard from "./PollCard";
import { Cover, MediaBadges } from "./Media";
import { isNextTrip, Vehicle, vehicleFor } from "./vehicles";
import { passView, TripFrame, type FrameBody, type tripContext } from "./TripFrame";
import { Box, CardLink, LinkButtons, Mood, partFn, type PartAttrs, type PartFn } from "./cardParts";

/**
 * One G3 trip: its cell on the route, and the frame its subsection names (or the owner chose): a boarding pass, a camera, a bucket-list note,
 * a polaroid or a postcard (TripFrame.tsx). The homepage row draws it and so does the dashboard's live editor, which is why it's a file of its own.
 * With `edit`, each part carries its name (`data-part`) for the editor's labels, nothing on it leads anywhere, a poll stands still and the route's
 * stop is left out.
 */
export default function TripCard({ it, l, index, count, trip, href, route = true, vt, zoom, confetti = false, edit, foot, bar }: {
  it: Item; l: Look; index: number; count: number; trip: ReturnType<typeof tripContext>; href: string;
  /** its stretch of the dashed route (not on a See all page) */ route?: boolean;
  vt?: React.CSSProperties; zoom?: React.ReactNode; confetti?: boolean; edit?: boolean;
  /** the reaction bar, given the size and place of the bar and of the comment box */ foot?: (a: { bar: PartAttrs; talk: PartAttrs }) => React.ReactNode;
  /** the sticker buttons (StickerBar.tsx), which bring their own Open button; given the card's part function, so each button and the strip can be sized */ bar?: (p: PartFn) => React.ReactNode;
}) {
  const p: PartFn = partFn(edit, it.card.parts);
  const pic = it.media[0] && !l.hide("pic");
  const next = isNextTrip(it);
  const view = passView(it, { ...trip, index, hideDate: l.hide("date") });
  const frame = view.frame;
  const picture = pic
    ? <div className="pic-box" {...p("pic")}><div className="ph has-pic"><Cover m={it.media[0]} style={vt} /><MediaBadges media={it.media} /></div>{zoom}</div>
    : !l.hide("pic") && !it.media[0] ? <div className="tkt-art" aria-hidden {...p("art")}><Vehicle kind={vehicleFor(it)} /></div> : null;
  const date = frame !== "ticket" && it.date_label && !l.hide("date"); // a pass shows its date at the top
  const place = it.location && !l.hide("date");
  const poll = edit
    ? <div className="poll" {...p("poll")}>{it.poll_options.map((o, i) => <button key={i} type="button" className="poll-opt" tabIndex={-1}><span className="lbl"><span>{o}</span></span></button>)}<div className="poll-foot">Tap an option to vote and see results</div></div>
    : <PollCard id={it.id} options={it.poll_options} confetti={confetti} />;
  const body: FrameBody = ({ above, showTitle, inText, list, stub }) => (
    <Box foot={bar ? bar(p) : foot?.({ bar: p("reacts"), talk: p("comments") })} footClass={bar ? "stb-foot" : undefined} to={edit || bar ? undefined : href} label={it.title} stub={stub} fullAttrs={p("open")}
      full={bar ? undefined : edit ? <span className="full-view" role="button" {...p("open")}><span>Full view</span><i className="ti ti-arrow-right" aria-hidden /></span> : undefined}>
      {!edit && <CardLink to={href} label={it.title} />}
      {above}
      <div className="tb">
        {showTitle && <h3 {...p("title")}>{it.title}</h3>}
        {inText}
        {it.subtitle && !l.hide("subtitle") && <p className="sub" {...p("subtitle")}>{it.subtitle}</p>}
        {(date || place || it.mood) && (
          <dl className="tkt-fields">
            {date && <div {...p("date")}><dt>Date</dt><dd>{it.date_label}</dd></div>}
            {place && <div {...p("place")}><dt>Place</dt><dd>{it.location}</dd></div>}
            {it.mood && <div {...p("mood")}><dt>Mood</dt><dd><Mood mood={it.mood} /></dd></div>}
          </dl>
        )}
        {list}
        {it.type === "poll" ? poll : <Markdown className="md ex" {...p("body")}>{it.body}</Markdown>}
        <LinkButtons it={it} p={p} />
        {it.tags.length > 0 && !l.hide("tags") && <div className="tags" {...p("tags")}>{it.tags.map((t) => <span key={t}>{t}</span>)}</div>}
      </div>
    </Box>
  );
  return (
    <div className={`tkt-cell${index === 0 ? " first" : ""}${index === count - 1 ? " last" : ""}${next ? " next" : ""}${!picture && view.stamp ? " tkt-nopic" : ""}${l.className}`} style={l.style}>
      {route && !edit && <div className="tkt-stop" aria-hidden><i /></div>}
      {/* the size and look settings go here too, because a frame's own picture size would otherwise win over the owner's */}
      <div className={`trip tkt fr-${frame}${view.report || view.depart || view.journey ? " timed" : ""}${it.body.trim() ? " with-text" : ""}`} style={l.style}>
        <TripFrame view={view} link={edit ? undefined : <a className="tkt-link" href={href} tabIndex={-1} aria-hidden />} picture={picture} drawn={!pic} body={body} p={p} />
      </div>
    </div>
  );
}
