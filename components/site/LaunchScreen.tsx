"use client";
import { useEffect, useRef, useState } from "react";
import { LAUNCH_KEYS, launchWords, type LaunchKey, type LaunchNames, type LaunchSettings } from "@/lib/launch";

/**
 * The launch screen (lib/launch.ts). skinScript decides before the first paint whether it plays and which design
 * (html.launching, data-launch), so this layer covers the page from its first frame; its intro is CSS, so it moves before
 * any script has loaded. Once the page's scripts run, launchScenes.ts (loaded only then) follows the real loading and opens
 * it with GSAP. Every scene is drawn here by React and only moved by the scripts, so nothing React owns is rewritten.
 * Inside the dashboard's preview (`/?launch=studio`) it waits for the page to send a draft and a Play.
 */
export type LaunchStudioMsg = { type: "lc-launch-draft"; cfg: LaunchSettings; play: number; k: string };

const isStudio = () => { try { return window.self !== window.top && new URLSearchParams(location.search).get("launch") === "studio"; } catch { return false; } };
/** the same "random" numbers on the server and in the browser (whole-number arithmetic), so the page hydrates cleanly */
const seeded = (seed: number) => { let x = seed; return () => (x = (x * 16807) % 2147483647) / 2147483647; };
const p1 = (v: number) => `${Math.round(v * 10) / 10}%`;
const firstLine = (s: string) => s.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? "";

