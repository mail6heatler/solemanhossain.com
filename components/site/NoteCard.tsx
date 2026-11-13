import type { Item } from "@/lib/data";
import { MOODS } from "@/lib/settings";
import { noteLookOf } from "@/lib/cardLook";
import type { Look } from "@/lib/contentStyle";
import Markdown from "./Markdown";
import PollCard from "./PollCard";
import { Cover, MediaBadges } from "./Media";
import { Box, CardLink, LinkButtons, Meta, partFn, type PartFn } from "./cardParts";

/**
 * One G1 note: the card its subsection names (lib/cardLook.ts): an instruction manual, a protest sign, a story, a collectible card, or the plain note.
 * The homepage row draws it and so does the dashboard's editor, which is why it's a file of its own. With `edit`, each part carries its name
 * (`data-part`) for the editor's labels, nothing on it leads anywhere, and a poll stands still.
 */
export default function NoteCard({ it, l, index, factNo, foot, href, owner, face, vt, zoom, confetti = false, edit, full }: {
  it: Item; l: Look; index: number; factNo: number; foot?: React.ReactNode; href: string; owner: string; face: React.ReactNode;
  vt?: React.CSSProperties; zoom?: React.ReactNode; confetti?: boolean; edit?: boolean; full?: React.ReactNode;
}) {
  const p: PartFn = partFn(edit, it.card.parts);
  const look = noteLookOf(it.category, it.card.look);
  const m = l.hide("pic") ? undefined : it.media.find((x) => x.type !== "audio");
  const pics = it.media.filter((x) => x.type !== "audio").length;
  const mood = MOODS[it.mood];
  const date = l.hide("date") ? "" : it.date_label, place = l.hide("date") ? "" : it.location;
  const picBox = m ? <div className="pic-box" {...p("pic")}><Cover m={m} className="note-media" style={vt} />{m.type === "pdf" && <MediaBadges media={[m]} />}{zoom}</div> : null;
  const sub = it.subtitle && !l.hide("subtitle") ? <p className="sub" {...p("subtitle")}>{it.subtitle}</p> : null;
  const poll = edit
    ? <div className="poll" {...p("poll")}>{it.poll_options.map((o, i) => <button key={i} type="button" className="poll-opt" tabIndex={-1}><span className="lbl"><span>{o}</span></span></button>)}<div className="poll-foot">Tap an option to vote and see results</div></div>
    : <PollCard id={it.id} options={it.poll_options} confetti={confetti} />;
  const text = it.type === "poll" ? poll : <Markdown className={look === "manual" ? "md mn-steps" : "md"} {...p("body")}>{it.body}</Markdown>;
  const tags = it.tags.length > 0 && !l.hide("tags") ? <div className="tags" {...p("tags")}>{it.tags.map((t) => <span key={t}>{t}</span>)}</div> : null;
  const style = mood ? ({ ...l.style, "--mood": mood.color } as React.CSSProperties) : l.style;
  const links = <LinkButtons it={it} p={p} />;
  let inner: React.ReactNode;
  if (look === "manual") {
    const spec = [["Model", owner, ""], ["Made in", place, "place"], ["Runs on", l.hide("tags") ? "" : it.tags.join(", "), "tags"], ["Mood", mood ? `${mood.emoji} ${mood.label}` : "", "mood"], ["Status", it.status, "status"]].filter(([, v]) => v);
    inner = <>
      <div className="mn-top"><i className="mn-ph">{face}</i><div><small><span {...p("sub")}>{it.category || "User manual"}</span>{date ? <span {...p("date")}>{` · v ${date}`}</span> : null}</small><h3 {...p("title")}>{it.title}</h3></div></div>
      {sub}
      {spec.length > 0 && <dl className="mn-spec">{spec.map(([k, v, key]) => <div key={k} {...(key ? p(key) : {})}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
      {picBox}{text}{links}
    </>;
  } else if (look === "sign") {
    inner = <>
      <div className="sg-board"><h3 {...p("title")}>{it.title}</h3></div><i className="sg-stick" aria-hidden />
      {it.category && it.category !== it.title && <span className="chip" {...p("sub", { alignSelf: "flex-start" })}>{it.category}</span>}
      {sub}<Meta it={it} showCat={false} hideDate={l.hide("date")} showStatus p={p} />{picBox}{text}{links}{tags}
    </>;
  } else if (look === "story") {
    inner = <>
      <div className="sy-segs" aria-hidden>{Array.from({ length: Math.max(1, Math.min(6, pics)) }, (_, n) => <i key={n} className={n === 0 ? "on" : undefined} />)}</div>
      <div className="sy-user"><i className="sy-face">{face}</i><span>{owner}{date && <small {...p("date")}> · {date}</small>}{place && <small {...p("place")}> · {place}</small>}</span></div>
      {it.category && <span className="sy-tag" {...p("sub")}>{it.category}</span>}
      <h3 {...p("title")}>{it.title}</h3>{sub}<Meta it={it} showCat={false} hideDate showStatus p={p} />{text}{links}{tags}
    </>;
  } else if (look === "fact") {
    const stats = [["When", date, "date"], ["Where", place, "place"], ["Mood", mood ? `${mood.emoji} ${mood.label}` : "", "mood"]].filter(([, v]) => v);
    inner = <>
      <div className="fc-top"><span {...p("sub")}>{it.category ? "Fact" : "Card"} #{String(factNo).padStart(2, "0")}</span><span className="fc-rar" {...p("status")}>★ {it.status || "Rare"}</span></div>
      {picBox ?? <div className="fc-art" style={{ "--h": (it.id * 47) % 360 } as React.CSSProperties} aria-hidden />}
      <h3 {...p("title")}>{it.title}</h3>{sub}{text}
      {stats.length > 0 && <div className="fc-stats">{stats.map(([k, v, key]) => <div key={k} {...p(key)}><b>{v}</b>{k}</div>)}</div>}
      {links}{tags}
    </>;
  } else {
    inner = <>
      {it.category && it.category !== it.title && <span className="chip" {...p("sub", { alignSelf: "flex-start" })}>{it.category}</span>}
      <h3 {...p("title")}>{it.title}</h3>{sub}<Meta it={it} showCat={false} hideDate={l.hide("date")} showStatus p={p} />{picBox}{text}{links}{tags}
    </>;
  }
  return (
    <div className={`note note-${look}${look === "plain" && index === 0 && it.body.length > 280 ? " wide" : ""}${it.body.trim() || it.type === "poll" ? " with-text" : ""}${l.className}`} style={style}>
      {look === "story" && <div className="sy-bg" aria-hidden {...(m && edit ? { "data-part": "pic", "data-fixed": "" } : {})}>{m && <Cover m={m} className="sy-img" style={vt} />}</div>}
      <Box foot={foot} to={edit ? undefined : href} label={it.title} full={full}>
        {!edit && <CardLink to={href} label={it.title} />}
        {inner}
      </Box>
      {look === "story" && m && zoom}
      {look === "manual" && <span className="mn-warn" aria-hidden>Handle with care</span>}
    </div>
  );
}
