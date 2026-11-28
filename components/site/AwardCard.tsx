import type { Item } from "@/lib/data";
import type { Look } from "@/lib/contentStyle";
import Markdown from "./Markdown";
import PollCard from "./PollCard";
import { Cover, MediaBadges } from "./Media";
import { AwardFrame, awardView, type AwardBody } from "./AwardFrame";
import { Box, CardLink, LinkButtons, Meta, partFn, type PartAttrs, type PartFn } from "./cardParts";

/**
 * One G6 achievement on the wall: the whole card is the thing itself (AwardFrame.tsx): a staff card, a certificate, a front page, a card mended in
 * gold or a star on the red carpet. The homepage row draws it and so does the dashboard's live editor, which is why it's a file of its own.
 * A staff card's photo is the card's own (items.card.face), or the hero photo without one. With `edit`, each part carries its name (`data-part`)
 * for the editor's labels, nothing on it leads anywhere and a poll stands still.
 */
export default function AwardCard({ it, l, index, count, code, fallback, owner, href, vt, zoom, confetti = false, edit, foot, bar }: {
  it: Item; l: Look; index: number; count: number; code: string; fallback: string; href: string;
  /** who the certificates name, the paper's name and the hero photo, from the site's settings */ owner: { fullName: string; nickname: string; avatar: string; initials: string };
  vt?: React.CSSProperties; zoom?: React.ReactNode; confetti?: boolean; edit?: boolean;
  /** the reaction bar, given the size and place of the bar and of the comment box */ foot?: (a: { bar: PartAttrs; talk: PartAttrs }) => React.ReactNode;
  /** the sticker buttons (StickerBar.tsx), which bring their own Open button; given the card's part function, so each button and the strip can be sized */ bar?: (p: PartFn) => React.ReactNode;
}) {
  const p: PartFn = partFn(edit, it.card.parts);
  const first = !l.hide("pic") ? it.media.find((m) => m.type !== "audio") : undefined;
  const v = awardView(it, { fallback, index, code, hideSubtitle: l.hide("subtitle"), hideDate: l.hide("date"), hasPic: !!first, owner: owner.fullName, nickname: owner.nickname, avatar: it.card.face || owner.avatar, initials: owner.initials });
  const picture = first ? <div className="pic-box" {...p("pic")}><div className="ph has-pic"><Cover m={first} style={vt} /><MediaBadges media={it.media} /></div>{zoom}</div> : null;
  const poll = edit
    ? <div className="poll" {...p("poll")}>{it.poll_options.map((o, i) => <button key={i} type="button" className="poll-opt" tabIndex={-1}><span className="lbl"><span>{o}</span></span></button>)}<div className="poll-foot">Tap an option to vote and see results</div></div>
    : <PollCard id={it.id} options={it.poll_options} confetti={confetti} />;
  const body: AwardBody = ({ above, showTitle, showSubtitle, inBody }) => (
    <Box bare={l.hide("bar")} foot={bar ? bar(p) : foot?.({ bar: p("reacts"), talk: p("comments") })} footClass={bar ? "stb-foot" : undefined} to={edit || bar ? undefined : href} label={it.title} fullAttrs={p("open")}
      full={bar ? undefined : edit ? <span className="full-view" role="button" {...p("open")}><span>Full view</span><i className="ti ti-arrow-right" aria-hidden /></span> : undefined}>
      {!edit && <CardLink to={href} label={it.title} />}
      {inBody}
      <div className="tb">
        {above}
        {showTitle && <h3 {...p("title")}>{it.title}</h3>}
        {showSubtitle && v.subtitle && <p className="sub" {...p("subtitle")}>{v.subtitle}</p>}
        {v.fields.length > 0 && <dl className="tkt-fields" {...p("specs")}>{v.fields.map(([k, f]) => <div key={k}><dt>{k}</dt><dd>{f}</dd></div>)}</dl>}
        {it.type === "poll" && poll}
        {it.body.trim() && <Markdown className="md ex" {...p("body")}>{it.body}</Markdown>}
        <Meta it={{ ...it, date_label: v.dateInArt ? "" : it.date_label, status: v.statusInArt ? "" : it.status }} showCat={false} hideDate={l.hide("date")} showStatus p={p} />
        <LinkButtons it={it} p={p} />
        {it.tags.length > 0 && !l.hide("tags") && <div className="tags" {...p("tags")}>{it.tags.map((t) => <span key={t}>{t}</span>)}</div>}
      </div>
    </Box>
  );
  return (
    <div className={`tkt-cell aw-cell${index === 0 ? " first" : ""}${index === count - 1 ? " last" : ""}${l.className}`} style={l.style}>
      <div className={`trip tkt aw on-${v.look}`} style={l.style}>
        <AwardFrame view={v} link={edit ? undefined : <a className="tkt-link" href={href} tabIndex={-1} aria-hidden />} picture={picture} body={body} p={p}
          back={first && (first.type === "image" || (first.type === "pdf" && first.thumb)) ? <Cover m={first} className="arf-fill" /> : undefined} />
      </div>
    </div>
  );
}
