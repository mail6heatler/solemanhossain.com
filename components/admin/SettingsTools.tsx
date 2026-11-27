"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  backupNow, binDelete, binEmpty, binRestore, blockChat, dangerZone, deleteBackup, historyGoBack, pictureList, refreshSite, restoreBackup,
  runHealthCheck, saveSpamWords, setPrivatePassword, signOutDevice, telegramFindChat, telegramForget, telegramTest, telegramToken,
  twoStepConfirm, twoStepNewCodes, twoStepOff, twoStepStart, unblock,
} from "@/app/opsActions";

// Settings' lists and buttons that act at once (Settings → each tab). Each shows its own result under it.
type R = { ok: true; note?: string } | { ok: false; error: string };
const When = ({ at }: { at: string }) => <time dateTime={at} suppressHydrationWarning>{new Date(at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</time>;
const kb = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function useAct() {
  const router = useRouter();
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null);
  const run = async (key: string, fn: () => Promise<R>) => {
    setBusy(key); setMsg(null);
    const r = await fn().catch(() => ({ ok: false, error: "That didn't work. Check your connection and try again." }) as R);
    setBusy("");
    setMsg(r.ok ? (r.note ? { t: r.note } : null) : { t: r.error, bad: true });
    if (r.ok) router.refresh();
    return r.ok;
  };
  const Msg = () => (msg ? <div className={msg.bad ? "err" : "ops-ok"} role="status">{msg.bad ? "" : "✓ "}{msg.t}</div> : null);
  return { busy, run, Msg, setMsg };
}
/** a button that asks once more in place before doing something hard to undo */
function Sure({ label, yes, icon, onYes, disabled, danger = true }: { label: string; yes: string; icon: string; onYes: () => void; disabled?: boolean; danger?: boolean }) {
  const [ask, setAsk] = useState(false);
  if (!ask) return <button type="button" className="b-out b-sm" disabled={disabled} onClick={() => setAsk(true)}><i className={`ti ti-${icon}`} />{label}</button>;
  return (
    <span className="ops-sure">
      <button type="button" className={danger ? "b-yes b-sm" : "b-mint b-sm"} onClick={() => { setAsk(false); onYes(); }}>{yes}</button>
      <button type="button" className="b-out b-sm" autoFocus onClick={() => setAsk(false)}>Cancel</button>
    </span>
  );
}

// ---------- backups ----------
type Backup = { id: number; at: string; kind: string; size: number; summary: string };
const KIND: Record<string, string> = { auto: "Automatic", manual: "Made by you", "before-restore": "Before a restore" };
export function BackupsTool({ list }: { list: Backup[] }) {
  const { busy, run, Msg } = useAct();
  const [withSettings, setWith] = useState(true);
  return (
    <section className="c f ops-box">
      <div className="ops-h"><i className="ti ti-database" aria-hidden /><b>Your backups</b><span className="ops-count">{list.length}</span></div>
      <div className="btns"><button type="button" className="b-mint b-sm" disabled={!!busy} onClick={() => run("now", backupNow)}><i className={`ti ti-${busy === "now" ? "loader-2 spin" : "device-floppy"}`} />{busy === "now" ? "Backing up…" : "Back up now"}</button><a className="b-out b-sm" href="/api/export"><i className="ti ti-download" />Export everything now</a></div>
      <label className="switch"><input type="checkbox" checked={withSettings} onChange={(e) => setWith(e.target.checked)} />Restoring also brings back that day&apos;s settings (look, menu, footer…). Your login and security switches always stay as they are.</label>
      <Msg />
      {list.length ? (
        <ul className="ops-list">{list.map((b) => (
          <li key={b.id}>
            <div className="grow"><b><When at={b.at} /></b><small>{KIND[b.kind] ?? b.kind} · {b.summary} · {kb(b.size)}</small></div>
            <div className="btns">
              <a className="b-out b-sm" href={`/api/backup/${b.id}`}><i className="ti ti-download" />Download</a>
              <Sure label="Restore" yes="Yes, restore it" icon="restore" disabled={!!busy} danger={false} onYes={() => run(`r${b.id}`, () => restoreBackup(b.id, withSettings))} />
              <Sure label="" yes="Delete" icon="trash" disabled={!!busy} onYes={() => run(`d${b.id}`, () => deleteBackup(b.id))} />
            </div>
          </li>
        ))}</ul>
      ) : <div className="hint">No backups yet. The first automatic one is made within a few minutes, or press Back up now.</div>}
      <div className="hint">A restore first saves how everything is now (Before a restore), so it can be undone the same way.</div>
    </section>
  );
}

export function RestoreFileTool() {
  const router = useRouter();
  const [data, setData] = useState<unknown>(null), [info, setInfo] = useState<{ summary: string; createdAt: string; hasSettings: boolean } | null>(null);
  const [err, setErr] = useState(""), [ok, setOk] = useState(""), [busy, setBusy] = useState(false), [withSettings, setWith] = useState(true);
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
    <section className="c f ops-box">
      <div className="ops-h"><i className="ti ti-file-upload" aria-hidden /><b>Restore from a file</b></div>
      <div className="hint">A backup you downloaded, or an Export file. You see what&apos;s in it before anything changes.</div>
      <input type="file" accept="application/json,.json" className="inp" onChange={(e) => pick(e.target.files?.[0])} aria-label="Choose a backup file" />
      {busy && <div className="hint">Reading…</div>}
      {err && <div className="err">{err}</div>}
      {info && (
        <div className="ops-preview">
          <b>This file holds: {info.summary}</b>
          {info.createdAt && <small>Made <When at={info.createdAt} /></small>}
          {info.hasSettings && <label className="switch"><input type="checkbox" checked={withSettings} onChange={(e) => setWith(e.target.checked)} />Also bring back its settings</label>}
          <Sure label="Restore this file" yes="Yes, replace everything with it" icon="restore" onYes={async () => { setBusy(true); const j = await post("apply", data); setBusy(false); if (j.error) setErr(j.error); else { setOk(`Restored: ${j.summary}. How it was just before is saved under Your backups.`); setInfo(null); router.refresh(); } }} />
        </div>
      )}
      {ok && <div className="ops-ok">✓ {ok}</div>}
    </section>
  );
}

