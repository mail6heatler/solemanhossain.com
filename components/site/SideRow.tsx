"use client";
import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./fx";

export type RowFx = { auto: boolean; count: boolean; marks?: boolean };

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

const CARD_EVERY_MS = 8000; // how long the row takes to pass one card when it glides by itself
const FIRST_LOOK_MS = 1200; // a row waits this long the first time it comes on screen
const AT_END_MS = 1600; // the pause at each end before it turns back
const AFTER_MOUSE_MS = 1500; // how soon it carries on after the mouse leaves
const AFTER_FINGER_MS = 4000; // and after a finger, a wheel on a card or a sideways swipe: someone may be reading
const PICTURES_AHEAD = 1; // how many screens' worth of cards past the edge already have their pictures

/**
 * Rows add a little page height once they start (their counter and arrows), and late pictures add more, which would strand
 * a direct link (/#made) and the browser's Back or reload: the browser has already scrolled by then. So while the page is
 * still growing, the place is put right again, for a few seconds or until the visitor starts moving around.
 */
let placing = false;
function keepPlace() {
  if (placing) return;
  placing = true;
  window.addEventListener("pagehide", () => { try { sessionStorage.setItem(`lc_y:${location.pathname}`, String(Math.round(scrollY))); } catch {} });
  const kind = (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type;
  let saved = NaN;
  if (kind === "back_forward" || kind === "reload") { try { saved = Number(sessionStorage.getItem(`lc_y:${location.pathname}`) ?? NaN); } catch {} }
  const anchor = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  if (Number.isNaN(saved) && !anchor) return;
  let timer = 0;
  const put = () => {
    const y = !Number.isNaN(saved) ? saved : anchor ? anchor.getBoundingClientRect().top + scrollY : NaN;
    if (!Number.isNaN(y) && Math.abs(scrollY - y) > 2) window.scrollTo({ top: y, behavior: "instant" });
  };
  const ro = new ResizeObserver(() => { clearTimeout(timer); timer = window.setTimeout(put, 80); });
  const inputs = ["wheel", "touchstart", "keydown", "pointerdown"];
  const stop = () => {
    ro.disconnect();
    clearTimeout(timer);
    checks.forEach(clearTimeout);
    inputs.forEach((ev) => window.removeEventListener(ev, stop));
  };
  ro.observe(document.body);
  // the page can also settle without changing its total height
  const checks = [300, 800, 1500, 2500, 3500].map((ms) => window.setTimeout(put, ms));
  inputs.forEach((ev) => window.addEventListener(ev, stop, { once: true, passive: true }));
  setTimeout(stop, 4000);
}

/**
 * A row of cards that never wraps. If they all fit, nothing moves. If they don't, it glides by itself while it's on screen,
 * and turns back at each end. Arrows send it either way at once, and it keeps going that way. The mouse wheel only ever
 * moves the page. It waits while the mouse moves over it, a finger is on it, or the page is scrolling, and it never runs
 * with reduced motion or on a slow device: there the arrows move one card at a time.
 * Without JavaScript it stays a plain row with its own scrollbar.
 *
 * Two ways of moving (`byHand`). Computers use `transform` on the track: a slow glide needs fractions of a pixel, and the
 * browser's own scrolling snaps to whole ones on most laptop screens, which shows as a shiver. Anything with a touch screen
 * uses the browser's scrolling, because only that follows a finger properly. Either way the exact position is kept in `pos`
 * and never read back during a glide, and the loop sleeps whenever nothing moves.
 */
export default function SideRow({ className, fx, children }: { className: string; fx: RowFx; children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLElement>(null);
  const now = useRef<HTMLElement>(null);
  const total = useRef<HTMLElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const on = useRef<HTMLButtonElement>(null);
  const press = useRef<(d: 1 | -1) => void>(() => {});
  const { auto, count, marks = false } = fx;

  useEffect(() => {
    const o = outer.current, t = track.current;
    if (!o || !t) return;
    const root = document.documentElement;
    const still = prefersReducedMotion();
    const touchy = window.matchMedia("(any-pointer: coarse)");
    let light = root.classList.contains("lite");
    let mode: "fit" | "slide" = "fit";
    let byHand = false;
    let over = 0, half = 1, lastW = 0;
    let pos = 0, burst = 0, speed = 0.04, velocity = 0;
    let dir: 1 | -1 = 1;
    let raf = 0, nap = 0, lastT = 0;
    let onScreen = false, firstLook = true, hover = false, touching = false, focused = false;
    let hold = 0, overlay = false, overlayAt = 0;
    let shown = -1, barAt = -1, arrowsAt = "";
    let cards: { el: HTMLElement; left: number; right: number; mid: number; on: boolean }[] = [];
    let closeBy = false, nextPicture = 0;
    let stops: number[] = [];
    let here: HTMLElement | null = null;

    // Back or a reload returns to the card the visitor left from
    const key = `lc_row:${location.pathname}:${Array.from(document.querySelectorAll(".side")).indexOf(o)}`;
    const kind = (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type;
    let restore = NaN;
    if (kind === "back_forward" || kind === "reload") { try { restore = Number(sessionStorage.getItem(key) ?? NaN); } catch {} }
    const remember = () => { try { sessionStorage.setItem(key, String(Math.round(pos))); } catch {} };

    // `marks`: each card gets "passed" once it has reached the middle of the screen, and the latest one "here"
    const mark = (shift: number, atEnd: boolean) => {
      let latest: HTMLElement | null = null;
      for (const c of cards) {
        const lit = atEnd || c.mid + shift - half < half * 0.15;
        if (lit !== c.on) { c.on = lit; c.el.classList.toggle("passed", lit); }
        if (lit) latest = c.el;
      }
      if (latest !== here) { here?.classList.remove("here"); latest?.classList.add("here"); here = latest; }
    };

    const write = () => {
      if (mode === "fit") { t.style.transform = ""; return; }
      if (byHand) t.style.transform = `translateX(${(-pos).toFixed(2)}px)`;
      else t.scrollLeft = pos;
    };

    // The browser's lazy loading only looks up and down the page, so on its own a picture starts loading as its card
    // comes onto the screen. Once the row is close by, the next cards' pictures start early, a few at a time.
    const loadAhead = () => {
      while (closeBy && nextPicture < cards.length && cards[nextPicture].left - pos < half * 2 * (1 + PICTURES_AHEAD)) {
        cards[nextPicture++].el.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((i) => { i.loading = "eager"; });
      }
    };

    const show = () => {
      loadAhead();
      const p = over > 0 ? clamp(pos / over, 0, 1) : 0;
      if (marks) mark(-pos, light || p > 0.995);
      if (bar.current && p !== barAt) { barAt = p; bar.current.style.transform = `scaleX(${p.toFixed(4)})`; }
      if (now.current && cards.length) {
        const i = Math.round(p * (cards.length - 1));
        if (i !== shown) {
          const first = shown < 0;
          shown = i;
          now.current.textContent = String(i + 1);
          if (!light && !still && !first) now.current.animate?.([{ translate: "0 35%", opacity: 0 }, { translate: "0 0", opacity: 1 }], { duration: 240, easing: "cubic-bezier(.2,.8,.2,1)" });
        }
      }
      // the arrow it's travelling towards is lit, and the one it can't go any further towards is dimmed
      const going = auto && !light && !still ? dir : 0, atStart = pos <= 1, atEnd = pos >= over - 1;
      const state = `${going}${atStart}${atEnd}`;
      if (state !== arrowsAt) {
        arrowsAt = state;
        back.current?.classList.toggle("on", going < 0);
        on.current?.classList.toggle("on", going > 0);
        back.current?.classList.toggle("off", atStart);
        on.current?.classList.toggle("off", atEnd);
      }
    };

    /** 0 if it's free to glide now, otherwise how long until that's worth checking again. Infinity: an event will wake it. */
    const waitFor = (time: number) => {
      if (!auto || light || still || !onScreen || hover || touching || focused) return Infinity;
      if (time < hold) return hold - time;
      if (root.classList.contains("scrolling")) return 200;
      if (time - overlayAt > 400) { overlayAt = time; overlay = !!document.querySelector(".lb, dialog[open]"); }
      return overlay ? 400 : 0;
    };

    const frame = (time: number) => {
      raf = 0;
      if (mode !== "slide") return;
      const dt = clamp(time - lastT, 1, 100); // real time, so slow devices don't get slow motion
      lastT = time;
      const want = waitFor(time) === 0 ? dir * speed : 0;
      velocity += (want - velocity) * (1 - Math.exp(-dt / 260));
      if (!want && Math.abs(velocity) < 0.001) velocity = 0;
      let step = velocity * dt;
      if (burst) { // an arrow's push on top of the glide, which starts quickly and settles on the next card
        const m = Math.abs(burst) < 0.5 ? burst : burst * (1 - Math.exp(-dt / 130));
        burst -= m;
        step += m;
      }
      if (step) {
        pos = clamp(pos + step, 0, over);
        write();
      }
      if ((pos <= 0 && dir < 0) || (pos >= over && dir > 0)) { // reached the end: wait, then turn back
        burst = 0;
        velocity = 0;
        dir = dir > 0 ? -1 : 1;
        hold = Math.max(hold, time + AT_END_MS);
      }
      show();
      if (burst || velocity) { kick(); return; }
      if (byHand && pos !== Math.round(pos)) { pos = Math.round(pos); write(); } // at rest on a whole pixel, so text stays sharp
      const wait = waitFor(time);
      if (wait === 0) kick();
      else if (wait !== Infinity) nap = window.setTimeout(kick, wait);
    };
    const kick = () => {
      clearTimeout(nap);
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const waitAtLeast = (ms: number) => { hold = Math.max(hold, performance.now() + ms); };

    const measure = () => {
      const kids = Array.from(t.children) as HTMLElement[];
      const last = kids[kids.length - 1];
      if (!last) return;
      const hand = !still && !touchy.matches;
      if (hand !== byHand) {
        byHand = hand;
        if (hand) t.scrollLeft = 0; else t.style.transform = "";
      }
      o.dataset.drive = byHand ? "hand" : "browser";
      const css = getComputedStyle(t);
      const padL = parseFloat(css.paddingLeft) || 0;
      const end = last.offsetLeft + last.offsetWidth + (parseFloat(css.paddingRight) || 0);
      half = t.clientWidth / 2;
      lastW = window.innerWidth;
      over = Math.max(0, end - t.clientWidth);
      mode = over > 40 ? "slide" : "fit";
      o.dataset.mode = mode;
      cards = kids.map((el) => ({ el, left: el.offsetLeft, right: el.offsetLeft + el.offsetWidth, mid: el.offsetLeft + el.offsetWidth / 2, on: el.classList.contains("passed") }));
      stops = kids.map((el) => clamp(el.offsetLeft - padL, 0, over));
      if (kids.length > 1) speed = clamp((kids[kids.length - 1].offsetLeft - kids[0].offsetLeft) / (kids.length - 1) / CARD_EVERY_MS, 0.025, 0.07);
      if (marks && mode === "fit") mark(0, true); // everything is in view, so the whole trail is lit
      if (total.current) total.current.textContent = `/ ${kids.length}`;
      shown = barAt = -1;
      arrowsAt = "";
      burst = 0;
      if (!Number.isNaN(restore)) { pos = restore; restore = NaN; waitAtLeast(FIRST_LOOK_MS * 2); }
      pos = mode === "slide" ? clamp(pos, 0, over) : 0;
      if (dir > 0 && pos >= over) dir = -1;
      write();
      show();
      keepPlace();
      kick();
    };

    // an arrow: off that way at once, onto the next card, and carrying on that way
    press.current = (d) => {
      if (mode !== "slide") return;
      dir = d;
      hold = 0;
      const from = pos + burst;
      const to = d > 0 ? stops.find((x) => x > from + 8) ?? over : [...stops].reverse().find((x) => x < from - 8) ?? 0;
      if (still) { pos = to; write(); show(); return; }
      burst = to - pos;
      kick();
    };

    // the mouse pauses the row only by really moving over it: a mouse left resting on a row the page brought under it doesn't count
    const mouseMoved = (e: PointerEvent) => {
      if (hover || e.pointerType !== "mouse" || (!e.movementX && !e.movementY)) return;
      hover = true;
      kick();
    };
    const mouseLeft = (e: PointerEvent) => {
      if (!hover || e.pointerType !== "mouse") return;
      hover = false;
      waitAtLeast(AFTER_MOUSE_MS);
      kick();
    };
    const fingerDown = () => { touching = true; velocity = 0; burst = 0; };
    const fingerUp = () => { touching = false; waitAtLeast(AFTER_FINGER_MS); kick(); };
    // the browser's scrolling moved it, not this script: a finger, its momentum, a scrollbar or keyboard focus
    const scrolled = () => {
      if (byHand || velocity || burst) return;
      const x = t.scrollLeft;
      if (Math.abs(x - pos) <= 2) return;
      dir = x > pos ? 1 : -1;
      pos = x;
      waitAtLeast(AFTER_FINGER_MS);
      kick();
    };
    // the plain wheel is the page's. It only makes the row wait, in case it's scrolling a long card's text.
    // A sideways trackpad swipe does move a computer's row, as the browser would for a row it scrolls itself.
    const wheel = (e: WheelEvent) => {
      waitAtLeast(AFTER_FINGER_MS);
      if (!byHand || mode !== "slide" || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      dir = e.deltaX > 0 ? 1 : -1;
      velocity = 0;
      burst = 0;
      pos = clamp(pos + e.deltaX, 0, over);
      write();
      kick();
    };
    // keyboard focus waits on the row, and on a computer's row brings its card into view
    const focusIn = (e: FocusEvent) => {
      if (!(e.target as Element).matches?.(":focus-visible")) return;
      focused = true;
      const c = cards.find((x) => x.el.contains(e.target as Node));
      if (!byHand || !c || (c.left - pos >= 0 && c.right - pos <= half * 2)) { kick(); return; }
      burst = stops[cards.indexOf(c)] - pos;
      kick();
    };
    const focusOut = () => { if (focused) { focused = false; waitAtLeast(AFTER_FINGER_MS); kick(); } };
    const toLite = () => { light = true; kick(); };
    // returning with Back from the browser's memory of this page: stay on the card long enough to see it
    const returned = (e: PageTransitionEvent) => { if (e.persisted) waitAtLeast(FIRST_LOOK_MS * 2); };
    // the page moving under a resting mouse ends its pause
    const pageMoved = () => { if (hover) { hover = false; waitAtLeast(AFTER_MOUSE_MS); } };

    // a computer's row is kept as a ready-made picture only while it's near the screen, so text isn't redrawn as it moves
    const near = new IntersectionObserver(([e]) => o.classList.toggle("live", e.isIntersecting), { rootMargin: "20% 0px" });
    if (!still && !touchy.matches) near.observe(o);
    const soon = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      soon.disconnect();
      closeBy = true;
      loadAhead();
    }, { rootMargin: "0px 0px 50% 0px" }); // starting a whole screen away, in both directions, made phones stutter while scrolling
    soon.observe(o);
    const inView = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (!onScreen) return;
      waitAtLeast(firstLook ? FIRST_LOOK_MS : 500);
      firstLook = false;
      lastT = performance.now();
      kick();
    }, { rootMargin: "-12% 0px" });
    inView.observe(o); // not the track: it moves, and travels off the side of the screen

    measure();
    document.fonts?.ready.then(measure).catch(() => {});

    t.addEventListener("pointermove", mouseMoved, { passive: true });
    t.addEventListener("pointerleave", mouseLeft, { passive: true });
    t.addEventListener("touchstart", fingerDown, { passive: true });
    t.addEventListener("touchend", fingerUp, { passive: true });
    t.addEventListener("touchcancel", fingerUp, { passive: true });
    t.addEventListener("scroll", scrolled, { passive: true });
    // on the way in: a long card's own wheel handling stops it going any further
    t.addEventListener("wheel", wheel, { passive: false, capture: true });
    t.addEventListener("focusin", focusIn);
    t.addEventListener("focusout", focusOut);
    // a phone's address bar sliding away is not a real resize
    const resized = () => { if (window.innerWidth !== lastW) measure(); };
    window.addEventListener("resize", resized);
    window.addEventListener("scroll", pageMoved, { passive: true });
    window.addEventListener("lc-lite", toLite);
    window.addEventListener("pagehide", remember);
    window.addEventListener("pageshow", returned);
    touchy.addEventListener("change", measure);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(nap);
      near.disconnect();
      soon.disconnect();
      inView.disconnect();
      press.current = () => {};
      t.removeEventListener("pointermove", mouseMoved);
      t.removeEventListener("pointerleave", mouseLeft);
      t.removeEventListener("touchstart", fingerDown);
      t.removeEventListener("touchend", fingerUp);
      t.removeEventListener("touchcancel", fingerUp);
      t.removeEventListener("scroll", scrolled);
      t.removeEventListener("wheel", wheel, { capture: true });
      t.removeEventListener("focusin", focusIn);
      t.removeEventListener("focusout", focusOut);
      window.removeEventListener("resize", resized);
      window.removeEventListener("scroll", pageMoved);
      window.removeEventListener("lc-lite", toLite);
      window.removeEventListener("pagehide", remember);
      window.removeEventListener("pageshow", returned);
      touchy.removeEventListener("change", measure);
      t.style.transform = "";
      o.classList.remove("live");
      delete o.dataset.mode;
      delete o.dataset.drive;
    };
  }, [auto, marks]);

  return (
    <div ref={outer} className="side">
      <div className="side-stage reveal r3">
        <div className="side-top">
          {count && <div className="side-count" aria-hidden><b ref={now} /><span ref={total} /></div>}
          <div className="side-arrows">
            <button ref={back} type="button" className="side-arrow" aria-label="Slide the cards back" onClick={() => press.current(-1)}><i className="ti ti-arrow-left" aria-hidden /></button>
            <button ref={on} type="button" className="side-arrow" aria-label="Slide the cards forward" onClick={() => press.current(1)}><i className="ti ti-arrow-right" aria-hidden /></button>
          </div>
        </div>
        <div ref={track} className={`side-track ${className}`}>{children}</div>
        <div className="side-bar" aria-hidden><i ref={bar} /></div>
      </div>
    </div>
  );
}
