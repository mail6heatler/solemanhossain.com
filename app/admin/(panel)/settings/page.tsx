import { getSettings, getStats } from "@/lib/data";
import { query } from "@/lib/db";
import { logout, logoutEverywhere, saveSite } from "@/app/actions";
import { PasswordForm } from "@/components/admin/Forms";
import { ConfirmSubmit, LinksEditor } from "@/components/admin/Widgets";
import { requireAdmin } from "@/lib/auth";

export default async function SettingsPage() {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const [s, stats, files] = await Promise.all([
    getSettings(), getStats(),
    query("SELECT COUNT(*)::int AS n, COALESCE(SUM(size),0)::bigint AS bytes FROM files"),
  ]);
  const mb = (Number(files[0]?.bytes ?? 0) / 1024 / 1024).toFixed(1);

  return (
    <div className="adm-page">
      <h1 className="adm-h">Settings</h1>
      <p className="adm-sub">Account, appearance, links and your data</p>

      <form action={saveSite}>
        <div className="adm-label">Site &amp; appearance</div>
        <div className="c f">
          <div className="f2">
            <div className="fl"><label>Browser tab title</label><input className="inp" name="siteTitle" defaultValue={s.siteTitle} /></div>
            <div className="fl"><label>Description (shown in Google and link previews)</label><input className="inp" name="siteDescription" defaultValue={s.siteDescription} /></div>
          </div>
          <div className="f2">
            <div className="fl"><label>Footer left</label><input className="inp" name="footerLeft" defaultValue={s.footerLeft} /><div className="hint">{"{year}"} becomes the current year.</div></div>
            <div className="fl"><label>Footer right</label><input className="inp" name="footerRight" defaultValue={s.footerRight} /></div>
          </div>
          <div className="fl"><span className="lab">Themes &amp; effects</span>
            <div className="hint" style={{ fontSize: 12.5 }}>Theme, mood and every effect now live on the <a href="/admin/appearance">Appearance</a> page.</div>
          </div>
        </div>

        <div className="adm-label">Let&apos;s connect · social links</div>
        <div className="c f">
          <LinksEditor name="socials" initial={s.socials} withIcon addLabel="Add link" />
          <div className="fl"><label>Hello form heading</label><input className="inp" name="connectFormTitle" defaultValue={s.connectFormTitle} /></div>
        </div>

        <div className="adm-label">Login username</div>
        <div className="c f">
          <div className="f2">
            <div className="fl"><label>Username you sign in with</label><input className="inp" name="adminUsername" defaultValue={s.adminUsername} autoComplete="off" /></div>
          </div>
        </div>
        <div className="save-bar" style={{ position: "static", margin: "6px 0 0", padding: 0, background: "none", border: 0, backdropFilter: "none" }}>
          <button className="b-mint"><i className="ti ti-device-floppy" />Save settings</button>
        </div>
      </form>

      <div className="adm-label">Password</div>
      <div className="c">
        <PasswordForm />
        <div className="c-desc" style={{ whiteSpace: "normal", marginTop: 10 }}>
          Forgot it? The <b>ADMIN_PASSWORD</b> in your Vercel environment variables always works as a recovery key.
        </div>
      </div>

      <div className="adm-label">Sessions</div>
      <div className="c c-row">
        <div className="grow"><div className="c-title">Log out</div><div className="c-desc">Sign out of this device, or every device you&apos;ve ever signed in on.</div></div>
        <div className="btns">
          <form action={logout}><button className="b-out b-sm"><i className="ti ti-logout" />Log out</button></form>
          <form action={logoutEverywhere}><ConfirmSubmit message="Log out of every device, including this one?" className="b-danger b-sm"><i className="ti ti-devices-x" />Log out everywhere</ConfirmSubmit></form>
        </div>
      </div>

      <div className="adm-label">Data &amp; backups</div>
      <div className="c c-row">
        <span className="chipi"><i className="ti ti-database-export" /></span>
        <div className="grow"><div className="c-title">Export all content</div><div className="c-desc">Download every section, entry, message and setting as one JSON file.</div></div>
        <a href="/api/export" className="b-dark b-sm"><i className="ti ti-download" />Export</a>
      </div>
      <div className="c c-row">
        <span className="chipi"><i className="ti ti-chart-bar" /></span>
        <div className="grow"><div className="c-title">Analytics &amp; storage</div>
          <div className="c-desc">{stats.visitorsWeek} visitors in the last 7 days · {Number(files[0]?.n ?? 0)} uploaded files ({mb} MB)</div></div>
      </div>
    </div>
  );
}
