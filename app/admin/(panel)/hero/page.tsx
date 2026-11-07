import { getSettings } from "@/lib/data";
import { saveHero, setHeroHidden } from "@/app/actions";
import { ChipsEditor, ConfirmSubmit, UploadField } from "@/components/admin/Widgets";
import { requireAdmin } from "@/lib/auth";
import SaveBox from "@/components/admin/SaveBox";
import { Box } from "@/components/admin/Box";
import BoxMemory from "@/components/admin/BoxMemory";
import { boxOpen } from "@/lib/boxes";

export default async function HeroPage() {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const s = await getSettings();
  const open = (name: string) => boxOpen(s.heroBoxes, name, true);
  return (
    <div className="adm-page">
    <BoxMemory />
    <form action={saveHero}>
      <input type="hidden" name="boxes" />
      <h1 className="adm-h">G0 · Hero</h1>
      <p className="adm-sub">Your homepage first impression: photo, headline, skills, résumé and more</p>
      {s.heroHidden && (
        <Box name="off" title="The hero is off your homepage right now" icon="eye-off" open={open("off")}>
          <div className="c-desc" style={{ whiteSpace: "normal" }}>You can still edit it here. Bring it back at the bottom of this page.</div>
        </Box>
      )}

      <Box name="photo" title="Avatar / profile photo" icon="user-circle" open={open("photo")}>
        <UploadField name="avatarUrl" initial={s.avatarUrl} fallback={s.initials} useBlob={!!process.env.BLOB_READ_WRITE_TOKEN} />
        <div className="hint" style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 8 }}>For a true cut-out sticker, upload a PNG with a transparent background: the white border follows your outline. A free site like remove.bg can make one from any photo. A normal photo becomes a taped-up print.</div>
        <div className="f3" style={{ marginTop: 12 }}>
          <div className="fl"><label>Initials (shown when there&apos;s no photo)</label><input className="inp" name="initials" defaultValue={s.initials} maxLength={3} /></div>
        </div>
      </Box>

      <Box name="resume" title="Résumé / CV" icon="file-text" open={open("resume")}>
        <UploadField name="resumeUrl" initial={s.resumeUrl} kind="pdf" useBlob={!!process.env.BLOB_READ_WRITE_TOKEN} />
        <div className="fl" style={{ marginTop: 12 }}><label>Résumé button text</label><input className="inp" name="ctaPrimaryLabel" defaultValue={s.ctaPrimaryLabel} /></div>
        <div className="hint" style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6 }}>The button only appears once a résumé is uploaded.</div>
      </Box>

      <Box name="name" title="Name & nav" icon="id" open={open("name")}>
        <div className="f">
          <div className="f2">
            <div className="fl"><label>Full name</label><input className="inp" name="fullName" defaultValue={s.fullName} required /></div>
            <div className="fl"><label>Nickname</label><input className="inp" name="nickname" defaultValue={s.nickname} /></div>
          </div>
          <div className="fl">
            <span className="lab">Typewriter phrases in the top-left corner (they loop)</span>
            <ChipsEditor name="brandPhrases" initial={s.brandPhrases} placeholder="e.g. Also known as Shou ✌️" />
          </div>
        </div>
      </Box>

      <Box name="headline" title="Headline & text" icon="heading" open={open("headline")}>
        <div className="f">
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
      </Box>

      <Box name="chips" title="Chips" icon="tags" open={open("chips")}>
        <div className="f">
          <div className="fl"><span className="lab">Role chips under the subtitle</span><ChipsEditor name="roleChips" initial={s.roleChips} placeholder="e.g. Data Officer · T.K. Group" /></div>
          <div className="fl"><span className="lab">Skill chips (scrolling strip at the bottom of the hero) · drag to reorder</span><ChipsEditor name="skills" initial={s.skills} placeholder="e.g. 🤖 AI Tinkering" /></div>
        </div>
      </Box>

      <Box name="extras" title="Clock, buttons & extras" icon="clock" open={open("extras")}>
        <div className="f">
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
      </Box>

      <SaveBox label="Save hero" still>
        {s.heroHidden
          ? <a href="/" target="_blank" className="b-out"><i className="ti ti-eye" />View site</a>
          : <a href="/#hero" target="_blank" className="b-out"><i className="ti ti-eye" />Preview</a>}
      </SaveBox>
    </form>

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
