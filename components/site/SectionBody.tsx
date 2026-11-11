import type { Item, Message, Section } from "@/lib/data";
import { MOODS, type SiteSettings } from "@/lib/settings";
import Markdown, { excerpt } from "./Markdown";
import PollCard from "./PollCard";
import HelloForm from "./HelloForm";
import Reactions from "./Reactions";
import SideRow, { type RowFx } from "./SideRow";
import PhotoGrid, { PhotoInfo } from "./PhotoGrid";
import { Cover, MediaBadges } from "./Media";
import PicZoom from "./PicZoom";
import FullView from "./FullView";
import Dock from "./Dock";
import TicketRider from "./TicketRider";
import { isNextTrip, Vehicle, vehicleFor } from "./vehicles";
import { frameFor, passView, tripContext, TripFrame, type FrameBody } from "./TripFrame";
import { ShelfDecor, ShelfLamp, StudyFrame, studyView, type StudyBody } from "./StudyFrame";
import { ComicFrame, ComicMore, comicView, type ComicBody } from "./ComicFrame";
import { AwardFrame, AwardMore, awardView, type AwardBody } from "./AwardFrame";
import { FlyingBrain } from "./comicArt";
import ComicPoll from "./ComicPoll";
import TvPlay from "./TvPlay";
import { lookOf, mergeStyles } from "@/lib/contentStyle";

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

function Meta({ it, showCat = true, hideDate = false, showStatus = false }: { it: Item; showCat?: boolean; hideDate?: boolean; showStatus?: boolean }) {
  const bits = [
    showCat && it.category ? <span key="c" className="chip">{it.category}</span> : null,
    showStatus && it.status ? <span key="s" className="chip line">{it.status}</span> : null,
    it.date_label && !hideDate ? <span key="d">{it.date_label}</span> : null,
    it.location && !hideDate ? <span key="l"><i className="ti ti-map-pin" style={{ fontSize: 12 }} /> {it.location}</span> : null,
    it.mood ? <Mood key="m" mood={it.mood} /> : null,
  ].filter(Boolean);
  return bits.length ? <div className="meta">{bits}</div> : null;
}

/**
 * Fixed-size card contents: anything that doesn't fit scrolls inside the card, with a hint that there's more.
 * `foot` (the reaction bar) stays outside the scrolling part, so it's always visible.
 */
function Box({ children, foot, to, label = "", stub }: { children: React.ReactNode; foot?: React.ReactNode; to?: string; label?: string; stub?: React.ReactNode }) {
  return (
    <>
      <div className={`scroll-wrap${foot || to ? " has-foot" : ""}`}>
        <div className="scrolly"><div className="flow">{children}</div></div>
        <span className="more-hint" aria-hidden><span className="more-pill"><span className="more-word">Scroll for more</span><i className="ti ti-chevrons-down hint-arrow" /></span></span>
        <i className="scroll-line" aria-hidden><b /></i>
      </div>
      {stub}
      {(foot || to) && <div className="card-foot">{foot}{to && <FullView to={to} label={label} />}</div>}
    </>
  );
}

