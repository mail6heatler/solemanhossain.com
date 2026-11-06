import { getLookCounts, getSampleItem, getSections, getSettings } from "@/lib/data";
import { resetAllLooks, saveLook } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { isCustom } from "@/lib/contentStyle";
import { ConfirmSubmit } from "@/components/admin/Widgets";
import LookControls from "@/components/admin/LookControls";
import { lookSample } from "@/components/admin/lookSample";

export default async function ContentControls() {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const [settings, sections, counts, sample] = await Promise.all([getSettings(), getSections(), getLookCounts(), getSampleItem()]);
  const anything = isCustom(settings.contentStyle) || sections.some((s) => isCustom(s.style)) || counts.size > 0;

  return (
    <div className="adm-page">
      <h1 className="adm-h">Content sizes</h1>
      <p className="adm-sub">
        Control every card, post and poll at once. A section&apos;s own settings override these, and one entry&apos;s own settings override both.
      </p>

      <form action={saveLook}>
        <input type="hidden" name="kind" value="all" />
        <div className="adm-label">All content</div>
        <div className="c f">
          <LookControls initial={settings.contentStyle} sample={lookSample(sample)} layout="cards" level="all content" />
        </div>
      </form>

      <div className="adm-label">Sections and entries with their own settings</div>
      {sections.map((s) => {
        const own = isCustom(s.style), n = counts.get(s.id) ?? 0;
        return (
          <div key={s.id} className="c c-row hov">
            <div className="grow">
              <div className="c-title"><a href={`/admin/s/${s.id}#look`}>{s.code ? `${s.code} · ` : ""}{s.title}</a></div>
              <div className="c-desc">
                {own ? "Section has its own settings" : "Follows all content"}
                {n > 0 ? ` · ${n} ${n === 1 ? "entry has" : "entries have"} their own` : ""}
              </div>
            </div>
            <a href={`/admin/s/${s.id}#look`} className="b-out b-sm"><i className="ti ti-adjustments" />Adjust</a>
          </div>
        );
      })}

      <form action={resetAllLooks} className="c c-row" style={{ marginTop: 24 }}>
        <div className="grow">
          <div className="c-title">Back to default, everywhere</div>
          <div className="c-desc">Clears these settings at all three levels: all content, every section and every entry. Your text, pictures and reactions aren&apos;t touched.</div>
        </div>
        {anything
          ? <ConfirmSubmit message="Clear every size and look setting on all content, sections and entries? You'd have to set them again." className="b-out b-sm"><i className="ti ti-restore" />Default everywhere</ConfirmSubmit>
          : <span className="c-desc">Everything is on default</span>}
      </form>
    </div>
  );
}
