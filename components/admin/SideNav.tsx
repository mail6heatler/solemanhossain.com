"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { saveAdminNav } from "@/app/actions";

/*
 * The dashboard's left menu, arranged by the owner (2026-11-28, the owner asked): any page's link can be dragged anywhere in the menu,
 * across the dividers too, and the order is kept for every device (settings.adminNav, saved by saveAdminNav). A mouse drags after moving
 * 6px; a finger after resting 0.38 s on a link (so the menu still scrolls). The link follows the pointer as a lifted copy, the others make
 * room as it passes their middle, the menu scrolls itself near its ends, and Esc puts everything back. Pages added later (a new section)
 * take their usual place after their usual neighbour. "Usual order" brings back the order the dashboard comes with.
 * SideSizer is the handle on the menu's right edge: dragging it makes the menu wider or narrower, and everything in it (logo, words, icons)
 * grows or shrinks with it (`--side-w`, `--side-z` on <html>, kept per device in localStorage `lc_admin_side` and set before the first
 * paint by the dashboard layout's script).
 */
export type NavLink = { href: string; label: string; icon: string; hidden?: boolean; badge?: number };
export const DIV = "|";

/** the saved order applied to today's pages: unknown or repeated ones dropped, the dividers kept to the usual number, missing ones put after their usual neighbour */
export function arrange(saved: string[], def: string[]): string[] {
  if (!saved.length) return def;
  const have = new Set(def.filter((k) => k !== DIV)), seen = new Set<string>();
  const out = saved.filter((k) => { if (k === DIV) return true; if (!have.has(k) || seen.has(k)) return false; seen.add(k); return true; });
  const divs = def.filter((k) => k === DIV).length;
  let n = out.filter((k) => k === DIV).length;
  for (; n > divs; n--) out.splice(out.lastIndexOf(DIV), 1);
  for (; n < divs; n++) out.push(DIV);
  def.forEach((k, i) => {
    if (k === DIV || seen.has(k)) return;
    let j = i - 1;
    while (j >= 0 && (def[j] === DIV || !seen.has(def[j]))) j--;
    out.splice(j < 0 ? 0 : out.indexOf(def[j]) + 1, 0, k);
    seen.add(k);
  });
  return out;
}
/** where a link ("/admin/…") or a divider ("|2", the third divider) is in an order */
function indexOf(order: string[], key: string) {
  if (!key.startsWith(DIV)) return order.indexOf(key);
  let n = Number(key.slice(1));
  for (let i = 0; i < order.length; i++) if (order[i] === DIV && n-- === 0) return i;
  return -1;
}

