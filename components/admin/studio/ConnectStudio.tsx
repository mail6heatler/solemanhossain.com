"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LIVE_THEMES, MOODS, SKIN_LABELS, type SiteSettings, type Skin, type Social } from "@/lib/settings";
import {
  AVAILS, BOARDS, BUBBLES, BUBBLE_COLORS, CONNECT_PIECES, LOGO_CHOICES, MAX_GREET, MAX_LINKS, MAX_QUICK, MAX_SAVED, WALLPAPERS, WALL_BTNS, linkBrand, linkView, normaliseLink,
  type ConnectDesign, type ConnectPiece,
} from "@/lib/connectLook";
import type { PartSize } from "@/lib/partSize";
import { saveConnectStudio, type ConnectSave } from "@/app/actions";
import ChatWindow from "@/components/site/ChatWindow";
import StickerBar from "@/components/site/StickerBar";
import { CardBarProvider } from "@/components/site/BarCtx";
import { Box as CardBox } from "@/components/site/cardParts";
import type { TalkInfo } from "@/lib/talk";
import type { ChatNote } from "@/components/site/ChatWall";
import { UploadField } from "@/components/admin/Widgets";
import { Surface, type Typing } from "./Surface";

type Draft = ConnectSave;
type Hist = { list: Draft[]; at: number; saved: Draft; tag: string; time: number };
/** a pinned testimonial as the preview draws it; `bar` is whether its Buttons panel shows (the sticker buttons, standing still) */
export type ConnectPin = { id: number; title: string; body: string; subtitle: string; category: string; talk: TalkInfo; bar: boolean };

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);
const SCREENS: [string, string, number][] = [["computer", "Computer", 1280], ["tablet", "Tablet", 820], ["phone", "Phone", 390]];
/** What each piece of the preview is called on its label, and which group of controls it opens. */
const NAMES: Record<string, string> = {
  "sec-eyebrow": "Small label", "sec-title": "Big title", "sec-sub": "Subtitle", "cw-face": "Photo", "cw-me": "Name & availability", "cw-links": "Links",
  "cw-pins": "Pinned / wall note", "cw-head": "Chat title", "cw-thread": "Chat & greeting", "cw-form": "Message box", "cw-quick": "Quick starters",
  "cw-wb": "Wall button", "cw-board": "The Wall",
};
const GROUP: Record<string, string> = {
  "sec-eyebrow": "header", "sec-title": "header", "sec-sub": "header", "cw-face": "face", "cw-me": "face", "cw-links": "links", "cw-pins": "pins",
  "cw-head": "chat", "cw-thread": "chat", "cw-form": "box", "cw-quick": "box", "cw-wb": "wall", "cw-board": "wall",
};

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

