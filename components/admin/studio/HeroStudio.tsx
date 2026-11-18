"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LIVE_THEMES, MOODS, SKIN_LABELS, isConnectLayout, type SiteSettings, type Skin } from "@/lib/settings";
import { HERO_BGS, HERO_LOOKS, HERO_PIECES, MAX_HERO_BUTTONS, MAX_ROTATE, type HeroDesign, type HeroLook, type HeroPiece } from "@/lib/heroLook";
import type { PartSize } from "@/lib/partSize";
import { saveHeroStudio, type HeroSave } from "@/app/actions";
import HeroView, { heroStats } from "@/components/site/HeroView";
import { UploadField } from "@/components/admin/Widgets";
import { Surface, type Typing } from "./Surface";

type Draft = Omit<HeroSave, "heroDesign"> & { heroDesign: HeroDesign };
type Hist = { list: Draft[]; at: number; saved: Draft; tag: string; time: number };
/** Screens the preview can stand for: a phone, a tablet, laptops and a big screen. */
const SCREENS: [string, string, number, number][] = [["phone", "Phone", 390, 844], ["tablet", "Tablet", 820, 1100], ["laptop", "Laptop", 1366, 768], ["desktop", "Desktop", 1536, 864], ["big", "Big screen", 1920, 1080]];
const PV_W: [number, number] = [320, 2560], PV_H: [number, number] = [480, 1600];
const clampN = (v: number, [lo, hi]: [number, number]) => Math.round(Math.max(lo, Math.min(hi, v)));
type Sec = { id: number; slug: string; layout: string; nav_label: string; title: string; nav_emoji: string };

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);
/** What each piece of the hero is called on its label, and which group of controls it opens. */
const NAMES: Record<string, string> = {
  head: "Headline", subtitle: "Subtitle", status: "Status line", mood: "Mood", live: "People here now", roles: "Role chips", now: "Now line", clock: "Local time",
  greeting: "Greeting", stats: "Numbers", buttons: "Buttons", photo: "Photo", skills: "Skills strip", cue: "Scroll hint", mast: "Masthead", lines: "Cover lines", band: "Top line",
};
const GROUP: Record<string, string> = { head: "words", subtitle: "words", status: "words", now: "words", roles: "words", skills: "words", cue: "words", mast: "looktext", band: "looktext", lines: "stats", mood: "pieces", live: "pieces", greeting: "place", clock: "place", stats: "stats", buttons: "buttons", photo: "photo" };
/** Pieces typed straight onto the preview, when what's shown is exactly what's stored. */
const TYPED: Record<string, keyof Draft> = { subtitle: "subtitle", status: "statusText", now: "nowStatus", cue: "scrollCue" };

/** One group of controls. It lives outside the editor, so typing in it never rebuilds it (which would lose the box being typed in). */
function G({ g, title, lit, children, startOpen = true }: { g: string; title: string; lit: string; children: React.ReactNode; startOpen?: boolean }) {
  return (
    <details className={`c box hst-g${lit === g ? " lit" : ""}`} data-g={g} open={startOpen}>
      <summary><span>{title}</span><i className="ti ti-chevron-down" aria-hidden="true" /></summary>
      <div className="f">{children}</div>
    </details>
  );
}

/** A list kept one per line. It keeps what's typed, blank lines and all, and hands on the lines that say something. */
function Lines({ id, value, onChange, rows = 4, placeholder }: { id: string; value: string[]; onChange: (v: string[]) => void; rows?: number; placeholder?: string }) {
  const [text, setText] = useState(value.join("\n"));
  const last = useRef(value);
  useEffect(() => { if (!same(value, last.current)) { setText(value.join("\n")); last.current = value; } }, [value]);
  return <textarea id={id} className="inp" rows={rows} value={text} placeholder={placeholder} onChange={(e) => { setText(e.target.value); const v = e.target.value.split("\n").map((x) => x.trim()).filter(Boolean); last.current = v; onChange(v); }} />;
}

/**
 * The hero's live editor (G0). The real hero (HeroView) is drawn on the left in the site's theme, with a label on every piece; a click on one
 * opens its controls on the right, short words are typed straight onto it, and every piece can be dragged and resized like the other sections'.
 * The right side holds everything the older hero page had, and more: six looks (and another for phones), backgrounds, pieces on and off, which
 * numbers show, any number of buttons, and headlines that take turns. One Save writes it all (`saveHeroStudio`); Undo and Redo work on drafts.
 */
