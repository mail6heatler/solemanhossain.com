import type { Item, Message, Section } from "@/lib/data";
import { MOODS, type SiteSettings } from "@/lib/settings";
import Markdown, { excerpt } from "./Markdown";
import PollCard from "./PollCard";
import HelloForm from "./HelloForm";
import Reactions from "./Reactions";
import SideRow, { type RowFx } from "./SideRow";
import PhotoGrid from "./PhotoGrid";
import { Cover, MediaBadges } from "./Media";
import PicZoom from "./PicZoom";

const href = (s: Section, it: Item) => `/s/${s.slug}/${it.id}`;

/** The same name on a card picture and on the entry page's big picture makes it morph between pages. */
export const morphName = (on: boolean, id: number) => (on ? ({ viewTransitionName: `entry-${id}` } as React.CSSProperties) : undefined);

/** Makes a whole card clickable while buttons inside it (reactions) stay clickable on their own. */
const CardLink = ({ to, label }: { to: string; label: string }) => <a href={to} className="card-link" aria-label={label} />;

export function Mood({ mood }: { mood: string }) {
  const m = MOODS[mood];
  if (!m) return null;
  return <span className="mood" title={`Mood: ${m.label}`}><i style={{ background: m.color }} />{m.label}</span>;
}

function Meta({ it, showCat = true }: { it: Item; showCat?: boolean }) {
  const bits = [
    showCat && it.category ? <span key="c" className="chip">{it.category}</span> : null,
    it.date_label ? <span key="d">{it.date_label}</span> : null,
    it.location ? <span key="l"><i className="ti ti-map-pin" style={{ fontSize: 12 }} /> {it.location}</span> : null,
    it.mood ? <Mood key="m" mood={it.mood} /> : null,
  ].filter(Boolean);
  return bits.length ? <div className="meta">{bits}</div> : null;
}

/**
 * Fixed-size card contents: anything that doesn't fit scrolls inside the card, with a hint that there's more.
 * `foot` (the reaction bar) stays outside the scrolling part, so it's always visible.
 */
