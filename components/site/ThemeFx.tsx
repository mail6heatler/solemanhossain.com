"use client";
import { useEffect, useRef } from "react";
import { prefersReducedMotion, toHex } from "./fx";
import type { Frame, Palette, Scene } from "./themeScenes";

/**
 * Each theme's living background (waves for Ocean, falling code for Techy…). One canvas behind the content, fixed to
 * the screen. It sleeps while the tab is hidden and never starts for reduced-motion, data-saver or very old devices.
 */
export default function ThemeFx() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || prefersReducedMotion()) return;
    const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData || (navigator.hardwareConcurrency || 4) < 3) return;

    let dead = false, stop = () => {};
    import("./themeScenes").then(({ makeScene, drawBursts, clickBurst }) => {
      if (dead) return;
      const h = document.documentElement;
      let skin = "", palette: Palette = { a: "#7ee8a2", b: "#9fd8e6", c: "#f2a5c0", deep: "#2f7a52", fg: "#ffffff" }, scene: Scene | null = null;
      let w = 0, ht = 0, raf = 0, last = 0, t = 0, lastY = window.scrollY, speed = 0, gap = 1000 / 30, slow = 0, frames = 0;

      const load = () => {
        skin = h.dataset.skin || "night";
        const cs = getComputedStyle(document.querySelector(".site") ?? h);
        const get = (k: string, f: string) => toHex(cs.getPropertyValue(k).trim(), f);
        palette = { a: get("--mint", "#7ee8a2"), b: get("--pop3", "#9fd8e6"), c: get("--pop2", "#f2a5c0"), deep: get("--mint-deep", "#2f7a52"), fg: get("--fg", "#ffffff") };
        ctx.clearRect(0, 0, w, ht);
        scene = makeScene(skin, palette, w, ht);
      };
      const size = () => {
        w = canvas.width = window.innerWidth;
        ht = canvas.height = window.innerHeight;
        load();
      };
      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        if (now - last < (Math.abs(speed) > 0.6 ? Math.max(gap, 50) : gap)) return; // the page gets priority while it's moving
        const dt = Math.min(0.1, last ? (now - last) / 1000 : 0.03);
        const cost = performance.now();
        last = now; t += dt;
        const y = window.scrollY, d = y - lastY;
        lastY = y;
        speed += (d - speed) * 0.15;
        if (!scene) return;
        if (scene.trails) { // falling code leaves a fading trail
          ctx.globalCompositeOperation = "destination-out";
          ctx.fillStyle = "rgba(0,0,0,.09)";
          ctx.fillRect(0, 0, w, ht);
          ctx.globalCompositeOperation = "source-over";
        } else ctx.clearRect(0, 0, w, ht);
        const f: Frame = { w, h: ht, t, dt, speed, scrollY: y };
        scene.draw(ctx, f);
        drawBursts(ctx, dt);
        // a machine that can't keep up gets fewer frames rather than a stuttering page
        slow += performance.now() - cost > 14 ? 1 : 0;
        if (++frames >= 60) { if (slow > 24) gap = 1000 / 20; slow = 0; frames = 0; }
      };
      const play = () => { cancelAnimationFrame(raf); last = 0; if (!document.hidden) raf = requestAnimationFrame(frame); };
      const click = (e: PointerEvent) => {
        if (e.button !== 0 || !(e.target as Element).closest?.(".site")) return;
        if ((e.target as Element).closest("input, textarea, select, dialog, .lb, .hb")) return;
        clickBurst(skin, palette, e.clientX, e.clientY);
      };
      const obs = new MutationObserver(() => load());
      obs.observe(h, { attributes: true, attributeFilter: ["data-skin"] });
      window.addEventListener("resize", size);
      document.addEventListener("visibilitychange", play);
      document.addEventListener("pointerdown", click);
      size();
      canvas.classList.add("on");
      play();
      stop = () => {
        cancelAnimationFrame(raf);
        obs.disconnect();
        window.removeEventListener("resize", size);
        document.removeEventListener("visibilitychange", play);
        document.removeEventListener("pointerdown", click);
      };
    }).catch(() => {});
    return () => { dead = true; stop(); };
  }, []);
  return <canvas ref={ref} className="theme-canvas" aria-hidden />;
}
