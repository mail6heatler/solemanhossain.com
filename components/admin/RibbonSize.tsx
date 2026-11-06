"use client";
import { useState } from "react";
import { RIBBON_SIZE } from "@/lib/settings";

/** The size of the sliding belts between sections, with a live one to judge it by. It keeps following the screen: this is a multiplier. */
export default function RibbonSize({ initial, sample }: { initial: number; sample: string }) {
  const [v, setV] = useState(initial);
  return (
    <div className="fl rib-size">
      <div className="look-slider">
        <div className="look-slider-top">
          <label htmlFor="ribbonSize">Belt size</label>
          <span><b>{v === 100 ? "Default" : `${v}%`}</b>{v !== 100 && <button type="button" onClick={() => setV(100)}>reset</button>}</span>
        </div>
        <input id="ribbonSize" type="range" name="ribbonSize" min={RIBBON_SIZE[0]} max={RIBBON_SIZE[1]} step={5} value={v} onChange={(e) => setV(Number(e.target.value))} />
      </div>
      <div className="rib-preview" aria-hidden>
        <div className="site">
          <div className="ribbon" style={{ "--rib": v / 100 } as React.CSSProperties}>
            <div className="ribbon-track">{Array.from({ length: 20 }, (_, k) => <span key={k}>{sample}</span>)}</div>
          </div>
        </div>
      </div>
      <div className="hint">This is how thick the belt is at the size of this window. Phones and big monitors scale along with it.</div>
    </div>
  );
}
