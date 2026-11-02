"use client";
import { useState } from "react";

export default function MobileMenu({ links }: { links: { href: string; label: string; emoji: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="menu-btn" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <i className={`ti ${open ? "ti-x" : "ti-menu-2"}`} />
      </button>
      <div className={`mobile-menu ${open ? "open" : ""}`} onClick={() => setOpen(false)}>
        {links.map((l) => (
          <a key={l.href} href={l.href}>{l.emoji} {l.label}</a>
        ))}
      </div>
    </>
  );
}
