"use client";
import { useEffect } from "react";

/**
 * All the motion on the public site: progress bar, scroll reveal, scroll-spy for nav + rail,
 * card glow, draggable floating emojis (with spring snap-back), cursor trail canvas, and
 * a tiny anonymous visit counter.
 */
export default function Effects({ cursor, track }: { cursor: boolean; track: boolean }) {
  useEffect(() => {
    document.documentElement.classList.remove("no-js");
    const cleanups: (() => void)[] = [];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

    // reveal
    const revealObs = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => revealObs.observe(el));
    cleanups.push(() => revealObs.disconnect());

    // scroll-spy + section view tracking
    const seen = new Set<string>();
    const sections = Array.from(document.querySelectorAll<HTMLElement>("section[data-spy]"));
    const order = sections.map((s) => s.id);
    const rail = document.getElementById("rail");
    const spy = new IntersectionObserver(
      (es) => es.forEach((e) => {
        if (!e.isIntersecting) return;
        const id = (e.target as HTMLElement).id;
        const idx = order.indexOf(id);
        document.querySelectorAll<HTMLAnchorElement>(".navlinks a").forEach((a) => a.classList.toggle("active", a.dataset.link === id));
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
      }),
      { threshold: 0.35 }
    );
    sections.forEach((s) => spy.observe(s));
    cleanups.push(() => spy.disconnect());

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

    // cursor dot + ring + connecting-dots canvas (mouse devices only)
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (cursor && fine && !reduced) {
      const dot = document.getElementById("cursor-dot");
      const ring = document.getElementById("cursor-ring");
      const canvas = document.getElementById("hack-canvas") as HTMLCanvasElement | null;
      const ctx = canvas?.getContext("2d");
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
            ctx.fillStyle = `rgba(126,232,162,${f * 0.9})`; ctx.fill();
            ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(mx, my);
            ctx.strokeStyle = `rgba(126,232,162,${f * 0.35})`; ctx.lineWidth = 0.8; ctx.stroke();
            for (let j = i + 1; j < dots.length; j++) {
              const e = dots[j];
              const dd = Math.hypot(d.x - e.x, d.y - e.y);
              if (dd < 130) {
                ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(e.x, e.y);
                ctx.strokeStyle = `rgba(126,232,162,${(1 - dd / 130) * 0.3 * f})`; ctx.lineWidth = 0.6; ctx.stroke();
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
      cleanups.push(() => { cancelAnimationFrame(raf); removeEventListener("resize", resize); document.removeEventListener("mousemove", mm); document.removeEventListener("mousedown", md); document.removeEventListener("mouseup", mu); });
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
  }, [cursor, track]);

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
