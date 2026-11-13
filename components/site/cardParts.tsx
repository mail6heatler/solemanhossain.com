import type { Item } from "@/lib/data";
import { MOODS } from "@/lib/settings";
import FullView from "./FullView";
import { partStyle, type PartSizes } from "@/lib/partSize";

/**
 * The pieces every card is built from. They live here, apart from SectionBody, so the dashboard's editor can draw the very same card
 * (see NoteCard) without loading every layout. `p` names a part for the dashboard's labels (`data-part`); on the site it adds nothing.
 */
export type PartAttrs = { "data-part"?: string; "data-sz"?: string; style?: React.CSSProperties };
export type PartFn = (key: string, base?: React.CSSProperties) => PartAttrs;
export const noPart: PartFn = (_key, base) => (base ? { style: base } : {});

/**
 * How a card's parts are drawn: with `edit` each is named for the dashboard's labels, and on the site as in the dashboard each gets the size the owner
 * dragged it to (lib/partSize.ts). `base` is the style the part has anyway, which a size adds to.
 */
export function partFn(edit: boolean | undefined, sizes?: PartSizes): PartFn {
  return (key, base) => {
    const out: PartAttrs = {};
    if (edit) out["data-part"] = key;
    const { style, flags } = partStyle(key, sizes?.[key]);
    if (style || base) out.style = { ...base, ...style };
    if (flags) out["data-sz"] = flags;
    return out;
  };
}

/** Makes a whole card clickable while buttons inside it (reactions) stay clickable on their own. */
export const CardLink = ({ to, label }: { to: string; label: string }) => <a href={to} className="card-link" aria-label={label} />;

export function Mood({ mood, p = noPart }: { mood: string; p?: PartFn }) {
  const m = MOODS[mood];
  if (!m) return null;
  return <span className="mood" title={`Mood: ${m.label}`} {...p("mood")}><i style={{ background: m.color }} />{m.label}</span>;
}

export function Meta({ it, showCat = true, hideDate = false, showStatus = false, p = noPart }: { it: Item; showCat?: boolean; hideDate?: boolean; showStatus?: boolean; p?: PartFn }) {
  const bits = [
    showCat && it.category ? <span key="c" className="chip" {...p("sub")}>{it.category}</span> : null,
    showStatus && it.status ? <span key="s" className="chip line" {...p("status")}>{it.status}</span> : null,
    it.date_label && !hideDate ? <span key="d" {...p("date")}>{it.date_label}</span> : null,
    it.location && !hideDate ? <span key="l" {...p("place")}><i className="ti ti-map-pin" style={{ fontSize: 12 }} /> {it.location}</span> : null,
    it.mood ? <Mood key="m" mood={it.mood} p={p} /> : null,
  ].filter(Boolean);
  return bits.length ? <div className="meta">{bits}</div> : null;
}

/**
 * Fixed-size card contents: anything that doesn't fit scrolls inside the card, with a hint that there's more.
 * `foot` (the reaction bar) stays outside the scrolling part, so it's always visible. `full` stands in for the Full view link in the dashboard.
 */
export function Box({ children, foot, to, label = "", stub, full }: { children: React.ReactNode; foot?: React.ReactNode; to?: string; label?: string; stub?: React.ReactNode; full?: React.ReactNode }) {
  return (
    <>
      <div className={`scroll-wrap${foot || to || full ? " has-foot" : ""}`}>
        <div className="scrolly"><div className="flow">{children}</div></div>
        <span className="more-hint" aria-hidden><span className="more-pill"><span className="more-word">Scroll for more</span><i className="ti ti-chevrons-down hint-arrow" /></span></span>
        <i className="scroll-line" aria-hidden><b /></i>
      </div>
      {stub}
      {(foot || to || full) && <div className="card-foot">{foot}{full ?? (to && <FullView to={to} label={label} />)}</div>}
    </>
  );
}

/** The entry's buttons (like "View project"), on the card itself. They sit above the card's own link. */
export function LinkButtons({ it, p = noPart }: { it: Item; p?: PartFn }) {
  if (!it.links.length) return null;
  return (
    <div className="card-links" {...p("links")}>
      {it.links.slice(0, 3).map((l, i) => (
        <a key={i} href={l.url} {...(l.url.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {l.label}{l.url.startsWith("http") && <i className="ti ti-arrow-up-right" aria-hidden />}
        </a>
      ))}
    </div>
  );
}
