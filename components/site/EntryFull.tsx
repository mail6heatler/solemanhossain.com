import type { Item, Section } from "@/lib/data";
import { MOODS, type SiteSettings } from "@/lib/settings";
import { cardLookOf } from "@/lib/cardLook";
import { fileName, shortUrl } from "./WinCard";
import { PassCard, passView, TickList, tripContext } from "./TripFrame";
import { fvBoxes, fvLook, fvOrder, type FvPart } from "@/lib/fullView";
import Markdown from "./Markdown";
import PollCard from "./PollCard";
import Reactions from "./Reactions";
import BackLink from "./BackLink";
import { FvShots } from "./FvShots";
import { partFn, type PartAttrs, type PartFn } from "./cardParts";

/** Which parts of a full view have something in them. The dashboard asks too, to say what isn't on the page yet. */
export function fvPresent(it: Item, reactions: boolean, layout = "notes"): Record<FvPart, boolean> {
  const seen = it.media.filter((m) => m.type !== "audio");
  return {
    pic: seen.length > 0,
    title: true,
    facts: !!(it.date_label || it.location || it.status || MOODS[it.mood]) || cardLookOf(layout, it) === "fact" || cardLookOf(layout, it) === "ticket",
    quote: !!it.fv.quote,
    story: !!it.body.trim() || (it.type === "poll" && it.poll_options.length > 0) || (cardLookOf(layout, it) === "bucket" && it.pass.ticks.length > 0),
    gallery: seen.length > 1 || it.media.some((m) => m.type === "audio"),
    tags: it.tags.length > 0,
    buttons: it.links.length > 0,
    reacts: reactions,
  };
}

/** What a detail is called on each card: a manual has a Version and a Made in, a collectible card a Rarity. The dashboard's labels use the same words. */
export const FACT_NAMES: Record<string, Partial<Record<"date" | "place" | "mood" | "status", string>>> = {
  manual: { date: "Version", place: "Made in" },
  sign: { mood: "Painted in" },
  story: { date: "Posted" },
  fact: { status: "Rarity" },
  plain: {},
  sheet: { status: "Status cell" },
  code: { status: "Build" },
  console: { status: "Quest" },
};
const BASE_NAMES = { date: "When", place: "Where", mood: "Mood", status: "Status" };
/** A window's full view keeps its address bar as the band at the top: the link, or the file the app has open. */
function winBand(look: string, it: Item, slug: string) {
  const link = it.links.find((x) => /^https?:/.test(x.url)), file = fileName(it.title);
  if (look === "console") return "QUEST·BOY";
  if (link) return shortUrl(link.url);
  return look === "sheet" ? `${file}.xlsx` : look === "notes" ? `notes/${file}.md` : `~/${slug}/${file}`;
}

/**
 * A G1, G2 or G3 entry opened up: its full view. A trip's details are its whole boarding pass, and a bucket list's tick lines go with its story. The page is a grid of parts (picture, title, details, pull quote, story, more pictures, tags, buttons, reactions)
 * placed by its layout, or wherever the owner dragged them in the dashboard (lib/fullView.ts). Phones stack them in reading order.
 * The entry's own page draws it, and so does the dashboard's editor: with `edit` each part carries its name, nothing leads anywhere and `foot` stands in for the reaction bar.
 */
