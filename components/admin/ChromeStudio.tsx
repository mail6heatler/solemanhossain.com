"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Section } from "@/lib/data";
import { LIVE_THEMES, SKIN_LABELS, type SiteSettings, type Skin } from "@/lib/settings";
import {
  FOOTER_EXTRAS, FOOTER_LOOKS, FOOTER_SIZE_LIMITS, DEFAULT_FOOTER, MENU_BGS, MENU_SIZE_LIMITS, DEFAULT_MENU, MENU_BUTTONS, MENU_EXTRAS, MENU_LOOKS, PHONE_MENUS, SKY_TIMES, OWN_BG,
  type FooterDesign, type FooterExtra, type FooterSize, type MenuDesign, type MenuExtra, type MenuSize,
} from "@/lib/chrome";
import { saveFooter, saveMenu } from "@/app/actions";
import type { ChromeDraft } from "./ChromePreview";

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The theme the previews wear: the site's default, or one picked here. */
function useSkin(settings: SiteSettings) {
  const [skin, setSkin] = useState("");
  useEffect(() => {
    const t = settings.defaultTheme as string, h = new Date().getHours();
    setSkin((LIVE_THEMES as string[]).includes(t) ? t : t === "auto" ? (h >= 18 || h < 6 ? "night" : "day") : "playful");
  }, [settings.defaultTheme]);
  useEffect(() => { if (!skin) return; document.documentElement.setAttribute("data-skin", skin); return () => document.documentElement.removeAttribute("data-skin"); }, [skin]);
  const picker = <select className="stu-skin" value={skin} aria-label="Theme the preview wears" onChange={(e) => setSkin(e.target.value)}>{LIVE_THEMES.map((t) => <option key={t} value={t}>{SKIN_LABELS[t as Skin] ?? t}</option>)}</select>;
  return [picker, skin] as const;
}

/** The save bar every editor has: Discard and Save, shown only when something changed; Ctrl+S saves. */
export function SaveBar({ dirty, saving, onSave, onDiscard }: { dirty: boolean; saving: boolean; onSave: () => void; onDiscard: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); onSave(); } };
    addEventListener("keydown", key);
    const leave = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    addEventListener("beforeunload", leave);
    return () => { removeEventListener("keydown", key); removeEventListener("beforeunload", leave); };
  }, [dirty, onSave]);
  return (
    <div className={`stu-save${dirty ? " show" : ""}`} role="region" aria-label="Save your changes" aria-hidden={!dirty}>
      <span className="stu-save-t"><i />Changes not saved yet</span>
      <button type="button" disabled={saving} onClick={onDiscard} tabIndex={dirty ? 0 : -1}>Discard</button>
      <button type="button" className="go" disabled={saving} onClick={onSave} tabIndex={dirty ? 0 : -1}><i className={`ti ti-${saving ? "loader-2 spin" : "device-floppy"}`} />{saving ? "Saving…" : "Save"}</button>
    </div>
  );
}

const DESKS = [[1280, 800, "Laptop"], [1440, 900, "Large laptop"], [1920, 1080, "Big screen"]] as const;
const PHONES = [[360, 780, "Small phone"], [390, 844, "Phone"], [430, 932, "Big phone"]] as const;
const pick = (key: string, n: number, max: number) => { try { const v = Number(localStorage.getItem(key)); return v >= 0 && v < max ? v : n; } catch { return n; } };

/**
 * The editors' previews: a computer screen and a phone screen side by side, each a real page drawn at that screen's real size
 * (/admin/preview, ChromePreview) and scaled so they fit the left side's width and the window's height, never cut; they stay put while the
 * settings on the right scroll. The draft goes into both with postMessage on every change, so they show what isn't saved yet. Sizes are
 * chosen by presets (lc_cs_desk, lc_cs_phone), and Both, Computer or Phone shows one bigger (lc_cs_view).
 */
function Screens({ part, settings, skin }: { part: "menu" | "footer"; settings: SiteSettings; skin: string }) {
  const draft: ChromeDraft = { type: "lc-chrome-draft", settings, skin };
  return <SiteScreens src={`/admin/preview?part=${part}`} draft={draft} ready="lc-chrome-ready" hint="Both screens show your changes as you make them, before saving" />;
}

