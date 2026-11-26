"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_MASCOT, MZ_AUTO, MZ_BITS, MZ_BIT_OF_LAYOUT, MZ_GAMES, MZ_GLASSES, MZ_HATS, MZ_JEANS, MZ_LIMITS, MZ_OUTFITS, MZ_OUTFIT_COLORS, MZ_QA, MZ_SHIRTS, MZ_SHOES, MZ_SKINS, MZ_TRICKS,
  type MascotSettings, type MzBit, type MzQa,
} from "@/lib/mascot";
import { saveMascot } from "@/app/actions";
import type { MzStudioMsg } from "@/components/site/Mascot";
import { SaveBar, SiteScreens } from "./ChromeStudio";

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
type Sec = { title: string; emoji: string; layout: string; code: string };

/* small pieces of the page, outside the editor so typing never remounts them */
const Box = ({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) => (
  <details className="c box" open={open}><summary><span>{title}</span><i className="ti ti-chevron-down" /></summary><div className="f">{children}</div></details>
);
const Chips = <T extends string>({ list, value, onPick }: { list: readonly (readonly [T, string])[]; value: T; onPick: (v: T) => void }) => (
  <div className="hst-chips">{list.map(([k, label]) => <button key={k} type="button" className={`hst-chip${value === k ? " on" : ""}`} onClick={() => onPick(k)}>{label}</button>)}</div>
);
const Sw = ({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) => (
  <label className="switch"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />{children}</label>
);
const Slider = ({ id, label, value, lim, unit, onChange }: { id: string; label: string; value: number; lim: readonly [number, number]; unit: string; onChange: (v: number) => void }) => (
  <div className="fl cs-slider"><label htmlFor={id}>{label} <b>{value}{unit}</b></label><input id={id} type="range" min={lim[0]} max={lim[1]} step={1} value={value} onChange={(e) => onChange(+e.target.value)} /></div>
);
/** a list of dates (Eid days, match days): each with a remove button, and a date box to add one */
const DateList = ({ id, label, value, onChange }: { id: string; label: string; value: string[]; onChange: (v: string[]) => void }) => {
  const [add, setAdd] = useState("");
  return (
    <div className="fl"><label htmlFor={id}>{label}</label>
      {value.length > 0 && <div className="hst-chips">{value.map((x) => <button key={x} type="button" className="hst-chip on" title="Remove this date" onClick={() => onChange(value.filter((y) => y !== x))}>{x} ✕</button>)}</div>}
      <div className="hst-chips"><input id={id} className="inp" type="date" value={add} onChange={(e) => setAdd(e.target.value)} /><button type="button" className="hst-chip" disabled={!add} onClick={() => { if (add && !value.includes(add)) onChange([...value, add].sort()); setAdd(""); }}>+ Add</button></div>
    </div>
  );
};
/** one thing he can do: its switch (when it has one) and a button that plays it on both screens */
const Row = ({ label, on, onChange, test }: { label: React.ReactNode; on?: boolean; onChange?: (v: boolean) => void; test?: () => void }) => (
  <div className="mzs-row">
    {onChange ? <label className="switch"><input type="checkbox" checked={!!on} onChange={(e) => onChange(e.target.checked)} />{label}</label> : <span className="mzs-rl">{label}</span>}
    {test && <button type="button" className="hst-chip mzs-test" onClick={test}>▶ Test</button>}
  </div>
);
const Group = ({ title, hint, children, open = false }: { title: string; hint?: string; children: React.ReactNode; open?: boolean }) => (
  <details className="mzs-group" open={open}><summary>{title}</summary>{hint && <p className="hint">{hint}</p>}<div className="mzs-rows">{children}</div></details>
);
const Btn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => <button type="button" className="hst-chip" onClick={onClick}>{children}</button>;

/**
 * The Mascot page (/admin/mascot), in the dashboard menu's second group beside Hanging banner and Appearance.
 * On the left, the real Mini Shourobh (mascotEngine.ts in preview mode) with a button for every move; on the right,
 * every setting in boxes. Changes show on the preview at once; one Save writes settings.mascot (saveMascot).
 */
export default function MascotStudio({ first, timezone, sections }: { first: MascotSettings; timezone: string; sections: Sec[] }) {
  const router = useRouter();
  const [saved, setSaved] = useState(first);
  const [d, setD] = useState(first);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ t: string; bad?: boolean } | null>(null);
  const dirty = !same(d, saved);
  /* the screens: your real homepage on a computer and a phone (/?mz=studio, components/site/Mascot.tsx), with this page's unsaved settings */
  const frames = useRef<(HTMLIFrameElement | null)[]>([]);
  const draft: MzStudioMsg = { type: "lc-mz-draft", m: d };
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 4000); return () => clearTimeout(t); }, [note]);

  const set = (patch: Partial<MascotSettings>) => setD((x) => ({ ...x, ...patch }));
  const setFun = (patch: Partial<MascotSettings["fun"]>) => setD((x) => ({ ...x, fun: { ...x.fun, ...patch } }));
  const setQa = (k: MzQa, patch: Partial<MascotSettings["qa"][MzQa]>) => setD((x) => ({ ...x, qa: { ...x.qa, [k]: { ...x.qa[k], ...patch } } }));
  const setCv = (patch: Partial<MascotSettings["convo"]>) => setD((x) => ({ ...x, convo: { ...x.convo, ...patch } }));
  /* the voices this computer has; a visitor hears the same one if their device has it, otherwise the closest kind */
  const [voices, setVoices] = useState<{ name: string; lang: string }[]>([]);
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => { const vs = speechSynthesis.getVoices().map((v) => ({ name: v.name, lang: v.lang })); vs.sort((a, b) => Number(!/^en/i.test(a.lang)) - Number(!/^en/i.test(b.lang)) || a.name.localeCompare(b.name)); setVoices(vs); };
    load(); speechSynthesis.addEventListener("voiceschanged", load); return () => speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);
  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    const r = await saveMascot(d).catch(() => null);
    setSaving(false);
    if (!r || !r.ok) { setNote({ t: r && !r.ok ? r.error : "That didn't save. Check your connection and try again.", bad: true }); return; }
    setSaved(d); setNote({ t: "Saved. It's live on your site." }); router.refresh();
  };

  /** plays something on both screens */
  const play = (cmd: string, k?: string) => frames.current.forEach((f) => f?.contentWindow?.postMessage({ type: "lc-mz-cmd", cmd, k } satisfies MzStudioMsg, location.origin));
  const setShows = (patch: Partial<MascotSettings["shows"]>) => setD((x) => ({ ...x, shows: { ...x.shows, ...patch } }));
  const setNotice = (k: keyof MascotSettings["fun"]["notice"], v: boolean) => setFun({ notice: { ...d.fun.notice, [k]: v } });
  const bitSections = (k: MzBit) => sections.filter((s) => MZ_BIT_OF_LAYOUT[s.layout] === k).map((s) => `${s.emoji} ${s.title}`.trim()).join(", ");

  return (
    <div className="stu cs">
      <header className="stu-top">
        <div className="stu-name"><h1 className="adm-h">Mascot</h1><p className="adm-sub">{d.show ? "Mini Shourobh is on every page of your site" : "Hidden: visitors don't see him (the preview still shows him, so you can edit)"}{dirty ? " · changes not saved" : ""}</p></div>
        <div className="btns stu-topbtns"><label className="switch cs-show"><input type="checkbox" checked={d.show} onChange={(e) => set({ show: e.target.checked })} />{d.show ? "Showing on site" : "Hidden on site"}</label><a href="/" target="_blank" className="b-out b-sm"><i className="ti ti-eye" />View on site</a></div>
      </header>

      <div className="cs-work">
        <SiteScreens src="/?mz=studio" draft={draft} ready="lc-mz-ready" hint="Your real homepage with him on it, with your changes before saving. Scroll and click inside: it works like the site, and nothing there counts as a visit" onFrames={(f) => { frames.current = f; }} />

        <div className="cs-grid">
          <div className="cs-panel">
          <div className="mzs-bench">
            <div className="mzs-bench-top"><b>Test on your site</b><span className="hint">Switch things on or off, and press ▶ Test to see it on both screens.</span></div>
            <div className="hst-chips"><button type="button" className="hst-chip on" onClick={() => play("openTalk")}>🎙️ Open his chat</button><Btn onClick={() => play("testVoice")}>🔊 Hear his voice</Btn></div>
            <Group title="Shows by himself" hint="While someone is on your page, about every so often he picks a show at random from what's switched on below: never the same one twice in a row, never while they scroll, talk to him or point at a card. The moment that's on (morning cha, night, rain, Eid, birthday) also plays once per visit, a few seconds after he arrives." open>
              <Row label={<b>He puts on shows by himself</b>} on={d.shows.on} onChange={(v) => setShows({ on: v })} test={() => play("show")} />
              <Slider id="mz-every" label="About one show every" value={d.shows.every} lim={MZ_LIMITS.every} unit=" s" onChange={(v) => setShows({ every: v })} />
              <div className="hst-chips">{([[60, "Calm"], [30, "Normal"], [15, "Lively"]] as const).map(([n, l]) => <button key={l} type="button" className={`hst-chip${d.shows.every === n ? " on" : ""}`} onClick={() => setShows({ every: n })}>{l} ({n} s)</button>)}</div>
              <Row label="🤸 Tricks (the ones switched on under Tricks)" on={d.shows.tricks} onChange={(v) => setShows({ tricks: v })} />
              <Row label="⚽ Games (the ones switched on under Games)" on={d.shows.games} onChange={(v) => setShows({ games: v })} />
              <Row label="☕ The moment that's on now, and once per visit" on={d.shows.moments} onChange={(v) => setShows({ moments: v })} />
            </Group>
            <Group title="Tricks" hint="He picks from these at random: in his shows, and when someone asks &ldquo;Do a trick!&rdquo; in his chat." open>
              {MZ_TRICKS.map(([k, l]) => <Row key={k} label={l} on={d.tricks[k]} onChange={(v) => set({ tricks: { ...d.tricks, [k]: v } })} test={() => play("trick", k)} />)}
            </Group>
            <Group title="Games" hint="In his shows, and when nobody has moved for a while (the slider under Fun on the right).">
              {MZ_GAMES.map(([k, l]) => <Row key={k} label={l} on={d.fun.games[k]} onChange={(v) => setFun({ games: { ...d.fun.games, [k]: v } })} test={() => play("fun", k)} />)}
            </Group>
            <Group title="Fun">
              <Row label="🤭 Giggles when clicked fast" on={d.fun.tickle} onChange={(v) => setFun({ tickle: v })} test={() => play("fun", "tickle")} />
              <Row label="😤 Grumpy when the tickling goes on" test={() => play("fun", "grumpy")} />
              <Row label="🤾 Visitors can pick him up and throw him" on={d.fun.throw} onChange={(v) => setFun({ throw: v })} test={() => play("throwDemo")} />
              <Row label="😴 Naps when nobody moves" on={d.nap} onChange={(v) => set({ nap: v })} test={() => play("nap")} />
              <Row label="⏰ Wakes up" test={() => play("wake")} />
              <Row label="🚀 Rocket when someone says goodbye" on={d.fun.rocket} onChange={(v) => setFun({ rocket: v })} test={() => play("ask", "bye")} />
              <Row label="💨 Blown by the wind when they scroll too fast" on={d.fun.notice.fast} onChange={(v) => setNotice("fast", v)} test={() => play("fun", "wind")} />
              <Row label="🎉 Party at the end of the page" on={d.fun.notice.end} onChange={(v) => setNotice("end", v)} test={() => play("fun", "endParty")} />
              <Row label="🥺 Missed them when they come back to the tab" on={d.fun.notice.back} onChange={(v) => setNotice("back", v)} test={() => play("fun", "welcome")} />
              <Row label="🙌 Cheers when they react to something" on={d.cheer} onChange={(v) => set({ cheer: v })} test={() => play("fun", "cheered")} />
              <Row label="👉 Points at the card under their mouse" on={d.fun.notice.point} onChange={(v) => setNotice("point", v)} />
              <Row label="🕺 Secret move (five friendship hearts unlock it)" on={d.fun.hearts} onChange={(v) => setFun({ hearts: v })} test={() => play("fun", "secret")} />
            </Group>
            <Group title="Moments" hint="He picks the moment by himself from your clock; ▶ Test shows each now.">
              <Row label="☕ Morning (5 to 10 am)" on={d.moments.morning} onChange={(v) => set({ moments: { ...d.moments, morning: v } })} test={() => play("moment", "morning")} />
              <Row label="🌙 Night (9 pm to 5 am)" on={d.moments.night} onChange={(v) => set({ moments: { ...d.moments, night: v } })} test={() => play("moment", "night")} />
              <Row label="☔ Rainy day (switch it on when it rains)" on={d.moments.rain} onChange={(v) => set({ moments: { ...d.moments, rain: v } })} test={() => play("moment", "rain")} />
              <Row label="🏮 Eid (switch it on for Eid, or add dates under Special days)" on={d.moments.eid} onChange={(v) => set({ moments: { ...d.moments, eid: v } })} test={() => play("moment", "eid")} />
              <Row label="🎂 Your birthday (the date is under Moments)" test={() => play("moment", "birthday")} />
              <Row label="Back to normal" test={() => play("moment", "normal")} />
            </Group>
            <Group title="Each section" hint="His move when a visitor reaches each kind of section.">
              {MZ_BITS.map(([k, l, move]) => <Row key={k} label={<>{l}: <small>{move}</small></>} on={d.acts[k]} onChange={(v) => set({ acts: { ...d.acts, [k]: v } })} test={() => play("bit", k)} />)}
            </Group>
            <Group title="Special days (his clothes)">
              {MZ_AUTO.map(([k, l]) => <Row key={k} label={l} on={d.auto[k]} onChange={(v) => set({ auto: { ...d.auto, [k]: v } })} test={k === "visitors" ? () => play("openTalk") : () => play("dressFor", k)} />)}
              <Row label="👕 His own look" test={() => play("dressFor", "normal")} />
            </Group>
            <Group title="Questions in his chat">
              {MZ_QA.map(([k]) => <Row key={k} label={d.qa[k].q} on={d.qa[k].on} onChange={(v) => setQa(k, { on: v })} test={() => play("ask", k)} />)}
            </Group>
          </div>
            <Box title="His voice">
              <Sw checked={d.convo.voice} onChange={(v) => setCv({ voice: v })}>He speaks out loud when someone talks to him (visitors can mute him with 🔊)</Sw>
              <div className="mzs-sub">
                <div className="fl"><label htmlFor="mz-voice">Voice</label>
                  <select id="mz-voice" className="inp" value={d.convo.voiceName} onChange={(e) => setCv({ voiceName: e.target.value })}>
                    <option value="">Pick one for each visitor automatically</option>
                    {voices.map((v) => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
                  </select>
                  <div className="hint">These are the voices on this computer. A visitor hears the same voice if their phone or computer has it; otherwise the closest one of the kind below.</div></div>
                <span className="lab">When it picks for a visitor</span>
                <Chips list={[["male", "A man's voice"], ["female", "A woman's voice"], ["any", "Any English voice"]] as const} value={d.convo.voiceKind} onPick={(v) => setCv({ voiceKind: v })} />
                <Slider id="mz-rate" label="Speed" value={d.convo.rate} lim={MZ_LIMITS.rate} unit="%" onChange={(v) => setCv({ rate: v })} />
                <Slider id="mz-pitch" label="Pitch (higher sounds more cartoony)" value={d.convo.pitch} lim={MZ_LIMITS.pitch} unit="%" onChange={(v) => setCv({ pitch: v })} />
                <Slider id="mz-vol" label="Volume" value={d.convo.volume} lim={MZ_LIMITS.volume} unit="%" onChange={(v) => setCv({ volume: v })} />
                <div className="btns"><button type="button" className="b-out b-sm" onClick={() => play("testVoice")}><i className="ti ti-volume" />Hear him say his first words</button></div>
              </div>
            </Box>

            <Box title="The talking scene">
              <div className="hint">Clicking him (or his invite bubble) dims the site and brings him to the middle, where he talks, gestures and acts out his answers. Visitors pick a card or send a quick 👋 😂 ❤️ 🔥. Typing to him shows as &ldquo;AI · coming soon&rdquo; until his AI assistant is built.</div>
              <div className="hint"><b>Everything he says can have versions.</b> Put | between them and he picks one at random each time, never the same twice in a row. For example: <i>Hi there!|Hey you! 👋|Oh, hello!</i></div>
              <div className="fl"><label htmlFor="mz-hello">His first words</label><input id="mz-hello" className="inp" maxLength={400} value={d.convo.hello} onChange={(e) => setCv({ hello: e.target.value })} /></div>
              <Slider id="mz-dim" label="How dark the site gets behind him" value={d.convo.dim} lim={MZ_LIMITS.dim} unit="%" onChange={(v) => setCv({ dim: v })} />
              <Slider id="mz-scale" label="His size on the stage, at most" value={d.convo.scale} lim={MZ_LIMITS.scale} unit="%" onChange={(v) => setCv({ scale: v })} />
              <Sw checked={d.convo.invite} onChange={(v) => setCv({ invite: v })}>Invite visitors with a bubble over his head</Sw>
              <div className="mzs-sub">
                <div className="fl"><label htmlFor="mz-invt">The bubble says</label><input id="mz-invt" className="inp" maxLength={240} value={d.convo.inviteText} onChange={(e) => setCv({ inviteText: e.target.value })} /></div>
                <Slider id="mz-inve" label="It pops up every" value={d.convo.inviteEvery} lim={MZ_LIMITS.inviteEvery} unit=" s" onChange={(v) => setCv({ inviteEvery: v })} />
              </div>
            </Box>

            <Box title="His answers">
              <div className="hint">The questions visitors can pick as cards on the stage. Each line of an answer is a sentence he says, with its own gesture. Put | between versions of a line and he picks one at random; leave an empty line to start a whole other version of the answer (that's how a joke keeps its punchline). Switch a question off and its card goes.</div>
              {MZ_QA.map(([k, anim]) => (
                <div key={k} className="mzs-qa">
                  <Sw checked={d.qa[k].on} onChange={(v) => setQa(k, { on: v })}><b>{d.qa[k].q || k}</b></Sw>
                  <input className="inp" maxLength={60} value={d.qa[k].q} aria-label="Question" onChange={(e) => setQa(k, { q: e.target.value })} />
                  {k !== "trick" && <textarea className="inp" rows={k === "who" || k === "joke" ? 6 : 3} maxLength={1500} value={d.qa[k].a} aria-label="His answer" onChange={(e) => setQa(k, { a: e.target.value })} />}
                  <p className="hint">His move: {anim}{k === "joke" ? ". The last line is the punchline." : ""}{k === "bye" ? ". The first line is what he says." : ""}</p>
                </div>
              ))}
            </Box>

            <Box title="Fun">
              <div className="stu-switches">
                <Sw checked={d.fun.ground} onChange={(v) => setFun({ ground: v })}>Naps on the ground with a pillow and blanket (off: naps standing up)</Sw>
                <Sw checked={d.fun.bored} onChange={(v) => setFun({ bored: v })}>Plays when he&apos;s bored</Sw>
              </div>
              <div className="mzs-sub">
                <div className="hint">Which games he plays: Games when he&apos;s bored, under the screens.</div>
                <Slider id="mz-bored" label="Starts after nobody moves for" value={d.fun.boredAfter} lim={MZ_LIMITS.boredAfter} unit=" s" onChange={(v) => setFun({ boredAfter: v })} />
              </div>
              <span className="lab">The rocket (switched on or off under the screens)</span>
              <div className="mzs-sub">
                <div className="fl"><label htmlFor="mz-rkname">The rocket&apos;s name, painted on its side</label><input id="mz-rkname" className="inp" maxLength={24} value={d.fun.rocketName} onChange={(e) => setFun({ rocketName: e.target.value })} placeholder="SHOUROBH ONE" /><div className="hint">The last word goes on a second line with stars around it. Empty leaves the rocket plain.</div></div>
                <Slider id="mz-back" label="Comes back by parachute after" value={d.fun.backAfter} lim={MZ_LIMITS.backAfter} unit=" s" onChange={(v) => setFun({ backAfter: v })} />
              </div>
              <div className="stu-switches">
                <Sw checked={d.fun.sounds} onChange={(v) => setFun({ sounds: v })}>Little sound effects (only after a visitor taps or types something)</Sw>
              </div>
            </Box>

            <Box title="Moments">
              <Sw checked={d.moments.auto} onChange={(v) => set({ moments: { ...d.moments, auto: v } })}>Pick the moment by itself, from your clock ({timezone}) and the dates below</Sw>
              <div className="hint">Which moments he has: Moments, under the screens.</div>
              <div className="mzs-sub stu-switches">
                <div className="fl"><label htmlFor="mz-bday">Your birthday: party hat, cake and confetti all day</label><input id="mz-bday" className="inp" type="date" value={d.moments.birthday} onChange={(e) => set({ moments: { ...d.moments, birthday: e.target.value } })} /></div>
              </div>
            </Box>

            <Box title="How he lives there">
              <div className="cs-looks">
                {([["corner", "Corner buddy", "Stands in the corner and acts there"], ["peek", "Peeks from the edge", "Half of him comes out of the side of the screen; he steps all the way out for each section and show"]] as const).map(([k, t, desc]) => (
                  <button key={k} type="button" className={`cs-look${d.place === k ? " on" : ""}`} onClick={() => set({ place: k })} aria-pressed={d.place === k}><b>{t}</b><small>{desc}</small></button>
                ))}
              </div>
              <span className="lab">His corner</span>
              <Chips list={[["right", "Right side"], ["left", "Left side"]] as const} value={d.side} onPick={(v) => set({ side: v })} />
              <Slider id="mz-size" label="Size" value={d.size} lim={MZ_LIMITS.size} unit="%" onChange={(v) => set({ size: v })} />
              <Sw checked={d.phones} onChange={(v) => set({ phones: v })}>Show him on phones (smaller, above the bottom bar)</Sw>
            </Box>

            <Box title="His look">
              <span className="lab">Skin</span>
              <div className="hst-chips">{MZ_SKINS.map((k) => <button key={k} type="button" className={`mzs-sw${d.skin === k ? " on" : ""}`} style={{ background: k }} aria-label={`Skin tone ${k}`} onClick={() => set({ skin: k })} />)}</div>
              <span className="lab">Hair</span><Chips list={[["curly", "Curly"], ["swept", "Swept up"], ["short", "Short"]] as const} value={d.hair} onPick={(v) => set({ hair: v })} />
              <span className="lab">Beard</span><Chips list={[["trim", "Trimmed"], ["stubble", "Stubble"], ["clean", "Clean shave"]] as const} value={d.beard} onPick={(v) => set({ beard: v })} />
              <span className="lab">Outfit</span>
              <div className="cs-looks">
                {MZ_OUTFITS.map(([k, t, desc]) => <button key={k} type="button" className={`cs-look${d.outfit === k ? " on" : ""}`} onClick={() => set({ outfit: k })} aria-pressed={d.outfit === k}><b>{t}</b><small>{desc}</small></button>)}
              </div>
              {d.outfit === "everyday" ? (<>
                <span className="lab">Shirt</span><Chips list={Object.entries(MZ_SHIRTS).map(([k, v]) => [k, v[2]] as const)} value={d.shirt} onPick={(v) => set({ shirt: v as MascotSettings["shirt"] })} />
                <span className="lab">Jeans</span><Chips list={Object.entries(MZ_JEANS).map(([k, v]) => [k, v[2]] as const)} value={d.jeans} onPick={(v) => set({ jeans: v as MascotSettings["jeans"] })} />
              </>) : (<>
                <span className="lab">Colour</span>
                <div className="hst-chips">{MZ_OUTFIT_COLORS[d.outfit].map(([n, a, b], i) => {
                  const k = d.outfit as keyof typeof MZ_OUTFIT_COLORS, on = d.colors[k] === i;
                  return <button key={n} type="button" className={`mzs-sw${on ? " on" : ""}`} style={{ background: `linear-gradient(135deg, ${a} 55%, ${b} 55%)` }} title={n} aria-label={n} aria-pressed={on} onClick={() => set({ colors: { ...d.colors, [k]: i } })} />;
                })}</div>
              </>)}
              <span className="lab">Glasses</span><Chips list={MZ_GLASSES} value={d.glasses} onPick={(v) => set({ glasses: v })} />
              <span className="lab">Hat</span><Chips list={MZ_HATS} value={d.hat} onPick={(v) => set({ hat: v })} />
              <span className="lab">Shoes</span><Chips list={MZ_SHOES} value={d.shoes} onPick={(v) => set({ shoes: v })} />
              <div className="hint">His hair tucks under any hat, so curls only peek out at the sides. Moments still put on their own hat: the night cap at night, the party hat on your birthday, the tupi on Eid.</div>
            </Box>

            <Box title="Special days">
              <div className="hint">He dresses for these by himself, all day in your time zone ({timezone}), then goes back to the look above. Try each with the Special days buttons under his preview.</div>
              <ul className="mzs-days">{MZ_AUTO.map(([k, t, desc]) => <li key={k}><b>{t}</b>: {desc}{d.auto[k] ? "" : " (off)"}</li>)}</ul>
              <DateList id="mz-eid" label="Eid dates (each day he wears panjabi and tupi)" value={d.eidDates} onChange={(v) => set({ eidDates: v })} />
              <DateList id="mz-match" label="Big match days (he wears his jersey)" value={d.matchDates} onChange={(v) => set({ matchDates: v })} />
              <div className="hint">Your birthday is the date under Moments.</div>
            </Box>

            <Box title="Personality">
              <Chips list={[["quiet", "Quiet: only says hello"], ["normal", "Normal: a line per section"], ["chatty", "Chatty: plus little tips"]] as const} value={d.chat} onPick={(v) => set({ chat: v })} />
              <div className="stu-switches">
                <Sw checked={d.follow} onChange={(v) => set({ follow: v })}>His eyes follow the visitor&apos;s mouse</Sw>
                <Sw checked={d.duck} onChange={(v) => set({ duck: v })}>Ducks when the mouse rushes at him</Sw>
                <Sw checked={d.cheer} onChange={(v) => set({ cheer: v })}>Cheers when someone reacts</Sw>
                <Sw checked={d.nap} onChange={(v) => set({ nap: v })}>Naps when nobody&apos;s around</Sw>
              </div>
              <Slider id="mz-nap" label="Naps after nobody moves for" value={d.napAfter} lim={MZ_LIMITS.napAfter} unit=" s" onChange={(v) => set({ napAfter: v })} />
            </Box>

            <Box title="Each section">
              <div className="fl"><label htmlFor="mz-greet">Greeting, once per visit</label><textarea id="mz-greet" className="inp" rows={2} maxLength={600} value={d.greet} onChange={(e) => set({ greet: e.target.value })} /><div className="hint">{"{time}"} becomes morning, afternoon, evening or night on your clock. Put | between versions and he picks one at random.</div></div>
              {MZ_BITS.filter(([k]) => k !== "hero").map(([k, label, move]) => (
                <div key={k} className="mzs-qa">
                  <b>{label}</b>
                  <textarea className="inp" rows={2} maxLength={600} value={d.lines[k as Exclude<MzBit, "hero">]} aria-label={`${label}: his line`} onChange={(e) => set({ lines: { ...d.lines, [k]: e.target.value } })} />
                  <p className="hint">{move}. {bitSections(k) ? `Your sections: ${bitSections(k)}.` : "None of your sections uses this look right now."}</p>
                </div>
              ))}
              <div className="btns"><button type="button" className="b-out b-sm" onClick={() => setD(DEFAULT_MASCOT)}>Back to all the starting settings</button></div>
            </Box>
          </div>
        </div>
      </div>
      {note && <div className={`adm-toast stu-toast${note.bad ? " bad" : ""}`} role="status">{note.t}</div>}
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={() => setD(saved)} />
    </div>
  );
}
