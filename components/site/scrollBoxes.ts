/**
 * Cards with more text than fits scroll inside themselves (`.scrolly`). This adds what CSS can't:
 * - the "Scroll for more" hint: it says so and keeps moving, on cards on screen, whenever a card is at its top;
 * - a line on the card's edge showing how far through it the visitor is;
 * The wheel is the browser's: it scrolls the card under the mouse first, and a wheel already moving the page keeps moving the page.
 * The one thing it doesn't do is carry on to the page when a card's text ends in the middle of a spin: it waits for a pause. So if the
 * wheel turns on a card that's at its end and the page didn't move, the page is moved from here. Every listener is passive, so the
 * browser never waits for a script before it scrolls.
 * Touch needs none of this: a finger scrolls the card natively, then the page.
 */
const CARRY_MS = 600; // how long one spin counts as the same one

export function startScrollBoxes(): () => void {
  const boxes = Array.from(document.querySelectorAll<HTMLElement>(".scrolly"));
  if (!boxes.length) return () => {};
  const long = new Set<HTMLElement>();
  let to = 0, until = 0, owed = 0, timer = 0;

  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    const b = e.currentTarget as HTMLElement, down = e.deltaY > 0;
    if (down ? b.scrollTop + b.clientHeight < b.scrollHeight - 1 : b.scrollTop > 0) { until = 0; return; } // its text is still moving
    const d = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
    if (performance.now() < until) { // already carrying this spin on
      to = (down ? Math.max(to, window.scrollY) : Math.min(to, window.scrollY)) + d;
      until = performance.now() + CARRY_MS;
      window.scrollTo({ top: to, behavior: "smooth" });
      return;
    }
    owed += d;
    if (timer) return;
    const was = window.scrollY;
    timer = window.setTimeout(() => requestAnimationFrame(() => {
      timer = 0;
      if (Math.abs(window.scrollY - was) < 1) {
        to = was + owed;
        until = performance.now() + CARRY_MS;
        window.scrollTo({ top: to, behavior: "smooth" });
      }
      owed = 0;
    }), 110);
  };

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
      b.addEventListener("wheel", onWheel, { passive: true });
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

  return () => {
    clearTimeout(timer);
    ro.disconnect();
    onScreen.disconnect();
    document.removeEventListener("scroll", onScroll, { capture: true });
    long.forEach((b) => { b.removeEventListener("wheel", onWheel); b.removeAttribute("tabindex"); });
    boxes.forEach((b) => b.classList.remove("more", "long", "nudge", "in-view"));
  };
}