/**
 * The same two screens for any page: `src` is loaded in both, `draft` is posted into each whenever it changes and whenever a screen
 * posts `ready`. `onFrames` hands the two iframes to the editor, so it can send them more (the Mascot page's ▶ Test buttons).
 */
export function SiteScreens({ src, draft, ready, hint, onFrames }: { src: string; draft: object; ready: string; hint: string; onFrames?: (f: (HTMLIFrameElement | null)[]) => void }) {
  const [di, setDi] = useState(1), [pi, setPi] = useState(1), [w, setW] = useState(0), [vh, setVh] = useState(800);
  const [view, setView] = useState<"both" | "desk" | "phone">("both");
  const box = useRef<HTMLDivElement>(null);
  const frames = useRef<(HTMLIFrameElement | null)[]>([]);
  useEffect(() => {
    setDi(pick("lc_cs_desk", 1, DESKS.length)); setPi(pick("lc_cs_phone", 1, PHONES.length));
    try { const v = localStorage.getItem("lc_cs_view"); if (v === "desk" || v === "phone") setView(v); } catch { /* */ }
  }, []);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); setW(el.clientWidth);
    const tall = () => setVh(innerHeight); tall(); addEventListener("resize", tall);
    return () => { ro.disconnect(); removeEventListener("resize", tall); };
  }, []);
  // send the draft in, now and whenever a screen says it's ready
  const cur = useRef(draft); cur.current = draft;
  const key = JSON.stringify(draft);
  useEffect(() => { frames.current.forEach((f) => f?.contentWindow?.postMessage(cur.current, location.origin)); }, [key]);
  useEffect(() => {
    const on = (e: MessageEvent) => { if (e.origin === location.origin && e.data?.type === ready) (e.source as Window | null)?.postMessage(cur.current, location.origin); };
    addEventListener("message", on);
    return () => removeEventListener("message", on);
  }, [ready]);
  useEffect(() => { onFrames?.(frames.current); });
  const [dw, dh] = DESKS[di], [pw, ph] = PHONES[pi];
  const gap = 18, bez = 10;
  // one height for both, as big as the left side's width and the window's height allow
  const capH = Math.max(260, vh - 210);
  let kd = 0, kp = 0;
  if (view === "desk") kd = Math.min(w / dw, capH / dh);
  else if (view === "phone") kp = Math.min((w - 2 * bez) / pw, (capH - 2 * bez) / ph, 1.2);
  else { const H = Math.min(capH, w ? (w - gap - 2 * bez) / (dw / dh + pw / ph) : 0); kd = H / dh; kp = (H - 2 * bez) / ph; }
  const setV = (v: typeof view) => { setView(v); try { localStorage.setItem("lc_cs_view", v); } catch { /* */ } };
  return (
    <div className="cs-screens">
      <div className="cs-sizes">
        <span>{([["both", "Both"], ["desk", "Computer"], ["phone", "Phone"]] as const).map(([k, label]) => <button key={k} type="button" className={`hst-chip${view === k ? " on" : ""}`} onClick={() => setV(k)}>{label}</button>)}</span>
        <span><i className="ti ti-device-laptop" />{DESKS.map(([x, y, label], i) => <button key={label} type="button" className={`hst-chip${i === di ? " on" : ""}`} title={`${x} × ${y}`} onClick={() => { setDi(i); try { localStorage.setItem("lc_cs_desk", String(i)); } catch {} }}>{label} <small>{x}</small></button>)}</span>
        <span><i className="ti ti-device-mobile" />{PHONES.map(([x, y, label], i) => <button key={label} type="button" className={`hst-chip${i === pi ? " on" : ""}`} title={`${x} × ${y}`} onClick={() => { setPi(i); try { localStorage.setItem("lc_cs_phone", String(i)); } catch {} }}>{label} <small>{x}</small></button>)}</span>
      </div>
      <div ref={box} className="cs-row">
        {w > 0 && <>
          {/* both frames stay loaded when one is hidden, so switching is instant */}
          <div className="cs-screen desk" hidden={view === "phone"} style={{ width: dw * kd, height: dh * kd }}>
            <iframe ref={(f) => { frames.current[0] = f; }} src={src} title="Your site on a computer" style={{ width: dw, height: dh, transform: `scale(${kd})` }} />
          </div>
          <div className="cs-screen phone" hidden={view === "desk"} style={{ width: pw * kp + 2 * bez, height: ph * kp + 2 * bez }}>
            <iframe ref={(f) => { frames.current[1] = f; }} src={src} title="Your site on a phone" style={{ width: pw, height: ph, transform: `scale(${kp})` }} />
          </div>
        </>}
      </div>
      <p className="hint cs-hint">{hint}, at a real {dw}×{dh} computer and {pw}×{ph} phone, scaled to fit. Scroll and click inside them: they work like the site.</p>
    </div>
  );
}

