"use client";
import { useEffect, useRef, useState } from "react";
import type { MenuExtra, MenuLook, SkyTime } from "@/lib/chrome";
import { beginVisit } from "./visit";

const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("lite");
const dhakaHour = () => +new Date().toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Dhaka" });
const dhakaTime = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" });

/** The sky over Dhaka at an hour: its colours, and where the sun or moon is (percent across, percent down). */
export function skyAt(h: number) {
  const night = h >= 19 || h < 5, sunset = h >= 16 && h < 19, dawn = h >= 5 && h < 8;
  const g = night ? "linear-gradient(#0b1030, #2a2a62)" : sunset ? "linear-gradient(#ff8a5b, #c3577c 60%, #6b3b80)" : dawn ? "linear-gradient(#ffb7a1, #ffd9a6 50%, #a8d8f0)" : "linear-gradient(#4fa8e8, #a8e0ff)";
  const t = night ? ((h + 24 - 19) % 24) / 10 : (h - 5) / 14;
  return { g, x: 5 + Math.min(1, Math.max(0, t)) * 90, y: 78 - Math.sin(Math.PI * Math.min(1, Math.max(0, t))) * 56, sun: night ? "#e9e2c4" : sunset ? "#ffb04d" : "#ffe36e", night };
}

/**
 * What moves in the menu bar (SiteNav). It follows the site's scroll-spy (`lc-spy`, which marks the link of the section you're in) and one
 * rAF-throttled scroll listener: the decoration slides to the active or pointed link (transform only), the bar slims after the hero, hides while
 * scrolling down, shows reading progress, reacts to scroll speed (`.fast`), and the Dhaka skyline's layers slide. It sets the sky by Dhaka's
 * clock and the ticker's time, and marks links with something new since the visitor's last visit. Nothing runs per frame while nothing scrolls.
 */
export default function NavFx({ look, sky, extras, preview }: { look: MenuLook; sky: SkyTime; extras: Partial<Record<MenuExtra, boolean>>; preview: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const nav = ref.current?.closest<HTMLElement>(".nav");
    if (!nav) return;
    const deco = nav.querySelector<HTMLElement>(".mb-deco > i");
    const prog = nav.querySelector<HTMLElement>(".mb-prog");
    const lays = Array.from(nav.querySelectorAll<HTMLElement>(".mb-lay"));
    const links = nav.querySelector<HTMLElement>(".navlinks");
    const cleanups: (() => void)[] = [];

    // the decoration under the link you're in, or the one pointed at
    const place = (a: HTMLElement | null) => {
      if (!deco || !links) return;
      if (!a) { deco.style.opacity = "0"; return; }
      const lr = links.getBoundingClientRect(), r = a.getBoundingClientRect();
      deco.style.opacity = "1";
      deco.style.transform = `translateX(${r.left - lr.left}px) scaleX(${r.width / 100})`;
    };
    const active = () => nav.querySelector<HTMLElement>(".navlinks a.active");
    const onSpy = () => place(active());
    window.addEventListener("lc-spy", onSpy);
    cleanups.push(() => window.removeEventListener("lc-spy", onSpy));
    if (links && (look === "blob" || look === "aurora")) {
      const over = (e: Event) => { const a = (e.target as HTMLElement).closest<HTMLElement>(".navlinks a"); if (a) place(a); };
      const out = () => place(active());
      links.addEventListener("mouseover", over); links.addEventListener("mouseleave", out);
      cleanups.push(() => { links.removeEventListener("mouseover", over); links.removeEventListener("mouseleave", out); });
    }
    const t0 = setTimeout(onSpy, 400);
    cleanups.push(() => clearTimeout(t0));
    addEventListener("resize", onSpy);
    cleanups.push(() => removeEventListener("resize", onSpy));

    // the sky by Dhaka's clock, or a fixed time of day
    const bgEl = nav.querySelector<HTMLElement>(".mbg-sky");
    if (bgEl) {
      const setSky = () => {
        const h = sky === "now" ? dhakaHour() : { dawn: 6, day: 12, sunset: 17, night: 22 }[sky];
        const s = skyAt(h);
        bgEl.style.setProperty("--sky", s.g); bgEl.style.setProperty("--sx", `${s.x}%`); bgEl.style.setProperty("--sy", `${s.y}%`); bgEl.style.setProperty("--sun", s.sun);
        bgEl.classList.toggle("night", s.night);
      };
      setSky();
      const iv = setInterval(setSky, 300000);
      cleanups.push(() => clearInterval(iv));
    }
    // the ticker's time in Dhaka
    const times = nav.querySelectorAll<HTMLElement>(".mb-time");
    if (times.length) {
      const setT = () => times.forEach((t) => (t.textContent = dhakaTime()));
      setT();
      const iv = setInterval(setT, 30000);
      cleanups.push(() => clearInterval(iv));
    }
    // dots on sections with something new since this visitor's last visit
    if (extras.newdots && !preview) {
      const v = beginVisit();
      if (v.prev) fetch("/api/menu").then((r) => r.json()).then((d: { newest?: Record<string, string> }) => {
        for (const [slug, iso] of Object.entries(d.newest ?? {})) if (iso > v.prev) nav.querySelector(`.navlinks a[data-link="${slug}"]`)?.classList.add("is-new");
      }).catch(() => {});
    }
    if (preview) return () => cleanups.forEach((f) => f());

    // scrolling: progress, slimming after the hero, hiding on the way down, speed, the skyline's layers
    let raf = 0, lastY = scrollY, lastT = performance.now(), fastTimer = 0, slim = false, gone = false, past = false;
    const tick = () => {
      raf = 0;
      const y = scrollY, now = performance.now();
      const max = document.documentElement.scrollHeight - innerHeight;
      if (prog) prog.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      const heroH = (document.getElementById("hero")?.offsetHeight ?? innerHeight * .7) - 80;
      const isPast = y > heroH;
      if (isPast !== past) { past = isPast; nav.classList.toggle("mb-past", past); }
      if (extras.slim && isPast !== slim) { slim = isPast; nav.classList.toggle("mb-slim", slim); }
      if (extras.hide) { const g = y > lastY + 6 && y > heroH ? true : y < lastY - 6 ? false : gone; if (g !== gone) { gone = g; nav.classList.toggle("mb-gone", gone); } }
      if (extras.react && !calm()) {
        const v = Math.abs(y - lastY) / Math.max(16, now - lastT);
        if (v > 1.2) { nav.classList.add("fast"); clearTimeout(fastTimer); fastTimer = window.setTimeout(() => nav.classList.remove("fast"), 500); }
      }
      if (lays.length && !calm()) lays.forEach((l) => (l.style.transform = `translateX(${-((y * +(l.dataset.k || 0)) % 600)}px)`));
      lastY = y; lastT = now;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
    addEventListener("scroll", onScroll, { passive: true });
    tick();
    cleanups.push(() => { removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); clearTimeout(fastTimer); });
    return () => cleanups.forEach((f) => f());
  }, [look, sky, extras, preview]);
  return <span ref={ref} hidden />;
}

