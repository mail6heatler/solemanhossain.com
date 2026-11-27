"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { OpsSettings } from "@/lib/ops";
import { saveOpsGroup } from "@/app/opsActions";

// The Settings page's building blocks (2026-11-27, the owner's "one box per feature"): every feature is one card with its switch in
// the corner, its options and its lists. Switches, sliders and choices save the moment they change; words save a second after
// typing stops. Each card says Saving… / Saved ✓ for itself, so there is no Save bar.

export type R = { ok: true; note?: string } | { ok: false; error: string };
type St = "saving" | "saved" | "error";
type Ctx = { ops: OpsSettings; set: <K extends keyof OpsSettings>(k: K, v: Partial<OpsSettings[K]> | OpsSettings[K], soon?: boolean) => void; st: Partial<Record<keyof OpsSettings, St>>; err: Partial<Record<keyof OpsSettings, string>> };
const OpsCtx = createContext<Ctx | null>(null);
export const useOps = () => useContext(OpsCtx)!;

export function OpsProvider({ first, children }: { first: OpsSettings; children: React.ReactNode }) {
  const router = useRouter();
  const [ops, setOps] = useState(first);
  const cur = useRef(first);
  const timers = useRef<Partial<Record<keyof OpsSettings, number>>>({});
  const [st, setSt] = useState<Ctx["st"]>({}), [err, setErr] = useState<Ctx["err"]>({});
  const set: Ctx["set"] = (k, v, soon) => {
    const was = cur.current[k];
    // a group of options takes the changed ones; a list (short links) or a single switch is replaced whole
    const next = { ...cur.current, [k]: typeof was === "object" && was !== null && !Array.isArray(was) ? { ...(was as object), ...(v as object) } : v } as OpsSettings;
    cur.current = next; setOps(next);
    clearTimeout(timers.current[k]);
    timers.current[k] = window.setTimeout(async () => {
      setSt((s) => ({ ...s, [k]: "saving" }));
      const r = await saveOpsGroup(k, cur.current[k]).catch(() => ({ ok: false, error: "That didn't save. Check your connection." }) as R);
      if (r.ok) { setSt((s) => ({ ...s, [k]: "saved" })); setErr((e) => ({ ...e, [k]: "" })); router.refresh(); }
      else {
        // put the switch back as it was saved, and say why
        if (k === "private") { const back = { ...cur.current, private: { ...cur.current.private, on: false } }; cur.current = back; setOps(back); }
        setSt((s) => ({ ...s, [k]: "error" })); setErr((e) => ({ ...e, [k]: r.error }));
      }
    }, soon ? 900 : 250);
  };
  return <OpsCtx.Provider value={{ ops, set, st, err }}>{children}</OpsCtx.Provider>;
}

/** a feature's card: its name, its switch in the corner, whether it saved, then everything about it */
export function Card({ title, icon, k, flag, onLabel = "On", offLabel = "Off", state, children, danger }: {
  title: string; icon: string; k?: keyof OpsSettings; flag?: { value: boolean; set: (v: boolean) => void }; onLabel?: string; offLabel?: string;
  state?: React.ReactNode; children?: React.ReactNode; danger?: boolean;
}) {
  const o = useContext(OpsCtx);
  const s = k ? o?.st[k] : undefined, e = k ? o?.err[k] : undefined;
  const [shown, setShown] = useState<St | undefined>(undefined);
  useEffect(() => { setShown(s); if (s === "saved") { const t = setTimeout(() => setShown(undefined), 1800); return () => clearTimeout(t); } }, [s, o?.ops]);
  return (
    <section className={`c f ops-box${danger ? " ops-danger" : ""}${flag && !flag.value ? " off" : ""}`}>
      <div className="ops-h">
        <i className={`ti ti-${icon}`} aria-hidden /><b>{title}</b>
        {shown === "saving" && <span className="ops-sv">Saving…</span>}
        {shown === "saved" && <span className="ops-sv ok">Saved ✓</span>}
        {state}
        {flag && <label className="switch ops-flip" title={flag.value ? "Switch off" : "Switch on"}><input type="checkbox" checked={flag.value} onChange={(ev) => flag.set(ev.target.checked)} aria-label={`${title}: ${flag.value ? onLabel : offLabel}`} /><span>{flag.value ? onLabel : offLabel}</span></label>}
      </div>
      {e && <div className="err" role="alert">{e}</div>}
      {children}
    </section>
  );
}