// a ZIP file made in the browser (stored, not compressed: pictures are already compressed)
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b: Uint8Array) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function zip(files: { name: string; data: Uint8Array }[]) {
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
export function PicturesTool() {
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
    setBusy(false); setState(`Saved ${files.length} file${files.length === 1 ? "" : "s"} (${kb(blob.size)})${missed ? `. ${missed} couldn't be downloaded (the health check under Tools finds broken ones)` : ""}.`);
  };
  return (
    <section className="c f ops-box">
      <div className="ops-h"><i className="ti ti-photo-down" aria-hidden /><b>Download all pictures</b></div>
      <div className="hint">Every picture, video, sound and PDF you uploaded, in one ZIP file. Backups hold your words and settings; this keeps the files.</div>
      <div className="btns"><button type="button" className="b-mint b-sm" disabled={busy} onClick={go}><i className={`ti ti-${busy ? "loader-2 spin" : "file-zip"}`} />{busy ? "Working…" : "Download ZIP"}</button></div>
      {state && <div className="hint">{state}</div>}
    </section>
  );
}

// ---------- recycle bin and settings history ----------
const BIN_ICON: Record<string, string> = { entry: "file-text", section: "layout-grid", chat: "messages", message: "message", comment: "message-circle" };
export function BinTool({ list, on, days }: { list: { id: number; kind: string; label: string; at: string }[]; on: boolean; days: number }) {
  const { busy, run, Msg } = useAct();
  return (
    <section className="c f ops-box">
      <div className="ops-h"><i className="ti ti-trash" aria-hidden /><b>In the recycle bin</b><span className="ops-count">{list.length}</span></div>
      <div className="hint">{on ? `Deleted things wait here for ${days} days, then go for good.` : "The bin is off: deleting is for good. Switch it on above."}</div>
      <Msg />
      {list.length ? (<>
        <ul className="ops-list">{list.map((b) => (
          <li key={b.id}>
            <i className={`ti ti-${BIN_ICON[b.kind] ?? "file"} ops-li`} aria-hidden />
            <div className="grow"><b>{b.label}</b><small>Deleted <When at={b.at} /></small></div>
            <div className="btns">
              <button type="button" className="b-mint b-sm" disabled={!!busy} onClick={() => run(`p${b.id}`, () => binRestore(b.id))}><i className="ti ti-arrow-back-up" />Put back</button>
              <Sure label="" yes="Delete for good" icon="trash-x" disabled={!!busy} onYes={() => run(`x${b.id}`, () => binDelete(b.id))} />
            </div>
          </li>
        ))}</ul>
        <div className="btns"><Sure label="Empty the bin" yes="Yes, delete all of it for good" icon="trash-x" onYes={() => run("empty", binEmpty)} /></div>
      </>) : <div className="hint">Nothing in the bin.</div>}
    </section>
  );
}
export function HistoryTool({ list }: { list: { id: number; at: string; label: string; size: number }[] }) {
  const { busy, run, Msg } = useAct();
  return (
    <section className="c f ops-box">
      <div className="ops-h"><i className="ti ti-history" aria-hidden /><b>Earlier settings</b><span className="ops-count">{list.length}</span></div>
      <div className="hint">How your settings were before each change: the look, menu bar, footer, hero, mascot, launch screen and the rest. Going back keeps your login and security switches as they are now.</div>
      <Msg />
      {list.length ? (
        <ul className="ops-list">{list.map((h) => (
          <li key={h.id}>
            <div className="grow"><b><When at={h.at} /></b><small>Before: {h.label}</small></div>
            <Sure label="Go back to this" yes="Yes, go back" icon="arrow-back-up" danger={false} disabled={!!busy} onYes={() => run(`h${h.id}`, () => historyGoBack(h.id))} />
          </li>
        ))}</ul>
      ) : <div className="hint">Nothing yet. A copy is kept the next time you save something.</div>}
    </section>
  );
}

// ---------- login and security ----------
export function DevicesTool({ list, current }: { list: { sid: string; device: string; ip: string; created: string; seen: string }[]; current: string }) {
  const { busy, run, Msg } = useAct();
  return (
    <section className="c f ops-box">
      <div className="ops-h"><i className="ti ti-devices" aria-hidden /><b>Your devices</b><span className="ops-count">{list.length}</span></div>
      <div className="hint">Where you&apos;re signed in to the dashboard. Sign out one you don&apos;t know, then change your password.</div>
      <Msg />
      <ul className="ops-list">{list.map((d) => (
        <li key={d.sid}>
          <i className={`ti ti-${/Android|iPhone/.test(d.device) ? "device-mobile" : "device-laptop"} ops-li`} aria-hidden />
          <div className="grow"><b>{d.device || "A device"}{d.sid === current && <span className="ops-tag">This device</span>}</b><small>{d.ip} · signed in <When at={d.created} /> · last seen <When at={d.seen} /></small></div>
          {d.sid !== current && <Sure label="Sign out" yes="Sign it out" icon="logout" disabled={!!busy} onYes={() => run(d.sid, () => signOutDevice(d.sid))} />}
        </li>
      ))}</ul>
      {!list.length && <div className="hint">Devices appear here from their next sign-in.</div>}
    </section>
  );
}

export function TwoStepTool({ on }: { on: boolean }) {
  const { busy, run, Msg } = useAct();
  const [setup, setSetup] = useState<{ secret: string; svg: string } | null>(null), [code, setCode] = useState(""), [codes, setCodes] = useState<string[] | null>(null);
  const [pw, setPw] = useState(""), [err, setErr] = useState("");
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
  const copy = (t: string) => { navigator.clipboard?.writeText(t).catch(() => {}); };
  return (
    <section className="c f ops-box">
      <div className="ops-h"><i className="ti ti-shield-lock" aria-hidden /><b>Two-step login</b><span className={`ops-state${on ? " on" : ""}`}>{on ? "On" : "Off"}</span></div>
      <div className="hint">After your password, the dashboard also asks for a 6-digit code from a free app on your phone (Google Authenticator, Microsoft Authenticator or Authy). Someone who learns your password still can&apos;t get in.</div>
      {codes && (
        <div className="ops-preview">
          <b>Your recovery codes: save them somewhere safe now</b>
          <small>If you lose your phone, each of these works once instead of a code. They won&apos;t be shown again.</small>
          <pre className="ops-codes">{codes.join("\n")}</pre>
          <div className="btns"><button type="button" className="b-out b-sm" onClick={() => copy(codes.join("\n"))}><i className="ti ti-copy" />Copy them</button><button type="button" className="b-mint b-sm" onClick={() => setCodes(null)}>I&apos;ve saved them</button></div>
        </div>
      )}
      {!on && !setup && !codes && <div className="btns"><button type="button" className="b-mint b-sm" onClick={start}><i className="ti ti-shield-plus" />Set up two-step login</button></div>}
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
          <div className="fl"><label htmlFor="ops-2pw">Your password, to change two-step login</label><input id="ops-2pw" className="inp" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} style={{ maxWidth: 280 }} /></div>
          <div className="btns"><button type="button" className="b-out b-sm" disabled={!pw} onClick={fresh}><i className="ti ti-refresh" />New recovery codes</button><Sure label="Turn it off" yes="Yes, turn two-step login off" icon="shield-off" disabled={!pw || !!busy} onYes={() => run("off", () => twoStepOff(pw))} /></div>
        </div>
      )}
      {err && <div className="err">{err}</div>}
      <Msg />
    </section>
  );
}