/** "Now playing" in the brand's place: the owner's name typing itself as the artist, the section you're in as the track, a timer that runs as you read. */
export function NowPlaying({ name, sections }: { name: React.ReactNode; sections: { slug: string; label: string; emoji: string }[] }) {
  const [at, setAt] = useState(-1);
  const [time, setTime] = useState("0:00");
  useEffect(() => {
    const spy = () => {
      const a = document.querySelector<HTMLAnchorElement>(".navlinks a.active");
      setAt(a ? sections.findIndex((s) => s.slug === a.dataset.link) : -1);
    };
    const len = sections.length * 60;
    const clock = () => {
      const max = document.documentElement.scrollHeight - innerHeight, s = Math.round((max > 0 ? scrollY / max : 0) * len);
      setTime(`${(s / 60) | 0}:${String(s % 60).padStart(2, "0")} / ${len / 60}:00`);
    };
    let raf = 0;
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; clock(); }); };
    window.addEventListener("lc-spy", spy);
    addEventListener("scroll", onScroll, { passive: true });
    spy(); clock();
    return () => { window.removeEventListener("lc-spy", spy); removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, [sections]);
  const s = at >= 0 ? sections[at] : null;
  return (
    <span className="mb-now">
      <small>▶ {s ? `${s.emoji} ${s.label} · ${at + 1}/${sections.length}` : "✨ Intro"}</small>
      <b className="brand-text">{name}</b>
      <em>{time}</em>
    </span>
  );
}

type Hit = { title: string; href: string; section: string; emoji: string };
/** Search: a button (and the / key) opens a box that finds sections and entries by their words. */
export function SearchButton({ sections }: { sections: { href: string; label: string; emoji: string }[] }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const open = () => { setQ(""); setHits([]); dlg.current?.showModal(); };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "/" || document.querySelector("dialog[open]")) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault(); open();
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) { setHits([]); return; }
    setBusy(true);
    const t = setTimeout(() => fetch(`/api/menu?q=${encodeURIComponent(s)}`).then((r) => r.json()).then((d) => setHits(d.items ?? [])).catch(() => setHits([])).finally(() => setBusy(false)), 220);
    return () => clearTimeout(t);
  }, [q]);
  const secs = sections.filter((s) => !q.trim() || s.label.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <button type="button" className="icon-btn mb-search" aria-label="Search (press /)" title="Search (press /)" onClick={open}>🔍</button>
      <dialog ref={dlg} className="mb-srch" aria-label="Search" onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}>
        <div className="mb-srch-box">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sections and entries…" aria-label="Search" />
          <ul>
            {secs.map((s) => <li key={s.href}><a href={s.href} onClick={() => dlg.current?.close()}>{s.emoji} {s.label}<small>Section</small></a></li>)}
            {hits.map((h) => <li key={h.href}><a href={h.href}>📄 {h.title}<small>{h.emoji} {h.section}</small></a></li>)}
            {q.trim().length >= 2 && !busy && !hits.length && !secs.length && <li className="none">Nothing found for &ldquo;{q}&rdquo;.</li>}
          </ul>
          <p className="mb-srch-hint">Press <kbd>/</kbd> anywhere to search · <kbd>Esc</kbd> closes</p>
        </div>
      </dialog>
    </>
  );
}