export default function SideNav({ links, def, saved, isOn, tail }: { links: NavLink[]; def: string[]; saved: string[]; isOn: (href: string) => boolean; tail?: React.ReactNode }) {
  const byHref = new Map(links.map((l) => [l.href, l]));
  const [order, setOrder] = useState(() => arrange(saved, def));
  const [dragK, setDragK] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const navRef = useRef<HTMLElement>(null);
  const orderRef = useRef(order); orderRef.current = order;
  const busy = useRef(false), clickedAt = useRef(0), before = useRef<Map<string, DOMRect> | null>(null), noteT = useRef(0);
  const sig = `${def.join(",")}#${saved.join(",")}`;
  useEffect(() => { if (!busy.current) setOrder(arrange(saved, def)); }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps

  // the others glide into their new places (each from where it was a moment ago)
  useLayoutEffect(() => {
    const prev = before.current, nav = navRef.current;
    before.current = null;
    if (!prev || !nav || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    nav.querySelectorAll<HTMLElement>("[data-k]").forEach((el) => {
      const p = prev.get(el.dataset.k as string); if (!p) return;
      const r = el.getBoundingClientRect(), dx = p.left - r.left, dy = p.top - r.top;
      if (Math.abs(dx) + Math.abs(dy) > 0.5) el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 170, easing: "cubic-bezier(.2,.8,.2,1)" });
    });
  }, [order]);

  const say = (t: string) => { setNote(t); clearTimeout(noteT.current); noteT.current = window.setTimeout(() => setNote(""), 2600); };
  const keep = async (next: string[], done: string) => {
    say("Keeping the order…");
    const r = await saveAdminNav(next).catch(() => null);
    say(r?.ok ? done : "That didn't keep. Check your connection and drag again.");
  };
  const place = (next: string[]) => {
    const nav = navRef.current;
    if (nav) before.current = new Map([...nav.querySelectorAll<HTMLElement>("[data-k]")].map((el) => [el.dataset.k as string, el.getBoundingClientRect()]));
    orderRef.current = next; setOrder(next);
  };

  function down(e: React.PointerEvent) {
    if (e.button !== 0 || busy.current) return;
    const el = (e.target as Element).closest<HTMLElement>(".adm-item[data-k]"), nav = navRef.current;
    if (!el || !nav) return;
    const k = el.dataset.k as string, id = e.pointerId, touch = e.pointerType !== "mouse", sx = e.clientX, sy = e.clientY, from = orderRef.current;
    const navCs = getComputedStyle(nav), row = navCs.display === "flex" && navCs.flexDirection.startsWith("row");
    let live = false, timer = 0, raf = 0, ghost: HTMLElement | null = null, ox = 0, oy = 0, z = 1, x = sx, y = sy;

    const paintGhost = () => { if (ghost) ghost.style.transform = `translate(${x - ox}px, ${y - oy}px) scale(${z}) rotate(-1.5deg)`; };
    const begin = () => {
      live = true; busy.current = true;
      const r = el.getBoundingClientRect();
      z = el.offsetWidth ? r.width / el.offsetWidth : 1; ox = x - r.left; oy = y - r.top;
      ghost = el.cloneNode(true) as HTMLElement;
      ghost.classList.add("adm-ghost"); ghost.removeAttribute("data-k"); ghost.style.width = `${el.offsetWidth}px`;
      (el.closest(".adm") || document.body).appendChild(ghost);
      paintGhost();
      document.documentElement.classList.add("adm-sorting");
      setDragK(k);
      if (touch) navigator.vibrate?.(12);
      const roll = () => { // near the menu's ends it scrolls itself
        const r2 = nav.getBoundingClientRect(), edge = 40;
        const d = row ? (x < r2.left + edge ? -1 : x > r2.right - edge ? 1 : 0) : (y < r2.top + edge ? -1 : y > r2.bottom - edge ? 1 : 0);
        if (d) { if (row) nav.scrollLeft += d * 9; else nav.scrollTop += d * 9; aim(); }
        raf = requestAnimationFrame(roll);
      };
      raf = requestAnimationFrame(roll);
    };
    /** the link goes before or after whatever the pointer is over (by its middle), or to an end past the first or last */
    const aim = () => {
      const cur = orderRef.current, t = document.elementFromPoint(x, y)?.closest<HTMLElement>(".adm-nav [data-k]");
      let next: string[] | null = null;
      if (t && nav.contains(t) && t.dataset.k !== k) {
        const r = t.getBoundingClientRect(), after = row ? x > r.left + r.width / 2 : y > r.top + r.height / 2;
        next = cur.slice(); next.splice(next.indexOf(k), 1);
        const ti = indexOf(next, t.dataset.k as string);
        if (ti < 0) return;
        next.splice(after ? ti + 1 : ti, 0, k);
      } else if (!t) {
        const all = nav.querySelectorAll<HTMLElement>("[data-k]");
        if (!all.length) return;
        const first = all[0].getBoundingClientRect(), last = all[all.length - 1].getBoundingClientRect();
        const pastEnd = row ? x > last.right : y > last.bottom && y < nav.getBoundingClientRect().bottom, beforeStart = row ? x < first.left : y < first.top && y > nav.getBoundingClientRect().top;
        if (pastEnd) next = [...cur.filter((q) => q !== k), k];
        else if (beforeStart) next = [k, ...cur.filter((q) => q !== k)];
      }
      if (next && next.join() !== cur.join()) place(next);
    };
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      x = ev.clientX; y = ev.clientY;
      const far = Math.hypot(x - sx, y - sy);
      if (!live) {
        if (touch) { if (far > 10) end(false); return; }
        if (far < 6) return;
        begin();
      }
      ev.preventDefault();
      paintGhost(); aim();
    };
    const stopTouch = (ev: TouchEvent) => { if (live) ev.preventDefault(); }; // a finger dragging a link doesn't scroll the page
    const noMenu = (ev: Event) => ev.preventDefault(); // no "open link in new tab" menu from a long press
    const key = (ev: KeyboardEvent) => { if (ev.key === "Escape" && live) { place(from); end(false); } };
    const up = (ev: PointerEvent) => { if (ev.pointerId === id) end(ev.type === "pointerup"); };
    function end(drop: boolean) {
      clearTimeout(timer); cancelAnimationFrame(raf);
      removeEventListener("pointermove", move); removeEventListener("pointerup", up); removeEventListener("pointercancel", up);
      removeEventListener("touchmove", stopTouch); removeEventListener("keydown", key); el?.removeEventListener("contextmenu", noMenu);
      if (!live) return;
      clickedAt.current = Date.now(); // the click that follows a drop doesn't open the page
      ghost?.remove(); ghost = null; live = false; busy.current = false;
      document.documentElement.classList.remove("adm-sorting");
      setDragK(null);
      const now = orderRef.current;
      if (drop && now.join() !== from.join()) void keep(now, "Order kept on every device ✓");
      else if (!drop && now.join() !== from.join()) place(from);
    }
    addEventListener("pointermove", move, { passive: false });
    addEventListener("pointerup", up); addEventListener("pointercancel", up);
    addEventListener("touchmove", stopTouch, { passive: false });
    addEventListener("keydown", key);
    el.addEventListener("contextmenu", noMenu);
    if (touch) timer = window.setTimeout(begin, 380);
  }

  const custom = order.join() !== def.join();
  let d = 0;
  return (
    <nav ref={navRef} className={`adm-nav${dragK ? " sorting" : ""}`} onPointerDown={down}
      onClickCapture={(e) => { if (Date.now() - clickedAt.current < 450) { e.preventDefault(); e.stopPropagation(); } }}
      onDragStart={(e) => e.preventDefault()}>
      {order.map((k) => {
        if (k === DIV) { const dk = `${DIV}${d++}`; return <div key={dk} data-k={dk} className="adm-divider" />; }
        const l = byHref.get(k);
        return l ? <A key={k} l={l} on={isOn(k)} lifted={dragK === k} /> : null;
      })}
      {tail}
      {(custom || note) && (
        <div className="adm-navfoot">
          {note ? <span className="adm-navnote" role="status">{note}</span>
            : <button type="button" className="adm-navreset" onClick={() => { place(def); void keep([], "Usual order back ✓"); }} title="Put the menu back in the order the dashboard comes with"><i className="ti ti-arrow-back-up" />Usual order</button>}
        </div>
      )}
    </nav>
  );
}

