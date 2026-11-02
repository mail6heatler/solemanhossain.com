"use client";
import { useEffect, useState } from "react";

const OPTIONS = [
  { k: "day", e: "☀️", l: "Day calm", d: "Cream and mint" },
  { k: "night", e: "🌙", l: "Night neon", d: "Dark, with a glow" },
  { k: "playful", e: "🎈", l: "Playful", d: "Bright and bouncy" },
  { k: "techy", e: "💻", l: "Techy", d: "Terminal style" },
  { k: "auto", e: "🕕", l: "Auto", d: "Night after 6 PM" },
];

function nightNow(tz: string) {
  let h = new Date().getHours();
  try { h = parseInt(new Date().toLocaleString("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }), 10) % 24; } catch {}
  return h >= 18 || h < 6;
}

/** The theme button in the menu bar: visitors pick a look; the choice is remembered in their browser. */
export default function ThemeSwitch({ defaultTheme, timezone }: { defaultTheme: string; timezone: string }) {
  const [open, setOpen] = useState(false);
  const [pref, setPref] = useState(defaultTheme);

  useEffect(() => { setPref(document.documentElement.dataset.skinPref || defaultTheme); }, [defaultTheme]);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!(e.target as Element).closest?.(".skin-pick")) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", key); };
  }, [open]);

  const choose = (p: string) => {
    const s = p === "auto" ? (nightNow(timezone) ? "night" : "day") : p;
    const h = document.documentElement;
    h.dataset.skin = s;
    h.dataset.skinPref = p;
    try { localStorage.setItem("lc_skin", p); } catch {}
    setPref(p);
    setOpen(false);
    window.dispatchEvent(new CustomEvent("skinchange"));
  };

  const cur = OPTIONS.find((o) => o.k === pref) ?? OPTIONS[1];
  return (
    <div className="skin-pick">
      <button type="button" className="icon-btn" aria-haspopup="menu" aria-expanded={open} aria-label={`Theme: ${cur.l}. Change theme`} title="Change theme" onClick={() => setOpen((o) => !o)}>
        {cur.e}
      </button>
      {open && (
        <div className="skin-menu" role="menu" aria-label="Themes">
          {OPTIONS.map((o) => (
            <button key={o.k} type="button" role="menuitemradio" aria-checked={pref === o.k} onClick={() => choose(o.k)}>
              <span style={{ fontSize: 18 }} aria-hidden>{o.e}</span><span>{o.l}<small>{o.d}</small></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
