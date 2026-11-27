import { getSettings, getStats } from "@/lib/data";
import { query } from "@/lib/db";
import { logout, logoutEverywhere, saveSite } from "@/app/actions";
import { PasswordForm } from "@/components/admin/Forms";
import { ConfirmSubmit } from "@/components/admin/Widgets";
import { currentSid, requireAdmin } from "@/lib/auth";
import SaveBox from "@/components/admin/SaveBox";
import OpsPanel, { type SettingsTab } from "@/components/admin/OpsPanel";
import { BackupsTool, BinTool, DevicesTool, HistoryTool, PicturesTool, PrivatePwTool, RestoreFileTool, SpamTool, TelegramTool, ToolsTool, TwoStepTool } from "@/components/admin/SettingsTools";
import { getSecret, listBackups, listBin, listHistory, listLogins } from "@/lib/opsServer";

const TABS: [SettingsTab, string, string][] = [
  ["general", "General", "settings"],
  ["backups", "Backups", "database"],
  ["security", "Login & security", "shield-lock"],
  ["status", "Site status", "world"],
  ["visitors", "Visitors & messages", "users"],
  ["tools", "Tools", "tool"],
];

/** Settings in six tabs (?tab=). The switches are one form per tab (OpsPanel); lists and buttons act at once (SettingsTools). */
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const { tab: t } = await searchParams;
  const tab = (TABS.find(([k]) => k === t)?.[0] ?? "general") as SettingsTab;
  const s = await getSettings();
  const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
  const panel = <OpsPanel key={tab} first={s.ops} tab={tab} timezone={s.timezone} useBlob={useBlob} siteTitle={s.siteTitle} siteText={s.siteDescription} avatar={s.avatarUrl} hasPrivatePw={!!(await getSecret("private_pw"))} />;

  return (
    <div className="adm-page">
      <h1 className="adm-h">Settings</h1>
      <p className="adm-sub">Your site&apos;s name and login, backups, security, status, visitors and tools</p>
      <nav className="ops-tabs" aria-label="Settings sections">
        {TABS.map(([k, label, icon]) => <a key={k} href={`/admin/settings${k === "general" ? "" : `?tab=${k}`}`} className={k === tab ? "on" : ""} aria-current={k === tab ? "page" : undefined}><i className={`ti ti-${icon}`} />{label}</a>)}
      </nav>

      {tab === "general" && <General s={s} panel={panel} />}
      {tab === "backups" && <Backups panel={panel} on={s.ops.bin.on} days={s.ops.bin.days} />}
      {tab === "security" && <Security panel={panel} twoStep={s.ops.twoStep.on} />}
      {tab === "status" && (<>{panel}<PrivatePwTool has={!!(await getSecret("private_pw"))} /></>)}
      {tab === "visitors" && <Visitors panel={panel} />}
      {tab === "tools" && <ToolsTool />}
    </div>
  );
}

function General({ s, panel }: { s: Awaited<ReturnType<typeof getSettings>>; panel: React.ReactNode }) {
  return (<>
    <form action={saveSite}>
      <div className="adm-label">Site</div>
      <div className="c f">
        <div className="f2">
          <div className="fl"><label>Browser tab title</label><input className="inp" name="siteTitle" defaultValue={s.siteTitle} /></div>
          <div className="fl"><label>Description (shown in Google and link previews)</label><input className="inp" name="siteDescription" defaultValue={s.siteDescription} /></div>
        </div>
        <div className="fl"><span className="lab">Themes &amp; effects</span>
          <div className="hint" style={{ fontSize: 12.5 }}>Theme, mood and every effect live on the <a href="/admin/appearance">Appearance</a> page. The menu bar and the footer have their own pages: <a href="/admin/menu">Menu bar</a> and <a href="/admin/footer">Footer</a>. The link preview&apos;s own picture and the icons are under <a href="/admin/settings?tab=status">Site status</a>.</div>
        </div>
      </div>
      <div className="adm-label">Login username</div>
      <div className="c f">
        <div className="f2"><div className="fl"><label>Username you sign in with</label><input className="inp" name="adminUsername" defaultValue={s.adminUsername} autoComplete="off" /></div></div>
        <div className="hint">Your password, two-step login and devices are under <a href="/admin/settings?tab=security">Login &amp; security</a>.</div>
      </div>
      <SaveBox label="Save settings"><a href="/" target="_blank" className="b-out"><i className="ti ti-eye" />View site</a></SaveBox>
    </form>
    <div className="adm-label">Region</div>
    {panel}
  </>);
}

