"use client";
import { useEffect } from "react";

/**
 * The owner's rule (2026-11-19): on the homepage the hero and every section are one screen each, with all their content visible at once,
 * on any device, and they adjust when the window changes size. CSS makes each one at least a screen tall (`.site.home`, `100svh`); this
 * shrinks what's inside a part that would be taller than the screen with CSS `zoom`, so it fits exactly. Rows of cards still glide
 * sideways and long writing still scrolls inside its card, so nothing is cut. SideRow and TicketRider measure with offset sizes, which
 * `zoom` leaves in their own coordinates, so their motion is unchanged.
 *
 * It measures only on load, once fonts and pictures are in, and when the window really changes size (a phone's address bar sliding
 * away changes neither the width nor `svh`), never while scrolling. Reads are batched before writes, so it's one layout each time.
 */
const MIN_ZOOM = 0.5;

/**
 * Fits the hero and each homepage section inside `root` to its own `min-height` (a screen; the hero's includes the sheets' overlap).
 * The dashboard's hero preview calls it too, so the preview shrinks the same way for the screen it stands for.
 */
export function fitParts(root: ParentNode) {
  const parts: { box: HTMLElement; inner: HTMLElement[] }[] = [];
  const hero = root.querySelector<HTMLElement>("#hero");
  if (hero) parts.push({ box: hero, inner: Array.from(hero.querySelectorAll<HTMLElement>(".hero-inner")) });
  root.querySelectorAll<HTMLElement>(".site.home section.chap").forEach((box) => {
    const inner = box.querySelector<HTMLElement>(":scope > .chap-inner");
    if (inner) parts.push({ box, inner: [inner] });
  });
  // reset, then read everything, then write everything
  for (const p of parts) for (const el of p.inner) { el.style.zoom = ""; el.style.removeProperty("--fz"); }
  const plan = parts.map(({ box, inner }) => {
    const shown = inner.filter((el) => el.offsetHeight > 0);
    const screen = parseFloat(getComputedStyle(box).minHeight) || window.innerHeight;
    const tall = box.offsetHeight, content = shown.reduce((n, el) => n + el.offsetHeight, 0);
    if (!content || tall <= screen + 1) return { shown, z: 1 };
    return { shown, z: Math.max(MIN_ZOOM, Math.min(1, (screen - (tall - content)) / content)) };
  });
  // --fz tells what's inside how much it was shrunk, so rows that run the screen's full width can make up for it (`.side`)
  plan.forEach(({ shown, z }) => { if (z < 0.999) for (const el of shown) { const v = String(Math.floor(z * 1000) / 1000); el.style.zoom = v; el.style.setProperty("--fz", v); } });
}

export default function FitScreens() {
  useEffect(() => {
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;top:0;left:0;width:1px;height:100svh;visibility:hidden;pointer-events:none";
    document.body.appendChild(probe);
    let lastW = 0, lastH = 0, timer = 0, raf = 0;

    const fit = () => {
      lastW = window.innerWidth; lastH = probe.offsetHeight || window.innerHeight;
      fitParts(document);
    };
    const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); };
    const onResize = () => {
      const h = probe.offsetHeight || window.innerHeight;
      if (window.innerWidth === lastW && Math.abs(h - lastH) < 2) return;
      clearTimeout(timer);
      timer = window.setTimeout(later, 150);
    };

    later();
    document.fonts?.ready.then(later).catch(() => {});
    window.addEventListener("load", later);
    window.addEventListener("resize", onResize);
    window.addEventListener("lc-fit", later); // anything that changes a part's height for good can ask again
    const again = window.setTimeout(later, 2500); // rows add their counter and arrows a little after start
    return () => {
      clearTimeout(timer); clearTimeout(again); cancelAnimationFrame(raf);
      window.removeEventListener("load", later); window.removeEventListener("resize", onResize); window.removeEventListener("lc-fit", later);
      probe.remove();
    };
  }, []);
  return null;
}
