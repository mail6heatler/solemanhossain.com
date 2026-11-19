"use client";
import { useEffect, useState } from "react";

/**
 * The menu button on narrow screens. As before it drops a list down; with `full` (the menu bar's "Full-screen menu" for phones) the list
 * covers the screen in big letters, revealed in a circle from the button, and Esc closes it.
 */
export default function MobileMenu({ links, full = false }: { links: { href: string; label: string; emoji: string; code?: string }[]; full?: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open || !full) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.querySelector("dialog[open]")) setOpen(false); };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [open, full]);
  return (
    <>
      <button className="menu-btn" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <i className={`ti ${open ? "ti-x" : "ti-menu-2"}`} />
      </button>
      <div className={`mobile-menu${full ? " mm-full" : ""} ${open ? "open" : ""}`} onClick={() => setOpen(false)}>
        {links.map((l, i) => (
          <a key={l.href} href={l.href} style={full ? ({ "--k": i } as React.CSSProperties) : undefined}>{full && l.code && <small>{l.code}</small>}{l.emoji} {l.label}</a>
        ))}
      </div>
    </>
  );
}
