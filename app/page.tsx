import { Fragment } from "react";
import { getSettings, getSections, getItems, getItemCounts, getMessages, getReactionTotals } from "@/lib/data";
import { SiteShell, FloatingEmojis } from "@/components/site/Chrome";
import SectionBody from "@/components/site/SectionBody";
import { Accent } from "@/components/site/Markdown";
import { Clock, TypeOnce } from "@/components/site/Typewriters";
import { AvatarTilt, DecodeText, Greeting, LivePill, Sticker } from "@/components/site/HeroFx";
import HeroScene from "@/components/site/HeroScene";
import Intro from "@/components/site/Intro";
import { Split, Words } from "@/components/site/Split";
import { MOODS } from "@/lib/settings";

export const revalidate = 300;

export default async function Home() {
  const [settings, sections, counts, reactions] = await Promise.all([getSettings(), getSections({ visibleOnly: true }), getItemCounts(true), getReactionTotals()]);
  const blocks = await Promise.all(
    sections.map(async (s) => ({
      section: s,
      items: await getItems(s.id, { visibleOnly: true, limit: s.home_limit }),
      wall: s.layout === "connect" ? (await getMessages("public")).slice(0, 8) : undefined,
    }))
  );
  const s = settings;
  const fx = s.effects;
  const skills = s.skills.length ? [...s.skills, ...s.skills] : [];
  const mood = MOODS[s.mood];
  const place = (s.location || "").split(",")[0].trim();
  // "by the numbers": sections with entries (real counts), plus the reactions total; at most 4 tiles so it lays out evenly
  const showReactions = fx.reactions && reactions.total > 0;
  const stats = [
    ...sections
      .filter((sec) => sec.layout !== "connect" && (counts.get(sec.id) ?? 0) > 0)
      .map((sec) => ({ key: sec.slug, n: counts.get(sec.id) ?? 0, label: sec.nav_label || sec.title, emoji: sec.nav_emoji, to: `#${sec.slug}` }))
      .slice(0, showReactions ? 3 : 4),
    ...(showReactions ? [{ key: "reactions", n: reactions.total, label: "Reactions", emoji: "❤️", to: "" }] : []),
  ];
  const headline = (text: string, delay: number) => (fx.decode || fx.kinetic ? <DecodeText text={text} delay={delay} animate={fx.decode} letters={fx.kinetic} /> : <Accent text={text} />);
  const photo = s.avatarUrl ? <img src={s.avatarUrl} alt={s.fullName} /> : <div className="avatar-ph">{s.initials || "✦"}</div>;
  const avatar = fx.sticker ? <>{photo}<i className="stk-tape a" aria-hidden /><i className="stk-tape b" aria-hidden /></> : photo;
  const framed = fx.tilt ? <AvatarTilt label={`${s.fullName}. Click for confetti`}>{avatar}</AvatarTilt> : <div className="avatar-tilt">{avatar}</div>;

  return (
    <SiteShell settings={s} sections={sections} onHome>
      {fx.intro && <Intro name={s.nickname || s.fullName} />}
      {/* ═══ HERO ═══ */}
      <section id="hero" data-spy>
        {fx.aurora ? <div className="aurora" aria-hidden /> : <><div className="blob blob-1" /><div className="blob blob-2" /><div className="blob blob-3" /></>}
        <i className="tf-band" aria-hidden />
        <i className="tf-a" aria-hidden />
        {fx.hero3d && <HeroScene />}
        <FloatingEmojis emojis={s.heroEmojis} enabled={fx.emojis} hero />
        <div className="hero-inner">
          <div>
            <div className="hero-pills">
              {s.statusText && <div className="status"><span className="pulse" />{s.statusText}</div>}
              {s.showMood && mood && <span className="mood-pill"><i aria-hidden />Today I&apos;m feeling {mood.emoji} {mood.label}</span>}
              {fx.visitors && <LivePill />}
            </div>
            <h1>
              <span className="name-line"><span>{headline(s.headline1, 250)}</span></span>
              {s.headline2 && <span className="name-line"><span>{headline(s.headline2, 450)}</span></span>}
            </h1>
            {s.subtitle && <p className="hero-sub"><TypeOnce text={s.subtitle} animate={fx.typewriter} /></p>}
            {s.roleChips.length > 0 && <div className="roles">{s.roleChips.map((r, i) => <span key={i}>{r}</span>)}</div>}
            {s.nowStatus && <div className="now-pill">{s.nowStatus}</div>}
            {s.timezone && <div className="hero-clock">🕐 Local time: <Clock timezone={s.timezone} label={s.clockLabel} /></div>}
            {fx.greeting && s.timezone && <Greeting timezone={s.timezone} place={place} />}
            {stats.length > 1 && (
              <div className="hero-stats" aria-label="By the numbers" style={{ ["--n" as string]: stats.length }}>
                {stats.map((st) => {
                  const inner = <><b data-count={st.n}>{st.n}</b><span><i aria-hidden>{st.emoji}</i>{st.label}</span></>;
                  return st.to ? <a key={st.key} href={st.to} className="hs">{inner}</a> : <div key={st.key} className="hs">{inner}</div>;
                })}
              </div>
            )}
          </div>
          <div className="hero-right">
            {fx.sticker ? (
              <div className="avatar-wrap sticker"><Sticker>{framed}</Sticker></div>
            ) : (
              <div className="avatar-wrap">
                {fx.tilt ? framed : photo}
                <div className="avatar-ring" />
                {fx.tilt && <div className="avatar-orbit" aria-hidden><i /><i /></div>}
              </div>
            )}
            <div className="ctas">
              {s.resumeUrl && s.ctaPrimaryLabel && (
                <a className={`btn-mint ${fx.magnetic ? "mag" : ""}`} href={s.resumeUrl} target="_blank" rel="noopener"><i className="ti ti-download" />{s.ctaPrimaryLabel}</a>
              )}
              {s.ctaSecondaryLabel && <a className={`btn-ghost ${fx.magnetic ? "mag" : ""}`} href={s.ctaSecondaryUrl}><i className="ti ti-send" />{s.ctaSecondaryLabel}</a>}
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
        const ribbonText = `${section.nav_emoji ? `${section.nav_emoji} ` : ""}${section.title}`;
        const ribbon = fx.ribbons && section.ribbon && (
          <div className={`ribbon ${i % 2 === 1 ? "rev" : ""} ${i === 0 ? "first" : ""}`} aria-hidden>
            <div className="ribbon-track">{Array.from({ length: 20 }, (_, k) => <span key={k}>{ribbonText}</span>)}</div>
          </div>
        );
        return (
          <Fragment key={section.id}>
          {ribbon}
          <section id={section.slug} data-spy data-layout={section.layout} className={`chap ${i % 2 === 1 ? "alt" : ""}`}>
            {fx.ghost && <span className="ghost" aria-hidden>{section.code || String(i + 1).padStart(2, "0")}</span>}
            <FloatingEmojis emojis={section.emojis} enabled={fx.emojis} />
            <div className="chap-inner">
              <div className="eyebrow">
                {section.code && <span className="tag">{section.code}</span>}
                {section.eyebrow_emoji && <span className="emo">{section.eyebrow_emoji}</span>} <span className="eb-t">{section.eyebrow}</span>
              </div>
              <div className="chap-head">
                <div>
                  <h2 className={`stitle reveal ${fx.splittext ? "split-host" : ""}`}><Split text={section.title} on={fx.splittext} /></h2>
                  {section.subtitle && <p className="ssub reveal r2"><Words text={section.subtitle} on={fx.wordscrub} /></p>}
                </div>
                {section.layout !== "connect" && total > items.length && (
                  <a className="see-all reveal r2" href={`/s/${section.slug}`}>See all {total} <i className="ti ti-arrow-right" /></a>
                )}
              </div>
              <SectionBody section={section} items={items} settings={s} wall={wall} />
            </div>
          </section>
          </Fragment>
        );
      })}
    </SiteShell>
  );
}
