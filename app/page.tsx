import { getSettings, getSections, getItems, getItemCounts, getMessages } from "@/lib/data";
import { SiteShell, FloatingEmojis } from "@/components/site/Chrome";
import SectionBody from "@/components/site/SectionBody";
import { Accent } from "@/components/site/Markdown";
import { Clock, TypeOnce } from "@/components/site/Typewriters";

export const revalidate = 300;

export default async function Home() {
  const [settings, sections, counts] = await Promise.all([getSettings(), getSections({ visibleOnly: true }), getItemCounts(true)]);
  const blocks = await Promise.all(
    sections.map(async (s) => ({
      section: s,
      items: await getItems(s.id, { visibleOnly: true, limit: s.home_limit }),
      wall: s.layout === "connect" ? (await getMessages("public")).slice(0, 8) : undefined,
    }))
  );
  const s = settings;
  const skills = s.skills.length ? [...s.skills, ...s.skills] : [];

  return (
    <SiteShell settings={s} sections={sections} onHome>
      {/* ═══ HERO ═══ */}
      <section id="hero" data-spy>
        <div className="blob blob-1" /><div className="blob blob-2" /><div className="blob blob-3" />
        <FloatingEmojis emojis={s.heroEmojis} enabled={s.effects.emojis} hero />
        <div className="hero-inner">
          <div>
            {s.statusText && <div className="status"><span className="pulse" />{s.statusText}</div>}
            <h1>
              <span className="name-line"><span><Accent text={s.headline1} /></span></span>
              {s.headline2 && <span className="name-line"><span><Accent text={s.headline2} /></span></span>}
            </h1>
            {s.subtitle && <p className="hero-sub"><TypeOnce text={s.subtitle} animate={s.effects.typewriter} /></p>}
            {s.roleChips.length > 0 && <div className="roles">{s.roleChips.map((r, i) => <span key={i}>{r}</span>)}</div>}
            {s.timezone && <div className="hero-clock">🕐 Local time: <Clock timezone={s.timezone} label={s.clockLabel} /></div>}
          </div>
          <div className="hero-right">
            <div className="avatar-wrap">
              {s.avatarUrl ? <img src={s.avatarUrl} alt={s.fullName} /> : <div className="avatar-ph">{s.initials || "✦"}</div>}
              <div className="avatar-ring" />
            </div>
            <div className="ctas">
              {s.resumeUrl && s.ctaPrimaryLabel && (
                <a className="btn-mint" href={s.resumeUrl} target="_blank" rel="noopener"><i className="ti ti-download" />{s.ctaPrimaryLabel}</a>
              )}
              {s.ctaSecondaryLabel && <a className="btn-ghost" href={s.ctaSecondaryUrl}><i className="ti ti-send" />{s.ctaSecondaryLabel}</a>}
            </div>
          </div>
        </div>
        {s.scrollCue && <div className="scrollcue"><i className="ti ti-chevron-down" />{s.scrollCue}</div>}
        {skills.length > 0 && (
          <div className="marquee" aria-label="Skills">
            <div className="marquee-track">{skills.map((k, i) => <span key={i} aria-hidden={i >= s.skills.length}>{k}</span>)}</div>
          </div>
        )}
      </section>

      {/* ═══ SECTIONS ═══ */}
      {blocks.map(({ section, items, wall }, i) => {
        const total = counts.get(section.id) ?? 0;
        return (
          <section key={section.id} id={section.slug} data-spy className={`chap ${i % 2 === 1 ? "alt" : ""}`}>
            <FloatingEmojis emojis={section.emojis} enabled={s.effects.emojis} />
            <div className="chap-inner">
              <div className="eyebrow">
                {section.code && <span className="tag">{section.code}</span>}
                {section.eyebrow_emoji && <span className="emo">{section.eyebrow_emoji}</span>} {section.eyebrow}
              </div>
              <div className="chap-head">
                <div>
                  <h2 className="stitle reveal">{section.title}</h2>
                  {section.subtitle && <p className="ssub reveal r2">{section.subtitle}</p>}
                </div>
                {section.layout !== "connect" && total > items.length && (
                  <a className="see-all reveal r2" href={`/s/${section.slug}`}>See all {total} <i className="ti ti-arrow-right" /></a>
                )}
              </div>
              <SectionBody section={section} items={items} settings={s} wall={wall} />
            </div>
          </section>
        );
      })}
    </SiteShell>
  );
}
