"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_LAUNCH, LAUNCH_DESIGNS, LAUNCH_KEYS, LAUNCH_LIMITS, type LaunchKey, type LaunchSettings } from "@/lib/launch";
import { saveLaunch } from "@/app/actions";
import type { LaunchStudioMsg } from "@/components/site/LaunchScreen";
import { SaveBar, SiteScreens } from "./ChromeStudio";

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/* small pieces of the page, outside the editor so typing never remounts them */
const Box = ({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) => (
  <details className="c box" open={open}><summary><span>{title}</span><i className="ti ti-chevron-down" /></summary><div className="f">{children}</div></details>
);
const Chips = <T extends string>({ list, value, onPick }: { list: readonly (readonly [T, string])[]; value: T; onPick: (v: T) => void }) => (
  <div className="hst-chips">{list.map(([k, label]) => <button key={k} type="button" className={`hst-chip${value === k ? " on" : ""}`} aria-pressed={value === k} onClick={() => onPick(k)}>{label}</button>)}</div>
);
const Sw = ({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) => (
  <label className="switch"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />{children}</label>
);
const Range = ({ id, label, value, lim, step, unit, onChange }: { id: string; label: string; value: number; lim: readonly [number, number]; step: number; unit: string; onChange: (v: number) => void }) => (
  <div className="fl cs-slider"><label htmlFor={id}>{label} <b>{value}{unit}</b></label><input id={id} type="range" min={lim[0]} max={lim[1]} step={step} value={value} onChange={(e) => onChange(+e.target.value)} /></div>
);
const Txt = ({ id, label, value, max, onChange, hint, placeholder }: { id: string; label: string; value: string; max: number; onChange: (v: string) => void; hint?: string; placeholder?: string }) => (
  <div className="fl"><label htmlFor={id}>{label}</label><input id={id} className="inp" maxLength={max} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />{hint && <div className="hint">{hint}</div>}</div>
);
const Lines = ({ id, label, value, onChange, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; hint?: string }) => (
  <div className="fl"><label htmlFor={id}>{label}</label><textarea id={id} className="inp" rows={5} maxLength={600} value={value} onChange={(e) => onChange(e.target.value)} />{hint && <div className="hint">{hint}</div>}</div>
);

/**
 * The launch screen's dashboard page (/admin/launch): your real homepage on a computer and a phone screen (`/?launch=studio`,
 * components/site/LaunchScreen.tsx) playing the launch screen with this page's unsaved settings, and every setting beside it.
 * ▶ Play sends a play; one Save writes settings.launch (saveLaunch).
 */
export default function LaunchStudio({ first, names }: { first: LaunchSettings; names: { nick: string; name: string; rocket: string } }) {
  const router = useRouter();
  const [saved, setSaved] = useState(first);
  const [d, setD] = useState(first);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ t: string; bad?: boolean } | null>(null);
  const [play, setPlay] = useState(1);
  const [k, setK] = useState<string>(first.design);
  const dirty = !same(d, saved);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 4000); return () => clearTimeout(t); }, [note]);

  const set = (patch: Partial<LaunchSettings>) => setD((x) => ({ ...x, ...patch }));
  const setIn = <G extends "gate" | "rocket" | "particles" | "movie" | "street" | "book">(g: G, patch: Partial<LaunchSettings[G]>) => setD((x) => ({ ...x, [g]: { ...x[g], ...patch } }));
  const show = (key: string) => { setK(key); setPlay((n) => n + 1); };
  const draft: LaunchStudioMsg = { type: "lc-launch-draft", cfg: d, play, k };
  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    const r = await saveLaunch(d).catch(() => null);
    setSaving(false);
    if (!r || !r.ok) { setNote({ t: r && !r.ok ? r.error : "That didn't save. Check your connection and try again.", bad: true }); return; }
    setSaved(d); setNote({ t: "Saved. It's live on your site." }); router.refresh();
  };
  const PlayBtn = ({ k: key, children }: { k: string; children?: React.ReactNode }) => <button type="button" className="hst-chip on" onClick={() => show(key)}>▶ {children ?? "Play"}</button>;
  const g = d.gate, r = d.rocket, pa = d.particles, mo = d.movie, st = d.street, bk = d.book;
  const tokens = `{nick} becomes ${names.nick}, {name} ${names.name}, {rocket} the rocket's name; {NICK} and {NAME} are the same in capitals.`;

  return (
    <div className="stu cs">
      <header className="stu-top">
        <div className="stu-name"><h1 className="adm-h">Launch screen</h1><p className="adm-sub">{d.on ? (d.design === "random" ? "Showing on your site: a different design each visit" : `Showing on your site: ${LAUNCH_DESIGNS[d.design].name}`) : "Hidden: visitors go straight to the site (the preview still plays, so you can edit)"}{dirty ? " · changes not saved" : ""}</p></div>
        <div className="btns stu-topbtns">
          <label className="switch cs-show"><input type="checkbox" checked={d.on} onChange={(e) => set({ on: e.target.checked })} />{d.on ? "Showing on site" : "Hidden on site"}</label>
          <a href={`/?launch=${d.design}`} target="_blank" className="b-out b-sm"><i className="ti ti-eye" />View on site</a>
        </div>
      </header>

      <div className="cs-work">
        <SiteScreens src="/?launch=studio" draft={draft} ready="lc-launch-ready" hint="Your real homepage with the launch screen over it, using your changes before saving. Press ▶ Play to watch one again. On the preview the loading is pretended (3.4 seconds), because the page here has already loaded" />

        <div className="cs-grid">
          <div className="cs-panel">
            <div className="mzs-bench">
              <div className="mzs-bench-top"><b>Play one</b><span className="hint">Each plays on both screens, with your unsaved changes.</span></div>
              <div className="hst-chips">{LAUNCH_KEYS.map((key) => <button key={key} type="button" className={`hst-chip${k === key ? " on" : ""}`} onClick={() => show(key)}><i className={`ti ti-${LAUNCH_DESIGNS[key].icon}`} /> {LAUNCH_DESIGNS[key].name}</button>)}<button type="button" className={`hst-chip${k === "random" ? " on" : ""}`} onClick={() => show("random")}><i className="ti ti-arrows-shuffle" /> Surprise me</button><button type="button" className="hst-chip" onClick={() => show("calm")}><i className="ti ti-leaf" /> Calm version</button></div>
            </div>

            <Box title="Which design">
              <div className="cs-looks">
                <button type="button" className={`cs-look${d.design === "random" ? " on" : ""}`} aria-pressed={d.design === "random"} onClick={() => { set({ design: "random" }); show("random"); }}><b><i className="ti ti-arrows-shuffle" /> A different one each visit</b><small>Picks at random from the ones ticked below, so returning visitors get something new.</small></button>
                {LAUNCH_KEYS.map((key) => (
                  <button key={key} type="button" className={`cs-look${d.design === key ? " on" : ""}`} aria-pressed={d.design === key} onClick={() => { set({ design: key }); show(key); }}><b><i className={`ti ti-${LAUNCH_DESIGNS[key].icon}`} /> {LAUNCH_DESIGNS[key].name}</b><small>{LAUNCH_DESIGNS[key].line}</small></button>
                ))}
              </div>
              {d.design === "random" && (<>
                <span className="lab">Picks from</span>
                <div className="stu-switches">{LAUNCH_KEYS.map((key) => (
                  <Sw key={key} checked={d.pool.includes(key)} onChange={(v) => { const pool = v ? LAUNCH_KEYS.filter((x) => x === key || d.pool.includes(x)) : d.pool.filter((x) => x !== key); if (pool.length) set({ pool: pool as LaunchKey[] }); }}>{LAUNCH_DESIGNS[key].name}</Sw>
                ))}</div>
                <div className="hint">At least one stays ticked.</div>
              </>)}
            </Box>

            <Box title="When it opens">
              <Chips list={[["auto", "Opens by itself when the site is ready"], ["enter", "Waits for the Enter button"]] as const} value={d.ready} onPick={(v) => set({ ready: v })} />
              {d.ready === "enter" && <Txt id="ln-enter" label="The Enter button says" value={d.enterLabel} max={30} onChange={(v) => set({ enterLabel: v })} />}
              <Range id="ln-min" label="Shows for at least" value={d.minSec} lim={LAUNCH_LIMITS.minSec} step={0.5} unit=" s" onChange={(v) => set({ minSec: v, maxSec: Math.max(d.maxSec, v + 1) })} />
              <div className="hint">Even on a fast connection, so the show can be seen. It stays longer whenever the site is still loading.</div>
              <Range id="ln-max" label="Opens anyway after" value={d.maxSec} lim={LAUNCH_LIMITS.maxSec} step={1} unit=" s" onChange={(v) => set({ maxSec: Math.max(v, d.minSec + 1) })} />
              <div className="hint">For a very slow connection: after this it opens onto whatever has loaded, so nobody waits forever.</div>
            </Box>

            <Box title="Who sees it">
              <Chips list={[["visit", "Once per visit"], ["day", "Once a day"], ["ever", "Only on their very first visit"]] as const} value={d.freq} onPick={(v) => set({ freq: v })} />
              <div className="hint">A visit ends when they close the tab. Other pages in the same visit open straight away.</div>
              <Chips list={[["any", "On whichever page a visit starts"], ["home", "Only when a visit starts on the homepage"]] as const} value={d.where} onPick={(v) => set({ where: v })} />
              <Sw checked={d.phones} onChange={(v) => set({ phones: v })}>Show it on phones too</Sw>
              <div className="hint">Visitors who turn motion off on their device get the calm version: your name and a loading line.</div>
            </Box>

            <Box title="Skipping and colours">
              <Sw checked={d.skip} onChange={(v) => set({ skip: v })}>Show a Skip button</Sw>
              {d.skip && <Txt id="ln-skip" label="The Skip button says" value={d.skipLabel} max={24} onChange={(v) => set({ skipLabel: v })} />}
              <Sw checked={d.clickSkips} onChange={(v) => set({ clickSkips: v })}>A click or tap anywhere skips it (or enters, once ready)</Sw>
              <div className="hint">A key on the keyboard always does the same. With Skip off, people wait for the site to load.</div>
              <span className="lab">Colours</span>
              <Chips list={[["own", "The launch screen's own colours"], ["theme", "Accent follows the site's theme"]] as const} value={d.colors} onPick={(v) => set({ colors: v })} />
            </Box>

            <p className="hint">In the words below, {tokens}</p>

            <Box title="Boarding gate" open={false}>
              <div className="btns"><PlayBtn k="gate" /></div>
              <div className="f2"><Txt id="lg-board" label="Departure board" value={g.board} max={18} onChange={(v) => setIn("gate", { board: v })} /><Txt id="lg-band" label="Top of the pass" value={g.band} max={28} onChange={(v) => setIn("gate", { band: v })} /></div>
              <div className="f2"><Txt id="lg-fc" label="From (code)" value={g.fromCode} max={4} onChange={(v) => setIn("gate", { fromCode: v })} /><Txt id="lg-fn" label="From (place)" value={g.fromName} max={22} onChange={(v) => setIn("gate", { fromName: v })} /></div>
              <div className="f2"><Txt id="lg-tc" label="To (code)" value={g.toCode} max={4} onChange={(v) => setIn("gate", { toCode: v })} /><Txt id="lg-tn" label="To (place)" value={g.toName} max={24} onChange={(v) => setIn("gate", { toName: v })} /></div>
              <Txt id="lg-pa" label="Passenger" value={g.passenger} max={24} onChange={(v) => setIn("gate", { passenger: v })} />
              <div className="f3"><Txt id="lg-g" label="Gate" value={g.gate} max={4} onChange={(v) => setIn("gate", { gate: v })} /><Txt id="lg-s" label="Seat" value={g.seat} max={4} onChange={(v) => setIn("gate", { seat: v })} /><Txt id="lg-f" label="Flight" value={g.flight} max={10} onChange={(v) => setIn("gate", { flight: v })} /></div>
              <div className="f2"><Txt id="lg-st" label="The stamp" value={g.stamp} max={24} onChange={(v) => setIn("gate", { stamp: v })} /><Txt id="lg-sb" label="The stub" value={g.stub} max={30} onChange={(v) => setIn("gate", { stub: v })} /></div>
              <div className="hint">The date on the pass is always today&apos;s.</div>
            </Box>

            <Box title="Rocket launch" open={false}>
              <div className="btns"><PlayBtn k="rocket" /></div>
              <Txt id="lr-name" label="The rocket's name, painted on its side" value={r.name} max={24} placeholder={names.rocket} onChange={(v) => setIn("rocket", { name: v })} hint="Empty uses Mini Shourobh's rocket name from the Mascot page." />
              <Sw checked={r.mini} onChange={(v) => setIn("rocket", { mini: v })}>Mini Shourobh waves, then hops in</Sw>
              <Lines id="lr-lines" label="What he says while it fuels (one per line, they take turns)" value={r.lines} onChange={(v) => setIn("rocket", { lines: v })} />
              <Range id="lr-cd" label="Counts down from" value={r.countFrom} lim={LAUNCH_LIMITS.countFrom} step={1} unit="" onChange={(v) => setIn("rocket", { countFrom: v })} />
            </Box>

            <Box title="Name from particles" open={false}>
              <div className="btns"><PlayBtn k="particles" /></div>
              <div className="f2"><Txt id="lp-w" label="The word the dots make" value={pa.word} max={14} onChange={(v) => setIn("particles", { word: v })} hint="Short reads best: up to about 10 letters." /><Txt id="lp-s" label="The line under it" value={pa.sub} max={30} onChange={(v) => setIn("particles", { sub: v })} /></div>
              <Sw checked={pa.touch} onChange={(v) => setIn("particles", { touch: v })}>Visitors can push the dots with the mouse or a finger</Sw>
              {pa.touch && <Txt id="lp-h" label="The hint at the bottom" value={pa.hint} max={70} onChange={(v) => setIn("particles", { hint: v })} />}
            </Box>

            <Box title="Movie opening" open={false}>
              <div className="btns"><PlayBtn k="movie" /></div>
              <div className="f3"><Txt id="lm-pre" label="Above" value={mo.pre} max={12} onChange={(v) => setIn("movie", { pre: v })} /><Txt id="lm-st" label="Production name" value={mo.studio} max={18} onChange={(v) => setIn("movie", { studio: v })} /><Txt id="lm-po" label="Below" value={mo.post} max={20} onChange={(v) => setIn("movie", { post: v })} /></div>
              <div className="f2"><Txt id="lm-t" label="Title that slams in" value={mo.title} max={24} onChange={(v) => setIn("movie", { title: v })} /><Txt id="lm-s" label="The line under the title" value={mo.starring} max={50} onChange={(v) => setIn("movie", { starring: v })} /></div>
              <Sw checked={mo.grain} onChange={(v) => setIn("movie", { grain: v })}>Film grain</Sw>
            </Box>

            <Box title="Dhaka street race" open={false}>
              <div className="btns"><PlayBtn k="street" /></div>
              <Lines id="ls-lines" label="What the CNG's bubble says while it loads (one per line)" value={st.lines} onChange={(v) => setIn("street", { lines: v })} />
              <div className="f3"><Txt id="ls-sign" label="Road sign" value={st.sign} max={18} onChange={(v) => setIn("street", { sign: v })} /><Txt id="ls-done" label="At the finish" value={st.done} max={24} onChange={(v) => setIn("street", { done: v })} /><Txt id="ls-honk" label="The honk" value={st.honk} max={18} onChange={(v) => setIn("street", { honk: v })} /></div>
            </Box>

            <Box title="Scrapbook cover" open={false}>
              <div className="btns"><PlayBtn k="book" /></div>
              <div className="f2"><Txt id="lk-t" label="Title on the cover" value={bk.title} max={30} onChange={(v) => setIn("book", { title: v })} /><Txt id="lk-b" label="Under the title" value={bk.by} max={30} onChange={(v) => setIn("book", { by: v })} /></div>
              <div className="f2"><Txt id="lk-w" label="Written inside" value={bk.welcome} max={30} onChange={(v) => setIn("book", { welcome: v })} /><Txt id="lk-s" label="Signed" value={bk.signed} max={30} onChange={(v) => setIn("book", { signed: v })} /></div>
              <div className="f2"><Txt id="lk-c" label="While loading" value={bk.collecting} max={40} onChange={(v) => setIn("book", { collecting: v })} hint="Followed by how many of the 6 parts are in." /><Txt id="lk-a" label="When everything's in" value={bk.allIn} max={40} onChange={(v) => setIn("book", { allIn: v })} /></div>
            </Box>

            <div className="btns"><button type="button" className="b-out b-sm" onClick={() => setD(DEFAULT_LAUNCH)}>Back to all the starting settings</button></div>
          </div>
        </div>
      </div>
      {note && <div className={`adm-toast stu-toast${note.bad ? " bad" : ""}`} role="status">{note.t}</div>}
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={() => setD(saved)} />
    </div>
  );
}
