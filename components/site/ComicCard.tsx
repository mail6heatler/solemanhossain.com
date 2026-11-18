import type { Item } from "@/lib/data";
import type { Look } from "@/lib/contentStyle";
import Markdown from "./Markdown";
import PollCard from "./PollCard";
import ComicPoll from "./ComicPoll";
import { ComicFrame, comicView, type ComicBody } from "./ComicFrame";
import { Box, CardLink, LinkButtons, Meta, partFn, type PartAttrs, type PartFn } from "./cardParts";

/**
 * One G5 entry: a comic panel, the one its subsection names (or the owner chose); a poll's panel also goes by its options (ComicFrame.tsx).
 * The homepage row draws it and so does the dashboard's live editor, which is why it's a file of its own. With `edit`, each part carries its
 * name (`data-part`) for the editor's labels, nothing on it leads anywhere, a poll stands still and the sky behind the row is left out.
 */
export default function ComicCard({ it, l, index, count, code, fallback, href, sky = false, vt, zoom, confetti = false, edit, foot }: {
  it: Item; l: Look; index: number; count: number; code: string; fallback: string; href: string;
  /** the sky behind the row (with the movement switch, not on a See all page) */ sky?: boolean;
  vt?: React.CSSProperties; zoom?: React.ReactNode; confetti?: boolean; edit?: boolean;
  /** the reaction bar, given the size and place of the bar and of the comment box */ foot?: (a: { bar: PartAttrs; talk: PartAttrs }) => React.ReactNode;
}) {
  const p: PartFn = partFn(edit, it.card.parts);
  const first = !l.hide("pic") ? it.media.find((m) => m.type !== "audio") : undefined;
  const v = comicView(it, { code, fallback, index, hideSubtitle: l.hide("subtitle"), hasPic: !!first });
  const poll = it.type !== "poll" ? null : v.look === "buttons"
    ? (edit
      ? <div className="poll" {...p("poll")}>{it.poll_options.map((o, i) => <button key={i} type="button" className="poll-opt" tabIndex={-1}><span className="lbl"><span>{o}</span></span></button>)}<div className="poll-foot">Tap an option to vote and see results</div></div>
      : <PollCard id={it.id} options={it.poll_options} confetti={confetti} />)
    : <ComicPoll id={it.id} options={it.poll_options} look={v.look as "scale" | "vs" | "quick" | "slash" | "quad"} word={v.word} confetti={confetti} still={edit} />;
  const says = v.subtitle ? <p className="sub" {...p("subtitle")}>{v.subtitle}</p> : null;
  const body: ComicBody = ({ above, withPoll }) => (
    <Box foot={foot?.({ bar: p("reacts"), talk: p("comments") })} to={edit ? undefined : href} label={it.title} fullAttrs={p("open")}
      full={edit ? <span className="full-view" role="button" {...p("open")}><span>Full view</span><i className="ti ti-arrow-right" aria-hidden /></span> : undefined}>
      {!edit && <CardLink to={href} label={it.title} />}
      <div className="tb">
        {above}
        {v.look !== "poem" && says}
        {withPoll && poll}
        {v.look === "poem"
          ? <div {...p("body")}>{v.verses.map((line, n) => <Markdown key={n} className="md ex cm-verse">{line}</Markdown>)}</div>
          : v.text.trim() && <div className="cm-box" {...p("body")}><Markdown className="md ex">{v.text}</Markdown></div>}
        {v.look === "poem" && says}
        <Meta it={v.look === "vibe" && v.mood ? { ...it, mood: "" } : it} showCat={false} hideDate={l.hide("date")} showStatus p={p} />
        <LinkButtons it={it} p={p} />
        {it.tags.length > 0 && !l.hide("tags") && <div className="tags" {...p("tags")}>{it.tags.map((t) => <span key={t}>{t}</span>)}</div>}
      </div>
    </Box>
  );
  return (
    <div className={`tkt-cell cm-cell${index === 0 ? " first" : ""}${index === count - 1 ? " last" : ""}${l.className}`} style={l.style}>
      {sky && !edit && <div className="cm-sky" aria-hidden />}
      <div className={`trip tkt cm${it.body.trim() ? " with-text" : ""}`} style={l.style}>
        <ComicFrame view={v} link={edit ? undefined : <a className="tkt-link" href={href} tabIndex={-1} aria-hidden />} first={first} fixedPic={"--pic" in (l.style ?? {})} picStyle={vt} zoom={first ? zoom : null} poll={poll} still={edit} body={body} p={p} />
      </div>
    </div>
  );
}
