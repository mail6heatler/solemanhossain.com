/**
 * Size and look controls for content, at three levels: all content, a section, one entry. The most specific setting wins,
 * and anything left unset falls through to the level above, then to the site's normal design.
 * Everything is limited here, on the server as well as in the sliders, so no setting can bring back cards that outgrow the screen.
 */
export type HideKey = "pic" | "subtitle" | "tags" | "date";
export type ContentStyle = {
  size?: "s" | "m" | "l" | "custom";
  /** card width and height in pixels, for size "custom" */
  w?: number;
  h?: number;
  fit?: "whole" | "fill";
  /** which part of the picture stays visible when filling, 0 to 100 */
  fx?: number;
  fy?: number;
  /** how much of the card the picture may take, percent */
  pic?: number;
  /** text size, percent */
  text?: number;
  /** true hides on the card, false shows even if a level above hides it */
  hide?: Partial<Record<HideKey, boolean>>;
};

export const LIMITS = { w: [220, 520], h: [260, 640], pic: [30, 90], text: [85, 130] } as const;
export const SIZE_PRESETS = {
  s: { label: "Small", w: 260, h: 340 },
  m: { label: "Medium", w: 340, h: 440 },
  l: { label: "Large", w: 420, h: 540 },
} as const;
export const HIDE_LABELS: Record<HideKey, string> = { pic: "Picture", subtitle: "Subtitle", tags: "Tags", date: "Date and place" };

const num = (v: unknown, [a, b]: readonly [number, number]) => {
  const n = Number(v);
  return v === "" || v == null || !Number.isFinite(n) ? undefined : Math.round(Math.min(b, Math.max(a, n)));
};

/** Whatever comes in (a form, an old database row), only valid, limited values come out. */
export function cleanStyle(raw: unknown): ContentStyle {
  let o: Record<string, unknown> = {};
  try {
    const v = typeof raw === "string" ? JSON.parse(raw || "{}") : raw;
    if (v && typeof v === "object") o = v as Record<string, unknown>;
  } catch {}
  const s: ContentStyle = {};
  if (o.size === "s" || o.size === "m" || o.size === "l") s.size = o.size;
  if (o.size === "custom") {
    s.size = "custom";
    s.w = num(o.w, LIMITS.w) ?? SIZE_PRESETS.m.w;
    s.h = num(o.h, LIMITS.h) ?? SIZE_PRESETS.m.h;
  }
  if (o.fit === "whole" || o.fit === "fill") s.fit = o.fit;
  const fx = num(o.fx, [0, 100]), fy = num(o.fy, [0, 100]);
  if (fx !== undefined && fy !== undefined) { s.fx = fx; s.fy = fy; }
  const pic = num(o.pic, LIMITS.pic), text = num(o.text, LIMITS.text);
  if (pic !== undefined) s.pic = pic;
  if (text !== undefined) s.text = text;
  if (o.hide && typeof o.hide === "object") {
    const hide: ContentStyle["hide"] = {};
    for (const k of Object.keys(HIDE_LABELS) as HideKey[]) {
      const v = (o.hide as Record<string, unknown>)[k];
      if (typeof v === "boolean") hide[k] = v;
    }
    if (Object.keys(hide).length) s.hide = hide;
  }
  return s;
}

export const isCustom = (s: ContentStyle) => Object.keys(s).length > 0;

/** Later levels win, field by field. A size travels with its width and height, and a focus point as a pair. */
export function mergeStyles(...levels: (ContentStyle | undefined)[]): ContentStyle {
  const out: ContentStyle = {};
  for (const l of levels) {
    if (!l) continue;
    if (l.size) { out.size = l.size; out.w = l.w; out.h = l.h; }
    if (l.fit) out.fit = l.fit;
    if (l.fx !== undefined) { out.fx = l.fx; out.fy = l.fy; }
    if (l.pic !== undefined) out.pic = l.pic;
    if (l.text !== undefined) out.text = l.text;
    if (l.hide) out.hide = { ...out.hide, ...l.hide };
  }
  return out;
}

export type Look = { className: string; style: React.CSSProperties | undefined; hide: (k: HideKey) => boolean };

/** Turns a merged style into what goes on the card. Set once when the page is made, so it costs nothing while scrolling. */
export function lookOf(s: ContentStyle): Look {
  const vars: Record<string, string> = {};
  const preset = s.size && s.size !== "custom" ? SIZE_PRESETS[s.size] : null;
  const w = preset?.w ?? s.w, h = preset?.h ?? s.h;
  if (w) vars["--cw"] = `${w}px`;
  // never taller than most of the screen, whatever was asked for: the whole card must fit in view
  if (h) vars["--row-h"] = `min(${h}px, 72vh)`;
  if (s.pic !== undefined) {
    vars["--pic"] = (s.pic / 100).toFixed(2);
    vars["--post-h"] = `min(${s.pic * 8}px, 80vh)`;
  }
  if (s.text !== undefined) vars["--fs"] = (s.text / 100).toFixed(2);
  if (s.fx !== undefined) { vars["--fx"] = `${s.fx}%`; vars["--fy"] = `${s.fy}%`; }
  const classes = [h ? "sized" : "", s.fit === "fill" ? "fit-fill" : s.fit === "whole" ? "fit-whole" : ""].filter(Boolean).join(" ");
  return {
    className: classes ? ` ${classes}` : "",
    style: Object.keys(vars).length ? (vars as React.CSSProperties) : undefined,
    hide: (k) => s.hide?.[k] === true,
  };
}