const FOOT_SIZE_ROWS: [keyof FooterSize, string, string][] = [["height", "Footer height", "px"], ["machine", "Machine size", "%"], ["buttons", "Button size", "%"]];
const SIZE_ROWS: [keyof MenuSize, string, string][] = [["name", "Your name's size", "%"], ["links", "Section links' size", "%"], ["gap", "Space between links", "px"], ["height", "Bar's height", "%"]];

function Look({ on, title, desc, onClick, tag }: { on: boolean; title: string; desc: string; onClick: () => void; tag?: string }) {
  return <button type="button" className={`cs-look${on ? " on" : ""}`} onClick={onClick} aria-pressed={on}><b>{title}{tag && <em>{tag}</em>}</b><small>{desc}</small></button>;
}

/**
 * The menu bar's dashboard page (/admin/menu). A computer and a phone screen at the top show the real menu bar live, draft included (Screens). Look, background (and the sky's time), phone menu, extras, the ticker's
 * lines, the Say hello button's words and which sections the menu lists. One Save writes it all (saveMenu).
 */
export function MenuStudio({ first, settings, sections }: { first: MenuDesign; settings: SiteSettings; sections: Section[] }) {
  const router = useRouter();
  const [saved, setSaved] = useState(first);
  const [d, setD] = useState(first);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ t: string; bad?: boolean } | null>(null);
  const [picker, skin] = useSkin(settings);
  const dirty = !same(d, saved);
  const set = (patch: Partial<MenuDesign>) => setD((x) => ({ ...x, ...patch }));
  const setEx = (k: MenuExtra, v: boolean) => setD((x) => ({ ...x, extras: { ...x.extras, [k]: v } }));
  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    const r = await saveMenu(d).catch(() => null);
    setSaving(false);
    if (!r || !r.ok) { setNote({ t: r && !r.ok ? r.error : "That didn't save. Check your connection and try again.", bad: true }); return; }
    setSaved(d); setNote({ t: "Saved. It's live on your site." }); router.refresh();
  };
  const s = useMemo(() => ({ ...settings, menu: d }) as SiteSettings, [settings, d]);
  const ownBg = MENU_BGS.find(([k]) => k === OWN_BG[d.look])?.[1];
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 4000); return () => clearTimeout(t); }, [note]);
  const lines = useRef(d.ticker.join("\n"));
  return (
    <div className="stu cs">
      <header className="stu-top">
        <div className="stu-name"><h1 className="adm-h">Menu bar</h1><p className="adm-sub">{d.show ? "On top of every page" : "Hidden: visitors don't see it (the previews still show it, so you can edit it)"}{dirty ? " · changes not saved" : ""}</p></div>
        <div className="btns stu-topbtns"><label className="switch cs-show"><input type="checkbox" checked={d.show} onChange={(e) => set({ show: e.target.checked })} />{d.show ? "Showing on site" : "Hidden on site"}</label>{picker}<a href="/" target="_blank" className="b-out b-sm"><i className="ti ti-eye" />View on site</a></div>
      </header>
      <div className="cs-work">
      <Screens part="menu" settings={s} skin={skin} />
      <div className="cs-grid">
        <div className="cs-panel">
          <details className="c box" open><summary><span>Look</span><i className="ti ti-chevron-down" /></summary><div className="f cs-looks">
            {MENU_LOOKS.map(([k, label, desc]) => <Look key={k} on={d.look === k} title={label} desc={desc} onClick={() => set({ look: k })} />)}
          </div></details>
          <details className="c box" open><summary><span>Sizes</span><i className="ti ti-chevron-down" /></summary><div className="f">
            {SIZE_ROWS.map(([k, label, unit]) => {
              const [lo, hi, def] = MENU_SIZE_LIMITS[k];
              return (
                <div key={k} className="fl cs-slider"><label htmlFor={`m-sz-${k}`}>{label} <b>{d.size[k]}{unit}</b></label>
                  <input id={`m-sz-${k}`} type="range" min={lo} max={hi} value={d.size[k]} onChange={(e) => set({ size: { ...d.size, [k]: +e.target.value } })} onDoubleClick={() => set({ size: { ...d.size, [k]: def } })} />
                </div>
              );
            })}
            <div className="btns"><button type="button" className="b-out b-sm" onClick={() => set({ size: DEFAULT_MENU.size })}>Back to normal sizes</button></div>
            <div className="hint">Your name always gets the room of its longest phrase, so it&apos;s never cut while it types. If the links don&apos;t fit beside it, they shrink a little by themselves. A double click on a slider puts it back.</div>
          </div></details>
          <details className="c box" open><summary><span>Background</span><i className="ti ti-chevron-down" /></summary><div className="f">
            <div className="hst-chips">{MENU_BGS.map(([k, label]) => <button key={k} type="button" className={`hst-chip${d.bg === k ? " on" : ""}`} onClick={() => set({ bg: k })}>{k === "own" ? `${label} (${ownBg})` : label}</button>)}</div>
            {(d.bg === "sky" || (d.bg === "own" && OWN_BG[d.look] === "sky")) && <>
              <span className="lab">The sky's time</span>
              <div className="hst-chips">{SKY_TIMES.map(([k, label]) => <button key={k} type="button" className={`hst-chip${d.sky === k ? " on" : ""}`} onClick={() => set({ sky: k })}>{label}</button>)}</div>
            </>}
            <div className="hint">Any background goes with any look. They're scenes with their own colours, so they look the same in every theme; &ldquo;Follows the theme&rdquo; and &ldquo;Plain&rdquo; take your theme&apos;s colours.</div>
          </div></details>
          <details className="c box" open><summary><span>On phones</span><i className="ti ti-chevron-down" /></summary><div className="f">
            <div className="hst-chips">{PHONE_MENUS.map(([k, label]) => <button key={k} type="button" className={`hst-chip${d.phone === k ? " on" : ""}`} onClick={() => set({ phone: k })}>{label}</button>)}</div>
            <div className="hint">How people move between sections on a phone: the bar along the bottom, a round button in the corner that blooms into your sections, a sheet they pull up from the bottom, or a menu that covers the screen in big letters. The bar on top keeps its look and background.</div>
          </div></details>
          <details className="c box" open><summary><span>Extras</span><i className="ti ti-chevron-down" /></summary><div className="f stu-switches">
            {MENU_EXTRAS.map(([k, label]) => <label key={k} className="switch"><input type="checkbox" checked={!!d.extras[k]} onChange={(e) => setEx(k, e.target.checked)} />{label}</label>)}
          </div></details>
          <details className="c box" open><summary><span>Buttons on the bar</span><i className="ti ti-chevron-down" /></summary><div className="f stu-switches">
            {MENU_BUTTONS.map(([k, label]) => {
              // some buttons also have a switch for the whole site under Appearance; say so when that one is off
              const off = k === "dice" ? !settings.effects.surprise : k === "theme" ? !settings.themeSwitch : k === "shuffle" ? !settings.themeSwitch || !settings.effects.shuffle : false;
              const why = k === "dice" ? "Surprise me is switched off under Appearance, so it won't show until that's on too."
                : k === "theme" || k === "shuffle" ? "Changing themes is switched off for visitors under Appearance, so it won't show until that's on too."
                : k === "hello" ? (d.helloLabel ? "" : "It needs its words, under Words below.")
                : k === "menubtn" ? (d.phone === "orb" || d.phone === "sheet" ? "Not used with the orb or the pull-up sheet, which have their own." : d.phone === "full" ? "With the full-screen menu it's the only way to the menu on phones." : "") : "";
              return (
                <div key={k}>
                  <label className="switch"><input type="checkbox" checked={d.extras[k] !== false} onChange={(e) => setEx(k, e.target.checked)} />{label}</label>
                  {(off || (why && k !== "dice" && k !== "theme" && k !== "shuffle")) && why && <div className="hint">{why}{off && <> <a href="/admin/appearance">Appearance</a></>}</div>}
                </div>
              );
            })}
            <div className="hint">Off hides that button from the menu bar only. Everything else keeps working.</div>
          </div></details>
          <details className="c box" open><summary><span>Words</span><i className="ti ti-chevron-down" /></summary><div className="f">
            <div className="fl"><label htmlFor="m-hello">Say hello button</label><input id="m-hello" className="inp" maxLength={30} value={d.helloLabel} onChange={(e) => set({ helloLabel: e.target.value })} /><div className="hint">It leads to your Connect section. Empty hides it.</div></div>
            <div className="fl"><label htmlFor="m-tick">Live ticker&apos;s lines, one per line (the Live ticker look)</label>
              <textarea id="m-tick" className="inp" rows={4} defaultValue={lines.current} onChange={(e) => set({ ticker: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 8) })} />
              <div className="hint">{"{time}"} becomes the time in Dhaka.</div></div>
            <div className="hint">Your name and the phrases it types are on the <a href="/admin/hero">Hero</a> page.</div>
          </div></details>
          <details className="c box" open><summary><span>Sections in the menu</span><i className="ti ti-chevron-down" /></summary><div className="f stu-switches">
            {sections.map((x) => <label key={x.id} className="switch"><input type="checkbox" checked={!d.hidden.includes(x.slug)} onChange={(e) => set({ hidden: e.target.checked ? d.hidden.filter((h) => h !== x.slug) : [...d.hidden, x.slug] })} />{x.nav_emoji} {x.nav_label || x.title}</label>)}
            <div className="hint">Off leaves a section out of the menu only; it stays on the page. Their order follows your sections&apos; order.</div>
          </div></details>
        </div>
      </div>
      </div>
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={() => setD(saved)} />
      {note && <div className={`adm-toast stu-toast${note.bad ? " bad" : ""}`} role="status">{note.t}</div>}
    </div>
  );
}

