"use client";
import { useEffect, useRef } from "react";
import type { MascotSettings, MascotView } from "@/lib/mascot";
import type { MascotCtl } from "./mascotEngine";
import { whenSettled } from "./fx";
import { awayCard, awayNow, clearAway, markAway } from "./mascotAway";

type Peek = typeof import("./mascotPeek");

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
 *
 * Bye and hi (2026-11-28): when a visitor sends him away, the engine plays his exit and calls `onGone`; here he's then stopped
 * (his loops and listeners end) and only what stays is drawn (mascotPeek.ts), remembered for the visit, the device or a few
 * minutes (mascotAway.ts). On later pages while he's away, his animation code isn't downloaded at all, only the peek. Saying hi
 * starts him again with an entrance (`arrive`). The Mascot page's screens never remember it.
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
    const now = () => shown(last || v.m);
    let ctl: MascotCtl | null = null, dead = false, last: MascotSettings | null = null, unAway: (() => void) | null = null, starting = false, peek: Peek | null = null, inCard = false;
    /** he's here: GSAP and his engine; `arrive` plays an entrance ("" = the one his settings pick) instead of his hello */
    const start = (arrive?: string) => {
      if (starting || ctl || dead) return; starting = true;
      return Promise.all([import("gsap"), import("./mascotEngine"), import("./mascotPeek")])
        .then(([g, e, p]) => {
          starting = false; peek = p;
          if (dead || ctl) return;
          ctl = e.startMascot(layer, { ...v, m: now() }, g.gsap, { arrive, onGone: gone });
          if (studio) parent.postMessage({ type: "lc-mz-ready" }, location.origin);
        })
        .catch(() => { starting = false; });
    };
    const mount = (p: Peek) => { if (dead || ctl) return; unAway?.(); unAway = p.mountAway(layer, now(), (enter) => hi(enter), inCard); };
    /** a visitor sent him away (`how` is "card" when he was locked in a tarot card): he's stopped and what stays is drawn in the same
     * moment, so the card that glided into his corner turns into the mini card without a flicker */
    const gone = (how?: string) => {
      const m = now(); inCard = how === "card"; if (!studio) markAway(m.bye.stay, m.bye.minutes, inCard);
      ctl?.stop(); ctl = null;
      if (peek) mount(peek); else void away();
    };
    const away = () => import("./mascotPeek").then((p) => { peek = p; mount(p); }).catch(() => {});
    /** a visitor said hi (or the time ran out): `enter` is an entrance to play, for the Mascot page's ▶ Test */
    const hi = (enter = "") => { unAway?.(); unAway = null; inCard = false; if (!studio) clearAway(); void start(enter); };
    const on = (e: MessageEvent) => {
      const d = e.data as MzStudioMsg; if (e.origin !== location.origin || !d || typeof d !== "object") return;
      if (d.type === "lc-mz-draft") { last = d.m; ctl?.update(shown(d.m)); if (unAway) void away(); return; }
      if (d.type !== "lc-mz-cmd") return;
      if (d.cmd === "sayHi") { if (ctl) { ctl.stop(); ctl = null; } hi(d.k || ""); return; } // he's here: he slips off and arrives again with that entrance
      if (!ctl) return;
      const f = (ctl as unknown as Record<string, ((k?: string) => void) | undefined>)[d.cmd];
      if (typeof f === "function" && d.cmd !== "stop" && d.cmd !== "update") f(d.k);
    };
    if (studio) addEventListener("message", on);
    // on the site he's third in line once the page has loaded, after the 3D hero and the theme's background; a visitor who sent
    // him away gets only the light peek
    const begin = () => { if (!studio && awayNow(v.m.bye.on)) { inCard = awayCard(); void away(); } else void start(); };
    const t = studio ? window.setTimeout(() => void start(), 50) : 0;
    const cancel = studio ? () => {} : whenSettled(begin, 3);
    return () => { dead = true; clearTimeout(t); cancel(); removeEventListener("message", on); ctl?.stop(); unAway?.(); };
  }, [key]);
  return <div ref={ref} className={`mz-layer ph-${phoneMenu}`} />;
}
