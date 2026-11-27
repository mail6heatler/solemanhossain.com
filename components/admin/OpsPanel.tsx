"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OPS_LIMITS, type OpsSettings } from "@/lib/ops";
import { saveOps } from "@/app/opsActions";
import { UploadField } from "./Widgets";
import { SaveBar } from "./ChromeStudio";

export type SettingsTab = "general" | "backups" | "security" | "status" | "visitors" | "tools";
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const Box = ({ title, icon, on, children }: { title: string; icon: string; on?: boolean; children: React.ReactNode }) => (
  <section className="c f ops-box">
    <div className="ops-h"><i className={`ti ti-${icon}`} aria-hidden /><b>{title}</b>{on !== undefined && <span className={`ops-state${on ? " on" : ""}`}>{on ? "On" : "Off"}</span>}</div>
    {children}
  </section>
);
const Sw = ({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) => (
  <label className="switch"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />{children}</label>
);
const Chips = <T extends string>({ list, value, onPick }: { list: readonly (readonly [T, string])[]; value: T; onPick: (v: T) => void }) => (
  <div className="hst-chips">{list.map(([k, label]) => <button key={k} type="button" className={`hst-chip${value === k ? " on" : ""}`} aria-pressed={value === k} onClick={() => onPick(k)}>{label}</button>)}</div>
);
const Range = ({ id, label, value, lim, unit, onChange }: { id: string; label: string; value: number; lim: readonly [number, number]; unit: string; onChange: (v: number) => void }) => (
  <div className="fl cs-slider"><label htmlFor={id}>{label} <b>{value}{unit}</b></label><input id={id} type="range" min={lim[0]} max={lim[1]} step={1} value={value} onChange={(e) => onChange(+e.target.value)} /></div>
);
const Txt = ({ id, label, value, max, onChange, area }: { id: string; label: string; value: string; max: number; onChange: (v: string) => void; area?: boolean }) => (
  <div className="fl"><label htmlFor={id}>{label}</label>{area ? <textarea id={id} className="inp" rows={3} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} /> : <input id={id} className="inp" maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} />}</div>
);

/**
 * The switches and options of Settings' tabs (settings.ops, lib/ops.ts) and the time zone. One Save for the tab, like the
 * other editors (SaveBar). The lists and buttons that act at once (backups, devices, Telegram…) are in SettingsTools.tsx.
 */
