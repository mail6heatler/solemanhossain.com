"use client";
import { useEffect } from "react";
import { accent, burst, confettiCannons, confettiFrom, prefersReducedMotion, rain, toast } from "./fx";

type Fx = { smooth: boolean; magnetic: boolean; countup: boolean; timeline: boolean; sparkles: boolean; explorer: boolean; party: boolean };
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

/**
 * All the motion on the public site: progress bar, scroll reveal, scroll-spy (nav, rail, phone menu), card glow,
 * draggable floating emojis, cursor trail, smooth scrolling, magnetic buttons, count-up numbers, the self-drawing
 * timeline, click sparkles, party mode, the explorer badge, and a tiny anonymous visit counter.
 */
export default function Effects({ cursor, track, fx, partyWord, sparkleEmojis }:
  { cursor: boolean; track: boolean; fx: Fx; partyWord: string; sparkleEmojis: string[] }) {
  const emojiKey = sparkleEmojis.join(" ");
  useEffect(() => {
    document.documentElement.classList.remove("no-js");
    const cleanups: (() => void)[] = [];
    const reduced = prefersReducedMotion();
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    // progress bar
    const bar = document.getElementById("progress");
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      if (bar) bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    cleanups.push(() => window.removeEventListener("scroll", onScroll));

    // smooth scrolling (also makes the #section links glide)
    if (fx.smooth && !reduced) {
      let lenis: { destroy(): void } | null = null, dead = false;
      import("lenis").then(({ default: Lenis }) => {
        if (dead) return;
        const l = new Lenis({ anchors: true, autoRaf: true, lerp: 0.11 });
        lenis = l;
        (window as unknown as { __lenis?: unknown }).__lenis = l;
      }).catch(() => {});
      cleanups.push(() => { dead = true; lenis?.destroy(); delete (window as unknown as { __lenis?: unknown }).__lenis; });
    }

    // reveal (+ cards dropping in one by one, via CSS on .stagger.in)
    const revealObs = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => revealObs.observe(el));
    cleanups.push(() => revealObs.disconnect());

    // count-up numbers: the real number is in the HTML; it counts up from 0 once it scrolls into view
    if (fx.countup && !reduced) {
      const count = (el: HTMLElement) => {
        const to = Number(el.dataset.count) || 0;
        const t0 = performance.now(), dur = 1300;
        const step = (t: number) => {
          const p = Math.min(1, (t - t0) / dur);
          el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };
      const countObs = new IntersectionObserver((es) => es.forEach((e) => {
        if (!e.isIntersecting) return;
        countObs.unobserve(e.target);
        count(e.target as HTMLElement);
      }), { threshold: 0.6 });
      document.querySelectorAll("[data-count]").forEach((el) => countObs.observe(el));
      const replay = () => document.querySelectorAll<HTMLElement>("[data-count]").forEach(count); // dashboard "Preview"
      window.addEventListener("lc-countup", replay);
      cleanups.push(() => { countObs.disconnect(); window.removeEventListener("lc-countup", replay); });
    }

    // the timeline line draws itself as you scroll; milestones light up when the line reaches them
    const lines = Array.from(document.querySelectorAll<HTMLElement>(".tline.draw"));
    if (fx.timeline && lines.length) {
      const draw = () => {
        for (const tl of lines) {
          const r = tl.getBoundingClientRect();
          const p = reduced ? 1 : Math.min(1, Math.max(0, (window.innerHeight * 0.72 - r.top) / Math.max(1, r.height - 22)));
          tl.style.setProperty("--p", String(p));
          tl.querySelectorAll<HTMLElement>(".tl-row").forEach((row) => row.classList.toggle("lit", (row.offsetTop + 12) / Math.max(1, r.height - 22) <= p + 0.02));
        }
      };
      draw();
      window.addEventListener("scroll", draw, { passive: true });
      window.addEventListener("resize", draw);
      cleanups.push(() => { window.removeEventListener("scroll", draw); window.removeEventListener("resize", draw); });
    }

    // scroll-spy (nav, rail, phone menu) + section view tracking + explorer badge
    const seen = new Set<string>();
    const sections = Array.from(document.querySelectorAll<HTMLElement>("section[data-spy]"));
    const order = sections.map((s) => s.id);
    const rail = document.getElementById("rail");
    const chapters = order.filter((id) => id !== "hero");
    let explored = new Set<string>();
    let awarded = false;
    if (fx.explorer) {
      try { awarded = localStorage.getItem("lc_explorer") === "1"; explored = new Set(JSON.parse(sessionStorage.getItem("lc_explored") || "[]")); } catch {}
    }
    const spy = new IntersectionObserver(
      (es) => es.forEach((e) => {
        if (!e.isIntersecting) return;
        const id = (e.target as HTMLElement).id;
        const idx = order.indexOf(id);
        document.querySelectorAll<HTMLAnchorElement>(".navlinks a, .bbar a").forEach((a) => a.classList.toggle("active", a.dataset.link === id));
        const bb = document.querySelector<HTMLElement>(".bbar"), act = bb?.querySelector<HTMLElement>("a.active");
        if (bb && act && bb.scrollWidth > bb.clientWidth) bb.scrollTo({ left: act.offsetLeft - bb.clientWidth / 2 + act.offsetWidth / 2, behavior: reduced ? "auto" : "smooth" });
        document.querySelectorAll<HTMLElement>("#rail .stop").forEach((s) => {
          const i = order.indexOf(s.dataset.target || "");
          s.classList.toggle("active", i === idx);
          s.classList.toggle("passed", i < idx);
        });
        rail?.classList.toggle("on-dark", id === "hero");
        if (track && id !== "hero" && !seen.has(id)) {
          seen.add(id);
          send({ type: "section", slug: id });
        }
        if (fx.explorer && !awarded && id !== "hero") {
          explored.add(id);
          try { sessionStorage.setItem("lc_explored", JSON.stringify([...explored])); } catch {}
          if (chapters.length > 1 && chapters.every((c) => explored.has(c))) {
            awarded = true;
            try { localStorage.setItem("lc_explorer", "1"); } catch {}
            toast("🏆 Achievement unlocked: Explorer! You've seen every chapter.", 4200);
            confettiFrom(null, { count: 120, spread: 90 });
          }
        }
      }),
      // a section counts as "current" while it crosses the middle of the screen (works for very tall sections too)
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((s) => spy.observe(s));
    cleanups.push(() => spy.disconnect());

    // video covers: silent preview while hovered (mouse) or while mostly on screen (phones)
    const vids = Array.from(document.querySelectorAll<HTMLVideoElement>("video.hover-play"));
    if (vids.length && !reduced) {
      const play = (v: HTMLVideoElement) => { v.play().catch(() => {}); };
      const stop = (v: HTMLVideoElement) => { v.pause(); };
      if (fine) {
        for (const v of vids) {
          const box = (v.closest(".card, .trip, .ph-tile, .note, .shelf-row, .flip, .post") as HTMLElement | null) ?? v;
          const on = () => play(v), off = () => stop(v);
          box.addEventListener("pointerenter", on);
          box.addEventListener("pointerleave", off);
          cleanups.push(() => { box.removeEventListener("pointerenter", on); box.removeEventListener("pointerleave", off); });
        }
      } else {
        const vio = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? play : stop)(e.target as HTMLVideoElement)), { threshold: 0.6 });
        vids.forEach((v) => vio.observe(v));
        cleanups.push(() => vio.disconnect());
      }
    }

    // card glow follows the mouse
    const glow = (e: MouseEvent) => {
      const card = (e.target as HTMLElement).closest?.(".card") as HTMLElement | null;
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
      card.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
    };
    document.addEventListener("mousemove", glow);
    cleanups.push(() => document.removeEventListener("mousemove", glow));

    // magnetic buttons lean toward the mouse
    if (fx.magnetic && fine && !reduced) {
      const mags = Array.from(document.querySelectorAll<HTMLElement>(".mag"));
      const pull = (e: MouseEvent) => {
        for (const b of mags) {
          const r = b.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
          b.style.transform = Math.hypot(dx, dy) < 110 ? `translate(${dx * 0.25}px, ${dy * 0.3}px)` : "";
        }
      };
      document.addEventListener("mousemove", pull);
      cleanups.push(() => { document.removeEventListener("mousemove", pull); mags.forEach((b) => (b.style.transform = "")); });
    }

    // click sparkles: the hero emojis burst out wherever someone clicks
    if (fx.sparkles && !reduced && sparkleEmojis.length) {
      const spark = (e: PointerEvent) => {
        if (e.button !== 0) return;
        const t = e.target as Element;
        if (!t.closest?.(".site") || t.closest("input, textarea, select, .lb, .skin-menu, .float-emo")) return;
        burst(e.clientX, e.clientY, sparkleEmojis, 7, 80);
      };
      document.addEventListener("pointerdown", spark);
      cleanups.push(() => document.removeEventListener("pointerdown", spark));
    }

    // 🎲 surprise button spins before jumping
    const dice = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.("a.dice-btn") as HTMLAnchorElement | null;
      if (!a || reduced || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      a.classList.remove("roll"); void a.offsetWidth; a.classList.add("roll");
      setTimeout(() => (window.location.href = a.href), 450);
    };
    document.addEventListener("click", dice);
    cleanups.push(() => document.removeEventListener("click", dice));

    // secret party mode: type the party word (or the Konami code) anywhere on the page
    if (fx.party) {
      let keys: string[] = [];
      let partying = false;
      const party = () => {
        if (partying) return;
        partying = true;
        document.documentElement.classList.add("party");
        toast("🕺 Party mode! You found the secret.", 3200);
        rain(["🎉", "🕺", "💃", "✨", "🪩", "🚀", "⚡", "🎈"]);
        confettiCannons();
        setTimeout(() => { document.documentElement.classList.remove("party"); partying = false; }, 6000);
      };
      const key = (e: KeyboardEvent) => {
        if ((e.target as Element).closest?.("input, textarea, select, [contenteditable]")) return;
        keys.push(e.key.length === 1 ? e.key.toLowerCase() : e.key);
        keys = keys.slice(-12);
        const word = partyWord && keys.slice(-partyWord.length).join("") === partyWord;
        if (word || keys.slice(-10).join(",") === KONAMI.join(",")) { keys = []; party(); }
      };
      document.addEventListener("keydown", key);
      window.addEventListener("lc-party", party); // dashboard "Preview"
      cleanups.push(() => { document.removeEventListener("keydown", key); window.removeEventListener("lc-party", party); document.documentElement.classList.remove("party"); });
    }

    // draggable emojis with spring snap-back
    document.querySelectorAll<HTMLElement>(".float-emo").forEach((emo) => {
      let dx = 0, dy = 0, sx = 0, sy = 0, raf = 0, dragging = false;
      const set = () => (emo.style.transform = `translate(${dx}px,${dy}px)`);
      const snap = () => {
        let vx = 0, vy = 0, last = 0;
        const k = 0.28, b = 0.55;
        const step = (ts: number) => {
          const dt = last ? Math.min((ts - last) / 16.67, 3) : 1;
          last = ts;
          vx += (-k * dx - b * vx) * dt; vy += (-k * dy - b * vy) * dt;
          dx += vx * dt; dy += vy * dt; set();
          if (Math.abs(dx) < 0.25 && Math.abs(dy) < 0.25 && Math.abs(vx) < 0.25 && Math.abs(vy) < 0.25) {
            dx = dy = 0; emo.style.transform = ""; raf = 0; return;
          }
          raf = requestAnimationFrame(step);
        };
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(step);
      };
      const down = (e: PointerEvent) => {
        e.preventDefault();
        cancelAnimationFrame(raf);
        dragging = true;
        emo.classList.add("dragging");
        emo.setPointerCapture(e.pointerId);
        sx = e.clientX - dx; sy = e.clientY - dy;
      };
      const move = (e: PointerEvent) => { if (dragging) { dx = e.clientX - sx; dy = e.clientY - sy; set(); } };
      const up = () => { if (!dragging) return; dragging = false; emo.classList.remove("dragging"); snap(); };
      emo.addEventListener("pointerdown", down);
      emo.addEventListener("pointermove", move);
      emo.addEventListener("pointerup", up);
      emo.addEventListener("pointercancel", up);
      cleanups.push(() => { cancelAnimationFrame(raf); emo.removeEventListener("pointerdown", down); emo.removeEventListener("pointermove", move); emo.removeEventListener("pointerup", up); emo.removeEventListener("pointercancel", up); });
    });

    // cursor dot + ring + connecting-dots canvas (mouse devices only), in the current accent colour
    if (cursor && fine && !reduced) {
      const dot = document.getElementById("cursor-dot");
      const ring = document.getElementById("cursor-ring");
      const canvas = document.getElementById("hack-canvas") as HTMLCanvasElement | null;
      const ctx = canvas?.getContext("2d");
      let rgb = "126,232,162";
      const readColor = () => {
        if (!ctx) return;
        ctx.fillStyle = "#7ee8a2"; ctx.fillStyle = accent();
        const hex = String(ctx.fillStyle);
        if (/^#[0-9a-f]{6}$/i.test(hex)) rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",");
      };
      readColor();
      window.addEventListener("skinchange", readColor);
      let mx = -999, my = -999, rx = -999, ry = -999, raf = 0;
      const dots = Array.from({ length: 60 }, () => ({
        x: Math.random() * innerWidth, y: Math.random() * innerHeight,
        vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
      }));
      const resize = () => { if (canvas) { canvas.width = innerWidth; canvas.height = innerHeight; } };
      resize();
      const mm = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; if (dot) { dot.style.left = mx + "px"; dot.style.top = my + "px"; } };
      const md = () => dot && (dot.style.transform = "translate(-50%,-50%) scale(1.8)");
      const mu = () => dot && (dot.style.transform = "translate(-50%,-50%) scale(1)");
      const loop = () => {
        rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12;
        if (ring) { ring.style.left = rx + "px"; ring.style.top = ry + "px"; }
        if (ctx && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          for (const d of dots) {
            d.x += d.vx; d.y += d.vy;
            if (d.x < 0 || d.x > canvas.width) d.vx *= -1;
            if (d.y < 0 || d.y > canvas.height) d.vy *= -1;
          }
          for (let i = 0; i < dots.length; i++) {
            const d = dots[i];
            const dm = Math.hypot(d.x - mx, d.y - my);
            if (dm >= 200) continue;
            const f = 1 - dm / 200;
            ctx.beginPath(); ctx.arc(d.x, d.y, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${rgb},${f * 0.9})`; ctx.fill();
            ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(mx, my);
            ctx.strokeStyle = `rgba(${rgb},${f * 0.35})`; ctx.lineWidth = 0.8; ctx.stroke();
            for (let j = i + 1; j < dots.length; j++) {
              const e = dots[j];
              const dd = Math.hypot(d.x - e.x, d.y - e.y);
              if (dd < 130) {
                ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(e.x, e.y);
                ctx.strokeStyle = `rgba(${rgb},${(1 - dd / 130) * 0.3 * f})`; ctx.lineWidth = 0.6; ctx.stroke();
              }
            }
          }
        }
        raf = requestAnimationFrame(loop);
      };
      loop();
      addEventListener("resize", resize);
      document.addEventListener("mousemove", mm);
      document.addEventListener("mousedown", md);
      document.addEventListener("mouseup", mu);
      cleanups.push(() => { cancelAnimationFrame(raf); removeEventListener("resize", resize); window.removeEventListener("skinchange", readColor); document.removeEventListener("mousemove", mm); document.removeEventListener("mousedown", md); document.removeEventListener("mouseup", mu); });
    }

    // anonymous visit counter (once per page load; "new visitor" once per day per browser)
    if (track) {
      let newVisitor = false;
      try {
        const today = new Date().toISOString().slice(0, 10);
        if (localStorage.getItem("lc_seen") !== today) { newVisitor = true; localStorage.setItem("lc_seen", today); }
      } catch {}
      send({ type: "view", newVisitor });
    }

    return () => cleanups.forEach((c) => c());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, track, fx.smooth, fx.magnetic, fx.countup, fx.timeline, fx.sparkles, fx.explorer, fx.party, partyWord, emojiKey]);

  return (
    <>
      <div id="progress" />
      {cursor && (<><canvas id="hack-canvas" /><div id="cursor-dot" /><div id="cursor-ring" /></>)}
    </>
  );
}

function send(body: object) {
  try {
    fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true });
  } catch {}
}
