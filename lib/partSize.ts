/**
 * The size and place the owner gave one box of a card or of a full view by dragging it in the dashboard's live editor (stored per entry:
 * items.card.parts for the card, items.fv.parts for the boxes inside the full view's parts).
 * `w` is its width as a share of what holds it, `h` the room it gets (a picture's height; for anything else the least it takes up, so words are never cut),
 * `z` how big everything in it is, words included, and `x`, `y` how far it was dragged from where it sits, in the card's pixels.
 * Its side or bottom edge sets `w` or `h`, its corner `z`, its move handle `x` and `y`.
 */
export type PartSize = { w?: number; h?: number; z?: number; x?: number; y?: number };
export type PartSizes = Record<string, PartSize>;

export const PART_LIMITS = { w: [10, 100], h: [16, 900], z: [40, 400], x: [-1200, 1200], y: [-1200, 1200] } as const;
/** Every box of a card or a full view: what the owner writes, the reaction bar, the comment box, the Full view button, and the card's own decoration. */
export const SIZED_PARTS = ["sub", "title", "subtitle", "body", "pic", "gallery", "date", "place", "mood", "status", "tags", "links", "poll", "quote",
  "reacts", "comments", "open", "face", "sticker", "specs", "stats", "bars", "art", "band", "code"] as const;

const num = (v: unknown, [lo, hi]: readonly [number, number], step = 1) => {
  const n = Number(v);
  return v === null || v === undefined || v === "" || !Number.isFinite(n) ? undefined : Math.round(Math.min(hi, Math.max(lo, n)) / step) * step;
};

/** One part's size, limited; undefined when nothing is set. */
export function cleanPartSize(raw: unknown): PartSize | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const s: PartSize = {};
  const w = num(o.w, PART_LIMITS.w, 0.5), h = num(o.h, PART_LIMITS.h), z = num(o.z, PART_LIMITS.z), x = num(o.x, PART_LIMITS.x), y = num(o.y, PART_LIMITS.y);
  if (w !== undefined && w < 100) s.w = w;
  if (h !== undefined) s.h = h;
  if (z !== undefined && z !== 100) s.z = z;
  if (x || y) { s.x = x ?? 0; s.y = y ?? 0; }
  return Object.keys(s).length ? s : undefined;
}

export function cleanPartSizes(raw: unknown): PartSizes {
  const out: PartSizes = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const k of SIZED_PARTS) { const s = cleanPartSize((raw as Record<string, unknown>)[k]); if (s) out[k] = s; }
  return out;
}

/** What goes on a sized part: its style, and `data-sz` naming what's set, so the site's CSS can follow (a picture fills the height it was given). */
export function partStyle(key: string, s?: PartSize): { style?: React.CSSProperties; flags?: string } {
  if (!s) return {};
  const style: React.CSSProperties = {};
  const flags: string[] = [];
  if (s.w !== undefined) { style.width = `${s.w}%`; flags.push("w"); }
  if (s.h !== undefined) { if (key === "pic") style.height = s.h; else style.minHeight = s.h; flags.push("h"); }
  if (s.z !== undefined) { style.zoom = s.z / 100; flags.push("z"); }
  // a zoomed box measures its own move in its own, zoomed pixels: undo that, so it lands where it was dropped
  if (s.x || s.y) { const k = (s.z ?? 100) / 100; style.translate = `${(s.x ?? 0) / k}px ${(s.y ?? 0) / k}px`; flags.push("x"); }
  return flags.length ? { style, flags: flags.join(" ") } : {};
}
