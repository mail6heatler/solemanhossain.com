"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { REACTION_EMOJIS } from "@/lib/settings";
import type { TalkInfo } from "@/lib/talk";
import type { Comment } from "@/lib/data";
import type { FvBox } from "@/lib/fullView";

type Mark = { key: string; n: number; x: number; y: number; w: number; h: number; tx: number; ty: number; tag: boolean };
type Grip = { part: string; x: number; y: number; w: number; h: number };
type Pen = { x: number; y: number; w: number; h: number; css: React.CSSProperties };
/** What's being typed straight onto the preview: which part, which of them if it shows twice, and its text. */
export type Typing = { key: string; n: number; value: string };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const r1 = (v: number) => Math.round(v * 2) / 2;

/**
 * A live preview you can point at. Whatever is drawn inside carries `data-part` names (see NoteCard and EntryFull); this measures them and lays
 * labels and outlines over the top, so the preview itself stays exactly what visitors get. A click on a part reports it, nothing inside leads anywhere,
 * and a part being typed onto is covered by a text box in its own lettering. `blocks` adds a move handle and a resize corner to a full view's parts.
 */
export function Surface({ children, className = "", width, zoom = 1, labels, name, active, onPart, onOpen, typing, onType, onTypeEnd, blocks, blockName, onBlock, onBlockPick }: {
  children: React.ReactNode; className?: string; /** how wide it's drawn, when what's inside is zoomed and can't say */ width?: number; zoom?: number; labels: boolean; name: (key: string) => string; active?: string;
  onPart: (key: string, at: DOMRect, shown: string, n: number) => void; onOpen?: () => void;
  typing?: Typing | null; onType?: (value: string) => void; onTypeEnd?: () => void;
  blocks?: FvBox[]; blockName?: (part: string) => string; onBlock?: (part: string, box: FvBox) => void; onBlockPick?: (part: string, at: DOMRect) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [grips, setGrips] = useState<Grip[]>([]);
  const [pen, setPen] = useState<Pen | null>(null);
  const sig = useRef("");
  const hidden = useRef<HTMLElement | null>(null);
  const typeKey = typing ? `${typing.key}:${typing.n}` : "";
  // what the next measuring needs, kept current without setting its listeners up again on every draw
  const now = useRef({ name, blocks, typing, zoom });
  now.current = { name, blocks, typing, zoom };

  const measure = useCallback(() => {
    const el = root.current;
    if (!el) return;
    const { name, blocks, typing, zoom } = now.current;
    const base = el.getBoundingClientRect();
    const out: Mark[] = [], seen: Record<string, number> = {}, chips: { x: number; y: number; w: number }[] = [];
    el.querySelectorAll<HTMLElement>(".stu-inner [data-part]").forEach((p) => {
      const key = p.dataset.part!;
      if (key === "open") return;
      const n = (seen[key] = (seen[key] ?? 0) + 1) - 1;
      const r = p.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return;
      let top = r.top, bottom = r.bottom;
      const box = p.closest(".scrolly");
      if (box) { const s = box.getBoundingClientRect(); top = Math.max(top, s.top); bottom = Math.min(bottom, s.bottom); if (bottom - top < 8) return; }
      const m: Mark = { key, n, x: r1(r.left - base.left), y: r1(top - base.top), w: r1(r.width), h: r1(bottom - top), tx: 0, ty: 0, tag: true };
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
        const size = parseFloat(cs.fontSize) * zoom, line = cs.lineHeight === "normal" ? size * 1.25 : parseFloat(cs.lineHeight) * zoom;
        const block = cs.display !== "inline" && cs.display !== "inline-flex" && cs.display !== "inline-block" && r.width > 120;
        p = {
          x: r1(r.left - base.left), y: r1(r.top - base.top), w: r1(block ? r.width : Math.max(r.width + 28, 110)), h: r1(Math.max(r.height, line)),
          css: { fontFamily: cs.fontFamily, fontSize: size, fontWeight: cs.fontWeight as React.CSSProperties["fontWeight"], fontStyle: cs.fontStyle, lineHeight: `${line}px`, letterSpacing: cs.letterSpacing,
            textAlign: cs.textAlign as React.CSSProperties["textAlign"], textTransform: cs.textTransform as React.CSSProperties["textTransform"], color: cs.color,
            padding: `${parseFloat(cs.paddingTop) * zoom}px ${parseFloat(cs.paddingRight) * zoom}px ${parseFloat(cs.paddingBottom) * zoom}px ${parseFloat(cs.paddingLeft) * zoom}px` },
        };
      }
    }
    const next = JSON.stringify([out, gs, p]);
    if (next !== sig.current) { sig.current = next; setMarks(out); setGrips(gs); setPen(p); }
  }, []);

  // after every draw, and whenever something inside moves without one: a card scrolling, a picture arriving, the window changing
  useLayoutEffect(() => { measure(); });
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

  // a full view's part: drag its handle to move it, its corner to resize it, on the page's 12 columns
  const grab = (e: React.PointerEvent, g: Grip, mode: "move" | "size") => {
    const grid = root.current?.querySelector<HTMLElement>(".fv-grid"), start = blocks?.find((b) => b.part === g.part);
    if (!grid || !start || !onBlock) return;
    e.preventDefault();
    e.stopPropagation();
    const gr = grid.getBoundingClientRect(), gap = 22 * zoom, col = (gr.width - 11 * gap) / 12 + gap, row = 40 * zoom, x0 = e.clientX, y0 = e.clientY;
    const at = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let moved = false;
    const move = (m: PointerEvent) => {
      const dx = Math.round((m.clientX - x0) / col), dy = Math.round((m.clientY - y0) / row);
      if (!moved && !dx && !dy) return;
      moved = true;
      onBlock(g.part, mode === "move"
        ? { ...start, x: clamp(start.x + dx, 0, 12 - start.w), y: clamp(start.y + dy, 0, 60) }
        : { ...start, w: clamp(start.w + dx, 2, 12 - start.x), h: clamp(start.h + dy, 1, 30) });
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); if (!moved && mode === "move") onBlockPick?.(g.part, at); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  return (
    <div ref={root} className={`stu-surface ${className}`} style={width ? { width } : undefined} onClickCapture={click} onDragStartCapture={(e) => e.preventDefault()}>
      <div className="stu-inner" style={zoom !== 1 ? { zoom } : undefined}>{children}</div>
      <div className={`stu-over${labels ? "" : " quiet"}`}>
        {marks.map((m) => <i key={`${m.key}${m.n}`} className={`stu-box${active === m.key ? " on" : ""}`} style={{ left: m.x, top: m.y, width: m.w, height: m.h }} />)}
        {grips.map((g) => (
          <span key={g.part}>
            <i className="stu-blk" style={{ left: g.x, top: g.y, width: g.w, height: g.h }} />
            <button type="button" className="stu-move" style={{ left: g.x + g.w - 6, top: g.y - 11 }} title="Drag to move it anywhere. Click for its options." onPointerDown={(e) => grab(e, g, "move")}><i className="ti ti-arrows-move" aria-hidden />{blockName?.(g.part)}</button>
            <button type="button" className="stu-size" style={{ left: g.x + g.w - 14, top: g.y + g.h - 14 }} title="Drag to resize" aria-label={`Resize ${blockName?.(g.part) ?? g.part}`} onPointerDown={(e) => grab(e, g, "size")} />
          </span>
        ))}
        {labels && marks.filter((m) => m.tag).map((m) => (
          <button key={`${m.key}${m.n}`} type="button" className={`stu-tag${active === m.key ? " on" : ""}`} style={{ left: m.tx, top: m.ty }} onClick={() => tagClick(m)}>{name(m.key)}</button>
        ))}
        {typing && pen && (
          <textarea key={typeKey} className="stu-type" autoFocus value={typing.value} style={{ left: pen.x, top: pen.y, width: pen.w, height: pen.h, ...pen.css }} aria-label={name(typing.key)}
            onFocus={(e) => { const n = e.currentTarget.value.length; e.currentTarget.setSelectionRange(n, n); }}
            onChange={(e) => onType?.(e.target.value.replace(/\n/g, " "))} onBlur={() => onTypeEnd?.()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); onTypeEnd?.(); } }} />
        )}
      </div>
    </div>
  );
}

