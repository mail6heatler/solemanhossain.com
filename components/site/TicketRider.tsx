"use client";
import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./fx";
import { Vehicle, type VehicleKind } from "./vehicles";

const TOUR_MS = 4500; // how long it stays at a stop when a row of tickets all fit on the screen

/**
 * The vehicle travelling the route above a row of boarding passes. It lives inside the row's track, so it moves with the row, and it
 * only ever moves by a CSS transition on `transform`, so it costs nothing between stops. It follows the row as it slides ("row-at"),
 * goes to a ticket the mouse is really on, and if nothing is moving it tours the tickets by itself, there and back.
 * A study shelf's lamp is the same thing with something else inside (`children`), and it glides without the vehicle's hop.
 */
export default function TicketRider({ kinds, className = "tkt-rider", children, count }: { kinds?: VehicleKind[]; className?: string; children?: React.ReactNode; count?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current, inner = el?.firstElementChild as HTMLElement | null, track = el?.parentElement, side = el?.closest<HTMLElement>(".side");
    if (!el || !inner || !track || !side) return;
    const root = document.documentElement;
    const still = prefersReducedMotion();
    const cells = (Array.from(track.children) as HTMLElement[]).filter((c) => !c.hasAttribute("data-rider"));
    if (!cells.length) return;
    const icons = Array.from(inner.children) as HTMLElement[];
    let xs: number[] = [], lastW = 0, here = -1, wanted = 0, onScreen = false, pointing = false, timer = 0, heading = 1;
    let lastTarget: EventTarget | null = null;

    const set = (x: number, ms: number) => {
      el.style.transitionDuration = `${ms}ms`;
      el.style.transform = `translateX(${x.toFixed(1)}px)`;
    };
    const measure = () => {
      lastW = window.innerWidth;
      const w = el.offsetWidth;
      xs = cells.map((c) => c.offsetLeft + c.offsetWidth / 2 - w / 2);
      set(here >= 0 ? xs[here] : xs[0] - 90, 0);
    };
    const go = (i: number) => {
      if (i === here || xs[i] === undefined) return;
      if (!onScreen) { wanted = i; return; }
      const from = here >= 0 ? xs[here] : xs[i] - 90;
      const light = root.classList.contains("lite");
      const ms = still || light ? 0 : Math.max(700, Math.min(1800, Math.abs(xs[i] - from) * 3));
      el.classList.toggle("going-back", xs[i] < from);
      if (kinds) icons.forEach((s) => s.classList.toggle("on", s.dataset.k === kinds[i]));
      set(xs[i], ms);
      if (ms && kinds) inner.animate?.([{ translate: "0 0" }, { translate: "0 -12px" }, { translate: "0 0" }], { duration: ms, easing: "ease-in-out" });
      cells.forEach((c, k) => { c.classList.toggle("passed", k < i); c.classList.toggle("here", k === i); });
      here = i;
    };

    const tour = () => {
      if (onScreen && !pointing && side.dataset.mode === "fit" && !still && !root.classList.contains("lite") && !root.classList.contains("scrolling") && cells.length > 1) {
        let next = here + heading;
        if (next < 0 || next >= cells.length) { heading = heading > 0 ? -1 : 1; next = here + heading; }
        go(next);
      }
      timer = window.setTimeout(tour, TOUR_MS);
    };
    const rowAt = (e: Event) => { if (!pointing) go((e as CustomEvent<number>).detail); };
    // only a mouse that really moves counts, as on the row itself: the page can bring a row under a resting one
    const moved = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && !e.movementX && !e.movementY) return;
      if (e.target === lastTarget) return;
      lastTarget = e.target;
      let c = e.target as HTMLElement | null;
      while (c && c.parentElement !== track) c = c.parentElement;
      if (!c || !cells.includes(c)) return;
      pointing = true;
      go(cells.indexOf(c));
    };
    const left = () => { pointing = false; lastTarget = null; };
    const focused = (e: FocusEvent) => {
      let c = e.target as HTMLElement | null;
      while (c && c.parentElement !== track) c = c.parentElement;
      if (c && cells.includes(c)) go(cells.indexOf(c));
    };
    const resized = () => { if (window.innerWidth !== lastW) measure(); };

    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    const seen = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      clearTimeout(timer);
      if (!onScreen) return;
      go(here >= 0 ? here : wanted);
      timer = window.setTimeout(tour, TOUR_MS);
    }, { rootMargin: "-12% 0px" });
    seen.observe(side);
    side.addEventListener("row-at", rowAt);
    track.addEventListener("pointermove", moved, { passive: true });
    track.addEventListener("pointerleave", left, { passive: true });
    track.addEventListener("focusin", focused);
    window.addEventListener("resize", resized);
    return () => {
      clearTimeout(timer);
      seen.disconnect();
      side.removeEventListener("row-at", rowAt);
      track.removeEventListener("pointermove", moved);
      track.removeEventListener("pointerleave", left);
      track.removeEventListener("focusin", focused);
      window.removeEventListener("resize", resized);
    };
  }, [kinds, count]);

  const distinct = kinds?.filter((k, i) => kinds.indexOf(k) === i);
  return (
    <div ref={ref} className={className} data-rider aria-hidden>
      <div className={`${className}-in`}>{children ?? distinct?.map((k) => <Vehicle key={k} kind={k} className={k === kinds?.[0] ? "on" : undefined} />)}</div>
    </div>
  );
}
