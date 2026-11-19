"use client";
import { useEffect, useState } from "react";

type L = { href: string; label: string; emoji: string };

/**
 * The phone menus the owner can pick instead of the bottom bar (settings.menu.phone): an orb in the corner that blooms into the sections, or
 * a sheet pulled up from the bottom edge. Only on narrow screens (CSS hides it elsewhere). It marks the section you're in from the scroll-spy.
 */
export default function PhoneMenu({ kind, links }: { kind: "orb" | "sheet"; links: L[] }) {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState("");
  useEffect(() => {
    const spy = () => setAt(document.querySelector<HTMLAnchorElement>(".navlinks a.active")?.getAttribute("href") ?? "");
    window.addEventListener("lc-spy", spy);
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    addEventListener("keydown", key);
    return () => { window.removeEventListener("lc-spy", spy); removeEventListener("keydown", key); };
  }, []);
  const cur = links.find((l) => l.href === at);
  if (kind === "orb") {
    const n = links.length, R = Math.min(170, 70 + n * 12);
    return (
      <div className={`pm-orb${open ? " open" : ""}`}>
        {links.map((l, i) => {
          const a = (Math.PI / 2) * (n > 1 ? i / (n - 1) : 0);
          return (
            <a key={l.href} href={l.href} className={`pm-petal${l.href === at ? " on" : ""}`} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}
              style={{ "--k": i, "--x": `${(-Math.cos(a) * R).toFixed(0)}px`, "--y": `${(-Math.sin(a) * R).toFixed(0)}px` } as React.CSSProperties} aria-label={l.label}>
              {l.emoji || "✦"}<span>{l.label}</span>
            </a>
          );
        })}
        <button type="button" className="pm-orb-btn" aria-expanded={open} aria-label={open ? "Close the menu" : "Open the menu"} onClick={() => setOpen((o) => !o)}>+</button>
      </div>
    );
  }
  return (
    <div className={`pm-sheet${open ? " open" : ""}`}>
      <button type="button" className="pm-grab" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <i />{open ? "Close" : cur ? `${cur.emoji} ${cur.label} · all sections ↑` : "All sections ↑"}
      </button>
      <div className="pm-grid">
        {links.map((l) => <a key={l.href} href={l.href} className={l.href === at ? "on" : ""} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}><i>{l.emoji || "✦"}</i>{l.label}</a>)}
      </div>
    </div>
  );
}
