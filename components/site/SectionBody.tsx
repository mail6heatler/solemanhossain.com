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
function Box({ children, foot, to, label = "" }: { children: React.ReactNode; foot?: React.ReactNode; to?: string; label?: string }) {
  return (
    <>
      <div className={`scroll-wrap${foot || to ? " has-foot" : ""}`}>
        <div className="scrolly"><div className="flow">{children}</div></div>
        <span className="more-hint" aria-hidden><span className="more-pill"><span className="more-word">Scroll for more</span><i className="ti ti-chevrons-down hint-arrow" /></span></span>
        <i className="scroll-line" aria-hidden><b /></i>
      </div>
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
  const R = ({ id }: { id: number }) => (fx.reactions ? <Reactions id={id} compact /> : null);
  const foot = (id: number) => (fx.reactions ? <Reactions id={id} compact /> : undefined);
  const lookFor = (it: Item) => lookOf(mergeStyles(settings.contentStyle, section.style, it.style));
  const photoInfo = (it: Item, l: ReturnType<typeof lookFor>) => ({
    subtitle: l.hide("subtitle") ? "" : it.subtitle,
    meta: l.hide("date") ? "" : [it.date_label, it.location].filter(Boolean).join(" · "),
    text: excerpt(it.body, 90),
    tags: l.hide("tags") ? [] : it.tags,
  });
  const zoom = (it: Item) => (fx.lightbox && it.media.length > 0 ? <PicZoom media={it.media} title={it.title} /> : null);
  const rowFx: RowFx = { auto: fx.sideways, count: fx.rowcount };
  const row = (className: string, children: React.ReactNode) => grid
    ? <div className={`${className} reveal r3${st}`}>{children}</div>
    : <SideRow className={`${className}${st}`} fx={rowFx}>{children}</SideRow>;

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
        items={items.map((it) => { const l = lookFor(it); return { id: it.id, title: it.title, media: l.hide("pic") ? [] : it.media, href: href(section, it), className: l.className, style: l.style, info: photoInfo(it, l) }; })} />;
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
