"use client";
import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./fx";

export type DockItem = { title: string; href: string; pic: string };

const HOLD_MS = 3800; // after a click its icon stays marked while the row waits there

/**
 * The row of project icons under a desktop of app windows. A click brings that window forward, and slides the row to it if the
 * row is moving; each icon is a real link to the project's page, so it still works without JavaScript.
 * The row and the dock only know each other through events on `.side`: it says "row-at" as it moves, and this says "row-go".
 */
export default function Dock({ items }: { items: DockItem[] }) {
  const nav = useRef<HTMLElement>(null);
  const hold = useRef(0);
  const frontTimer = useRef(0);

  const mark = (i: number) => nav.current?.querySelectorAll(".dock-i").forEach((a, k) => a.classList.toggle("at", k === i));

  useEffect(() => {
    const side = nav.current?.closest<HTMLElement>(".side");
    const track = side?.querySelector<HTMLElement>(".side-track");
    if (!side || !track) return;
    const at = (e: Event) => { if (performance.now() > hold.current) mark((e as CustomEvent<number>).detail); };
    // pointing at a window, or tabbing into one, lights up its icon
    const pointed = (e: Event) => {
      let w = e.target as HTMLElement | null;
      while (w && w.parentElement !== track) w = w.parentElement;
      if (w) mark(Array.prototype.indexOf.call(track.children, w));
    };
    side.addEventListener("row-at", at);
    track.addEventListener("pointerover", pointed, { passive: true });
    track.addEventListener("focusin", pointed);
    mark(0);
    return () => {
      clearTimeout(frontTimer.current);
      side.removeEventListener("row-at", at);
      track.removeEventListener("pointerover", pointed);
      track.removeEventListener("focusin", pointed);
    };
  }, []);

  const go = (e: React.MouseEvent<HTMLAnchorElement>, i: number) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    const side = nav.current?.closest<HTMLElement>(".side");
    const windows = side?.querySelector(".side-track")?.children;
    if (!side || !windows) return;
    e.preventDefault();
    side.dispatchEvent(new CustomEvent("row-go", { detail: i }));
    hold.current = performance.now() + HOLD_MS;
    mark(i);
    Array.from(windows).forEach((w, k) => w.classList.toggle("front", k === i));
    clearTimeout(frontTimer.current);
    frontTimer.current = window.setTimeout(() => windows[i]?.classList.remove("front"), HOLD_MS);
    if (!prefersReducedMotion()) e.currentTarget.classList.add("bounce");
  };

  return (
    <nav ref={nav} className="dock" aria-label="Jump to a project">
      {items.map((it, i) => (
        <a key={it.href} href={it.href} className="dock-i" aria-label={it.title} onClick={(e) => go(e, i)}
          onAnimationEnd={(e) => { if (e.target === e.currentTarget) e.currentTarget.classList.remove("bounce"); }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {it.pic ? <img src={it.pic} alt="" loading="lazy" decoding="async" /> : <span className="dock-l" aria-hidden>{Array.from(it.title.trim())[0]?.toUpperCase() ?? "•"}</span>}
          <span className="dock-tip" aria-hidden>{it.title}</span>
        </a>
      ))}
    </nav>
  );
}
