"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OPS_LIMITS } from "@/lib/ops";
import {
  backupNow, binDelete, binEmpty, binRestore, blockChat, deleteBackup, historyGoBack, pictureList, restoreBackup, saveSiteText, saveSpamWords, saveTimezone,
  saveUsername, setPrivatePassword, signOutDevice, telegramFindChat, telegramForget, telegramTest, telegramToken, twoStepConfirm, twoStepNewCodes, twoStepOff,
  twoStepStart, unblock,
} from "@/app/opsActions";
import { UploadField } from "../Widgets";
import PasswordInput from "../PasswordInput";
import { AutoText, Card, Chips, kb, Range, Sure, Sw, Txt, useAct, useOps, When } from "./kit";

// ================= General =================
export function GeneralTab({ siteTitle, siteText, username, timezone }: { siteTitle: string; siteText: string; username: string; timezone: string }) {
  const [t, setT] = useState(siteTitle), [d, setD] = useState(siteText);
  const zones = useMemo(() => { try { return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone"); } catch { return [timezone]; } }, [timezone]);
  const tz = useAct();
  const [zone, setZone] = useState(timezone);
  const user = useAct();
  const [u, setU] = useState(username);
  return (<>
    <Card title="Site name" icon="world">
      <div className="f2">
        <AutoText id="ops-title" label="Browser tab title" value={t} max={120} save={(v) => { setT(v); return saveSiteText(v, d); }} />
        <AutoText id="ops-desc" label="Description (Google and link previews)" value={d} max={300} save={(v) => { setD(v); return saveSiteText(t, v); }} />
      </div>
      <div className="hint">Saves by itself a second after you stop typing. Theme and effects are on <a href="/admin/appearance">Appearance</a>; the menu bar and footer have their own pages. Your own link-preview picture and the icons are under <a href="/admin/settings?tab=status">Site status</a>.</div>
    </Card>
    <Card title="Time zone" icon="clock">
      <div className="fl"><label htmlFor="ops-tz">Your clock&apos;s time zone</label>
        <select id="ops-tz" className="inp" value={zone} onChange={(e) => { setZone(e.target.value); tz.run("tz", () => saveTimezone(e.target.value)); }}>{(zones.includes(zone) ? zones : [zone, ...zones]).map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}</select></div>
      <div className="hint">Used by the hero&apos;s clock, Auto theme, the banner&apos;s countdown, Mini Shourobh&apos;s moments and the menu bar&apos;s time. Saves when you pick one.</div>
      <tz.Msg />
    </Card>
    <Card title="Login name" icon="user">
      <div className="btns"><input className="inp" value={u} onChange={(e) => setU(e.target.value)} autoComplete="off" aria-label="Username you sign in with" style={{ maxWidth: 260 }} /><button type="button" className="b-mint b-sm" disabled={u.trim() === username || u.trim().length < 3 || !!user.busy} onClick={() => user.run("u", () => saveUsername(u))}>Save name</button></div>
      <div className="hint">The name you sign in with. It has its own Save button, so a half-typed name is never saved. Your password and two-step login are under <a href="/admin/settings?tab=security">Login &amp; security</a>.</div>
      <user.Msg />
    </Card>
  </>);
}

// ================= Backups =================
type Backup = { id: number; at: string; kind: string; size: number; summary: string };
const KIND: Record<string, string> = { auto: "Automatic", manual: "Made by you", "before-restore": "Before a restore" };
export function BackupsTab({ backups, bin, history }: { backups: Backup[]; bin: { id: number; kind: string; label: string; at: string }[]; history: { id: number; at: string; label: string }[] }) {
  const { ops, set } = useOps();
  const b = useAct(), bn = useAct(), h = useAct();
  const [withSettings, setWith] = useState(true);
  return (<>
    <Card title="Backups" icon="database" k="backups" flag={{ value: ops.backups.on, set: (v) => set("backups", { on: v }) }} onLabel="Automatic on" offLabel="Automatic off">
      <div className="ops-row">
        <Chips list={[["day", "Every day"], ["week", "Every week"]] as const} value={ops.backups.every} onPick={(v) => set("backups", { every: v })} />
        <Range id="ops-bk" label="Keep the newest" value={ops.backups.keep} lim={OPS_LIMITS.keepBackups} unit=" backups" onChange={(v) => set("backups", { keep: v }, true)} />
      </div>
      <div className="hint">Each holds every section, entry, message, comment, reaction and vote, and all your settings. Pictures stay where they&apos;re stored: save them with Download all pictures below.</div>
      <div className="btns"><button type="button" className="b-mint b-sm" disabled={!!b.busy} onClick={() => b.run("now", backupNow)}><i className={`ti ti-${b.busy === "now" ? "loader-2 spin" : "device-floppy"}`} />{b.busy === "now" ? "Backing up…" : "Back up now"}</button><a className="b-out b-sm" href="/api/export"><i className="ti ti-download" />Export everything now</a></div>
      <Sw checked={withSettings} onChange={setWith}>Restoring also brings back that day&apos;s settings (look, menu, footer…). Your login and security switches always stay as they are.</Sw>
      <b.Msg />
      {backups.length ? (
        <ul className="ops-list">{backups.map((x) => (
          <li key={x.id}>
            <div className="grow"><b><When at={x.at} /></b><small>{KIND[x.kind] ?? x.kind} · {x.summary} · {kb(x.size)}</small></div>
            <div className="btns">
              <a className="b-out b-sm" href={`/api/backup/${x.id}`}><i className="ti ti-download" />Download</a>
              <Sure label="Restore" yes="Yes, restore it" icon="restore" danger={false} disabled={!!b.busy} onYes={() => b.run(`r${x.id}`, () => restoreBackup(x.id, withSettings))} />
              <Sure label="" yes="Delete" icon="trash" disabled={!!b.busy} onYes={() => b.run(`d${x.id}`, () => deleteBackup(x.id))} />
            </div>
          </li>
        ))}</ul>
      ) : <div className="hint">No backups yet. The first automatic one is made within a few minutes, or press Back up now.</div>}
      <RestoreFile withSettings={withSettings} />
    </Card>
    <Pictures />
    <Card title="Recycle bin" icon="trash" k="bin" flag={{ value: ops.bin.on, set: (v) => set("bin", { on: v }) }} state={<span className="ops-count">{bin.length}</span>}>
      <Range id="ops-bin" label="Deleted things wait" value={ops.bin.days} lim={OPS_LIMITS.binDays} unit=" days, then go for good" onChange={(v) => set("bin", { days: v }, true)} />
      {!ops.bin.on && <div className="hint">Off: deleting is for good.</div>}
      <bn.Msg />
      {bin.length ? (<>
        <ul className="ops-list">{bin.map((x) => (
          <li key={x.id}>
            <i className={`ti ti-${BIN_ICON[x.kind] ?? "file"} ops-li`} aria-hidden />
            <div className="grow"><b>{x.label}</b><small>Deleted <When at={x.at} /></small></div>
            <div className="btns">
              <button type="button" className="b-mint b-sm" disabled={!!bn.busy} onClick={() => bn.run(`p${x.id}`, () => binRestore(x.id))}><i className="ti ti-arrow-back-up" />Put back</button>
              <Sure label="" yes="Delete for good" icon="trash-x" disabled={!!bn.busy} onYes={() => bn.run(`x${x.id}`, () => binDelete(x.id))} />
            </div>
          </li>
        ))}</ul>
        <div className="btns"><Sure label="Empty the bin" yes="Yes, delete all of it for good" icon="trash-x" onYes={() => bn.run("empty", binEmpty)} /></div>
      </>) : <div className="hint">Nothing in the bin.</div>}
    </Card>
    <Card title="Settings history" icon="history" k="history" flag={{ value: ops.history.on, set: (v) => set("history", { on: v }) }} state={<span className="ops-count">{history.length}</span>}>
      <Range id="ops-hist" label="Keep the newest" value={ops.history.keep} lim={OPS_LIMITS.keepHistory} unit=" copies" onChange={(v) => set("history", { keep: v }, true)} />
      <div className="hint">How your settings were before each change. Going back keeps your login and security switches as they are now. Changes within two minutes count as one.</div>
      <h.Msg />
      {history.length ? (
        <ul className="ops-list">{history.map((x) => (
          <li key={x.id}>
            <div className="grow"><b><When at={x.at} /></b><small>Before: {x.label}</small></div>
            <Sure label="Go back to this" yes="Yes, go back" icon="arrow-back-up" danger={false} disabled={!!h.busy} onYes={() => h.run(`h${x.id}`, () => historyGoBack(x.id))} />
          </li>
        ))}</ul>
      ) : <div className="hint">Nothing yet. A copy is kept the next time you change a setting.</div>}
    </Card>
  </>);
}
const BIN_ICON: Record<string, string> = { entry: "file-text", section: "layout-grid", chat: "messages", message: "message", comment: "message-circle" };

function RestoreFile({ withSettings }: { withSettings: boolean }) {
  const router = useRouter();
  const [data, setData] = useState<unknown>(null), [info, setInfo] = useState<{ summary: string; createdAt: string } | null>(null);
  const [err, setErr] = useState(""), [ok, setOk] = useState(""), [busy, setBusy] = useState(false);
  const post = async (mode: "preview" | "apply", d: unknown) => {
    const r = await fetch("/api/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, data: d, withSettings }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    return r && r.ok ? j : { error: j.error || "That file couldn't be read." };
  };
  const pick = async (f?: File) => {
    setErr(""); setOk(""); setInfo(null); setData(null);
    if (!f) return;
    let d: unknown;
    try { d = JSON.parse(await f.text()); } catch { setErr("That isn't a backup file (it should end in .json)."); return; }
    setBusy(true); const j = await post("preview", d); setBusy(false);
    if (j.error) { setErr(j.error); return; }
    setData(d); setInfo(j);
  };
  return (
    <div className="ops-sub2">
      <span className="lab">Restore from a file</span>
      <div className="hint">A backup you downloaded, or an Export file. You see what&apos;s in it before anything changes.</div>
      <input type="file" accept="application/json,.json" className="inp" onChange={(e) => pick(e.target.files?.[0])} aria-label="Choose a backup file" />
      {busy && <div className="hint">Working…</div>}
      {err && <div className="err">{err}</div>}
      {info && (
        <div className="ops-preview">
          <b>This file holds: {info.summary}</b>
          {info.createdAt && <small>Made <When at={info.createdAt} /></small>}
          <Sure label="Restore this file" yes="Yes, replace everything with it" icon="restore" onYes={async () => { setBusy(true); const j = await post("apply", data); setBusy(false); if (j.error) setErr(j.error); else { setOk(`Restored: ${j.summary}. How it was just before is in the list above.`); setInfo(null); router.refresh(); } }} />
        </div>
      )}
      {ok && <div className="ops-ok">✓ {ok}</div>}
    </div>
  );
}

// a ZIP file made in the browser (stored, not compressed: pictures are already compressed)
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b: Uint8Array) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function zip(files: { name: string; data: Uint8Array }[]) {
  const enc = new TextEncoder(), parts: BlobPart[] = [], central: BlobPart[] = [];
  let offset = 0, cd = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), n = f.data.length;
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(12, 0x21, true);
    h.setUint32(14, crc, true); h.setUint32(18, n, true); h.setUint32(22, n, true); h.setUint16(26, name.length, true);
    parts.push(h.buffer, name as BlobPart, f.data as BlobPart);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(14, 0x21, true);
    c.setUint32(16, crc, true); c.setUint32(20, n, true); c.setUint32(24, n, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    central.push(c.buffer, name as BlobPart);
    offset += 30 + name.length + n; cd += 46 + name.length;
  }
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cd, true); e.setUint32(16, offset, true);
  return new Blob([...parts, ...central, e.buffer], { type: "application/zip" });
}
function Pictures() {
  const [state, setState] = useState(""), [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); setState("Finding your pictures…");
    const list = await pictureList().catch(() => []);
    if (!list.length) { setBusy(false); setState("No uploaded pictures found."); return; }
    const files: { name: string; data: Uint8Array }[] = [], used = new Set<string>();
    let missed = 0;
    for (let i = 0; i < list.length; i++) {
      setState(`Downloading ${i + 1} of ${list.length}…`);
      try {
        const r = await fetch(list[i].url);
        if (!r.ok) throw new Error();
        const type = r.headers.get("content-type") ?? "";
        let name = list[i].name.replace(/[\\/:*?"<>|]+/g, "-").slice(-80) || `file-${i + 1}`;
        if (!/\.[a-z0-9]{2,5}$/i.test(name)) name += type.includes("png") ? ".png" : type.includes("webp") ? ".webp" : type.includes("gif") ? ".gif" : type.includes("pdf") ? ".pdf" : type.includes("video") ? ".mp4" : type.includes("audio") ? ".mp3" : ".jpg";
        while (used.has(name)) name = name.replace(/(\.[a-z0-9]+)?$/i, `-${i + 1}$1`);
        used.add(name);
        files.push({ name, data: new Uint8Array(await r.arrayBuffer()) });
      } catch { missed++; }
    }
    const blob = zip(files), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `site-pictures-${new Date().toISOString().slice(0, 10)}.zip`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
    setBusy(false); setState(`Saved ${files.length} file${files.length === 1 ? "" : "s"} (${kb(blob.size)})${missed ? `. ${missed} couldn't be downloaded (the Overview's Site health finds broken ones)` : ""}.`);
  };
  return (
    <Card title="Download all pictures" icon="photo-down">
      <div className="hint">Every picture, video, sound and PDF you uploaded, in one ZIP file. Backups hold your words and settings; this keeps the files.</div>
      <div className="btns"><button type="button" className="b-mint b-sm" disabled={busy} onClick={go}><i className={`ti ti-${busy ? "loader-2 spin" : "file-zip"}`} />{busy ? "Working…" : "Download ZIP"}</button></div>
      {state && <div className="hint">{state}</div>}
    </Card>
  );
}

// ================= Login & security =================
export function SecurityTab({ twoStep, logins, devices, current, children }: {
  twoStep: boolean; logins: { at: string; ok: boolean; ip: string; device: string; note: string }[];
  devices: { sid: string; device: string; ip: string; created: string; seen: string }[]; current: string; children: React.ReactNode;
}) {
  const { ops, set } = useOps();
  const dv = useAct();
  return (<>
    {children /* the password form and Log out buttons, drawn by the page */}
    <TwoStep on={twoStep} />
    <Card title="Lock after wrong passwords" icon="lock" k="lockout" flag={{ value: ops.lockout.on, set: (v) => set("lockout", { on: v }) }}>
      <div className="ops-row">
        <Range id="ops-tries" label="After" value={ops.lockout.tries} lim={OPS_LIMITS.tries} unit=" wrong tries" onChange={(v) => set("lockout", { tries: v }, true)} />
        <Range id="ops-min" label="they wait" value={ops.lockout.minutes} lim={OPS_LIMITS.minutes} unit=" minutes" onChange={(v) => set("lockout", { minutes: v }, true)} />
      </div>
      <div className="hint">Only the place the wrong tries came from is locked, so you can still sign in from your own phone or Wi-Fi.</div>
    </Card>
    <Card title="Login history" icon="list-details" k="loginLog" flag={{ value: ops.loginLog.on, set: (v) => set("loginLog", { on: v }) }}>
      <div className="hint">{ops.loginLog.on ? "Every sign-in and wrong try." : "Off: only wrong tries are listed, because the lock needs them."}</div>
      {logins.length ? (
        <ul className="ops-list">{logins.map((l, i) => (
          <li key={i}>
            <i className={`ti ti-${l.ok ? "circle-check" : "circle-x"} ops-li${l.ok ? "" : " bad"}`} aria-hidden />
            <div className="grow"><b>{l.ok ? "Signed in" : "Wrong try"}{l.note ? ` (${l.note})` : ""}</b><small><When at={l.at} /> · {l.device} · {l.ip}</small></div>
          </li>
        ))}</ul>
      ) : <div className="hint">Nothing yet.</div>}
    </Card>
    <Card title="Your devices" icon="devices" state={<span className="ops-count">{devices.length}</span>}>
      <div className="hint">Where you&apos;re signed in to the dashboard. Sign out one you don&apos;t know, then change your password.</div>
      <dv.Msg />
      <ul className="ops-list">{devices.map((d) => (
        <li key={d.sid}>
          <i className={`ti ti-${/Android|iPhone/.test(d.device) ? "device-mobile" : "device-laptop"} ops-li`} aria-hidden />
          <div className="grow"><b>{d.device || "A device"}{d.sid === current && <span className="ops-tag">This device</span>}</b><small>{d.ip} · signed in <When at={d.created} /> · last seen <When at={d.seen} /></small></div>
          {d.sid !== current && <Sure label="Sign out" yes="Sign it out" icon="logout" disabled={!!dv.busy} onYes={() => dv.run(d.sid, () => signOutDevice(d.sid))} />}
        </li>
      ))}</ul>
      {!devices.length && <div className="hint">Devices appear here from their next sign-in.</div>}
    </Card>
  </>);
}

function TwoStep({ on }: { on: boolean }) {
  const { busy, run, Msg } = useAct();
  const [setup, setSetup] = useState<{ secret: string; svg: string } | null>(null), [code, setCode] = useState(""), [codes, setCodes] = useState<string[] | null>(null);
  const [pw, setPw] = useState(""), [err, setErr] = useState(""), [asking, setAsking] = useState(false);
  const start = async () => {
    setErr("");
    const r = await twoStepStart();
    if (!r.ok) { setErr(r.error); return; }
    const m = await import("qrcode-generator");
    const q = (m.default as unknown as (t: number, l: string) => { addData: (s: string) => void; make: () => void; createSvgTag: (o: object) => string })(0, "M");
    q.addData(r.uri); q.make();
    setSetup({ secret: r.secret, svg: q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }) });
  };
  const confirm = async () => { setErr(""); const r = await twoStepConfirm(code); if (!r.ok) { setErr(r.error); return; } setCodes(r.codes); setSetup(null); setCode(""); };
  const fresh = async () => { setErr(""); const r = await twoStepNewCodes(pw); if (!r.ok) { setErr(r.error); return; } setCodes(r.codes); setPw(""); };
  // the corner switch: on starts the setup; off asks for the password first
  const flip = (v: boolean) => { if (v && !on) start(); if (!v && on) setAsking(true); };
  return (
    <Card title="Two-step login" icon="shield-lock" flag={{ value: on || !!setup, set: flip }}>
      <div className="hint">After your password, the dashboard asks for a 6-digit code from a free app on your phone (Google Authenticator, Microsoft Authenticator or Authy). Someone who learns your password still can&apos;t get in.</div>
      {codes && (
        <div className="ops-preview">
          <b>Your recovery codes: save them somewhere safe now</b>
          <small>If you lose your phone, each works once instead of a code. They won&apos;t be shown again.</small>
          <pre className="ops-codes">{codes.join("\n")}</pre>
          <div className="btns"><button type="button" className="b-out b-sm" onClick={() => navigator.clipboard?.writeText(codes.join("\n")).catch(() => {})}><i className="ti ti-copy" />Copy them</button><button type="button" className="b-mint b-sm" onClick={() => setCodes(null)}>I&apos;ve saved them</button></div>
        </div>
      )}
      {setup && (
        <div className="ops-2fa">
          <div className="ops-qr" dangerouslySetInnerHTML={{ __html: setup.svg }} />
          <div className="f">
            <div><b>1.</b> In the app, add an account and scan this picture.</div>
            <div className="hint">Can&apos;t scan? Type this key instead: <code className="ops-key">{setup.secret.replace(/(.{4})/g, "$1 ").trim()}</code></div>
            <div><b>2.</b> Type the 6 digits the app shows:</div>
            <div className="btns"><input className="inp" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" style={{ maxWidth: 140 }} aria-label="Code from the app" /><button type="button" className="b-mint b-sm" disabled={code.replace(/\s/g, "").length !== 6} onClick={confirm}>Switch it on</button><button type="button" className="b-out b-sm" onClick={() => setSetup(null)}>Cancel</button></div>
          </div>
        </div>
      )}
      {on && !codes && (
        <div className="f">
          <div className="fl"><label htmlFor="ops-2pw">{asking ? "Type your password to switch two-step login off" : "Your password, to change two-step login"}</label><PasswordInput id="ops-2pw" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} style={{ maxWidth: 280 }} /></div>
          <div className="btns">
            <button type="button" className="b-out b-sm" disabled={!pw} onClick={fresh}><i className="ti ti-refresh" />New recovery codes</button>
            {asking
              ? <><button type="button" className="b-yes b-sm" disabled={!pw || !!busy} onClick={async () => { if (await run("off", () => twoStepOff(pw))) { setAsking(false); setPw(""); } }}>Switch it off</button><button type="button" className="b-out b-sm" onClick={() => setAsking(false)}>Cancel</button></>
              : <Sure label="Turn it off" yes="Yes, turn two-step login off" icon="shield-off" disabled={!pw || !!busy} onYes={() => run("off", () => twoStepOff(pw))} />}
          </div>
        </div>
      )}
      {err && <div className="err">{err}</div>}
      <Msg />
    </Card>
  );
}

