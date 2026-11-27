// The sticker buttons at the bottom of a card (2026-11-28, the owner's pick from the Tab Footer Picker,
// https://claude.ai/artifact/4UaJ3D5M3msnXCdoPD21rP: "number 3, your theme's colour, Ink finish"). Four buttons (React, Comment, Share, Open)
// and a thin LIVE strip under them typing recent reactions, comments and shares. Drawn by components/site/StickerBar.tsx, moved by
// stickerFx.ts (GSAP), styled in app/stickerbar.css. Sections get it one at a time (STICKER_LAYOUTS): G1 (notes), G2 (windows), G3 (tickets), G4 (study), G5 (comic), G6 (awards), G7 (scrapbook).
// These are the defaults (settings.cardBar, the dashboard's Card buttons page /admin/cardbar). Each card's own switches (lib/talk.ts:
// react, comments, share, open) and the sizes dragged in the live editor (parts tabs, t-react, t-talk, t-share, t-open, strip) apply on top.

export type CardBarSettings = {
  react: boolean;
  talk: boolean;
  share: boolean;
  open: boolean;
  /** the thin strip under the buttons */
  strip: boolean;
  /** "lively": the emojis rise and move, the buttons lift, things fly after reacting, commenting and sharing; "calm": the same, standing still */
  motion: "lively" | "calm";
};

export const DEFAULT_CARD_BAR: CardBarSettings = { react: true, talk: true, share: true, open: true, strip: true, motion: "lively" };

export function cleanCardBar(raw: unknown): CardBarSettings {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const b = (k: keyof CardBarSettings) => (typeof o[k] === "boolean" ? (o[k] as boolean) : (DEFAULT_CARD_BAR[k] as boolean));
  return { react: b("react"), talk: b("talk"), share: b("share"), open: b("open"), strip: b("strip"), motion: o.motion === "calm" ? "calm" : "lively" };
}

/** The layouts whose cards wear the sticker buttons so far; the rest keep the old row of emojis until their turn. */
export const STICKER_LAYOUTS = ["notes", "windows", "tickets", "study", "comic", "awards", "scrapbook"];