// ---------- site status ----------
export function PrivatePwTool({ has }: { has: boolean }) {
  const { busy, run, Msg } = useAct();
  const [pw, setPw] = useState("");
  return (
    <section className="c f ops-box">
      <div className="ops-h"><i className="ti ti-key" aria-hidden /><b>Private mode&apos;s password</b><span className={`ops-state${has ? " on" : ""}`}>{has ? "Set" : "Not set"}</span></div>
      <div className="hint">The password visitors type to come in while private mode is on. Not your dashboard password: give this one to the people you want to let in.</div>
      <div className="btns"><input className="inp" type="text" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={has ? "Type a new one to change it" : "Choose a password"} style={{ maxWidth: 280 }} aria-label="Private mode password" /><button type="button" className="b-mint b-sm" disabled={pw.length < 4 || !!busy} onClick={async () => { if (await run("pw", () => setPrivatePassword(pw))) setPw(""); }}>Save password</button></div>
      <Msg />
    </section>
  );
}

// ---------- visitors and messages ----------
export function TelegramTool({ bot, chat }: { bot: string; chat: boolean }) {
  const { busy, run, Msg } = useAct();
  const [token, setToken] = useState("");
  return (
    <section className="c f ops-box">
      <div className="ops-h"><i className="ti ti-brand-telegram" aria-hidden /><b>Connect Telegram</b><span className={`ops-state${bot && chat ? " on" : ""}`}>{bot && chat ? "Connected" : bot ? "Half way" : "Not connected"}</span></div>
      {!bot ? (<>
        <ol className="ops-steps">
          <li>In Telegram, open <b>@BotFather</b>, send <code>/newbot</code>, and give your bot any name (it&apos;s only yours).</li>
          <li>BotFather replies with a token like <code>123456789:AAH…</code>. Paste it here:</li>
        </ol>
        <div className="btns"><input className="inp" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Bot token" autoComplete="off" style={{ maxWidth: 360 }} aria-label="Bot token" /><button type="button" className="b-mint b-sm" disabled={!token.trim() || !!busy} onClick={() => run("tok", () => telegramToken(token))}>Connect</button></div>
      </>) : (<>
        <div className="hint">Your bot: <b>@{bot}</b>{chat ? ". Alerts go to your Telegram." : ". Open it in Telegram, press Start (or send it any message), then press Find my chat."}</div>
        <div className="btns">
          <button type="button" className={chat ? "b-out b-sm" : "b-mint b-sm"} disabled={!!busy} onClick={() => run("find", telegramFindChat)}><i className="ti ti-search" />Find my chat</button>
          <button type="button" className="b-out b-sm" disabled={!chat || !!busy} onClick={() => run("test", telegramTest)}><i className="ti ti-send" />Send a test</button>
          <Sure label="Disconnect" yes="Yes, disconnect" icon="plug-off" onYes={() => run("forget", telegramForget)} />
        </div>
      </>)}
      <Msg />
    </section>
  );
}

