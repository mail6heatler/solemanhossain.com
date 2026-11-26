"use client";
import { useEffect, useRef } from "react";
import type { MascotSettings, MascotView } from "@/lib/mascot";
import type { MascotCtl } from "./mascotEngine";

/** Messages from the dashboard's Mascot page to its screens (the homepage in an iframe, `/?mz=studio`). */
export type MzStudioMsg = { type: "lc-mz-draft"; m: MascotSettings } | { type: "lc-mz-cmd"; cmd: string; k?: string };
/** true on the Mascot page's screens: the real homepage inside the dashboard */
const inStudio = () => { try { return window.self !== window.top && new URLSearchParams(location.search).get("mz") === "studio"; } catch { return false; } };

/**
 * Where Mini Shourobh lives: a fixed layer over the page (app/mascot.css). React draws it empty; the show
 * (mascotEngine.ts and GSAP, downloaded separately once the page is idle) fills it after start-up, so nothing is
 * added inside `.site` before React has started, and the first load stays as light as before.
 *
 * On the Mascot page's screens (2026-11-26) he starts at once, shows even if he's hidden on the site, takes the
 * page's unsaved settings (`lc-mz-draft`) and plays whatever its ▶ Test buttons ask (`lc-mz-cmd`).
 */
/** `phoneMenu`: the site's phone menu (settings.menu.phone), so his layer keeps clear of the pull-up sheet's handle. */
export default function Mascot({ view, phoneMenu = "bottom" }: { view: MascotView; phoneMenu?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const key = JSON.stringify(view);
  useEffect(() => {
    const layer = ref.current;
    if (!layer) return;
    const v = JSON.parse(key) as MascotView, studio = inStudio();
    if (!v.m.show && !studio) return;
    const shown = (m: MascotSettings): MascotSettings => (studio ? { ...m, show: true, phones: true } : m);
    let ctl: MascotCtl | null = null, dead = false, last: MascotSettings | null = null;
    const go = () => Promise.all([import("gsap"), import("./mascotEngine")])
      .then(([g, e]) => {
        if (dead) return;
        ctl = e.startMascot(layer, { ...v, m: shown(last || v.m) }, g.gsap);
        if (studio) parent.postMessage({ type: "lc-mz-ready" }, location.origin);
      })
      .catch(() => {});
    const on = (e: MessageEvent) => {
      const d = e.data as MzStudioMsg; if (e.origin !== location.origin || !d || typeof d !== "object") return;
      if (d.type === "lc-mz-draft") { last = d.m; ctl?.update(shown(d.m)); return; }
      if (d.type !== "lc-mz-cmd" || !ctl) return;
      const f = (ctl as unknown as Record<string, ((k?: string) => void) | undefined>)[d.cmd];
      if (typeof f === "function" && d.cmd !== "stop" && d.cmd !== "update") f(d.k);
    };
    if (studio) addEventListener("message", on);
    const t = studio ? window.setTimeout(() => void go(), 50) : window.setTimeout(() => ("requestIdleCallback" in window ? window.requestIdleCallback(() => void go(), { timeout: 2500 }) : void go()), 1500);
    return () => { dead = true; clearTimeout(t); removeEventListener("message", on); ctl?.stop(); };
  }, [key]);
  return <div ref={ref} className={`mz-layer ph-${phoneMenu}`} />;
}
