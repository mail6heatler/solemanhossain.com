import { Fragment } from "react";
import { getSettings, getSections, getItems, getItemCounts, getMessages, getReactionTotals } from "@/lib/data";
import { SiteShell, FloatingEmojis } from "@/components/site/Chrome";
import SectionBody from "@/components/site/SectionBody";
import { LivePill } from "@/components/site/HeroFx";
import HeroView, { heroStats } from "@/components/site/HeroView";
import HeroScene from "@/components/site/HeroScene";
import Intro from "@/components/site/Intro";
import { Split, Words } from "@/components/site/Split";
import { isConnectLayout } from "@/lib/settings";

export const revalidate = 300;

export default async function Home() {
  const [settings, sections, counts, reactions] = await Promise.all([getSettings(), getSections({ visibleOnly: true }), getItemCounts(true), getReactionTotals()]);
  const blocks = await Promise.all(
    sections.map(async (s) => ({
      section: s,
      items: await getItems(s.id, { visibleOnly: true, limit: s.home_limit }),
      wall: isConnectLayout(s.layout) ? (await getMessages("public")).slice(0, s.layout === "chat" ? 30 : 8) : undefined,
    }))
  );
  const s = settings;
  const fx = s.effects;
  const stats = heroStats(sections, counts, reactions.total, s.heroDesign, fx.reactions, isConnectLayout);
  return (
    <SiteShell settings={s} sections={sections} onHome>
      {fx.intro && <Intro name={s.nickname || s.fullName} />}
      {/* ═══ HERO ═══ (when it's removed: keep a heading for search engines, and the counter behind the dashboard's "people here now") */}
      {s.heroHidden ? <><h1 className="sr-only">{s.fullName}</h1>{fx.visitors && <div hidden><LivePill /></div>}</> : (
        <HeroView s={s} d={s.heroDesign} stats={stats}
          layers={<>{fx.aurora ? <div className="aurora" aria-hidden /> : <><div className="blob blob-1" /><div className="blob blob-2" /><div className="blob blob-3" /></>}{fx.hero3d && <HeroScene />}</>}
          emojis={<FloatingEmojis emojis={s.heroEmojis} enabled={fx.emojis} hero />} />
      )}

      {/* ═══ SECTIONS ═══ */}
      {blocks.map(({ section, items, wall }, i) => {
        const total = counts.get(section.id) ?? 0;
        const ribbonText = `${section.nav_emoji ? `${section.nav_emoji} ` : ""}${section.title}`;
        const ribbon = fx.ribbons && section.ribbon && !(s.heroHidden && i === 0) && (
          <div className={`ribbon ${i % 2 === 1 ? "rev" : ""} ${i === 0 ? "first" : ""}`} aria-hidden style={s.ribbonSize === 100 ? undefined : ({ "--rib": s.ribbonSize / 100 } as React.CSSProperties)}>
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
                {!isConnectLayout(section.layout) && total > items.length && (
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