// ================= Site status =================
export function StatusTab({ useBlob, siteTitle, siteText, avatar, hasPrivatePw }: { useBlob: boolean; siteTitle: string; siteText: string; avatar: string; hasPrivatePw: boolean }) {
  const { ops, set } = useOps();
  const pv = useAct();
  const [pw, setPw] = useState("");
  const share = ops.share, img = share.image || avatar;
  const [host, setHost] = useState("YOUR SITE");
  useEffect(() => { setHost(location.host.toUpperCase()); }, []);
  return (<>
    <Card title="Maintenance mode" icon="tool" k="maintenance" flag={{ value: ops.maintenance.on, set: (v) => set("maintenance", { on: v }) }}>
      <div className="hint">Visitors see a “Back soon” page instead of the site. You keep seeing the real site while you&apos;re signed in, with a note at the bottom. <a href="/?gate=see" target="_blank">See what visitors see</a>.</div>
      <div className="f3"><Txt id="ops-me" label="Emoji" value={ops.maintenance.emoji} max={8} onChange={(v) => set("maintenance", { emoji: v }, true)} /><Txt id="ops-mt" label="Headline" value={ops.maintenance.title} max={80} onChange={(v) => set("maintenance", { title: v }, true)} /></div>
      <Txt id="ops-mx" label="Words under it" value={ops.maintenance.text} max={300} area onChange={(v) => set("maintenance", { text: v }, true)} />
    </Card>
    <Card title="Private mode" icon="lock-square" k="private" flag={{ value: ops.private.on, set: (v) => set("private", { on: v }) }} state={<span className={`ops-count${hasPrivatePw ? " on" : ""}`}>{hasPrivatePw ? "Password set" : "No password yet"}</span>}>
      <div className="hint">The site needs a password to view. For a site that isn&apos;t ready yet: it keeps visitors out, but it&apos;s a curtain, not a safe, so don&apos;t put secrets on it. Google is told to stay away while it&apos;s on. Maintenance mode wins if both are on.</div>
      <div className="fl"><label htmlFor="ops-ppw">The password visitors type (not your dashboard password)</label>
        <div className="btns"><PasswordInput id="ops-ppw" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={hasPrivatePw ? "Type a new one to change it" : "Choose a password"} style={{ maxWidth: 260 }} /><button type="button" className="b-mint b-sm" disabled={pw.length < 4 || !!pv.busy} onClick={async () => { if (await pv.run("pw", () => setPrivatePassword(pw))) setPw(""); }}>Save password</button></div></div>
      <pv.Msg />
      <div className="f2"><Txt id="ops-pt" label="Headline" value={ops.private.title} max={80} onChange={(v) => set("private", { title: v }, true)} /><Txt id="ops-px" label="Words under it" value={ops.private.text} max={200} onChange={(v) => set("private", { text: v }, true)} /></div>
    </Card>
    <Card title="Hide from Google" icon="eye-off" k="noindex" flag={{ value: ops.noindex, set: (v) => set("noindex", v) }}>
      <div className="hint">Asks Google and other search engines not to list the site. People with the link can still visit. Search engines take a few days to notice either way.</div>
    </Card>
    <Card title="Link preview" icon="share" k="share" flag={{ value: ops.share.on, set: (v) => set("share", { on: v }) }} onLabel="My own" offLabel="Automatic">
      <div className="ops-share">
        <div className="ops-shot">{img ? <img src={img} alt="" /> : <i className="ti ti-photo" />}</div>
        <div className="ops-meta"><small>{host}</small><b>{(share.on && share.title) || siteTitle}</b><span>{(share.on && share.text) || siteText}</span></div>
      </div>
      <div className="hint">How your link looks on Facebook, WhatsApp and Messenger. Automatic uses your photo, site title and description. A picture about 1200 × 630 works best.</div>
      <span className="lab">Picture</span>
      <UploadField name="ops-share-img" initial={share.image} shape="wide" useBlob={useBlob} onChange={(v) => set("share", { image: v })} />
      <div className="f2"><Txt id="ops-st" label="Title (empty: your site title)" value={share.title} max={90} onChange={(v) => set("share", { title: v }, true)} /><Txt id="ops-sx" label="Text (empty: your description)" value={share.text} max={200} onChange={(v) => set("share", { text: v }, true)} /></div>
    </Card>
    <Card title="Icons" icon="app-window" k="icons">
      <div className="f2">
        <div className="fl"><span className="lab">Browser tab icon</span><UploadField name="ops-tab" initial={ops.icons.tab} shape="sq" useBlob={useBlob} onChange={(v) => set("icons", { tab: v })} /><div className="hint">A square picture. Empty keeps the current one.</div></div>
        <div className="fl"><span className="lab">Phone home-screen icon</span><UploadField name="ops-app" initial={ops.icons.app} shape="sq" useBlob={useBlob} onChange={(v) => set("icons", { app: v })} /><div className="hint">Shown when someone adds your site to their phone. Square, at least 512 × 512.</div></div>
      </div>
      <Txt id="ops-an" label="Name under the phone icon (empty: your nickname)" value={ops.icons.appName} max={30} onChange={(v) => set("icons", { appName: v }, true)} />
    </Card>
  </>);
}

