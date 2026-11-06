/**
 * Cards with more text than fits scroll inside themselves (`.scrolly`). This adds what CSS can't:
 * - the "more below" hint, shown only while there is more;
 * - the mouse wheel moves the card's text first, then the page carries on. It's done by hand because inside a 3D row
 *   the browser hands the wheel to the page, and smooth scrolling would otherwise take it anyway;
 * - a wheel already moving the page keeps moving the page, so a row sliding past the mouse doesn't catch on every long card.
 * Only cards that really overflow get a wheel listener, so ordinary scrolling elsewhere stays off the main thread.
 * Touch needs none of this: a finger scrolls the card natively, then the page.
 */
const KEEP_PAGE_MS = 320;

export function startScrollBoxes(): () => void {
  const boxes = Array.from(document.querySelectorAll<HTMLElement>(".scrolly"));
  if (!boxes.length) return () => {};
  const long = new Set<HTMLElement>();
  const gliding = new Map<HTMLElement, number>(); // card -> where its text is heading
  let pageWheelAt = -1e9, raf = 0, lastT = 0;

  const glide = (t: number) => {
    raf = 0;
    const dt = Math.min(t - lastT, 100);
    lastT = t;
    const k = 1 - Math.exp(-dt / 70); // real time, so slow devices don't get slow motion
    for (const [b, to] of gliding) {
      const next = b.scrollTop + (to - b.scrollTop) * k;
      if (Math.abs(to - next) < 1) { b.scrollTop = to; gliding.delete(b); } else b.scrollTop = next;
    }
    if (gliding.size) raf = requestAnimationFrame(glide);
  };

  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey) return;
    const b = e.currentTarget as HTMLElement;
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? b.clientHeight : 1);
    const from = gliding.get(b) ?? b.scrollTop;
    const to = Math.max(0, Math.min(b.scrollHeight - b.clientHeight, from + delta));
    const canMove = Math.abs(to - from) >= 1;
    const pageIsMoving = e.timeStamp - pageWheelAt < KEEP_PAGE_MS;
    if (canMove && !pageIsMoving && Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
      e.preventDefault();
      e.stopPropagation(); // smooth scrolling listens further up
      if (!gliding.size) { lastT = performance.now(); if (!raf) raf = requestAnimationFrame(glide); }
      gliding.set(b, to);
      return;
    }
    // without smooth scrolling the browser itself would hand this wheel to the card
    if (canMove && pageIsMoving && !(window as unknown as { __lenis?: unknown }).__lenis) {
      e.preventDefault();
      window.scrollBy(0, delta);
    }
  };
  const noteWheel = (e: WheelEvent) => { if (!e.ctrlKey) pageWheelAt = e.timeStamp; };

  const sync = (b: HTMLElement) => {
    const isLong = b.scrollHeight - b.clientHeight > 1;
    b.classList.toggle("more", isLong && b.scrollTop + b.clientHeight < b.scrollHeight - 6);
    if (isLong === long.has(b)) return;
    if (isLong) {
      long.add(b);
      b.tabIndex = 0; // keyboard users can scroll it too
      b.addEventListener("wheel", onWheel, { passive: false });
    } else {
      long.delete(b);
      b.removeAttribute("tabindex");
      b.removeEventListener("wheel", onWheel);
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
    document.removeEventListener("scroll", onScroll, { capture: true });
    document.removeEventListener("wheel", noteWheel);
    long.forEach((b) => { b.removeEventListener("wheel", onWheel); b.removeAttribute("tabindex"); });
    boxes.forEach((b) => b.classList.remove("more"));
  };
}
