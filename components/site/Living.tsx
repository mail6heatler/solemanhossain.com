"use client";
import { useEffect } from "react";
import { prefersReducedMotion } from "./fx";
import { startHoverFx, type HoverFxFlags } from "./hoverFx";
import type { ScrollFxFlags } from "./scrollFx";

/**
 * Starts the newer layer of motion once the page is on screen: hover effects straight away, then the scroll
 * effects, whose code (GSAP) is downloaded separately so it never slows the first page load. If that download
 * fails the site stays complete, because every animated thing is visible by default.
 */
export default function Living({ fx }: { fx: HoverFxFlags & ScrollFxFlags }) {
  const key = JSON.stringify(fx);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const flags = JSON.parse(key) as HoverFxFlags & ScrollFxFlags;
    const stopHover = startHoverFx(flags);
    let dead = document.documentElement.classList.contains("lite"), stopScroll: (() => void) | undefined;
    // the lighter version drops the scroll-linked effects; everything they animate is visible by default
    const toLite = () => { dead = true; stopScroll?.(); stopScroll = undefined; };
    window.addEventListener("lc-lite", toLite);
    if (!dead) import("./scrollFx").then(({ startScrollFx }) => { if (!dead) stopScroll = startScrollFx(flags); }).catch(() => {});
    return () => { dead = true; window.removeEventListener("lc-lite", toLite); stopHover(); stopScroll?.(); };
  }, [key]);
  return null;
}
