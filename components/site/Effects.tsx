"use client";
import { useEffect } from "react";
import { accent, burst, confettiCannons, confettiFrom, docTop, pageY, prefersReducedMotion, rain, toast } from "./fx";
import { startScrollBoxes } from "./scrollBoxes";

type Fx = { autolite: boolean; smooth: boolean; countup: boolean; timeline: boolean; sparkles: boolean; explorer: boolean; party: boolean };
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

/**
 * The core motion on the public site: progress bar + ring, scroll reveal, scroll-spy (nav, rail, phone menu), card glow,
 * draggable floating emojis, cursor trail, smooth scrolling, count-up numbers, the self-drawing
 * timeline, click sparkles, party mode, the explorer badge, and a tiny anonymous visit counter.
 */
export default function Effects({ cursor, track, totop = false, fx, partyWord, sparkleEmojis }:
  { cursor: boolean; track: boolean; totop?: boolean; fx: Fx; partyWord: string; sparkleEmojis: string[] }) {
  const emojiKey = sparkleEmojis.join(" ");
  useEffect(() => {
    document.documentElement.classList.remove("no-js");
    const cleanups: (() => void)[] = [];
    const reduced = prefersReducedMotion();
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    // progress bar
    const bar = document.getElementById("progress");
    const up = document.querySelector<HTMLElement>(".totop");
    const ring100 = up?.querySelector<SVGCircleElement>(".val");
    let ringShown = -1, pageMax = 0, barRaf = 0;
    const paintBar = () => {
      barRaf = 0;
      const top = pageY();
      const pct = pageMax > 0 ? (top / pageMax) * 100 : 0;
      if (bar) bar.style.transform = `scaleX(${(pct / 100).toFixed(4)})`; // scaling needs no page layout, unlike width
      if (up) up.classList.toggle("on", top > window.innerHeight * 0.5);
      const whole = Math.round(pct);
      if (ring100 && whole !== ringShown) { ringShown = whole; ring100.style.strokeDashoffset = String(100 - whole); }
    };
    const onScroll = () => { if (!barRaf) barRaf = requestAnimationFrame(paintBar); };
    const measurePage = () => { const h = document.documentElement; pageMax = h.scrollHeight - h.clientHeight; onScroll(); };
    const pageSize = new ResizeObserver(measurePage);
    pageSize.observe(document.body);
    measurePage();
    window.addEventListener("scroll", onScroll, { passive: true });
    cleanups.push(() => { cancelAnimationFrame(barRaf); pageSize.disconnect(); window.removeEventListener("scroll", onScroll); });

    // decorative loops rest while the page scrolls (see html.scrolling in site.css)
    let restTimer = 0, moving = false;
    const scrollingNow = () => {
      if (!moving) { moving = true; document.documentElement.classList.add("scrolling"); }
      clearTimeout(restTimer);
      restTimer = window.setTimeout(() => { moving = false; document.documentElement.classList.remove("scrolling"); }, 320);
    };
    window.addEventListener("scroll", scrollingNow, { passive: true });
    cleanups.push(() => { clearTimeout(restTimer); window.removeEventListener("scroll", scrollingNow); document.documentElement.classList.remove("scrolling"); });

    // The page is scrolled by the browser itself, apart from the page's scripts, so it keeps moving however busy they are. Nothing may
    // take that over again: no scroll library, and no wheel or touch listener that can stop the browser (passive: false).
    // The switch only decides whether #section links glide or jump.
    const html = document.documentElement;
    if (!fx.smooth) { html.style.scrollBehavior = "auto"; cleanups.push(() => { html.style.scrollBehavior = ""; }); }

    // A link to a section works out where to stop when it's clicked. Anything that changes the page's height during the glide
    // (a picture arriving, mostly) moves the section, so it aims again until the page settles or the visitor takes over.
    let stopAiming = () => {};
    const aimAtLink = (e: MouseEvent) => {
      stopAiming(); // any click ends the last link's aim, or "Home" could be pulled back to where that link was heading
      const id = (e.target as Element).closest?.('a[href^="#"]')?.getAttribute("href")?.slice(1);
      const target = id && id !== "hero" ? document.getElementById(decodeURIComponent(id)) : null;
      if (!target) return;
      let height = document.body.offsetHeight, timer = 0;
      const ro = new ResizeObserver(([entry]) => {
        const h = entry.target.getBoundingClientRect().height;
        if (Math.abs(h - height) < 1) return;
        height = h;
        clearTimeout(timer);
        timer = window.setTimeout(() => {
          target.scrollIntoView({ block: "start" });
        }, 60);
      });
      const inputs = ["wheel", "touchstart", "keydown", "pointerdown"];
      const giveUp = window.setTimeout(() => stopAiming(), 5000);
      stopAiming = () => {
        ro.disconnect();
        clearTimeout(timer);
        clearTimeout(giveUp);
        inputs.forEach((ev) => window.removeEventListener(ev, stopAiming));
        stopAiming = () => {};
      };
      ro.observe(document.body);
      inputs.forEach((ev) => window.addEventListener(ev, stopAiming, { passive: true }));
    };
    document.addEventListener("click", aimAtLink);
    cleanups.push(() => { document.removeEventListener("click", aimAtLink); stopAiming(); });

    // A device that stays under about 20 frames per second while scrolling gets the lighter version for this page only; the next page
    // starts full again (it used to be remembered for the visit, and the owner saw their emojis, background marks and neon vanish after a
    // reload). The first 6 seconds don't count, because pictures, fonts, the 3D and screen fitting all land then, and it needs three slow
    // stretches in a row, so a busy moment never sets it off.
    // ?fx=full (the dashboard's View site on the Appearance page) skips the lighter version for the rest of the visit, so the owner
    // sees what the effect switches do even on a slow computer (2026-11-26)
    let full = false;
    try { if (new URLSearchParams(location.search).get("fx") === "full") sessionStorage.setItem("lc_fx_full", "1"); full = sessionStorage.getItem("lc_fx_full") === "1"; } catch {}
    if (fx.autolite && !full && !reduced && !html.classList.contains("lite")) {
      let prev = 0, sum = 0, n = 0, strikes = 0, raf = 0, until = 0;
      const from = performance.now() + 6000;
      const goLite = () => {
        html.classList.add("lite");
        window.dispatchEvent(new Event("lc-lite"));
        window.removeEventListener("scroll", wake);
      };
      const watch = (t: number) => {
        raf = 0;
        if (prev && t - prev < 300) { sum += t - prev; n++; }
        prev = t;
        if (t < from) { sum = 0; n = 0; }
        if (n >= 40) {
          const slow = sum / n > 50;
          sum = 0; n = 0;
          strikes = slow ? strikes + 1 : 0;
          if (strikes >= 3) { goLite(); return; }
        }
        if (performance.now() < until) raf = requestAnimationFrame(watch);
        else prev = 0;
      };
      const wake = () => { until = performance.now() + 200; if (!raf) raf = requestAnimationFrame(watch); };
      window.addEventListener("scroll", wake, { passive: true });
      cleanups.push(() => { cancelAnimationFrame(raf); window.removeEventListener("scroll", wake); });
    }

    // everything decorative rests while its section is off screen, so the browser only works on what can be seen
    const sleepObs = new IntersectionObserver(
      (es) => es.forEach((e) => e.target.classList.toggle("sleep", !e.isIntersecting)),
      { rootMargin: "20% 0px" }
    );
    document.querySelectorAll("section.chap, section[data-spy], .ribbon").forEach((el) => sleepObs.observe(el));
    cleanups.push(() => sleepObs.disconnect());

    cleanups.push(startScrollBoxes());

    // reveal (+ cards dropping in one by one, via CSS on .stagger.in)
    const revealObs = new IntersectionObserver(
      (es) => es.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        // letter-by-letter titles: once they've risen, take away the mask so they can react to the mouse
        if (e.target.classList.contains("split-host")) setTimeout(() => e.target.classList.add("done"), 1500);
      }),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => revealObs.observe(el));
    cleanups.push(() => revealObs.disconnect());

    // cards arrive one by one as each scrolls into view; a row that appears together still ripples left to right
    if (!reduced) {
      const hosts = Array.from(document.querySelectorAll<HTMLElement>(".stagger"));
      const cardObs = new IntersectionObserver((es) => {
        es.filter((e) => e.isIntersecting).forEach((e, i) => {
          cardObs.unobserve(e.target);
          (e.target as HTMLElement).style.setProperty("--si", String(i));
          e.target.classList.add("seen");
        });
      }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
      hosts.forEach((h) => { h.classList.add("live"); Array.from(h.children).forEach((c) => cardObs.observe(c)); });
      cleanups.push(() => { cardObs.disconnect(); hosts.forEach((h) => h.classList.remove("live")); });
    }

    // "Home" and the back-to-top ring: straight to the very top, smoothly
    const goUp = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.('a[href="#hero"], button.totop');
      if (!a) return;
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduced || !fx.smooth ? "auto" : "smooth" });
    };
    document.addEventListener("click", goUp);
    cleanups.push(() => document.removeEventListener("click", goUp));

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
      // row positions are read once and reused, and an off-screen timeline does nothing
      const state = lines.map((tl) => ({ tl, top: 0, h: -1, p: -1, rows: [] as { el: HTMLElement; top: number }[] }));
      let drawRaf = 0;
      const paint = () => {
        drawRaf = 0;
        const vh = window.innerHeight, y = pageY();
        for (const s of state) {
          const top = s.top - y;
          if (s.p >= 0 && (top + s.h < -vh * 0.3 || top > vh * 1.3)) continue;
          const p = reduced ? 1 : Math.min(1, Math.max(0, (vh * 0.72 - top) / Math.max(1, s.h - 22)));
          if (Math.abs(p - s.p) < 0.002) continue;
          s.p = p;
          s.tl.style.setProperty("--p", p.toFixed(3));
          for (const row of s.rows) row.el.classList.toggle("lit", (row.top + 12) / Math.max(1, s.h - 22) <= p + 0.02);
        }
      };
      const draw = () => { if (!drawRaf) drawRaf = requestAnimationFrame(paint); };
      const measureLines = () => {
        for (const s of state) {
          s.top = docTop(s.tl);
          s.h = s.tl.offsetHeight;
          s.rows = Array.from(s.tl.querySelectorAll<HTMLElement>(".tl-row")).map((el) => ({ el, top: el.offsetTop }));
          s.p = -1;
        }
        draw();
      };
      const lineSizes = new ResizeObserver(measureLines);
      lineSizes.observe(document.body);
      measureLines();
      window.addEventListener("scroll", draw, { passive: true });
      cleanups.push(() => { cancelAnimationFrame(drawRaf); lineSizes.disconnect(); window.removeEventListener("scroll", draw); });
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
        window.dispatchEvent(new Event("lc-spy"));
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

    // card glow follows the mouse: measured and written once per frame, never inside the mouse event
    let glowCard: HTMLElement | null = null, glowRaf = 0, glowX = 0, glowY = 0;
    const glowPaint = () => {
      glowRaf = 0;
      if (!glowCard) return;
      const r = glowCard.getBoundingClientRect();
      glowCard.style.setProperty("--gx", `${(((glowX - r.left) / r.width) * 100).toFixed(1)}%`);
      glowCard.style.setProperty("--gy", `${(((glowY - r.top) / r.height) * 100).toFixed(1)}%`);
    };
    const glow = (e: MouseEvent) => {
      glowCard = (e.target as HTMLElement).closest?.(".card") as HTMLElement | null;
      if (!glowCard) return;
      glowX = e.clientX; glowY = e.clientY;
      if (!glowRaf) glowRaf = requestAnimationFrame(glowPaint);
    };
    document.addEventListener("mousemove", glow, { passive: true });
    cleanups.push(() => { cancelAnimationFrame(glowRaf); document.removeEventListener("mousemove", glow); });

    // click sparkles: the hero emojis burst out wherever someone clicks
    if (fx.sparkles && !reduced && sparkleEmojis.length) {
      const spark = (e: PointerEvent) => {
        if (e.button !== 0) return;
        const t = e.target as Element;
        if (!t.closest?.(".site") || t.closest("input, textarea, select, dialog, .lb, .skin-menu, .float-emo, .hb")) return;
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
      let mx = -999, my = -999, rx = -999, ry = -999, raf = 0, ringShownAt = "", last = 0;
      const R = 200, LINK = 130; // how far the mouse reaches the dots, and dots reach each other
      const dots = Array.from({ length: 60 }, () => ({
        x: Math.random() * innerWidth, y: Math.random() * innerHeight,
        vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
      }));
      const resize = () => { if (canvas) { canvas.width = innerWidth; canvas.height = innerHeight; drawn = null; } };
      // the part of the canvas drawn last frame: only that is cleared, never the whole screen
      let drawn: { x: number; y: number; w: number; h: number } | null = null;
      const wipe = () => { if (ctx && drawn) ctx.clearRect(drawn.x, drawn.y, drawn.w, drawn.h); drawn = null; };
      resize();
      // moved by transform, written the moment the mouse moves, before any other mouse effect runs
      let dotScale = 1;
      const placeDot = () => { if (dot) dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%,-50%) scale(${dotScale})`; };
      const mm = (e: PointerEvent) => { if (e.pointerType === "touch") return; mx = e.clientX; my = e.clientY; if (rx < -900) { rx = mx; ry = my; } placeDot(); wake(); };
      const md = () => { dotScale = 1.8; placeDot(); };
      const mu = () => { dotScale = 1; placeDot(); };
      // lines are grouped by how see-through they are, so a frame strokes a handful of paths instead of hundreds
      const BANDS = 6;
      const paths: Path2D[] = [];
      const loop = (now: number) => {
        raf = 0;
        const dt = last ? Math.min(64, now - last) : 16.7;
        last = now;
        const step = dt / 16.7;
        // the ring follows on real time, so it glides the same at 30 or 144 frames a second
        const k = 1 - Math.pow(0.86, step);
        const gapX = mx - rx, gapY = my - ry;
        rx += gapX * k; ry += gapY * k;
        if (ring) {
          // the plain ring stretches along its path when moving fast; a labelled one stays round so its text reads
          const speed = Math.min(1, Math.hypot(gapX, gapY) / 160);
          const place = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0) translate(-50%,-50%)`;
          const next = ring.className || speed < 0.02 ? place : `${place} rotate(${Math.atan2(gapY, gapX).toFixed(3)}rad) scale(${(1 + speed * 0.55).toFixed(3)},${(1 - speed * 0.3).toFixed(3)})`;
          if (next !== ringShownAt) { ring.style.transform = next; ringShownAt = next; }
        }
        // the dots hold still while the page moves, and aren't drawn when the mouse is nowhere near
        const drawDots = !!ctx && !!canvas && mx > -900 && !html.classList.contains("lite") && !html.classList.contains("scrolling");
        if (drawDots && ctx && canvas) {
          wipe();
          for (const d of dots) {
            d.x += d.vx * step; d.y += d.vy * step;
            if (d.x < 0 || d.x > canvas.width) d.vx *= -1;
            if (d.y < 0 || d.y > canvas.height) d.vy *= -1;
          }
          for (let i = 0; i < BANDS; i++) paths[i] = new Path2D();
          const near: { i: number; x: number; y: number; f: number }[] = [];
          const isNear: boolean[] = [];
          dots.forEach((d, i) => {
            const dm = Math.hypot(d.x - mx, d.y - my);
            if (dm < R) { near.push({ i, x: d.x, y: d.y, f: 1 - dm / R }); isNear[i] = true; }
          });
          if (near.length) {
            ctx.lineWidth = 0.7;
            for (const n of near) {
              const p = paths[Math.min(BANDS - 1, Math.floor(n.f * BANDS))];
              p.moveTo(n.x, n.y); p.lineTo(mx, my);
              for (let j = 0; j < dots.length; j++) {
                // a line between two lit dots is drawn once, from the first of them
                if (j === n.i || (isNear[j] && j < n.i)) continue;
                const e = dots[j];
                const dd = Math.hypot(n.x - e.x, n.y - e.y);
                if (dd < LINK) {
                  const q = paths[Math.min(BANDS - 1, Math.floor((1 - dd / LINK) * n.f * BANDS))];
                  q.moveTo(n.x, n.y); q.lineTo(e.x, e.y);
                }
              }
            }
            for (let i = 0; i < BANDS; i++) {
              ctx.strokeStyle = `rgba(${rgb},${(((i + 0.5) / BANDS) * 0.32).toFixed(3)})`;
              ctx.stroke(paths[i]);
            }
            for (const n of near) {
              ctx.fillStyle = `rgba(${rgb},${(n.f * 0.9).toFixed(2)})`;
              ctx.beginPath(); ctx.arc(n.x, n.y, 2.5, 0, Math.PI * 2); ctx.fill();
            }
            // everything drawn lies within reach of the mouse plus a link's length
            const m = R + LINK + 4;
            drawn = { x: mx - m, y: my - m, w: m * 2, h: m * 2 };
          }
        } else if (html.classList.contains("lite")) wipe();
        // keep going while the ring is still catching up or dots are moving near the mouse; otherwise sleep until the mouse moves
        const settling = Math.abs(gapX) > 0.3 || Math.abs(gapY) > 0.3;
        if (settling || (drawDots && drawn)) raf = requestAnimationFrame(loop);
        else last = 0;
      };
      const wake = () => { if (!raf) raf = requestAnimationFrame(loop); };
      const leave = (e: MouseEvent) => { if (!e.relatedTarget) { wipe(); mx = my = -999; rx = ry = -999; placeDot(); if (ring) ring.style.transform = ringShownAt = "translate(-99px,-99px)"; } };
      wake();
      addEventListener("resize", resize);
      // dots resume drifting after the page stops scrolling
      const unscroll = () => { if (!html.classList.contains("scrolling")) wake(); };
      const mo = new MutationObserver(unscroll);
      mo.observe(html, { attributes: true, attributeFilter: ["class"] });
      document.addEventListener("pointermove", mm, { passive: true, capture: true });
      document.addEventListener("mousedown", md);
      document.addEventListener("mouseup", mu);
      document.addEventListener("mouseout", leave);
      cleanups.push(() => { cancelAnimationFrame(raf); mo.disconnect(); removeEventListener("resize", resize); window.removeEventListener("skinchange", readColor); document.removeEventListener("pointermove", mm, { capture: true }); document.removeEventListener("mousedown", md); document.removeEventListener("mouseup", mu); document.removeEventListener("mouseout", leave); });
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
  }, [cursor, track, fx.autolite, fx.smooth, fx.countup, fx.timeline, fx.sparkles, fx.explorer, fx.party, partyWord, emojiKey]);

  return (
    <>
      <div id="progress" />
      {cursor && (<><canvas id="hack-canvas" /><div id="cursor-dot" /><div id="cursor-ring"><span id="cursor-label" /></div></>)}
      {totop && (
        <button type="button" className="totop" aria-label="Back to top">
          <svg viewBox="0 0 36 36" aria-hidden><circle className="track" cx="18" cy="18" r="16" pathLength={100} /><circle className="val" cx="18" cy="18" r="16" pathLength={100} /></svg>
          <i className="ti ti-arrow-up" aria-hidden />
        </button>
      )}
    </>
  );
}

function send(body: object) {
  try {
    if (window.self !== window.top) return; // a preview inside the dashboard (the Mascot page's screens) isn't a visit
    fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true });
  } catch {}
}