/**
 * The reaction bar as visitors see it, standing still: the dashboard has nobody to react as. The switches in `talk` change it the same way they change
 * the real one (Reactions.tsx): the total, the crown, Share and comments.
 */
export function StillReacts({ counts, talk, compact, comments, owner }: { counts: Record<string, number>; talk: TalkInfo; compact?: boolean; comments: Comment[]; owner: string }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const ranked = REACTION_EMOJIS.map((e) => counts[e] ?? 0).sort((a, b) => b - a);
  const crowned = talk.top && ranked[0] > (ranked[1] ?? 0) ? REACTION_EMOJIS.find((e) => (counts[e] ?? 0) === ranked[0]) : undefined;
  const shown = comments.filter((c) => !c.hidden);
  return (
    <>
      <div className={`reacts${compact ? " mini" : ""}`} data-part="reacts">
        {REACTION_EMOJIS.map((e) => {
          const n = counts[e] ?? 0;
          return <button key={e} type="button" tabIndex={-1} className={`${n === 0 ? "zero" : ""}${e === crowned ? " top" : ""}`}><span className="e">{e}</span><span className="n">{n > 0 ? n : ""}</span></button>;
        })}
        {talk.total && total > 0 && <span className="r-total">{compact ? `· ${total}` : `${total} reaction${total === 1 ? "" : "s"}`}</span>}
        {talk.share && <button type="button" tabIndex={-1} className="r-share"><i className="ti ti-share" aria-hidden />{!compact && <span>Share</span>}</button>}
      </div>
      {talk.comments && (compact ? (
        <div className="talk-row" data-part="reacts">
          <button type="button" tabIndex={-1} className="talk-count"><i className="ti ti-message-circle" aria-hidden />{shown.length > 0 && <b>{shown.length}</b>}</button>
          <div className="talk-say"><input type="text" readOnly tabIndex={-1} placeholder="Say something…" /><button type="button" tabIndex={-1} className="talk-send" disabled><i className="ti ti-send" aria-hidden /></button></div>
        </div>
      ) : (
        <div className="talk-panel" data-part="reacts">
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