// ================= Visitors & messages =================
export function VisitorsTab({ week, bot, chat, words, blocked }: { week: number; bot: string; chat: boolean; words: string; blocked: { key: string; name: string }[] }) {
  const { ops, set } = useOps();
  const tg = useAct(), sp = useAct();
  const [token, setToken] = useState(""), [w, setW] = useState(words);
  return (<>
    <Card title="Your own visits" icon="user-check" k="countMe" flag={{ value: ops.countMe, set: (v) => set("countMe", v) }} onLabel="Counted" offLabel="Not counted">
      <div className="hint">{week} visitors in the last 7 days{ops.countMe ? ", including you." : ". Browsers you've signed in to the dashboard on aren't counted as visitors or as people here now."}</div>
    </Card>
    <Card title="Phone alerts on Telegram" icon="brand-telegram" k="alerts" flag={{ value: ops.alerts.on, set: (v) => set("alerts", { on: v }) }} state={<span className={`ops-count${bot && chat ? " on" : ""}`}>{bot && chat ? "Connected" : bot ? "Half way" : "Not connected"}</span>}>
      <div className="stu-switches ops-sub">
        <Sw checked={ops.alerts.chat} onChange={(v) => set("alerts", { chat: v })}>When someone writes in the chat</Sw>
        <Sw checked={ops.alerts.comments} onChange={(v) => set("alerts", { comments: v })}>When someone comments on an entry</Sw>
        <Sw checked={ops.alerts.reactions} onChange={(v) => set("alerts", { reactions: v })}>When someone reacts (can be a lot)</Sw>
      </div>
      {!bot ? (<>
        <ol className="ops-steps">
          <li>In Telegram, open <b>@BotFather</b>, send <code>/newbot</code>, and give your bot any name (only you use it).</li>
          <li>BotFather replies with a token like <code>123456789:AAH…</code>. Paste it here:</li>
        </ol>
        <div className="btns"><input className="inp" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Bot token" autoComplete="off" style={{ maxWidth: 360 }} aria-label="Bot token" /><button type="button" className="b-mint b-sm" disabled={!token.trim() || !!tg.busy} onClick={() => tg.run("tok", () => telegramToken(token))}>Connect</button></div>
      </>) : (<>
        <div className="hint">Your bot: <b>@{bot}</b>{chat ? ". Alerts go to your Telegram." : ". Open it in Telegram, press Start (or send it any message), then press Find my chat."}</div>
        <div className="btns">
          <button type="button" className={chat ? "b-out b-sm" : "b-mint b-sm"} disabled={!!tg.busy} onClick={() => tg.run("find", telegramFindChat)}><i className="ti ti-search" />Find my chat</button>
          <button type="button" className="b-out b-sm" disabled={!chat || !!tg.busy} onClick={() => tg.run("test", telegramTest)}><i className="ti ti-send" />Send a test</button>
          <Sure label="Disconnect" yes="Yes, disconnect" icon="plug-off" onYes={() => tg.run("forget", telegramForget)} />
        </div>
      </>)}
      <tg.Msg />
    </Card>
    <Card title="Spam control" icon="shield-x" k="spam" flag={{ value: ops.spam.on, set: (v) => set("spam", { on: v }) }}>
      <Range id="ops-ph" label="At most" value={ops.spam.perHour} lim={OPS_LIMITS.perHour} unit=" chat messages an hour from one visitor" onChange={(v) => set("spam", { perHour: v }, true)} />
      <div className="fl"><label htmlFor="ops-words">Blocked words (one per line, or separated by commas)</label><textarea id="ops-words" className="inp" rows={4} value={w} onChange={(e) => setW(e.target.value)} placeholder={"casino\nfree money\nhttp://"} /><div className="hint">A chat message or comment containing any of them isn&apos;t sent. Capitals don&apos;t matter. Only you see this list.</div></div>
      <div className="btns"><button type="button" className="b-mint b-sm" disabled={w === words || !!sp.busy} onClick={() => sp.run("words", () => saveSpamWords(w))}>Save words</button></div>
      <span className="lab">Blocked visitors</span>
      {blocked.length ? (
        <ul className="ops-list">{blocked.map((b) => (
          <li key={b.key}><i className="ti ti-user-off ops-li" aria-hidden /><div className="grow"><b>{b.name || "A visitor"}</b></div><button type="button" className="b-out b-sm" disabled={!!sp.busy} onClick={() => sp.run(b.key, () => unblock(b.key))}>Unblock</button></li>
        ))}</ul>
      ) : <div className="hint">Nobody. Block someone from their chat in the Inbox (Block, at the top of a chat). They can&apos;t send messages or comments, and they&apos;re told it was sent, so they don&apos;t try another way. Blocked visitors stay blocked even with spam control off.</div>}
      <sp.Msg />
    </Card>
    <Card title="Clean-up" icon="trash-x" k="cleanup" flag={{ value: ops.cleanup.on, set: (v) => set("cleanup", { on: v }) }}>
      <Range id="ops-cl" label="Delete chat messages older than" value={ops.cleanup.months} lim={OPS_LIMITS.months} unit=" months" onChange={(v) => set("cleanup", { months: v }, true)} />
      <div className="hint">They go to the recycle bin first, if it&apos;s on. Notes on your Wall go too, so keep this off if you want them forever.</div>
    </Card>
  </>);
}

/** the Inbox's Block button for an open chat */
export function BlockChatButton({ chat }: { chat: string }) {
  const { busy, run, Msg } = useAct();
  return <span className="ops-block"><Sure label="Block" yes="Block this visitor" icon="ban" disabled={!!busy} onYes={() => run("b", () => blockChat(chat))} /><Msg /></span>;
}
