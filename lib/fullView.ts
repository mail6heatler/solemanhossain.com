/**
 * What a G1 entry's full view stores (items.fv): its layout, background and opening, a pull quote that only shows there, which parts are hidden,
 * and where each part sits once the owner has moved one in the dashboard. Everything left empty follows the card's own look.
 */
export const FV_PARTS = [
  ["pic", "Main picture"],
  ["title", "Title"],
  ["facts", "Details"],
  ["quote", "Pull quote"],
  ["story", "Story"],
  ["gallery", "More pictures"],
  ["tags", "Tags"],
  ["buttons", "Buttons"],
  ["reacts", "Reactions & comments"],
] as const;
export type FvPart = (typeof FV_PARTS)[number][0];
export const FV_LAYOUTS = [
  ["spread", "Spread", "The picture beside the words"],
  ["poster", "Poster", "A big picture on top"],
  ["story", "Story", "One column, top to bottom"],
] as const;
export type FvLayout = (typeof FV_LAYOUTS)[number][0];
export const FV_BGS = [["mood", "Mood colour"], ["pic", "Picture glow"], ["plain", "Plain"]] as const;
export type FvBg = (typeof FV_BGS)[number][0];
export const FV_OPENS = [["unfold", "Unfolds"], ["rise", "Rises"], ["zoom", "Zooms in"]] as const;
export type FvOpen = (typeof FV_OPENS)[number][0];
/** x, y, width and height on a 12-column grid. A row is a minimum height: it grows with what's in it, so nothing is ever cut. */
export type Box4 = [number, number, number, number];
export type FvInfo = { layout: FvLayout | ""; bg: FvBg | ""; open: FvOpen | ""; quote: string; hide: Partial<Record<FvPart, boolean>>; at: Partial<Record<FvPart, Box4>> };
export const EMPTY_FV: FvInfo = { layout: "", bg: "", open: "", quote: "", hide: {}, at: {} };
export const FV_COLS = 12, FV_MAX_ROWS = 60, FV_QUOTE_MAX = 240;

const PART_KEYS = FV_PARTS.map(([k]) => k) as readonly string[];
const pick = <T extends string>(list: readonly (readonly [T, ...string[]])[], v: unknown): T | "" => (list.some(([k]) => k === v) ? (v as T) : "");
const whole = (v: unknown, lo: number, hi: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null; };

export function cleanFv(raw: unknown): FvInfo {
  let o: Record<string, unknown> = {};
  try {
    const v = typeof raw === "string" ? JSON.parse(raw || "{}") : raw;
    if (v && typeof v === "object" && !Array.isArray(v)) o = v as Record<string, unknown>;
  } catch { /* unreadable: treat as empty */ }
  const hide: FvInfo["hide"] = {}, at: FvInfo["at"] = {};
  if (o.hide && typeof o.hide === "object") for (const k of PART_KEYS) if ((o.hide as Record<string, unknown>)[k] === true) hide[k as FvPart] = true;
  if (o.at && typeof o.at === "object") for (const k of PART_KEYS) {
    const b = (o.at as Record<string, unknown>)[k];
    if (!Array.isArray(b) || b.length !== 4) continue;
    const w = whole(b[2], 2, FV_COLS), h = whole(b[3], 1, 30);
    if (w === null || h === null) continue;
    const x = whole(b[0], 0, FV_COLS - w), y = whole(b[1], 0, FV_MAX_ROWS);
    if (x !== null && y !== null) at[k as FvPart] = [x, y, w, h];
  }
  return { layout: pick(FV_LAYOUTS, o.layout), bg: pick(FV_BGS, o.bg), open: pick(FV_OPENS, o.open), quote: String(o.quote ?? "").trim().slice(0, FV_QUOTE_MAX), hide, at };
}

export const isFvCustom = (fv: FvInfo) => !!(fv.layout || fv.bg || fv.open || fv.quote || Object.keys(fv.hide).length || Object.keys(fv.at).length);

