"use client";
import { useEffect, useRef, useState } from "react";
import type { StatusLook } from "@/lib/status";

/** What the site needs to draw the status; the kind and colour are worked out on the server. */
export type StatusView = { emoji: string; text: string; since: string; look: StatusLook; label: string; color: string; staleHours: number; showAgo: boolean; showViews: boolean; name: string; avatar: string };

function agoText(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* the 👁 count: one request per page, shared by both parts; this browser counts once per status */
let views: Promise<number> | null = null;
function loadViews(since: string) {
  if (views) return views;
  views = (async () => {
    let id = "";
    try { id = localStorage.getItem("lc_sv_id") || ""; if (!/^[a-f0-9]{24}$/.test(id)) { id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join(""); localStorage.setItem("lc_sv_id", id); } } catch {}
    let seen = false;
    try { seen = localStorage.getItem("lc_sv") === since; } catch {}
    const r = seen || !id
      ? await fetch(`/api/status-view?since=${encodeURIComponent(since)}`)
      : await fetch("/api/status-view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ since, id }) });
    try { localStorage.setItem("lc_sv", since); } catch {}
    const j = await r.json().catch(() => ({ n: 0 }));
    return Number(j.n) || 0;
  })().catch(() => 0);
  return views;
}

/** The live clock, the stale state and the 👁 count. Filled in after start-up, so the server's page never disagrees. */
function useLive(v: StatusView) {
  const [now, setNow] = useState(0);
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => { if (!document.hidden) setNow(Date.now()); }, 1000);
    if (v.showViews && v.since) loadViews(v.since).then(setN);
    return () => clearInterval(t);
  }, [v.since, v.showViews]);
  const at = v.since ? Date.parse(v.since) : 0;
  const stale = !!(now && at && now - at >= v.staleHours * 3600e3);
  useEffect(() => { document.getElementById("hero")?.classList.toggle("status-stale", stale); }, [stale]);
  return { ago: now && at ? agoText(now - at) : "", stale, n };
}

function Meta({ v, ago, n, stale }: { v: StatusView; ago: string; n: number | null; stale: boolean }) {
  if (stale) return null;
  const bits = [v.showAgo && ago ? `updated ${ago}` : "", v.showViews && n !== null ? `👁 ${n}` : ""].filter(Boolean);
  return bits.length ? <span className="hst-meta">{bits.join(" · ")}</span> : null;
}

/** The part under the name: a line, or a live ticker. */
export function StatusUnder({ v }: { v: StatusView }) {
  const { ago, stale, n } = useLive(v);
  const full = `${v.emoji} ${v.text}`.trim();
  const [typed, setTyped] = useState(full);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (v.look !== "ticker" || !ref.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const chars = Array.from(full);
    let i = 0, t = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || t) return;
      setTyped("");
      t = window.setInterval(() => { setTyped(chars.slice(0, ++i).join("")); if (i >= chars.length) clearInterval(t); }, 45);
    });
    io.observe(ref.current);
    return () => { io.disconnect(); clearInterval(t); };
  }, [v.look, full]);
  const style = { "--sc": stale ? "#9aa39e" : v.color } as React.CSSProperties;
  if (v.look === "ticker") return (
    <div ref={ref} className={`hst-tick${stale ? " stale" : ""}`} style={style}>
      <div className="hst-row"><span className="hst-lbl">{stale ? "AWAY" : "LIVE"}</span><span>{stale ? `was: ${full}` : typed}</span><i className="hst-caret" aria-hidden /></div>
      {stale ? <span className="hst-meta">last seen {ago}</span> : <Meta v={v} ago={ago} n={n} stale={stale} />}
    </div>
  );
  return (
    <div className={`hst-line${stale ? " stale" : ""}`} style={style}>
      <i className="hst-dot" aria-hidden /><b>{stale ? "Away" : v.label}</b>
      <span>· {stale ? `Last seen ${ago}` : full}</span>
      {stale ? <span className="hst-meta">was: {full}</span> : <Meta v={v} ago={ago} n={n} stale={stale} />}
    </div>
  );
}

/** The part by the photo: a bubble, a corner badge with a chip, or a story chip that opens the story. */
export function StatusPhoto({ v }: { v: StatusView }) {
  const { ago, stale, n } = useLive(v);
  const dlg = useRef<HTMLDialogElement>(null);
  const timer = useRef(0);
  const full = `${v.emoji} ${v.text}`.trim();
  const style = { "--sc": stale ? "#9aa39e" : v.color } as React.CSSProperties;
  const open = () => {
    const d = dlg.current; if (!d) return;
    d.showModal();
    clearTimeout(timer.current); timer.current = window.setTimeout(() => d.close(), 5200);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  if (v.look === "border") return (
    <>
      <span className={`hst-emo${stale ? " stale" : ""}`} style={style} title={stale ? `Last seen ${ago}` : `${v.label}: ${v.text}`}>{v.emoji}</span>
      <div className={`hst-active${stale ? " stale" : ""}`} style={style}>
        {stale ? <>Last seen {ago}</> : <><i className="hst-dot" aria-hidden />{v.text}</>}
        {!stale && (v.showAgo && ago || v.showViews && n !== null) ? <span className="hst-meta">{[v.showAgo && ago && `updated ${ago}`, v.showViews && n !== null && `👁 ${n}`].filter(Boolean).join(" · ")}</span> : null}
      </div>
    </>
  );
  if (v.look === "bubble") return (
    <div className={`hst-bubble${stale ? " stale" : ""}`} style={style}>
      {stale ? `Last seen ${ago}` : full}
      {stale ? <span className="hst-meta">was: {v.text}</span> : <Meta v={v} ago={ago} n={n} stale={stale} />}
    </div>
  );
  if (v.look === "badge") return (
    <>
      <span className={`hst-badge${stale ? " stale" : ""}`} style={style} aria-hidden>{v.emoji}<i className="hst-dot" /></span>
      <div className={`hst-chip${stale ? " stale" : ""}`} style={style}>
        {stale ? `Last seen ${ago}` : v.text}
        <span className="hst-meta">{stale ? "away" : [v.label.toLowerCase(), v.showAgo && ago, v.showViews && n !== null && `👁 ${n}`].filter(Boolean).join(" · ")}</span>
      </div>
    </>
  );
  // story
  return (
    <>
      <button type="button" className={`hst-tap${stale ? " stale" : ""}`} style={style} onClick={stale ? undefined : open} disabled={stale}>
        {stale ? `Last seen ${ago}` : <>👆 My status{v.showViews && n !== null ? ` · 👁 ${n}` : ""}</>}
      </button>
      <dialog ref={dlg} className="hst-story" style={style} onClick={() => dlg.current?.close()}>
        <div className="hst-sc">
          <div className="hst-pb"><i /></div>
          <div className="hst-who">{v.avatar && <img src={v.avatar} alt="" />}{v.name}{v.showAgo && ago && <span>{ago}</span>}</div>
          <div className="hst-big"><b>{v.emoji}</b><p>{v.text}</p></div>
          <div className="hst-ft"><span>{v.showViews && n !== null ? `👁 ${n} views` : ""}</span><span>tap to close</span></div>
        </div>
      </dialog>
    </>
  );
}
