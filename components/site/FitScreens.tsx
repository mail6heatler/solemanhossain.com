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
/** how much more than its cards a section's heading may shrink (a section with more around its row: a dock, a rail, a longer subtitle) */
const HEAD_MIN = 0.75;

type Plan = { box: HTMLElement; shown: HTMLElement[]; screen: number; head: number; z: number; k: number };
const v3 = (n: number) => String(Math.floor(n * 1000) / 1000);

/**
 * Every section's cards are one size and shrunk alike (the owner's rule, 2026-11-28: React, Comment, Share and Open read the same in every
 * section). So the sections with a row of cards share one zoom for the row (`z`): the largest that lets each of them fit its screen when its
 * heading (eyebrow and title) may shrink by up to HEAD_MIN more. A section that needs it gets `k` < 1: its `.chap-inner` is zoomed by z·k
 * (everything, the heading's line boxes included, so the sum is exact) and the row and anything else under the heading is zoomed back up
 * by 1/k, which lands it on z. `--fz` is always the zoom where it's read: z·k on `.chap-inner`, z on the row (`.side` reaches the screen's
 * edges with it, and `--gz` is worked out again there).
 */
function put(q: Plan) {
  for (const el of q.shown) {
    if (q.k < 0.999) {
      // the row's --fz is the product of the two zooms as written, or rounding leaves it a pixel or two short of the screen's edge
      const outer = v3(q.z * q.k), back = v3(1 / q.k), row = String(Number(outer) * Number(back));
      el.style.zoom = outer; el.style.setProperty("--fz", outer);
      for (const c of Array.from(el.children) as HTMLElement[]) if (!c.matches(".eyebrow, .chap-head")) {
        c.dataset.fzk = ""; c.style.zoom = back; c.style.setProperty("--fz", row);
      }
    } else if (q.z < 0.999) { el.style.zoom = v3(q.z); el.style.setProperty("--fz", v3(q.z)); }
  }
}
function unput(el: HTMLElement) {
  el.style.zoom = ""; el.style.removeProperty("--fz");
  el.querySelectorAll<HTMLElement>(":scope > [data-fzk]").forEach((c) => { c.style.zoom = ""; c.style.removeProperty("--fz"); delete c.dataset.fzk; });
}

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
  // reset, then read everything, then write everything. Sections far away are normally not laid out (transitions.css): here they must be
  const html = document.documentElement;
  html.classList.add("fitting");
  for (const p of parts) for (const el of p.inner) unput(el);
  const rows: { q: Plan; room: number; content: number }[] = [];
  const plan = parts.map(({ box, inner }): Plan => {
    const shown = inner.filter((el) => el.offsetHeight > 0);
    const screen = parseFloat(getComputedStyle(box).minHeight) || window.innerHeight;
    const tall = box.offsetHeight, content = shown.reduce((n, el) => n + el.offsetHeight, 0), room = screen - (tall - content);
    const z = !content || tall <= screen + 1 ? 1 : Math.max(MIN_ZOOM, Math.min(1, room / content));
    // a section with a row of cards: how tall its heading is (down to the row's own margin, which is zoomed with the row)
    const el = shown.length === 1 && box.matches("section.chap") ? shown[0] : null, side = el?.querySelector<HTMLElement>(":scope > .side");
    const head = el && side ? side.getBoundingClientRect().top - el.getBoundingClientRect().top - (parseFloat(getComputedStyle(side).marginTop) || 0) : 0;
    const q = { box, shown, screen, head, z, k: 1 };
    if (head > 0 && content > head) rows.push({ q, room, content });
    return q;
  });
  if (rows.length) {
    let z = 1;
    for (const { room, content, q } of rows) if (content > room + 1) z = Math.min(z, room / (content - q.head + HEAD_MIN * q.head));
    z = Math.max(MIN_ZOOM, z);
    for (const { room, content, q } of rows) { q.z = z; q.k = Math.max(HEAD_MIN, Math.min(1, (room / z - (content - q.head)) / q.head)); }
  }
  plan.forEach(put);
  // a section still a pixel or two over (rounding, a margin that collapsed) takes it off its heading
  for (let pass = 0; pass < 2; pass++) for (const { q } of rows) {
    const over = q.box.offsetHeight - q.screen; if (over <= 0.5) continue;
    q.k = Math.max(MIN_ZOOM, q.k - (over + 1) / (q.z * q.head)); for (const el of q.shown) unput(el); put(q);
  }
  html.classList.remove("fitting");
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
