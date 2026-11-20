"use client";
import { useEffect, useRef } from "react";
import type { MascotView } from "@/lib/mascot";

/**
 * Where Mini Shourobh lives: a fixed layer over the page (app/mascot.css). React draws it empty; the show
 * (mascotEngine.ts and GSAP, downloaded separately once the page is idle) fills it after start-up, so nothing is
 * added inside `.site` before React has started, and the first load stays as light as before.
 */
export default function Mascot({ view }: { view: MascotView }) {
  const ref = useRef<HTMLDivElement>(null);
  const key = JSON.stringify(view);
  useEffect(() => {
    const layer = ref.current;
    if (!layer) return;
    const v = JSON.parse(key) as MascotView;
    let stop: (() => void) | undefined, dead = false;
    const go = () => Promise.all([import("gsap"), import("./mascotEngine")])
      .then(([g, e]) => { if (!dead) stop = e.startMascot(layer, v, g.gsap).stop; })
      .catch(() => {});
    const t = window.setTimeout(() => ("requestIdleCallback" in window ? window.requestIdleCallback(() => void go(), { timeout: 2500 }) : void go()), 1500);
    return () => { dead = true; clearTimeout(t); stop?.(); };
  }, [key]);
  return <div ref={ref} className="mz-layer" />;
}
