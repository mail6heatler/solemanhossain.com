"use client";
import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./fx";

/**
 * Photo-trail sections: on wide screens the section pins while scrolling down moves the trips sideways.
 * On phones (or with few trips) it stays a normal swipeable row.
 */
export default function StripScroller({ className, children }: { className: string; children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLElement>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const mq = window.matchMedia("(min-width: 761px)");
    let over = 0, on = false;
    const update = () => {
      const o = outer.current, t = track.current;
      if (!o || !t) return;
      if (!on) { t.style.transform = ""; return; }
      const range = o.offsetHeight - window.innerHeight;
      const p = Math.min(1, Math.max(0, -o.getBoundingClientRect().top / Math.max(1, range)));
      t.style.transform = `translateX(${-p * over}px)`;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
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
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", update);
      mq.removeEventListener("change", measure);
    };
  }, []);

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
