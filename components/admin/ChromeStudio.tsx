"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Section } from "@/lib/data";
import { LIVE_THEMES, MOODS, SKIN_LABELS, type SiteSettings, type Skin } from "@/lib/settings";
import {
  FOOTER_EXTRAS, FOOTER_LOOKS, MENU_BGS, MENU_EXTRAS, MENU_LOOKS, PHONE_MENUS, SKY_TIMES, OWN_BG,
  type FooterDesign, type FooterExtra, type MenuDesign, type MenuExtra,
} from "@/lib/chrome";
import { saveFooter, saveMenu } from "@/app/actions";
import { Nav } from "@/components/site/SiteNav";
import { Footer } from "@/components/site/SiteFooter";

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
  return picker;
}

/** The save bar every editor has: Discard and Save, shown only when something changed; Ctrl+S saves. */
function SaveBar({ dirty, saving, onSave, onDiscard }: { dirty: boolean; saving: boolean; onSave: () => void; onDiscard: () => void }) {
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

/** The real site on a phone, in a frame: what's saved, reloaded after every save. */
function PhoneFrame({ path, rev }: { path: string; rev: number }) {
  return (
    <div className="cs-phone">
      <iframe key={rev} src={path} title="Your site on a phone" loading="lazy" />
      <span className="hint">Your site on a phone, as saved. It reloads after you save.</span>
    </div>
  );
}

function Look({ on, title, desc, onClick, tag }: { on: boolean; title: string; desc: string; onClick: () => void; tag?: string }) {
  return <button type="button" className={`cs-look${on ? " on" : ""}`} onClick={onClick} aria-pressed={on}><b>{title}{tag && <em>{tag}</em>}</b><small>{desc}</small></button>;
}

/**
 * The menu bar's dashboard page (/admin/menu). The real menu bar is drawn live at the top in the site's theme over a slice of the page,
 * and the real site runs in a phone frame beside the controls. Look, background (and the sky's time), phone menu, extras, the ticker's
 * lines, the Say hello button's words and which sections the menu lists. One Save writes it all (saveMenu).
 */
export function MenuStudio({ first, settings, sections }: { first: MenuDesign; settings: SiteSettings; sections: Section[] }) {
  const router = useRouter();
  const [saved, setSaved] = useState(first);
  const [d, setD] = useState(first);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ t: string; bad?: boolean } | null>(null);
  const [rev, setRev] = useState(0);
  const picker = useSkin(settings);
  const dirty = !same(d, saved);
  const set = (patch: Partial<MenuDesign>) => setD((x) => ({ ...x, ...patch }));
  const setEx = (k: MenuExtra, v: boolean) => setD((x) => ({ ...x, extras: { ...x.extras, [k]: v } }));
  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    const r = await saveMenu(d).catch(() => null);
    setSaving(false);
    if (!r || !r.ok) { setNote({ t: r && !r.ok ? r.error : "That didn't save. Check your connection and try again.", bad: true }); return; }
    setSaved(d); setRev((n) => n + 1); setNote({ t: "Saved. It's live on your site." }); router.refresh();
  };
  const s = useMemo(() => ({ ...settings, menu: d }) as SiteSettings, [settings, d]);
  const mood = MOODS[settings.mood];
  const ownBg = MENU_BGS.find(([k]) => k === OWN_BG[d.look])?.[1];
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 4000); return () => clearTimeout(t); }, [note]);
  const lines = useRef(d.ticker.join("\n"));
  return (
    <div className="stu cs">
      <header className="stu-top">
        <div className="stu-name"><h1 className="adm-h">Menu bar</h1><p className="adm-sub">On top of every page{dirty ? " · changes not saved" : ""}</p></div>
        <div className="btns stu-topbtns">{picker}<a href="/" target="_blank" className="b-out b-sm"><i className="ti ti-eye" />View on site</a></div>
      </header>
      <div className={`site stu-site cs-site${settings.effects.navpill ? " fx-navpill" : ""}`} style={(mood ? { "--m": mood.color, "--m-deep": mood.deep } : {}) as React.CSSProperties}>
        <Nav settings={s} sections={sections} onHome preview />
        <div className="cs-page"><span className="eyebrow">G1 · {sections[0]?.nav_emoji} {sections[0]?.eyebrow}</span><h2 className="stitle">{sections[0]?.title ?? "Your first section"}</h2><p className="ssub">The menu bar sits on top of every section. Point at it: the links and the decoration move like on the site; scrolling effects play on the real site.</p></div>
      </div>
      <div className="cs-grid">
        <div className="cs-panel">
          <details className="c box" open><summary><span>Look</span><i className="ti ti-chevron-down" /></summary><div className="f cs-looks">
            {MENU_LOOKS.map(([k, label, desc]) => <Look key={k} on={d.look === k} title={label} desc={desc} onClick={() => set({ look: k })} />)}
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
        <PhoneFrame path="/" rev={rev} />
      </div>
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={() => setD(saved)} />
      {note && <div className={`adm-toast stu-toast${note.bad ? " bad" : ""}`} role="status">{note.t}</div>}
    </div>
  );
}

