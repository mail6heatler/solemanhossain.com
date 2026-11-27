"use client";
import { useEffect, useState } from "react";
import type { OverviewLive } from "@/lib/opsServer";
import { backupNow, healthNow, liveOverview, speedNow } from "@/app/opsActions";

// The Overview's live cards (2026-11-27): site health, safety, site status, speed and alerts. They check in every 30 seconds
// while the page is open and visible. The heavier checks (broken pictures, Google's speed test) run once a day by themselves,
// and each has a button. Actions live in Settings; these only show how things are, with a link to where they're changed.

type Light = "ok" | "warn" | "bad" | "none";
const ago = (iso: string | null) => {
  if (!iso) return "never";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
};
const Row = ({ l, k, v, href }: { l: Light; k: string; v: React.ReactNode; href?: string }) => (
  <li className={`lv-row ${l}`}><i className="lv-dot" aria-hidden /><span>{k}</span><b>{href ? <a href={href}>{v}</a> : v}</b></li>
);

export default function LiveCards({ first }: { first: OverviewLive }) {
  const [d, setD] = useState(first), [, tick] = useState(0);
  const [busy, setBusy] = useState(""), [note, setNote] = useState("");
  useEffect(() => {
    let off = false;
    const pull = async () => { if (document.hidden) return; const x = await liveOverview().catch(() => null); if (x && !off) setD(x); };
    const t = setInterval(pull, 30_000), u = setInterval(() => tick((n) => n + 1), 30_000);
    const vis = () => { if (!document.hidden) pull(); };
    document.addEventListener("visibilitychange", vis);
    return () => { off = true; clearInterval(t); clearInterval(u); document.removeEventListener("visibilitychange", vis); };
  }, []);
  const act = async (key: string, fn: () => Promise<unknown>, done: string) => { setBusy(key); setNote(""); await fn().catch(() => null); const x = await liveOverview().catch(() => null); if (x) setD(x); setBusy(""); setNote(done); };

  const backupAge = d.lastBackup ? Date.now() - new Date(d.lastBackup).getTime() : Infinity;
  const due = (d.backups.every === "week" ? 8 : 1.5) * 86400_000;
  const db: Light = d.dbMs < 400 ? "ok" : d.dbMs < 1200 ? "warn" : "bad";
  const store: Light = d.mb < 300 ? "ok" : d.mb < 450 ? "warn" : "bad";
  const pics: Light = !d.health ? "none" : d.health.broken.length ? "bad" : "ok";
  const bk: Light = !d.backups.on ? "warn" : backupAge < due ? "ok" : d.lastBackup ? "warn" : "bad";
  const health = [db, store, pics, bk];
  const overall: Light = health.includes("bad") ? "bad" : health.includes("warn") ? "warn" : "ok";
  const sp = d.speed, spL: Light = !sp ? "none" : sp.score >= 90 ? "ok" : sp.score >= 50 ? "warn" : "bad";
  const st = d.status;

  return (
    <div className="lv">
      <section className={`c lv-card lv-${overall}`}>
        <div className="lv-h"><i className="ti ti-heart-rate-monitor" /><b>Site health</b><small className="lv-live"><i />live · {ago(d.at)}</small></div>
        <ul>
          <Row l={db} k="Database" v={`answers in ${d.dbMs} ms`} />
          <Row l={store} k="Stored in the database" v={`${d.mb.toFixed(1)} MB`} />
          <Row l={pics} k="Pictures" v={!d.health ? "not checked yet" : d.health.broken.length ? `${d.health.broken.length} broken` : `all ${d.health.pictures} load`} />
          <Row l={bk} k="Last backup" v={d.backups.on ? ago(d.lastBackup) : "automatic backups are off"} href="/admin/settings?tab=backups" />
        </ul>
        {d.health && d.health.broken.length > 0 && <ul className="lv-broken">{d.health.broken.slice(0, 5).map((b) => <li key={b.url}>{b.where}</li>)}{d.health.broken.length > 5 && <li>…and {d.health.broken.length - 5} more</li>}</ul>}
        <div className="btns">
          <button type="button" className="b-out b-sm" disabled={!!busy} onClick={() => act("pics", healthNow, "Pictures checked.")}><i className={`ti ti-${busy === "pics" ? "loader-2 spin" : "photo-search"}`} />{busy === "pics" ? "Checking pictures…" : "Check pictures now"}</button>
          <button type="button" className="b-out b-sm" disabled={!!busy} onClick={() => act("bk", backupNow, "Backup made.")}><i className={`ti ti-${busy === "bk" ? "loader-2 spin" : "device-floppy"}`} />Back up now</button>
        </div>
        <small className="lv-foot">Pictures are checked by themselves once a day{d.health ? `, last ${ago(d.health.at)}` : ""}.</small>
      </section>

      <section className={`c lv-card lv-${d.failed >= 5 ? "bad" : !d.twoStep || d.failed ? "warn" : "ok"}`}>
        <div className="lv-h"><i className="ti ti-shield-check" /><b>Safety</b></div>
        <ul>
          <Row l={d.twoStep ? "ok" : "warn"} k="Two-step login" v={d.twoStep ? "on" : "off"} href="/admin/settings?tab=security" />
          <Row l={d.lockout ? "ok" : "warn"} k="Lock after wrong passwords" v={d.lockout ? "on" : "off"} href="/admin/settings?tab=security" />
          <Row l={d.failed >= 5 ? "bad" : d.failed ? "warn" : "ok"} k="Wrong sign-ins, last 24 h" v={String(d.failed)} href="/admin/settings?tab=security" />
          <Row l="none" k="In the recycle bin" v={String(d.bin)} href="/admin/settings?tab=backups" />
        </ul>
        {d.failed >= 5 && <small className="lv-foot bad">Someone keeps trying to sign in. The lock stops them; switch two-step login on to be sure.</small>}
      </section>

      <section className={`c lv-card lv-${st.maintenance || st.private ? "warn" : "ok"}`}>
        <div className="lv-h"><i className="ti ti-world" /><b>Site status</b></div>
        <div className="lv-big">{st.maintenance ? "🛠️ Maintenance" : st.private ? "🔒 Private" : "🟢 Live"}</div>
        <ul>
          <Row l={st.noindex || st.private ? "warn" : "ok"} k="Google" v={st.noindex || st.private ? "asked to stay away" : "can list it"} href="/admin/settings?tab=status" />
          <Row l={d.unanswered ? "warn" : "ok"} k="Chats waiting for your reply" v={String(d.unanswered)} href="/admin/inbox?f=chats" />
          <Row l={!d.alerts.on ? "none" : d.alerts.connected ? "ok" : "warn"} k="Telegram alerts" v={!d.alerts.on ? "off" : d.alerts.connected ? `on · last ${ago(d.alerts.last)}` : "on, not connected"} href="/admin/settings?tab=visitors" />
        </ul>
        <a className="b-out b-sm" href="/admin/settings?tab=status"><i className="ti ti-adjustments" />Change</a>
      </section>

      <section className={`c lv-card lv-${spL}`}>
        <div className="lv-h"><i className="ti ti-gauge" /><b>Speed on a phone</b></div>
        {sp ? (<>
          <div className="lv-score"><svg viewBox="0 0 36 36" aria-hidden><circle cx="18" cy="18" r="15.5" className="t" pathLength={100} /><circle cx="18" cy="18" r="15.5" className="v" pathLength={100} style={{ strokeDasharray: `${sp.score} 100` }} /></svg><b>{sp.score}</b></div>
          <ul>
            <Row l="none" k="First thing shows" v={sp.fcp || "—"} />
            <Row l="none" k="Main picture shows" v={sp.lcp || "—"} />
            <Row l="none" k="Frozen while loading" v={sp.tbt || "—"} />
          </ul>
        </>) : <p className="lv-none">Not tested yet. It runs by itself once a day, or now:</p>}
        <div className="btns"><button type="button" className="b-out b-sm" disabled={!!busy} onClick={() => act("speed", speedNow, "Speed tested.")}><i className={`ti ti-${busy === "speed" ? "loader-2 spin" : "player-play"}`} />{busy === "speed" ? "Testing… (about 30 s)" : "Test now"}</button></div>
        <small className="lv-foot">Google&apos;s free test of your homepage on a phone{sp ? `, ${ago(sp.at)}` : ""}. 90 or more is great.</small>
      </section>
      {note && <div className="adm-toast stu-toast" role="status">{note}</div>}
    </div>
  );
}
