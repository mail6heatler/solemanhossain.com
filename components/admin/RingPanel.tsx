"use client";
import { useState } from "react";
import HeroRing from "@/components/site/HeroRing";
import { RING_COLORS, RING_GAP, RING_SPEED, RING_STYLES, RING_WIDTH, type Ring, type RingColor, type RingStyle } from "@/lib/mascot";

/** The hero page's "Ring around your photo" box: every control, with the ring drawn live around the real photo. */
export default function RingPanel({ initial, photo, initials, sticker }: { initial: Ring; photo: string; initials: string; sticker: boolean }) {
  const [r, setR] = useState(initial);
  const set = <K extends keyof Ring>(k: K, val: Ring[K]) => setR((o) => ({ ...o, [k]: val }));
  const round = !sticker || !photo;
  return (
    <div className="ring-panel">
      <input type="hidden" name="ring" value={JSON.stringify(r)} />
      <div className="ring-prev" data-on={r.on ? "1" : "0"}>
        <div className={`ring-photo${round ? " round" : ""}`}>
          {r.on && <HeroRing ring={r} photo={photo} round={round} />}
          {photo ? <img src={photo} alt="" /> : <div className="ring-ph">{initials || "✦"}</div>}
        </div>
        <div className="ring-cap">{r.on ? "Live preview: this is how it moves on your homepage" : "The ring is off. Turn it on to see it here."}</div>
      </div>
      <div className="f ring-ctl">
        <label className="switch"><input type="checkbox" checked={r.on} onChange={(e) => set("on", e.target.checked)} />Show a ring around my photo</label>
        <div className="fl">
          <span className="lab">Style</span>
          <div className="ring-chips">
            {(Object.keys(RING_STYLES) as RingStyle[]).map((k) => (
              <button type="button" key={k} className={`ring-chip${r.style === k ? " on" : ""}`} onClick={() => set("style", k)} title={RING_STYLES[k].desc}>{RING_STYLES[k].label}</button>
            ))}
          </div>
          <div className="hint">{RING_STYLES[r.style].desc}.</div>
        </div>
        <div className="fl">
          <span className="lab">Colour</span>
          <div className="ring-chips">
            {(Object.keys(RING_COLORS) as RingColor[]).map((k) => (
              <button type="button" key={k} className={`ring-chip${r.color === k ? " on" : ""}`} onClick={() => set("color", k)}>{RING_COLORS[k]}</button>
            ))}
            {r.color === "custom" && <input type="color" value={r.custom} onChange={(e) => set("custom", e.target.value)} aria-label="Ring colour" className="ring-color" />}
          </div>
          {r.style === "story" && <div className="hint">The rainbow story ring always uses rainbow colours.</div>}
        </div>
        <div className="f3">
          <div className="fl"><label htmlFor="rw">Thickness: {r.width}px</label><input id="rw" type="range" min={RING_WIDTH[0]} max={RING_WIDTH[1]} value={r.width} onChange={(e) => set("width", +e.target.value)} /></div>
          <div className="fl"><label htmlFor="rg">Space from the photo: {r.gap}px</label><input id="rg" type="range" min={RING_GAP[0]} max={RING_GAP[1]} value={r.gap} onChange={(e) => set("gap", +e.target.value)} /></div>
          <div className="fl"><label htmlFor="rs">Speed: {r.speed}%</label><input id="rs" type="range" min={RING_SPEED[0]} max={RING_SPEED[1]} step={5} value={r.speed} onChange={(e) => set("speed", +e.target.value)} /></div>
        </div>
        <div className="hint">It follows the shape of whatever photo you upload: a rectangle, a circle, or a cut-out with no background. It swings and tilts with the photo, and rests while someone scrolls.</div>
      </div>
    </div>
  );
}