export const Sw = ({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) => (
  <label className="switch"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />{children}</label>
);
export const Chips = <T extends string>({ list, value, onPick }: { list: readonly (readonly [T, string])[]; value: T; onPick: (v: T) => void }) => (
  <div className="hst-chips">{list.map(([k, label]) => <button key={k} type="button" className={`hst-chip${value === k ? " on" : ""}`} aria-pressed={value === k} onClick={() => onPick(k)}>{label}</button>)}</div>
);
export const Range = ({ id, label, value, lim, unit, onChange }: { id: string; label: string; value: number; lim: readonly [number, number]; unit: string; onChange: (v: number) => void }) => (
  <div className="fl cs-slider"><label htmlFor={id}>{label} <b>{value}{unit}</b></label><input id={id} type="range" min={lim[0]} max={lim[1]} step={1} value={value} onChange={(e) => onChange(+e.target.value)} /></div>
);
export const Txt = ({ id, label, value, max, onChange, area, placeholder }: { id: string; label: string; value: string; max: number; onChange: (v: string) => void; area?: boolean; placeholder?: string }) => (
  <div className="fl"><label htmlFor={id}>{label}</label>{area ? <textarea id={id} className="inp" rows={3} maxLength={max} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /> : <input id={id} className="inp" maxLength={max} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}</div>
);
export const When = ({ at }: { at: string }) => <time dateTime={at} suppressHydrationWarning>{new Date(at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</time>;
export const kb = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** a button's action, its busy state and its result line, refreshing the page's lists after it works */
export function useAct() {
  const router = useRouter();
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null);
  const run = async (key: string, fn: () => Promise<R>) => {
    setBusy(key); setMsg(null);
    const r = await fn().catch(() => ({ ok: false, error: "That didn't work. Check your connection and try again." }) as R);
    setBusy("");
    setMsg(r.ok ? (r.note ? { t: r.note } : null) : { t: r.error, bad: true });
    if (r.ok) router.refresh();
    return r.ok;
  };
  const Msg = () => (msg ? <div className={msg.bad ? "err" : "ops-ok"} role="status">{msg.bad ? "" : "✓ "}{msg.t}</div> : null);
  return { busy, run, Msg, setMsg };
}

/** asks once more, in place, before something hard to undo */
export function Sure({ label, yes, icon, onYes, disabled, danger = true }: { label: string; yes: string; icon: string; onYes: () => void; disabled?: boolean; danger?: boolean }) {
  const [ask, setAsk] = useState(false);
  if (!ask) return <button type="button" className="b-out b-sm" disabled={disabled} onClick={() => setAsk(true)} aria-label={label || yes}><i className={`ti ti-${icon}`} />{label}</button>;
  return (
    <span className="ops-sure">
      <button type="button" className={danger ? "b-yes b-sm" : "b-mint b-sm"} onClick={() => { setAsk(false); onYes(); }}>{yes}</button>
      <button type="button" className="b-out b-sm" autoFocus onClick={() => setAsk(false)}>Cancel</button>
    </span>
  );
}

/** words that save a second after typing stops, with Saving… / Saved ✓ beside them (for fields that aren't in settings.ops) */
export function AutoText({ id, label, value, max, save, area, placeholder }: { id: string; label: string; value: string; max: number; save: (v: string) => Promise<R>; area?: boolean; placeholder?: string }) {
  const [v, setV] = useState(value), [st, setSt] = useState<St | undefined>(), [e, setE] = useState("");
  const t = useRef(0);
  const change = (x: string) => {
    setV(x); clearTimeout(t.current);
    t.current = window.setTimeout(async () => { setSt("saving"); const r = await save(x).catch(() => ({ ok: false, error: "That didn't save." }) as R); setSt(r.ok ? "saved" : "error"); setE(r.ok ? "" : r.error); }, 900);
  };
  return (
    <div className="fl"><label htmlFor={id}>{label} {st === "saving" && <span className="ops-sv">Saving…</span>}{st === "saved" && <span className="ops-sv ok">Saved ✓</span>}</label>
      {area ? <textarea id={id} className="inp" rows={3} maxLength={max} value={v} placeholder={placeholder} onChange={(ev) => change(ev.target.value)} /> : <input id={id} className="inp" maxLength={max} value={v} placeholder={placeholder} onChange={(ev) => change(ev.target.value)} />}
      {e && <div className="err">{e}</div>}
    </div>
  );
}
