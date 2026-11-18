"use client";
import { useEffect, useRef } from "react";
import type { MascotView } from "@/lib/mascot";
import { prefersReducedMotion } from "./fx";

/**
 * Where the mascot lives. React only draws this empty box; the show (mascotEngine.ts, downloaded separately once
 * the page is idle) fills it after start-up, so nothing is added inside `.site` before React has started.
 * Not with reduced motion, and not on phones if the owner turned that off.
 */
export default function Mascot({ view }: { view: MascotView }) {
  const ref = useRef<HTMLDivElement>(null);
  const key = JSON.stringify(view);
  useEffect(() => {
    const host = ref.current;
    if (!host || prefersReducedMotion()) return;
    const v = JSON.parse(key) as MascotView;
    if (!v.phones && window.innerWidth < 700) return;
    let stop: (() => void) | undefined, dead = false;
    const go = () => import("./mascotEngine").then(({ startMascot }) => { if (!dead) stop = startMascot(host, v); }).catch(() => {});
    const idle = (window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const t = window.setTimeout(() => (idle ? idle(go, { timeout: 2500 }) : go()), 1800);
    return () => { dead = true; clearTimeout(t); stop?.(); };
  }, [key]);
  return <div ref={ref} className="masc-host" />;
}
