import { getItemCounts, getReactionTotals, getSections, getSettings } from "@/lib/data";
import { setHeroHidden } from "@/app/actions";
import { ConfirmSubmit } from "@/components/admin/Widgets";
import { requireAdmin } from "@/lib/auth";
import HeroStudio from "@/components/admin/studio/HeroStudio";
import { Nav } from "@/components/site/Chrome";

/** G0's dashboard page: the hero's live editor, then taking the hero off the homepage or bringing it back. */
export default async function HeroPage() {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const [s, sections, counts, reactions] = await Promise.all([getSettings(), getSections({ visibleOnly: true }), getItemCounts(true), getReactionTotals()]);
  const first = {
    fullName: s.fullName, nickname: s.nickname, initials: s.initials, brandPhrases: s.brandPhrases, statusText: s.statusText, nowStatus: s.nowStatus,
    headline1: s.headline1, headline2: s.headline2, subtitle: s.subtitle, roleChips: s.roleChips, skills: s.skills, location: s.location, timezone: s.timezone,
    clockLabel: s.clockLabel, avatarUrl: s.avatarUrl, resumeUrl: s.resumeUrl, ctaPrimaryLabel: s.ctaPrimaryLabel, ctaSecondaryLabel: s.ctaSecondaryLabel,
    ctaSecondaryUrl: s.ctaSecondaryUrl, heroEmojis: s.heroEmojis, scrollCue: s.scrollCue, heroDesign: s.heroDesign,
  };
  return (
    <div className="adm-page hst-page">
      {s.heroHidden && <div className="c c-row" style={{ marginBottom: 14 }}><div className="grow"><div className="c-title">The hero is off your homepage right now</div><div className="c-desc">You can still edit it here. Bring it back at the bottom of this page.</div></div></div>}
      <HeroStudio first={first} settings={s} useBlob={!!process.env.BLOB_READ_WRITE_TOKEN} reactions={reactions.total}
        sections={sections.map((x) => ({ id: x.id, slug: x.slug, layout: x.layout, nav_label: x.nav_label, title: x.title, nav_emoji: x.nav_emoji }))}
        counts={Object.fromEntries(counts)}
        nav={<div className="hst-nav" inert aria-hidden><Nav settings={s} sections={sections} onHome preview /></div>} />
    {s.heroHidden ? (
      <form action={setHeroHidden} className="c c-row" style={{ marginTop: 14 }}>
        <input type="hidden" name="hidden" value="0" />
        <div className="grow"><div className="c-title">Bring back the hero</div><div className="c-desc">Everything comes back exactly as it was.</div></div>
        <button className="b-mint"><i className="ti ti-arrow-back-up" />Bring back</button>
      </form>
    ) : (
      <form action={setHeroHidden} className="c c-row" style={{ marginTop: 14, borderColor: "color-mix(in srgb, var(--danger) 30%, var(--card-border))" }}>
        <input type="hidden" name="hidden" value="1" />
        <div className="grow"><div className="c-title">Remove the hero</div><div className="c-desc">Takes it off your homepage. Your name, photo, text and résumé stay saved.</div></div>
        <ConfirmSubmit title="Remove the hero from your homepage?" message="Visitors will start at your first section. Your name, photo, text and résumé stay saved, and you can bring it back here with one click." yes="Yes, remove"><i className="ti ti-trash" />Remove</ConfirmSubmit>
      </form>
    )}
    </div>
  );
}