async function Backups({ panel, on, days }: { panel: React.ReactNode; on: boolean; days: number }) {
  const [backups, bin, history] = await Promise.all([listBackups(), listBin(), listHistory()]);
  return (<>
    {panel}
    <BackupsTool list={backups} />
    <RestoreFileTool />
    <PicturesTool />
    <BinTool list={bin} on={on} days={days} />
    <HistoryTool list={history} />
  </>);
}

async function Security({ panel, twoStep }: { panel: React.ReactNode; twoStep: boolean }) {
  const [logins, sessions, sid] = await Promise.all([
    listLogins(),
    query("SELECT sid, device, ip_hint, created_at, last_seen FROM sessions WHERE NOT revoked ORDER BY last_seen DESC LIMIT 30"),
    currentSid(),
  ]);
  return (<>
    <div className="adm-label">Password</div>
    <div className="c">
      <PasswordForm />
      <div className="c-desc" style={{ whiteSpace: "normal", marginTop: 10 }}>Forgot it? The <b>ADMIN_PASSWORD</b> in your Vercel environment variables always works as a recovery key.</div>
    </div>
    <TwoStepTool on={twoStep} />
    {panel}
    <DevicesTool current={sid} list={sessions.map((r) => ({ sid: String(r.sid), device: String(r.device), ip: String(r.ip_hint), created: new Date(r.created_at).toISOString(), seen: new Date(r.last_seen).toISOString() }))} />
    <div className="c c-row">
      <div className="grow"><div className="c-title">Log out</div><div className="c-desc">Sign out of this device, or every device at once.</div></div>
      <div className="btns">
        <form action={logout}><button className="b-out b-sm"><i className="ti ti-logout" />Log out</button></form>
        <form action={logoutEverywhere}><ConfirmSubmit title="Log out everywhere?" message="This logs you out of every device, including this one. You'll need to log in again." yes="Yes, log out" className="b-danger b-sm"><i className="ti ti-devices-x" />Log out everywhere</ConfirmSubmit></form>
      </div>
    </div>
    <section className="c f ops-box">
      <div className="ops-h"><i className="ti ti-list-details" aria-hidden /><b>Recent sign-ins</b></div>
      {logins.length ? (
        <ul className="ops-list">{logins.map((l, i) => (
          <li key={i}>
            <i className={`ti ti-${l.ok ? "circle-check" : "circle-x"} ops-li${l.ok ? "" : " bad"}`} aria-hidden />
            <div className="grow"><b>{l.ok ? "Signed in" : "Wrong try"}{l.note ? ` (${l.note})` : ""}</b><small><time dateTime={l.at} suppressHydrationWarning>{new Date(l.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time> · {l.device} · {l.ip}</small></div>
          </li>
        ))}</ul>
      ) : <div className="hint">Nothing yet. Sign-ins appear here from now on.</div>}
    </section>
  </>);
}

async function Visitors({ panel }: { panel: React.ReactNode }) {
  const [stats, bot, chat, words, blockedRaw, namesRaw] = await Promise.all([
    getStats(), getSecret("tg_bot"), getSecret("tg_chat"), getSecret("spam_words"), getSecret("blocked"), getSecret("blocked_names"),
  ]);
  let keys: string[] = [], names: Record<string, string> = {};
  try { keys = JSON.parse(blockedRaw || "[]"); names = JSON.parse(namesRaw || "{}"); } catch { /* */ }
  // one row per person: their chat and their address are blocked together
  const seen = new Set<string>(), blocked: { key: string; name: string }[] = [];
  for (const k of keys) { const n = names[k] || ""; if (n && seen.has(n)) continue; if (n) seen.add(n); blocked.push({ key: k, name: n }); }
  return (<>
    <div className="c c-row">
      <span className="chipi"><i className="ti ti-chart-bar" /></span>
      <div className="grow"><div className="c-title">Visitors</div><div className="c-desc">{stats.visitorsWeek} visitors in the last 7 days. The full picture is on the Overview.</div></div>
    </div>
    {panel}
    <TelegramTool bot={bot} chat={!!chat} />
    <SpamTool words={words} blocked={blocked} />
  </>);
}