const PLANE = <svg viewBox="0 0 24 24" aria-hidden><path fill="currentColor" transform="rotate(90 12 12)" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" /></svg>;
/** Mini Shourobh, drawn small for the launch screens */
export const LAUNCH_MINI = `<svg viewBox="0 0 60 96" aria-hidden="true"><path class="lmz-arm" d="M44 52 L55 36" stroke="#e8b48a" stroke-width="5" stroke-linecap="round"/><path d="M16 54 L8 67" stroke="#e8b48a" stroke-width="5" stroke-linecap="round"/><rect x="20" y="74" width="7" height="18" rx="3" fill="#2b3a34"/><rect x="33" y="74" width="7" height="18" rx="3" fill="#2b3a34"/><rect x="15" y="45" width="30" height="32" rx="10" fill="#7ee8a2"/><circle cx="30" cy="27" r="17" fill="#e8b48a"/><path d="M13 25 Q13 8 30 8 Q47 8 47 25 Q41 15 30 16 Q19 15 13 25Z" fill="#1d1a18"/><circle cx="24" cy="28" r="2.2" fill="#1d1a18"/><circle cx="36" cy="28" r="2.2" fill="#1d1a18"/><path d="M24 35 Q30 40 36 35" stroke="#1d1a18" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
const FACE = `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="21" r="15" fill="#e8b48a"/><path d="M5 19 Q5 4 20 4 Q35 4 35 19 Q30 11 20 12 Q10 11 5 19Z" fill="#1d1a18"/><circle cx="15" cy="22" r="1.9" fill="#1d1a18"/><circle cx="25" cy="22" r="1.9" fill="#1d1a18"/><path d="M15 28 Q20 32 25 28" stroke="#1d1a18" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>`;

function Gate({ c, w }: { c: LaunchSettings["gate"]; w: (s: string) => string }) {
  const board = w(c.board);
  return (
    <div className="lch-scene lch-gate">
      <div className="lg-door lg-l"><span>GATE</span></div><div className="lg-door lg-r"><span>{w(c.gate)}</span></div>
      <div className="lg-board"><b className="lg-flap">{[...board].map((ch, i) => <span key={i} style={{ ["--i" as string]: i }}>{ch === " " ? " " : ch}</span>)}</b><i className="lg-status">CHECK-IN</i></div>
      <div className="lg-slot" />
      <div className="lg-win"><div className="lg-print"><div className="lg-pass">
        <div className="lg-band"><span>{w(c.band)}</span><span>{w(c.flight)}</span></div>
        <div className="lg-route"><div><small>FROM</small><b>{w(c.fromCode)}</b><em>{w(c.fromName)}</em></div>{PLANE}<div><small>TO</small><b>{w(c.toCode)}</b><em>{w(c.toName)}</em></div></div>
        <div className="lg-grid"><div><small>PASSENGER</small><b>{w(c.passenger)}</b></div><div><small>GATE</small><b>{w(c.gate)}</b></div><div><small>SEAT</small><b>{w(c.seat)}</b></div><div><small>DATE</small><b className="lg-date">TODAY</b></div></div>
        <div className="lg-prog"><div className="lg-track"><i className="lg-fill" /><span className="lg-plane">{PLANE}</span></div><span className="lg-pct">Checking in · 0%</span></div>
        <div className="lg-tear" />
        <div className="lg-stub"><div className="lg-bars" /><span>{w(c.stub)}<br />FLIGHT {w(c.flight)}</span></div>
        <div className="lg-stamp">{w(c.stamp)}</div>
      </div></div></div>
    </div>
  );
}

function Rocket({ c, w, rocket }: { c: LaunchSettings["rocket"]; w: (s: string) => string; rocket: string }) {
  const r = seeded(7), stars = Array.from({ length: 44 }, (_, i) => ({ l: p1(r() * 100), t: p1(r() * 72), s: (0.5 + r() * 1.1).toFixed(2), d: `${(-r() * 3).toFixed(2)}s`, k: i }));
  const first = firstLine(c.lines);
  const tl = Math.min(110, rocket.length * 8.2);
  return (
    <div className="lch-scene lch-rocket">
      <div className="lr-sky" /><div className="lr-stars">{stars.map((s) => <i key={s.k} style={{ left: s.l, top: s.t, scale: s.s, animationDelay: s.d }} />)}</div><div className="lr-moon" />
      <div className="lr-panel"><span className="lr-pl">FUELLING</span> · <b className="lr-pp">0%</b></div>
      <div className="lr-ground" /><div className="lr-tower" /><div className="lr-fuel"><i /></div><div className="lr-fuel-l">FUEL</div><div className="lr-pad" />
      <div className="lr-smoke">{Array.from({ length: 24 }, (_, i) => <i key={i} className="lr-puff" />)}</div>
      <div className="lr-rocket"><div className="lr-rocket-in">
        <svg viewBox="0 0 100 250" aria-hidden><g className="lr-flame"><g className="lr-flk"><path d="M38 210 Q50 272 62 210Z" fill="#ffad42" /><path d="M43 210 Q50 246 57 210Z" fill="#fff3b0" /></g></g><path d="M27 150 L6 206 L29 198Z" fill="#2f7a52" /><path d="M73 150 L94 206 L71 198Z" fill="#2f7a52" /><path d="M50 6 C74 40 78 96 74 198 L26 198 C22 96 26 40 50 6Z" fill="#eef3f1" stroke="#b9c6c0" strokeWidth="2" /><path d="M50 6 C61 21 67 33 70 43 L30 43 C33 33 39 21 50 6Z" className="lr-nose" /><circle cx="50" cy="72" r="11" fill="#9fd8e6" stroke="#2a3a44" strokeWidth="3" />{rocket && <text transform="translate(58 196) rotate(-90)" fontFamily="'Space Grotesk', Arial, sans-serif" fontWeight="700" fontSize="8.6" fill="#1d3a2c" textLength={tl} lengthAdjust="spacingAndGlyphs">{rocket}</text>}<rect className="lr-door" x="30" y="160" width="12" height="24" rx="2" fill="#c9d3cf" stroke="#9fb0a7" /><path d="M34 198 L66 198 L60 211 L40 211Z" fill="#3c4a45" /></svg>
      </div></div>
      {c.mini && <div className="lr-mini"><div className="lr-mini-in" dangerouslySetInnerHTML={{ __html: LAUNCH_MINI }} /></div>}
      {c.mini && first && <div className="lr-bub"><span className="lr-say">{w(first)}</span></div>}
      <div className="lr-count" /><div className="lr-fog" />
    </div>
  );
}

function Particles({ c, w }: { c: LaunchSettings["particles"]; w: (s: string) => string }) {
  return (
    <div className="lch-scene lch-particles">
      <div className="lp-bg" /><div className="lp-word">{w(c.word)}</div><canvas className="lp-cv" />
      <div className="lp-sub">{w(c.sub)}</div><div className="lp-pct">GATHERING · 0%</div>{c.touch && c.hint && <div className="lp-hint">{w(c.hint)}</div>}
    </div>
  );
}

function Movie({ c, w }: { c: LaunchSettings["movie"]; w: (s: string) => string }) {
  return (
    <div className="lch-scene lch-movie">
      <div className="lm-bg" />{c.grain && <canvas className="lm-grain" width={240} height={150} />}<div className="lm-leak" /><div className="lm-vig" />
      <div className="lm-prod"><div>{c.pre && <span>{w(c.pre)}</span>}<b>{w(c.studio)}</b>{c.post && <span>{w(c.post)}</span>}</div></div>
      <div className="lm-leader"><div className="lm-sweep" /><div className="lm-ring" /><div className="lm-num">5</div></div>
      <div className="lm-load">LOADING REEL · 0%</div>
      <div className="lm-title"><b>{w(c.title)}</b><span>{[...w(c.starring)].map((ch, i) => <i key={i}>{ch === " " ? " " : ch}</i>)}</span></div>
      <div className="lm-streak" /><div className="lm-flash" /><div className="lm-bar t" /><div className="lm-bar b" />
    </div>
  );
}

function Street({ c, w }: { c: LaunchSettings["street"]; w: (s: string) => string }) {
  const r = seeded(11);
  const plan = Array.from({ length: 13 }, (_, i) => ({ w: p1(5 + r() * 4), h: p1(i === 5 ? 40 : 30 + r() * 58), lit: r() < 0.7, dome: i === 5 }));
  const half = (k: number) => (
    <div className="ls-half" key={k}>{plan.map((b, i) => <div key={i} className={`ls-b${b.lit ? " lit" : ""}`} style={{ width: b.w, height: b.h }}>{b.dome && <><i className="ls-dome" /><i className="ls-min" /></>}</div>)}</div>
  );
  return (
    <div className="lch-scene lch-street">
      <div className="ls-sky" /><div className="ls-moon" /><div className="ls-city"><div className="ls-strip">{half(0)}{half(1)}</div></div>
      <div className="ls-sign"><small>{w(c.sign)}</small><b className="ls-pct">0%</b></div>
      <div className="ls-road"><div className="ls-kerb" /><div className="ls-lane" /></div>
      <div className="ls-finish" /><div className="ls-pole" /><div className="ls-flag" />
      <div className="ls-rick"><div className="ls-in">
        <svg viewBox="0 0 140 96" aria-hidden><path d="M34 76 L70 58 L118 82 M70 58 L92 34" stroke="#c9a227" strokeWidth="3.2" fill="none" strokeLinecap="round" /><path d="M12 42 Q14 8 50 6 Q63 6 66 42Z" fill="#d9483b" /><path d="M17 37 Q21 14 48 12" stroke="#f2c14e" strokeWidth="3.2" fill="none" /><path d="M22 24 Q28 15 41 13" stroke="#2fa3d9" strokeWidth="2.4" fill="none" /><circle cx="30" cy="28" r="3" fill="#f2c14e" /><circle cx="44" cy="22" r="2.4" fill="#2fa3d9" /><rect x="16" y="42" width="46" height="11" rx="3" fill="#2a6e9e" /><rect x="18" y="53" width="40" height="5" rx="2" fill="#1d4f73" /><circle cx="93" cy="20" r="7" fill="#8a5a3c" /><path d="M93 28 L88 52" stroke="#f1efe6" strokeWidth="7" strokeLinecap="round" /><path d="M88 52 L82 68" stroke="#3b3b3b" strokeWidth="4" strokeLinecap="round" /><path d="M93 34 L106 40 L112 38" stroke="#8a5a3c" strokeWidth="3.4" fill="none" strokeLinecap="round" /><g className="ls-wh"><circle cx="34" cy="76" r="17" fill="none" stroke="#c9cfcb" strokeWidth="3.4" /><circle cx="34" cy="76" r="3" fill="#c9cfcb" /><path d="M34 59V93M17 76H51M22 64L46 88M46 64L22 88" stroke="#c9cfcb" strokeWidth="1" opacity=".7" /></g><g className="ls-wh"><circle cx="118" cy="82" r="11" fill="none" stroke="#c9cfcb" strokeWidth="3" /><circle cx="118" cy="82" r="2.4" fill="#c9cfcb" /><path d="M118 71V93M107 82H129" stroke="#c9cfcb" strokeWidth="1" opacity=".7" /></g></svg>
      </div></div>
      <div className="ls-cng"><div className="ls-in">
        <div className="ls-bub"><span className="ls-say">{w(firstLine(c.lines))}</span></div><div className="ls-beam" />
        <svg viewBox="0 0 130 86" aria-hidden><path d="M30 14 Q32 5 44 5 L86 5 Q96 5 98 14Z" fill="#14733d" /><path d="M14 64 L16 30 Q18 15 34 14 L88 14 Q101 14 107 27 L119 49 Q123 57 121 64 Z" fill="#1f9d55" /><path d="M96 22 L109 47 L94 47 L92 22Z" fill="#bfe7f5" opacity=".85" /><rect x="33" y="19" width="56" height="29" rx="3" fill="#0c3b22" opacity=".45" /><path d="M41 19V48M49 19V48M57 19V48M65 19V48M73 19V48M81 19V48M33 33.5H89" stroke="#9fd8b8" strokeWidth="1.4" opacity=".7" /><circle cx="118" cy="45" r="3.6" fill="#ffe27a" /><rect x="10" y="52" width="10" height="5" rx="2" fill="#e04848" /><g className="ls-wh"><circle cx="31" cy="66" r="11" fill="#141917" /><circle cx="31" cy="66" r="4" fill="#9aa59f" /><path d="M31 57V75M22 66H40" stroke="#56625d" strokeWidth="1.6" /></g><g className="ls-wh"><circle cx="104" cy="66" r="11" fill="#141917" /><circle cx="104" cy="66" r="4" fill="#9aa59f" /><path d="M104 57V75M95 66H113" stroke="#56625d" strokeWidth="1.6" /></g></svg>
      </div></div>
      <div className="ls-peep">{w(c.honk)}</div>
    </div>
  );
}

const STICKERS: [string, string][] = [["📄", "The page"], ["Aa", "Fonts"], ["🖼️", "Pictures"], ["✨", "3D hero"], ["🌙", "Theme background"], [FACE, "Mini Shourobh"]];
const SPOTS = [[9, 56, -8], [35, 60, 6], [60, 55, -12], [13, 76, 10], [39, 79, -5], [62, 75, 12]];
function Book({ c, w }: { c: LaunchSettings["book"]; w: (s: string) => string }) {
  return (
    <div className="lch-scene lch-book">
      <div className="lk-desk" />
      <div className="lk-drop"><div className="lk-book">
        <div className="lk-shadow" />
        <div className="lk-page p3"><div className="lk-hi">{w(c.welcome)}<small>{w(c.signed)}</small></div></div><div className="lk-page p2" /><div className="lk-page p1" />
        <div className="lk-cover">
          <div className="lk-front">
            <div className="lk-tape" /><div className="lk-label"><b>{w(c.title)}</b><small>{w(c.by)}</small></div>
            {STICKERS.map(([art, name], i) => <div key={i} className="lk-st" title={name} style={{ left: `${SPOTS[i][0]}%`, top: `${SPOTS[i][1]}%`, ["--r" as string]: `${SPOTS[i][2]}deg` }} dangerouslySetInnerHTML={{ __html: art }} />)}
          </div>
          <div className="lk-back" />
        </div>
        <div className="lk-band" />
      </div></div>
      <div className="lk-cap">{w(c.collecting)} 0 of 6</div>
    </div>
  );
}

export default function LaunchScreen({ cfg: first, names }: { cfg: LaunchSettings; names: LaunchNames }) {
  const [cfg, setCfg] = useState(first);
  const [run, setRun] = useState(0);
  const [gen, setGen] = useState(0); // the dashboard's preview draws the scenes afresh for every Play
  const [keys, setKeys] = useState<string[]>(() => (first.on ? (first.design === "random" ? [...first.pool] : [first.design]) : []));
  const root = useRef<HTMLDivElement>(null);
  const rocket = cfg.rocket.name || names.rocket;
  const nm: LaunchNames = { ...names, rocket };
  const w = (s: string) => launchWords(s, nm);

  // what to play: decided by skinScript before the first paint, or by the dashboard's Play
  useEffect(() => {
    const h = document.documentElement;
    if (isStudio()) {
      let played = -1;
      setKeys([...LAUNCH_KEYS]);
      const on = (e: MessageEvent) => {
        const d = e.data as LaunchStudioMsg;
        if (e.origin !== location.origin || !d || d.type !== "lc-launch-draft") return;
        setCfg(d.cfg);
        if (d.play === played) return;
        played = d.play;
        const pool = d.cfg.pool.length ? d.cfg.pool : [...LAUNCH_KEYS];
        const k = d.k === "random" ? pool[Math.floor(Math.random() * pool.length)] : d.k;
        h.setAttribute("data-launch", k); h.classList.add("launching");
        scrollTo({ top: 0, behavior: "instant" });
        setGen((n) => n + 1); setRun((n) => n + 1);
      };
      addEventListener("message", on);
      parent.postMessage({ type: "lc-launch-ready" }, location.origin);
      return () => removeEventListener("message", on);
    }
    const k = h.dataset.launch;
    if (!k || !h.classList.contains("launching")) return;
    if (k !== "calm") setKeys((x) => (x.includes(k) ? x : [...x, k]));
    setRun(1);
  }, []);

  // run it: the scripts (GSAP and the scenes) load only when a launch is showing
  useEffect(() => {
    if (!run) return;
    const h = document.documentElement, el = root.current, k = h.dataset.launch;
    if (!el || !k || !h.classList.contains("launching")) return;
    let stop = () => {}, dead = false;
    Promise.all([import("gsap"), import("./launchScenes")])
      .then(([g, m]) => { if (!dead) stop = m.startLaunch(el, k, { gsap: g.gsap, cfg, names: nm, fake: isStudio() }); })
      .catch(() => { h.classList.remove("launching", "launch-run"); h.removeAttribute("data-launch"); });
    return () => { dead = true; stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  return (
    <div ref={root} className={`lch${cfg.colors === "theme" ? " lch-theme" : ""}`} role="dialog" aria-label="Welcome">
      <div className="lch-scenes" key={gen}>
        {keys.includes("gate") && <Gate c={cfg.gate} w={w} />}
        {keys.includes("rocket") && <Rocket c={cfg.rocket} w={w} rocket={rocket} />}
        {keys.includes("particles") && <Particles c={cfg.particles} w={w} />}
        {keys.includes("movie") && <Movie c={cfg.movie} w={w} />}
        {keys.includes("street") && <Street c={cfg.street} w={w} />}
        {keys.includes("book") && <Book c={cfg.book} w={w} />}
        <div className="lch-scene lch-calm"><div className="lq-wrap"><b>{names.nick}</b><span>Life Chronicle</span><div className="lq-bar"><i /></div></div></div>
      </div>
      <div className="lch-ui">
        {cfg.skip && <button type="button" className="lch-skip">{cfg.skipLabel}</button>}
        <button type="button" className="lch-enter" hidden>{cfg.enterLabel}</button>
      </div>
    </div>
  );
}

export type { LaunchKey };