function Box({ children, foot }: { children: React.ReactNode; foot?: React.ReactNode }) {
  return (
    <>
      <div className={`scroll-wrap${foot ? " has-foot" : ""}`}>
        <div className="scrolly"><div className="flow">{children}</div></div>
        <span className="more-hint" aria-hidden><i className="ti ti-chevrons-down" /></span>
      </div>
      {foot && <div className="card-foot">{foot}</div>}
    </>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="empty reveal r3"><i className="ti ti-pencil" />{text || "Nothing here yet."}</div>;
}

/** `grid`: the "See all" pages lay everything out in a neat grid. The homepage uses sideways rows. */
export default function SectionBody({ section, items, settings, wall, grid = false }:
  { section: Section; items: Item[]; settings: SiteSettings; wall?: Message[]; grid?: boolean }) {
  const L = section.layout;
  const fx = settings.effects;
  const st = fx.stagger ? " stagger" : "";
  const vt = (id: number) => morphName(fx.morph, id);
  const R = ({ id }: { id: number }) => (fx.reactions ? <Reactions id={id} compact /> : null);
  const foot = (id: number) => (fx.reactions ? <Reactions id={id} compact /> : undefined);
  const zoom = (it: Item) => (fx.lightbox && it.media.length > 0 ? <PicZoom media={it.media} title={it.title} /> : null);
  const rowFx: RowFx = { pin: fx.sideways, curve: fx.coverflow, fly: fx.rowfly, lean: fx.rowlean, count: fx.rowcount };
  const row = (className: string, children: React.ReactNode) => grid
    ? <div className={`${className} reveal r3${st}`}>{children}</div>
    : <SideRow className={`${className}${st}`} fx={rowFx}>{children}</SideRow>;

  if (L === "connect") {
    const hasNotes = items.length > 0 || (wall?.length ?? 0) > 0;
    const notes = (
      <>
        {items.map((it) => (
          <div key={it.id} className="wall-note quote">
            <Box foot={foot(it.id)}>
              <p>{it.body || it.title}</p>
              <div className="by">— {it.subtitle || it.title}</div>
            </Box>
          </div>
        ))}
        {wall?.map((m) => (
          <div key={m.id} className="wall-note">
            <Box>
              <p>{m.body}</p>
              <div className="by">— {m.name} · {new Date(m.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
            </Box>
          </div>
        ))}
      </>
    );
    const noNotes = !hasNotes && (
      <div className="empty" style={{ marginTop: 0 }}><i className="ti ti-message-heart" />Notes people leave (and you approve) show up here.</div>
    );
    return (
      <>
        {settings.socials.length > 0 && (
          <div className="connectrow reveal r3">
            {settings.socials.map((s, i) => (
              <a key={i} href={s.url} {...(s.url.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                <i className={`ti ti-${s.icon}`} />{s.label}
              </a>
            ))}
          </div>
        )}
        <div className={`connect-grid reveal r3${grid ? "" : " solo"}`}>
          <HelloForm title={settings.connectFormTitle} plane={fx.plane} />
          {grid && <div className="wall">{hasNotes && <h3>From the wall</h3>}{notes}{noNotes}</div>}
          {!grid && !hasNotes && noNotes}
        </div>
        {!grid && hasNotes && (
          <div className="wall-row">
            <h3>From the wall</h3>
            <SideRow className="wall" fx={rowFx}>{notes}</SideRow>
          </div>
        )}
      </>
    );
  }

  if (!items.length) return <Empty text={section.empty_text} />;

  if (L === "strip") {
    const trips = items.map((it) => (
      <div key={it.id} className="trip">
        <Box foot={foot(it.id)}>
          <CardLink to={href(section, it)} label={it.title} />
          <div className="pic-box"><div className={`ph${it.media[0] ? " has-pic" : ""}`}>{it.media[0] ? <Cover m={it.media[0]} style={vt(it.id)} /> : <i className="ti ti-map-pin" />}<MediaBadges media={it.media} /></div>{zoom(it)}</div>
          <div className="tb">
            {it.category && <span className="chip" style={{ alignSelf: "flex-start" }}>{it.category}</span>}
            <h3>{it.title}</h3>
            {(it.location || it.date_label) && (
              <div className="loc"><i className="ti ti-map-pin" />{[it.location, it.date_label].filter(Boolean).join(" · ")}</div>
            )}
          </div>
        </Box>
      </div>
    ));
    return row(grid ? "grid3" : "strip", trips);
  }

  if (L === "list") {
    if (fx.flip)
      return row("flips", (
        <>
          {items.map((it) => (
            <div key={it.id} className="flip-wrap">
              <a href={href(section, it)} className="flip" aria-label={`${it.title}${it.subtitle ? `, ${it.subtitle}` : ""}`}>
                <div className="flip-in">
                  <div className="flip-f">
                    <div className="ico">{it.media[0] ? <Cover m={it.media[0]} style={vt(it.id)} /> : <i className="ti ti-bookmark" />}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {it.category && <span className="chip">{it.category}</span>}
                      {it.status && <span className="chip line">{it.status}</span>}
                    </div>
                    <h3>{it.title}</h3>
                    {it.subtitle && <div className="sub">{it.subtitle}</div>}
                  </div>
                  <div className="flip-b" aria-hidden>
                    <span>{excerpt(it.body, 170) || "Why this one stuck with me…"}</span>
                    <span className="more">Read more →</span>
                  </div>
                </div>
              </a>
              <R id={it.id} />
            </div>
          ))}
        </>
      ));
    return (
      <div className={`shelf reveal r3${st}`}>
        {items.map((it) => (
          <div key={it.id} className="shelf-row">
            <CardLink to={href(section, it)} label={it.title} />
            <div className="shelf-ico">{it.media[0] ? <Cover m={it.media[0]} style={vt(it.id)} /> : <i className="ti ti-bookmark" style={{ color: "var(--mint-deep)" }} />}</div>
            <div>
              <h3>{it.title}</h3>
              {it.subtitle && <div className="sub">{it.subtitle}</div>}
              <R id={it.id} />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {it.status && <span className="chip line">{it.status}</span>}
              {it.category && <span className="chip">{it.category}</span>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (L === "stream")
    return (
      <div className={`stream reveal r3${st}`}>
        {items.map((it) => (
          <article key={it.id} className="post">
            <div className="dotline"><div className="d" style={MOODS[it.mood] ? { background: MOODS[it.mood].color } : undefined} /><div className="l" /></div>
            <div className="post-main">
              <Meta it={it} />
              <h3><a href={href(section, it)}>{it.pinned ? "📌 " : ""}{it.title}</a></h3>
              {it.type === "poll" ? (
                <PollCard id={it.id} options={it.poll_options} confetti={fx.confetti} />
              ) : (
                <>
                  {it.media[0] && (it.media[0].type === "video"
                    ? <video className="post-media" src={it.media[0].url} controls playsInline preload="metadata" style={vt(it.id)} />
                    : <div className="pic-box"><img className="post-media" src={it.media[0].url} alt="" loading="lazy" decoding="async" style={vt(it.id)} />{zoom(it)}</div>)}
                  {it.media.length > 1 && <a className="more-media" href={href(section, it)}>+{it.media.length - 1} more photo{it.media.length > 2 ? "s" : ""}/video{it.media.length > 2 ? "s" : ""} →</a>}
                  {it.body.length > 420
                    ? <p className="md" style={{ margin: 0 }}>{excerpt(it.body, 380)} <a href={href(section, it)}>read more</a></p>
                    : <Markdown>{it.body}</Markdown>}
                </>
              )}
              <R id={it.id} />
            </div>
          </article>
        ))}
      </div>
    );

  if (L === "timeline")
    return (
      <div className={`tline reveal r3${fx.timeline ? " draw" : ""}`}>
        {fx.timeline && <i className="tl-head" aria-hidden />}
        {items.map((it) => (
          <div key={it.id} className={`tl-row ${it.mood}`} style={{ ["--dot" as string]: MOODS[it.mood]?.color ?? "var(--mint)" }}>
            <CardLink to={href(section, it)} label={it.title} />
            <Meta it={it} />
            <h3>{it.title}</h3>
            {(it.subtitle || it.body) && <p>{it.subtitle || excerpt(it.body, 180)}</p>}
            <R id={it.id} />
          </div>
        ))}
      </div>
    );

  if (L === "photos") {
    if (fx.lightbox)
      return <PhotoGrid className={grid ? `photogrid reveal r3${st}` : `photogrid${st}`} reactions={fx.reactions} row={grid ? undefined : rowFx}
        items={items.map((it) => ({ id: it.id, title: it.title, media: it.media, href: href(section, it) }))} />;
    return row("photogrid", (
      <>
        {items.map((it) => (
          <div key={it.id} className="ph-cell">
            {it.media[0] ? (
              <a href={href(section, it)} className="ph-tile">
                <Cover m={it.media[0]} alt={it.title} style={vt(it.id)} />
                <span className="cap">{it.title}</span>
                <MediaBadges media={it.media} />
              </a>
            ) : (
              <a href={href(section, it)} className="ph-tile txt">{it.title}</a>
            )}
            <R id={it.id} />
          </div>
        ))}
      </>
    ));
  }

  if (L === "notes")
    return row("notes", (
      <>
        {items.map((it, i) => (
          <div key={it.id} className={`note ${i === 0 && it.body.length > 280 ? "wide" : ""}`}>
            <Box foot={foot(it.id)}>
              {it.category && it.category !== it.title && <span className="chip" style={{ alignSelf: "flex-start" }}>{it.category}</span>}
              <h3>{it.title}</h3>
              {it.media[0] && <div className="pic-box"><Cover m={it.media[0]} className="note-media" />{zoom(it)}</div>}
              {it.type === "poll" ? <PollCard id={it.id} options={it.poll_options} confetti={fx.confetti} /> : <Markdown>{it.body}</Markdown>}
            </Box>
          </div>
        ))}
      </>
    ));

  // cards (default); as a bento grid the first (featured) card gets the big tile
  const bento = fx.bento && items.length >= 3 && !grid;
  const tile = (i: number) => (!bento ? "" : i === 0 ? " b-big" : i % 4 === 3 ? " b-wide" : "");
  return row(`grid3${bento ? " bento" : ""}`, (
    <>
      {items.map((it, i) => (
        <div key={it.id} className={`card${tile(i)}${it.media[0] ? "" : " no-pic"}`}>
          {it.pinned && <span className="chip dark pin-badge">★ featured</span>}
          <Box foot={foot(it.id)}>
            <CardLink to={href(section, it)} label={it.title} />
            {it.media[0] && <div className="pic-box"><div className="card-media"><Cover m={it.media[0]} className="card-img" style={vt(it.id)} /><MediaBadges media={it.media} /></div>{zoom(it)}</div>}
            <div className="card-body">
              <div className="card-top">
                {it.category ? <span className="chip">{it.category}</span> : <span />}
                {it.status && !it.pinned && <span className="chip line">{it.status}</span>}
              </div>
              <h3>{it.title}</h3>
              {it.subtitle && <p className="sub">{it.subtitle}</p>}
              {it.type === "poll" ? <p className="ex">📊 Poll · tap to vote</p> : <Markdown className="md ex">{it.body}</Markdown>}
              {it.tags.length > 0 && <div className="tags">{it.tags.map((t) => <span key={t}>{t}</span>)}</div>}
            </div>
          </Box>
        </div>
      ))}
    </>
  ));
}
