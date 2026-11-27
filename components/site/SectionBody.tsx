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
import { vehicleFor } from "./vehicles";
import { tripContext } from "./TripFrame";
import { ShelfDecor, ShelfLamp } from "./StudyFrame";
import { ComicMore } from "./ComicFrame";
import { AwardMore } from "./AwardFrame";
import { Pencil, ScrapMore } from "./ScrapFrame";
import ChatWindow from "./ChatWindow";
import NoteCard from "./NoteCard";
import StickerBar from "./StickerBar";
import WinCard from "./WinCard";
import TripCard from "./TripCard";
import StudyCard from "./StudyCard";
import ComicCard from "./ComicCard";
import AwardCard from "./AwardCard";
import ScrapCard from "./ScrapCard";
import { Box, CardLink, LinkButtons, Meta, Mood, stickerParts } from "./cardParts";
export { Mood };
import { FlyingBrain } from "./comicArt";
import { lookOf, mergeStyles } from "@/lib/contentStyle";

const href = (s: Section, it: Item) => `/s/${s.slug}/${it.id}`;

/** The same name on a card picture and on the entry page's big picture makes it morph between pages. */
export const morphName = (on: boolean, id: number) => (on ? ({ viewTransitionName: `entry-${id}` } as React.CSSProperties) : undefined);

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

  // Connect as one chat window (ChatWindow.tsx): the approved notes are the history, the links are contacts on the left, testimonials are pinned
  // under them as full cards, and the box at the bottom is the same Say hello form. What it says and how it looks is settings.connect.
  if (L === "chat") {
    const notes = (wall ?? []).slice().reverse().map((m) => ({ id: m.id, name: m.name, body: m.body, day: new Date(m.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }), reply: m.wall_reply, hearts: m.hearts }));
    const testi = items.map((it) => ({ id: it.id, title: it.title, body: it.body || it.title, by: it.subtitle, href: href(section, it) }));
    const pins = items.length > 0 ? items.map((it) => { const l = lookFor(it); return (
      <div key={it.id} className={`cw-pin${l.className}`} style={l.style}>
        <Box foot={foot(it.id)} to={href(section, it)} label={it.title}>
          <CardLink to={href(section, it)} label={it.title} />
          <span className="cw-pin-lab">⭐ Pinned{it.category ? ` ${it.category.toLowerCase().replace(/s$/, "")}` : ""}</span>
          <p className="cw-quote">{it.body || it.title}</p>
          <div className="by">{it.subtitle || it.title}</div>
          <LinkButtons it={it} />
        </Box>
      </div>
    ); }) : null;
    return <ChatWindow s={settings} notes={notes} pins={pins} testi={testi} />;
  }

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
                {s.logo ? <img className="link-logo" src={s.logo} alt="" loading="lazy" /> : <i className={`ti ti-${s.icon}`} />}{s.label}
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

  // G1: each note is the card its subsection names (lib/cardLook.ts): an instruction manual, a protest sign, a story, a collectible card, or the plain note
  if (L === "notes") {
    const owner = settings.nickname.trim() || settings.fullName.trim().split(/\s+/)[0] || "";
    const face = settings.avatarUrl ? <img src={settings.avatarUrl} alt="" loading="lazy" /> : (settings.initials || owner.slice(0, 1));
    const perSub = new Map<string, number>(), factNo = new Map<number, number>();
    for (const it of items) { perSub.set(it.category, (perSub.get(it.category) ?? 0) + 1); factNo.set(it.id, perSub.get(it.category)!); }
    return row("notes", (
      <>
        {items.map((it, i) => (
          <NoteCard key={it.id} it={it} l={lookFor(it)} index={i} factNo={factNo.get(it.id) ?? i + 1} bar={(p) => <StickerBar id={it.id} href={href(section, it)} label={it.title} talk={it.talk} parts={stickerParts(p)} reactions={fx.reactions} />} href={href(section, it)}
            owner={owner} face={it.card.face ? <img src={it.card.face} alt="" loading="lazy" /> : face} vt={vt(it.id)} zoom={zoom(it)} confetti={fx.confetti} />
        ))}
      </>
    ));
  }

  // trips as boarding passes on a route, with a little vehicle travelling along it
  if (L === "tickets") {
    const trip = tripContext(settings, section);
    const kinds = items.map(vehicleFor);
    const cells = items.map((it, i) => (
      <TripCard key={it.id} it={it} l={lookFor(it)} index={i} count={items.length} trip={trip} href={href(section, it)} route={!grid} vt={vt(it.id)} zoom={zoom(it)} confetti={fx.confetti}
        bar={(p) => <StickerBar id={it.id} href={href(section, it)} label={it.title} talk={it.talk} parts={stickerParts(p)} reactions={fx.reactions} />} />
    ));
    return row("grid3 tkt-row", <>{cells}{!grid && fx.tripfx && <TicketRider kinds={kinds} />}</>);
  }

  // achievements on a wall: each entry is the object its subsection names, and a spotlight travels along and wakes the one it reaches
  if (L === "awards") {
    const owner = { fullName: settings.fullName, nickname: settings.nickname, avatar: settings.avatarUrl, initials: settings.initials };
    const cells = items.map((it, i) => (
      <AwardCard key={it.id} it={it} l={lookFor(it)} index={i} count={items.length} code={section.code} fallback={section.nav_label || section.title} owner={owner} href={href(section, it)}
        vt={vt(it.id)} zoom={zoom(it)} confetti={fx.confetti} bar={(p) => <StickerBar id={it.id} href={href(section, it)} label={it.title} talk={it.talk} parts={stickerParts(p)} reactions={fx.reactions} />} />
    ));
    return row("grid3 tkt-row aw-row", <>{cells}{!grid && items.length > 0 && items.length <= 2 && <AwardMore />}{!grid && fx.awardfx && <TicketRider className="aw-rider" count={items.length}><i className="aw-can" /><i className="aw-cone" /></TicketRider>}</>);
  }

  // short thoughts as a comic: each entry is a panel its subsection picks, and a brain flies along and pops the one it reaches
  // life outside work: each entry is a page torn from a scrapbook, the one its subsection names, and a pencil travels along the row
  if (L === "scrapbook") {
    const cells = items.map((it, i) => (
      <ScrapCard key={it.id} it={it} l={lookFor(it)} index={i} count={items.length} fallback={section.nav_label || section.title} href={href(section, it)}
        vt={vt(it.id)} zoom={zoom(it)} confetti={fx.confetti} bar={(p) => <StickerBar id={it.id} href={href(section, it)} label={it.title} talk={it.talk} parts={stickerParts(p)} reactions={fx.reactions} />} />
    ));
    return row("grid3 tkt-row sb-row", <>{cells}{!grid && items.length > 0 && items.length <= 2 && <ScrapMore />}{!grid && fx.scrapfx && <TicketRider className="sb-rider" count={items.length}><Pencil /></TicketRider>}</>);
  }

  if (L === "comic") {
    const cells = items.map((it, i) => (
      <ComicCard key={it.id} it={it} l={lookFor(it)} index={i} count={items.length} code={section.code} fallback={section.nav_label || section.title} href={href(section, it)} sky={!grid && fx.comicfx}
        vt={vt(it.id)} zoom={zoom(it)} confetti={fx.confetti} bar={(p) => <StickerBar id={it.id} href={href(section, it)} label={it.title} talk={it.talk} parts={stickerParts(p)} reactions={fx.reactions} />} />
    ));
    return row("grid3 tkt-row cm-row", <>{cells}{!grid && items.length > 0 && items.length <= 2 && <ComicMore sky={fx.comicfx} />}{!grid && fx.comicfx && <TicketRider className="cm-rider" count={items.length}><FlyingBrain /></TicketRider>}</>);
  }

  // what shaped the owner: each entry is the object its subsection names, standing on a shelf under a travelling lamp
  if (L === "study") {
    const cells = items.map((it, i) => (
      <StudyCard key={it.id} it={it} l={lookFor(it)} index={i} count={items.length} code={section.code} fallback={section.nav_label || section.title} href={href(section, it)} rail={!grid}
        vt={vt(it.id)} zoom={zoom(it)} confetti={fx.confetti} bar={(p) => <StickerBar id={it.id} href={href(section, it)} label={it.title} talk={it.talk} parts={stickerParts(p)} reactions={fx.reactions} />} />
    ));
    return row("grid3 tkt-row sty-row", <>{cells}{!grid && items.length <= 2 && <ShelfDecor />}{!grid && fx.studyfx && <TicketRider className="sty-lamp" count={items.length}><ShelfLamp /></TicketRider>}</>);
  }

  // projects as app windows on a desktop, with a dock of icons below
  if (L === "windows") {
    // each window is the app its subsection names (lib/cardLook.ts): a spreadsheet, a code editor, a notes app, a pocket games console, or the browser
    const windows = items.map((it) => (
      <WinCard key={it.id} it={it} l={lookFor(it)} href={href(section, it)} home={section.nav_label || section.title} slug={section.slug} vt={vt(it.id)} zoom={zoom(it)} confetti={fx.confetti}
        bar={(p) => <StickerBar id={it.id} href={href(section, it)} label={it.title} talk={it.talk} parts={stickerParts(p)} reactions={fx.reactions} />} />
    ));
    const dock = items.map((it) => {
      const m = lookFor(it).hide("pic") ? undefined : it.media[0];
      return { title: it.title, href: href(section, it), pic: it.card.face || (m?.type === "image" ? m.url : m?.thumb ?? "") };
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