export function SpamTool({ words, blocked }: { words: string; blocked: { key: string; name: string }[] }) {
  const { busy, run, Msg } = useAct();
  const [w, setW] = useState(words);
  return (
    <section className="c f ops-box">
      <div className="ops-h"><i className="ti ti-ban" aria-hidden /><b>Blocked words and visitors</b></div>
      <div className="fl"><label htmlFor="ops-words">Blocked words (one per line, or separated by commas)</label><textarea id="ops-words" className="inp" rows={4} value={w} onChange={(e) => setW(e.target.value)} placeholder={"casino\nfree money\nhttp://"} /><div className="hint">A chat message or comment containing any of them isn&apos;t sent. Capitals don&apos;t matter. Only you see this list.</div></div>
      <div className="btns"><button type="button" className="b-mint b-sm" disabled={w === words || !!busy} onClick={() => run("words", () => saveSpamWords(w))}>Save words</button></div>
      <span className="lab">Blocked visitors</span>
      {blocked.length ? (
        <ul className="ops-list">{blocked.map((b) => (
          <li key={b.key}><i className="ti ti-user-off ops-li" aria-hidden /><div className="grow"><b>{b.name || "A visitor"}</b></div><button type="button" className="b-out b-sm" disabled={!!busy} onClick={() => run(b.key, () => unblock(b.key))}>Unblock</button></li>
        ))}</ul>
      ) : <div className="hint">Nobody. Block someone from their chat in the Inbox (the Block button at the top of a chat). They can&apos;t send messages or comments, and they&apos;re told it was sent, so they don&apos;t try another way.</div>}
      <Msg />
    </section>
  );
}
/** the Inbox's Block button for an open chat */
export function BlockChatButton({ chat }: { chat: string }) {
  const { busy, run, Msg } = useAct();
  return <span className="ops-block"><Sure label="Block" yes="Block this visitor" icon="ban" disabled={!!busy} onYes={() => run("b", () => blockChat(chat))} /><Msg /></span>;
}