/** One link: its logo, name, address, own line, and a logo chosen or uploaded by hand. */
function LinkRow({ l, i, n, useBlob, onChange, onMove, onRemove }: {
  l: Social; i: number; n: number; useBlob: boolean; onChange: (l: Social) => void; onMove: (d: -1 | 1) => void; onRemove: () => void;
}) {
  const v = linkView(l);
  const auto = linkBrand(l.url);
  const [open, setOpen] = useState(false);
  const setUrl = (raw: string) => {
    const url = raw;
    const was = linkBrand(l.url), now = linkBrand(normaliseLink(url));
    // a name or logo that came from the old address follows the new one; one typed or chosen by hand stays
    onChange({ ...l, url, label: !l.label || l.label === was.label ? now.label : l.label, icon: !l.icon || l.icon === was.icon || l.icon === "link" ? now.icon : l.icon });
  };
  return (
    <div className="cst-link">
      <div className="cst-link-top">
        <i className={`cst-logo${v.logo ? " pic" : ""}`} style={v.color && !v.logo ? ({ background: v.color, color: v.ink } as React.CSSProperties) : undefined} aria-hidden>
          {v.logo ? <img src={v.logo} alt="" /> : <i className={`ti ti-${v.icon}`} />}
        </i>
        <input className="inp" aria-label={`Link ${i + 1} name`} maxLength={60} value={l.label} placeholder={auto.label} onChange={(e) => onChange({ ...l, label: e.target.value })} />
        <button type="button" className="adm-iconbtn" aria-label="Move up" disabled={i === 0} onClick={() => onMove(-1)}><i className="ti ti-arrow-up" /></button>
        <button type="button" className="adm-iconbtn" aria-label="Move down" disabled={i === n - 1} onClick={() => onMove(1)}><i className="ti ti-arrow-down" /></button>
        <button type="button" className="adm-iconbtn" aria-label="Remove this link" onClick={onRemove}><i className="ti ti-x" /></button>
      </div>
      <input className="inp" aria-label={`Link ${i + 1} address`} maxLength={500} value={l.url} placeholder="instagram.com/you, you@mail.com, +880…" onChange={(e) => setUrl(e.target.value)} onBlur={(e) => { const u = normaliseLink(e.target.value); if (u !== l.url) setUrl(u); }} />
      <input className="inp" aria-label={`Link ${i + 1} line under the name`} maxLength={80} value={l.note ?? ""} placeholder={`Line under it: ${auto.icon === "world" ? "where it goes" : auto.note}`} onChange={(e) => onChange({ ...l, note: e.target.value })} />
      <button type="button" className="cst-more" onClick={() => setOpen((o) => !o)} aria-expanded={open}><i className={`ti ti-chevron-${open ? "up" : "down"}`} />Logo{v.logo ? ": your picture" : l.icon !== auto.icon ? ": chosen by hand" : ": found from the link"}</button>
      {open && (
        <div className="cst-logo-ed">
          <div className="fl"><label htmlFor={`lg-${i}`}>Logo</label>
            <select id={`lg-${i}`} value={l.icon} onChange={(e) => onChange({ ...l, icon: e.target.value })}>
              <option value={auto.icon}>Found from the link ({LOGO_CHOICES.find(([k]) => k === auto.icon)?.[1] ?? "Website"})</option>
              {LOGO_CHOICES.filter(([k]) => k !== auto.icon).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select></div>
          <span className="lab">Or upload your own logo</span>
          <UploadField name={`logo-${i}`} initial={l.logo ?? ""} shape="sq" useBlob={useBlob} onChange={(u) => onChange({ ...l, logo: u })} />
          <div className="hint">A square PNG or SVG works best. It replaces the logo above; Remove brings it back.</div>
        </div>
      )}
    </div>
  );
}

/**
 * Connect's live editor (G8). The real chat window (ChatWindow, with `edit`) and the section's header are drawn on the left in the site's theme,
 * with a label on every piece; a click on one opens its controls on the right, the big title and subtitle are typed straight onto it, and every piece
 * of the window can be dragged and resized. The right side holds everything: the window's wallpaper, bubbles and movement, its own photo, name and
 * availability, the links with logos found from their address or uploaded, the greeting, automatic reply, quick starters, the box's words, the wall
 * note, which pieces show and the section's header. One Save writes it all (`saveConnectStudio`); Undo and Redo work on drafts.
 * Testimonials stay entries, edited in the boxes under the editor.
 */
export default function ConnectStudio({ first, settings, notes, pins, useBlob }: {
  first: Draft; settings: SiteSettings; notes: ChatNote[]; pins: ConnectPin[]; useBlob: boolean;
}) {
  const router = useRouter();
  const [hist, setHist] = useState<Hist>({ list: [first], at: 0, saved: first, tag: "", time: 0 });
  const d = hist.list[hist.at];
  const c = d.connect;
  const dirty = d !== hist.saved;
  const [labels, setLabels] = useState(true);
  const [pvW, setPvW] = useState(1280);
  const [room, setRoom] = useState(900);
  const [skin, setSkin] = useState("");
  const [typing, setTyping] = useState<Typing | null>(null);
  const [lit, setLit] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; n: number; bad?: boolean } | null>(null);
  const [rev, setRev] = useState(0);
  const [paste, setPaste] = useState("");
  const [boardPv, setBoardPv] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const prevBox = useRef<HTMLDivElement>(null);
  const say = (text: string, bad = false) => setToast((t) => ({ text, n: (t?.n ?? 0) + 1, bad }));
  const phone = pvW <= 760;

  // ---------- changes, with undo ----------
  const change = useCallback((fn: (x: Draft) => Draft, tag = "") => setHist((h) => {
    const cur = h.list[h.at], next = fn(cur);
    if (next === cur || same(next, cur)) return h;
    const now = Date.now();
    if (tag && tag === h.tag && now - h.time < 1500 && h.at > 0 && cur !== h.saved) return { ...h, list: [...h.list.slice(0, h.at), next], time: now };
    const list = [...h.list.slice(0, h.at + 1), next].slice(-150);
    return { ...h, list, at: list.length - 1, tag, time: now };
  }), []);
  const setC = (patch: Partial<ConnectDesign>, tag = "") => change((x) => ({ ...x, connect: { ...x.connect, ...patch } }), tag);
  const setSec = (patch: Partial<Draft["section"]>, tag = "") => change((x) => ({ ...x, section: { ...x.section, ...patch } }), tag);
  const setLinks = (socials: Social[], tag = "") => change((x) => ({ ...x, socials }), tag);
  const undo = useCallback(() => { setTyping(null); setHist((h) => (h.at > 0 ? { ...h, at: h.at - 1, tag: "" } : h)); setRev((r) => r + 1); }, []);
  const redo = useCallback(() => { setTyping(null); setHist((h) => (h.at < h.list.length - 1 ? { ...h, at: h.at + 1, tag: "" } : h)); setRev((r) => r + 1); }, []);

  const save = useCallback(async () => {
    if (!dirty || saving) return;
    setSaving(true); setTyping(null);
    const res = await saveConnectStudio({ ...d, socials: d.socials.map((l) => ({ ...l, url: normaliseLink(l.url) })) }).catch(() => null);
    setSaving(false);
    if (!res || !res.ok) { say(res && !res.ok ? res.error : "That didn't save. Check your connection and try again.", true); return; }
    setHist((h) => ({ ...h, saved: h.list[h.at], tag: "" }));
    say("Saved. It's live on your site.");
    router.refresh();
  }, [dirty, saving, d, router]);
  const discard = () => { setHist((h) => ({ list: [h.saved], at: 0, saved: h.saved, tag: "", time: 0 })); setTyping(null); setRev((r) => r + 1); say("Back to the last save."); };

  // ---------- the page around it ----------
  useEffect(() => { try { if (localStorage.getItem("lc_stu_labels") === "0") setLabels(false); const w = Number(localStorage.getItem("lc_cst_pv")); if (SCREENS.some(([, , x]) => x === w)) setPvW(w); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem("lc_cst_pv", String(pvW)); } catch {} }, [pvW]);
  useEffect(() => {
    const el = prevBox.current;
    if (!el) return;
    const measure = () => setRoom(Math.max(240, el.clientWidth - 4));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
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
  const s = useMemo(() => ({ ...settings, socials: d.socials, connect: d.connect, connectFormTitle: d.connectFormTitle, effects: { ...settings.effects, plane: d.plane, chatfx: d.chatfx } }), [settings, d]);
  const mood = MOODS[settings.mood];
  const siteStyle = (mood ? { "--m": mood.color, "--m-deep": mood.deep } : {}) as React.CSSProperties;
  const zoom = Math.min(1, room / pvW);
  const open = (group: string) => {
    setLit(group);
    const el = panel.current?.querySelector<HTMLElement>(`[data-g="${group}"]`);
    if (el) { if (el.tagName === "DETAILS") (el as HTMLDetailsElement).open = true; el.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    setTimeout(() => setLit((l) => (l === group ? "" : l)), 1600);
  };
  const onPart = (key: string, _at: DOMRect, shown: string, n: number) => {
    if (key === "sec-title" && d.section.title.trim() === shown) { setTyping({ key, n, value: d.section.title }); return; }
    if (key === "sec-sub" && d.section.subtitle.trim() === shown) { setTyping({ key, n, value: d.section.subtitle }); return; }
    open(GROUP[key] ?? "look");
  };
  const setSize = (key: string, size: PartSize | undefined, stroke?: number) => change((x) => {
    const parts = { ...(x.connect.parts ?? {}) };
    if (size) parts[key] = size; else delete parts[key];
    return same(x.connect.parts?.[key], size) ? x : { ...x, connect: { ...x.connect, parts } };
  }, `size-${key}${stroke ? `-${stroke}` : ""}`);
  const pinCards = pins.length ? pins.map((it) => (
    <div key={it.id} className={`cw-pin${it.bar ? " stb-pin" : ""}`}>
      <CardBox bare={!it.bar} foot={<StickerBar id={it.id} label={it.title} talk={it.talk} still={{ counts: {}, comments: 0, feed: [] }} />} footClass="stb-foot">
        <span className="cw-pin-lab">⭐ Pinned{it.category ? ` ${it.category.toLowerCase().replace(/s$/, "")}` : ""}</span>
        <p className="cw-quote">{it.body || it.title}</p><div className="by">{it.subtitle || it.title}</div>
      </CardBox>
    </div>
  )) : null;

  // ---------- controls ----------
  const chip = (on: boolean, label: React.ReactNode, onClick: () => void, key: string, title?: string) => <button type="button" key={key} className={`hst-chip${on ? " on" : ""}`} onClick={onClick} title={title}>{label}</button>;
  const txtC = (k: keyof ConnectDesign, label: string, max: number, ph?: string, hint?: string) => (
    <div className="fl"><label htmlFor={`c-${k}`}>{label}</label><input id={`c-${k}`} className="inp" maxLength={max} value={String(c[k] ?? "")} placeholder={ph} onChange={(e) => setC({ [k]: e.target.value } as Partial<ConnectDesign>, String(k))} />{hint && <div className="hint">{hint}</div>}</div>
  );
  const txtS = (k: keyof Draft["section"], label: string, max: number) => (
    <div className="fl"><label htmlFor={`s-${k}`}>{label}</label><input id={`s-${k}`} className="inp" maxLength={max} value={String(d.section[k] ?? "")} onChange={(e) => setSec({ [k]: e.target.value } as Partial<Draft["section"]>, `s-${k}`)} /></div>
  );
  const owner = c.name || settings.nickname || settings.fullName;
  const addLink = () => {
    const url = normaliseLink(paste);
    if (!url) { say("Paste a link first, like instagram.com/you or your email.", true); return; }
    if (!/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(url)) { say("That doesn't look like a link. Try instagram.com/you, an email or a phone number.", true); return; }
    const b = linkBrand(url);
    setLinks([...d.socials, { label: b.label, url, icon: b.icon }]);
    setPaste("");
    say(`Added ${b.label}${b.icon === "world" ? "" : " with its logo"}.`);
  };

  return (
    <div className="stu hstu cstu">
      <header className="stu-top">
        <div className="stu-name"><h1 className="adm-h">{d.section.code ? `${d.section.code} · ` : ""}{d.section.title || "Connect"}</h1><p className="adm-sub">Your chat window: links, the wall and Say hello{dirty ? " · changes not saved" : ""}</p></div>
        <div className="btns stu-topbtns">
          <label className="switch"><input type="checkbox" checked={labels} onChange={(e) => { setLabels(e.target.checked); try { localStorage.setItem("lc_stu_labels", e.target.checked ? "1" : "0"); } catch {} }} />Labels</label>
          <select className="stu-skin" value={skin} aria-label="Theme the preview wears" onChange={(e) => setSkin(e.target.value)}>{LIVE_THEMES.map((t) => <option key={t} value={t}>{SKIN_LABELS[t as Skin] ?? t}</option>)}</select>
          <a href="/#connect" target="_blank" className="b-out b-sm"><i className="ti ti-eye" />View on site</a>
        </div>
      </header>

      <div className="hst-grid" style={{ "--pw": "420px" } as React.CSSProperties}>
        <div className="hst-prev" ref={prevBox}>
          <div className="hst-screens" role="group" aria-label="Screen size of the preview">
            {SCREENS.map(([k, label, w]) => <button key={k} type="button" className={`hst-chip${pvW === w ? " on" : ""}`} onClick={() => setPvW(w)}><i className={`ti ti-device-${k === "phone" ? "mobile" : k === "tablet" ? "tablet" : "laptop"}`} />{label}</button>)}
          </div>
          <div className="hst-stage" style={{ width: Math.round(pvW * zoom) }}>
            <Surface key={`${phone}-${rev}`} zoom={zoom} width={Math.round(pvW * zoom)} labels={labels} name={(k) => NAMES[k] ?? k} onPart={onPart} sizes={c.parts ?? {}} onSize={setSize}
              typing={typing} onTypeEnd={() => setTyping(null)}
              onType={(v) => { if (typing?.key === "sec-title") setSec({ title: v }, "type-title"); else if (typing?.key === "sec-sub") setSec({ subtitle: v }, "type-sub"); }}>
              <div className={`site stu-site cst-site${d.chatfx ? " fx-chatfx" : ""}${phone ? " pv-narrow pv-tiny" : ""}`} style={{ ...siteStyle, width: pvW } as React.CSSProperties}>
                <section className="chap cst-chap" data-layout="chat">
                  <div className="chap-inner">
                    <div className="eyebrow" data-part="sec-eyebrow">
                      {d.section.code && <span className="tag">{d.section.code}</span>}
                      {d.section.eyebrow_emoji && <span className="emo">{d.section.eyebrow_emoji}</span>} <span className="eb-t">{d.section.eyebrow}</span>
                    </div>
                    <div className="chap-head"><div>
                      <h2 className="stitle" data-part="sec-title">{d.section.title}</h2>
                      {d.section.subtitle && <p className="ssub" data-part="sec-sub">{d.section.subtitle}</p>}
                    </div></div>
                    <CardBarProvider value={settings.cardBar}><ChatWindow s={s} notes={notes} pins={pinCards} edit motion={d.chatfx} boardOpen={boardPv}
                      testi={pins.map((it) => ({ id: it.id, title: it.title, body: it.body || it.title, by: it.subtitle, href: "" }))} /></CardBarProvider>
                  </div>
                </section>
              </div>
            </Surface>
          </div>
          <p className="hint">This is how Connect looks on a {pvW}px wide screen{phone ? " (the phone layout)" : ""}. Click any piece to change it, type straight onto the big title and subtitle, and drag a piece&apos;s handles to move or resize it. The chat&apos;s movement plays on the real site.</p>
        </div>

        <div className="hst-split" aria-hidden />
        <div className="hst-panel" ref={panel}>
          <G lit={lit} g="look" title="Look and movement">
            <span className="lab">Chat wallpaper</span>
            <div className="hst-chips">{WALLPAPERS.map(([k, label]) => chip(c.wallpaper === k, label, () => setC({ wallpaper: k }), k))}</div>
            {c.wallpaper === "photo" && <div className="fl"><span className="lab">Your wallpaper picture</span><UploadField key={`wp${rev}`} name="wallPic" initial={c.wallPic} shape="wide" useBlob={useBlob} onChange={(u) => setC({ wallPic: u })} /><div className="hint">It sits under a soft veil in the theme&apos;s colour, so the bubbles stay readable.</div></div>}
            <span className="lab">Bubble shape</span>
            <div className="hst-chips">{BUBBLES.map(([k, label]) => chip(c.bubbles === k, label, () => setC({ bubbles: k }), k))}</div>
            <span className="lab">Your bubbles</span>
            <div className="hst-chips">{BUBBLE_COLORS.map(([k, label]) => chip(c.mine === k, label, () => setC({ mine: k }), k))}</div>
            <span className="lab">Visitors&apos; bubbles</span>
            <div className="hst-chips">{BUBBLE_COLORS.map(([k, label]) => chip(c.theirs === k, label, () => setC({ theirs: k }), k))}</div>
            <label className="switch"><input type="checkbox" checked={c.brandColors} onChange={(e) => setC({ brandColors: e.target.checked })} />Logos in each brand&apos;s own colour</label>
            <label className="switch"><input type="checkbox" checked={d.chatfx} onChange={(e) => change((x) => ({ ...x, chatfx: e.target.checked }))} />The chat comes alive</label>
            <div className="hint">Notes pop in one by one when someone scrolls to it, you &ldquo;type&rdquo; your greeting, your photo&apos;s ring turns, links slide in and bounce, visitors see their own typing bubble, a double-tap hearts a bubble, sending makes a little burst, and the wallpaper drifts. Colours follow every theme.</div>
            <label className="switch"><input type="checkbox" checked={d.plane} onChange={(e) => change((x) => ({ ...x, plane: e.target.checked }))} />Sending animation (message lifts into the chat, paper plane)</label>
          </G>

          <G lit={lit} g="face" title="Photo, name and availability">
            <UploadField key={`f${rev}`} name="face" initial={c.face} fallback={settings.avatarUrl ? <img src={settings.avatarUrl} alt="" /> : settings.initials} useBlob={useBlob} onChange={(u) => setC({ face: u })} />
            <div className="hint">The chat&apos;s own photo. Without one it borrows your hero photo.</div>
            <div className="f2">{txtC("name", "Name at the top", 60, settings.nickname || settings.fullName)}{txtC("sub", "Line under it", 120, settings.fullName)}</div>
            <span className="lab">Availability</span>
            <div className="hst-chips">{AVAILS.map(([k, label]) => chip(c.avail === k, <><i className={`cst-av av-${k}`} />{label}</>, () => setC({ avail: k, availText: "" }), k))}</div>
            {txtC("availText", "What it says", 80, AVAILS.find(([k]) => k === c.avail)![2], "Shows beside your name and in the chat's top bar.")}
            {txtC("replyTime", "Reply time", 80, "Usually replies within a day", "Empty hides it.")}
          </G>

          <G lit={lit} g="links" title={`Links (${d.socials.length})`}>
            <div className="cst-add">
              <input className="inp" value={paste} placeholder="Paste a link: instagram.com/you, wa.me/880…, you@mail.com" onChange={(e) => setPaste(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }} disabled={d.socials.length >= MAX_LINKS} />
              <button type="button" className="b-dark b-sm" onClick={addLink} disabled={d.socials.length >= MAX_LINKS}><i className="ti ti-plus" />Add</button>
            </div>
            <div className="hint">Paste any link, email or phone number: its logo, name and a line about it are found by themselves. Change any of them, upload your own logo, and use the arrows to reorder. Up to {MAX_LINKS}.</div>
            {d.socials.map((l, i) => (
              <LinkRow key={`${i}-${rev}`} l={l} i={i} n={d.socials.length} useBlob={useBlob}
                onChange={(nl) => setLinks(d.socials.map((x, j) => (j === i ? nl : x)), `link-${i}`)}
                onMove={(dir) => { const a = [...d.socials]; const j = i + dir; [a[i], a[j]] = [a[j], a[i]]; setLinks(a); setRev((r) => r + 1); }}
                onRemove={() => { setLinks(d.socials.filter((_, j) => j !== i)); setRev((r) => r + 1); }} />
            ))}
            {txtC("linksTitle", "Heading above the links", 60, "Other ways to reach me", "Empty hides the heading.")}
          </G>

          <G lit={lit} g="chat" title="The chat">
            <div className="fl"><label htmlFor="c-title">Chat title</label><input id="c-title" className="inp" maxLength={80} value={d.connectFormTitle} placeholder="Say hello 👋" onChange={(e) => change((x) => ({ ...x, connectFormTitle: e.target.value }), "title")} /></div>
            {txtC("headNote", "Line beside the title", 120, "🌍 The wall: approved notes, everyone can read them")}
            <div className="fl"><label htmlFor="c-greet">Your greeting, one bubble per line (up to {MAX_GREET})</label>
              <Lines id="c-greet" value={c.greet} onChange={(v) => setC({ greet: v.slice(0, MAX_GREET) }, "greet")} placeholder={`${d.connectFormTitle || "Say hello 👋"} Write anything below. I read every message.`} />
              <div className="hint">On the site you &ldquo;type&rdquo; each bubble with typing dots, one after another. Empty uses the chat title with an invitation.</div></div>
            <div className="fl"><label htmlFor="c-auto">Automatic reply after someone sends a message</label>
              <textarea id="c-auto" className="inp" rows={2} maxLength={300} value={c.autoReply} placeholder="Got it, {name}! 🙌 I'll read it soon." onChange={(e) => setC({ autoReply: e.target.value }, "autoReply")} />
              <div className="hint">{"{name}"} becomes their name. It&apos;s marked &ldquo;Automatic reply&rdquo; so nobody thinks you answered yourself.</div></div>
          </G>

          <G lit={lit} g="box" title="Message box">
            <div className="fl"><label htmlFor="c-quick">Quick starters, one per line (up to {MAX_QUICK})</label>
              <Lines id="c-quick" value={c.quick} onChange={(v) => setC({ quick: v.slice(0, MAX_QUICK) }, "quick")} />
              <div className="hint">Little buttons above the box. A tap writes that line in, ready to send or change.</div></div>
            <div className="f3">{txtC("namePh", "Name box says", 40, "Your name")}{txtC("emailPh", "Email box says", 60, "Email, if you'd like a reply")}{txtC("msgPh", "Message box says", 60, "What's on your mind?")}</div>
            <div className="f2">{txtC("wallLabel", "📌 button says", 20, "Wall")}{txtC("emojis", "Emojis in the 😊 tray", 200, "😀 😂 😍 👋 ❤️ 🔥", "Separate with spaces.")}</div>
          </G>

          <G lit={lit} g="wall" title="The Wall">
            <label className="switch"><input type="checkbox" checked={boardPv} onChange={(e) => setBoardPv(e.target.checked)} />Show the Wall open in the preview</label>
            <span className="lab">Button</span>
            <div className="hst-chips">{WALL_BTNS.map(([k, label]) => chip(c.wallBtn === k, label, () => setC({ wallBtn: k }), k))}</div>
            <span className="lab">Notice board</span>
            <div className="hst-chips">{BOARDS.map(([k, label]) => chip(c.board === k, label, () => { setC({ board: k }); setBoardPv(true); }, k))}</div>
            <label className="switch"><input type="checkbox" checked={c.boardReply} onChange={(e) => setC({ boardReply: e.target.checked })} />Your public reply shows on the note</label>
            <label className="switch"><input type="checkbox" checked={c.boardHearts} onChange={(e) => setC({ boardHearts: e.target.checked })} />Visitors can heart a note</label>
            <label className="switch"><input type="checkbox" checked={c.boardTesti} onChange={(e) => setC({ boardTesti: e.target.checked })} />Testimonials go on the board too</label>
            <label className="switch"><input type="checkbox" checked={c.wallInChat} onChange={(e) => setC({ wallInChat: e.target.checked })} />Approved notes also stay in the chat (as before)</label>
            <div className="hint">You decide what goes on the Wall: in your Inbox, point at a chat or a message and press 📌 to put it up or 🙈 to hide it. Visitors can only ask, by ticking 📌. The button shows how many there are. Turn the whole Wall off under Pieces in the window.</div>
          </G>

          <G lit={lit} g="replies" title="Replies">
            <div className="hint" style={{ marginTop: 0 }}>Everyone who writes gets a private chat with you. Reply from your <a href="/admin/inbox?f=chats">Inbox</a>: they see it in their chat here, and get a &ldquo;new reply&rdquo; badge when they come back (on the same phone or computer).</div>
            <label className="switch"><input type="checkbox" checked={c.seen} onChange={(e) => setC({ seen: e.target.checked })} />They see &ldquo;Seen&rdquo; when you&apos;ve read their message</label>
            <label className="switch"><input type="checkbox" checked={c.typing} onChange={(e) => setC({ typing: e.target.checked })} />They see you typing</label>
            <label className="switch"><input type="checkbox" checked={c.online} onChange={(e) => setC({ online: e.target.checked })} />You show &ldquo;Online now&rdquo; while your Inbox is open</label>
            <label className="switch"><input type="checkbox" checked={c.react} onChange={(e) => setC({ react: e.target.checked })} />React to their messages with an emoji</label>
            <label className="switch"><input type="checkbox" checked={c.badge} onChange={(e) => setC({ badge: e.target.checked })} />&ldquo;New reply&rdquo; badge when they come back</label>
            <label className="switch"><input type="checkbox" checked={c.chatLink} onChange={(e) => setC({ chatLink: e.target.checked })} />A link to carry the chat on to another phone</label>
            <div className="fl"><label htmlFor="c-saved">Saved replies, one per line (up to {MAX_SAVED})</label>
              <Lines id="c-saved" value={c.saved} onChange={(v) => setC({ saved: v.slice(0, MAX_SAVED) }, "saved")} />
              <div className="hint">Tap one under the reply box in your Inbox to use it.</div></div>
            <div className="hint">Email replies need a free email-sending account first; say when you want them.</div>
          </G>

          <G lit={lit} g="pins" title="Pinned testimonials and the wall note">
            <div className="fl"><label htmlFor="c-note">Wall note (shown when there are no testimonials)</label>
              <textarea id="c-note" className="inp" rows={3} maxLength={300} value={c.wallNote} onChange={(e) => setC({ wallNote: e.target.value }, "wallNote")} /></div>
            <div className="hint">{pins.length ? `${pins.length} testimonial${pins.length === 1 ? " is" : "s are"} pinned.` : "No testimonials yet."} Add or change them in the Entries box below the editor: the quote goes in the story and the person&apos;s name in the subtitle. Messages you approve in your Inbox become the chat&apos;s history.</div>
          </G>

          <G lit={lit} g="pieces" title="Pieces in the window">
            <div className="stu-switches">{CONNECT_PIECES.map(([k, label]) => (
              <label key={k} className="switch"><input type="checkbox" checked={!c.hide[k]} onChange={(e) => { const hide = { ...c.hide }; if (e.target.checked) delete hide[k as ConnectPiece]; else hide[k as ConnectPiece] = true; setC({ hide }); }} />{label}</label>
            ))}</div>
            <div className="hint">Off hides it from the window only; nothing is deleted.</div>
          </G>

          <G lit={lit} g="header" title="Section header and menu" startOpen={false}>
            <div className="f3">{txtS("code", "Code tag", 8)}{txtS("nav_label", "Menu label", 40)}{txtS("nav_emoji", "Menu emoji", 16)}</div>
            <div className="f2">{txtS("eyebrow", "Small label", 80)}{txtS("eyebrow_emoji", "Small label emoji", 16)}</div>
            {txtS("title", "Big title", 160)}
            <div className="fl"><label htmlFor="s-sub">Subtitle</label><textarea id="s-sub" className="inp" rows={2} maxLength={400} value={d.section.subtitle} onChange={(e) => setSec({ subtitle: e.target.value }, "s-subtitle")} /></div>
          </G>

          <G lit={lit} g="boxes" title="Moved and resized pieces" startOpen={false}>
            <p className="hint" style={{ margin: 0 }}>{Object.keys(c.parts ?? {}).length ? `${Object.keys(c.parts ?? {}).length} piece(s) have their own size or place.` : "Nothing moved or resized yet. Drag a piece's handles on the preview."}</p>
            <div><button type="button" className="b-out b-sm" disabled={!Object.keys(c.parts ?? {}).length} onClick={() => setC({ parts: undefined })}><i className="ti ti-restore" />Put every piece back</button></div>
          </G>
          <p className="hint">Messages people send land in your <a href="/admin/inbox">Inbox</a>. {owner ? `They see them as a chat with ${owner}.` : ""}</p>
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
