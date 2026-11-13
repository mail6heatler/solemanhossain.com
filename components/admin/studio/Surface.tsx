"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { REACTION_EMOJIS } from "@/lib/settings";
import type { TalkInfo } from "@/lib/talk";
import type { Comment } from "@/lib/data";
import { FV_COLS, FV_MAX_ROWS, FV_ROW, FV_ZOOM, type FvBox } from "@/lib/fullView";
import { PART_LIMITS, SIZED_PARTS, cleanPartSize, type PartSize, type PartSizes } from "@/lib/partSize";
import type { PartAttrs } from "@/components/site/cardParts";

type Mark = { key: string; n: number; x: number; y: number; w: number; h: number; tx: number; ty: number; tag: boolean; rs: boolean };
type Grip = { part: string; x: number; y: number; w: number; h: number };
type Pen = { x: number; y: number; w: number; h: number; css: React.CSSProperties };
type Tip = { x: number; y: number; text: string };
/** What's being typed straight onto the preview: which part, which of them if it shows twice, and its text. */
export type Typing = { key: string; n: number; value: string };
/** Which way a drag goes: the side edge (width), the bottom edge (height), the corner (everything in it, words included), or the move handle (its place). */
type Way = "w" | "h" | "z" | "m";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const r1 = (v: number) => Math.round(v * 2) / 2;
const SIZED: readonly string[] = SIZED_PARTS;
/** The box a part's width is a share of: the nearest one around it that isn't a run of words. */
const holder = (el: HTMLElement) => {
  let p = el.parentElement;
  while (p && /^(inline|contents)/.test(getComputedStyle(p).display)) p = p.parentElement;
  return p ?? el;
};
const sizeText = (s: PartSize | undefined, pic: boolean) =>
  [s?.w !== undefined ? `Width ${s.w}%` : "Full width", s?.h !== undefined ? `${pic ? "Height" : "Room"} ${s.h}px` : "", `Size ${s?.z ?? 100}%`, s?.x || s?.y ? `moved ${s.x ?? 0}, ${s.y ?? 0}` : ""].filter(Boolean).join(" · ");

/**
 * A live preview you can point at. Whatever is drawn inside carries `data-part` names (see NoteCard and EntryFull); this measures them and lays
 * labels and outlines over the top, so the preview itself stays exactly what visitors get. A click on a part reports it, nothing inside leads anywhere,
 * and a part being typed onto is covered by a text box in its own lettering.
 * `sizes` (a card) gives the part under the mouse, or the one being edited, a side edge, a bottom edge and a corner to drag. `blocks` (a full view) gives each
 * part a move handle as well, and the part follows the mouse exactly, then glides onto the page's fine grid when it's let go.
 */
