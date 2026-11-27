import type { Item } from "@/lib/data";
import type { Look } from "@/lib/contentStyle";
import Markdown from "./Markdown";
import PollCard from "./PollCard";
import TvPlay from "./TvPlay";
import { Cover, MediaBadges } from "./Media";
import { StudyFrame, studyView, type StudyBody } from "./StudyFrame";
import { Box, CardLink, LinkButtons, Mood, partFn, type PartAttrs, type PartFn } from "./cardParts";
import FullView from "./FullView";

/**
 * One G4 entry on the study shelf: its cell, standing on a plank, and the object its subsection names (or the owner chose): a book, a TV player,
 * a framed portrait, a phone or a note (StudyFrame.tsx). The homepage row draws it and so does the dashboard's live editor, which is why it's a
 * file of its own. With `edit`, each part carries its name (`data-part`) for the editor's labels, nothing on it leads anywhere, a poll stands
 * still and the lamp's rail is left out.
 */
export default function StudyCard({ it, l, index, count, code, fallback, href, rail = true, vt, zoom, confetti = false, edit, foot }: {
  it: Item; l: Look; index: number; count: number; code: string; fallback: string; href: string;
  /** the rail the lamp runs along (not on a See all page) */ rail?: boolean;
  vt?: React.CSSProperties; zoom?: React.ReactNode; confetti?: boolean; edit?: boolean;
  /** the reaction bar, given the size and place of the bar and of the comment box */ foot?: (a: { bar: PartAttrs; talk: PartAttrs }) => React.ReactNode;
}) {
  const p: PartFn = partFn(edit, it.card.parts);
  const v = studyView(it, { code, fallback, index, hideSubtitle: l.hide("subtitle") });
  const first = !l.hide("pic") ? it.media.find((m) => m.type !== "audio") : undefined;
  const sound = it.media.find((m) => m.type === "audio");
  const movie = first?.type === "video" && v.media === "video";
  const out = it.links.find((x) => /^https?:/.test(x.url));
  const picture = first ? <div className="pic-box" {...p("pic")}><div className="ph has-pic"><Cover m={first} style={vt} /><MediaBadges media={it.media} /></div>{zoom}</div> : null;
  const date = it.date_label && !l.hide("date");
  const place = it.location && !l.hide("date");
  const poll = edit
    ? <div className="poll" {...p("poll")}>{it.poll_options.map((o, i) => <button key={i} type="button" className="poll-opt" tabIndex={-1}><span className="lbl"><span>{o}</span></span></button>)}<div className="poll-foot">Tap an option to vote and see results</div></div>
    : <PollCard id={it.id} options={it.poll_options} confetti={confetti} />;
  const body: StudyBody = ({ above, showTitle }) => (
    <Box foot={foot?.({ bar: p("reacts"), talk: p("comments") })} to={edit ? undefined : href} label={it.title} fullAttrs={p("open")}
      full={edit ? <FullView label={it.title} attrs={p("open")} /> : undefined}>
      {!edit && <CardLink to={href} label={it.title} />}
      {above}
      <div className="tb">
        {showTitle && <h3 {...p("title")}>{it.title}</h3>}
        {showTitle && v.subtitle && <p className="sub" {...p("subtitle")}>{v.subtitle}</p>}
        {v.line && <p className="sty-line" {...p("line")}><span>{v.line}</span></p>}
        {(date || place || it.mood) && (
          <dl className="tkt-fields">
            {date && <div {...p("date")}><dt>Date</dt><dd>{it.date_label}</dd></div>}
            {place && <div {...p("place")}><dt>Place</dt><dd>{it.location}</dd></div>}
            {it.mood && <div {...p("mood")}><dt>Mood</dt><dd><Mood mood={it.mood} /></dd></div>}
          </dl>
        )}
        {it.type === "poll" ? poll : <Markdown className="md ex" {...p("body")}>{it.body}</Markdown>}
        <LinkButtons it={it} p={p} />
        {it.tags.length > 0 && !l.hide("tags") && <div className="tags" {...p("tags")}>{it.tags.map((t) => <span key={t}>{t}</span>)}</div>}
      </div>
    </Box>
  );
  return (
    <div className={`tkt-cell sty-cell${index === 0 ? " first" : ""}${index === count - 1 ? " last" : ""}${l.className}`} style={l.style}>
      {rail && !edit && <div className="sty-rail" aria-hidden />}
      <div className={`trip tkt st-${v.look}${it.body.trim() || v.line ? " with-text" : ""}`} style={l.style}>
        <StudyFrame view={v} link={edit ? undefined : <a className="tkt-link" href={href} tabIndex={-1} aria-hidden />} picture={picture} first={first} zoom={first ? zoom : null} canPlay={!!sound || movie}
          play={<TvPlay audio={movie ? undefined : sound?.url} video={movie} href={edit ? undefined : out?.url} title={it.title} />} body={body} p={p} />
      </div>
      <div className="sty-plank" aria-hidden />
    </div>
  );
}
