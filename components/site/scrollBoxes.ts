/**
 * Cards with more text than fits scroll inside themselves (`.scrolly`). This adds what CSS can't:
 * - the "Scroll for more" hint: it says so and keeps moving, on cards on screen, whenever a card is at its top;
 * - a line on the card's edge showing how far through it the visitor is;
 * - the mouse wheel moves the card's text first, then the page carries on. It's done by hand because smooth scrolling
 *   would otherwise take the wheel;
 * - a wheel already moving the page keeps moving the page, so a row sliding past the mouse doesn't catch on every long card.
 * Only cards that really overflow get a wheel listener, so ordinary scrolling elsewhere stays off the main thread.
 * Touch needs none of this: a finger scrolls the card natively, then the page.
 */
const KEEP_PAGE_MS = 320;

export function startScrollBoxes(): () => void {
  const boxes = Array.from(document.querySelectorAll<HTMLElement>(".scrolly"));
  if (!boxes.length) return () => {};
  const long = new Set<HTMLElement>();
  // card -> where its text is heading and exactly where it is now. The browser rounds scrollTop, so reading it back
  // would stall the glide just short of the end on fast screens, where each frame's step is under a pixel.
  const gliding = new Map<HTMLElement, { to: number; at: number }>();
  let pageWheelAt = -1e9, raf = 0, lastT = 0;

  const glide = (t: number) => {
    raf = 0;
    const dt = Math.min(t - lastT, 100);
    lastT = t;
    const k = 1 - Math.exp(-dt / 70); // real time, so slow devices don't get slow motion
    for (const [b, g] of gliding) {
      g.at += (g.to - g.at) * k;
      if (Math.abs(g.to - g.at) < 0.5) { b.scrollTop = g.to; gliding.delete(b); } else b.scrollTop = g.at;
    }
    if (gliding.size) raf = requestAnimationFrame(glide);
  };

  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey) return;
    const b = e.currentTarget as HTMLElement;
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? b.clientHeight : 1);
    const glide_ = gliding.get(b);
    const from = glide_?.to ?? b.scrollTop;
    const to = Math.max(0, Math.min(b.scrollHeight - b.clientHeight, from + delta));
    const canMove = Math.abs(to - from) >= 1;
    const pageIsMoving = e.timeStamp - pageWheelAt < KEEP_PAGE_MS;
    if (canMove && !pageIsMoving && Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
      e.preventDefault();
      e.stopPropagation(); // smooth scrolling listens further up
      if (!gliding.size) { lastT = performance.now(); if (!raf) raf = requestAnimationFrame(glide); }
      gliding.set(b, { to, at: glide_?.at ?? b.scrollTop });
      return;
    }
    // without smooth scrolling the browser itself would hand this wheel to the card
    if (canMove && pageIsMoving && !(window as unknown as { __lenis?: unknown }).__lenis) {
      e.preventDefault();
      window.scrollBy(0, delta);
    }
  };
  const noteWheel = (e: WheelEvent) => { if (!e.ctrlKey) pageWheelAt = e.timeStamp; };

  // only cards on screen keep their hint moving
  const onScreen = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("in-view", e.isIntersecting)));
  const sync = (b: HTMLElement) => {
    const hidden = b.scrollHeight - b.clientHeight;
    const isLong = hidden > 1;
    b.classList.toggle("more", isLong && b.scrollTop + b.clientHeight < b.scrollHeight - 6);
    b.classList.toggle("nudge", hidden > 6 && b.scrollTop < 10);
    const line = b.parentElement?.querySelector<HTMLElement>(".scroll-line b");
    if (line && isLong) line.style.transform = `scaleY(${Math.min(1, (b.scrollTop + b.clientHeight) / b.scrollHeight).toFixed(3)})`;
    if (isLong === long.has(b)) return;
    b.classList.toggle("long", isLong);
    if (isLong) {
      long.add(b);
      b.tabIndex = 0; // keyboard users can scroll it too
      b.addEventListener("wheel", onWheel, { passive: false });
      onScreen.observe(b);
    } else {
      long.delete(b);
      b.removeAttribute("tabindex");
      b.removeEventListener("wheel", onWheel);
      onScreen.unobserve(b);
    }
  };
  const onScroll = (e: Event) => { const b = e.target as HTMLElement; if (b.classList?.contains("scrolly")) sync(b); };

  // photos finishing and fonts arriving change how much fits
  const ro = new ResizeObserver((es) => es.forEach((en) => sync((en.target.closest(".scrolly") ?? en.target) as HTMLElement)));
  boxes.forEach((b) => { ro.observe(b); if (b.firstElementChild) ro.observe(b.firstElementChild); });
  document.addEventListener("scroll", onScroll, { passive: true, capture: true });
  document.addEventListener("wheel", noteWheel, { passive: true });

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    onScreen.disconnect();
    document.removeEventListener("scroll", onScroll, { capture: true });
    document.removeEventListener("wheel", noteWheel);
    long.forEach((b) => { b.removeEventListener("wheel", onWheel); b.removeAttribute("tabindex"); });
    boxes.forEach((b) => b.classList.remove("more", "long", "nudge", "in-view"));
  };
}