// ---------- tools ----------
type Health = Awaited<ReturnType<typeof runHealthCheck>>;
export function ToolsTool() {
  const { busy, run, Msg } = useAct();
  const [h, setH] = useState<Health | null>(null), [checking, setChecking] = useState(false);
  const [typed, setTyped] = useState<Record<string, string>>({});
  const check = async () => { setChecking(true); setH(await runHealthCheck().catch(() => null)); setChecking(false); };
  const DZ: [string, string, string][] = [
    ["reactions", "Clear every reaction", "All emoji reactions on every entry go back to zero."],
    ["votes", "Clear every poll vote", "Every poll starts again from no votes."],
    ["comments", "Delete every comment", "Every comment on every entry, and your replies to them."],
    ["messages", "Delete every chat and message", "The whole Inbox, and the notes on your Wall."],
    ["stats", "Reset visitor numbers", "Visitor counts, section views and people here now start from zero. These aren't in backups."],
  ];
  return (<>
    <section className="c f ops-box">
      <div className="ops-h"><i className="ti ti-refresh" aria-hidden /><b>Refresh the whole site</b></div>
      <div className="hint">Every page is made fresh at once. Saving already does this; use it if something on the site still looks old after a change.</div>
      <div className="btns"><button type="button" className="b-mint b-sm" disabled={!!busy} onClick={() => run("refresh", refreshSite)}><i className={`ti ti-${busy === "refresh" ? "loader-2 spin" : "refresh"}`} />Refresh now</button></div>
      <Msg />
    </section>
    <section className="c f ops-box">
      <div className="ops-h"><i className="ti ti-heart-rate-monitor" aria-hidden /><b>Health check</b></div>
      <div className="hint">Checks the database, counts what&apos;s stored, and looks for pictures that no longer load.</div>
      <div className="btns"><button type="button" className="b-mint b-sm" disabled={checking} onClick={check}><i className={`ti ti-${checking ? "loader-2 spin" : "stethoscope"}`} />{checking ? "Checking… (up to a minute)" : "Run the check"}</button></div>
      {h && (
        <div className="ops-health">
          <div><i className="ti ti-circle-check" /> Database answered in {h.dbMs} ms{h.dbMs > 800 ? " (slow: it may have been asleep)" : ""}.</div>
          <div><i className="ti ti-circle-check" /> {h.sections} sections, {h.items} entries, {h.messages} messages, {h.backups} backups.</div>
          <div><i className="ti ti-circle-check" /> {h.pictures} uploaded files in use{h.files ? `, ${h.files} kept in the database (${h.mb.toFixed(1)} MB)` : ""}.</div>
          {h.broken.length ? (
            <div className="err"><b>{h.broken.length} file{h.broken.length === 1 ? "" : "s"} no longer load:</b><ul>{h.broken.slice(0, 30).map((b) => <li key={b.url}>{b.where}: <a href={b.url} target="_blank" rel="noreferrer">{b.url.split("/").pop()}</a></li>)}</ul>Replace them in those entries.</div>
          ) : <div><i className="ti ti-circle-check" /> Every picture checked loads{h.checked < h.pictures ? ` (${h.checked} checked)` : ""}.</div>}
        </div>
      )}
    </section>
    <section className="c f ops-box ops-danger">
      <div className="ops-h"><i className="ti ti-alert-triangle" aria-hidden /><b>Danger zone</b></div>
      <div className="hint">Each needs the word DELETE typed first. A backup is made just before (except for visitor numbers).</div>
      <ul className="ops-list">{DZ.map(([k, t, desc]) => (
        <li key={k}>
          <div className="grow"><b>{t}</b><small>{desc}</small></div>
          <div className="btns"><input className="inp" value={typed[k] ?? ""} onChange={(e) => setTyped({ ...typed, [k]: e.target.value })} placeholder="Type DELETE" aria-label={`Type DELETE to ${t.toLowerCase()}`} style={{ width: 120 }} /><button type="button" className="b-yes b-sm" disabled={(typed[k] ?? "").trim().toUpperCase() !== "DELETE" || !!busy} onClick={async () => { if (await run(k, () => dangerZone(k, typed[k] ?? ""))) setTyped({ ...typed, [k]: "" }); }}>{t.split(" ")[0]}</button></div>
        </li>
      ))}</ul>
      <Msg />
    </section>
  </>);
}
