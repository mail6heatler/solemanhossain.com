"use client";
import { useState } from "react";
import { HIDE_LABELS, LIMITS, SIZE_PRESETS, cleanStyle, isCustom, mergeStyles, type ContentStyle, type HideKey } from "@/lib/contentStyle";

/** The live editor's small fields. Every one is told its value and reports each change at once, so the preview beside it follows as you type. */
export function Txt({ label, value, onChange, placeholder, area, hint, max, focus, tall }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; area?: boolean; hint?: React.ReactNode; max?: number; focus?: boolean; tall?: boolean }) {
  return (
    <label className="fl stu-f">
      <span className="lab">{label}</span>
      {area
        ? <textarea className={tall ? "tall" : undefined} value={value} placeholder={placeholder} maxLength={max} autoFocus={focus} onChange={(e) => onChange(e.target.value)} />
        : <input className="inp" value={value} placeholder={placeholder} maxLength={max} autoFocus={focus} onChange={(e) => onChange(e.target.value)} />}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void }) {
  return (
    <div className="look-seg" role="group" aria-label={label}>
      {options.map(([v, text]) => <button key={v} type="button" aria-pressed={v === value} className={v === value ? "on" : ""} onClick={() => onChange(v)}>{text}</button>)}
    </div>
  );
}

