"use client";
import { useEffect, useState } from "react";
import { SKINS, SKIN_INFO, SKIN_LABELS, THEMES, type Skin } from "@/lib/settings";
import { toast } from "./fx";

const label = (k: string) => SKIN_LABELS[k as Skin] ?? k;
const emoji = (k: string) => label(k).split(" ")[0];
const name = (k: string) => label(k).replace(/^\S+\s/, "").replace(/ \(.*\)$/, "");

function nightNow(tz: string) {
  let h = new Date().getHours();
  try { h = parseInt(new Date().toLocaleString("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }), 10) % 24; } catch {}
  return h >= 18 || h < 6;
}
const pickRandom = (not?: string) => {
  const pool = THEMES.filter((t) => t !== not);
  return pool[Math.floor(Math.random() * pool.length)];
};

/** Theme button (menu with every theme, Auto and Random) and, optionally, a 🔀 button that jumps to a random theme. */
export default function ThemeSwitch({ defaultTheme, timezone, shuffle, menu = true }: { defaultTheme: string; timezone: string; shuffle: boolean; menu?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pref, setPref] = useState(defaultTheme);
  const [shown, setShown] = useState("");
  const [spin, setSpin] = useState(false);

  useEffect(() => {
    const h = document.documentElement;
    setPref(h.dataset.skinPref || defaultTheme);
    setShown(h.dataset.skin || "");
  }, [defaultTheme]);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!(e.target as Element).closest?.(".skin-pick")) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", key); };
  }, [open]);

  const apply = (p: string, s: string, remember = true) => {
    const h = document.documentElement;
    h.dataset.skin = s;
    h.dataset.skinPref = p;
    h.removeAttribute("data-skin-preview");
    if (remember) try { localStorage.setItem("lc_skin", p); } catch {}
    setPref(p);
    setShown(s);
    window.dispatchEvent(new CustomEvent("skinchange"));
  };
  const choose = (p: string) => {
    const s = p === "auto" ? (nightNow(timezone) ? "night" : "day") : p === "random" ? pickRandom(shown) : p;
    apply(p, s);
    setOpen(false);
    if (p === "random") toast(`🔀 Random theme every visit · now: ${label(s)}`);
  };
  const shuffleNow = () => {
    const s = pickRandom(document.documentElement.dataset.skin);
    apply(s, s);
    setSpin(true);
    toast(`🔀 ${label(s)}`, 1800);
  };

  const cur = pref === "random" || pref === "auto" ? pref : (shown || pref);
  return (
    <>
      {shuffle && (
        <button type="button" className={`icon-btn shuffle-btn ${spin ? "spin" : ""}`} onClick={shuffleNow} onAnimationEnd={() => setSpin(false)}
          aria-label="Shuffle: switch to a random theme" title="Random theme">🔀</button>
      )}
      {menu && <div className="skin-pick">
        <button type="button" className="icon-btn" aria-haspopup="menu" aria-expanded={open} aria-label={`Theme: ${name(cur)}. Change theme`} title="Change theme" onClick={() => setOpen((o) => !o)}>
          {emoji(cur)}
        </button>
        {open && (
          <div className="skin-menu" role="menu" aria-label="Themes">
            <div className="skin-grid">
              {SKINS.map((k) => (
                <button key={k} type="button" role="menuitemradio" aria-checked={pref === k} onClick={() => choose(k)}>
                  <span className="sw" aria-hidden style={{ background: `linear-gradient(135deg, ${SKIN_INFO[k].c[0]} 50%, ${SKIN_INFO[k].c[1]} 50%)` }} />
                  <span>{emoji(k)} {name(k)}<small>{SKIN_INFO[k].d}</small></span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>}
    </>
  );
}