export function Surface({ children, className = "", width, zoom = 1, labels, name, active, onPart, onOpen, typing, onType, onTypeEnd, sizes, onSize, blocks, blockName, onBlock, onBlockPick }: {
  children: React.ReactNode; className?: string; /** how wide it's drawn, when what's inside is zoomed and can't say */ width?: number; zoom?: number; labels: boolean; name: (key: string) => string; active?: string;
  onPart: (key: string, at: DOMRect, shown: string, n: number) => void; onOpen?: () => void;
  typing?: Typing | null; onType?: (value: string) => void; onTypeEnd?: () => void;
  sizes?: PartSizes; onSize?: (key: string, size: PartSize | undefined, stroke?: number) => void;
  blocks?: FvBox[]; blockName?: (part: string) => string; onBlock?: (part: string, box: FvBox) => void; onBlockPick?: (part: string, at: DOMRect) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [grips, setGrips] = useState<Grip[]>([]);
  const [pen, setPen] = useState<Pen | null>(null);
  const [hover, setHover] = useState("");
  const [dragging, setDragging] = useState("");
  const [tip, setTip] = useState<Tip | null>(null);
  const sig = useRef("");
  const hidden = useRef<HTMLElement | null>(null);
  /** a full view part that was just let go: where it was, so it can glide to where the grid puts it */
  const settle = useRef<{ part: string; from: DOMRect; z: number } | null>(null);
  const typeKey = typing ? `${typing.key}:${typing.n}` : "";
  // what the next measuring needs, kept current without setting its listeners up again on every draw
  const now = useRef({ name, blocks, typing, zoom, sizes });
  now.current = { name, blocks, typing, zoom, sizes };

  const measure = useCallback(() => {
    const el = root.current;
    if (!el) return;
    const { name, blocks, typing, zoom, sizes } = now.current;
    const base = el.getBoundingClientRect();
    const out: Mark[] = [], seen: Record<string, number> = {}, chips: { x: number; y: number; w: number }[] = [];
    el.querySelectorAll<HTMLElement>(".stu-inner [data-part]").forEach((p) => {
      const key = p.dataset.part!;
      const n = (seen[key] = (seen[key] ?? 0) + 1) - 1;
      const r = p.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return;
      let top = r.top, bottom = r.bottom;
      const box = p.closest(".scrolly");
      if (box) { const s = box.getBoundingClientRect(); top = Math.max(top, s.top); bottom = Math.min(bottom, s.bottom); if (bottom - top < 8) return; }
      const rs = !!sizes && SIZED.includes(key) && !p.hasAttribute("data-fixed");
      const m: Mark = { key, n, x: r1(r.left - base.left), y: r1(top - base.top), w: r1(r.width), h: r1(bottom - top), tx: 0, ty: 0, tag: true, rs };
      // its label sits on its top-left corner; one that would land on another moves along, and one with no room is left to the outline
      const w = name(key).length * 6.2 + 12;
      let tx = Math.max(0, m.x + 4);
      const ty = top > r.top ? m.y + 2 : m.y - 8;
      for (let t = 0; t < 5; t++) {
        const hit = chips.find((c) => Math.abs(c.y - ty) < 14 && tx < c.x + c.w + 3 && tx + w + 3 > c.x);
        if (!hit) break;
        tx = hit.x + hit.w + 4;
      }
      if (tx + w > base.width + 2 || chips.some((c) => Math.abs(c.y - ty) < 14 && tx < c.x + c.w + 3 && tx + w + 3 > c.x)) m.tag = false;
      else chips.push({ x: tx, y: ty, w });
      m.tx = r1(tx); m.ty = r1(ty);
      out.push(m);
    });
    const gs: Grip[] = [];
    const grid = el.querySelector<HTMLElement>(".fv-grid");
    if (blocks && grid && getComputedStyle(grid).display === "grid")
      el.querySelectorAll<HTMLElement>("[data-fv]").forEach((b) => { const r = b.getBoundingClientRect(); gs.push({ part: b.dataset.fv!, x: r1(r.left - base.left), y: r1(r.top - base.top), w: r1(r.width), h: r1(r.height) }); });
    // the part being typed onto: its place and its lettering, for the text box that covers it
    let p: Pen | null = null;
    if (hidden.current && (!typing || !hidden.current.isConnected)) { hidden.current.style.visibility = ""; hidden.current = null; }
    if (typing) {
      const t = el.querySelectorAll<HTMLElement>(`.stu-inner [data-part="${typing.key}"]`)[typing.n];
      if (t) {
        if (hidden.current !== t) { if (hidden.current) hidden.current.style.visibility = ""; t.style.visibility = "hidden"; hidden.current = t; }
        const r = t.getBoundingClientRect(), cs = getComputedStyle(t);
        // the part's own size (its corner) scales its letters too
        const k = zoom * (parseFloat(cs.zoom) || 1);
        const size = parseFloat(cs.fontSize) * k, line = cs.lineHeight === "normal" ? size * 1.25 : parseFloat(cs.lineHeight) * k;
        const block = cs.display !== "inline" && cs.display !== "inline-flex" && cs.display !== "inline-block" && r.width > 120;
        p = {
          x: r1(r.left - base.left), y: r1(r.top - base.top), w: r1(block ? r.width : Math.max(r.width + 28, 110)), h: r1(Math.max(r.height, line)),
          css: { fontFamily: cs.fontFamily, fontSize: size, fontWeight: cs.fontWeight as React.CSSProperties["fontWeight"], fontStyle: cs.fontStyle, lineHeight: `${line}px`, letterSpacing: cs.letterSpacing,
            textAlign: cs.textAlign as React.CSSProperties["textAlign"], textTransform: cs.textTransform as React.CSSProperties["textTransform"], color: cs.color,
            padding: `${parseFloat(cs.paddingTop) * k}px ${parseFloat(cs.paddingRight) * k}px ${parseFloat(cs.paddingBottom) * k}px ${parseFloat(cs.paddingLeft) * k}px` },
        };
      }
    }
    const next = JSON.stringify([out, gs, p]);
    if (next !== sig.current) { sig.current = next; setMarks(out); setGrips(gs); setPen(p); }
  }, []);

  /** A full view part that was let go glides from where the mouse left it to where the grid puts it. Safe to call twice. */
  const glide = useCallback(() => {
    const s = settle.current, el = root.current;
    if (!s || !el) return;
    settle.current = null;
    const blk = el.querySelector<HTMLElement>(`[data-fv="${s.part}"]`);
    if (!blk) return;
    blk.style.translate = ""; blk.style.width = ""; blk.style.height = "";
    blk.classList.remove("stu-held");
    const inner = blk.querySelector<HTMLElement>(".fv-z");
    if (inner) inner.style.zoom = s.z !== 100 ? String(s.z / 100) : "";
    const to = blk.getBoundingClientRect(), z = now.current.zoom;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    blk.animate([
      { translate: `${(s.from.left - to.left) / z}px ${(s.from.top - to.top) / z}px`, width: `${s.from.width / z}px`, height: `${s.from.height / z}px` },
      { translate: "0px 0px", width: `${to.width / z}px`, height: `${to.height / z}px` },
    ], { duration: 280, easing: "cubic-bezier(.2,.8,.2,1)" }).onfinish = () => requestAnimationFrame(measure);
  }, [measure]);

  // after every draw, and whenever something inside moves without one: a card scrolling, a picture arriving, the window changing
  useLayoutEffect(() => { glide(); measure(); });
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let frame = 0;
    const soon = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const watch = new ResizeObserver(soon);
    watch.observe(el);
    const inner = el.querySelector(".stu-inner");
    if (inner) watch.observe(inner);
    el.addEventListener("scroll", soon, true);
    el.addEventListener("load", soon, true);
    el.addEventListener("animationend", soon, true);
    el.addEventListener("transitionend", soon, true);
    window.addEventListener("resize", soon);
    document.addEventListener("scroll", soon, true);
    const timers = [200, 700, 1600].map((ms) => setTimeout(soon, ms));
    return () => { cancelAnimationFrame(frame); watch.disconnect(); el.removeEventListener("scroll", soon, true); el.removeEventListener("load", soon, true); el.removeEventListener("animationend", soon, true); el.removeEventListener("transitionend", soon, true); window.removeEventListener("resize", soon); document.removeEventListener("scroll", soon, true); timers.forEach(clearTimeout); };
  }, [measure]);
  useEffect(() => () => { if (hidden.current) hidden.current.style.visibility = ""; }, []);

  const pick = (p: HTMLElement) => {
    const key = p.dataset.part!;
    const all = Array.from(root.current!.querySelectorAll<HTMLElement>(`.stu-inner [data-part="${key}"]`));
    onPart(key, p.getBoundingClientRect(), (p.textContent ?? "").trim(), Math.max(0, all.indexOf(p)));
  };
  // nothing in a preview leads anywhere: a click only says which part was meant
  const click = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest(".stu-over")) return;
    e.preventDefault();
    e.stopPropagation();
    const p = t.closest<HTMLElement>("[data-part]");
    if (!p) return;
    if (p.dataset.part === "open") onOpen?.(); else pick(p);
  };
  const tagClick = (m: Mark) => {
    const p = root.current?.querySelectorAll<HTMLElement>(`.stu-inner [data-part="${m.key}"]`)[m.n];
    if (p) pick(p);
  };
  // which part the mouse is over, for its handles; moving onto a handle keeps it
  const point = (e: React.PointerEvent) => {
    if (!sizes || dragging || e.pointerType === "touch") return;
    const t = e.target as HTMLElement;
    if (t.closest(".stu-over")) return;
    const p = t.closest<HTMLElement>(".stu-inner [data-part]");
    let id = "";
    if (p && SIZED.includes(p.dataset.part!)) {
      const all = Array.from(root.current!.querySelectorAll<HTMLElement>(`.stu-inner [data-part="${p.dataset.part}"]`));
      id = `${p.dataset.part}:${all.indexOf(p)}`;
    }
    if (id !== hover) setHover(id);
  };
  const follow = (fn: (m: PointerEvent) => void, done: (moved: boolean) => void) => {
    let moved = false;
    const move = (m: PointerEvent) => { moved = true; fn(m); };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); done(moved); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  // ----- a card's part: its side edge, bottom edge or corner, followed to the pixel -----
  const sizePart = (e: React.PointerEvent, m: Mark, way: Way) => {
    const el = root.current?.querySelectorAll<HTMLElement>(`.stu-inner [data-part="${m.key}"]`)[m.n];
    if (!el || !onSize) return;
    e.preventDefault();
    e.stopPropagation();
    const r = el.getBoundingClientRect(), room = holder(el).getBoundingClientRect().width;
    const s0: PartSize = { ...(sizes?.[m.key] ?? {}) }, z0 = (s0.z ?? 100) / 100, x0 = e.clientX, y0 = e.clientY, pic = m.key === "pic";
    let frame = 0;
    const stroke = Date.now(); // one drag, one step to undo
    setDragging(`${m.key}:${m.n}`);
    follow((ev) => {
      const dx = ev.clientX - x0, dy = ev.clientY - y0, n: PartSize = { ...s0 };
      if (way === "w") n.w = Math.round(clamp(((r.width + dx) / room) * 100, PART_LIMITS.w[0], 100) * 2) / 2;
      if (way === "h") n.h = Math.round(clamp((r.height + dy) / (zoom * z0), PART_LIMITS.h[0], PART_LIMITS.h[1]));
      if (way === "z") n.z = Math.round(clamp(z0 * Math.max(0.1, ((r.width + dx) / r.width + (r.height + dy) / r.height) / 2) * 100, PART_LIMITS.z[0], PART_LIMITS.z[1]));
      // a move is counted in the card's own pixels, so it lands where it's dropped whatever the preview's zoom
      if (way === "m") { n.x = Math.round(clamp((s0.x ?? 0) + dx / zoom, PART_LIMITS.x[0], PART_LIMITS.x[1])); n.y = Math.round(clamp((s0.y ?? 0) + dy / zoom, PART_LIMITS.y[0], PART_LIMITS.y[1])); }
      const s = cleanPartSize(n);
      setTip({ x: ev.clientX, y: ev.clientY, text: sizeText(s, pic) });
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => onSize(m.key, s, stroke));
    }, () => { setDragging(""); setTip(null); });
  };
  // a double click on a handle puts that one back
  const unsize = (m: Mark, way: Way) => {
    if (!onSize) return;
    const s = { ...(sizes?.[m.key] ?? {}) };
    if (way === "m") { delete s.x; delete s.y; } else delete s[way];
    onSize(m.key, cleanPartSize(s), Date.now());
  };

  // ----- a full view's part: it follows the mouse exactly, then glides onto the grid when let go -----
  const grab = (e: React.PointerEvent, g: Grip, mode: "move" | Exclude<Way, "m">) => {
    const el = root.current, grid = el?.querySelector<HTMLElement>(".fv-grid"), blk = el?.querySelector<HTMLElement>(`[data-fv="${g.part}"]`), start = blocks?.find((b) => b.part === g.part);
    if (!grid || !blk || !start || !onBlock) return;
    e.preventDefault();
    e.stopPropagation();
    const col = grid.getBoundingClientRect().width / FV_COLS, row = FV_ROW * zoom, r = blk.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY;
    const inner = blk.querySelector<HTMLElement>(".fv-z"), at = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let box = start, frame = 0;
    const f = (dx: number, dy: number) => clamp(((r.width + dx) / r.width + (r.height + dy) / r.height) / 2, FV_ZOOM[0] / start.z, FV_ZOOM[1] / start.z);
    setDragging(g.part);
    follow((ev) => {
      const dx = ev.clientX - x0, dy = ev.clientY - y0;
      blk.classList.add("stu-held");
      if (mode === "move") {
        blk.style.translate = `${dx / zoom}px ${dy / zoom}px`;
        box = { ...start, x: clamp(Math.round(start.x + dx / col), 0, FV_COLS - start.w), y: clamp(Math.round(start.y + dy / row), 0, FV_MAX_ROWS) };
      } else if (mode === "w") {
        const w = Math.max(col * 4, r.width + dx);
        blk.style.width = `${w / zoom}px`;
        box = { ...start, w: clamp(Math.round(w / col), 4, FV_COLS - start.x) };
      } else if (mode === "h") {
        const h = Math.max(row * 2, r.height + dy);
        blk.style.height = `${h / zoom}px`;
        box = { ...start, h: clamp(Math.round(h / row), 2, 200) };
      } else {
        const k = f(dx, dy);
        blk.style.width = `${(r.width * k) / zoom}px`;
        blk.style.height = `${(r.height * k) / zoom}px`;
        if (inner) inner.style.zoom = String((start.z / 100) * k);
        box = { ...start, w: clamp(Math.round((start.w * k)), 4, FV_COLS - start.x), h: clamp(Math.round(start.h * k), 2, 200), z: Math.round(start.z * k) };
      }
      const name = blockName?.(g.part) ?? g.part;
      setTip({ x: ev.clientX, y: ev.clientY, text: mode === "move" ? `${name} · column ${box.x + 1}` : `${name} · ${Math.round((box.w / FV_COLS) * 100)}% wide${mode === "z" ? ` · size ${box.z}%` : ""}` });
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    }, (moved) => {
      setDragging("");
      setTip(null);
      if (!moved) { blk.classList.remove("stu-held"); if (mode === "move") onBlockPick?.(g.part, at); return; }
      settle.current = { part: g.part, from: blk.getBoundingClientRect(), z: box.z };
      onBlock(g.part, box);
      requestAnimationFrame(glide); // in case nothing changed and there's no new draw to do it
    });
  };
  const resetBlock = (g: Grip, way: Way) => {
    const start = blocks?.find((b) => b.part === g.part);
    if (!start || !onBlock) return;
    if (way === "z") onBlock(g.part, { ...start, z: 100 });
  };

  const handles = (left: number, top: number, w: number, h: number, on: (e: React.PointerEvent, way: Way) => void, off: (way: Way) => void, what: string, movable = false) => (
    <>
      {movable && <button type="button" className="stu-grip" style={{ left: left + w / 2 - 11, top: top - 11 }} title="Drag to move it anywhere. Double-click to put it back."
        aria-label={`Move ${what}`} onPointerDown={(e) => on(e, "m")} onDoubleClick={() => off("m")}><i className="ti ti-arrows-move" aria-hidden /></button>}
      <button type="button" className="stu-edge ew" style={{ left: left + w - 5, top: top + h / 2 - 13, height: Math.min(26, Math.max(12, h - 6)) }} title="Drag the side for more room. The words keep their size. Double-click to put it back."
        aria-label={`Width of ${what}`} onPointerDown={(e) => on(e, "w")} onDoubleClick={() => off("w")} />
      <button type="button" className="stu-edge ns" style={{ left: left + w / 2 - 13, top: top + h - 5, width: Math.min(26, Math.max(12, w - 6)) }} title="Drag the bottom for more room. The words keep their size. Double-click to put it back."
        aria-label={`Height of ${what}`} onPointerDown={(e) => on(e, "h")} onDoubleClick={() => off("h")} />
      <button type="button" className="stu-corner2" style={{ left: left + w - 7, top: top + h - 7 }} title="Drag the corner to make everything in it bigger or smaller, words too. Double-click to put it back."
        aria-label={`Size of everything in ${what}`} onPointerDown={(e) => on(e, "z")} onDoubleClick={() => off("z")} />
    </>
  );

  return (
    <div ref={root} className={`stu-surface ${className}${dragging ? " sizing" : ""}`} style={width ? { width } : undefined} onClickCapture={click} onDragStartCapture={(e) => e.preventDefault()}
      onPointerMove={point} onPointerLeave={() => { if (!dragging) setHover(""); }}>
      <div className="stu-inner" style={zoom !== 1 ? { zoom } : undefined}>{children}</div>
      <div className={`stu-over${labels ? "" : " quiet"}`}>
        {marks.map((m) => <i key={`${m.key}${m.n}`} className={`stu-box${active === m.key ? " on" : ""}${dragging === `${m.key}:${m.n}` ? " sizing" : ""}`} style={{ left: m.x, top: m.y, width: m.w, height: m.h }} />)}
        {grips.map((g) => (
          <span key={g.part}>
            <i className={`stu-blk${dragging === g.part ? " held" : ""}`} style={{ left: g.x, top: g.y, width: g.w, height: g.h }} />
            <button type="button" className="stu-move" style={{ left: g.x + g.w - 6, top: g.y - 11 }} title="Drag to move it anywhere. Click for its options." onPointerDown={(e) => grab(e, g, "move")}><i className="ti ti-arrows-move" aria-hidden />{blockName?.(g.part)}</button>
            {handles(g.x, g.y, g.w, g.h, (e, way) => { if (way !== "m") grab(e, g, way); }, (way) => resetBlock(g, way), blockName?.(g.part) ?? g.part)}
          </span>
        ))}
        {labels && marks.filter((m) => m.tag).map((m) => (
          <button key={`${m.key}${m.n}`} type="button" className={`stu-tag${active === m.key ? " on" : ""}`} style={{ left: m.tx, top: m.ty }} onClick={() => tagClick(m)}>{name(m.key)}</button>
        ))}
        {sizes && !typing && marks.filter((m) => m.rs && (dragging ? dragging === `${m.key}:${m.n}` : hover === `${m.key}:${m.n}` || (active === m.key && m.n === 0))).map((m) => (
          <span key={`h${m.key}${m.n}`}>{handles(m.x, m.y, m.w, m.h, (e, way) => sizePart(e, m, way), (way) => unsize(m, way), name(m.key), true)}</span>
        ))}
        {typing && pen && (
          <textarea key={typeKey} className="stu-type" autoFocus value={typing.value} style={{ left: pen.x, top: pen.y, width: pen.w, height: pen.h, ...pen.css }} aria-label={name(typing.key)}
            onFocus={(e) => { const n = e.currentTarget.value.length; e.currentTarget.setSelectionRange(n, n); }}
            onChange={(e) => onType?.(e.target.value.replace(/\n/g, " "))} onBlur={() => onTypeEnd?.()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); onTypeEnd?.(); } }} />
        )}
      </div>
      {tip && <span className="stu-tip" style={{ left: tip.x + 16, top: tip.y + 18 }}>{tip.text}</span>}
    </div>
  );
}

