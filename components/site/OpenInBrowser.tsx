"use client";
import { useEffect, useState } from "react";

/**
 * Inside an app's own browser (Messenger, Facebook, Instagram…; skinScript marks it with html.in-app and, on Android, has already
 * tried to hand the page to Chrome), a small bar offers to open the site in a real browser (the owner's request, 2026-11-26).
 * iPhones: apps don't let a page leave by itself, so the bar has Safari and Chrome buttons (x-safari-https:, googlechromes:) and a
 * hint for the app's own menu. Android: it only shows if the switch to Chrome didn't happen, with a Chrome button. Closed with ✕ for
 * the visit (lc_iab_x). Drawn only after start-up, so nothing is added to .site before React starts; nothing in a normal browser.
 */
export default function OpenInBrowser() {
  const [kind, setKind] = useState<"" | "ios" | "android">("");
  useEffect(() => {
    const h = document.documentElement;
    if (!h.classList.contains("in-app")) return;
    try { if (sessionStorage.getItem("lc_iab_x")) return; } catch {}
    const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (ios) { const t = window.setTimeout(() => setKind("ios"), 900); return () => clearTimeout(t); }
    if (/Android/i.test(ua)) { const t = window.setTimeout(() => setKind("android"), 2500); return () => clearTimeout(t); } // still here: the app blocked the switch
  }, []);
  if (!kind) return null;
  const here = typeof location === "undefined" ? "" : location.host + location.pathname + location.search;
  const close = () => { try { sessionStorage.setItem("lc_iab_x", "1"); } catch {} setKind(""); };
  return (
    <div className="iab-bar" role="region" aria-label="Open in your browser">
      <div className="iab-t">
        <b>📱 Best in your browser</b>
        <small>{kind === "ios" ? "This app's browser cuts some things short. If the buttons do nothing, tap ••• then Open in Safari." : "This app's browser cuts some things short. Open it in Chrome for the full site."}</small>
      </div>
      <div className="iab-btns">
        {kind === "ios" ? (
          <>
            <a className="iab-go" href={`x-safari-https://${here}`}>Safari</a>
            <a className="iab-go alt" href={`googlechromes://${here}`}>Chrome</a>
          </>
        ) : (
          <a className="iab-go" href={`intent://${here}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(location.href)};end`}>Open in Chrome</a>
        )}
        <button type="button" className="iab-x" onClick={close} aria-label="Close">✕</button>
      </div>
    </div>
  );
}
