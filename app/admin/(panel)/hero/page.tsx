import { getSettings } from "@/lib/data";
import { saveHero } from "@/app/actions";
import { ChipsEditor, UploadField } from "@/components/admin/Widgets";
import { requireAdmin } from "@/lib/auth";

export default async function HeroPage() {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const s = await getSettings();
  return (
    <form action={saveHero} className="adm-page">
      <h1 className="adm-h">G0 · Hero</h1>
      <p className="adm-sub">Your homepage first impression: photo, headline, skills, résumé and more</p>

      <div className="c">
        <div className="c-title" style={{ marginBottom: 10 }}>Avatar / profile photo</div>
        <UploadField name="avatarUrl" initial={s.avatarUrl} fallback={s.initials} useBlob={!!process.env.BLOB_READ_WRITE_TOKEN} />
        <div className="hint" style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 8 }}>For a true cut-out sticker, upload a PNG with a transparent background: the white border follows your outline. A free site like remove.bg can make one from any photo. A normal photo becomes a taped-up print.</div>
        <div className="f3" style={{ marginTop: 12 }}>
          <div className="fl"><label>Initials (shown when there&apos;s no photo)</label><input className="inp" name="initials" defaultValue={s.initials} maxLength={3} /></div>
        </div>
      </div>

      <div className="c">
        <div className="c-title" style={{ marginBottom: 10 }}>Résumé / CV</div>
        <UploadField name="resumeUrl" initial={s.resumeUrl} kind="pdf" useBlob={!!process.env.BLOB_READ_WRITE_TOKEN} />
        <div className="fl" style={{ marginTop: 12 }}><label>Résumé button text</label><input className="inp" name="ctaPrimaryLabel" defaultValue={s.ctaPrimaryLabel} /></div>
        <div className="hint" style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6 }}>The button only appears once a résumé is uploaded.</div>
      </div>

      <div className="adm-label">Name &amp; nav</div>
      <div className="c f">
        <div className="f2">
          <div className="fl"><label>Full name</label><input className="inp" name="fullName" defaultValue={s.fullName} required /></div>
          <div className="fl"><label>Nickname</label><input className="inp" name="nickname" defaultValue={s.nickname} /></div>
        </div>
        <div className="fl">
          <span className="lab">Typewriter phrases in the top-left corner (they loop)</span>
          <ChipsEditor name="brandPhrases" initial={s.brandPhrases} placeholder="e.g. Also known as Shou ✌️" />
        </div>
      </div>

      <div className="adm-label">Headline &amp; text</div>
      <div className="c f">
        <div className="f2">
          <div className="fl"><label>Headline line 1</label><input className="inp" name="headline1" defaultValue={s.headline1} /></div>
          <div className="fl">
            <label>Headline line 2</label><input className="inp" name="headline2" defaultValue={s.headline2} />
            <div className="hint">Wrap words in *stars* to make them mint green: builder by *night.*</div>
          </div>
        </div>
        <div className="fl"><label>Subtitle (typed out letter by letter)</label><textarea name="subtitle" defaultValue={s.subtitle} style={{ minHeight: 70 }} /></div>
        <div className="fl"><label>Status line (with the pulsing dot)</label><input className="inp" name="statusText" defaultValue={s.statusText} /></div>
      </div>

      <div className="adm-label">Chips</div>
      <div className="c f">
        <div className="fl"><span className="lab">Role chips under the subtitle</span><ChipsEditor name="roleChips" initial={s.roleChips} placeholder="e.g. Data Officer · T.K. Group" /></div>
        <div className="fl"><span className="lab">Skill chips (scrolling strip at the bottom of the hero) · drag to reorder</span><ChipsEditor name="skills" initial={s.skills} placeholder="e.g. 🤖 AI Tinkering" /></div>
      </div>

      <div className="adm-label">Clock, buttons &amp; extras</div>
      <div className="c f">
        <div className="f3">
          <div className="fl"><label>Location</label><input className="inp" name="location" defaultValue={s.location} /></div>
          <div className="fl"><label>Clock time zone</label><input className="inp" name="timezone" defaultValue={s.timezone} list="tz" />
            <datalist id="tz">{["Asia/Dhaka", "Asia/Kolkata", "Asia/Dubai", "Asia/Tokyo", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Australia/Sydney", "UTC"].map((z) => <option key={z} value={z} />)}</datalist>
          </div>
          <div className="fl"><label>Clock label</label><input className="inp" name="clockLabel" defaultValue={s.clockLabel} /></div>
        </div>
        <div className="f2">
          <div className="fl"><label>Second button text</label><input className="inp" name="ctaSecondaryLabel" defaultValue={s.ctaSecondaryLabel} /></div>
          <div className="fl"><label>Second button link</label><input className="inp" name="ctaSecondaryUrl" defaultValue={s.ctaSecondaryUrl} /></div>
        </div>
        <div className="f2">
          <div className="fl"><label>Floating emojis (drag-able, separate with spaces)</label><input className="inp" name="heroEmojis" defaultValue={s.heroEmojis} /></div>
          <div className="fl"><label>Scroll hint</label><input className="inp" name="scrollCue" defaultValue={s.scrollCue} /></div>
        </div>
      </div>

      <div className="save-bar">
        <button className="b-mint"><i className="ti ti-device-floppy" />Save hero</button>
        <a href="/#hero" target="_blank" className="b-out"><i className="ti ti-eye" />Preview</a>
      </div>
    </form>
  );
}
