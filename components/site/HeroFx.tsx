"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { confettiFrom, prefersReducedMotion } from "./fx";
import { isSplittable } from "./Split";

const GLYPHS = "!<>-_\\/[]{}=+*^?#01ABCDEFXYZ%$";
const split = (text: string) =>
  text.split(/(\*[^*]+\*)/g).filter(Boolean).map((p) => (p.length > 2 && p.startsWith("*") && p.endsWith("*") ? { t: p.slice(1, -1), a: true } : { t: p, a: false }));

/** Headline text that scrambles like data, then settles. The real text is in the HTML from the start. */
export function DecodeText({ text, delay = 250, animate = true, letters = false }: { text: string; delay?: number; animate?: boolean; letters?: boolean }) {
  const parts = useMemo(() => split(text), [text]);
  const perLetter = letters && isSplittable(text);
  const [shown, setShown] = useState(() => parts.map((p) => p.t));
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!animate || prefersReducedMotion()) return;
    let raf = 0;
    const total = parts.reduce((n, p) => n + p.t.length, 0) || 1;
    const dur = 700 + Math.min(900, total * 22);
    const play = (wait: number) => {
      cancelAnimationFrame(raf);
      const t0 = performance.now() + wait;
      setBusy(true);
      const frame = (t: number) => {
        const p = Math.max(0, Math.min(1, (t - t0) / dur));
        let k = 0;
        setShown(parts.map((part) => [...part.t].map((ch) => {
          const done = ch === " " || (k++ / total) < p;
          return done ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }).join("")));
        if (p < 1) raf = requestAnimationFrame(frame);
        else { setShown(parts.map((x) => x.t)); setBusy(false); }
      };
      raf = requestAnimationFrame(frame);
    };
    // wait for the opening curtain, when there is one
    const curtain = document.querySelector(".intro");
    play(delay + (curtain && getComputedStyle(curtain).display !== "none" ? 1150 : 0));
    const again = () => play(delay); // dashboard "Preview"
    window.addEventListener("lc-decode", again);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("lc-decode", again); };
  }, [parts, delay, animate]);
  const body = (s: string, on: boolean) => (perLetter ? <Letters text={s} accent={on} /> : s);
  return (
    <>
      <span aria-hidden={busy}>{parts.map((p, i) => (p.a ? <span key={i} className="accent">{body(shown[i], true)}</span> : <span key={i}>{body(shown[i], false)}</span>))}</span>
      {busy && <span className="sr-only">{parts.map((p) => p.t).join("")}</span>}
    </>
  );
}

/** One span per letter, kept together in whole words so lines still wrap between words. */
function Letters({ text, accent }: { text: string; accent: boolean }) {
  const all = Array.from(text).length;
  let i = 0;
  return (
    <>
      {text.split(/( +)/).filter(Boolean).map((w, k) => (w.trim() === "" ? w : (
        <span className="kw" key={k}>
          {Array.from(w).map((ch, c) => {
            const t = all > 1 ? i / (all - 1) : 0;
            i++;
            return <span className="kc" key={c} style={accent ? { ["--t" as string]: t.toFixed(3) } : undefined}>{ch}</span>;
          })}
        </span>
      )))}
    </>
  );
}

