// The bar at the bottom of every card (2026-11-27, the owner's pick: "Tab footer" from the Card Action Bar Picker,
// https://claude.ai/artifact/M8Cpv5vcAaTGNjx3aR7euL). Four equal tabs: React, Comment, Share, Open. Pointing at React (tapping it on
// a phone) brings the emojis up, each with its own move. Drawn by components/site/CardBar.tsx, moved by cardBarFx.ts (GSAP).
// These are the defaults for every card, now and later (settings.cardBar, dashboard page /admin/cardbar). What each entry
// switches for itself (lib/talk.ts) and the sizes and places dragged in the live editor (the `reacts`, `comments` and `open`
// parts) still apply on top, as before.

/** The same five as REACTION_EMOJIS in lib/settings.ts, which imports this file, so it can't be imported back from there. */
const REACTION_EMOJIS = ["❤️", "🔥", "😂", "🤯", "👏"] as const;

export type CardBarSettings = {
  /** which of the five emojis the React tab offers, in their usual order; at least one */
  emojis: string[];
  /** a word under each icon, or the icons alone */
  words: boolean;
  /** the Open tab, or only a click on the card itself opens the full page */
  open: "tab" | "card";
  /** "lively": the emojis rise and move, the tabs come alive under the mouse; "calm": the same bar standing still */
  motion: "lively" | "calm";
  /** little emojis burst out when someone reacts */
  bursts: boolean;
  /** the newest comment shown just above the tabs, on cards whose comments are on */
  last: boolean;
  /** off here hides it on every card; on lets each entry's own switch decide, as before */
  total: boolean;
  crown: boolean;
  comments: boolean;
  share: boolean;
};

export const DEFAULT_CARD_BAR: CardBarSettings = {
  emojis: [...REACTION_EMOJIS], words: true, open: "tab", motion: "lively", bursts: true, last: true,
  total: true, crown: true, comments: true, share: true,
};

export function cleanCardBar(raw: unknown): CardBarSettings {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const d = DEFAULT_CARD_BAR;
  const bool = (k: keyof CardBarSettings) => (typeof o[k] === "boolean" ? (o[k] as boolean) : (d[k] as boolean));
  const picked = Array.isArray(o.emojis) ? REACTION_EMOJIS.filter((e) => (o.emojis as unknown[]).includes(e)) : [...d.emojis];
  return {
    emojis: picked.length ? picked : [...d.emojis],
    words: bool("words"),
    open: o.open === "card" ? "card" : "tab",
    motion: o.motion === "calm" ? "calm" : "lively",
    bursts: bool("bursts"), last: bool("last"),
    total: bool("total"), crown: bool("crown"), comments: bool("comments"), share: bool("share"),
  };
}