export default function HeroStudio({ first, settings, sections, counts, reactions, useBlob }: {
  first: Draft; settings: SiteSettings; sections: Sec[]; counts: Record<number, number>; reactions: number; useBlob: boolean;
}) {
  const router = useRouter();
  const [hist, setHist] = useState<Hist>({ list: [first], at: 0, saved: first, tag: "", time: 0 });
  const d = hist.list[hist.at];
  const dirty = d !== hist.saved;
  const [labels, setLabels] = useState(true);
  // the screen the preview stands for, drawn at its real size and scaled to fit the room on the left
  const [pv, setPv] = useState({ w: 1366, h: 768 });
  /** width: the preview fills the left side's width; all: the whole screen fits in view; real: 100% */
  const [fit, setFit] = useState<"width" | "all" | "real">("width");
  /** how wide the controls on the right are; the divider between them and the preview drags it */
  const [panelW, setPanelW] = useState(400);
  const [room, setRoom] = useState({ w: 900, h: 600 });
  const prevBox = useRef<HTMLDivElement>(null);
  const phone = pv.w <= 760;
  const [skin, setSkin] = useState("");
  const [typing, setTyping] = useState<Typing | null>(null);
  const [lit, setLit] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; n: number; bad?: boolean } | null>(null);
  const [rev, setRev] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const say = (text: string, bad = false) => setToast((t) => ({ text, n: (t?.n ?? 0) + 1, bad }));

  // ---------- changes, with undo ----------
  const change = useCallback((fn: (x: Draft) => Draft, tag = "") => setHist((h) => {
    const cur = h.list[h.at], next = fn(cur);
    if (next === cur || same(next, cur)) return h;
    const now = Date.now();
    if (tag && tag === h.tag && now - h.time < 1500 && h.at > 0 && cur !== h.saved) return { ...h, list: [...h.list.slice(0, h.at), next], time: now };
    const list = [...h.list.slice(0, h.at + 1), next].slice(-150);
    return { ...h, list, at: list.length - 1, tag, time: now };
  }), []);
  const set = <K extends keyof Draft>(k: K, v: Draft[K], tag?: string) => change((x) => ({ ...x, [k]: v }), tag ?? String(k));
  const setD = (patch: Partial<HeroDesign>, tag?: string) => change((x) => ({ ...x, heroDesign: { ...x.heroDesign, ...patch } }), tag ?? "");
  const undo = useCallback(() => { setTyping(null); setHist((h) => (h.at > 0 ? { ...h, at: h.at - 1, tag: "" } : h)); setRev((r) => r + 1); }, []);
  const redo = useCallback(() => { setTyping(null); setHist((h) => (h.at < h.list.length - 1 ? { ...h, at: h.at + 1, tag: "" } : h)); setRev((r) => r + 1); }, []);

  const save = useCallback(async () => {
    if (!dirty || saving) return;
    setSaving(true); setTyping(null);
    const res = await saveHeroStudio(d).catch(() => null);
    setSaving(false);
    if (!res || !res.ok) { say(res && !res.ok ? res.error : "That didn't save. Check your connection and try again.", true); return; }
    setHist((h) => ({ ...h, saved: h.list[h.at], tag: "" }));
    say("Saved. It's live on your site.");
    router.refresh();
  }, [dirty, saving, d, router]);
  const discard = () => { setHist((h) => ({ list: [h.saved], at: 0, saved: h.saved, tag: "", time: 0 })); setTyping(null); setRev((r) => r + 1); say("Back to the last save."); };

  // ---------- the page around it ----------
  useEffect(() => { try { if (localStorage.getItem("lc_stu_labels") === "0") setLabels(false); const v = JSON.parse(localStorage.getItem("lc_hero_pv") || "null"); if (v && v.w && v.h) setPv({ w: clampN(v.w, PV_W), h: clampN(v.h, PV_H) }); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem("lc_hero_pv", JSON.stringify(pv)); } catch {} }, [pv]);
  useEffect(() => { try { const w = Number(localStorage.getItem("lc_hero_pw")); if (w >= 300) setPanelW(Math.min(760, w)); const f = localStorage.getItem("lc_hero_fit"); if (f === "all" || f === "real" || f === "width") setFit(f); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem("lc_hero_pw", String(panelW)); localStorage.setItem("lc_hero_fit", fit); } catch {} }, [panelW, fit]);
  useEffect(() => {
    const el = prevBox.current;
    if (!el) return;
    const measure = () => setRoom({ w: Math.max(240, el.clientWidth - 4), h: Math.max(320, window.innerHeight - el.getBoundingClientRect().top - 120) });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  useEffect(() => {
    const t = settings.defaultTheme as string, h = new Date().getHours();
    setSkin((LIVE_THEMES as string[]).includes(t) ? t : t === "auto" ? (h >= 18 || h < 6 ? "night" : "day") : "playful");
  }, [settings.defaultTheme]);
  useEffect(() => { if (!skin) return; document.documentElement.setAttribute("data-skin", skin); return () => document.documentElement.removeAttribute("data-skin"); }, [skin]);
  useEffect(() => { const leave = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } }; window.addEventListener("beforeunload", leave); return () => window.removeEventListener("beforeunload", leave); }, [dirty]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      const field = (e.target as HTMLElement).closest?.("input, textarea, select"), k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === "s") { e.preventDefault(); save(); }
      else if ((e.ctrlKey || e.metaKey) && !field && k === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if ((e.ctrlKey || e.metaKey) && !field && k === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [save, undo, redo]);

  // ---------- the preview ----------
  const s = useMemo(() => ({ ...settings, ...d } as unknown as SiteSettings), [settings, d]);
  const stats = useMemo(() => heroStats(sections.map((x) => ({ ...x })), counts, reactions, d.heroDesign, settings.effects.reactions, isConnectLayout), [sections, counts, reactions, d.heroDesign, settings.effects.reactions]);
  const mood = MOODS[settings.mood];
  const siteStyle = (mood ? { "--m": mood.color, "--m-deep": mood.deep } : {}) as React.CSSProperties;
  const open = (group: string) => {
    setLit(group);
    const el = panel.current?.querySelector<HTMLElement>(`[data-g="${group}"]`);
    if (el) { if (el.tagName === "DETAILS") (el as HTMLDetailsElement).open = true; el.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    setTimeout(() => setLit((l) => (l === group ? "" : l)), 1600);
  };
  const onPart = (key: string, _at: DOMRect, shown: string, n: number) => {
    const field = TYPED[key];
    if (field && String(d[field] ?? "").trim() === shown) { setTyping({ key, n, value: String(d[field]) }); return; }
    open(GROUP[key] ?? "words");
  };
  const setSize = (key: string, size: PartSize | undefined, stroke?: number) => change((x) => {
    const parts = { ...(x.heroDesign.parts ?? {}) };
    if (size) parts[key] = size; else delete parts[key];
    return same(x.heroDesign.parts?.[key], size) ? x : { ...x, heroDesign: { ...x.heroDesign, parts } };
  }, `size-${key}${stroke ? `-${stroke}` : ""}`);

  const h = d.heroDesign;
  const zoom = fit === "real" ? 1 : fit === "all" ? Math.min(1, room.w / pv.w, room.h / pv.h) : Math.min(1, room.w / pv.w);
  const dragSplit = (e: React.PointerEvent) => {
    e.preventDefault();
    const x0 = e.clientX, w0 = panelW;
    const moveTo = (m: PointerEvent) => setPanelW(Math.round(Math.max(300, Math.min(760, w0 - (m.clientX - x0)))));
    const up = () => { window.removeEventListener("pointermove", moveTo); window.removeEventListener("pointerup", up); document.body.style.cursor = ""; };
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", moveTo);
    window.addEventListener("pointerup", up);
  };
  const resizeScreen = (e: React.PointerEvent) => {
    e.preventDefault();
    const x0 = e.clientX, y0 = e.clientY, start = pv, z = zoom;
    const moveTo = (m: PointerEvent) => setPv({ w: clampN(start.w + (m.clientX - x0) / z, PV_W), h: clampN(start.h + (m.clientY - y0) / z, PV_H) });
    const up = () => { window.removeEventListener("pointermove", moveTo); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", moveTo);
    window.addEventListener("pointerup", up);
  };
  const look = phone && h.phoneLook ? h.phoneLook : h.look;
  const chosenStats = h.stats;
  const statOptions = [...sections.filter((x) => !isConnectLayout(x.layout)).map((x) => ({ key: x.slug, label: `${x.nav_emoji ? x.nav_emoji + " " : ""}${x.nav_label || x.title}`, n: counts[x.id] ?? 0 })), { key: "reactions", label: "❤️ Reactions", n: reactions }];
  const txt = (k: keyof Draft, label: string, max: number, hint?: string, ph?: string) => (
    <div className="fl"><label htmlFor={`h-${String(k)}`}>{label}</label><input id={`h-${String(k)}`} className="inp" maxLength={max} value={String(d[k] ?? "")} placeholder={ph} onChange={(e) => set(k, e.target.value as never)} />{hint && <div className="hint">{hint}</div>}</div>
  );
  const chip = (on: boolean, label: React.ReactNode, onClick: () => void, key: string, title?: string) => <button type="button" key={key} className={`hst-chip${on ? " on" : ""}`} onClick={onClick} title={title}>{label}</button>;

  return (
    <div className="stu hstu">
      <header className="stu-top">
        <div className="stu-name"><h1 className="adm-h">G0 · Hero</h1><p className="adm-sub">Your homepage&apos;s first impression{dirty ? " · changes not saved" : ""}</p></div>
        <div className="btns stu-topbtns">
          <label className="switch"><input type="checkbox" checked={labels} onChange={(e) => { setLabels(e.target.checked); try { localStorage.setItem("lc_stu_labels", e.target.checked ? "1" : "0"); } catch {} }} />Labels</label>
          <select className="stu-skin" value={skin} aria-label="Theme the preview wears" onChange={(e) => setSkin(e.target.value)}>{LIVE_THEMES.map((t) => <option key={t} value={t}>{SKIN_LABELS[t as Skin] ?? t}</option>)}</select>
          <a href="/#hero" target="_blank" className="b-out b-sm"><i className="ti ti-eye" />View on site</a>
        </div>
      </header>

      <div className="hst-grid" style={{ "--pw": `${panelW}px` } as React.CSSProperties}>
        <div className={`hst-prev${fit === "real" ? " real" : ""}`} ref={prevBox}>
          <div className="hst-screens" role="group" aria-label="Screen size of the preview">
            {SCREENS.map(([k, label, w, hh]) => <button key={k} type="button" className={`hst-chip${pv.w === w && pv.h === hh ? " on" : ""}`} onClick={() => setPv({ w, h: hh })}><i className={`ti ti-${k === "phone" ? "device-mobile" : k === "tablet" ? "device-tablet" : k === "big" ? "device-tv" : "device-laptop"}`} />{label}</button>)}
            <span className="hst-wh">
              <input type="number" className="inp" aria-label="Screen width" min={PV_W[0]} max={PV_W[1]} value={pv.w} onChange={(e) => setPv((v) => ({ ...v, w: clampN(+e.target.value || v.w, PV_W) }))} />×
              <input type="number" className="inp" aria-label="Screen height" min={PV_H[0]} max={PV_H[1]} value={pv.h} onChange={(e) => setPv((v) => ({ ...v, h: clampN(+e.target.value || v.h, PV_H) }))} />
            </span>
            <span className="hst-fit" role="group" aria-label="How big the preview is">
              {([["width", "Fill the width"], ["all", "Whole screen in view"], ["real", "Real size"]] as const).map(([k, label]) => <button key={k} type="button" className={`hst-chip${fit === k ? " on" : ""}`} aria-pressed={fit === k} onClick={() => setFit(k)}>{label}{fit === k ? ` · ${Math.round(zoom * 100)}%` : ""}</button>)}
            </span>
          </div>
          <div className="hst-stage" style={{ width: Math.round(pv.w * zoom) }}>
            <Surface key={`${phone}-${rev}`} zoom={zoom} width={Math.round(pv.w * zoom)} labels={labels} name={(k) => NAMES[k] ?? k} onPart={onPart} sizes={h.parts ?? {}} onSize={setSize}
              typing={typing} onType={(v) => { const f = typing && TYPED[typing.key]; if (f) set(f, v as never, `type-${f}`); }} onTypeEnd={() => setTyping(null)}>
              <div className={`site stu-site hst-site${settings.effects.intro ? " fx-intro" : ""}${pv.w <= 1000 ? " pv-mid" : ""}${pv.w <= 760 ? " pv-narrow" : ""}${pv.w <= 560 ? " pv-tiny" : ""}${pv.w <= 480 ? " pv-xs" : ""}`}
                style={{ ...siteStyle, width: pv.w, "--pv-w": `${pv.w}px`, "--pv-h": `${pv.h}px` } as React.CSSProperties}>
                <HeroView s={s} d={h} stats={stats} edit phone={phone} />
              </div>
            </Surface>
            <button type="button" className="hst-resize" aria-label="Drag to change the screen size" title="Drag to change the screen size" onPointerDown={resizeScreen} />
          </div>
          <p className="hint">This is a {pv.w} × {pv.h} screen{phone ? ", so it shows the phone layout" : ""}. Pick a screen above, type a size, or drag the preview's green corner to change it and watch the hero adjust. Drag the bar between the preview and the controls to make the preview bigger. Click any piece to change it; type straight onto the subtitle, status, now line and scroll hint; drag a piece&apos;s handles to move or resize it.</p>
        </div>

        <button type="button" className="hst-split" aria-label="Drag to make the preview wider or narrower" title="Drag to make the preview wider or narrower" onPointerDown={dragSplit}
          onKeyDown={(e) => { if (e.key === "ArrowLeft") setPanelW((w) => Math.min(760, w + 20)); if (e.key === "ArrowRight") setPanelW((w) => Math.max(300, w - 20)); }}><i /></button>
        <div className="hst-panel" ref={panel}>
          <G lit={lit} g="look" title="Look">
            <div className="hst-looks">{HERO_LOOKS.map(([k, label, desc]) => chip(h.look === k, <><b>{label}</b><small>{desc}</small></>, () => setD({ look: k as HeroLook }), k))}</div>
            <div className="fl"><label htmlFor="h-pl">On phones</label>
              <select id="h-pl" value={h.phoneLook} onChange={(e) => { setD({ phoneLook: e.target.value as HeroLook | "" }); if (e.target.value) setPv({ w: 390, h: 844 }); }}>
                <option value="">The same look</option>{HERO_LOOKS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select><div className="hint">A different look just for phones, for example the profile card on phones and the magazine on computers.</div></div>
            <div className="fl"><span className="lab">Background</span><div className="hst-chips">{HERO_BGS.map(([k, label]) => chip(h.bg === k, label, () => setD({ bg: k }), k))}</div>
              {["terminal", "poster", "lights"].includes(look) && <div className="hint">This look brings its own background.</div>}</div>
            <div className="fl"><span className="lab">Photo shape (profile card, boot screen, poster, lights)</span><div className="hst-chips">{([["arch", "Arch"], ["round", "Circle"], ["square", "Rounded square"]] as const).map(([k, label]) => chip(h.shape === k, label, () => setD({ shape: k }), k))}</div></div>
          </G>

          <G lit={lit} g="words" title="Words">
            <div className="f2">{txt("fullName", "Full name", 120)}{txt("nickname", "Nickname", 80)}</div>
            <div className="f2">{txt("headline1", "Headline, line 1", 80)}{txt("headline2", "Headline, line 2", 80, "Wrap words in *stars* for the accent colour.")}</div>
            <div className="fl"><label htmlFor="h-sub">Subtitle</label><textarea id="h-sub" className="inp" rows={3} maxLength={400} value={d.subtitle} onChange={(e) => set("subtitle", e.target.value)} /></div>
            {txt("statusText", "Status line (with the pulsing dot)", 160)}
            {txt("nowStatus", "Now line", 120, "A dashed line under your chips, like “Now: learning Rust”. Empty hides it.")}
            <div className="fl"><label htmlFor="h-roles">Role chips (one per line)</label><Lines id="h-roles" value={d.roleChips} onChange={(v) => set("roleChips", v)} /></div>
            <div className="fl"><label htmlFor="h-skills">Skills strip (one per line)</label><Lines id="h-skills" value={d.skills} onChange={(v) => set("skills", v)} rows={5} /></div>
            {txt("scrollCue", "Scroll hint", 60)}
            <div className="fl"><label htmlFor="h-brand">Phrases typed in the top-left corner (one per line)</label><Lines id="h-brand" value={d.brandPhrases} onChange={(v) => set("brandPhrases", v)} rows={3} /></div>
          </G>

          <G lit={lit} g="rotate" title="Headlines that take turns">
            <label className="switch"><input type="checkbox" checked={h.rotateOn} onChange={(e) => setD({ rotateOn: e.target.checked })} />Rotate the headline</label>
            <div className="fl"><label htmlFor="h-rot">Other headlines (one per line, up to {MAX_ROTATE})</label>
              <Lines id="h-rot" value={h.rotate} onChange={(v) => setD({ rotate: v.slice(0, MAX_ROTATE) }, "rotate")} placeholder={"Data by day, builder by *night.*\nDhaka's quietest explorer"} /></div>
            <div className="hint">Your main headline comes first, then these, one every few seconds with a soft slide. The preview shows the main one; the site plays them.</div>
          </G>

          <G lit={lit} g="looktext" title="Words only some looks use" startOpen={false}>
            <div className="fl"><label htmlFor="h-mast">Magazine masthead</label><input id="h-mast" className="inp" maxLength={24} value={h.mast} placeholder={(d.nickname || d.fullName).toUpperCase()} onChange={(e) => setD({ mast: e.target.value }, "mast")} /></div>
            <div className="fl"><label htmlFor="h-pres">Poster&apos;s line above the photo</label><input id="h-pres" className="inp" maxLength={60} value={h.presents} placeholder={`${(d.location || "Home").split(",")[0]} Pictures presents`} onChange={(e) => setD({ presents: e.target.value }, "presents")} /></div>
            <div className="fl"><label htmlFor="h-prompt">Boot screen&apos;s prompt name</label><input id="h-prompt" className="inp" maxLength={24} value={h.prompt} placeholder={(d.nickname || "me").toLowerCase()} onChange={(e) => setD({ prompt: e.target.value }, "prompt")} /></div>
          </G>

          <G lit={lit} g="photo" title="Photo and résumé">
            <UploadField key={`a${rev}`} name="avatarUrl" initial={d.avatarUrl} fallback={d.initials} useBlob={useBlob} onChange={(u) => set("avatarUrl", u)} />
            <div className="hint">A PNG with a transparent background becomes a cut-out sticker in the hanging look.</div>
            {txt("initials", "Initials (shown without a photo)", 3)}
            <div className="fl"><span className="lab">Résumé (PDF)</span><UploadField key={`r${rev}`} name="resumeUrl" initial={d.resumeUrl} kind="pdf" useBlob={useBlob} onChange={(u) => set("resumeUrl", u)} /></div>
            {txt("ctaPrimaryLabel", "Résumé button text", 40, "The button shows once a résumé is uploaded.")}
          </G>

          <G lit={lit} g="buttons" title="Buttons">
            <div className="f2">{txt("ctaSecondaryLabel", "Second button text", 40)}{txt("ctaSecondaryUrl", "Second button link", 300)}</div>
            <span className="lab">More buttons (up to {MAX_HERO_BUTTONS})</span>
            {h.buttons.map((b, i) => (
              <div key={i} className="hst-btn">
                <input className="inp" aria-label={`Button ${i + 3} text`} maxLength={40} value={b.label} onChange={(e) => setD({ buttons: h.buttons.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) }, `btn-${i}`)} />
                <input className="inp" aria-label={`Button ${i + 3} link`} maxLength={500} value={b.url} placeholder="https://…" onChange={(e) => setD({ buttons: h.buttons.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) }, `btnu-${i}`)} />
                <button type="button" className="adm-iconbtn" aria-label="Move up" disabled={i === 0} onClick={() => { const b2 = [...h.buttons]; [b2[i - 1], b2[i]] = [b2[i], b2[i - 1]]; setD({ buttons: b2 }); }}><i className="ti ti-arrow-up" /></button>
                <button type="button" className="adm-iconbtn" aria-label="Remove" onClick={() => setD({ buttons: h.buttons.filter((_, j) => j !== i) })}><i className="ti ti-x" /></button>
              </div>
            ))}
            {h.buttons.length < MAX_HERO_BUTTONS && <div><button type="button" className="b-out b-sm" onClick={() => setD({ buttons: [...h.buttons, { label: "New button", url: "https://" }] })}><i className="ti ti-plus" />Add a button</button></div>}
            <div className="hint">A button needs a link starting with https://, mailto:, tel:, / or #. Web links open in a new tab.</div>
          </G>

          <G lit={lit} g="stats" title="Numbers">
            <div className="hst-chips">{chip(chosenStats.length === 0, "Pick them by themselves", () => setD({ stats: [] }), "auto")}{chip(chosenStats.length > 0, "I'll choose", () => { if (!chosenStats.length) setD({ stats: stats.map((x) => x.key) }); }, "own")}</div>
            {chosenStats.length > 0 && <div className="hst-stats">
              {statOptions.map((o) => { const at = chosenStats.indexOf(o.key); return (
                <label key={o.key} className="switch"><input type="checkbox" checked={at >= 0} onChange={(e) => setD({ stats: e.target.checked ? [...chosenStats, o.key] : chosenStats.filter((x) => x !== o.key) })} />{o.label} <b>{o.n}</b>
                  {at > 0 && <button type="button" className="adm-iconbtn" aria-label={`Move ${o.label} earlier`} onClick={(e) => { e.preventDefault(); const l = [...chosenStats]; [l[at - 1], l[at]] = [l[at], l[at - 1]]; setD({ stats: l }); }}><i className="ti ti-arrow-up" /></button>}
                </label>); })}
            </div>}
            <div className="hint">They count up when the page opens and lead to their section. Ticked ones show in the order ticked.</div>
          </G>

          <G lit={lit} g="pieces" title="Pieces on the hero">
            <div className="stu-switches">{HERO_PIECES.map(([k, label]) => (
              <label key={k} className="switch"><input type="checkbox" checked={!h.hide[k]} onChange={(e) => { const hide = { ...h.hide }; if (e.target.checked) delete hide[k as HeroPiece]; else hide[k as HeroPiece] = true; setD({ hide }); }} />{label}</label>
            ))}</div>
            <div className="hint">Off hides it on the hero only; nothing is deleted. The mood comes from Settings, and “people here now” and the greeting also need their switches on the Appearance page.</div>
          </G>

          <G lit={lit} g="place" title="Place, clock and emojis" startOpen={false}>
            <div className="f3">{txt("location", "Location", 120)}{txt("timezone", "Clock time zone", 60, "", "Asia/Dhaka")}{txt("clockLabel", "Clock label", 12)}</div>
            {txt("heroEmojis", "Floating emojis (separate with spaces)", 80)}
          </G>

          <G lit={lit} g="boxes" title="Moved and resized pieces" startOpen={false}>
            <p className="hint" style={{ margin: 0 }}>{Object.keys(h.parts ?? {}).length ? `${Object.keys(h.parts ?? {}).length} piece(s) have their own size or place.` : "Nothing moved or resized yet. Drag a piece's handles on the preview."}</p>
            <div><button type="button" className="b-out b-sm" disabled={!Object.keys(h.parts ?? {}).length} onClick={() => setD({ parts: undefined })}><i className="ti ti-restore" />Put every piece back</button></div>
          </G>
        </div>
      </div>

      <div className={`stu-save${dirty ? " show" : ""}`} role="region" aria-label="Save your changes" aria-hidden={!dirty}>
        <span className="stu-save-t"><i />Changes not saved yet</span>
        <button type="button" disabled={hist.at === 0 || saving} onClick={undo} tabIndex={dirty ? 0 : -1}><i className="ti ti-arrow-back-up" />Undo</button>
        <button type="button" disabled={hist.at >= hist.list.length - 1 || saving} onClick={redo} tabIndex={dirty ? 0 : -1}><i className="ti ti-arrow-forward-up" />Redo</button>
        <button type="button" disabled={saving} onClick={discard} tabIndex={dirty ? 0 : -1}>Discard</button>
        <button type="button" className="go" disabled={saving} onClick={save} tabIndex={dirty ? 0 : -1}><i className={`ti ti-${saving ? "loader-2 spin" : "device-floppy"}`} />{saving ? "Saving…" : "Save"}</button>
      </div>
      {toast && <div key={toast.n} className={`adm-toast stu-toast${toast.bad ? " bad" : ""}`} role="status">{toast.text}</div>}
    </div>
  );
}