/** The floating sticker around the hero photo. A picture with a transparent background becomes a true cut-out. */
export function Sticker({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = ref.current, img = box?.querySelector("img");
    if (!box || !img) return;
    const check = () => {
      try {
        const c = document.createElement("canvas");
        c.width = c.height = 24;
        const x = c.getContext("2d", { willReadFrequently: true })!;
        x.drawImage(img, 0, 0, 24, 24);
        const d = x.getImageData(0, 0, 24, 24).data;
        const corner = (cx: number, cy: number) => d[(cy * 24 + cx) * 4 + 3];
        box.classList.toggle("cutout", corner(0, 0) < 200 || corner(23, 0) < 200 || corner(0, 23) < 200 || corner(23, 23) < 200);
      } catch {} // a picture from another site can't be inspected: it keeps the taped-print look
    };
    if (img.complete && img.naturalWidth) check(); else img.addEventListener("load", check, { once: true });
    return () => img.removeEventListener("load", check);
  }, []);
  // it swings on its tape when the page scrolls, then settles
  useEffect(() => {
    const box = ref.current;
    if (!box || prefersReducedMotion()) return;
    let a = 0, v = 0, raf = 0, last = window.scrollY, prev = 0;
    const loop = (t: number) => {
      raf = 0;
      const steps = prev ? Math.min(6, Math.max(1, Math.round((t - prev) / 16.7))) : 1;
      prev = t;
      for (let i = 0; i < steps; i++) { v += -a * 0.05; v *= 0.95; a += v; }
      if (Math.abs(a) < 0.02 && Math.abs(v) < 0.02) { a = 0; v = 0; prev = 0; box.style.rotate = ""; return; }
      box.style.rotate = `${a.toFixed(2)}deg`;
      raf = requestAnimationFrame(loop);
    };
    const onScroll = () => {
      const y = window.scrollY, d = y - last;
      last = y;
      if (y > window.innerHeight * 1.2) return; // off screen: nothing to do
      v += Math.max(-0.5, Math.min(0.5, d * 0.012));
      if (!raf) raf = requestAnimationFrame(loop);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", onScroll); box.style.rotate = ""; };
  }, []);
  return (
    <div ref={ref} className="stk">
      <div className="stk-float">{children}</div>
      <i className="stk-shadow" aria-hidden />
    </div>
  );
}

/** The photo tilts toward the mouse, waves on hover and bursts confetti on click. */
export function AvatarTilt({ label, children }: { label: string; children: React.ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);
  const move = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || prefersReducedMotion() || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.transform = `rotateY(${dx * 28}deg) rotateX(${-dy * 28}deg) scale(1.04)`;
    ref.current.style.setProperty("--gx", `${(dx + 0.5) * 100}%`);
    ref.current.style.setProperty("--gy", `${(dy + 0.5) * 100}%`);
  };
  const reset = () => { if (ref.current) ref.current.style.transform = ""; };
  return (
    <button ref={ref} type="button" className="avatar-tilt" aria-label={label} onPointerMove={move} onPointerLeave={reset}
      onClick={() => confettiFrom(ref.current, { count: 90 })}>
      {children}
      <span className="avatar-wave" aria-hidden>👋</span>
    </button>
  );
}

/** "Good evening! It's 9:41 PM here in Dhaka 🌙 (3:41 PM where you are)". Filled in on the visitor's device. */
export function Greeting({ timezone, place }: { timezone: string; place: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const update = () => {
      const now = new Date();
      let h = now.getHours(), there = "";
      try {
        h = parseInt(now.toLocaleString("en-US", { timeZone: timezone, hour: "numeric", hourCycle: "h23" }), 10) % 24;
        there = now.toLocaleTimeString("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit" });
      } catch { there = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
      const part = h < 5 ? "Hello, night owl" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 21 ? "Good evening" : "Hello, night owl";
      const icon = h >= 6 && h < 18 ? "☀️" : "🌙";
      const mine = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      setText(`${part}! It's ${there}${place ? ` here in ${place}` : ""} ${icon}${mine !== there ? ` (${mine} where you are)` : ""}`);
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [timezone, place]);
  return <div className="greet">{text}</div>;
}

/** "3 people here right now 👀": this browser checks in every 30 seconds with a random id. */
export function LivePill() {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    let id = "";
    try { id = localStorage.getItem("lc_vid") || ""; } catch {}
    if (!/^[a-f0-9]{24}$/.test(id)) {
      id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");
      try { localStorage.setItem("lc_vid", id); } catch {}
    }
    let stop = false;
    const ping = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch("/api/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
        const d = await r.json();
        if (!stop && typeof d.n === "number" && !d.off) setN(Math.max(1, d.n));
      } catch {}
    };
    ping();
    const t = setInterval(ping, 30000);
    const vis = () => { if (!document.hidden) ping(); };
    document.addEventListener("visibilitychange", vis);
    return () => { stop = true; clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, []);
  if (n === null) return null;
  return <span className="live-pill"><i aria-hidden />{n <= 1 ? "Just you here right now 👀" : `${n} people here right now 👀`}</span>;
}
