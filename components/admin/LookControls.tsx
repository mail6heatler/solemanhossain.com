"use client";
import { useState } from "react";
import { HIDE_LABELS, LIMITS, SIZE_PRESETS, cleanStyle, isCustom, lookOf, mergeStyles, type ContentStyle, type HideKey } from "@/lib/contentStyle";

export type LookSample = { title: string; subtitle: string; body: string; pic: string; tags: string[]; meta: string };

const SIZES = [["", "Default"], ["s", SIZE_PRESETS.s.label], ["m", SIZE_PRESETS.m.label], ["l", SIZE_PRESETS.l.label], ["custom", "Custom"]] as const;

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="look-seg" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={v === value} className={v === value ? "on" : ""} onClick={() => onChange(v)}>{text}</button>
      ))}
    </div>
  );
}

function Slider({ label, value, range, unit, fallback, onChange, onClear }:
  { label: string; value: number | undefined; range: readonly [number, number]; unit: string; fallback: number; onChange: (n: number) => void; onClear?: () => void }) {
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

/**
 * The size and look panel used at all three levels, with a live preview built from the site's own card styles.
 * `above` is what this level inherits, so the preview and the "Default" choices show what would really happen.
 */
export default function LookControls({ initial, above, sample, layout, level }:
  { initial: ContentStyle; above?: ContentStyle; sample: LookSample; layout: string; level: string }) {
  const [st, setSt] = useState<ContentStyle>(cleanStyle(initial));
  const set = (patch: Partial<ContentStyle>) => setSt((s) => cleanStyle({ ...s, ...patch }));
  const drop = (...keys: (keyof ContentStyle)[]) => setSt((s) => { const n = { ...s }; keys.forEach((k) => delete n[k]); return n; });

  const merged = mergeStyles(above, st);
  const look = lookOf(merged);
  const canFocus = merged.fit !== "whole" && !!sample.pic && !look.hide("pic");
  // a wide card is shown smaller rather than cut off, so the preview always shows the whole card
  const cardW = merged.size && merged.size !== "custom" ? SIZE_PRESETS[merged.size].w : merged.w ?? SIZE_PRESETS.m.w;
  const fit = Math.min(1, 368 / cardW);
  const focus = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    set({ fx: Math.round(((e.clientX - r.left) / r.width) * 100), fy: Math.round(((e.clientY - r.top) / r.height) * 100) });
  };
  const hideValue = (k: HideKey): "" | "show" | "hide" => (st.hide?.[k] === true ? "hide" : st.hide?.[k] === false ? "show" : "");
  const setHide = (k: HideKey, v: "" | "show" | "hide") => setSt((s) => {
    const hide: NonNullable<ContentStyle["hide"]> = { ...s.hide };
    if (v === "") delete hide[k]; else hide[k] = v === "hide";
    const n: ContentStyle = { ...s, hide };
    if (!Object.keys(hide).length) delete n.hide;
    return n;
  });

  const picBlock = sample.pic && !look.hide("pic") ? (
    <div className={`pic-box${canFocus ? " look-focus" : ""}`} onClick={canFocus ? focus : undefined} title={canFocus ? "Click the part that must stay visible" : undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {layout === "strip"
        ? <div className="ph has-pic"><img src={sample.pic} alt="" /></div>
        : layout === "notes" ? <img className="note-media" src={sample.pic} alt="" />
        : <div className="card-media"><img className="card-img" src={sample.pic} alt="" /></div>}
      {canFocus && <i className="look-dot" style={{ left: `${merged.fx ?? 50}%`, top: `${merged.fy ?? (merged.fit === "fill" ? 50 : layout === "windows" ? 0 : 40)}%` }} aria-hidden />}
    </div>
  ) : null;
  const reacts = (
    <div className="card-foot"><div className="reacts mini" aria-hidden>
      {["❤️", "🔥", "😂", "🤯", "👏"].map((e) => <button key={e} type="button" tabIndex={-1}><span className="e">{e}</span></button>)}
    </div><span className="full-view" aria-hidden><span>Full view</span><i className="ti ti-arrow-right" /></span></div>
  );
  const head = (
    <>
      <h3>{sample.title}</h3>
      {sample.subtitle && !look.hide("subtitle") && <p className="sub">{sample.subtitle}</p>}
      {sample.meta && !look.hide("date") && <div className="meta">{sample.meta}</div>}
    </>
  );
  const rest = (
    <>
      {sample.body && <div className="md ex"><p>{sample.body}</p></div>}
      {sample.tags.length > 0 && !look.hide("tags") && <div className="tags">{sample.tags.map((t) => <span key={t}>{t}</span>)}</div>}
    </>
  );
  const text = <>{head}{rest}</>;
  const withText = sample.body ? " with-text" : "";
  const box = (inner: React.ReactNode) => (
    <>
      <div className="scroll-wrap has-foot"><div className="scrolly"><div className="flow">{inner}</div></div></div>
      {reacts}
    </>
  );

  return (
    <div className="look">
      <input type="hidden" name="style" value={JSON.stringify(st)} />
      <div className="look-grid">
        <div className="look-side">
          <div className="fl">
            <span className="lab">Card size</span>
            <Seg label="Card size" value={(st.size ?? "") as (typeof SIZES)[number][0]} options={SIZES} onChange={(v) => {
              if (v === "") drop("size", "w", "h");
              else if (v === "custom") set({ size: "custom", w: merged.w ?? (merged.size && merged.size !== "custom" ? SIZE_PRESETS[merged.size].w : SIZE_PRESETS.m.w), h: merged.h ?? (merged.size && merged.size !== "custom" ? SIZE_PRESETS[merged.size].h : SIZE_PRESETS.m.h) });
              else setSt((s) => { const n = { ...s, size: v }; delete n.w; delete n.h; return n; });
            }} />
            {st.size === "custom" && (
              <>
                <Slider label="Width" value={st.w} range={LIMITS.w} unit="px" fallback={SIZE_PRESETS.m.w} onChange={(w) => set({ w })} />
                <Slider label="Height" value={st.h} range={LIMITS.h} unit="px" fallback={SIZE_PRESETS.m.h} onChange={(h) => set({ h })} />
              </>
            )}
          </div>
          <div className="fl">
            <span className="lab">Picture</span>
            <Seg label="Picture fit" value={(st.fit ?? "") as "" | "whole" | "fill"} options={[["", "Default"], ["whole", "Show whole"], ["fill", "Fill the space"]]} onChange={(v) => {
              if (v === "") drop("fit"); else set({ fit: v });
            }} />
            <div className="hint">{merged.fit === "whole" ? "The whole picture always shows, with empty space beside it if its shape differs from the card."
              : merged.fit === "fill" ? "Every picture gets the same height, so even wide ones lose their sides. Click the part of the picture in the preview that must stay visible."
              : "The picture fills the card's width and only what doesn't fit is trimmed. Click the part of the picture in the preview that must stay visible."}</div>
            <Slider label="Picture height in the card" value={st.pic} range={LIMITS.pic} unit="%" fallback={sample.body ? 50 : 66} onChange={(pic) => set({ pic })} onClear={() => drop("pic")} />
          </div>
          <div className="fl">
            <Slider label="Text size" value={st.text} range={LIMITS.text} unit="%" fallback={100} onChange={(t) => set({ text: t })} onClear={() => drop("text")} />
          </div>
          <div className="fl">
            <span className="lab">Show on the card</span>
            {(Object.keys(HIDE_LABELS) as HideKey[]).map((k) => (
              <div key={k} className="look-row">
                <span>{HIDE_LABELS[k]}</span>
                <Seg label={HIDE_LABELS[k]} value={hideValue(k)} options={[["", "Default"], ["show", "Show"], ["hide", "Hide"]]} onChange={(v) => setHide(k, v)} />
              </div>
            ))}
            <div className="hint">This only changes the card. The entry&apos;s own page always shows everything.</div>
          </div>
        </div>
        <div className="look-preview-col">
          <div className="lab look-preview-lab">Live preview{fit < 1 ? `, shown at ${Math.round(fit * 100)}%` : ""}</div>
          <div className="look-preview">
            <div className="site" data-testid="look-preview" style={fit < 1 ? { zoom: fit } : undefined}>
              {layout === "strip" ? (
                <div className={`trip${look.className}`} style={look.style}>{box(<>{picBlock ?? (look.hide("pic") ? null : <div className="pic-box"><div className="ph"><i className="ti ti-map-pin" /></div></div>)}<div className="tb">{text}</div></>)}</div>
              ) : layout === "notes" ? (
                <div className={`note${withText}${look.className}`} style={look.style}>{box(<>{head}{picBlock}{rest}</>)}</div>
              ) : layout === "windows" ? (
                <div className={`card win${withText}${look.className}`} style={look.style}>
                  <div className="win-head">
                    <div className="win-bar"><span className="win-dots" aria-hidden><i /><i /><i /></span><span className="win-name">{sample.title}</span></div>
                    <div className="win-url"><i className="ti ti-world" aria-hidden /><span>your-project.com</span></div>
                  </div>
                  {box(<>{picBlock}<div className="card-body">{text}</div></>)}
                </div>
              ) : (
                <div className={`card${withText}${look.className}`} style={look.style}>{box(<>{picBlock}<div className="card-body">{text}</div></>)}</div>
              )}
            </div>
          </div>
          <div className="hint">In your site&apos;s default colours. On phones, cards never get wider than the screen, and on any screen a card stays shorter than the window.</div>
        </div>
      </div>
      <div className="look-actions save-bar">
        <div className="grow">
          <div className="c-title">Save your changes</div>
          <div className="c-desc">{isCustom(st) ? `Default clears ${level}'s own settings. Press Save to keep the change.` : `Nothing set for ${level}: it follows the default.`}</div>
        </div>
        <div className="save-btns">
          <button type="button" className="b-out" disabled={!isCustom(st)} onClick={() => setSt({})}><i className="ti ti-restore" />Default</button>
          <button className="b-mint"><i className="ti ti-device-floppy" />Save</button>
        </div>
      </div>
    </div>
  );
}
