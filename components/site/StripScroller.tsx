"use client";
import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./fx";

/**
 * Photo-trail sections: on wide screens the section pins while scrolling down moves the trips sideways.
 * On phones (or with few trips) it stays a normal swipeable row. With `depth`, trips turn and shrink away from the
 * middle of the screen, like a curved film strip (on phones just the shrinking).
 */
export default function StripScroller({ className, children, depth = false }: { className: string; children: React.ReactNode; depth?: boolean }) {
  const outer = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLElement>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const mq = window.matchMedia("(min-width: 761px)");
    let over = 0, on = false;
    const curve = () => {
      const t = track.current;
      if (!depth || !t || !t.firstElementChild) return;
      const trips = Array.from(t.children) as HTMLElement[];
      const first = trips[0], left = t.getBoundingClientRect().left + parseFloat(getComputedStyle(t).paddingLeft || "0") - t.scrollLeft;
      const half = window.innerWidth / 2;
      for (const el of trips) {
        const d = Math.max(-1.1, Math.min(1.1, (left + el.offsetLeft - first.offsetLeft + el.offsetWidth / 2 - half) / half));
        el.style.rotate = on ? `y ${(-d * 17).toFixed(2)}deg` : "";
        el.style.scale = (1 - Math.abs(d) * (on ? 0.08 : 0.06)).toFixed(3);
      }
    };
    const update = () => {
      const o = outer.current, t = track.current;
      if (!o || !t) return;
      if (!on) { t.style.transform = ""; curve(); return; }
      const range = o.offsetHeight - window.innerHeight;
      const p = Math.min(1, Math.max(0, -o.getBoundingClientRect().top / Math.max(1, range)));
      t.style.transform = `translateX(${-p * over}px)`;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      curve();
    };
    const measure = () => {
      const o = outer.current, t = track.current;
      if (!o || !t) return;
      t.style.transform = "";
      over = t.scrollWidth - o.clientWidth;
      on = mq.matches && over > 40;
      setPinned(on);
      o.style.height = on ? `calc(100vh + ${Math.round(over)}px)` : "";
      update();
    };
    measure();
    const imgs = Array.from(track.current?.querySelectorAll("img") ?? []);
    imgs.forEach((i) => i.addEventListener("load", measure, { once: true }));
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", update, { passive: true });
    mq.addEventListener("change", measure);
    const row = track.current;
    row?.addEventListener("scroll", update, { passive: true }); // phones swipe the row itself
    return () => {
      row?.removeEventListener("scroll", update);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", update);
      mq.removeEventListener("change", measure);
    };
  }, [depth]);

  return (
    <div ref={outer} className={pinned ? "strip-pin" : undefined}>
      <div className={pinned ? "strip-sticky" : undefined}>
        {pinned && <div className="strip-hint" aria-hidden>Keep scrolling <i className="ti ti-arrow-right" /></div>}
        <div ref={track} className={className}>{children}</div>
        {pinned && <div className="strip-bar" aria-hidden><i ref={bar} /></div>}
      </div>
    </div>
  );
}