export default function OpsPanel({ first, tab, timezone, useBlob, siteTitle, siteText, avatar, hasPrivatePw }:
  { first: OpsSettings; tab: SettingsTab; timezone: string; useBlob: boolean; siteTitle: string; siteText: string; avatar: string; hasPrivatePw: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState({ ops: first, tz: timezone });
  const [d, setD] = useState(first);
  const [tz, setTz] = useState(timezone);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ t: string; bad?: boolean } | null>(null);
  const dirty = !same(d, saved.ops) || tz !== saved.tz;
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 4000); return () => clearTimeout(t); }, [note]);
  const set = <K extends keyof OpsSettings>(k: K, patch: Partial<OpsSettings[K]> | OpsSettings[K]) =>
    setD((x) => ({ ...x, [k]: typeof x[k] === "object" ? { ...(x[k] as object), ...(patch as object) } : patch }));
  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    const r = await saveOps(d, tz).catch(() => null);
    setSaving(false);
    if (!r || !r.ok) { setNote({ t: r && !r.ok ? r.error : "That didn't save. Check your connection and try again.", bad: true }); return; }
    setSaved({ ops: d, tz }); setNote({ t: "Saved. It's live on your site." }); router.refresh();
  };
  const zones = useMemo(() => { try { return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone"); } catch { return [timezone]; } }, [timezone]);
  const share = d.share, img = share.image || avatar;
  // the site's address for the preview card, read after the page is shown so it matches what the server drew
  const [host, setHost] = useState("YOUR SITE");
  useEffect(() => { setHost(location.host.toUpperCase()); }, []);

  return (
    <div className="ops">
      {tab === "general" && (
        <Box title="Time zone" icon="clock">
          <div className="fl"><label htmlFor="ops-tz">Your clock&apos;s time zone</label>
            <select id="ops-tz" className="inp" value={tz} onChange={(e) => setTz(e.target.value)}>{(zones.includes(tz) ? zones : [tz, ...zones]).map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}</select>
            <div className="hint">Used by the hero&apos;s clock, Auto theme, the banner&apos;s countdown, Mini Shourobh&apos;s moments and the menu bar&apos;s Dhaka time. The same box is in the hero&apos;s editor.</div></div>
        </Box>
      )}

      {tab === "backups" && (<>
        <Box title="Automatic backups" icon="cloud-upload" on={d.backups.on}>
          <Sw checked={d.backups.on} onChange={(v) => set("backups", { on: v })}>Make a backup by itself</Sw>
          <Chips list={[["day", "Every day"], ["week", "Every week"]] as const} value={d.backups.every} onPick={(v) => set("backups", { every: v })} />
          <Range id="ops-bk" label="Keep the newest" value={d.backups.keep} lim={OPS_LIMITS.keepBackups} unit=" backups" onChange={(v) => set("backups", { keep: v })} />
          <div className="hint">Each holds every section, entry, message, comment, reaction and vote, and all your settings. Pictures stay where they&apos;re stored (Download all pictures saves them). Backups are made when you or a visitor is on the site, so a quiet week still gets one.</div>
        </Box>
        <Box title="Recycle bin" icon="trash" on={d.bin.on}>
          <Sw checked={d.bin.on} onChange={(v) => set("bin", { on: v })}>Keep deleted entries, sections, chats and comments for a while</Sw>
          <Range id="ops-bin" label="Delete them for good after" value={d.bin.days} lim={OPS_LIMITS.binDays} unit=" days" onChange={(v) => set("bin", { days: v })} />
        </Box>
        <Box title="Settings history" icon="history" on={d.history.on}>
          <Sw checked={d.history.on} onChange={(v) => set("history", { on: v })}>Keep a copy of your settings before each save</Sw>
          <Range id="ops-hist" label="Keep the newest" value={d.history.keep} lim={OPS_LIMITS.keepHistory} unit=" copies" onChange={(v) => set("history", { keep: v })} />
          <div className="hint">Saves within two minutes of each other count as one change.</div>
        </Box>
      </>)}

      {tab === "security" && (<>
        <Box title="Lock after wrong passwords" icon="lock" on={d.lockout.on}>
          <Sw checked={d.lockout.on} onChange={(v) => set("lockout", { on: v })}>Stop someone who keeps guessing</Sw>
          <Range id="ops-tries" label="After" value={d.lockout.tries} lim={OPS_LIMITS.tries} unit=" wrong tries" onChange={(v) => set("lockout", { tries: v })} />
          <Range id="ops-min" label="They wait" value={d.lockout.minutes} lim={OPS_LIMITS.minutes} unit=" minutes" onChange={(v) => set("lockout", { minutes: v })} />
          <div className="hint">It only locks out the place the wrong tries came from, so you can still sign in from your own phone or Wi-Fi.</div>
        </Box>
        <Box title="Login history" icon="list-details" on={d.loginLog.on}>
          <Sw checked={d.loginLog.on} onChange={(v) => set("loginLog", { on: v })}>Keep a list of every sign-in</Sw>
          <div className="hint">Off still lists wrong tries, because the lock needs them.</div>
        </Box>
      </>)}

      {tab === "status" && (<>
        <Box title="Maintenance mode" icon="tool" on={d.maintenance.on}>
          <Sw checked={d.maintenance.on} onChange={(v) => set("maintenance", { on: v })}>Visitors see a “Back soon” page instead of the site</Sw>
          <div className="f3"><Txt id="ops-me" label="Emoji" value={d.maintenance.emoji} max={8} onChange={(v) => set("maintenance", { emoji: v })} /><Txt id="ops-mt" label="Headline" value={d.maintenance.title} max={80} onChange={(v) => set("maintenance", { title: v })} /></div>
          <Txt id="ops-mx" label="Words under it" value={d.maintenance.text} max={300} area onChange={(v) => set("maintenance", { text: v })} />
          <div className="hint">You keep seeing the real site while you&apos;re signed in, with a note at the bottom. <a href="/?gate=see" target="_blank">See what visitors see</a> (after saving).</div>
        </Box>
        <Box title="Private mode" icon="lock-square" on={d.private.on}>
          <Sw checked={d.private.on} onChange={(v) => set("private", { on: v })}>The site needs a password to view</Sw>
          {d.private.on && !hasPrivatePw && <div className="err">Set the password below first, or nobody can come in.</div>}
          <div className="f2"><Txt id="ops-pt" label="Headline" value={d.private.title} max={80} onChange={(v) => set("private", { title: v })} /><Txt id="ops-px" label="Words under it" value={d.private.text} max={200} onChange={(v) => set("private", { text: v })} /></div>
          <div className="hint">For a site that isn&apos;t ready yet: it keeps visitors out, but it&apos;s a curtain, not a safe, so don&apos;t put secrets on it. Google is told to stay away while it&apos;s on. Maintenance mode wins if both are on.</div>
        </Box>
        <Box title="Hide from Google" icon="eye-off" on={d.noindex}>
          <Sw checked={d.noindex} onChange={(v) => set("noindex", v)}>Ask Google and other search engines not to list the site</Sw>
          <div className="hint">People with the link can still visit. Search engines take a few days to notice either way.</div>
        </Box>
        <Box title="Link preview" icon="share" on={d.share.on}>
          <Sw checked={d.share.on} onChange={(v) => set("share", { on: v })}>Use my own picture and words when the link is shared</Sw>
          <div className="ops-share">
            <div className="ops-shot">{img ? <img src={img} alt="" /> : <i className="ti ti-photo" />}</div>
            <div className="ops-meta"><small>{host}</small><b>{(share.on && share.title) || siteTitle}</b><span>{(share.on && share.text) || siteText}</span></div>
          </div>
          <div className="hint">How it looks on Facebook, WhatsApp and Messenger. A picture about 1200 × 630 works best. Off uses your photo, site title and description.</div>
          <span className="lab">Picture</span>
          <UploadField name="ops-share-img" initial={share.image} shape="wide" useBlob={useBlob} onChange={(v) => set("share", { image: v })} />
          <div className="f2"><Txt id="ops-st" label="Title (empty: your site title)" value={share.title} max={90} onChange={(v) => set("share", { title: v })} /><Txt id="ops-sx" label="Text (empty: your description)" value={share.text} max={200} onChange={(v) => set("share", { text: v })} /></div>
        </Box>
        <Box title="Icons" icon="app-window">
          <div className="f2">
            <div className="fl"><span className="lab">Browser tab icon</span><UploadField name="ops-tab" initial={d.icons.tab} shape="sq" useBlob={useBlob} onChange={(v) => set("icons", { tab: v })} /><div className="hint">A square picture. Empty keeps the current one.</div></div>
            <div className="fl"><span className="lab">Phone home-screen icon</span><UploadField name="ops-app" initial={d.icons.app} shape="sq" useBlob={useBlob} onChange={(v) => set("icons", { app: v })} /><div className="hint">Shown when someone adds your site to their phone. Square, at least 512 × 512.</div></div>
          </div>
          <Txt id="ops-an" label="Name under the phone icon (empty: your nickname)" value={d.icons.appName} max={30} onChange={(v) => set("icons", { appName: v })} />
        </Box>
      </>)}

      {tab === "visitors" && (<>
        <Box title="Your own visits" icon="user-check" on={d.countMe}>
          <Sw checked={d.countMe} onChange={(v) => set("countMe", v)}>Count my own visits in the visitor numbers</Sw>
          <div className="hint">Off: browsers you&apos;ve signed in to the dashboard on aren&apos;t counted as visitors or as people here now.</div>
        </Box>
        <Box title="Phone alerts (Telegram)" icon="bell-ringing" on={d.alerts.on}>
          <Sw checked={d.alerts.on} onChange={(v) => set("alerts", { on: v })}>Send me a Telegram message when…</Sw>
          <div className="stu-switches ops-sub">
            <Sw checked={d.alerts.chat} onChange={(v) => set("alerts", { chat: v })}>someone writes in the chat</Sw>
            <Sw checked={d.alerts.comments} onChange={(v) => set("alerts", { comments: v })}>someone comments on an entry</Sw>
            <Sw checked={d.alerts.reactions} onChange={(v) => set("alerts", { reactions: v })}>someone reacts (can be a lot)</Sw>
          </div>
          <div className="hint">Connect your Telegram below once.</div>
        </Box>
        <Box title="Spam control" icon="shield-x" on={d.spam.on}>
          <Sw checked={d.spam.on} onChange={(v) => set("spam", { on: v })}>Stop messages and comments with blocked words, and floods</Sw>
          <Range id="ops-ph" label="At most" value={d.spam.perHour} lim={OPS_LIMITS.perHour} unit=" chat messages an hour from one visitor" onChange={(v) => set("spam", { perHour: v })} />
          <div className="hint">Blocked visitors stay blocked even with this off. The words and the blocked list are below.</div>
        </Box>
        <Box title="Clean-up" icon="broom" on={d.cleanup.on}>
          <Sw checked={d.cleanup.on} onChange={(v) => set("cleanup", { on: v })}>Delete old chat messages by themselves</Sw>
          <Range id="ops-cl" label="Older than" value={d.cleanup.months} lim={OPS_LIMITS.months} unit=" months" onChange={(v) => set("cleanup", { months: v })} />
          <div className="hint">They go to the recycle bin first, if it&apos;s on. Notes on your Wall go too, so keep this off if you want them forever.</div>
        </Box>
      </>)}

      {note && <div className={`adm-toast stu-toast${note.bad ? " bad" : ""}`} role="status">{note.t}</div>}
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={() => { setD(saved.ops); setTz(saved.tz); }} />
    </div>
  );
}
