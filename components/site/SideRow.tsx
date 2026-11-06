"use client";
import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./fx";

export type RowFx = { pin: boolean; curve: boolean; fly: boolean; lean: boolean; count: boolean };

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const pad = (n: number) => String(n).padStart(2, "0");
type Lenis = { scrollTo(t: number, o?: object): void; targetScroll: number };
const lenis = () => (window as unknown as { __lenis?: Lenis }).__lenis;

/**
 * Rows add page height once they start, which would strand a direct link (/#made) and the browser's Back or reload:
 * the browser has already scrolled by then. So the place is put right after the rows have measured themselves,
 * unless the visitor has started moving around.
 */
let placeUntil = -1, placeTimer = 0;
function keepPlace() {
  if (placeUntil === -1) {
    placeUntil = performance.now() + 2500;
    const stop = () => { placeUntil = 0; };
    ["wheel", "touchstart", "keydown", "pointerdown"].forEach((ev) => window.addEventListener(ev, stop, { once: true, passive: true }));
    window.addEventListener("pagehide", () => { try { sessionStorage.setItem(`lc_y:${location.pathname}`, String(Math.round(scrollY))); } catch {} });
  }
  if (performance.now() > placeUntil) return;
  clearTimeout(placeTimer);
  placeTimer = window.setTimeout(() => {
    const kind = (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type;
    let y = NaN;
    if (kind === "back_forward" || kind === "reload") { try { y = Number(sessionStorage.getItem(`lc_y:${location.pathname}`) ?? NaN); } catch {} }
    if (Number.isNaN(y) && location.hash.length > 1) {
      const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el) y = el.getBoundingClientRect().top + scrollY;
    }
    if (!Number.isNaN(y)) window.scrollTo({ top: y, behavior: "instant" });
  }, 80);
}

/**
 * A row of cards that never wraps. If they don't all fit, on computers the section holds still while scrolling down
 * moves them sideways; on phones (or with `pin` off) the row is swiped. If they fit, nothing moves.
 * Without JavaScript or with reduced motion it stays a plain row with its own scrollbar.
 *
 * Only `transform` on the track and `rotate`/`scale`/`translate`/`opacity` on the cards change per frame. Card positions
 * are measured once, cards past the screen edge aren't written to, and nothing runs while the row is off screen.
 */