function A({ l, on, lifted }: { l: NavLink; on: boolean; lifted: boolean }) {
  return (
    <a href={l.href} data-k={l.href} draggable={false} className={`adm-item ${on ? "on" : ""} ${l.hidden ? "hidden-sec" : ""} ${lifted ? "lifted" : ""}`} title={l.hidden ? "Hidden from the site · drag to move" : "Drag to move"}>
      <i className={`ti ti-${l.icon}`} />{l.label}{l.hidden && <i className="ti ti-eye-off" style={{ fontSize: 12 }} />}
      {!!l.badge && <span className="badge">{l.badge}</span>}
      {!l.badge && <i className="ti ti-grip-vertical grip" aria-hidden="true" />}
    </a>
  );
}

const SIDE = { min: 170, max: 400, base: 214 };
/** the handle on the menu's right edge: drag to make the menu wider or narrower, double-click for the usual width, or the arrow keys */
export function SideSizer() {
  const [w, setW] = useState(SIDE.base);
  useEffect(() => { setW(parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--side-w")) || SIDE.base); }, []);
  const apply = (v: number) => {
    const n = Math.round(Math.min(SIDE.max, Math.max(SIDE.min, v))), h = document.documentElement.style;
    h.setProperty("--side-w", `${n}px`); h.setProperty("--side-z", (n / SIDE.base).toFixed(4));
    return n;
  };
  const keep = (n: number) => { setW(n); try { if (n === SIDE.base) localStorage.removeItem("lc_admin_side"); else localStorage.setItem("lc_admin_side", String(n)); } catch {} };
  function down(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    const side = e.currentTarget.parentElement as HTMLElement, sx = e.clientX, sw = side.getBoundingClientRect().width;
    let n = sw, raf = 0, x = sx;
    e.currentTarget.setPointerCapture(e.pointerId);
    document.documentElement.classList.add("adm-resizing");
    const move = (ev: PointerEvent) => { x = ev.clientX; if (!raf) raf = requestAnimationFrame(() => { raf = 0; n = apply(sw + x - sx); }); };
    const up = () => {
      cancelAnimationFrame(raf); n = apply(sw + x - sx); keep(n);
      document.documentElement.classList.remove("adm-resizing");
      removeEventListener("pointermove", move); removeEventListener("pointerup", up); removeEventListener("pointercancel", up);
    };
    addEventListener("pointermove", move); addEventListener("pointerup", up); addEventListener("pointercancel", up);
  }
  return (
    <div className="adm-sizer" role="separator" aria-orientation="vertical" aria-label="Menu width" aria-valuemin={SIDE.min} aria-valuemax={SIDE.max} aria-valuenow={w} tabIndex={0}
      title="Drag to make the menu wider or narrower · double-click for the usual size"
      onPointerDown={down} onDoubleClick={() => keep(apply(SIDE.base))}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 40 : 10, v = e.key === "ArrowRight" ? w + step : e.key === "ArrowLeft" ? w - step : e.key === "Home" ? SIDE.min : e.key === "End" ? SIDE.max : null;
        if (v === null) return; e.preventDefault(); keep(apply(v));
      }}>
      <span className="adm-sizer-knob" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6" /></svg>
      </span>
    </div>
  );
}
