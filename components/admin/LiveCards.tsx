"use client";
import { useEffect, useRef, useState } from "react";
import type { OverviewLive } from "@/lib/opsServer";
import { backupNow, healthNow, liveOverview, speedNow } from "@/app/opsActions";

// The Overview's live cards (2026-11-27; the owner asked for charts, graphs and diagrams beside the words): site health, safety,
// activity, site status, the most viewed sections and speed. They check in every 20 seconds while the page is open and visible,
// and the live lines (database speed, people on the site) grow with each check. Every chart shows its numbers on hover or focus.
// Colours: three series hues validated for colour-blind separation on the dashboard's light and dark cards (--s1..--s3), and the
// fixed status hues (good, warning, critical), which always come with a word or an icon. Statuses here, actions in Settings.

type Light = "ok" | "warn" | "bad" | "none";
type Pt = { t: number; v: number };
type Day = OverviewLive["days"][number];
const ago = (iso: string | null) => {
  if (!iso) return "never";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
};
const dayName = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const clock = (t: number) => new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const sum = (rows: Day[], k: keyof Day) => rows.reduce((a, r) => a + Number(r[k]), 0);

/** a rounded top on a bar's last segment, flat on the baseline */
const topBar = (x: number, y: number, w: number, h: number) => {
  const r = Math.min(3, h / 2, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
};

/** 14 days as stacked bars, with a legend carrying each series' total and a tooltip per day */
function DayBars({ rows, series, label }: { rows: Day[]; series: { k: keyof Day; name: string; c: string }[]; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 280, H = 92, n = rows.length, gap = 3, bw = (W - gap * (n - 1)) / n;
  const max = Math.max(1, ...rows.map((r) => series.reduce((a, s) => a + Number(r[s.k]), 0)));
  return (
    <div className="lv-chart">
      <div className="lv-legend">{series.map((s) => <span key={String(s.k)}><i style={{ background: s.c }} />{s.name} <b>{sum(rows, s.k)}</b></span>)}</div>
      <div className="lv-plot">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="lv-bars" role="img" aria-label={label} onPointerLeave={() => setHover(null)}>
          <line x1="0" x2={W} y1={H - 0.5} y2={H - 0.5} className="lv-base" />
          {rows.map((r, i) => {
            const x = i * (bw + gap);
            const parts = series.map((s) => ({ s, v: Number(r[s.k]) })).filter((p) => p.v > 0);
            let y = H;
            return (
              <g key={r.day} className={hover === i ? "on" : hover !== null ? "dim" : ""}>
                {parts.map((p, pi) => {
                  const h = Math.max(2.5, (p.v / max) * (H - 4));
                  y -= h;
                  const below = pi > 0 ? 2 : 0; // a 2px gap in the card's colour between segments
                  return pi === parts.length - 1
                    ? <path key={String(p.s.k)} d={topBar(x, y, bw, h - below)} fill={p.s.c} />
                    : <rect key={String(p.s.k)} x={x} y={y} width={bw} height={Math.max(0.5, h - below)} fill={p.s.c} />;
                })}
                <rect x={x - gap / 2} y="0" width={bw + gap} height={H} fill="transparent" tabIndex={0} aria-label={`${dayName(r.day)}: ${series.map((s) => `${r[s.k]} ${s.name.toLowerCase()}`).join(", ")}`}
                  onPointerEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <div className={`lv-tip${hover > n * 0.6 ? " left" : ""}`} style={{ left: `${((hover + 0.5) / n) * 100}%` }}>
            <b>{hover === n - 1 ? "Today" : dayName(rows[hover].day)}</b>
            {series.map((s) => <span key={String(s.k)}><i style={{ background: s.c }} />{s.name} <b>{String(rows[hover][s.k])}</b></span>)}
          </div>
        )}
      </div>
      <div className="lv-axis"><span>{dayName(rows[0].day)}</span><span>most {max}</span><span>today</span></div>
    </div>
  );
}

/** a line that grows with each check (or a history), with a crosshair and the value under the pointer */
function LiveLine({ pts, unit, label, fmt, max: maxIn }: { pts: Pt[]; unit: string; label: string; fmt?: (t: number) => string; max?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<SVGSVGElement>(null);
  const W = 280, H = 56, pad = 4;
  if (!pts.length) return null;
  const max = maxIn ?? Math.max(1, ...pts.map((p) => p.v)) * 1.18;
  const X = (i: number) => (pts.length === 1 ? W : pad + (i / (pts.length - 1)) * (W - pad * 2));
  const Y = (v: number) => H - 3 - (Math.min(v, max) / max) * (H - 8);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join("");
  const last = pts.length - 1, h = hover ?? last;
  const move = (e: React.PointerEvent) => {
    const r = box.current?.getBoundingClientRect(); if (!r) return;
    setHover(Math.max(0, Math.min(last, Math.round(((e.clientX - r.left) / r.width) * last))));
  };
  return (
    <div className="lv-plot lv-line">
      <svg ref={box} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onPointerMove={move} onPointerLeave={() => setHover(null)}>
        <line x1="0" x2={W} y1={H - 0.5} y2={H - 0.5} className="lv-base" />
        {pts.length > 1 && <path d={`${line}L${X(last)},${H}L${X(0)},${H}Z`} className="lv-area" />}
        {pts.length > 1 && <path d={line} className="lv-stroke" />}
        {hover !== null && <line x1={X(h)} x2={X(h)} y1="0" y2={H} className="lv-cross" />}
        <circle cx={X(h)} cy={Y(pts[h].v)} r="4" className="lv-end" />
      </svg>
      {hover !== null && <div className={`lv-tip${h > last * 0.6 ? " left" : ""}`} style={{ left: `${(X(h) / W) * 100}%` }}><b>{pts[h].v}{unit}</b><span>{(fmt ?? clock)(pts[h].t)}</span></div>}
    </div>
  );
}

/** a speed result against Google's limits: good, needs work, slow */
function Limit({ name, ms, good, poor, unit = "s" }: { name: string; ms?: number; good: number; poor: number; unit?: "s" | "ms" }) {
  if (ms === undefined) return null;
  const top = poor * 1.5, v = Math.min(ms, top);
  const l: Light = ms <= good ? "ok" : ms <= poor ? "warn" : "bad";
  const shown = unit === "s" ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
  return (
    <div className={`lv-limit ${l}`}>
      <div className="lv-limit-h"><span>{name}</span><b>{shown}</b><em>{l === "ok" ? "✓ good" : l === "warn" ? "! needs work" : "✕ slow"}</em></div>
      <div className="lv-zones" role="img" aria-label={`${name}: ${shown}, ${l === "ok" ? "good" : l === "warn" ? "needs work" : "slow"}`}>
        <i className="z ok" style={{ width: `${(good / top) * 100}%` }} /><i className="z warn" style={{ width: `${((poor - good) / top) * 100}%` }} /><i className="z bad" />
        <i className="mark" style={{ left: `${(v / top) * 100}%` }} />
      </div>
    </div>
  );
}

const Row = ({ l, k, v, href }: { l: Light; k: string; v: React.ReactNode; href?: string }) => (
  <li className={`lv-row ${l}`}><i className="lv-dot" aria-hidden /><span>{k}</span><b>{href ? <a href={href}>{v}</a> : v}</b></li>
);

export default function LiveCards({ first }: { first: OverviewLive }) {
  const [d, setD] = useState(first);
  const [db, setDb] = useState<Pt[]>([{ t: Date.now(), v: first.dbMs }]);
  const [people, setPeople] = useState<Pt[]>([{ t: Date.now(), v: first.live }]);
  const [busy, setBusy] = useState(""), [note, setNote] = useState("");
  const [, tick] = useState(0);
  const take = (x: OverviewLive) => {
    setD(x);
    const t = Date.now();
    setDb((h) => [...h, { t, v: x.dbMs }].slice(-40));
    setPeople((h) => [...h, { t, v: x.live }].slice(-40));
  };
  useEffect(() => {
    let off = false;
    const pull = async () => { if (document.hidden) return; const x = await liveOverview().catch(() => null); if (x && !off) take(x); };
    const t = setInterval(pull, 20_000), u = setInterval(() => tick((n) => n + 1), 30_000);
    const vis = () => { if (!document.hidden) pull(); };
    document.addEventListener("visibilitychange", vis);
    return () => { off = true; clearInterval(t); clearInterval(u); document.removeEventListener("visibilitychange", vis); };
  }, []);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(""), 3500); return () => clearTimeout(t); }, [note]);
  const act = async (key: string, fn: () => Promise<unknown>, done: string) => { setBusy(key); setNote(""); await fn().catch(() => null); const x = await liveOverview().catch(() => null); if (x) take(x); setBusy(""); setNote(done); };

  const backupAge = d.lastBackup ? Date.now() - new Date(d.lastBackup).getTime() : Infinity;
  const due = (d.backups.every === "week" ? 8 : 1.5) * 86400_000;
  const dbL: Light = d.dbMs < 400 ? "ok" : d.dbMs < 1200 ? "warn" : "bad";
  const STORE = 500, storeL: Light = d.mb < 300 ? "ok" : d.mb < 450 ? "warn" : "bad";
  const picsL: Light = !d.health ? "none" : d.health.broken.length ? "bad" : "ok";
  const bkL: Light = !d.backups.on ? "warn" : backupAge < due ? "ok" : d.lastBackup ? "warn" : "bad";
  const health = [dbL, storeL, picsL, bkL], overall: Light = health.includes("bad") ? "bad" : health.includes("warn") ? "warn" : "ok";
  const sp = d.speed, spL: Light = !sp ? "none" : sp.score >= 90 ? "ok" : sp.score >= 50 ? "warn" : "bad";
  const st = d.status, broken = d.health?.broken.length ?? 0, okPics = Math.max(0, (d.health?.pictures ?? 0) - broken);
  const vmax = Math.max(1, ...d.views.map((v) => v.n));

  return (
    <div className="lv">
      {/* ---------- site health ---------- */}
      <section className={`c lv-card lv-${overall}`}>
        <div className="lv-h"><i className="ti ti-heart-rate-monitor" /><b>Site health</b><small className="lv-live"><i />live · {ago(d.at)}</small></div>
        <div className="lv-split">
          <div><span className="lv-k">Database answers in</span><span className={`lv-big2 ${dbL}`}>{d.dbMs}<small> ms</small></span></div>
          <LiveLine pts={db} unit=" ms" label="Database answer times while this page has been open" />
        </div>
        <div className="lv-meter">
          <div className="lv-k"><span>Stored in the database</span><b>{d.mb.toFixed(1)} of {STORE} MB</b></div>
          <div className={`lv-track ${storeL}`} role="meter" aria-valuemin={0} aria-valuemax={STORE} aria-valuenow={Math.round(d.mb)} aria-label="Database storage used"><i style={{ width: `${Math.max(1.5, Math.min(100, (d.mb / STORE) * 100))}%` }} /></div>
        </div>
        <div className="lv-pics">
          <svg viewBox="0 0 36 36" className="lv-donut" role="img" aria-label={d.health ? `${okPics} pictures load, ${broken} broken` : "Pictures not checked yet"}>
            <circle cx="18" cy="18" r="14" pathLength={100} className="t" />
            {d.health && d.health.pictures > 0 && <circle cx="18" cy="18" r="14" pathLength={100} className="good" style={{ strokeDasharray: `${(okPics / d.health.pictures) * 100 - (broken ? 2 : 0)} 100` }} />}
            {broken > 0 && <circle cx="18" cy="18" r="14" pathLength={100} className="bad" style={{ strokeDasharray: `${(broken / d.health!.pictures) * 100} 100`, strokeDashoffset: `${-((okPics / d.health!.pictures) * 100)}` }} />}
          </svg>
          <div className="lv-pics-t">
            <b>{!d.health ? "Pictures not checked yet" : !d.health.pictures ? "No uploaded pictures yet" : broken ? `${broken} broken picture${broken === 1 ? "" : "s"}` : `All ${d.health.pictures} pictures load`}</b>
            {d.health && <span><i className="sw good" />{okPics} load{broken ? <> · <i className="sw bad" />{broken} broken</> : null} · checked {ago(d.health.at)}</span>}
            {broken > 0 && <span className="bad">{d.health!.broken.slice(0, 3).map((b) => b.where).join(" · ")}{broken > 3 ? ` · and ${broken - 3} more` : ""}</span>}
          </div>
        </div>
        <div className="lv-bk">
          <div className="lv-k"><span>Backups, last 14 days</span><b className={bkL}>{d.backups.on ? `last ${ago(d.lastBackup)}` : "automatic backups are off"}</b></div>
          <div className="lv-days">{d.days.map((r, i) => <i key={r.day} className={r.backups ? "on" : ""} title={`${i === d.days.length - 1 ? "Today" : dayName(r.day)}: ${r.backups ? `${r.backups} backup${r.backups === 1 ? "" : "s"}` : "no backup"}`} />)}</div>
        </div>
        <div className="btns">
          <button type="button" className="b-out b-sm" disabled={!!busy} onClick={() => act("pics", healthNow, "Pictures checked.")}><i className={`ti ti-${busy === "pics" ? "loader-2 spin" : "photo-search"}`} />{busy === "pics" ? "Checking pictures…" : "Check pictures now"}</button>
          <button type="button" className="b-out b-sm" disabled={!!busy} onClick={() => act("bk", backupNow, "Backup made.")}><i className={`ti ti-${busy === "bk" ? "loader-2 spin" : "device-floppy"}`} />Back up now</button>
          <a className="b-out b-sm" href="/admin/settings?tab=backups"><i className="ti ti-database" />Backups</a>
        </div>
      </section>

      {/* ---------- activity ---------- */}
      <section className="c lv-card lv-wide">
        <div className="lv-h"><i className="ti ti-activity" /><b>Activity, last 14 days</b><small>what visitors did, day by day</small></div>
        <DayBars rows={d.days} label="Messages, comments and reactions per day for the last 14 days" series={[
          { k: "msgs", name: "Messages", c: "var(--s1)" }, { k: "comments", name: "Comments", c: "var(--s2)" }, { k: "reacts", name: "Reactions", c: "var(--s3)" },
        ]} />
      </section>

      {/* ---------- site status and people now ---------- */}
      <section className={`c lv-card lv-${st.maintenance || st.private ? "warn" : "ok"}`}>
        <div className="lv-h"><i className="ti ti-world" /><b>Site status</b></div>
        <div className="lv-status">{st.maintenance ? "🛠️ Maintenance" : st.private ? "🔒 Private" : "🟢 Live"}</div>
        <div className="lv-split">
          <div><span className="lv-k">People on the site now</span><span className="lv-big2">{d.live}</span></div>
          <LiveLine pts={people} unit={people[people.length - 1]?.v === 1 ? " person" : " people"} label="People on the site while this page has been open" max={Math.max(3, ...people.map((p) => p.v)) * 1.2} />
        </div>
        <ul>
          <Row l={st.noindex || st.private ? "warn" : "ok"} k="Google" v={st.noindex || st.private ? "asked to stay away" : "can list it"} href="/admin/settings?tab=status" />
          <Row l={d.unanswered ? "warn" : "ok"} k="Chats waiting for your reply" v={String(d.unanswered)} href="/admin/inbox?f=chats" />
          <Row l={!d.alerts.on ? "none" : d.alerts.connected ? "ok" : "warn"} k="Telegram alerts" v={!d.alerts.on ? "off" : d.alerts.connected ? `on · last ${ago(d.alerts.last)}` : "on, not connected"} href="/admin/settings?tab=visitors" />
        </ul>
      </section>

      {/* ---------- safety ---------- */}
      <section className={`c lv-card lv-${d.failed >= 5 ? "bad" : !d.twoStep || d.failed ? "warn" : "ok"}`}>
        <div className="lv-h"><i className="ti ti-shield-check" /><b>Safety</b><small>sign-ins, last 14 days</small></div>
        <DayBars rows={d.days} label="Sign-ins and wrong tries per day for the last 14 days" series={[
          { k: "signOk", name: "Signed in", c: "var(--s1)" }, { k: "signBad", name: "Wrong tries", c: "var(--st-bad)" },
        ]} />
        <div className="lv-chips">
          <a href="/admin/settings?tab=security" className={d.twoStep ? "ok" : "warn"}><i className={`ti ti-${d.twoStep ? "shield-check" : "shield-off"}`} />Two-step {d.twoStep ? "on" : "off"}</a>
          <a href="/admin/settings?tab=security" className={d.lockout ? "ok" : "warn"}><i className={`ti ti-${d.lockout ? "lock" : "lock-open"}`} />Lock {d.lockout ? "on" : "off"}</a>
          <a href="/admin/settings?tab=backups" className="none"><i className="ti ti-trash" />{d.bin} in the bin</a>
        </div>
        {d.failed >= 5 && <small className="lv-foot bad">⚠ {d.failed} wrong tries today. The lock stops them; switch two-step login on to be sure.</small>}
      </section>

      {/* ---------- most viewed sections ---------- */}
      <section className="c lv-card">
        <div className="lv-h"><i className="ti ti-chart-bar" /><b>Most viewed sections</b><small>last 7 days</small></div>
        {d.views.length ? (
          <ul className="lv-hbars">{d.views.map((v) => (
            <li key={v.title} title={`${v.title}: ${v.n} views`}><span>{v.title}</span><i style={{ width: `${Math.max(3, (v.n / vmax) * 100)}%` }} /><b>{v.n}</b></li>
          ))}</ul>
        ) : <p className="lv-none">No section views yet this week.</p>}
      </section>

      {/* ---------- speed ---------- */}
      <section className={`c lv-card lv-${spL}`}>
        <div className="lv-h"><i className="ti ti-gauge" /><b>Speed on a phone</b><small>{sp ? ago(sp.at) : "not tested yet"}</small></div>
        {sp ? (<>
          <div className="lv-split">
            <div className="lv-score"><svg viewBox="0 0 36 36" role="img" aria-label={`Speed score ${sp.score} out of 100`}><circle cx="18" cy="18" r="15.5" className="t" pathLength={100} /><circle cx="18" cy="18" r="15.5" className="v" pathLength={100} style={{ strokeDasharray: `${sp.score} 100` }} /></svg><b>{sp.score}</b></div>
            {d.speedHist.length > 1 ? <LiveLine pts={d.speedHist.map((p) => ({ t: new Date(p.at).getTime(), v: p.score }))} unit=" / 100" max={100} label="Speed score over time" fmt={(t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} /> : <p className="lv-none">The score&apos;s line grows with each daily test.</p>}
          </div>
          <Limit name="First thing shows" ms={sp.fcpMs} good={1800} poor={3000} />
          <Limit name="Main picture shows" ms={sp.lcpMs} good={2500} poor={4000} />
          <Limit name="Frozen while loading" ms={sp.tbtMs} good={200} poor={600} unit="ms" />
          {sp.fcpMs === undefined && <ul><Row l="none" k="First thing shows" v={sp.fcp || "—"} /><Row l="none" k="Main picture shows" v={sp.lcp || "—"} /><Row l="none" k="Frozen while loading" v={sp.tbt || "—"} /></ul>}
        </>) : <p className="lv-none">It runs by itself once a day, or now:</p>}
        <div className="btns"><button type="button" className="b-out b-sm" disabled={!!busy} onClick={() => act("speed", speedNow, "Speed tested.")}><i className={`ti ti-${busy === "speed" ? "loader-2 spin" : "player-play"}`} />{busy === "speed" ? "Testing… (about 30 s)" : "Test now"}</button></div>
        <small className="lv-foot">Google&apos;s free test of your homepage on a phone. 90 or more is great; the coloured bars show Google&apos;s good, needs-work and slow limits.</small>
      </section>
      {note && <div className="adm-toast stu-toast" role="status">{note}</div>}
    </div>
  );
}
