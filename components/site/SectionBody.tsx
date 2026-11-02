import type { Item, Message, Section } from "@/lib/data";
import { MOODS, type SiteSettings } from "@/lib/settings";
import Markdown, { excerpt } from "./Markdown";
import PollCard from "./PollCard";
import HelloForm from "./HelloForm";

const href = (s: Section, it: Item) => `/s/${s.slug}/${it.id}`;

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

function Empty({ text }: { text: string }) {
  return <div className="empty reveal r3"><i className="ti ti-pencil" />{text || "Nothing here yet."}</div>;
}

export default function SectionBody({ section, items, settings, wall }:
  { section: Section; items: Item[]; settings: SiteSettings; wall?: Message[] }) {
  const L = section.layout;

  if (L === "connect") {
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
        <div className="connect-grid reveal r3">
          <HelloForm title={settings.connectFormTitle} />
          <div className="wall">
            {(items.length > 0 || (wall && wall.length > 0)) && <h3>From the wall</h3>}
            {items.map((it) => (
              <div key={it.id} className="wall-note quote">
                <p>{it.body || it.title}</p>
                <div className="by">— {it.subtitle || it.title}</div>
              </div>
            ))}
            {wall?.map((m) => (
              <div key={m.id} className="wall-note">
                <p>{m.body}</p>
                <div className="by">— {m.name} · {new Date(m.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
              </div>
            ))}
            {items.length === 0 && (!wall || wall.length === 0) && (
              <div className="empty" style={{ marginTop: 0 }}><i className="ti ti-message-heart" />Notes people leave (and you approve) show up here.</div>
            )}
          </div>
        </div>
      </>
    );
  }

  if (!items.length) return <Empty text={section.empty_text} />;

  if (L === "strip")
    return (
      <div className="strip reveal r3">
        {items.map((it) => (
          <a key={it.id} href={href(section, it)} className="trip">
            <div className="ph">{it.image_url ? <img src={it.image_url} alt="" loading="lazy" /> : <i className="ti ti-map-pin" />}</div>
            <div className="tb">
              {it.category && <span className="chip" style={{ alignSelf: "flex-start" }}>{it.category}</span>}
              <h3>{it.title}</h3>
              {(it.location || it.date_label) && (
                <div className="loc"><i className="ti ti-map-pin" />{[it.location, it.date_label].filter(Boolean).join(" · ")}</div>
              )}
            </div>
          </a>
        ))}
      </div>
    );

  if (L === "list")
    return (
      <div className="shelf reveal r3">
        {items.map((it) => (
          <a key={it.id} href={href(section, it)} className="shelf-row">
            <div className="shelf-ico">{it.image_url ? <img src={it.image_url} alt="" loading="lazy" /> : <i className="ti ti-bookmark" style={{ color: "var(--mint-deep)" }} />}</div>
            <div>
              <h3>{it.title}</h3>
              {it.subtitle && <div className="sub">{it.subtitle}</div>}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {it.status && <span className="chip line">{it.status}</span>}
              {it.category && <span className="chip">{it.category}</span>}
            </div>
          </a>
        ))}
      </div>
    );

  if (L === "stream")
    return (
      <div className="stream reveal r3">
        {items.map((it) => (
          <article key={it.id} className="post">
            <div className="dotline"><div className="d" style={MOODS[it.mood] ? { background: MOODS[it.mood].color } : undefined} /><div className="l" /></div>
            <div className="post-main">
              <Meta it={it} />
              <h3><a href={href(section, it)}>{it.pinned ? "📌 " : ""}{it.title}</a></h3>
              {it.type === "poll" ? (
                <PollCard id={it.id} options={it.poll_options} />
              ) : (
                <>
                  {it.image_url && <img src={it.image_url} alt="" loading="lazy" style={{ borderRadius: 12, maxHeight: 360, objectFit: "cover" }} />}
                  {it.body.length > 420
                    ? <p className="md" style={{ margin: 0 }}>{excerpt(it.body, 380)} <a href={href(section, it)}>read more</a></p>
                    : <Markdown>{it.body}</Markdown>}
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    );

  if (L === "timeline")
    return (
      <div className="tline reveal r3">
        {items.map((it) => (
          <a key={it.id} href={href(section, it)} className={`tl-row ${it.mood}`} style={{ ["--dot" as string]: MOODS[it.mood]?.color ?? "var(--mint)" }}>
            <Meta it={it} />
            <h3>{it.title}</h3>
            {(it.subtitle || it.body) && <p>{it.subtitle || excerpt(it.body, 180)}</p>}
          </a>
        ))}
      </div>
    );

  if (L === "photos")
    return (
      <div className="photogrid reveal r3">
        {items.map((it) =>
          it.image_url ? (
            <a key={it.id} href={href(section, it)} className="ph-tile">
              <img src={it.image_url} alt={it.title} loading="lazy" />
              <span className="cap">{it.title}</span>
            </a>
          ) : (
            <a key={it.id} href={href(section, it)} className="ph-tile txt">{it.title}</a>
          )
        )}
      </div>
    );

  if (L === "notes")
    return (
      <div className="notes reveal r3">
        {items.map((it, i) => (
          <div key={it.id} className={`note ${i === 0 && it.body.length > 280 ? "wide" : ""}`}>
            {it.category && it.category !== it.title && <span className="chip" style={{ alignSelf: "flex-start" }}>{it.category}</span>}
            <h3>{it.title}</h3>
            {it.image_url && <img src={it.image_url} alt="" loading="lazy" />}
            {it.type === "poll" ? <PollCard id={it.id} options={it.poll_options} /> : <Markdown>{it.body}</Markdown>}
          </div>
        ))}
      </div>
    );

  // cards (default)
  return (
    <div className="grid3 reveal r3">
      {items.map((it) => (
        <a key={it.id} href={href(section, it)} className="card">
          {it.pinned && <span className="chip dark pin-badge">★ featured</span>}
          {it.image_url && <img className="card-img" src={it.image_url} alt="" loading="lazy" />}
          <div className="card-body">
            <div className="card-top">
              {it.category ? <span className="chip">{it.category}</span> : <span />}
              {it.status && !it.pinned && <span className="chip line">{it.status}</span>}
            </div>
            <h3>{it.title}</h3>
            {it.subtitle && <p className="sub">{it.subtitle}</p>}
            {it.type === "poll" ? <p className="ex">📊 Poll · tap to vote</p> : it.body && <p className="ex">{excerpt(it.body)}</p>}
            {it.tags.length > 0 && <div className="tags">{it.tags.map((t) => <span key={t}>{t}</span>)}</div>}
          </div>
        </a>
      ))}
    </div>
  );
}
