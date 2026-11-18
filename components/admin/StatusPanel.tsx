"use client";
import { useState } from "react";
import { STALE_HOURS, STATUS_EMOJIS, STATUS_KINDS, STATUS_LOOKS, STATUS_PRESETS, statusKind, type Status, type StatusKind, type StatusLook } from "@/lib/status";

/** The hero page's "Status by your photo" box. Changing the emoji or words restarts the clock and the 👁 count when saved. */
export default function StatusPanel({ initial }: { initial: Status }) {
  const [s, setS] = useState(initial);
  const [touch, setTouch] = useState(false);
  const set = <K extends keyof Status>(k: K, v: Status[K]) => setS((o) => ({ ...o, [k]: v }));
  const kind = statusKind(s);
  const changed = s.emoji !== initial.emoji || s.text !== initial.text;
  const chip = (on: boolean, label: React.ReactNode, onClick: () => void, key: string, title?: string) => (
    <button type="button" key={key} className={`ring-chip${on ? " on" : ""}`} onClick={onClick} title={title}>{label}</button>
  );
  return (
    <div className="f">
      <input type="hidden" name="status" value={JSON.stringify(s)} />
      {touch && <input type="hidden" name="status_touch" value="1" />}
      <label className="switch"><input type="checkbox" checked={s.on} onChange={(e) => set("on", e.target.checked)} />Show my status on the homepage</label>
      <div className="st-prev" style={{ ["--sc" as string]: kind.color }}>
        <i className="hst-dot" aria-hidden /><b>{kind.label}</b> · {s.emoji} {s.text || "…"}
        <span className="hst-meta">{s.showAgo ? (changed || touch ? " · updated just now" : " · updated earlier") : ""}{s.showViews ? " · 👁 …" : ""}</span>
      </div>
      <div className="fl"><span className="lab">Emoji</span><div className="ring-chips">
        {STATUS_EMOJIS.map((e) => chip(s.emoji === e, e, () => set("emoji", e), e))}
        <input className="inp" style={{ width: 70 }} maxLength={4} value={s.emoji} onChange={(e) => set("emoji", e.target.value)} aria-label="Or type any emoji" />
      </div></div>
      <div className="fl"><label htmlFor="st-text">What you&apos;re up to</label><input id="st-text" className="inp" maxLength={80} value={s.text} onChange={(e) => set("text", e.target.value)} placeholder="Drinking tea and planning a trip" /></div>
      <div className="fl"><span className="lab">One-tap presets</span><div className="ring-chips">
        {STATUS_PRESETS.map(([e, t]) => chip(s.emoji === e && s.text === t, `${e} ${t}`, () => setS((o) => ({ ...o, emoji: e, text: t })), t))}
      </div></div>
      <div className="fl"><span className="lab">Look</span><div className="ring-chips">
        {(Object.keys(STATUS_LOOKS) as StatusLook[]).map((k) => chip(s.look === k, STATUS_LOOKS[k].label, () => set("look", k), k, STATUS_LOOKS[k].desc))}
      </div><div className="hint">{STATUS_LOOKS[s.look].desc}.</div></div>
      <div className="fl"><span className="lab">Online, busy or away (sets the colour of the dot and the ring)</span><div className="ring-chips">
        {(Object.keys(STATUS_KINDS) as StatusKind[]).map((k) => chip(s.kind === k, STATUS_KINDS[k].label, () => set("kind", k), k))}
      </div>{s.kind === "auto" && <div className="hint">From the emoji: 😴 and 🤒 are Away, 💻 📚 🎬 📊 are Busy, the rest Online. Right now: {kind.label}.</div>}</div>
      <div className="fl"><label htmlFor="st-stale">Goes grey and says &quot;last seen&quot; after: {s.staleHours} hour{s.staleHours > 1 ? "s" : ""}</label>
        <input id="st-stale" type="range" min={STALE_HOURS[0]} max={STALE_HOURS[1]} value={s.staleHours} onChange={(e) => set("staleHours", +e.target.value)} style={{ width: "100%" }} /></div>
      <label className="switch"><input type="checkbox" checked={s.showAgo} onChange={(e) => set("showAgo", e.target.checked)} />Show the live &quot;updated … ago&quot; clock</label>
      <label className="switch"><input type="checkbox" checked={s.showViews} onChange={(e) => set("showViews", e.target.checked)} />Show the 👁 count of people who saw it</label>
      <label className="switch"><input type="checkbox" checked={touch} onChange={(e) => setTouch(e.target.checked)} />Same status, but start the clock and the 👁 count again</label>
      <div className="hint">A new emoji or new words start the clock and the 👁 count from zero when you save. The ring around your photo takes your status colour when its colour is set to &quot;My status colour&quot;.</div>
    </div>
  );
}
