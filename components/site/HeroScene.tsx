"use client";
import { useEffect, useRef } from "react";
import { prefersReducedMotion, toHex } from "./fx";
import type { HeroSceneHandle, SceneColors } from "./heroEngine";

function readColors(): SceneColors {
  const cs = getComputedStyle(document.querySelector(".site") ?? document.documentElement);
  const get = (k: string, f: string) => toHex(cs.getPropertyValue(k).trim(), f);
  const bg = get("--hero-bg", "#111111");
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16));
  return { a: get("--mint", "#7ee8a2"), b: get("--pop3", "#9fd8e6"), c: get("--pop2", "#f2a5c0"), light: 0.2126 * r + 0.7152 * g + 0.0722 * b > 150 };
}

/**
 * The 3D sculpture behind the hero. It loads after the page is ready, sleeps while off screen, and simply never
 * appears on devices with reduced motion, data saver or no WebGL: the aurora behind it is the fallback.
 */
export default function HeroScene() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current, hero = canvas?.closest("#hero") as HTMLElement | null;
    if (!canvas || !hero || prefersReducedMotion() || document.documentElement.classList.contains("lite")) return;
    const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData || (navigator.hardwareConcurrency || 4) < 3) return;

    let scene: HeroSceneHandle | null = null, dead = false;
    const off: (() => void)[] = [];
    const listen = <K extends keyof HTMLElementEventMap>(el: HTMLElement, k: K, f: (e: HTMLElementEventMap[K]) => void) => { el.addEventListener(k, f); off.push(() => el.removeEventListener(k, f)); };
    const ndc = (e: { clientX: number; clientY: number }) => {
      const r = hero.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1) };
    };

    const toLite = () => {
      dead = true;
      off.forEach((f) => f());
      off.length = 0;
      scene?.destroy();
      scene = null;
      canvas.classList.remove("on");
    };
    window.addEventListener("lc-lite", toLite);

    const start = async () => {
      if (dead) return;
      let handle: HeroSceneHandle;
      try {
        const { createHeroScene } = await import("./heroEngine");
        if (dead) return;
        const intro = document.querySelector(".intro");
        const curtain = intro && getComputedStyle(intro).display !== "none";
        const avatar = hero.querySelector(".avatar-wrap");
        handle = createHeroScene(canvas, {
          count: window.innerWidth < 761 ? 9000 : 20000,
          colors: readColors(),
          delay: curtain ? 1150 : 150,
          align: () => {
            if (!avatar || window.scrollY > 40) return null;
            const a = avatar.getBoundingClientRect(), h = hero.getBoundingClientRect();
            return { x: (a.left + a.width / 2 - h.left) / h.width, y: (a.top + a.height / 2 - h.top) / h.height };
          },
        });
      } catch { return; } // no WebGL: the aurora stays
      scene = handle;
      canvas.classList.add("on");

      listen(hero, "pointermove", (e) => { const p = ndc(e); handle.pointer(p.x, p.y, true); });
      listen(hero, "pointerleave", () => handle.pointer(0, 0, false));
      listen(hero, "click", (e) => {
        if ((e.target as Element).closest("a, button, input, .float-emo")) return;
        const p = ndc(e); handle.pulse(p.x, p.y);
      });
      const onNext = () => handle.pulse(0.3, 0);
      window.addEventListener("lc-hero-next", onNext);
      off.push(() => window.removeEventListener("lc-hero-next", onNext));
      const onSkin = () => handle.setColors(readColors());
      window.addEventListener("skinchange", onSkin);
      off.push(() => window.removeEventListener("skinchange", onSkin));

      const onScroll = () => handle.scroll(Math.min(1, Math.max(0, window.scrollY / Math.max(1, hero.offsetHeight))));
      window.addEventListener("scroll", onScroll, { passive: true });
      off.push(() => window.removeEventListener("scroll", onScroll));
      onScroll();

      const ro = new ResizeObserver(() => handle.resize());
      ro.observe(hero);
      off.push(() => ro.disconnect());

      // only draws while the hero is on screen and the tab is open
      let seen = true;
      const sync = () => (seen && !document.hidden ? handle.play() : handle.pause());
      const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; sync(); });
      io.observe(hero);
      document.addEventListener("visibilitychange", sync);
      off.push(() => { io.disconnect(); document.removeEventListener("visibilitychange", sync); });
      const lost = (e: Event) => { e.preventDefault(); handle.pause(); canvas.classList.remove("on"); };
      canvas.addEventListener("webglcontextlost", lost);
      off.push(() => canvas.removeEventListener("webglcontextlost", lost));
      sync();
    };

    const w = window as unknown as { requestIdleCallback?: (f: () => void, o?: object) => number; cancelIdleCallback?: (n: number) => void };
    const id = w.requestIdleCallback ? w.requestIdleCallback(start, { timeout: 1200 }) : window.setTimeout(start, 300);
    return () => {
      dead = true;
      window.removeEventListener("lc-lite", toLite);
      if (w.cancelIdleCallback) w.cancelIdleCallback(id); else clearTimeout(id);
      off.forEach((f) => f());
      scene?.destroy();
    };
  }, []);
  return <canvas ref={ref} className="hero-3d" aria-hidden />;
}
