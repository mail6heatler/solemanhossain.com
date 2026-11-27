"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { cleanCardBar, DEFAULT_CARD_BAR, type CardBarSettings } from "@/lib/cardBar";

const Ctx = createContext<CardBarSettings>(DEFAULT_CARD_BAR);
/** The card bar's settings (lib/cardBar.ts) for whatever draws one: CardBar, FullView, the live editor's still bar. */
export const useCardBar = () => useContext(Ctx);

/** What the dashboard's Card buttons page sends its screens: the unsaved settings, and a counter that asks a card to show the motion. */
export type CardBarDraftMsg = { type: "lc-bar-draft"; cfg: CardBarSettings; play: number };

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
      if (d.play > played) { if (played) setTimeout(() => window.dispatchEvent(new Event("lc-bar-play")), 60); played = d.play; }
    };
    addEventListener("message", on);
    window.parent.postMessage({ type: "lc-bar-ready" }, location.origin);
    return () => removeEventListener("message", on);
  }, []);
  return <Ctx.Provider value={draft ?? value}>{children}</Ctx.Provider>;
}