export default function SideRow({ className, fx, children }: { className: string; fx: RowFx; children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLElement>(null);
  const now = useRef<HTMLElement>(null);
  const total = useRef<HTMLElement>(null);
  const { pin, curve, fly, lean, count } = fx;

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const o = outer.current, t = track.current;
    if (!o || !t) return;
    const wide = window.matchMedia("(min-width: 761px)");
    let mode: "fit" | "pin" | "swipe" = "fit";
    let over = 0, range = 1, half = 1, seen = true, raf = 0, lastT = 0, lastPos = 0, tilt = 0, shown = -1;
    let light = document.documentElement.classList.contains("lite");
    let cards: { el: HTMLElement; mid: number; d: number }[] = [];

    const pose = (shift: number) => {
      const big = mode === "pin", k = big ? 1 : 0.4;
      for (const c of cards) {
        const d = clamp((c.mid + shift - half) / half, -1.3, 1.3);
        if (Math.abs(d - c.d) < 0.003) continue;
        c.d = d;
        const enter = fly ? clamp((d - 0.6) / 0.6, 0, 1) : 0, leave = fly ? clamp((-d - 0.75) / 0.5, 0, 1) : 0;
        const ry = curve && big ? -d * 17 : 0, rz = (enter * 10 - leave * 5) * k, angle = Math.hypot(ry, rz);
        const s = c.el.style;
        s.rotate = angle < 0.01 ? "" : `0 ${(ry / angle).toFixed(3)} ${(rz / angle).toFixed(3)} ${angle.toFixed(2)}deg`;
        s.translate = fly ? `0 ${((enter * 70 - leave * 20) * k).toFixed(1)}px` : "";
        s.scale = curve ? (1 - Math.abs(d) * (big ? 0.08 : 0.06)).toFixed(3) : "";
        s.opacity = fly && big ? (1 - enter * 0.35 - leave * 0.4).toFixed(3) : "";
      }
    };
    const clearPoses = () => cards.forEach((c) => { c.d = NaN; c.el.style.rotate = c.el.style.scale = c.el.style.translate = c.el.style.opacity = ""; });

    const frame = (time: number) => {
      raf = 0;
      if (!seen || mode === "fit") return;
      const dt = clamp(time - lastT, 1, 100);
      lastT = time;
      const top = o.getBoundingClientRect().top;
      const pos = mode === "pin" ? clamp(-top / range, 0, 1) * over : t.scrollLeft;
      const p = over > 0 ? pos / over : 0;
      const speed = (pos - lastPos) / dt;
      lastPos = pos;

      // the row sweeps in from the side while its section rises into view
      // (a pinned row finishes as it pins; a swiped row never reaches the top of the screen, so it finishes well before)
      const risen = mode === "pin" ? top / window.innerHeight : (top / window.innerHeight - 0.55) / 0.45;
      const sweep = fly && !light ? Math.pow(clamp(risen, 0, 1), 1.4) * half * 0.9 : 0;
      // the row leans with scroll speed and springs back (on real time, so slow devices don't get slow motion)
      if (lean && !light) {
        const want = clamp(speed * 2.2, -6, 6);
        tilt += (want - tilt) * (1 - Math.exp(-dt / 90));
        if (want === 0 && Math.abs(tilt) < 0.03) tilt = 0;
      } else tilt = 0;
      const leaning = tilt ? `skewX(${(-tilt).toFixed(2)}deg) scaleX(${(1 + Math.abs(tilt) * 0.004).toFixed(4)})` : "";

      if (mode === "pin") {
        // anchored on the middle of the screen, otherwise stretching a long row would throw it sideways
        t.style.transform = leaning
          ? `translateX(${half}px) ${leaning} translateX(${(-half - pos + sweep).toFixed(1)}px)`
          : `translateX(${(-pos + sweep).toFixed(1)}px)`;
      } else {
        t.style.transform = sweep || leaning ? `translateX(${sweep.toFixed(1)}px) ${leaning}` : "";
      }
      if (!light) pose((mode === "pin" ? -pos : -t.scrollLeft) + sweep);
      if (bar.current) bar.current.style.transform = `scaleX(${p.toFixed(4)})`;
      o.classList.toggle("moved", p > 0.02);
      if (now.current && cards.length) {
        const i = Math.round(p * (cards.length - 1));
        if (i !== shown) {
          shown = i;
          now.current.textContent = pad(i + 1);
          if (!light) now.current.animate?.([{ translate: "0 35%", opacity: 0 }, { translate: "0 0", opacity: 1 }], { duration: 240, easing: "cubic-bezier(.2,.8,.2,1)" });
        }
      }
      if (tilt !== 0 || speed !== 0) kick();
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

    const measure = () => {
      const kids = Array.from(t.children) as HTMLElement[];
      const last = kids[kids.length - 1];
      if (!last) return;
      const end = last.offsetLeft + last.offsetWidth + (parseFloat(getComputedStyle(t).paddingRight) || 0);
      half = t.clientWidth / 2;
      over = end - t.clientWidth;
      const moves = over > 40;
      mode = !moves ? "fit" : pin && wide.matches ? "pin" : "swipe";
      o.dataset.mode = mode;
      o.classList.toggle("flying", fly && moves);
      o.style.height = mode === "pin" ? `calc(100vh + ${Math.round(over)}px)` : "";
      range = Math.max(1, o.offsetHeight - window.innerHeight);
      t.style.transform = "";
      clearPoses();
      cards = kids.map((el) => ({ el, mid: el.offsetLeft + el.offsetWidth / 2, d: NaN }));
      if (total.current) total.current.textContent = `/ ${pad(kids.length)}`;
      shown = -1;
      lastPos = mode === "pin" ? clamp(-o.getBoundingClientRect().top / range, 0, 1) * over : t.scrollLeft;
      keepPlace();
      kick();
    };

    // a sideways trackpad swipe moves the row too, and keyboard focus brings its card into view
    const sideWheel = (e: WheelEvent) => {
      if (mode !== "pin" || Math.abs(e.deltaX) <= Math.abs(e.deltaY) || !seen) return;
      const top = o.getBoundingClientRect().top;
      if (top > 0 || top < -range) return;
      e.preventDefault();
      const l = lenis();
      if (l) l.scrollTo(l.targetScroll + e.deltaX);
      else window.scrollBy(0, e.deltaX);
    };
    const focus = (e: FocusEvent) => {
      if (mode !== "pin" || !(e.target as Element).matches?.(":focus-visible")) return;
      const c = cards.find((x) => x.el.contains(e.target as Node));
      if (!c) return;
      const y = window.scrollY + o.getBoundingClientRect().top + clamp((c.mid - half) / over, 0, 1) * range;
      const l = lenis();
      if (l) l.scrollTo(y); else window.scrollTo({ top: y });
    };
    const toLite = () => { light = true; tilt = 0; clearPoses(); kick(); };

    const io = new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      o.classList.toggle("live", seen);
      if (seen) { lastT = performance.now(); kick(); }
    }, { rootMargin: "20% 0px" });
    io.observe(o);
    measure();
    document.fonts?.ready.then(measure).catch(() => {});

    const stage = t.parentElement;
    if (!light) stage?.addEventListener("wheel", sideWheel, { passive: false });
    t.addEventListener("focusin", focus);
    t.addEventListener("scroll", kick, { passive: true }); // phones swipe the row itself
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("lc-lite", toLite);
    wide.addEventListener("change", measure);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      stage?.removeEventListener("wheel", sideWheel);
      t.removeEventListener("focusin", focus);
      t.removeEventListener("scroll", kick);
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", measure);
      window.removeEventListener("lc-lite", toLite);
      wide.removeEventListener("change", measure);
      clearPoses();
      t.style.transform = "";
      o.style.height = "";
      o.classList.remove("flying", "live", "moved");
      delete o.dataset.mode;
    };
  }, [pin, curve, fly, lean]);

  return (
    <div ref={outer} className="side">
      <div className="side-stage reveal r3">
        <div className="side-top" aria-hidden>
          {count && <div className="side-count"><b ref={now} /><span ref={total} /></div>}
          <div className="side-hint"><span className="h-pin">Keep scrolling</span><span className="h-swipe">Swipe</span> <i className="ti ti-arrow-right" /></div>
        </div>
        <div ref={track} className={`side-track ${className}`}>{children}</div>
        <div className="side-bar" aria-hidden><i ref={bar} /></div>
      </div>
    </div>
  );
}
