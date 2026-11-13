import type { Item, Section } from "@/lib/data";
import { MOODS, type SiteSettings } from "@/lib/settings";
import { noteLookOf, type NoteLook } from "@/lib/cardLook";
import { fvBoxes, fvLook, fvOrder, type FvPart } from "@/lib/fullView";
import Markdown from "./Markdown";
import PollCard from "./PollCard";
import Reactions from "./Reactions";
import BackLink from "./BackLink";
import { FvShots } from "./FvShots";
import { noPart, type PartFn } from "./cardParts";

/** Which parts of a full view have something in them. The dashboard asks too, to say what isn't on the page yet. */
export function fvPresent(it: Item, reactions: boolean): Record<FvPart, boolean> {
  const seen = it.media.filter((m) => m.type !== "audio");
  return {
    pic: seen.length > 0,
    title: true,
    facts: !!(it.date_label || it.location || it.status || MOODS[it.mood]) || noteLookOf(it.category, it.card.look) === "fact",
    quote: !!it.fv.quote,
    story: !!it.body.trim() || (it.type === "poll" && it.poll_options.length > 0),
    gallery: seen.length > 1 || it.media.some((m) => m.type === "audio"),
    tags: it.tags.length > 0,
    buttons: it.links.length > 0,
    reacts: reactions,
  };
}

/** What a detail is called on each card: a manual has a Version and a Made in, a collectible card a Rarity. The dashboard's labels use the same words. */
export const FACT_NAMES: Record<NoteLook, Partial<Record<"date" | "place" | "mood" | "status", string>>> = {
  manual: { date: "Version", place: "Made in" },
  sign: { mood: "Painted in" },
  story: { date: "Posted" },
  fact: { status: "Rarity" },
  plain: {},
};
const BASE_NAMES = { date: "When", place: "Where", mood: "Mood", status: "Status" };

/**
 * A G1 entry opened up: its full view. The page is a grid of parts (picture, title, details, pull quote, story, more pictures, tags, buttons, reactions)
 * placed by its layout, or wherever the owner dragged them in the dashboard (lib/fullView.ts). Phones stack them in reading order.
 * The entry's own page draws it, and so does the dashboard's editor: with `edit` each part carries its name, nothing leads anywhere and `foot` stands in for the reaction bar.
 */
export default function EntryFull({ item, section, settings, factNo, edit, foot }: { item: Item; section: Section; settings: SiteSettings; factNo: number; edit?: boolean; foot?: React.ReactNode }) {
  const p: PartFn = edit ? (k) => ({ "data-part": k }) : noPart;
  const card = noteLookOf(item.category, item.card.look);
  const mood = MOODS[item.mood];
  const seen = item.media.filter((m) => m.type !== "audio");
  const look = fvLook(item.fv, card, seen.length > 0);
  const boxes = fvOrder(fvBoxes(item.fv, look.layout, fvPresent(item, settings.effects.reactions)));
  const owner = settings.nickname.trim() || settings.fullName.trim().split(/\s+/)[0] || "";
  const wash = seen[0]?.type === "image" ? seen[0].url : seen[0]?.thumb ?? "";
  const name = (k: "date" | "place" | "mood" | "status") => FACT_NAMES[card][k] ?? BASE_NAMES[k];
  const facts: [string, string, string][] = [];
  if (card === "manual" && owner) facts.push(["Model", owner, ""]);
  for (const k of ["date", "place", "mood", "status"] as const) {
    const v = k === "date" ? item.date_label : k === "place" ? item.location : k === "mood" ? (mood ? `${mood.emoji} ${mood.label}` : "") : item.status || (card === "fact" ? "Rare" : "");
    if (v) facts.push([name(k), v, k]);
  }
  const band = card === "manual" ? `User manual${item.date_label ? ` · v ${item.date_label}` : ""}`
    : card === "fact" ? `Fact file #${String(factNo).padStart(2, "0")}`
    : item.category || section.title;

  const part = (k: FvPart): React.ReactNode => {
    switch (k) {
      case "pic": return <div className="fv-frame" {...p("pic")}><FvShots media={item.media} title={item.title} mode="hero" morphName={!edit && settings.effects.morph ? `entry-${item.id}` : undefined} still={edit} /></div>;
      case "title": return <>
        <div className="fv-eye">
          {section.code && <span className="chip dark">{section.code}</span>}
          {item.category && <span className="chip" {...p("sub")}>{item.category}</span>}
          {card === "fact" && <span className="chip line">#{String(factNo).padStart(2, "0")}</span>}
        </div>
        <h1 {...p("title")}>{item.title}</h1>
        {item.subtitle && <p className="lead" {...p("subtitle")}>{item.subtitle}</p>}
      </>;
      case "facts": return <dl className="fv-stamps">{facts.map(([k, v, key], i) => <div key={k} style={{ "--t": i } as React.CSSProperties} {...(key ? p(key) : {})}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
      case "quote": return <blockquote className="fv-quote" {...p("quote")}><span>{item.fv.quote}</span></blockquote>;
      case "story": return <>
        {item.type === "poll" && (edit
          ? <div className="poll" {...p("poll")}>{item.poll_options.map((o, i) => <button key={i} type="button" className="poll-opt" tabIndex={-1}><span className="lbl"><span>{o}</span></span></button>)}<div className="poll-foot">Tap an option to vote and see results</div></div>
          : <PollCard id={item.id} options={item.poll_options} confetti={settings.effects.confetti} />)}
        <Markdown className={card === "manual" ? "md mn-steps" : "md"} {...p("body")}>{item.body}</Markdown>
      </>;
      case "gallery": return <div {...p("pic")}><FvShots media={item.media} title={item.title} mode="rest" still={edit} /></div>;
      case "tags": return <div className="tags" {...p("tags")}>{item.tags.map((t) => <span key={t}>{t}</span>)}</div>;
      case "buttons": return (
        <div className="btn-row" {...p("links")}>
          {item.links.map((l, i) => (
            <a key={i} href={l.url} className={i === 0 ? "btn-ink" : "btn-line"} {...(l.url.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
              {l.label}{l.url.startsWith("http") && <i className="ti ti-arrow-up-right" />}
            </a>
          ))}
        </div>
      );
      case "reacts": return foot ?? <Reactions id={item.id} talk={item.talk} />;
    }
  };

  return (
    <article className={`fv fvk-${card} lay-${look.layout} bg-${look.bg} open-${look.open}`} style={mood ? ({ "--mood": mood.color } as React.CSSProperties) : undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {look.bg === "pic" && wash && <img className="fv-wash" src={wash} alt="" aria-hidden />}
      <div className="fv-top">
        {edit ? <span className="back"><i className="ti ti-arrow-left" />{section.title}</span> : <BackLink href={`/s/${section.slug}`} label={section.title} />}
        <span className="fv-band" aria-hidden>{band}</span>
      </div>
      <div className="fv-grid">
        {boxes.map((b, i) => (
          <section key={b.part} className={`fv-b fvb-${b.part}`} data-fv={edit ? b.part : undefined}
            style={{ gridColumn: `${b.x + 1} / span ${b.w}`, gridRow: `${b.y + 1} / span ${b.h}`, "--i": i, "--h": b.h } as React.CSSProperties}>
            {part(b.part)}
          </section>
        ))}
      </div>
    </article>
  );
}
