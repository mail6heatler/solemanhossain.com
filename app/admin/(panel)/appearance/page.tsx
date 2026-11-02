import { getSettings } from "@/lib/data";
import { saveAppearance } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { EFFECTS, MOODS, SKINS, SKIN_LABELS } from "@/lib/settings";

const GROUP_INTRO: Record<string, string> = {
  Hero: "The first screen visitors see.",
  Motion: "What happens while people scroll and click between pages.",
  Fun: "Little surprises that make the site feel alive.",
  Layout: "How some sections are laid out.",
};

export default async function AppearancePage() {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const s = await getSettings();
  const groups = Array.from(new Set(EFFECTS.map((e) => e.group)));

  return (
    <form action={saveAppearance} className="adm-page">
      <h1 className="adm-h">Appearance</h1>
      <p className="adm-sub">Theme, mood, status and every effect on your site, in one place</p>

      <div className="adm-label">Theme</div>
      <div className="c f">
        <div className="f2">
          <div className="fl">
            <label htmlFor="defaultTheme">Theme visitors see first</label>
            <select id="defaultTheme" name="defaultTheme" defaultValue={s.defaultTheme}>
              {SKINS.map((k) => <option key={k} value={k}>{SKIN_LABELS[k]}</option>)}
            </select>
            <div className="hint">Auto shows Day calm until 6 PM in your clock&apos;s time zone ({s.timezone}), then Night neon.</div>
          </div>
          <div className="fl">
            <span className="lab">Theme button</span>
            <label className="switch"><input type="checkbox" name="themeSwitch" defaultChecked={s.themeSwitch} />Let visitors switch themes (button in the menu bar)</label>
          </div>
        </div>
      </div>

      <div className="adm-label">Mood &amp; status</div>
      <div className="c f">
        <div className="f2">
          <div className="fl">
            <label htmlFor="mood">Mood of the day (changes the accent colour)</label>
            <select id="mood" name="mood" defaultValue={s.mood}>
              <option value="">— no mood, keep mint —</option>
              {Object.entries(MOODS).map(([k, m]) => <option key={k} value={k}>{m.emoji} {m.label}</option>)}
            </select>
          </div>
          <div className="fl">
            <span className="lab">Mood pill</span>
            <label className="switch"><input type="checkbox" name="showMood" defaultChecked={s.showMood} />Show “Today I&apos;m feeling …” on the homepage</label>
          </div>
        </div>
        <div className="f2">
          <div className="fl">
            <label htmlFor="nowStatus">“Right now” status (leave empty to hide)</label>
            <input className="inp" id="nowStatus" name="nowStatus" defaultValue={s.nowStatus} maxLength={120} placeholder="📖 Reading: Atomic Habits · 🎧 Lo-fi beats" />
          </div>
          <div className="fl">
            <label htmlFor="partyWord">Secret party word (letters only)</label>
            <input className="inp" id="partyWord" name="partyWord" defaultValue={s.partyWord} maxLength={12} pattern="[A-Za-z]*" placeholder="shou" />
            <div className="hint">Visitors who type this anywhere on the site start party mode. The Konami code works too.</div>
          </div>
        </div>
      </div>

      {groups.map((g) => (
        <div key={g}>
          <div className="adm-label">{g} effects <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>{GROUP_INTRO[g]}</span></div>
          <div className="c">
            <div className="switches" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: 10 }}>
              {EFFECTS.filter((e) => e.group === g).map((e) => (
                <label key={e.key} className="switch"><input type="checkbox" name={`fx_${e.key}`} defaultChecked={s.effects[e.key]} />{e.label}</label>
              ))}
            </div>
          </div>
        </div>
      ))}

      <div className="save-bar">
        <button className="b-mint"><i className="ti ti-device-floppy" />Save appearance</button>
        <a href="/" target="_blank" className="b-out"><i className="ti ti-eye" />View site</a>
      </div>
    </form>
  );
}
