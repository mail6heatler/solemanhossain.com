"use client";
import { useEffect } from "react";
import { ICON_NAMES } from "@/lib/iconNames";

// The site ships only the icons its code names (app/icons.css). An icon chosen somewhere else, by name, that isn't
// in that small file would show nothing, so after the page loads (and once more later, for things drawn late)
// this looks for one and, if it finds any, loads the full set from the CDN.
const FULL = "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.35.0/dist/tabler-icons.min.css";

export default function IconFallback() {
  useEffect(() => {
    const known = new Set(ICON_NAMES.split(" "));
    const check = () => {
      if (document.getElementById("lc-icons-full")) return true;
      for (const el of document.querySelectorAll('[class*="ti-"]')) {
        for (const c of el.classList) {
          if (c.startsWith("ti-") && !known.has(c.slice(3))) {
            const l = document.createElement("link");
            l.id = "lc-icons-full"; l.rel = "stylesheet"; l.href = FULL;
            document.head.appendChild(l);
            return true;
          }
        }
      }
      return false;
    };
    const timers = [1500, 8000].map((ms) => window.setTimeout(check, ms));
    return () => timers.forEach(clearTimeout);
  }, []);
  return null;
}
