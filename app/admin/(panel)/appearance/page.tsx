import { getSections, getSettings } from "@/lib/data";
import { saveAppearance } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { EFFECTS, MOODS, SELECTABLE, SKIN_LABELS } from "@/lib/settings";
import { HELP } from "@/lib/help";
import { InfoTip } from "@/components/admin/Widgets";

const GROUP_INTRO: Record<string, string> = {
  Themes: "Extra theme fun for visitors.",
  Hero: "The first screen visitors see.",
  Motion: "What happens while people scroll and click between pages.",
  Transitions: "How one view turns into the next.",
  "3D": "Depth you can feel. All of it is off automatically for visitors who ask for less motion.",
  Text: "How your words arrive and react.",
  Scrolling: "What moves while people scroll.",
  Hover: "What answers the mouse (computers only).",
  Fun: "Little surprises that make the site feel alive.",
  Layout: "How some sections are laid out.",
};

export default async function AppearancePage() {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const [s, sections] = await Promise.all([getSettings(), getSections()]);
  const groups = Array.from(new Set(EFFECTS.map((e) => e.group)));

  return (
    <form action={saveAppearance} className="adm-page">
      <h1 className="adm-h">Appearance</h1>
      <p className="adm-sub">Theme, mood, status and every effect on your site, in one place. Press <b>i</b> next to anything to see what it does and preview it.</p>

      <div className="adm-label">Theme</div>
      <div className="c f">
        <div className="f2">
          <div className="fl">
            <div className="lab-row"><label htmlFor="defaultTheme">Theme visitors see first</label><InfoTip help={HELP.defaultTheme} /></div>
            <select id="defaultTheme" name="defaultTheme" defaultValue={s.defaultTheme}>
              {SELECTABLE.map((k) => <option key={k} value={k}>{SKIN_LABELS[k]}</option>)}
            </select>
            <div className="hint">Auto shows Day calm until 6 PM in your clock&apos;s time zone ({s.timezone}), then Night neon. Random picks a new theme on every visit.</div>
          </div>
          <div className="fl">
            <span className="lab">Theme button</span>
            <div className="sw-row"><label className="switch"><input type="checkbox" name="themeSwitch" defaultChecked={s.themeSwitch} />Let visitors switch themes (button in the menu bar)</label><InfoTip help={HELP.themeSwitch} on={s.themeSwitch} /></div>
          </div>
        </div>
      </div>

      <div className="adm-label">Mood &amp; status</div>
      <div className="c f">
        <div className="f2">
          <div className="fl">
            <div className="lab-row"><label htmlFor="mood">Mood of the day (changes the accent colour)</label><InfoTip help={HELP.mood} /></div>
            <select id="mood" name="mood" defaultValue={s.mood}>
              <option value="">— no mood, keep mint —</option>
              {Object.entries(MOODS).map(([k, m]) => <option key={k} value={k}>{m.emoji} {m.label}</option>)}
            </select>
          </div>
          <div className="fl">
            <span className="lab">Mood pill</span>
            <div className="sw-row"><label className="switch"><input type="checkbox" name="showMood" defaultChecked={s.showMood} />Show “Today I&apos;m feeling …” on the homepage</label><InfoTip help={HELP.showMood} on={s.showMood} /></div>
          </div>
        </div>
        <div className="f2">
          <div className="fl">
            <div className="lab-row"><label htmlFor="nowStatus">“Right now” status (leave empty to hide)</label><InfoTip help={HELP.nowStatus} /></div>
            <input className="inp" id="nowStatus" name="nowStatus" defaultValue={s.nowStatus} maxLength={120} placeholder="📖 Reading: Atomic Habits · 🎧 Lo-fi beats" />
          </div>
          <div className="fl">
            <div className="lab-row"><label htmlFor="partyWord">Secret party word (letters only)</label><InfoTip help={HELP.partyWord} /></div>
            <input className="inp" id="partyWord" name="partyWord" defaultValue={s.partyWord} maxLength={12} pattern="[A-Za-z]*" placeholder="shou" />
            <div className="hint">Visitors who type this anywhere on the site start party mode. The Konami code works too.</div>
          </div>
        </div>
      </div>

      {groups.map((g) => (
        <div key={g}>
          <div className="adm-label">{g} effects <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>{GROUP_INTRO[g]}</span></div>
          <div className="c">
            <div className="fx-grid">
              {EFFECTS.filter((e) => e.group === g).map((e) => (
                <div key={e.key} className="sw-row">
                  <label className="switch"><input type="checkbox" name={`fx_${e.key}`} defaultChecked={s.effects[e.key]} />{e.label}</label>
                  {HELP[e.key] && <InfoTip help={HELP[e.key]} on={s.effects[e.key]} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      <div className="adm-label">Sliding headlines <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>Choose which sections get the sliding band above them. &ldquo;Sliding headlines before chapters&rdquo; above turns them all off at once.</span></div>
      <div className="c">
        <input type="hidden" name="ribbon_ids" value={sections.map((x) => x.id).join(",")} />
        <div className="fx-grid">
          {sections.map((x) => (
            <div key={x.id} className="sw-row">
              <label className="switch"><input type="checkbox" name={`ribbon_${x.id}`} defaultChecked={x.ribbon} />{x.nav_emoji} {x.title}{x.visible ? "" : " (hidden section)"}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="save-bar">
        <button className="b-mint"><i className="ti ti-device-floppy" />Save appearance</button>
        <a href="/" target="_blank" className="b-out"><i className="ti ti-eye" />View site</a>
      </div>
    </form>
  );
}
