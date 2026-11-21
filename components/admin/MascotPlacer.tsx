"use client";
import { useMemo, useRef, useState } from "react";
import { MZ_JEANS, MZ_SHIRTS, type MascotSettings, type MzPos } from "@/lib/mascot";
import { lookVars, mascotStill } from "@/components/site/mascotRig";

type Dev = "desk" | "phone";
/* the screens he's drawn on, in the site's own pixels: a laptop, and a phone without its bottom bar */
const REF: Record<Dev, { w: number; h: number; mz: number }> = { desk: { w: 1440, h: 860, mz: 150 }, phone: { w: 390, h: 740, mz: 96 } };
const round = (n: number) => Math.round(n * 10) / 10;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * "Where he stands" on the Mascot page (the owner's ask, 2026-11-21): a computer screen and a phone screen, each with a small
 * Mini Shourobh to drag wherever he should live. The spot is stored as percentages (settings.mascot.pos), so it fits any screen
 * of that kind; the phone screen shows the site's phone menu, because on the site he steps off the round menu button by himself.
 */
export default function MascotPlacer({ d, onPos, phoneMenu, bbar }: { d: MascotSettings; onPos: (dev: Dev, p: MzPos | null) => void; phoneMenu: string; bbar: boolean }) {
  const [dev, setDev] = useState<Dev>("desk");
  const [live, setLive] = useState<MzPos | null>(null);
  const screen = useRef<HTMLDivElement>(null);
  const grab = useRef<{ id: number; ox: number; oy: number } | null>(null);
  const svg = useMemo(() => mascotStill(), []);
  const vars = useMemo(() => lookVars(d, MZ_SHIRTS, MZ_JEANS), [d]);
  const R = REF[dev], wPct = ((d.size / 100) * R.mz / R.w) * 100, half = wPct / 2;
  const corner = (right: boolean): MzPos => ({ x: round(right ? 100 - half - (12 / R.w) * 100 : half + (12 / R.w) * 100), y: 0 });
  const saved = d.pos[dev], at = live || saved || corner(d.side === "right");
  const right = at.x > 50, orb = dev === "phone" && phoneMenu === "orb", sheet = dev === "phone" && phoneMenu === "sheet", bar = dev === "phone" && phoneMenu === "bottom" && bbar;
  const onOrb = orb && at.x + half > 100 - ((16 + 58 + 6) / R.w) * 100 && at.y < 12;

  const spot = (cx: number, cy: number): MzPos => {
    const r = screen.current!.getBoundingClientRect(), g = grab.current!;
    let x = ((cx - g.ox - r.left) / r.width) * 100, y = ((r.bottom - (cy - g.oy)) / r.height) * 100;
    x = clamp(x, half, 100 - half); y = clamp(y, 0, 80);
    if (x - half < 1.5) x = half; if (100 - half - x < 1.5) x = 100 - half; if (y < 2) y = 0; // edges and the floor catch him
    return { x: round(x), y: round(y) };
  };
  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = screen.current!.getBoundingClientRect(), fx = r.left + (at.x / 100) * r.width, fy = r.bottom - (at.y / 100) * r.height;
    grab.current = { id: e.pointerId, ox: e.clientX - fx, oy: e.clientY - fy }; e.currentTarget.setPointerCapture(e.pointerId); setLive(at); e.preventDefault();
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => { if (grab.current?.id === e.pointerId) setLive(spot(e.clientX, e.clientY)); };
  const up = (e: React.PointerEvent<HTMLDivElement>) => { if (grab.current?.id !== e.pointerId) return; const p = spot(e.clientX, e.clientY); grab.current = null; setLive(null); onPos(dev, p); };
  const key = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const k = e.shiftKey ? 5 : 1, m: Record<string, [number, number]> = { ArrowLeft: [-k, 0], ArrowRight: [k, 0], ArrowUp: [0, k], ArrowDown: [0, -k] }, v = m[e.key]; if (!v) return;
    e.preventDefault(); onPos(dev, { x: round(clamp(at.x + v[0], half, 100 - half)), y: round(clamp(at.y + v[1], 0, 80)) });
  };

  return (
    <div className="mzp">
      <div className="hst-chips" role="tablist" aria-label="Which screen">
        {([["desk", "💻 Computer"], ["phone", "📱 Phone"]] as const).map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={dev === k} className={`hst-chip${dev === k ? " on" : ""}`} onClick={() => setDev(k)}>{l}</button>)}
      </div>
      <div className={`mzp-dev ${dev}`}>
        <div className="mzp-screen" ref={screen} style={{ aspectRatio: `${R.w} / ${R.h}` }}>
          <div className="mzp-site" aria-hidden><i className="mzp-nav" /><i className="mzp-h1" /><i className="mzp-p" /><i className="mzp-p s" /><span className="mzp-cards"><i /><i /><i /></span></div>
          {orb && <i className="mzp-orb" aria-hidden>+</i>}
          <div className={`mzp-fig${right ? " flip" : ""}${live ? " drag" : ""}`} data-hair={d.hair} data-beard={d.beard} data-gl={d.glasses ? "1" : undefined}
            style={{ ...(vars as React.CSSProperties), width: `${wPct}%`, left: `${at.x}%`, bottom: `${at.y}%` }}
            role="slider" tabIndex={0} aria-label={`Mini Shourobh on a ${dev === "desk" ? "computer" : "phone"}: drag him, or use the arrow keys`} aria-valuetext={`${Math.round(at.x)}% across, ${Math.round(at.y)}% up`}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}
            dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
        {bar && <div className="mzp-bbar" aria-hidden><i /><i /><i /><i /><i /></div>}
        {sheet && <div className="mzp-sheet" aria-hidden><i /></div>}
      </div>
      <div className="hint">
        {saved ? `Your spot: ${Math.round(at.x)}% across, ${Math.round(at.y)}% up from the bottom.` : `The ${d.side === "right" ? "right" : "left"} corner (the default).`}{" "}
        {onOrb ? "He'll stand on top of the round menu button there, so it stays tappable." : dev === "phone" ? "On phones he stays exactly here, even while the page scrolls." : "He faces the middle of the screen, wherever he is."}
      </div>
      <div className="hst-chips">
        <button type="button" className="hst-chip" onClick={() => onPos(dev, corner(false))}>↙ Bottom left</button>
        <button type="button" className="hst-chip" onClick={() => onPos(dev, { x: 50, y: 0 })}>⬇ Bottom middle</button>
        <button type="button" className="hst-chip" onClick={() => onPos(dev, corner(true))}>↘ Bottom right</button>
        {saved && <button type="button" className="hst-chip" onClick={() => onPos(dev, null)}>↺ Back to the default corner</button>}
      </div>
    </div>
  );
}