/** With nothing chosen, the full view follows the card: a story opens as one column over its picture's glow, a sign as a poster. */
export function fvLook(fv: FvInfo, card: string, hasPic: boolean): { layout: FvLayout; bg: FvBg; open: FvOpen } {
  return {
    layout: fv.layout || (card === "story" ? "story" : card === "sign" ? "poster" : "spread"),
    bg: fv.bg === "pic" && !hasPic ? "mood" : fv.bg || (card === "story" && hasPic ? "pic" : "mood"),
    open: fv.open || (card === "story" ? "zoom" : card === "sign" ? "rise" : "unfold"),
  };
}

export type FvBox = { part: FvPart; x: number; y: number; w: number; h: number };
const H: Record<FvPart, number> = { pic: 10, title: 4, facts: 2, quote: 3, story: 5, gallery: 4, tags: 1, buttons: 2, reacts: 3 };

/** Where the layout puts each part that has something in it. Parts with nothing to show leave no gap. */
function arrange(layout: FvLayout, has: (p: FvPart) => boolean): FvBox[] {
  const out: FvBox[] = [];
  const stack = (parts: FvPart[], x: number, w: number, y: number) => {
    for (const part of parts) if (has(part)) { out.push({ part, x, y, w, h: H[part] }); y += H[part]; }
    return y;
  };
  if (layout === "story" || (layout === "spread" && !has("pic"))) {
    stack(["title", "pic", "facts", "quote", "story", "gallery", "tags", "buttons", "reacts"], 2, 8, 0);
    return out;
  }
  if (layout === "poster") {
    let y = stack(["pic"], 0, 12, 0);
    const facts = has("facts");
    const y1 = stack(["title"], 0, facts ? 8 : 12, y), y2 = stack(["facts"], 8, 4, y);
    y = Math.max(y1, y2);
    const side: FvPart[] = ["quote", "gallery", "tags", "buttons"];
    const any = side.some(has);
    const a = stack(["story"], any ? 0 : 2, 8, y), b = stack(side, has("story") ? 8 : 0, has("story") ? 4 : 12, y);
    stack(["reacts"], 0, 12, Math.max(a, b));
    return out;
  }
  // spread: the picture on the left, as tall as the words beside it
  const right = stack(["title", "facts", "quote", "tags", "buttons"], 7, 5, 0);
  const top = Math.max(right, H.pic);
  out.push({ part: "pic", x: 0, y: 0, w: 7, h: top });
  const more = has("gallery");
  const a = stack(["story"], more ? 0 : 2, 8, top), b = stack(["gallery"], has("story") ? 8 : 0, has("story") ? 4 : 12, top);
  stack(["reacts"], 0, 12, Math.max(a, b));
  return out;
}

/**
 * The parts to draw and where. `present` says which have something in them. Once the owner has moved one (`at`), every part they placed keeps its place,
 * and a part that appeared later goes underneath.
 */
export function fvBoxes(fv: FvInfo, layout: FvLayout, present: Partial<Record<FvPart, boolean>>): FvBox[] {
  const has = (p: FvPart) => !!present[p] && !fv.hide[p];
  const auto = arrange(layout, has);
  if (!Object.keys(fv.at).length) return auto;
  const placed: FvBox[] = [];
  for (const [part] of FV_PARTS) { const b = fv.at[part]; if (b && has(part)) placed.push({ part, x: b[0], y: b[1], w: b[2], h: b[3] }); }
  let y = placed.reduce((m, b) => Math.max(m, b.y + b.h), 0);
  for (const b of auto) if (!fv.at[b.part]) { placed.push({ ...b, x: 0, y, w: 12 }); y += b.h; }
  return placed;
}

/** Reading order: top to bottom, then left to right. Phones stack the parts in this order. */
export const fvOrder = (boxes: FvBox[]) => [...boxes].sort((a, b) => a.y - b.y || a.x - b.x);