type FootDraft = { footer: FooterDesign; footerLeft: string; footerRight: string };
/**
 * The footer's dashboard page (/admin/footer). The real footer is drawn live at the top (a receipt shows this browser's own visit), and the
 * real site runs in a phone frame. Look, the words each look uses, extras, and the two footer lines (moved here from Settings). Save: saveFooter.
 */
export function FooterStudio({ first, settings, sections }: { first: FootDraft; settings: SiteSettings; sections: Section[] }) {
  const router = useRouter();
  const [saved, setSaved] = useState(first);
  const [d, setD] = useState(first);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ t: string; bad?: boolean } | null>(null);
  const [rev, setRev] = useState(0);
  const picker = useSkin(settings);
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
    setSaved(d); setRev((n) => n + 1); setNote({ t: "Saved. It's live on your site." }); router.refresh();
  };
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 4000); return () => clearTimeout(t); }, [note]);
  const s = useMemo(() => ({ ...settings, footer: f, footerLeft: d.footerLeft, footerRight: d.footerRight }) as SiteSettings, [settings, f, d.footerLeft, d.footerRight]);
  const mood = MOODS[settings.mood];
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
        <div className="stu-name"><h1 className="adm-h">Footer</h1><p className="adm-sub">At the bottom of every page, under Connect{dirty ? " · changes not saved" : ""}</p></div>
        <div className="btns stu-topbtns">{picker}<a href="/#connect" target="_blank" className="b-out b-sm"><i className="ti ti-eye" />View on site</a></div>
      </header>
      <div className="site stu-site cs-site" style={(mood ? { "--m": mood.color, "--m-deep": mood.deep } : {}) as React.CSSProperties}>
        <Footer settings={s} sections={sections} onHome preview />
      </div>
      <div className="cs-grid">
        <div className="cs-panel">
          <details className="c box" open><summary><span>Look</span><i className="ti ti-chevron-down" /></summary><div className="f cs-looks">
            {FOOTER_LOOKS.map(([k, label, desc]) => <Look key={k} on={L === k} title={label} desc={desc} onClick={() => setF({ look: k })} tag={k === "receipt" ? "your favourite" : undefined} />)}
          </div></details>
          <details className="c box" open><summary><span>Words</span><i className="ti ti-chevron-down" /></summary><div className="f">
            {(L === "receipt" || L === "rcmap") && <>{txt("shop", "Receipt's shop name", 40)}{txt("thanks", "Receipt's last line", 60)}</>}
            {L === "rcmap" && txt("coupon", "Coupon", 90, "Its Redeem button opens your chat.")}
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
        <PhoneFrame path="/#connect" rev={rev} />
      </div>
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={() => setD(saved)} />
      {note && <div className={`adm-toast stu-toast${note.bad ? " bad" : ""}`} role="status">{note.t}</div>}
    </div>
  );
}