export function Slider({ label, value, range, unit, fallback, onChange, onClear }: { label: string; value: number | undefined; range: readonly [number, number]; unit: string; fallback: number; onChange: (n: number) => void; onClear?: () => void }) {
  return (
    <div className="look-slider">
      <div className="look-slider-top">
        <label>{label}</label>
        <span><b>{value === undefined ? "Default" : `${value}${unit}`}</b>{value !== undefined && onClear && <button type="button" onClick={onClear}>reset</button>}</span>
      </div>
      <input type="range" aria-label={label} min={range[0]} max={range[1]} value={value ?? fallback} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export function Sw({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (on: boolean) => void }) {
  return <label className="switch stu-sw"><input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} /><span>{label}{hint && <small>{hint}</small>}</span></label>;
}

/** Tags, or any short list: type one and press Enter; the × takes one away. */
export function Chips({ label, value, onChange, placeholder = "Type one and press Enter", hint }: { label: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string; hint?: string }) {
  const [text, setText] = useState("");
  const add = () => { const v = text.trim().replace(/,/g, " "); if (v && !value.includes(v)) onChange([...value, v]); setText(""); };
  return (
    <div className="fl stu-f">
      <span className="lab">{label}</span>
      <div className="chips">
        {value.map((c, i) => <span key={c + i} className="ch">{c}<button type="button" aria-label={`Remove ${c}`} onClick={() => onChange(value.filter((_, j) => j !== i))}><i className="ti ti-x" /></button></span>)}
        {value.length === 0 && <span style={{ fontSize: 12, color: "var(--text-faint)" }}>None yet</span>}
      </div>
      <div className="chip-add">
        <input className="inp" value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }} onBlur={add} />
        <button type="button" className="b-dark b-sm" onClick={add}><i className="ti ti-plus" />Add</button>
      </div>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

const SIZES = [["", "Default"], ["s", SIZE_PRESETS.s.label], ["m", SIZE_PRESETS.m.label], ["l", SIZE_PRESETS.l.label], ["custom", "Custom"]] as const;

/**
 * Size and look, for one card or for the whole section: the same choices as before (LookControls), without a preview of their own, because the real
 * card beside them is the preview. `above` is what this level inherits, so "Default" means what would really happen. `pic` is the cover, for choosing
 * the part that must stay in view.
 */
export function LookFields({ st, above, onChange, pic, level, hasText }: { st: ContentStyle; above?: ContentStyle; onChange: (st: ContentStyle) => void; pic?: string; level: string; hasText: boolean }) {
  const set = (patch: Partial<ContentStyle>) => onChange(cleanStyle({ ...st, ...patch }));
  const drop = (...keys: (keyof ContentStyle)[]) => { const n = { ...st }; keys.forEach((k) => delete n[k]); onChange(cleanStyle(n)); };
  const merged = mergeStyles(above, st);
  const base = merged.size && merged.size !== "custom" ? SIZE_PRESETS[merged.size] : { w: merged.w ?? SIZE_PRESETS.m.w, h: merged.h ?? SIZE_PRESETS.m.h };
  const hideValue = (k: HideKey): "" | "show" | "hide" => (st.hide?.[k] === true ? "hide" : st.hide?.[k] === false ? "show" : "");
  const setHide = (k: HideKey, v: "" | "show" | "hide") => {
    const hide: NonNullable<ContentStyle["hide"]> = { ...st.hide };
    if (v === "") delete hide[k]; else hide[k] = v === "hide";
    const n: ContentStyle = { ...st, hide };
    if (!Object.keys(hide).length) delete n.hide;
    onChange(cleanStyle(n));
  };
  const canFocus = !!pic && merged.fit !== "whole" && merged.hide?.pic !== true;
  return (
    <>
      <div className="fl stu-f">
        <span className="lab">Card size</span>
        <Seg label="Card size" value={(st.size ?? "") as (typeof SIZES)[number][0]} options={SIZES} onChange={(v) => {
          if (v === "") drop("size", "w", "h");
          else if (v === "custom") set({ size: "custom", w: base.w, h: base.h });
          else { const n = { ...st, size: v }; delete n.w; delete n.h; onChange(cleanStyle(n)); }
        }} />
        {st.size === "custom" && (
          <>
            <Slider label="Width" value={st.w} range={LIMITS.w} unit="px" fallback={SIZE_PRESETS.m.w} onChange={(w) => set({ w })} />
            <Slider label="Height" value={st.h} range={LIMITS.h} unit="px" fallback={SIZE_PRESETS.m.h} onChange={(h) => set({ h })} />
          </>
        )}
        <span className="hint">A card never gets taller than most of the screen, or wider than a phone.</span>
      </div>
      <div className="fl stu-f">
        <Slider label="Text size" value={st.text} range={LIMITS.text} unit="%" fallback={100} onChange={(t) => set({ text: t })} onClear={() => drop("text")} />
      </div>
      <div className="fl stu-f">
        <span className="lab">Picture</span>
        <Seg label="Picture fit" value={(st.fit ?? "") as "" | "whole" | "fill"} options={[["", "Default"], ["whole", "Show whole"], ["fill", "Fill the space"]]} onChange={(v) => { if (v === "") drop("fit"); else set({ fit: v }); }} />
        <span className="hint">{merged.fit === "whole" ? "The whole picture always shows, with empty space beside it if its shape differs from the card."
          : merged.fit === "fill" ? "Every picture gets the same height, so even wide ones lose their sides."
          : "The picture fills the card's width and only what doesn't fit is trimmed."}</span>
        <Slider label="Picture height in the card" value={st.pic} range={LIMITS.pic} unit="%" fallback={hasText ? 50 : 66} onChange={(p) => set({ pic: p })} onClear={() => drop("pic")} />
        {canFocus && (
          <>
            <span className="lab" style={{ marginTop: 10 }}>The part that must stay in view</span>
            <div className="stu-focus look-focus" title="Click the part that must stay visible"
              onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); set({ fx: Math.round(((e.clientX - r.left) / r.width) * 100), fy: Math.round(((e.clientY - r.top) / r.height) * 100) }); }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pic} alt="" />
              <i className="look-dot" style={{ left: `${merged.fx ?? 50}%`, top: `${merged.fy ?? 40}%` }} aria-hidden />
            </div>
            {st.fx !== undefined && <button type="button" className="stu-link" onClick={() => drop("fx", "fy")}>Back to the middle</button>}
          </>
        )}
      </div>
      <div className="fl stu-f">
        <span className="lab">Show on the card</span>
        {(Object.keys(HIDE_LABELS) as HideKey[]).map((k) => (
          <div key={k} className="look-row">
            <span>{HIDE_LABELS[k]}</span>
            <Seg label={HIDE_LABELS[k]} value={hideValue(k)} options={[["", "Default"], ["show", "Show"], ["hide", "Hide"]]} onChange={(v) => setHide(k, v)} />
          </div>
        ))}
        <span className="hint">This only changes the card. The full view always shows everything.</span>
      </div>
      <button type="button" className="b-out b-sm" disabled={!isCustom(st)} onClick={() => onChange({})}><i className="ti ti-restore" />Default: clear {level}&apos;s own size and look</button>
    </>
  );
}
