"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Box } from "@/components/admin/Box";
import { MINI_MOVES, OTHER_MOVES, mascotSvg, type Move } from "@/components/site/mascotArt";
import {
  ACT_KEYS, MASCOT_ACTS, MASCOT_BEARDS, MASCOT_CHARACTERS, MASCOT_GAP, MASCOT_HAIR, MASCOT_MOVES, MASCOT_OUTFITS, MASCOT_SIDES, MASCOT_SIZE, MASCOT_SKIN, MASCOT_SLEEP, MOVE_KEYS,
  type MascotAct, type MascotCharacter, type MascotSettings,
} from "@/lib/mascot";

type Sec = { slug: string; title: string; emoji: string };
const COSTUMES = [["", "No outfit"], ["day", "☀️ Sunny"], ["night", "🌙 Night"], ["ocean", "🌊 Ocean"], ["party", "🎉 Party"]] as const;

/** The Mascot page: every setting, with the real mascot beside it, wearing the choices as they're made. */
export default function MascotPanel({ initial, sections, open }: { initial: MascotSettings; sections: Sec[]; open: Record<string, boolean> }) {
  const [m, setM] = useState(initial);
  const set = <K extends keyof MascotSettings>(k: K, v: MascotSettings[K]) => setM((o) => ({ ...o, [k]: v }));
  const toggle = <T extends string>(list: T[], k: T) => (list.includes(k) ? list.filter((x) => x !== k) : [...list, k]);
  const mini = m.character === "mini";

  /* the preview: the real drawing, its poses and moves */
  const [pose, setPose] = useState("cross");
  const [doing, setDoing] = useState("");
  const [line, setLine] = useState("");
  const [cos, setCos] = useState("");
  const [sleep, setSleep] = useState(false);
  const timer = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  const art = useMemo(() => mascotSvg({ character: m.character, outfit: m.outfit, beard: m.beard, glasses: m.glasses, hair: m.hair, skin: m.skin, uid: "adm" }), [m.character, m.outfit, m.beard, m.glasses, m.hair, m.skin]);
  const thumbs = useMemo(() => (Object.keys(MASCOT_CHARACTERS) as MascotCharacter[]).map((k) => mascotSvg({ character: k, outfit: m.outfit, beard: m.beard, glasses: m.glasses, hair: m.hair, skin: m.skin, uid: "t" + k })), [m.outfit, m.beard, m.glasses, m.hair, m.skin]);
  const moves: Move[] = mini ? m.moves.map((k) => MINI_MOVES[k]) : OTHER_MOVES[m.character as Exclude<MascotCharacter, "mini">];
  const play = (mv: Move) => {
    clearTimeout(timer.current); setSleep(false);
    setPose(mv.pose || "cross"); setDoing(mv.id); setLine(m.talk ? mv.line : "");
    timer.current = window.setTimeout(() => { setPose("cross"); setDoing(""); setLine(""); }, Math.max(1400, mv.ms));
  };
  const talk = (t: string) => { clearTimeout(timer.current); setSleep(false); setLine(m.talk ? t : ""); timer.current = window.setTimeout(() => setLine(""), 2600); };
  useEffect(() => () => clearTimeout(timer.current), []);
  // his eyes follow the mouse over the preview
  const look = (e: React.PointerEvent) => {
    const svg = box.current?.querySelector("svg"); const ctm = svg?.getScreenCTM();
    if (!svg || !ctm || !m.eyes) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    svg.querySelectorAll<SVGGElement>(".m-pup").forEach((g) => {
      const dx = p.x - +g.dataset.cx!, dy = p.y - +g.dataset.cy!, d = Math.hypot(dx, dy) || 1, k = (Math.min(1, d / 50) * 1.8) / d;
      g.setAttribute("transform", `translate(${(dx * k).toFixed(2)} ${(dy * k).toFixed(2)})`);
    });
  };

  const chip = (on: boolean, label: React.ReactNode, onClick: () => void, key?: string, title?: string) => (
    <button type="button" key={key} className={`ring-chip${on ? " on" : ""}`} onClick={onClick} title={title}>{label}</button>
  );
  const sw = (on: boolean, color: string, label: string, onClick: () => void) => (
    <button type="button" key={color} className={`masc-swatch${on ? " on" : ""}`} style={{ background: color }} onClick={onClick} title={label} aria-label={label} aria-pressed={on} />
  );

  return (
    <div className="masc-adm">
      <input type="hidden" name="mascot" value={JSON.stringify(m)} />
      <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
        <Box name="on" title="On or off" icon="power" open={open.on ?? true}>
          <div className="f">
            <label className="switch"><input type="checkbox" checked={m.on} onChange={(e) => set("on", e.target.checked)} />Show the mascot on my site</label>
            <label className="switch"><input type="checkbox" checked={m.everyPage} onChange={(e) => set("everyPage", e.target.checked)} />On every page, not only the homepage</label>
            <label className="switch"><input type="checkbox" checked={m.phones} onChange={(e) => set("phones", e.target.checked)} />On phones too (a little smaller there)</label>
            <div className="hint">He never shows for visitors who asked their device for less motion, and he rests while the page scrolls, so scrolling stays smooth.</div>
          </div>
        </Box>

        <Box name="who" title="Who he is" icon="user-star" open={open.who ?? true}>
          <div className="masc-grid">
            {(Object.keys(MASCOT_CHARACTERS) as MascotCharacter[]).map((k, i) => (
              <button type="button" key={k} className={`masc-pick${m.character === k ? " on" : ""}`} data-pose="cross" data-legs="stand" onClick={() => { set("character", k); talk(k === "mini" ? "Hey! It's me 😄" : `Hi! I'm ${MASCOT_CHARACTERS[k].label} 👋`); }}>
                <span dangerouslySetInnerHTML={{ __html: thumbs[i] }} />
                <b>{k === "mini" ? "⭐ " : ""}{MASCOT_CHARACTERS[k].label}</b>
                <span>{MASCOT_CHARACTERS[k].desc}</span>
              </button>
            ))}
          </div>
          <div className="fl" style={{ marginTop: 12 }}>
            <label htmlFor="msz">Size: {m.size}%</label>
            <input id="msz" type="range" min={MASCOT_SIZE[0]} max={MASCOT_SIZE[1]} step={5} value={m.size} onChange={(e) => set("size", +e.target.value)} style={{ width: "100%" }} />
          </div>
        </Box>

        {mini && (
          <Box name="look" title="His look" icon="shirt" open={open.look ?? true}>
            <div className="f">
              <div className="fl"><span className="lab">Outfit</span><div className="ring-chips">{(Object.keys(MASCOT_OUTFITS) as (keyof typeof MASCOT_OUTFITS)[]).map((k) => chip(m.outfit === k, MASCOT_OUTFITS[k], () => set("outfit", k), k))}</div></div>
              <div className="fl"><span className="lab">Face</span><div className="ring-chips">
                {(Object.keys(MASCOT_BEARDS) as (keyof typeof MASCOT_BEARDS)[]).map((k) => chip(m.beard === k, MASCOT_BEARDS[k], () => set("beard", k), k))}
                {chip(m.glasses, "👓 Glasses", () => set("glasses", !m.glasses), "g")}
              </div></div>
              <div className="f2">
                <div className="fl"><span className="lab">Hair colour</span><div className="ring-chips">{Object.entries(MASCOT_HAIR).map(([c, l]) => sw(m.hair === c, c, l, () => set("hair", c)))}</div></div>
                <div className="fl"><span className="lab">Skin tone</span><div className="ring-chips">{Object.entries(MASCOT_SKIN).map(([c, l]) => sw(m.skin === c, c, l, () => set("skin", c)))}</div></div>
              </div>
            </div>
          </Box>
        )}

        <Box name="show" title="His show" icon="sparkles" open={open.show ?? true}>
          <div className="f">
            <div className="fl"><span className="lab">What he does</span><div className="ring-chips">
              {ACT_KEYS.map((k) => chip(m.act === k, `${MASCOT_ACTS[k].emoji} ${MASCOT_ACTS[k].label}`, () => set("act", k), k))}
              {chip(m.act === "mix", "🎲 Surprise me: mix them", () => set("act", "mix"), "mix")}
            </div></div>
            {m.act === "mix" && (
              <div className="fl"><span className="lab">Which ones go in the mix</span><div className="ring-chips">
                {ACT_KEYS.map((k) => chip(m.mixActs.includes(k), `${MASCOT_ACTS[k].emoji} ${MASCOT_ACTS[k].label}`, () => { const n = toggle<MascotAct>(m.mixActs, k); if (n.length) set("mixActs", n); }, k))}
              </div><div className="hint">At least one stays ticked.</div></div>
            )}
            <div className="fl"><span className="lab">When he peeks in from the side</span><div className="ring-chips">{(Object.keys(MASCOT_SIDES) as (keyof typeof MASCOT_SIDES)[]).map((k) => chip(m.side === k, MASCOT_SIDES[k], () => set("side", k), k))}</div></div>
            <div className="f2">
              <div className="fl"><label htmlFor="mgap">Time away between appearances: {m.gap}s</label><input id="mgap" type="range" min={MASCOT_GAP[0]} max={MASCOT_GAP[1]} value={m.gap} onChange={(e) => set("gap", +e.target.value)} style={{ width: "100%" }} /></div>
              <div className="fl"><label htmlFor="msl">Falls asleep after: {m.sleepAfter ? `${m.sleepAfter}s with nobody moving` : "never"}</label><input id="msl" type="range" min={MASCOT_SLEEP[0]} max={MASCOT_SLEEP[1]} step={5} value={m.sleepAfter} onChange={(e) => set("sleepAfter", +e.target.value)} style={{ width: "100%" }} /></div>
            </div>
          </div>
        </Box>

        {mini && (
          <Box name="moves" title="His moves (when someone clicks him)" icon="hand-click" open={open.moves ?? true}>
            <div className="ring-chips">{MOVE_KEYS.map((k) => chip(m.moves.includes(k), MASCOT_MOVES[k], () => set("moves", toggle(m.moves, k)), k))}</div>
            <div className="hint" style={{ marginTop: 8 }}>Each click plays the next ticked move. With none ticked, he just says one of his lines. Try them on the preview.</div>
          </Box>
        )}

        <Box name="talk" title="What he says" icon="message-circle" open={open.talk ?? true}>
          <div className="f">
            <label className="switch"><input type="checkbox" checked={m.talk} onChange={(e) => set("talk", e.target.checked)} />Speech bubbles</label>
            <div className="fl"><label htmlFor="mhi">Hello (once per visit)</label><input id="mhi" className="inp" maxLength={120} value={m.hello} onChange={(e) => set("hello", e.target.value)} placeholder="Leave empty for no hello" /></div>
            <div className="fl"><label htmlFor="mln">Things he says when he appears (one per line)</label>
              <textarea id="mln" rows={5} value={m.lines.join("\n")} onChange={(e) => set("lines", e.target.value.split("\n").slice(0, 20))} onBlur={() => set("lines", m.lines.map((l) => l.trim()).filter(Boolean))} />
            </div>
            <label className="switch"><input type="checkbox" checked={m.guideOn} onChange={(e) => set("guideOn", e.target.checked)} />Section guide: he says something when a visitor reaches each section</label>
            {m.guideOn && (
              <div className="masc-guide">
                {sections.map((s) => (
                  <div className="row" key={s.slug}>
                    <label htmlFor={`mg-${s.slug}`}>{s.emoji} {s.title}</label>
                    <input id={`mg-${s.slug}`} className="inp" maxLength={120} value={m.guide[s.slug] ?? ""} placeholder={`${s.emoji ? s.emoji + " " : ""}${s.title}!`}
                      onChange={(e) => set("guide", { ...m.guide, [s.slug]: e.target.value })} />
                  </div>
                ))}
                <div className="hint">Empty boxes say the section&apos;s name.</div>
              </div>
            )}
          </div>
        </Box>

        <Box name="habits" title="His habits" icon="adjustments" open={open.habits ?? true}>
          <div className="f">
            <label className="switch"><input type="checkbox" checked={m.eyes} onChange={(e) => set("eyes", e.target.checked)} />His eyes follow the mouse</label>
            <label className="switch"><input type="checkbox" checked={m.duck} onChange={(e) => set("duck", e.target.checked)} />He ducks when the mouse comes close while he&apos;s peeking</label>
            <label className="switch"><input type="checkbox" checked={m.cheer} onChange={(e) => set("cheer", e.target.checked)} />He celebrates when someone reacts to an entry</label>
            <label className="switch"><input type="checkbox" checked={m.costumes} onChange={(e) => set("costumes", e.target.checked)} />He dresses for the theme (sunglasses on sunny themes, a nightcap at night, a sailor hat on Ocean, a party hat on Playful and Candy)</label>
          </div>
        </Box>
      </div>

      <div className="masc-stage" onPointerMove={look}>
        <div className="cap">Live preview{m.on ? "" : " (he's switched off on the site)"}</div>
        <div ref={box} className={`masc${doing ? " do-" + doing : ""}${sleep ? " is-sleep" : ""}${line ? " is-talk" : ""}`} data-pose={pose} data-legs="stand" data-cos={cos}
          style={{ ["--mw" as string]: `${Math.round((mini ? 92 : 86) * (m.size / 100) * 1.3)}px` }} onClick={() => (moves.length ? play(moves[Math.floor(Math.random() * moves.length)]) : talk(m.lines[0] || "Hi!"))}>
          <div className={`masc-say${line ? " on" : ""}`}>{line}</div>
          <span className="zz">Z</span><span className="zz">z</span><span className="zz">z</span>
          <div className="masc-svg" dangerouslySetInnerHTML={{ __html: art }} />
        </div>
        <div className="tools">
          {moves.map((mv) => <button type="button" key={mv.id} onClick={() => play(mv)}>{mini ? MASCOT_MOVES[mv.id as keyof typeof MASCOT_MOVES] : mv.id[0].toUpperCase() + mv.id.slice(1)}</button>)}
          <button type="button" onClick={() => talk(m.hello || "…")}>Say hello</button>
          <button type="button" onClick={() => { setLine(""); setSleep((s) => !s); }}>{sleep ? "Wake up" : "Sleep"}</button>
        </div>
        <div className="tools">{COSTUMES.map(([k, l]) => <button type="button" key={k} onClick={() => setCos(k)} style={cos === k ? { borderColor: "#35c46f" } : undefined}>{l}</button>)}</div>
        <div className="cap">Click him, or try the buttons. Save, then open your site to see the whole show.</div>
      </div>
    </div>
  );
}
