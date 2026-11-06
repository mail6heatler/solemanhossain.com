import { getSettings } from "@/lib/data";
import { saveBanner } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { BANNER_KINDS } from "@/lib/settings";
import SaveBox from "@/components/admin/SaveBox";

export default async function BannerPage() {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const s = await getSettings();
  const b = s.banner;
  return (
    <form action={saveBanner} className="adm-page">
      <h1 className="adm-h">Hanging banner</h1>
      <p className="adm-sub">For an emergency notice or anything coming up. A tab hangs under the menu bar on every page. Your banner drops and swings, and it looks different in each theme: a terminal screen on Techy, a neon sign on Retro, a front page on Paper, and so on.</p>

      <div className="c f">
        <label className="switch"><input type="checkbox" name="on" defaultChecked={b.on} />Show the banner on the site</label>
        <label className="switch"><input type="checkbox" name="autoDrop" defaultChecked={b.autoDrop} />Drop down by itself each time someone opens the site</label>
        <div className="hint">Every visit gets it, including people who have seen it before, so nobody has to find the tab. It does not drop again as they move between pages of the site. Turn it off and visitors have to pull the tab themselves. It stays down for a few seconds, then rolls itself back up, and the tab stays. Pulled down by hand, it stays a little longer. It waits while the mouse is moving over it.</div>
      </div>

      <div className="adm-label">What it says</div>
      <div className="c f">
        <div className="f2">
          <div className="fl"><label htmlFor="b-kind">Type</label>
            <select id="b-kind" name="kind" defaultValue={b.kind}>
              {Object.entries(BANNER_KINDS).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}: {v.desc}</option>)}
            </select>
          </div>
          <div className="fl"><label htmlFor="b-tab">Words on the pull tab (optional)</label><input className="inp" id="b-tab" name="tab" defaultValue={b.tab} maxLength={24} placeholder="Pull me" /></div>
        </div>
        <div className="fl"><label htmlFor="b-title">Headline</label><input className="inp" id="b-title" name="title" defaultValue={b.title} maxLength={90} placeholder="Site maintenance on Friday night" /></div>
        <div className="fl"><label htmlFor="b-text">More details (optional)</label><textarea id="b-text" name="text" defaultValue={b.text} maxLength={320} style={{ minHeight: 70 }} placeholder="A sentence or two is plenty." /></div>
        <div className="f2">
          <div className="fl"><label htmlFor="b-ll">Button text (optional)</label><input className="inp" id="b-ll" name="linkLabel" defaultValue={b.linkLabel} maxLength={40} placeholder="Read more" /></div>
          <div className="fl"><label htmlFor="b-lu">Button link</label><input className="inp" id="b-lu" name="linkUrl" defaultValue={b.linkUrl} maxLength={500} placeholder="https://… or /s/feed" /></div>
        </div>
      </div>

      <div className="adm-label">Timing</div>
      <div className="c f">
        <div className="f2">
          <div className="fl"><label htmlFor="b-cd">Live countdown to (optional)</label><input className="inp" type="datetime-local" id="b-cd" name="countdownTo" defaultValue={b.countdownTo} />
            <div className="hint">Shows days, hours, minutes and seconds ticking down. Uses your clock time zone ({s.timezone}).</div></div>
          <div className="fl"><label htmlFor="b-ha">Take it down automatically at (optional)</label><input className="inp" type="datetime-local" id="b-ha" name="hideAfter" defaultValue={b.hideAfter} />
            <div className="hint">After this moment it disappears by itself, so an old notice can&apos;t stay up by accident.</div></div>
        </div>
      </div>

      <SaveBox label="Save banner" desc="Nothing goes live until you save. Preview shows your text to you only.">
        <a href="/?demo=banner" target="_blank" className="b-out"><i className="ti ti-eye" />Preview</a>
      </SaveBox>
    </form>
  );
}