/**
 * The reaction bar as visitors see it, standing still: the dashboard has nobody to react as. The switches in `talk` change it the same way they change
 * the real one (Reactions.tsx): the total, the crown, Share and comments.
 */
export function StillReacts({ counts, talk, compact, comments, owner, attrs }: { counts: Record<string, number>; talk: TalkInfo; compact?: boolean; comments: Comment[]; owner: string; attrs?: { bar?: PartAttrs; talk?: PartAttrs } }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const ranked = REACTION_EMOJIS.map((e) => counts[e] ?? 0).sort((a, b) => b - a);
  const crowned = talk.top && ranked[0] > (ranked[1] ?? 0) ? REACTION_EMOJIS.find((e) => (counts[e] ?? 0) === ranked[0]) : undefined;
  const shown = comments.filter((c) => !c.hidden);
  return (
    <>
      <div className={`reacts${compact ? " mini" : ""}`} data-part="reacts" {...attrs?.bar}>
        {REACTION_EMOJIS.map((e) => {
          const n = counts[e] ?? 0;
          return <button key={e} type="button" tabIndex={-1} className={`${n === 0 ? "zero" : ""}${e === crowned ? " top" : ""}`}><span className="e">{e}</span><span className="n">{n > 0 ? n : ""}</span></button>;
        })}
        {talk.total && total > 0 && <span className="r-total">{compact ? `· ${total}` : `${total} reaction${total === 1 ? "" : "s"}`}</span>}
        {talk.share && <button type="button" tabIndex={-1} className="r-share"><i className="ti ti-share" aria-hidden />{!compact && <span>Share</span>}</button>}
      </div>
      {talk.comments && (compact ? (
        <div className="talk-row" data-part="comments" {...attrs?.talk}>
          <button type="button" tabIndex={-1} className="talk-count"><i className="ti ti-message-circle" aria-hidden />{shown.length > 0 && <b>{shown.length}</b>}</button>
          <div className="talk-say"><input type="text" readOnly tabIndex={-1} placeholder="Say something…" /><button type="button" tabIndex={-1} className="talk-send" disabled><i className="ti ti-send" aria-hidden /></button></div>
        </div>
      ) : (
        <div className="talk-panel" data-part="comments" {...attrs?.talk}>
          <div className="talk-say big"><textarea readOnly tabIndex={-1} rows={2} placeholder="Say something…" /><button type="button" tabIndex={-1} className="talk-send" disabled><i className="ti ti-send" aria-hidden /></button></div>
          <ul className="talk-list">
            {shown.length === 0 && <li className="talk-none">Nobody has said anything yet. Be the first!</li>}
            {shown.map((c) => (
              <li key={c.id} className={`talk-c${c.pinned && talk.replies ? " pinned" : ""}`}>
                <div className="talk-who"><b>{c.name}</b>{c.pinned && talk.replies && <span className="talk-pin"><i className="ti ti-pin" aria-hidden /> Pinned</span>}</div>
                <p>{c.body}</p>
                {c.reply && talk.replies && <div className="talk-reply"><b>{owner} replied</b><p>{c.reply}</p></div>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
