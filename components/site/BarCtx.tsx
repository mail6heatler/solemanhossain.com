"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { cleanCardBar, DEFAULT_CARD_BAR, type CardBarSettings } from "@/lib/cardBar";

const Ctx = createContext<CardBarSettings>(DEFAULT_CARD_BAR);
/** The sticker buttons' settings (lib/cardBar.ts) for whatever draws them: StickerBar on the site and its still copy in the live editor. */
export const useCardBar = () => useContext(Ctx);

/** What the dashboard's Card buttons page sends its screens: the unsaved settings, a counter that asks the first card on screen to show its emojis,
 * and its switch for the Buttons panel on every card (false shows every card without it: html.bar-off, stickerbar.css). */
export type CardBarDraftMsg = { type: "lc-bar-draft"; cfg: CardBarSettings; play: number; panel?: boolean };

/**
 * Gives every card on the page the site's card bar settings (SiteShell wraps the page in it; the live editor wraps its previews).
 * Inside the dashboard's preview (`?bar=studio`, in a frame) it takes the page's unsaved settings instead, and passes a Play on as `lc-bar-play`.
 */
export function CardBarProvider({ value, children }: { value: CardBarSettings; children: React.ReactNode }) {
  const [draft, setDraft] = useState<CardBarSettings | null>(null);
  useEffect(() => {
    if (window === window.parent || new URLSearchParams(location.search).get("bar") !== "studio") return;
    let played = 0;
    const on = (e: MessageEvent) => {
      const d = e.data as CardBarDraftMsg | undefined;
      if (e.origin !== location.origin || d?.type !== "lc-bar-draft") return;
      setDraft(cleanCardBar(d.cfg));
      if (typeof d.panel === "boolean") { document.documentElement.classList.toggle("bar-off", !d.panel); window.dispatchEvent(new Event("lc-fit")); }
      if (d.play > played) { if (played) setTimeout(() => window.dispatchEvent(new Event("lc-bar-play")), 60); played = d.play; }
    };
    addEventListener("message", on);
    window.parent.postMessage({ type: "lc-bar-ready" }, location.origin);
    return () => removeEventListener("message", on);
  }, []);
  return <Ctx.Provider value={draft ?? value}>{children}</Ctx.Provider>;
}