export default function EntryFull({ item, section, settings, factNo, index, edit, foot }: { item: Item; section: Section; settings: SiteSettings; factNo: number; /** a trip's place in its row, for its pass's number */ index?: number; edit?: boolean; foot?: (a: { bar: PartAttrs; talk: PartAttrs }) => React.ReactNode }) {
  const p: PartFn = partFn(edit, item.fv.parts);
  const card = cardLookOf(section.layout, item);
  const trip = section.layout === "tickets" ? passView(item, { ...tripContext(settings, section), index: index ?? 0 }) : null;
  const mood = MOODS[item.mood];
  const seen = item.media.filter((m) => m.type !== "audio");
  const look = fvLook(item.fv, card, seen.length > 0);
  const boxes = fvOrder(fvBoxes(item.fv, look.layout, fvPresent(item, settings.effects.reactions, section.layout)));
  const owner = settings.nickname.trim() || settings.fullName.trim().split(/\s+/)[0] || "";
  const wash = seen[0]?.type === "image" ? seen[0].url : seen[0]?.thumb ?? "";
  const name = (k: "date" | "place" | "mood" | "status") => FACT_NAMES[card]?.[k] ?? BASE_NAMES[k];
  const facts: [string, string, string][] = [];
  if (card === "manual" && owner) facts.push(["Model", owner, ""]);
  for (const k of ["date", "place", "mood", "status"] as const) {
    const v = k === "date" ? item.date_label : k === "place" ? item.location : k === "mood" ? (mood ? `${mood.emoji} ${mood.label}` : "") : item.status || (card === "fact" ? "Rare" : "");
    if (v) facts.push([name(k), v, k]);
  }
  const band = card === "manual" ? `User manual${item.date_label ? ` · v ${item.date_label}` : ""}`
    : card === "fact" ? `Fact file #${String(factNo).padStart(2, "0")}`
    : section.layout === "windows" ? winBand(card, item, section.slug)
    : trip ? `${trip.subsection} · ${trip.no}`
    : item.category || section.title;

  const part = (k: FvPart): React.ReactNode => {
    switch (k) {
      case "pic": return <div className="fv-frame" {...p("pic")}><FvShots media={item.media} title={item.title} mode="hero" morphName={!edit && settings.effects.morph ? `entry-${item.id}` : undefined} still={edit} /></div>;
      case "title": return <>
        <div className="fv-eye">
          {section.code && <span className="chip dark" {...p("code")}>{section.code}</span>}
          {item.category && <span className="chip" {...p("sub")}>{item.category}</span>}
          {card === "fact" && <span className="chip line">#{String(factNo).padStart(2, "0")}</span>}
        </div>
        <h1 {...p("title")}>{item.title}</h1>
        {item.subtitle && <p className="lead" {...p("subtitle")}>{item.subtitle}</p>}
      </>;
      case "facts": if (trip?.frame === "ticket") return <div {...p("passinfo")}><PassCard view={trip} /></div>;
        return <dl className="fv-stamps">{facts.map(([k, v, key], i) => <div key={k} {...(key ? p(key, { "--t": i } as React.CSSProperties) : { style: { "--t": i } as React.CSSProperties })}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
      case "quote": return <blockquote className="fv-quote" {...p("quote")}><span>{item.fv.quote}</span></blockquote>;
      case "story": return <>
        {item.type === "poll" && (edit
          ? <div className="poll" {...p("poll")}>{item.poll_options.map((o, i) => <button key={i} type="button" className="poll-opt" tabIndex={-1}><span className="lbl"><span>{o}</span></span></button>)}<div className="poll-foot">Tap an option to vote and see results</div></div>
          : <PollCard id={item.id} options={item.poll_options} confetti={settings.effects.confetti} />)}
        {trip?.frame === "bucket" && <TickList ticks={trip.ticks} attrs={p("ticks")} />}
        <Markdown className={card === "manual" ? "md mn-steps" : "md"} {...p("body")}>{item.body}</Markdown>
      </>;
      case "gallery": return <div {...p("gallery")}><FvShots media={item.media} title={item.title} mode="rest" still={edit} /></div>;
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
      case "reacts": return foot ? foot({ bar: p("reacts"), talk: p("comments") }) : <Reactions id={item.id} talk={item.talk} attrs={{ bar: p("reacts"), talk: p("comments") }} />;
    }
  };

  return (
    <article className={`fv fvk-${card} lay-${look.layout} bg-${look.bg} open-${look.open}`} style={mood ? ({ "--mood": mood.color } as React.CSSProperties) : undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {look.bg === "pic" && wash && <img className="fv-wash" src={wash} alt="" aria-hidden />}
      <div className="fv-top">
        {edit ? <span className="back"><i className="ti ti-arrow-left" />{section.title}</span> : <BackLink href={`/s/${section.slug}`} label={section.title} />}
        <span className="fv-band" aria-hidden {...p("band")}>{band}</span>
      </div>
      <div className="fv-grid">
        {boxes.map((b, i) => (
          <section key={b.part} className={`fv-b fvb-${b.part}`} data-fv={edit ? b.part : undefined}
            style={{ gridColumn: `${b.x + 1} / span ${b.w}`, gridRow: `${b.y + 1} / span ${b.h}`, "--i": i, "--h": b.h } as React.CSSProperties}>
            {/* everything in a part is drawn this much bigger or smaller (its corner, in the dashboard) */}
            <div className="fv-z" style={b.z !== 100 ? { zoom: b.z / 100 } : undefined}>{part(b.part)}</div>
          </section>
        ))}
      </div>
    </article>
  );
}