type FootDraft = { footer: FooterDesign; footerLeft: string; footerRight: string };
/**
 * The footer's dashboard page (/admin/footer). A computer and a phone screen at the top show the real footer live, draft included (Screens;
 * a receipt shows this browser's own visit). Look, the words each look uses, extras, and the two footer lines (moved here from Settings). Save: saveFooter.
 */
export function FooterStudio({ first, settings, sections }: { first: FootDraft; settings: SiteSettings; sections: Section[] }) {
  const router = useRouter();
  const [saved, setSaved] = useState(first);
  const [d, setD] = useState(first);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ t: string; bad?: boolean } | null>(null);
  const [picker, skin] = useSkin(settings);
  const dirty = !same(d, saved);
  const f = d.footer;
  const setF = (patch: Partial<FooterDesign>) => setD((x) => ({ ...x, footer: { ...x.footer, ...patch } }));
  const setEx = (k: FooterExtra, v: boolean) => setF({ extras: { ...f.extras, [k]: v } });
  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    const r = await saveFooter(d).catch(() => null);
    setSaving(false);
    if (!r || !r.ok) { setNote({ t: r && !r.ok ? r.error : "That didn't save. Check your connection and try again.", bad: true }); return; }
    setSaved(d); setNote({ t: "Saved. It's live on your site." }); router.refresh();
  };
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 4000); return () => clearTimeout(t); }, [note]);
  const s = useMemo(() => ({ ...settings, footer: f, footerLeft: d.footerLeft, footerRight: d.footerRight }) as SiteSettings, [settings, f, d.footerLeft, d.footerRight]);
  const txt = (k: keyof FooterDesign, label: string, max: number, hint?: string, area = false) => (
    <div className="fl"><label htmlFor={`f-${k}`}>{label}</label>
      {area ? <textarea id={`f-${k}`} className="inp" rows={3} maxLength={max} value={String(f[k] ?? "")} onChange={(e) => setF({ [k]: e.target.value } as Partial<FooterDesign>)} />
        : <input id={`f-${k}`} className="inp" maxLength={max} value={String(f[k] ?? "")} onChange={(e) => setF({ [k]: e.target.value } as Partial<FooterDesign>)} />}
      {hint && <div className="hint">{hint}</div>}</div>
  );
  const L = f.look;
  return (
    <div className="stu cs">
      <header className="stu-top">
        <div className="stu-name"><h1 className="adm-h">Footer</h1><p className="adm-sub">{f.show ? "At the bottom of every page, under Connect" : "Hidden: visitors don't see it (the previews still show it, so you can edit it)"}{dirty ? " · changes not saved" : ""}</p></div>
        <div className="btns stu-topbtns"><label className="switch cs-show"><input type="checkbox" checked={f.show} onChange={(e) => setF({ show: e.target.checked })} />{f.show ? "Showing on site" : "Hidden on site"}</label>{picker}<a href="/#connect" target="_blank" className="b-out b-sm"><i className="ti ti-eye" />View on site</a></div>
      </header>
      <div className="cs-work">
      <Screens part="footer" settings={s} skin={skin} />
      <div className="cs-grid">
        <div className="cs-panel">
          <details className="c box" open><summary><span>Look</span><i className="ti ti-chevron-down" /></summary><div className="f cs-looks">
            {FOOTER_LOOKS.map(([k, label, desc]) => <Look key={k} on={L === k} title={label} desc={desc} onClick={() => setF({ look: k })} tag={k === "receipt" ? "your favourite" : undefined} />)}
          </div></details>
          {L === "receipt" && <details className="c box" open><summary><span>Sizes</span><i className="ti ti-chevron-down" /></summary><div className="f">
            {FOOT_SIZE_ROWS.map(([k, label, unit]) => {
              const [lo, hi, def] = FOOTER_SIZE_LIMITS[k];
              return (
                <div key={k} className="fl cs-slider"><label htmlFor={`f-sz-${k}`}>{label} <b>{f.size[k]}{unit}</b></label>
                  <input id={`f-sz-${k}`} type="range" min={lo} max={hi} value={f.size[k]} onChange={(e) => setF({ size: { ...f.size, [k]: +e.target.value } })} onDoubleClick={() => setF({ size: { ...f.size, [k]: def } })} />
                </div>
              );
            })}
            <div className="btns"><button type="button" className="b-out b-sm" onClick={() => setF({ size: DEFAULT_FOOTER.size })}>Back to normal sizes</button></div>
            <div className="hint">The keys show an icon over a short word, so they always fit; make them bigger or smaller here. A double click on a slider puts it back.</div>
          </div></details>}
          <details className="c box" open><summary><span>Words</span><i className="ti ti-chevron-down" /></summary><div className="f">
            {L === "receipt" && <>{txt("hi", "Line under your name", 80)}{txt("shop", "Receipt's shop name", 40)}{txt("thanks", "Receipt's last line", 60)}{txt("coupon", "Coupon", 90, "Its Redeem button opens your chat.")}</>}
            {L === "rcpass" && txt("airline", "Airline's name", 30)}
            {L === "tmap" && txt("mapTitle", "Map's title", 40)}
            {L === "letter" && <>{txt("letter", "The letter", 400, undefined, true)}{txt("signature", "Signature", 40, "Empty signs with your nickname.")}</>}
            {L === "credits" && txt("tagline", "Under your name in the credits", 60)}
            <div className="f2">
              <div className="fl"><label htmlFor="f-left">Footer line, left</label><input id="f-left" className="inp" maxLength={200} value={d.footerLeft} onChange={(e) => setD((x) => ({ ...x, footerLeft: e.target.value }))} /><div className="hint">{"{year}"} becomes the current year.</div></div>
              <div className="fl"><label htmlFor="f-right">Footer line, right</label><input id="f-right" className="inp" maxLength={200} value={d.footerRight} onChange={(e) => setD((x) => ({ ...x, footerRight: e.target.value }))} /></div>
            </div>
          </div></details>
          <details className="c box" open><summary><span>Extras</span><i className="ti ti-chevron-down" /></summary><div className="f stu-switches">
            {FOOTER_EXTRAS.map(([k, label]) => <label key={k} className="switch"><input type="checkbox" checked={!!f.extras[k]} onChange={(e) => setEx(k, e.target.checked)} />{label}</label>)}
            <div className="hint">Your links come from Connect&apos;s editor, so they&apos;re never typed twice.</div>
          </div></details>
          <div className="c f">
            <b>What the receipts know</b>
            <div className="hint" style={{ margin: 0 }}>Each visitor&apos;s receipt is built in their own browser: the sections they saw (each line leads there), what&apos;s still to see, what&apos;s new since their last visit, the entries they opened, how long they&apos;ve stayed, their reactions, votes, messages and comments, how many times they&apos;ve visited and since when. Nothing of it is sent to you or anyone. View shows it whole, Cut downloads it as a PDF, Print again prints a fresh one.</div>
          </div>
        </div>
      </div>
      </div>
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={() => setD(saved)} />
      {note && <div className={`adm-toast stu-toast${note.bad ? " bad" : ""}`} role="status">{note.t}</div>}
    </div>
  );
}
