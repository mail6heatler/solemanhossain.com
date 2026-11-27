import { headers } from "next/headers";
import { getSettings, getStats } from "@/lib/data";
import { query } from "@/lib/db";
import { logout, logoutEverywhere } from "@/app/actions";
import { PasswordForm } from "@/components/admin/Forms";
import { ConfirmSubmit } from "@/components/admin/Widgets";
import { currentSid, requireAdmin } from "@/lib/auth";
import { OpsProvider } from "@/components/admin/settings/kit";
import { BackupsTab, GeneralTab, SecurityTab, StatusTab, VisitorsTab } from "@/components/admin/settings/tabs";
import { ToolsTab } from "@/components/admin/settings/tools";
import { getSecret, listBackups, listBin, listHistory, listLogins } from "@/lib/opsServer";

type Tab = "general" | "backups" | "security" | "status" | "visitors" | "tools";
const TABS: [Tab, string, string][] = [
  ["general", "General", "settings"],
  ["backups", "Backups", "database"],
  ["security", "Login & security", "shield-lock"],
  ["status", "Site status", "world"],
  ["visitors", "Visitors & messages", "users"],
  ["tools", "Tools", "tool"],
];

/**
 * Settings in six tabs (?tab=). Every feature is one card with everything about it: its switch, its options and its lists
 * (components/admin/settings). Switches and options save the moment they change; there is no Save bar.
 */
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const { tab: t } = await searchParams;
  const tab = (TABS.find(([k]) => k === t)?.[0] ?? "general") as Tab;
  const s = await getSettings();

  return (
    <div className="adm-page">
      <h1 className="adm-h">Settings</h1>
      <p className="adm-sub">Your site&apos;s name and login, backups, security, status, visitors and tools. Changes save by themselves.</p>
      <nav className="ops-tabs" aria-label="Settings sections">
        {TABS.map(([k, label, icon]) => <a key={k} href={`/admin/settings${k === "general" ? "" : `?tab=${k}`}`} className={k === tab ? "on" : ""} aria-current={k === tab ? "page" : undefined}><i className={`ti ti-${icon}`} />{label}</a>)}
      </nav>
      <OpsProvider key={tab} first={s.ops}>
        <div className="ops">
          {tab === "general" && <GeneralTab siteTitle={s.siteTitle} siteText={s.siteDescription} username={s.adminUsername} timezone={s.timezone} />}
          {tab === "backups" && <Backups />}
          {tab === "security" && <Security twoStep={s.ops.twoStep.on} />}
          {tab === "status" && <StatusTab useBlob={!!process.env.BLOB_READ_WRITE_TOKEN} siteTitle={s.siteTitle} siteText={s.siteDescription} avatar={s.avatarUrl} hasPrivatePw={!!(await getSecret("private_pw"))} />}
          {tab === "visitors" && <Visitors />}
          {tab === "tools" && <Tools />}
        </div>
      </OpsProvider>
    </div>
  );
}

async function Backups() {
  const [backups, bin, history] = await Promise.all([listBackups(), listBin(), listHistory()]);
  return <BackupsTab backups={backups} bin={bin} history={history} />;
}

async function Security({ twoStep }: { twoStep: boolean }) {
  const [logins, sessions, sid] = await Promise.all([
    listLogins(),
    query("SELECT sid, device, ip_hint, created_at, last_seen FROM sessions WHERE NOT revoked ORDER BY last_seen DESC LIMIT 30"),
    currentSid(),
  ]);
  return (
    <SecurityTab twoStep={twoStep} logins={logins} current={sid}
      devices={sessions.map((r) => ({ sid: String(r.sid), device: String(r.device), ip: String(r.ip_hint), created: new Date(r.created_at).toISOString(), seen: new Date(r.last_seen).toISOString() }))}>
      <section className="c f ops-box">
        <div className="ops-h"><i className="ti ti-key" aria-hidden /><b>Password</b></div>
        <PasswordForm />
        <div className="hint">Forgot it? The <b>ADMIN_PASSWORD</b> in your Vercel environment variables always works as a recovery key.</div>
        <div className="btns">
          <form action={logout}><button className="b-out b-sm"><i className="ti ti-logout" />Log out of this device</button></form>
          <form action={logoutEverywhere}><ConfirmSubmit title="Log out everywhere?" message="This logs you out of every device, including this one. You'll need to log in again." yes="Yes, log out" className="b-danger b-sm"><i className="ti ti-devices-x" />Log out everywhere</ConfirmSubmit></form>
        </div>
      </section>
    </SecurityTab>
  );
}

async function Visitors() {
  const [stats, bot, chat, words, blockedRaw, namesRaw] = await Promise.all([
    getStats(), getSecret("tg_bot"), getSecret("tg_chat"), getSecret("spam_words"), getSecret("blocked"), getSecret("blocked_names"),
  ]);
  let keys: string[] = [], names: Record<string, string> = {};
  try { keys = JSON.parse(blockedRaw || "[]"); names = JSON.parse(namesRaw || "{}"); } catch { /* */ }
  // one row per person: their chat and their address are blocked together
  const seen = new Set<string>(), blocked: { key: string; name: string }[] = [];
  for (const k of keys) { const n = names[k] || ""; if (n && seen.has(n)) continue; if (n) seen.add(n); blocked.push({ key: k, name: n }); }
  return <VisitorsTab week={stats.visitorsWeek} bot={bot} chat={!!chat} words={words} blocked={blocked} />;
}

async function Tools() {
  const [sections, entries] = await Promise.all([
    query("SELECT id, title FROM sections ORDER BY sort, id"),
    query("SELECT id, title, section_id, visible FROM items ORDER BY sort, id"),
  ]);
  const site = process.env.VERCEL_PROJECT_PRODUCTION_URL || (await headers()).get("host") || "yoursite";
  return <ToolsTab site={site} sections={sections.map((r) => ({ id: Number(r.id), title: String(r.title) }))} entries={entries.map((r) => ({ id: Number(r.id), title: String(r.title ?? ""), section: Number(r.section_id), visible: !!r.visible }))} />;
}
