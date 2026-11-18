import type { Item } from "@/lib/data";
import type { Look } from "@/lib/contentStyle";
import Markdown from "./Markdown";
import PollCard from "./PollCard";
import { Cover, MediaBadges } from "./Media";
import { ScrapFrame, scrapView } from "./ScrapFrame";
import { Box, CardLink, LinkButtons, Meta, partFn, type PartAttrs, type PartFn } from "./cardParts";

/**
 * One G7 entry: a page torn from a scrapbook, the one its subsection names (or the owner chose): a diary page, a scrap of map, a habit tracker or a pile
 * of photos (ScrapFrame.tsx). The homepage row draws it and so does the dashboard's live editor, which is why it's a file of its own. With `edit`, each
 * part carries its name (`data-part`) for the editor's labels, nothing on it leads anywhere and a poll stands still.
 */
export default function ScrapCard({ it, l, index, count, fallback, href, vt, zoom, confetti = false, edit, foot }: {
  it: Item; l: Look; index: number; count: number; fallback: string; href: string;
  vt?: React.CSSProperties; zoom?: React.ReactNode; confetti?: boolean; edit?: boolean;
  /** the reaction bar, given the size and place of the bar and of the comment box */ foot?: (a: { bar: PartAttrs; talk: PartAttrs }) => React.ReactNode;
}) {
  const p: PartFn = partFn(edit, it.card.parts);
  const v = scrapView(it, { fallback, hideDate: l.hide("date") });
  const media = l.hide("pic") ? [] : it.media.filter((m) => m.type !== "audio").slice(0, v.look === "snaps" ? 3 : 1);
  const pics = media.map((m, n) => <div key={n} className="ph has-pic"><Cover m={m} alt={n === 0 ? it.title : ""} style={n === 0 ? vt : undefined} />{n === 0 && <MediaBadges media={it.media} />}</div>);
  const style = v.tape ? ({ ...l.style, "--tape": v.tape } as React.CSSProperties) : l.style;
  const poll = edit
    ? <div className="poll" {...p("poll")}>{it.poll_options.map((o, i) => <button key={i} type="button" className="poll-opt" tabIndex={-1}><span className="lbl"><span>{o}</span></span></button>)}<div className="poll-foot">Tap an option to vote and see results</div></div>
    : <PollCard id={it.id} options={it.poll_options} confetti={confetti} />;
  return (
    <div className={`tkt-cell sb-cell${index === 0 ? " first" : ""}${index === count - 1 ? " last" : ""}${l.className}`} style={l.style}>
      <div className={`trip tkt sb on-${v.look}`} style={style}>
        <ScrapFrame view={v} link={edit ? undefined : <a className="tkt-link" href={href} tabIndex={-1} aria-hidden />} pics={pics} zoom={pics.length ? zoom : null} fixedPic={"--pic" in (l.style ?? {})} p={p}>
          <Box foot={foot?.({ bar: p("reacts"), talk: p("comments") })} to={edit ? undefined : href} label={it.title} fullAttrs={p("open")}
            full={edit ? <span className="full-view" role="button" {...p("open")}><span>Full view</span><i className="ti ti-arrow-right" aria-hidden /></span> : undefined}>
            {!edit && <CardLink to={href} label={it.title} />}
            <div className="tb">
              <h3 {...p("title")}>{it.title}</h3>
              {it.subtitle && !l.hide("subtitle") && <p className="sub" {...p("subtitle")}>{it.subtitle}</p>}
              {it.type === "poll" && poll}
              {it.body.trim() && <Markdown className="md ex" {...p("body")}>{it.body}</Markdown>}
              <Meta it={{ ...it, date_label: v.dateInArt ? "" : it.date_label, location: v.placeInArt ? "" : it.location }} showCat={false} hideDate={l.hide("date")} showStatus p={p} />
              <LinkButtons it={it} p={p} />
              {it.tags.length > 0 && !l.hide("tags") && <div className="tags" {...p("tags")}>{it.tags.map((t) => <span key={t}>{t}</span>)}</div>}
            </div>
          </Box>
        </ScrapFrame>
      </div>
    </div>
  );
}