/** The entry's buttons (like "View project"), on the card itself. They sit above the card's own link. */
function LinkButtons({ it }: { it: Item }) {
  if (!it.links.length) return null;
  return (
    <div className="card-links">
      {it.links.slice(0, 3).map((l, i) => (
        <a key={i} href={l.url} {...(l.url.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {l.label}{l.url.startsWith("http") && <i className="ti ti-arrow-up-right" aria-hidden />}
        </a>
      ))}
    </div>
  );
}

/** Visitors see this on an empty section. Older default messages told the owner to use the dashboard, which means nothing to a visitor. */
/** A milestone's medal, from its subsection's name. */
function medalFor(it: Item) {
  if (it.type === "poll") return "chart-bar";
  const c = `${it.category} ${it.title}`.toLowerCase();
  if (/certif|skill|course|licen|badge/.test(c)) return "certificate";
  if (/school|study|degree|universit|college|educat/.test(c)) return "school";
  if (/career|job|work|officer|intern|assist|manager|engineer/.test(c)) return "briefcase";
  if (/win|award|prize|achiev|medal|champion/.test(c)) return "trophy";
  if (/lesson|hard|fail|learn/.test(c)) return "bulb";
  return "flag";
}

const fileName = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "project";
const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

/** A project with no picture still fills its window: its own details, written as a few lines of code. */
function CodeView({ it, hideSubtitle, hideTags, hideDate }: { it: Item; hideSubtitle: boolean; hideTags: boolean; hideDate: boolean }) {
  const str = (v: string) => <span className="cd-str">&quot;{v}&quot;</span>;
  const link = it.links.find((x) => /^https?:/.test(x.url));
  const fields: [string, React.ReactNode][] = [];
  if (it.status) fields.push(["status", str(it.status.toLowerCase())]);
  if (it.tags.length && !hideTags) fields.push(["stack", <>[{it.tags.map((t, i) => <span key={t}>{i > 0 && ", "}{str(t)}</span>)}]</>]);
  if (it.date_label && !hideDate) fields.push(["when", str(it.date_label)]);
  if (it.location && !hideDate) fields.push(["where", str(it.location)]);
  if (link) fields.push(["link", str(shortUrl(link.url))]);
  const call = <><span className="cd-fn">build</span>({str(fileName(it.title))}</>;
  const lines: React.ReactNode[] = [
    ...(it.subtitle && !hideSubtitle ? [<span key="c" className="cd-note">{`// ${it.subtitle}`}</span>] : []),
    ...(fields.length
      ? [<>{call}, {"{"}</>, ...fields.map(([k, v]) => <>{"  "}<span className="cd-key">{k}</span>: {v},</>), <>{"});"}</>]
      : [<>{call});</>]),
    <i key="end" className="blink-cursor" />,
  ];
  return <pre className="win-code">{lines.map((line, i) => <span key={i} className="cd-line" style={{ ["--l" as string]: i }}>{line}</span>)}</pre>;
}

function Empty({ text }: { text: string }) {
  const shown = !text || /dashboard/i.test(text) ? "Coming soon." : text;
  return <div className="empty reveal r3"><i className="ti ti-pencil" />{shown}</div>;
}

/** `grid`: the "See all" pages lay everything out in a neat grid. The homepage uses sideways rows. */
export default function SectionBody({ section, items, settings, wall, grid = false }:
  { section: Section; items: Item[]; settings: SiteSettings; wall?: Message[]; grid?: boolean }) {
  const L = section.layout;
  const fx = settings.effects;
  const st = fx.stagger ? " stagger" : "";
  const vt = (id: number) => morphName(fx.morph, id);
  const talkOf = new Map(items.map((it) => [it.id, it.talk]));
  const bar = (id: number) => <Reactions id={id} compact talk={talkOf.get(id)} href={`/s/${section.slug}/${id}`} />;
  const R = ({ id }: { id: number }) => (fx.reactions ? bar(id) : null);
  const foot = (id: number) => (fx.reactions ? bar(id) : undefined);
  const lookFor = (it: Item) => lookOf(mergeStyles(settings.contentStyle, section.style, it.style));
  const photoInfo = (it: Item, l: ReturnType<typeof lookFor>) => ({
    subtitle: l.hide("subtitle") ? "" : it.subtitle,
    meta: l.hide("date") ? "" : [it.date_label, it.location].filter(Boolean).join(" · "),
    text: excerpt(it.body, 90),
    tags: l.hide("tags") ? [] : it.tags,
  });
  const zoom = (it: Item) => (fx.lightbox && it.media.length > 0 ? <PicZoom media={it.media} title={it.title} /> : null);
  const rowFx: RowFx = { auto: fx.sideways, count: fx.rowcount };
  const row = (className: string, children: React.ReactNode, after?: React.ReactNode) => grid
    ? <div className={`${className} reveal r3${st}`}>{children}</div>
    : <SideRow className={`${className}${st}`} fx={rowFx} after={after}>{children}</SideRow>;

  if (L === "connect") {
    const hasNotes = items.length > 0 || (wall?.length ?? 0) > 0;
    const notes = (
      <>
        {items.map((it) => (
          <div key={it.id} className={`wall-note quote${lookFor(it).className}`} style={lookFor(it).style}>
            <Box foot={foot(it.id)} to={href(section, it)} label={it.title}>
              <CardLink to={href(section, it)} label={it.title} />
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
        <div className="connect-wrap">
        {settings.socials.length > 0 && (
          <div className={`connectrow reveal r3${grid ? "" : " beside"}`}>
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
    const trips = items.map((it) => { const l = lookFor(it); return (
      <div key={it.id} className={`trip${it.body.trim() ? " with-text" : ""}${l.className}`} style={l.style}>
        <Box foot={foot(it.id)} to={href(section, it)} label={it.title}>
          <CardLink to={href(section, it)} label={it.title} />
          {!l.hide("pic") && <div className="pic-box"><div className={`ph${it.media[0] ? " has-pic" : ""}`}>{it.media[0] ? <Cover m={it.media[0]} style={vt(it.id)} /> : <i className="ti ti-map-pin" />}<MediaBadges media={it.media} /></div>{zoom(it)}</div>}
          <div className="tb">
            {it.category && <span className="chip" style={{ alignSelf: "flex-start" }}>{it.category}</span>}
            <h3>{it.title}</h3>
            {it.subtitle && !l.hide("subtitle") && <p className="sub">{it.subtitle}</p>}
            {(it.location || it.date_label) && !l.hide("date") && (
              <div className="loc"><i className="ti ti-map-pin" />{[it.location, it.date_label].filter(Boolean).join(" · ")}</div>
            )}
            {(it.mood || it.status) && !l.hide("date") && (
              <div className="meta">{it.status && <span className="chip line">{it.status}</span>}{it.mood && <Mood mood={it.mood} />}</div>
            )}
            {it.type === "poll" ? <PollCard id={it.id} options={it.poll_options} confetti={fx.confetti} /> : <Markdown className="md ex">{it.body}</Markdown>}
            <LinkButtons it={it} />
            {it.tags.length > 0 && !l.hide("tags") && <div className="tags">{it.tags.map((t) => <span key={t}>{t}</span>)}</div>}
          </div>
        </Box>
      </div>
    ); });
    return row(grid ? "grid3" : "strip", trips);
  }

  if (L === "list") {
    if (fx.flip)
      return row("flips", (
        <>
          {items.map((it) => { const l = lookFor(it); return (
            <div key={it.id} className={`flip-wrap${l.className}`} style={l.style}>
              <a href={href(section, it)} className="flip" aria-label={`${it.title}${it.subtitle ? `, ${it.subtitle}` : ""}`}>
                <div className="flip-in">
                  <div className="flip-f">
                    {!l.hide("pic") && <div className="ico">{it.media[0] ? <Cover m={it.media[0]} style={vt(it.id)} /> : <i className="ti ti-bookmark" />}</div>}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {it.category && <span className="chip">{it.category}</span>}
                      {it.status && <span className="chip line">{it.status}</span>}
                    </div>
                    <h3>{it.title}</h3>
                    {it.subtitle && !l.hide("subtitle") && <div className="sub">{it.subtitle}</div>}
                  </div>
                  <div className="flip-b" aria-hidden>
                    {(it.date_label || it.location) && !l.hide("date") && <span className="flip-meta">{[it.date_label, it.location].filter(Boolean).join(" · ")}</span>}
                    <span className="flip-text">{it.type === "poll" ? "A poll. Open it to vote." : excerpt(it.body, 130) || it.subtitle}</span>
                    {it.tags.length > 0 && !l.hide("tags") && <span className="flip-tags">{it.tags.map((t) => `#${t}`).join(" ")}</span>}
                    <span className="more">Full view →</span>
                  </div>
                </div>
              </a>
              <div className="card-foot plain"><R id={it.id} /><FullView to={href(section, it)} label={it.title} /></div>
            </div>
          ); })}
        </>
      ));
    return (
      <div className={`shelf reveal r3${st}`}>
        {items.map((it) => { const l = lookFor(it); return (
          <div key={it.id} className={`shelf-row${l.className}`} style={l.style}>
            <CardLink to={href(section, it)} label={it.title} />
            <div className="shelf-ico">{it.media[0] && !l.hide("pic") ? <Cover m={it.media[0]} style={vt(it.id)} /> : <i className="ti ti-bookmark" style={{ color: "var(--mint-deep)" }} />}</div>
            <div>
              <h3>{it.title}</h3>
              {it.subtitle && !l.hide("subtitle") && <div className="sub">{it.subtitle}</div>}
              <Meta it={it} showCat={false} hideDate={l.hide("date")} />
              {it.tags.length > 0 && !l.hide("tags") && <div className="tags">{it.tags.map((t) => <span key={t}>{t}</span>)}</div>}
              <div className="card-foot plain"><R id={it.id} /><FullView to={href(section, it)} label={it.title} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {it.status && <span className="chip line">{it.status}</span>}
              {it.category && <span className="chip">{it.category}</span>}
            </div>
          </div>
        ); })}
      </div>
    );
  }

  if (L === "stream")
    return (
      <div className={`stream reveal r3${st}`}>
        {items.map((it) => { const l = lookFor(it); return (
          <article key={it.id} className={`post${l.className}`} style={l.style}>
            <div className="dotline"><div className="d" style={MOODS[it.mood] ? { background: MOODS[it.mood].color } : undefined} /><div className="l" /></div>
            <div className="post-main">
              <CardLink to={href(section, it)} label={it.title} />
              <Meta it={it} hideDate={l.hide("date")} showStatus />
              <h3><a href={href(section, it)}>{it.pinned ? "📌 " : ""}{it.title}</a></h3>
              {it.subtitle && !l.hide("subtitle") && <p className="sub">{it.subtitle}</p>}
              {it.type === "poll" ? (
                <PollCard id={it.id} options={it.poll_options} confetti={fx.confetti} />
              ) : (
                <>
                  {it.media[0] && !l.hide("pic") && (it.media[0].type === "video"
                    ? <video className="post-media" src={it.media[0].url} controls playsInline preload="metadata" style={vt(it.id)} />
                    : <div className="pic-box"><Cover m={it.media[0]} className="post-media" style={vt(it.id)} />{it.media[0].type === "pdf" && <MediaBadges media={[it.media[0]]} />}{zoom(it)}</div>)}
                  {it.media.length > 1 && <a className="more-media" href={href(section, it)}>+{it.media.length - 1} more →</a>}
                  {it.body.length > 420
                    ? <p className="md" style={{ margin: 0 }}>{excerpt(it.body, 380)}</p>
                    : <Markdown>{it.body}</Markdown>}
                </>
              )}
              <LinkButtons it={it} />
              {it.tags.length > 0 && !l.hide("tags") && <div className="tags">{it.tags.map((t) => <span key={t}>{t}</span>)}</div>}
              <div className="card-foot plain"><R id={it.id} /><FullView to={href(section, it)} label={it.title} /></div>
            </div>
          </article>
        ); })}
      </div>
    );

  // milestones as a map: stops on a trail that travels sideways, however many there are
  if (L === "timeline" && fx.milemap) {
    const zones = [...new Set(items.map((it) => it.category).filter(Boolean))];
    const zoneColor = (c: string) => ["var(--mint)", "var(--pop2)", "var(--pop3)"][Math.max(0, zones.indexOf(c)) % 3];
    return (
      <>
        {zones.length > 1 && (
          <div className="zones reveal r3">
            {zones.map((z) => (
              <a key={z} className="zone" href={`/s/${section.slug}?c=${encodeURIComponent(z)}`} style={{ ["--z" as string]: zoneColor(z) }}>
                <i aria-hidden />{z}<b>{items.filter((it) => it.category === z).length}</b>
              </a>
            ))}
          </div>
        )}
        <SideRow className="mile-map" fx={{ ...rowFx, marks: true }}>
          {items.map((it, i) => {
            const l = lookFor(it), pic = it.media[0] && !l.hide("pic"), low = i % 2 === 1;
            return (
              <div key={it.id} className={`mstop${low ? " low" : ""}`} style={{ ...l.style, ["--z" as string]: zoneColor(it.category) }}>
                <div className="stop-head">
                  <span className="stop-pin"><i className={`ti ti-${medalFor(it)}`} aria-hidden /></span>
                  {it.date_label && !l.hide("date") && <span className="stop-date">{it.date_label}</span>}
                  {i < items.length - 1 && (
                    <svg className="stop-trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                      <path className="t-base" d={low ? "M0 100 C50 100 50 0 100 0" : "M0 0 C50 0 50 100 100 100"} />
                      <path className="t-lit" d={low ? "M0 100 C50 100 50 0 100 0" : "M0 0 C50 0 50 100 100 100"} />
                    </svg>
                  )}
                </div>
                <div className={`card stop-card${it.body.trim() || it.type === "poll" ? " with-text" : ""}${pic ? "" : " no-pic"}${l.className}`}>
                  <Box foot={foot(it.id)} to={href(section, it)} label={it.title}>
                    <CardLink to={href(section, it)} label={it.title} />
                    {pic && <div className="pic-box"><div className="card-media"><Cover m={it.media[0]} className="card-img" style={vt(it.id)} /><MediaBadges media={it.media} /></div>{zoom(it)}</div>}
                    <div className="card-body">
                      {it.category && <span className="chip stop-zone">{it.category}</span>}
                      <h3>{it.title}</h3>
                      {it.subtitle && !l.hide("subtitle") && <p className="sub">{it.subtitle}</p>}
                      {(it.location || it.status || it.mood) && !l.hide("date") && (
                        <div className="meta">
                          {it.status && <span className="chip line">{it.status}</span>}
                          {it.location && <span><i className="ti ti-map-pin" style={{ fontSize: 12 }} /> {it.location}</span>}
                          {it.mood && <Mood mood={it.mood} />}
                        </div>
                      )}
                      {it.type === "poll" ? <PollCard id={it.id} options={it.poll_options} confetti={fx.confetti} /> : <Markdown className="md ex">{it.body}</Markdown>}
                      <LinkButtons it={it} />
                      {it.tags.length > 0 && !l.hide("tags") && <div className="tags">{it.tags.map((t) => <span key={t}>{t}</span>)}</div>}
                    </div>
                  </Box>
                </div>
              </div>
            );
          })}
        </SideRow>
      </>
    );
  }

  if (L === "timeline")
    return (
      <div className={`tline reveal r3${fx.timeline ? " draw" : ""}`}>
        {fx.timeline && <i className="tl-head" aria-hidden />}
        {items.map((it) => { const l = lookFor(it); return (
          <div key={it.id} className={`tl-row ${it.mood}${l.className}`} style={{ ...l.style, ["--dot" as string]: MOODS[it.mood]?.color ?? "var(--mint)" }}>
            <CardLink to={href(section, it)} label={it.title} />
            <Meta it={it} hideDate={l.hide("date")} />
            <h3>{it.title}</h3>
            {(it.subtitle || it.body) && !(l.hide("subtitle") && !it.body) && <p>{(!l.hide("subtitle") && it.subtitle) || excerpt(it.body, 180)}</p>}
            <div className="card-foot plain"><R id={it.id} /><FullView to={href(section, it)} label={it.title} /></div>
          </div>
        ); })}
      </div>
    );

  if (L === "photos") {
    if (fx.lightbox)
      return <PhotoGrid className={grid ? `photogrid reveal r3${st}` : `photogrid${st}`} reactions={fx.reactions} row={grid ? undefined : rowFx}
        items={items.map((it) => { const l = lookFor(it); return { id: it.id, talk: it.talk, title: it.title, media: l.hide("pic") ? [] : it.media, href: href(section, it), className: l.className, style: l.style, info: photoInfo(it, l) }; })} />;
    return row("photogrid", (
      <>
        {items.map((it) => { const l = lookFor(it); return (
          <div key={it.id} className={`ph-cell${l.className}`} style={l.style}>
            {it.media[0] && !l.hide("pic") ? (
              <a href={href(section, it)} className="ph-tile">
                <Cover m={it.media[0]} alt={it.title} style={vt(it.id)} />
                <span className="cap">{it.title}</span>
                <MediaBadges media={it.media} />
              </a>
            ) : (
              <a href={href(section, it)} className="ph-tile txt">{it.title}</a>
            )}
            <PhotoInfo title={it.title} href={href(section, it)} info={photoInfo(it, l)} />
            <div className="card-foot plain"><R id={it.id} /><FullView to={href(section, it)} label={it.title} /></div>
          </div>
        ); })}
      </>
    ));
  }

  if (L === "notes")
    return row("notes", (
      <>
        {items.map((it, i) => { const l = lookFor(it); return (
          <div key={it.id} className={`note ${i === 0 && it.body.length > 280 ? "wide" : ""}${it.body.trim() || it.type === "poll" ? " with-text" : ""}${l.className}`} style={l.style}>
            <Box foot={foot(it.id)} to={href(section, it)} label={it.title}>
              <CardLink to={href(section, it)} label={it.title} />
              {it.category && it.category !== it.title && <span className="chip" style={{ alignSelf: "flex-start" }}>{it.category}</span>}
              <h3>{it.title}</h3>
              {it.subtitle && !l.hide("subtitle") && <p className="sub">{it.subtitle}</p>}
              <Meta it={it} showCat={false} hideDate={l.hide("date")} showStatus />
              {it.media[0] && !l.hide("pic") && <div className="pic-box"><Cover m={it.media[0]} className="note-media" />{it.media[0].type === "pdf" && <MediaBadges media={[it.media[0]]} />}{zoom(it)}</div>}
              {it.type === "poll" ? <PollCard id={it.id} options={it.poll_options} confetti={fx.confetti} /> : <Markdown>{it.body}</Markdown>}
              <LinkButtons it={it} />
              {it.tags.length > 0 && !l.hide("tags") && <div className="tags">{it.tags.map((t) => <span key={t}>{t}</span>)}</div>}
            </Box>
          </div>
        ); })}
      </>
    ));

  // trips as boarding passes on a route, with a little vehicle travelling along it
  if (L === "tickets") {
    const trip = tripContext(settings, section);
    const kinds = items.map(vehicleFor);
    const cells = items.map((it, i) => {
      const l = lookFor(it);
      const pic = it.media[0] && !l.hide("pic");
      const next = isNextTrip(it);
      const frame = frameFor(it.category);
      const view = passView(it, { ...trip, index: i, hideDate: l.hide("date") });
      const picture = pic
        ? <div className="pic-box"><div className="ph has-pic"><Cover m={it.media[0]} style={vt(it.id)} /><MediaBadges media={it.media} /></div>{zoom(it)}</div>
        : !l.hide("pic") && !it.media[0] ? <div className="tkt-art" aria-hidden><Vehicle kind={kinds[i]} /></div> : null;
      const date = frame !== "ticket" && it.date_label && !l.hide("date"); // a pass shows its date at the top
      const place = it.location && !l.hide("date");
      const body: FrameBody = ({ above, showTitle, inText, list, stub }) => (
        <Box foot={foot(it.id)} to={href(section, it)} label={it.title} stub={stub}>
          <CardLink to={href(section, it)} label={it.title} />
          {above}
          <div className="tb">
            {showTitle && <h3>{it.title}</h3>}
            {inText}
            {it.subtitle && !l.hide("subtitle") && <p className="sub">{it.subtitle}</p>}
            {(date || place || it.mood) && (
              <dl className="tkt-fields">
                {date && <div><dt>Date</dt><dd>{it.date_label}</dd></div>}
                {place && <div><dt>Place</dt><dd>{it.location}</dd></div>}
                {it.mood && <div><dt>Mood</dt><dd><Mood mood={it.mood} /></dd></div>}
              </dl>
            )}
            {list}
            {it.type === "poll" ? <PollCard id={it.id} options={it.poll_options} confetti={fx.confetti} /> : <Markdown className="md ex">{it.body}</Markdown>}
            <LinkButtons it={it} />
            {it.tags.length > 0 && !l.hide("tags") && <div className="tags">{it.tags.map((t) => <span key={t}>{t}</span>)}</div>}
          </div>
        </Box>
      );
      return (
        <div key={it.id} className={`tkt-cell${i === 0 ? " first" : ""}${i === items.length - 1 ? " last" : ""}${next ? " next" : ""}${!picture && view.stamp ? " tkt-nopic" : ""}${l.className}`} style={l.style}>
          {!grid && <div className="tkt-stop" aria-hidden><i /></div>}
          {/* the size and look settings go here too, because a frame's own picture size would otherwise win over the owner's */}
          <div className={`trip tkt fr-${frame}${view.report || view.depart || view.journey ? " timed" : ""}${it.body.trim() ? " with-text" : ""}`} style={l.style}>
            <TripFrame view={view} link={<a className="tkt-link" href={href(section, it)} tabIndex={-1} aria-hidden />} picture={picture} drawn={!pic} body={body} />
          </div>
        </div>
      );
    });
    return row("grid3 tkt-row", <>{cells}{!grid && fx.tripfx && <TicketRider kinds={kinds} />}</>);
  }

  // achievements on a wall: each entry is the object its subsection names, and a spotlight travels along and wakes the one it reaches
  if (L === "awards") {
    const cells = items.map((it, i) => {
      const l = lookFor(it);
      const first = !l.hide("pic") ? it.media.find((m) => m.type !== "audio") : undefined;
      const v = awardView(it, { fallback: section.nav_label || section.title, index: i, code: section.code, hideSubtitle: l.hide("subtitle"), hideDate: l.hide("date"), hasPic: !!first, owner: settings.fullName, nickname: settings.nickname, avatar: settings.avatarUrl, initials: settings.initials });
      const picture = first ? <div className="pic-box"><div className="ph has-pic"><Cover m={first} style={vt(it.id)} /><MediaBadges media={it.media} /></div>{zoom(it)}</div> : null;
      const body: AwardBody = ({ above, showTitle, showSubtitle, inBody }) => (
        <Box foot={foot(it.id)} to={href(section, it)} label={it.title}>
          <CardLink to={href(section, it)} label={it.title} />
          {inBody}
          <div className="tb">
            {above}
            {showTitle && <h3>{it.title}</h3>}
            {showSubtitle && v.subtitle && <p className="sub">{v.subtitle}</p>}
            {v.fields.length > 0 && <dl className="tkt-fields">{v.fields.map(([k, f]) => <div key={k}><dt>{k}</dt><dd>{f}</dd></div>)}</dl>}
            {it.type === "poll" && <PollCard id={it.id} options={it.poll_options} confetti={fx.confetti} />}
            {it.body.trim() && <Markdown className="md ex">{it.body}</Markdown>}
            <Meta it={{ ...it, date_label: v.dateInArt ? "" : it.date_label, status: v.statusInArt ? "" : it.status }} showCat={false} hideDate={l.hide("date")} showStatus />
            <LinkButtons it={it} />
            {it.tags.length > 0 && !l.hide("tags") && <div className="tags">{it.tags.map((t) => <span key={t}>{t}</span>)}</div>}
          </div>
        </Box>
      );
      return (
        <div key={it.id} className={`tkt-cell aw-cell${i === 0 ? " first" : ""}${i === items.length - 1 ? " last" : ""}${l.className}`} style={l.style}>
          <div className={`trip tkt aw on-${v.look}`} style={l.style}>
            <AwardFrame view={v} link={<a className="tkt-link" href={href(section, it)} tabIndex={-1} aria-hidden />} picture={picture} body={body}
              back={first && (first.type === "image" || (first.type === "pdf" && first.thumb)) ? <Cover m={first} className="arf-fill" /> : undefined} />
          </div>
        </div>
      );
    });
    return row("grid3 tkt-row aw-row", <>{cells}{!grid && items.length > 0 && items.length <= 2 && <AwardMore />}{!grid && fx.awardfx && <TicketRider className="aw-rider" count={items.length}><i className="aw-can" /><i className="aw-cone" /></TicketRider>}</>);
  }

  // short thoughts as a comic: each entry is a panel its subsection picks, and a brain flies along and pops the one it reaches
  if (L === "comic") {
    const cells = items.map((it, i) => {
      const l = lookFor(it);
      const first = !l.hide("pic") ? it.media.find((m) => m.type !== "audio") : undefined;
      const v = comicView(it, { code: section.code, fallback: section.nav_label || section.title, index: i, hideSubtitle: l.hide("subtitle"), hasPic: !!first });
      const poll = it.type !== "poll" ? null : v.look === "buttons"
        ? <PollCard id={it.id} options={it.poll_options} confetti={fx.confetti} />
        : <ComicPoll id={it.id} options={it.poll_options} look={v.look as "scale" | "vs" | "quick" | "slash" | "quad"} word={v.word} confetti={fx.confetti} />;
      const says = v.subtitle ? <p className="sub">{v.subtitle}</p> : null;
      const body: ComicBody = ({ above, withPoll }) => (
        <Box foot={foot(it.id)} to={href(section, it)} label={it.title}>
          <CardLink to={href(section, it)} label={it.title} />
          <div className="tb">
            {above}
            {v.look !== "poem" && says}
            {withPoll && poll}
            {v.look === "poem"
              ? v.verses.map((line, n) => <Markdown key={n} className="md ex cm-verse">{line}</Markdown>)
              : v.text.trim() && <div className="cm-box"><Markdown className="md ex">{v.text}</Markdown></div>}
            {v.look === "poem" && says}
            <Meta it={v.look === "vibe" && v.mood ? { ...it, mood: "" } : it} showCat={false} hideDate={l.hide("date")} showStatus />
            <LinkButtons it={it} />
            {it.tags.length > 0 && !l.hide("tags") && <div className="tags">{it.tags.map((t) => <span key={t}>{t}</span>)}</div>}
          </div>
        </Box>
      );
      return (
        <div key={it.id} className={`tkt-cell cm-cell${i === 0 ? " first" : ""}${i === items.length - 1 ? " last" : ""}${l.className}`} style={l.style}>
          {!grid && fx.comicfx && <div className="cm-sky" aria-hidden />}
          <div className={`trip tkt cm${it.body.trim() ? " with-text" : ""}`} style={l.style}>
            <ComicFrame view={v} link={<a className="tkt-link" href={href(section, it)} tabIndex={-1} aria-hidden />} first={first} fixedPic={"--pic" in (l.style ?? {})} picStyle={vt(it.id)} zoom={first ? zoom(it) : null} poll={poll} body={body} />
          </div>
        </div>
      );
    });
    return row("grid3 tkt-row cm-row", <>{cells}{!grid && items.length > 0 && items.length <= 2 && <ComicMore sky={fx.comicfx} />}{!grid && fx.comicfx && <TicketRider className="cm-rider" count={items.length}><FlyingBrain /></TicketRider>}</>);
  }

  // what shaped the owner: each entry is the object its subsection names, standing on a shelf under a travelling lamp
  if (L === "study") {
    const cells = items.map((it, i) => {
      const l = lookFor(it);
      const v = studyView(it, { code: section.code, fallback: section.nav_label || section.title, index: i, hideSubtitle: l.hide("subtitle") });
      const first = !l.hide("pic") ? it.media.find((m) => m.type !== "audio") : undefined;
      const sound = it.media.find((m) => m.type === "audio");
      const movie = first?.type === "video" && v.media === "video";
      const out = it.links.find((x) => /^https?:/.test(x.url));
      const picture = first ? <div className="pic-box"><div className="ph has-pic"><Cover m={first} style={vt(it.id)} /><MediaBadges media={it.media} /></div>{zoom(it)}</div> : null;
      const date = it.date_label && !l.hide("date");
      const place = it.location && !l.hide("date");
      const body: StudyBody = ({ above, showTitle }) => (
        <Box foot={foot(it.id)} to={href(section, it)} label={it.title}>
          <CardLink to={href(section, it)} label={it.title} />
          {above}
          <div className="tb">
            {showTitle && <h3>{it.title}</h3>}
            {showTitle && v.subtitle && <p className="sub">{v.subtitle}</p>}
            {v.line && <p className="sty-line"><span>{v.line}</span></p>}
            {(date || place || it.mood) && (
              <dl className="tkt-fields">
                {date && <div><dt>Date</dt><dd>{it.date_label}</dd></div>}
                {place && <div><dt>Place</dt><dd>{it.location}</dd></div>}
                {it.mood && <div><dt>Mood</dt><dd><Mood mood={it.mood} /></dd></div>}
              </dl>
            )}
            {it.type === "poll" ? <PollCard id={it.id} options={it.poll_options} confetti={fx.confetti} /> : <Markdown className="md ex">{it.body}</Markdown>}
            <LinkButtons it={it} />
            {it.tags.length > 0 && !l.hide("tags") && <div className="tags">{it.tags.map((t) => <span key={t}>{t}</span>)}</div>}
          </div>
        </Box>
      );
      return (
        <div key={it.id} className={`tkt-cell sty-cell${i === 0 ? " first" : ""}${i === items.length - 1 ? " last" : ""}${l.className}`} style={l.style}>
          {!grid && <div className="sty-rail" aria-hidden />}
          <div className={`trip tkt st-${v.look}${it.body.trim() || v.line ? " with-text" : ""}`} style={l.style}>
            <StudyFrame view={v} link={<a className="tkt-link" href={href(section, it)} tabIndex={-1} aria-hidden />} picture={picture} first={first} zoom={first ? zoom(it) : null} canPlay={!!sound || movie}
              play={<TvPlay audio={movie ? undefined : sound?.url} video={movie} href={out?.url} title={it.title} />} body={body} />
          </div>
          <div className="sty-plank" aria-hidden />
        </div>
      );
    });
    return row("grid3 tkt-row sty-row", <>{cells}{!grid && items.length <= 2 && <ShelfDecor />}{!grid && fx.studyfx && <TicketRider className="sty-lamp" count={items.length}><ShelfLamp /></TicketRider>}</>);
  }

  // projects as app windows on a desktop, with a dock of icons below
  if (L === "windows") {
    const windows = items.map((it) => {
      const l = lookFor(it);
      const pic = it.media[0] && !l.hide("pic");
      const link = it.links.find((x) => /^https?:/.test(x.url));
      const code = !it.media[0] && !l.hide("pic") && it.type !== "poll"; // its tags are then in the code
      const status = it.status && !(it.pinned && /feature/i.test(it.status)) ? it.status : "";
      return (
        <div key={it.id} className={`card win${pic ? "" : " no-pic"}${it.body.trim() || it.type === "poll" ? " with-text" : ""}${l.className}`} style={l.style}>
          <div className="win-head">
            <a className="win-chrome" href={href(section, it)} tabIndex={-1} aria-hidden />
            <div className="win-bar">
              <span className="win-dots" aria-hidden><i /><i /><i /></span>
              <span className="win-name">{it.category || section.nav_label || section.title}</span>
              {it.pinned && <span className="win-flag">★ featured</span>}
              {status && <span className={`win-status${/progress|build|work|doing|wip|soon/i.test(status) ? " busy" : ""}`}><i aria-hidden />{status}</span>}
            </div>
            <div className="win-url">
              <i className={`ti ti-${link ? "lock" : "folder"}`} aria-hidden />
              {link
                ? <a href={link.url} target="_blank" rel="noopener noreferrer"><span>{shortUrl(link.url)}</span><i className="ti ti-arrow-up-right" aria-hidden /></a>
                : <span>{`~/${section.slug}/${fileName(it.title)}`}</span>}
            </div>
          </div>
          <Box foot={foot(it.id)} to={href(section, it)} label={it.title}>
            <CardLink to={href(section, it)} label={it.title} />
            {pic && <div className="pic-box"><div className="card-media"><Cover m={it.media[0]} className="card-img" style={vt(it.id)} /><MediaBadges media={it.media} /></div>{zoom(it)}</div>}
            {code && <CodeView it={it} hideSubtitle={l.hide("subtitle")} hideTags={l.hide("tags")} hideDate={l.hide("date")} />}
            <div className="card-body">
              <h3>{it.title}</h3>
              {it.subtitle && !l.hide("subtitle") && !code && <p className="sub">{it.subtitle}</p>}
              <Meta it={it} showCat={false} hideDate={l.hide("date") || code} />
              {it.type === "poll" ? <PollCard id={it.id} options={it.poll_options} confetti={fx.confetti} /> : <Markdown className="md ex">{it.body}</Markdown>}
              <LinkButtons it={it} />
              {it.tags.length > 0 && !l.hide("tags") && !code && <div className="tags">{it.tags.map((t) => <span key={t}>{t}</span>)}</div>}
            </div>
          </Box>
        </div>
      );
    });
    const dock = items.map((it) => {
      const m = lookFor(it).hide("pic") ? undefined : it.media[0];
      return { title: it.title, href: href(section, it), pic: m?.type === "image" ? m.url : m?.thumb ?? "" };
    });
    return row("grid3 win-row", <>{windows}</>, <Dock items={dock} />);
  }

  // cards (default); as a bento grid the first (featured) card gets the big tile
  const bento = fx.bento && items.length >= 3 && !grid;
  const tile = (i: number) => (!bento ? "" : i === 0 ? " b-big" : i % 4 === 3 ? " b-wide" : "");
  return row(`grid3${bento ? " bento" : ""}`, (
    <>
      {items.map((it, i) => { const l = lookFor(it); const pic = it.media[0] && !l.hide("pic"); return (
        <div key={it.id} className={`card${tile(i)}${pic ? "" : " no-pic"}${it.body.trim() || it.type === "poll" ? " with-text" : ""}${l.className}`} style={l.style}>
          {it.pinned && <span className="chip dark pin-badge">★ featured</span>}
          <Box foot={foot(it.id)} to={href(section, it)} label={it.title}>
            <CardLink to={href(section, it)} label={it.title} />
            {pic && <div className="pic-box"><div className="card-media"><Cover m={it.media[0]} className="card-img" style={vt(it.id)} /><MediaBadges media={it.media} /></div>{zoom(it)}</div>}
            <div className="card-body">
              <div className="card-top">
                {it.category ? <span className="chip">{it.category}</span> : <span />}
                {it.status && !it.pinned && <span className="chip line">{it.status}</span>}
              </div>
              <h3>{it.title}</h3>
              {it.subtitle && !l.hide("subtitle") && <p className="sub">{it.subtitle}</p>}
              <Meta it={it} showCat={false} hideDate={l.hide("date")} />
              {it.type === "poll" ? <PollCard id={it.id} options={it.poll_options} confetti={fx.confetti} /> : <Markdown className="md ex">{it.body}</Markdown>}
              <LinkButtons it={it} />
              {it.tags.length > 0 && !l.hide("tags") && <div className="tags">{it.tags.map((t) => <span key={t}>{t}</span>)}</div>}
            </div>
          </Box>
        </div>
      ); })}
    </>
  ));
}
