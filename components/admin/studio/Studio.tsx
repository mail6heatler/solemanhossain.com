"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Item, Section } from "@/lib/data";
import { LIVE_THEMES, MOODS, SKIN_LABELS, type Skin } from "@/lib/settings";
import { noteLookOf } from "@/lib/cardLook";
import { LIMITS, SIZE_PRESETS, cleanStyle, isCustom, lookOf, mergeStyles } from "@/lib/contentStyle";
import { FV_PARTS, fvBoxes, fvLook, fvPlace, type FvBox, type FvPart } from "@/lib/fullView";
import { pinnedFirst, toSave, type StudioData, type StudioDraft, type StudioSection } from "@/lib/studio";
import type { PartSize } from "@/lib/partSize";
import type { PartAttrs } from "@/components/site/cardParts";
import { saveStudio, studioComment, studioReset } from "@/app/actions";
import NoteCard from "@/components/site/NoteCard";
import EntryFull, { fvPresent } from "@/components/site/EntryFull";
import { StillReacts, Surface, type Typing } from "./Surface";
import { CARD_KEYS, CardEditor, FullEditor, SEC_NAMES, SectionEditor, TYPED, partName, type Ed } from "./Editors";

type Scope = "card" | "fv" | "sec";
type Pop = { scope: Scope; key: string; x: number; y: number };
type Hist = { list: StudioDraft[]; at: number; saved: StudioDraft; tag: string; time: number };
type Ask = { title: string; message: string; yes: string; run: () => void };
type Face = "sec" | "card" | "fv";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);
const FV_WIDTH = 1040;
/** Where each thing on the older pages is now. Shown from the ? button. */
const WHERE: [string, string][] = [
  ["Order", "Drag a card in the list, or use its arrows. Pinned cards stay first."],
  ["Entries", "The list of cards itself. Click one to edit it; its ⋯ has duplicate, hide, pin, move and delete."],
  ["Title & subsection", "Click the title or the subsection on the card. Titles and other short words can be typed straight onto it."],
  ["Story, photos, videos & PDFs", "Click the text or the picture on the card."],
  ["Details", "Click each one on the card: date, place, mood, status, tags, buttons. Its label uses the card's own word, like Version or Rarity."],
  ["Card look", "Click the subsection on the card, then Looks like."],
  ["Size & look", "Drag the card's corner, or press Size & look. The section's own is under Section settings."],
  ["Reactions & comments", "Click the emoji bar on the card: the 8 switches, the counts, who reacted, and every comment with reply, pin, hide and delete."],
  ["Section settings", "Click any part of the section's header, or press Section settings. Belt size and movement are there too."],
  ["Save", "The bar at the bottom appears when something changed: Undo, Redo, Discard, Save. Ctrl+S saves."],
  ["Delete", "A card's ⋯, then Delete. It waits in the bin until you save. Deleting the section is at the end of Section settings."],
  ["Full view", "New. Each card's full view is beside it (or under Full view in Spotlight): layout, background, opening, pull quote, and parts you can drag anywhere."],
];

/**
 * The live editor for a section laid out as Notes (G1): one page for its header and settings, every card, their order, and each card's full view.
 * Two views of the same thing: Workbench shows the cards, the section, the card and its full view side by side; Spotlight puts one of them big on a stage.
 * The previews are the site's own components (NoteCard, EntryFull), so what's edited is what visitors get. Nothing is stored until Save, which writes
 * everything at once (`saveStudio`); comments and resets are the exception and happen right away.
 */
export default function Studio({ data: first, startCard }: { data: StudioData; startCard?: number }) {
  const router = useRouter();
  const [data, setData] = useState(first);
  const [live, setLive] = useState(first.live);
  const [hist, setHist] = useState<Hist>(() => ({ list: [first.draft], at: 0, saved: first.draft, tag: "", time: 0 }));
  const draft = hist.list[hist.at];
  const dirty = draft !== hist.saved;
  const [sel, setSel] = useState<number | null>(() => (startCard && first.draft.items.some((i) => i.id === startCard) ? startCard : first.draft.items[0]?.id ?? null));
  const [view, setView] = useState<"bench" | "spot">("bench");
  const [face, setFace] = useState<Face>("card");
  const [labels, setLabels] = useState(true);
  const [phone, setPhone] = useState(false);
  const [skin, setSkin] = useState<string>("");
  const [pop, setPop] = useState<Pop | null>(null);
  const [typing, setTyping] = useState<{ scope: Scope; key: string; n: number } | null>(null);
  const [menu, setMenu] = useState<{ id: number; x: number; y: number } | null>(null);
  const [adding, setAdding] = useState<{ x: number; y: number } | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [dialog, setDialog] = useState<"" | "bin" | "where">("");
  const [toast, setToast] = useState<{ text: string; n: number; bad?: boolean; undo?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, startBusy] = useTransition();
  const [rev, setRev] = useState(0);
  const [played, setPlayed] = useState(0);
  const [fvWidth, setFvWidth] = useState(FV_WIDTH);
  const nextId = useRef(-1);
  const dragFrom = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const fvStage = useRef<HTMLDivElement>(null);

  const item = draft.items.find((i) => i.id === sel) ?? null;
  const card = item ? noteLookOf(item.category, item.card.look) : "plain";
  const say = useCallback((text: string, opts: { bad?: boolean; undo?: boolean } = {}) => setToast((t) => ({ text, n: (t?.n ?? 0) + 1, ...opts })), []);

  // ---------- changes, with undo ----------
  const change = useCallback((fn: (d: StudioDraft) => StudioDraft, tag = "") => {
    setHist((h) => {
      const cur = h.list[h.at], next = fn(cur);
      if (next === cur) return h;
      const now = Date.now();
      // typing in one field is one step to undo
      if (tag && tag === h.tag && now - h.time < 1500 && h.at > 0 && cur !== h.saved) return { ...h, list: [...h.list.slice(0, h.at), next], time: now };
      const list = [...h.list.slice(0, h.at + 1), next].slice(-150);
      return { ...h, list, at: list.length - 1, tag, time: now };
    });
  }, []);
  const undo = useCallback(() => { setTyping(null); setHist((h) => (h.at > 0 ? { ...h, at: h.at - 1, tag: "" } : h)); setRev((r) => r + 1); }, []);
  const redo = useCallback(() => { setTyping(null); setHist((h) => (h.at < h.list.length - 1 ? { ...h, at: h.at + 1, tag: "" } : h)); setRev((r) => r + 1); }, []);
  const setItemOf = useCallback((id: number, patch: Partial<Item>, tag?: string) => change((d) => {
    const cur = d.items.find((i) => i.id === id);
    if (!cur || (Object.keys(patch) as (keyof Item)[]).every((k) => same(cur[k], patch[k]))) return d;
    const items = d.items.map((i) => (i.id === id ? { ...i, ...patch } : i));
    return { ...d, items: "pinned" in patch ? pinnedFirst(items) : items };
  }, tag ? `${id}:${tag}` : ""), [change]);
  const setItem = useCallback((patch: Partial<Item>, tag?: string) => { if (sel !== null) setItemOf(sel, patch, tag); }, [sel, setItemOf]);
  const setSection = useCallback((patch: Partial<StudioSection>, tag?: string) => change((d) => ((Object.keys(patch) as (keyof StudioSection)[]).every((k) => same(d.section[k], patch[k])) ? d : { ...d, section: { ...d.section, ...patch } }), tag), [change]);
  const steps = (() => { const n = hist.list.indexOf(hist.saved); return n < 0 ? 0 : Math.abs(hist.at - n); })();

  // ---------- what the previews draw from ----------
  const settings = useMemo(() => ({ ...data.settings, ribbonSize: draft.ribbonSize, effects: { ...data.settings.effects, notefx: draft.notefx, fullfx: draft.fullfx } }), [data.settings, draft.ribbonSize, draft.notefx, draft.fullfx]);
  const section = useMemo(() => ({ ...draft.section, sort: 0, boxes: {} }) as Section, [draft.section]);
  const owner = settings.nickname.trim() || settings.fullName.trim().split(/\s+/)[0] || "";
  // eslint-disable-next-line @next/next/no-img-element
  const faceIcon = settings.avatarUrl ? <img src={settings.avatarUrl} alt="" loading="lazy" /> : (settings.initials || owner.slice(0, 1));
  const lookFor = (it: Item) => lookOf(mergeStyles(settings.contentStyle, draft.section.style, it.style));
  const factNo = (it: Item) => Math.max(1, draft.items.filter((x) => (x.visible || x.id === it.id) && x.category === it.category).findIndex((x) => x.id === it.id) + 1);
  const siteMood = MOODS[settings.mood];
  const siteStyle = (siteMood ? { "--m": siteMood.color, "--m-deep": siteMood.deep } : {}) as React.CSSProperties;
  const siteClass = `site${draft.notefx ? " fx-notefx" : ""}${draft.fullfx ? " fx-fullfx" : ""}${settings.effects.themefx ? " fx-themefx" : ""}`;
  const bar = (it: Item, compact: boolean) => (settings.effects.reactions
    ? (a: { bar: PartAttrs; talk: PartAttrs }) => <StillReacts counts={live.reactions[it.id] ?? {}} talk={it.talk} compact={compact} comments={live.comments[it.id] ?? []} owner={owner} attrs={a} />
    : undefined);
  const cardOf = (it: Item) => <NoteCard it={it} l={lookFor(it)} index={draft.items.indexOf(it)} factNo={factNo(it)} href="#" owner={owner} face={faceIcon} edit foot={bar(it, true)} />;
  const cardSize = (it: Item) => { const s = mergeStyles(settings.contentStyle, draft.section.style, it.style); const p = s.size && s.size !== "custom" ? SIZE_PRESETS[s.size] : null; return { w: p?.w ?? s.w ?? 340, h: p?.h ?? s.h ?? 440 }; };
  const blocks: FvBox[] = useMemo(() => (item ? fvBoxes(item.fv, fvLook(item.fv, card, item.media.some((m) => m.type !== "audio")).layout, fvPresent(item, settings.effects.reactions)) : []), [item, card, settings.effects.reactions]);
  const fvZoom = phone ? 1 : Math.min(1, fvWidth / FV_WIDTH);

  // ---------- the page around it ----------
  useEffect(() => { try { const v = localStorage.getItem("lc_stu_view"); if (v === "spot") setView("spot"); if (localStorage.getItem("lc_stu_labels") === "0") setLabels(false); } catch {} }, []);
  // previews wear one of the site's themes while this page is open: the default one to start with
  useEffect(() => {
    const d = data.settings.defaultTheme as string;
    const h = new Date().getHours();
    setSkin((LIVE_THEMES as string[]).includes(d) ? d : d === "auto" ? (h >= 18 || h < 6 ? "night" : "day") : "playful");
  }, [data.settings.defaultTheme]);
  useEffect(() => {
    if (!skin) return;
    document.documentElement.setAttribute("data-skin", skin);
    return () => document.documentElement.removeAttribute("data-skin");
  }, [skin]);
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);
  useLayoutEffect(() => {
    const el = fvStage.current;
    if (!el) return;
    const fit = () => setFvWidth(Math.max(320, el.clientWidth - 28));
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(el);
    return () => watch.disconnect();
  }, [view, face, sel === null]);

  const save = useCallback(async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setTyping(null);
    const stay = draft.items.filter((i) => i.section_id === draft.section.id), at = stay.findIndex((i) => i.id === sel);
    const res = await saveStudio(toSave(draft)).catch(() => null);
    setSaving(false);
    if (!res || !res.ok) { say(res?.error ?? "That didn't save. Check your connection and try again.", { bad: true }); return; }
    if (res.data.draft.section.layout !== "notes") { window.location.reload(); return; } // another layout: its own page
    setData(res.data);
    setLive(res.data.live);
    setHist({ list: [res.data.draft], at: 0, saved: res.data.draft, tag: "", time: 0 });
    setSel(res.data.draft.items[at]?.id ?? res.data.draft.items[0]?.id ?? null);
    setRev((r) => r + 1);
    setPop(null);
    say("Saved. It's live on your site.");
    router.refresh();
  }, [dirty, saving, draft, sel, say, router]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      const field = (e.target as HTMLElement).closest?.("input, textarea, select");
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === "s") { e.preventDefault(); save(); }
      else if ((e.ctrlKey || e.metaKey) && !field && k === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if ((e.ctrlKey || e.metaKey) && !field && k === "y") { e.preventDefault(); redo(); }
      else if (e.key === "Escape") { setMenu(null); setAdding(null); setPop(null); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [save, undo, redo]);

  // ---------- cards: pick, add, order, hide, delete ----------
  const select = (id: number) => { setSel(id); setTyping(null); setMenu(null); if (pop && pop.scope !== "sec") setPop(null); if (view === "spot" && face === "sec") setFace("card"); };
  const move = (from: number, to: number) => change((d) => {
    const pins = d.items.filter((i) => i.pinned).length, lo = d.items[from].pinned ? 0 : pins, hi = d.items[from].pinned ? pins - 1 : d.items.length - 1, t = clamp(to, lo, hi);
    if (t === from) return d;
    const items = [...d.items];
    const [r] = items.splice(from, 1);
    items.splice(t, 0, r);
    return { ...d, items };
  });
  const insert = (it: Item) => change((d) => {
    const items = [...d.items], pins = items.filter((x) => x.pinned).length;
    items.splice(Math.max(pins, items.findIndex((x) => x.id === sel) + 1), 0, it);
    return { ...d, items };
  });
  const add = (type: "post" | "poll", category: string) => {
    const id = nextId.current--;
    insert({ ...data.blank, id, type, category, section_id: draft.section.id, title: type === "poll" ? "New poll" : "New card", poll_options: type === "poll" ? ["Option A", "Option B"] : [] });
    setSel(id);
    setAdding(null);
    setPop(null);
    if (view === "spot") setFace("card");
    setTimeout(() => setTyping({ scope: "card", key: "title", n: 0 }), 80);
    say(`A new ${type === "poll" ? "poll" : "card"}${category ? ` in “${category}”` : ""}. Type its title.`);
  };
  const duplicate = (it: Item) => {
    const id = nextId.current--;
    insert({ ...it, id, title: `${it.title} (copy)`, pinned: false, created_at: new Date().toISOString() });
    setSel(id);
    setMenu(null);
    say("Duplicated. The copy goes on the site when you save.");
  };
  const remove = (it: Item) => {
    setMenu(null);
    setAsk({ title: `Delete “${it.title || "Untitled"}”?`, message: it.id > 0 ? "It goes to the bin. You can bring it back until you press Save; after that it's gone for good, with its reactions and comments." : "It was never saved, so it just goes. Undo brings it back.", yes: "Yes, delete", run: () => {
      change((d) => ({ ...d, items: d.items.filter((x) => x.id !== it.id), deleted: it.id > 0 ? [...d.deleted, it] : d.deleted }));
      if (sel === it.id) { const i = draft.items.findIndex((x) => x.id === it.id); setSel((draft.items[i + 1] ?? draft.items[i - 1])?.id ?? null); }
      setPop(null);
      say(it.id > 0 ? "Moved to the bin." : "Removed.", { undo: true });
    } });
  };
  const restore = (it: Item) => { change((d) => ({ ...d, deleted: d.deleted.filter((x) => x.id !== it.id), items: pinnedFirst([...d.items, it]) })); setSel(it.id); say("Back again, at the end of the row."); };
  const discard = () => setAsk({ title: "Discard your changes?", message: "Everything since the last save goes back to how it was, cards in the bin included. Pictures you uploaded stay in storage but come off their cards.", yes: "Yes, discard", run: () => {
    setHist((h) => ({ list: [h.saved], at: 0, saved: h.saved, tag: "", time: 0 }));
    setTyping(null); setPop(null); setRev((r) => r + 1);
    if (!hist.saved.items.some((i) => i.id === sel)) setSel(hist.saved.items[0]?.id ?? null);
    say("Back to the last save.");
  } });

  // ---------- things that happen right away ----------
  const comment = (id: number, op: "reply" | "pin" | "hide" | "delete", reply = "") => { if (!item) return; const itemId = item.id; startBusy(async () => {
    const list = await studioComment(id, op, reply).catch(() => null);
    if (!list) { say("That didn't work. Try again.", { bad: true }); return; }
    setLive((l) => ({ ...l, comments: { ...l.comments, [itemId]: list } }));
    say(op === "reply" ? "Reply saved." : op === "delete" ? "Comment deleted." : "Done.");
  }); };
  const reset = (kind: "reactions" | "votes") => { if (!item) return; const it = item; startBusy(async () => {
    const r = await studioReset(kind, it.id, it.poll_options.length).catch(() => null);
    if (!r) { say("That didn't work. Try again.", { bad: true }); return; }
    setLive((l) => ({ ...l, reactions: { ...l.reactions, [it.id]: r.reactions }, people: { ...l.people, [it.id]: r.people }, votes: { ...l.votes, [it.id]: r.votes } }));
    say(kind === "votes" ? "Votes cleared." : "Reactions cleared.");
  }); };

  // ---------- pointing at the previews ----------
  const openPop = (scope: Scope, key: string, at?: DOMRect | null) => {
    setTyping(null);
    setMenu(null);
    const w = 420, vw = window.innerWidth, vh = window.innerHeight;
    let x = vw - w - 24, y = 120;
    if (at) { x = at.right + 16; if (x + w > vw - 12) x = at.left - w - 16; if (x < 12) x = clamp(at.left, 12, vw - w - 12); y = clamp(at.top - 20, 76, Math.max(76, vh - 360)); }
    else if (pop) { x = pop.x; y = pop.y; }
    setPop({ scope, key, x, y });
  };
  const typedValue = (scope: Scope, key: string): string | undefined => {
    if (scope === "sec") return key === "title" ? draft.section.title : key === "subtitle" ? draft.section.subtitle : key === "eyebrow" ? draft.section.eyebrow : undefined;
    if (!item) return undefined;
    return key === "title" ? item.title : key === "subtitle" ? item.subtitle : key === "date" ? item.date_label : key === "place" ? item.location : key === "status" ? item.status : key === "quote" ? item.fv.quote : undefined;
  };
  const setTyped = (scope: Scope, key: string, v: string) => {
    if (scope === "sec") setSection({ [key]: v } as Partial<StudioSection>, `s-${key}`);
    else if (key === "quote") { if (item) setItem({ fv: { ...item.fv, quote: v } }, "quote"); }
    else setItem({ [key === "date" ? "date_label" : key === "place" ? "location" : key]: v } as Partial<Item>, key);
  };
  const onPart = (scope: Scope) => (key: string, at: DOMRect, shown: string, n: number) => {
    const value = typedValue(scope, key);
    // short words are typed straight onto the preview, when what it shows is exactly what's stored
    if (TYPED.includes(key) && value !== undefined && shown === value.trim()) { setPop(null); setTyping({ scope, key, n }); return; }
    openPop(scope, key, at);
  };
  const typingFor = (scope: Scope): Typing | null => (typing && typing.scope === scope ? { key: typing.key, n: typing.n, value: typedValue(scope, typing.key) ?? "" } : null);
  const activeFor = (scope: Scope) => (typing?.scope === scope ? typing.key : pop && (pop.scope === scope || (scope !== "sec" && pop.scope !== "sec")) ? pop.key : undefined);
  const openFull = () => { if (view === "spot") setFace("fv"); else fvStage.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); setPlayed((n) => n + 1); };
  const play = () => { if (!draft.fullfx) say("Movement in full views is switched off. It's under Section settings, Movement."); setPlayed((n) => n + 1); };
  /** A full view part's new place and size. Parts it would cover move down out of its way. `tag` joins steps into one Undo (a slider); a drag is one step of its own. */
  const moveBlock = (part: string, box: FvBox, tag = `at-${part}`) => {
    if (sel === null) return;
    const id = sel, shown = blocks;
    change((d) => ({ ...d, items: d.items.map((it) => {
      if (it.id !== id) return it;
      const placed = fvPlace(shown.map((b) => (b.part === part ? box : b)), box);
      const at = { ...it.fv.at };
      for (const b of placed) at[b.part] = [b.x, b.y, b.w, b.h];
      const zoom = { ...it.fv.zoom };
      if (box.z === 100) delete zoom[part as FvPart]; else zoom[part as FvPart] = box.z;
      return { ...it, fv: { ...it.fv, at, zoom } };
    }) }), tag);
  };
  /** One box inside the full view at the size and place it was dragged to; undefined puts it back. */
  const setFvPartSize = (key: string, size: PartSize | undefined, stroke?: number) => {
    if (sel === null) return;
    const id = sel;
    change((d) => ({ ...d, items: d.items.map((it) => {
      if (it.id !== id) return it;
      const parts = { ...it.fv.parts };
      if (size) parts[key] = size; else delete parts[key];
      return same(it.fv.parts?.[key], size) ? it : { ...it, fv: { ...it.fv, parts } };
    }) }), `fps-${id}-${key}${stroke ? `-${stroke}` : ""}`);
  };
  /** One part of the card at the size it was dragged to; undefined puts it back. Typing-like: a whole drag is one step to undo. */
  const setPartSize = (key: string, size: PartSize | undefined, stroke?: number) => {
    if (sel === null) return;
    const id = sel;
    change((d) => ({ ...d, items: d.items.map((it) => {
      if (it.id !== id) return it;
      const parts = { ...it.card.parts };
      if (size) parts[key] = size; else delete parts[key];
      return same(it.card.parts?.[key], size) ? it : { ...it, card: { ...it.card, parts } };
    }) }), `ps-${id}-${key}${stroke ? `-${stroke}` : ""}`);
  };
  const resize = (e: React.PointerEvent) => {
    if (!item) return;
    e.preventDefault();
    const start = cardSize(item), x0 = e.clientX, y0 = e.clientY, id = item.id, style = item.style;
    const moveTo = (m: PointerEvent) => setItemOf(id, { style: cleanStyle({ ...style, size: "custom", w: clamp(Math.round(start.w + m.clientX - x0), LIMITS.w[0], LIMITS.w[1]), h: clamp(Math.round(start.h + m.clientY - y0), LIMITS.h[0], LIMITS.h[1]) }) }, "corner");
    const up = () => { window.removeEventListener("pointermove", moveTo); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", moveTo);
    window.addEventListener("pointerup", up);
  };

  const ed: Ed = { data, draft, live, item, card, rev, setItem, setSection, setDraft: change, ask: setAsk, comment, reset, remove, duplicate, play, busy, open: (scope, key) => openPop(scope, key), blocks, setBlock: moveBlock, setPartSize, setFvPartSize };

  // ---------- pieces ----------
  const cats = Array.from(new Set([...draft.section.categories, ...draft.items.map((i) => i.category)].filter(Boolean)));
  const shownItems = draft.items.filter((i) => i.visible && i.section_id === draft.section.id);
  const fx = settings.effects;
  const emojis = Array.from(draft.section.emojis.trim().split(/\s+/).filter(Boolean)).slice(0, 6);
  const ribbonText = `${draft.section.nav_emoji ? `${draft.section.nav_emoji} ` : ""}${draft.section.title}`;

  const secSurface = (
    <Surface className="stu-secsurf" zoom={view === "bench" ? 0.8 : 1} labels={labels} name={(k) => SEC_NAMES[k] ?? k} active={activeFor("sec")} onPart={onPart("sec")}
      typing={typingFor("sec")} onType={(v) => typing && setTyped("sec", typing.key, v)} onTypeEnd={() => setTyping(null)}>
      <div className={`${siteClass} stu-site stu-page${draft.section.visible ? "" : " off"}`} style={siteStyle}>
        {fx.ribbons && draft.section.ribbon && (
          <div className="ribbon first" data-part="ribbon" style={draft.ribbonSize === 100 ? undefined : ({ "--rib": draft.ribbonSize / 100 } as React.CSSProperties)}>
            <div className="ribbon-track">{Array.from({ length: 20 }, (_, k) => <span key={k}>{ribbonText}</span>)}</div>
          </div>
        )}
        <section className={`chap${data.index % 2 === 1 ? " alt" : ""}`} data-layout="notes">
          {fx.ghost && <span className="ghost" aria-hidden>{draft.section.code || "01"}</span>}
          {fx.emojis && emojis.length > 0 && <div className="stu-emos" data-part="emojis">{emojis.map((e, i) => <span key={i} className="float-emo" style={{ top: `${[8, 52, 26, 64, 16, 44][i]}%`, left: `${[8, 30, 54, 70, 84, 46][i]}%` }}>{e}</span>)}</div>}
          <div className="chap-inner">
            <div className="eyebrow">
              {draft.section.code && <span className="tag" data-part="code">{draft.section.code}</span>}
              {draft.section.eyebrow_emoji && <span className="emo" data-part="eyebrow_emoji">{draft.section.eyebrow_emoji}</span>} <span className="eb-t" data-part="eyebrow">{draft.section.eyebrow}</span>
            </div>
            <div className="chap-head">
              <div>
                <h2 className="stitle" data-part="title">{draft.section.title}</h2>
                {draft.section.subtitle && <p className="ssub" data-part="subtitle">{draft.section.subtitle}</p>}
              </div>
              {shownItems.length > draft.section.home_limit && <span className="see-all" data-part="home_limit">See all {shownItems.length} <i className="ti ti-arrow-right" /></span>}
            </div>
            {shownItems.length === 0 && <div className="empty" data-part="empty_text"><i className="ti ti-pencil" />{!draft.section.empty_text || /dashboard/i.test(draft.section.empty_text) ? "Coming soon." : draft.section.empty_text}</div>}
          </div>
        </section>
      </div>
    </Surface>
  );
  const secMore = (
    <div className="stu-chips">
      <span>Also in this section:</span>
      {["nav_label", "slug", "categories", "home_limit", "empty_text", "visible", "ribbon", "motion", "look", "layout", "danger"].map((k) => <button key={k} type="button" className={pop?.scope === "sec" && pop.key === k ? "on" : ""} onClick={(e) => openPop("sec", k, e.currentTarget.getBoundingClientRect())}>{SEC_NAMES[k]}</button>)}
    </div>
  );
  const cardSurface = item && (
    <div className="stu-cardbox">
      <Surface labels={labels} name={(k) => partName(k, card)} active={activeFor("card")} onPart={onPart("card")} onOpen={openFull} sizes={item.card.parts ?? {}} onSize={setPartSize}
        typing={typingFor("card")} onType={(v) => typing && setTyped("card", typing.key, v)} onTypeEnd={() => setTyping(null)}>
        <div className={`${siteClass} stu-site stu-one${item.visible ? "" : " off"}`} style={siteStyle}>{cardOf(item)}</div>
      </Surface>
      <button type="button" className="stu-corner" title="Drag to resize this card" aria-label="Resize this card" onPointerDown={resize} />
    </div>
  );
  const missing = item ? ([["subtitle", item.subtitle], ["body", item.body], ["pic", item.media.length ? "x" : ""], ["date", item.date_label], ["place", item.location], ["mood", item.mood], ["status", item.status], ["tags", item.tags.length ? "x" : ""], ["links", item.links.length ? "x" : ""]] as [string, string][]).filter(([, v]) => !v).map(([k]) => k) : [];
  const cardMore = item && (
    <div className="stu-chips">
      {missing.length > 0 && <span>Not on this card yet:</span>}
      {missing.map((k) => <button key={k} type="button" onClick={(e) => openPop("card", k, e.currentTarget.getBoundingClientRect())}>＋ {partName(k, card)}</button>)}
      {item.type === "poll" && <button type="button" onClick={(e) => openPop("card", "poll", e.currentTarget.getBoundingClientRect())}>Poll options</button>}
    </div>
  );
  const fvSurface = item && (
    <Surface key={`fv${phone ? "p" : "d"}`} className="stu-fvsurf" zoom={fvZoom} width={phone ? Math.min(390, fvWidth) : Math.round(FV_WIDTH * fvZoom)} labels={labels} name={(k) => partName(k, card)} active={activeFor("fv")} onPart={onPart("fv")} sizes={item.fv.parts ?? {}} onSize={setFvPartSize}
      typing={typingFor("fv")} onType={(v) => typing && setTyped("fv", typing.key, v)} onTypeEnd={() => setTyping(null)}
      blocks={phone ? undefined : blocks} blockName={(p) => FV_PARTS.find(([k]) => k === p)?.[1] ?? p} onBlock={(p, b) => moveBlock(p, b, `drag-${Date.now()}`)} onBlockPick={(p, at) => openPop("fv", `fvb:${p}`, at)}>
      <div key={played} className={`${siteClass} stu-site stu-fvpage`} style={{ ...siteStyle, width: phone ? Math.min(390, fvWidth) : FV_WIDTH }}>
        <EntryFull item={item} section={section} settings={settings} factNo={factNo(item)} edit foot={bar(item, false)} />
      </div>
    </Surface>
  );
  const fvTools = item && (
    <div className="btns">
      <button type="button" className="b-out b-sm" onClick={(e) => openPop("fv", "fv", e.currentTarget.getBoundingClientRect())}><i className="ti ti-layout" />Layout &amp; options</button>
      <button type="button" className="b-out b-sm" onClick={play}><i className="ti ti-player-play" />Play opening</button>
      <button type="button" className={`b-out b-sm${phone ? " on" : ""}`} aria-pressed={phone} onClick={() => setPhone((p) => !p)}><i className={`ti ti-${phone ? "device-desktop" : "device-mobile"}`} />{phone ? "Computer" : "Phone"}</button>
    </div>
  );
  const cardTools = item && (
    <div className="btns">
      <button type="button" className="b-out b-sm" onClick={(e) => openPop("card", "size", e.currentTarget.getBoundingClientRect())}><i className="ti ti-ruler-2" />Size &amp; look{isCustom(item.style) ? " •" : ""}</button>
      <button type="button" className="b-out b-sm" onClick={(e) => openPop("card", "reacts", e.currentTarget.getBoundingClientRect())}><i className="ti ti-mood-smile" />Reactions</button>
      <button type="button" className="b-out b-sm" onClick={() => setItem({ visible: !item.visible })}><i className={`ti ti-${item.visible ? "eye-off" : "eye"}`} />{item.visible ? "Hide" : "Show"}</button>
      <button type="button" className="adm-iconbtn" aria-label="More for this card" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMenu({ id: item.id, x: r.left, y: r.bottom + 6 }); }}><i className="ti ti-dots" /></button>
    </div>
  );
  const list = (row: boolean) => (
    <div className={`stu-cards${row ? " row" : ""}`}>
      {draft.items.map((it, i) => {
        const size = cardSize(it), pins = draft.items.filter((x) => x.pinned).length;
        const first = i === (it.pinned ? 0 : pins), last = i === (it.pinned ? pins - 1 : draft.items.length - 1);
        return (
          <div key={it.id} className={`stu-card${it.id === sel ? " on" : ""}${it.visible ? "" : " off"}${over === i ? " over" : ""}`} draggable role="button" tabIndex={0} aria-pressed={it.id === sel}
            onClick={() => select(it.id)} onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) select(it.id); }}
            onDragStart={(e) => { dragFrom.current = i; e.dataTransfer.effectAllowed = "move"; }} onDragOver={(e) => { e.preventDefault(); setOver(i); }} onDragLeave={() => setOver((o) => (o === i ? null : o))}
            onDrop={(e) => { e.preventDefault(); setOver(null); if (dragFrom.current !== null) move(dragFrom.current, i); dragFrom.current = null; }} onDragEnd={() => { dragFrom.current = null; setOver(null); }}>
            <div className="stu-thumb" aria-hidden>{draft.items.length <= 24 ? <div className={`${siteClass} stu-site`} style={{ ...siteStyle, zoom: 58 / size.w }}>{cardOf(it)}</div> : <i className="ti ti-note" />}</div>
            <div className="stu-meta">
              <b>{it.title || "Untitled"}</b>
              <small>{it.category || "No subsection"}</small>
              <span>
                {!it.visible && <em className="h">Hidden</em>}{it.pinned && <em>Pinned</em>}{it.id < 0 && <em className="n">New</em>}{it.type === "poll" && <em>Poll</em>}
                {it.section_id !== draft.section.id && <em className="n">Moves to {data.sections.find((s) => s.id === it.section_id)?.code || "another section"}</em>}
              </span>
            </div>
            <div className="stu-tools" onClick={(e) => e.stopPropagation()}>
              <i className="ti ti-grip-vertical" title="Drag to reorder" aria-hidden />
              <button type="button" disabled={first} aria-label={`Move ${it.title} ${row ? "left" : "up"}`} onClick={() => move(i, i - 1)}><i className={`ti ti-arrow-${row ? "left" : "up"}`} /></button>
              <button type="button" disabled={last} aria-label={`Move ${it.title} ${row ? "right" : "down"}`} onClick={() => move(i, i + 1)}><i className={`ti ti-arrow-${row ? "right" : "down"}`} /></button>
              <button type="button" aria-label={it.visible ? `Hide ${it.title}` : `Show ${it.title}`} title={it.visible ? "Hide from visitors" : "Show to visitors"} onClick={() => setItemOf(it.id, { visible: !it.visible })}><i className={`ti ti-${it.visible ? "eye" : "eye-off"}`} /></button>
              <button type="button" aria-label={`More for ${it.title}`} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMenu({ id: it.id, x: r.left, y: r.bottom + 6 }); }}><i className="ti ti-dots" /></button>
            </div>
          </div>
        );
      })}
      <button type="button" className="stu-add" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setAdding({ x: r.left, y: Math.min(r.bottom + 6, window.innerHeight - 260) }); }}><i className="ti ti-plus" />Add card</button>
    </div>
  );
  const none = <div className="stu-none"><i className="ti ti-cards" /><b>No cards yet</b><span>Press Add card to make the first one.</span></div>;
  const menuItem = menu ? draft.items.find((i) => i.id === menu.id) : null;
  const popTitle = pop ? (pop.scope === "sec" ? "Section settings" : pop.key === "fv" ? "Full view options" : pop.key.startsWith("fvb:") ? `Full view · ${partName(pop.key, card)}` : partName(pop.key, card)) : "";

  return (
    <div className={`stu${labels ? "" : " plain"}`} key={draft.section.id}>
      <header className="stu-top">
        <div className="stu-name">
          <h1 className="adm-h">{draft.section.code && `${draft.section.code} · `}{draft.section.title}</h1>
          <p className="adm-sub">{draft.items.length} card{draft.items.length === 1 ? "" : "s"} · {draft.section.visible ? "visible" : "hidden from the site"}{dirty ? " · changes not saved" : ""}</p>
        </div>
        <div className="stu-switch" role="group" aria-label="View">
          <button type="button" className={view === "bench" ? "on" : ""} aria-pressed={view === "bench"} onClick={() => { setView("bench"); try { localStorage.setItem("lc_stu_view", "bench"); } catch {} }}><b><i className="ti ti-layout-columns" /> Workbench</b><small>Everything side by side</small></button>
          <button type="button" className={view === "spot" ? "on" : ""} aria-pressed={view === "spot"} onClick={() => { setView("spot"); try { localStorage.setItem("lc_stu_view", "spot"); } catch {} }}><b><i className="ti ti-focus-2" /> Spotlight</b><small>One thing, big</small></button>
        </div>
        <div className="btns stu-topbtns">
          <label className="switch"><input type="checkbox" checked={labels} onChange={(e) => { setLabels(e.target.checked); try { localStorage.setItem("lc_stu_labels", e.target.checked ? "1" : "0"); } catch {} }} />Labels</label>
          <select className="stu-skin" value={skin} aria-label="Theme the previews wear" title="Theme the previews wear" onChange={(e) => setSkin(e.target.value)}>{LIVE_THEMES.map((t) => <option key={t} value={t}>{SKIN_LABELS[t as Skin] ?? t}</option>)}</select>
          <button type="button" className="b-out b-sm" onClick={(e) => openPop("sec", "title", e.currentTarget.getBoundingClientRect())}><i className="ti ti-settings" />Section settings</button>
          <a href={`/#${draft.section.slug}`} target="_blank" className="b-out b-sm"><i className="ti ti-eye" />View on site</a>
          <button type="button" className="adm-iconbtn" aria-label="Where everything is" title="Where everything is" onClick={() => setDialog("where")}><i className="ti ti-help" /></button>
        </div>
      </header>

      {view === "bench" ? (
        <div className="stu-bench">
          <aside className="stu-pane stu-side">
            <div className="stu-h"><div><span className="stu-k">Cards</span><small>Click to edit · drag or use the arrows to reorder</small></div></div>
            {list(false)}
          </aside>
          <div className="stu-main">
            <section className="stu-pane">
              <div className="stu-h"><div><span className="stu-k">Section</span><small>Click any part of the header. Type straight onto the title.</small></div>
                <div className="btns"><button type="button" className="b-out b-sm" onClick={() => { setView("spot"); setFace("sec"); }}><i className="ti ti-focus-2" />Spotlight</button></div></div>
              {secSurface}{secMore}
            </section>
            <div className="stu-two">
              <section className="stu-pane">
                <div className="stu-h"><div><span className="stu-k">Card</span><small>{item ? "What visitors see in the row" : "Pick a card"}</small></div>{cardTools}</div>
                <div className="stu-stage">{cardSurface ?? none}</div>
                {cardMore}
              </section>
              <section className="stu-pane">
                <div className="stu-h"><div><span className="stu-k">Full view</span><small>What opens from the card. Drag a part&apos;s handle to move it.</small></div>{fvTools}</div>
                <div className="stu-stage full" ref={fvStage}>{fvSurface ?? none}</div>
              </section>
            </div>
          </div>
        </div>
      ) : (
        <div className="stu-spot">
          <nav className="stu-pane stu-rail" aria-label="What's on the stage">
            {([["sec", "settings", "Section"], ["card", "cards", "Card"], ["fv", "arrows-maximize", "Full view"]] as [Face, string, string][]).map(([f, icon, label]) => (
              <button key={f} type="button" className={face === f ? "on" : ""} aria-pressed={face === f} onClick={() => { setFace(f); setTyping(null); if (f === "fv") setPlayed((n) => n + 1); }}><i className={`ti ti-${icon}`} />{label}</button>
            ))}
            <hr />
            <button type="button" disabled={!item} onClick={(e) => { setFace("card"); openPop("card", "size", e.currentTarget.getBoundingClientRect()); }}><i className="ti ti-ruler-2" />Size</button>
            <button type="button" disabled={!item} onClick={(e) => { setFace("card"); openPop("card", "reacts", e.currentTarget.getBoundingClientRect()); }}><i className="ti ti-mood-smile" />Reacts</button>
            <button type="button" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setAdding({ x: r.right + 8, y: r.top }); }}><i className="ti ti-plus" />Add</button>
          </nav>
          <div className="stu-center">
            <section className="stu-pane stu-big">
              <div className="stu-bigstage">
                <div className="stu-h bare">
                  <div><span className="stu-k">{face === "sec" ? "Section" : face === "card" ? "Card" : "Full view"}</span><small>{face === "sec" ? "Click any part of the header" : face === "card" ? "Click a part, or type straight onto a title, subtitle, date, place or status" : "Drag a part's handle to move it anywhere"}</small></div>
                  {face === "card" ? cardTools : face === "fv" ? fvTools : null}
                </div>
                <div key={face} className={`stu-stage big${face === "fv" ? " full" : ""}`} ref={face === "fv" ? fvStage : undefined}>
                  {face === "sec" ? <div className="stu-wide">{secSurface}</div> : face === "card" ? cardSurface ?? none : fvSurface ?? none}
                </div>
                {face === "card" && cardMore}
              </div>
              <aside className="stu-parts">
                <span className="stu-k">Parts you can change</span>
                {(face === "sec" ? Object.keys(SEC_NAMES) : face === "fv" ? ["fv", ...FV_PARTS.map(([k]) => `fvb:${k}`)] : [...CARD_KEYS, ...(item?.type === "poll" ? ["poll"] : [])]).map((k) => (
                  <button key={k} type="button" disabled={face !== "sec" && !item} className={pop?.key === k ? "on" : ""} onClick={(e) => openPop(face === "sec" ? "sec" : face, k, e.currentTarget.getBoundingClientRect())}>
                    {face === "sec" ? SEC_NAMES[k] : k === "fv" ? "Layout & options" : partName(k, card)}<i className="ti ti-chevron-right" />
                  </button>
                ))}
              </aside>
            </section>
            <section className="stu-pane">
              <div className="stu-h"><div><span className="stu-k">Cards</span><small>Click one to put it on the stage · drag or use the arrows to reorder</small></div></div>
              {list(true)}
            </section>
          </div>
        </div>
      )}

      {pop && (
        <Popover key={`${pop.scope}:${pop.key.startsWith("fv") ? "fv" : pop.scope === "sec" ? "sec" : "card"}`} x={pop.x} y={pop.y} title={popTitle} onClose={() => setPop(null)}
          foot={pop.scope !== "sec" && item && !pop.key.startsWith("fv") ? <><span>Also on this card:</span>{[...CARD_KEYS, "quote", ...(item.type === "poll" ? ["poll"] : [])].map((k) => <button key={k} type="button" className={k === pop.key ? "on" : ""} onClick={() => setPop({ ...pop, key: k })}>{partName(k, card)}</button>)}</>
            : pop.key.startsWith("fv") ? <><span>Full view:</span><button type="button" className={pop.key === "fv" ? "on" : ""} onClick={() => setPop({ ...pop, key: "fv" })}>Options</button>{FV_PARTS.map(([k, label]) => <button key={k} type="button" className={pop.key === `fvb:${k}` ? "on" : ""} onClick={() => setPop({ ...pop, key: `fvb:${k}` })}>{label}</button>)}</> : null}>
          {pop.scope === "sec" ? <SectionEditor ed={ed} focus={pop.key} /> : pop.key === "fv" || pop.key.startsWith("fvb:") ? <FullEditor ed={ed} k={pop.key} /> : <div key={`${sel}:${pop.key}`} className="stu-fields"><CardEditor ed={ed} k={pop.key} where={pop.scope === "fv" ? "fv" : "card"} /></div>}
        </Popover>
      )}

      {menu && menuItem && (
        <Floating x={menu.x} y={menu.y} onClose={() => setMenu(null)} className="stu-menu">
          <button type="button" onClick={() => { select(menuItem.id); }}><i className="ti ti-edit" />Edit this card</button>
          <button type="button" onClick={() => duplicate(menuItem)}><i className="ti ti-copy" />Duplicate</button>
          <button type="button" onClick={() => { setItemOf(menuItem.id, { visible: !menuItem.visible }); setMenu(null); }}><i className={`ti ti-${menuItem.visible ? "eye-off" : "eye"}`} />{menuItem.visible ? "Hide from visitors" : "Show to visitors"}</button>
          <button type="button" onClick={() => { setItemOf(menuItem.id, { pinned: !menuItem.pinned }); setMenu(null); }}><i className="ti ti-pin" />{menuItem.pinned ? "Unpin" : "Pin to the front"}</button>
          {cats.length > 0 && <div className="stu-menu-sub"><span>Move to subsection</span>{cats.map((c) => <button key={c} type="button" className={menuItem.category === c ? "on" : ""} onClick={() => { setItemOf(menuItem.id, { category: c }); setMenu(null); }}>{c}</button>)}</div>}
          <button type="button" onClick={() => { setSel(menuItem.id); setMenu(null); openPop("card", "more"); }}><i className="ti ti-arrows-exchange" />Move to another section…</button>
          <button type="button" onClick={() => { setSel(menuItem.id); setMenu(null); openFull(); }}><i className="ti ti-arrows-maximize" />Its full view</button>
          {menuItem.id > 0 && menuItem.visible && draft.section.visible && <a href={`/s/${draft.section.slug}/${menuItem.id}`} target="_blank" onClick={() => setMenu(null)}><i className="ti ti-external-link" />Open on the site</a>}
          <hr />
          <button type="button" className="danger" onClick={() => remove(menuItem)}><i className="ti ti-trash" />Delete…</button>
        </Floating>
      )}
      {adding && (
        <Floating x={adding.x} y={adding.y} onClose={() => setAdding(null)} className="stu-menu">
          <div className="stu-menu-sub"><span>A new card in</span>{(cats.length ? cats : [""]).map((c) => <button key={c || "_"} type="button" onClick={() => add("post", c)}>{c || "This section"}</button>)}</div>
          <hr />
          <div className="stu-menu-sub"><span>Or a poll in</span>{(cats.length ? cats : [""]).map((c) => <button key={c || "_"} type="button" onClick={() => add("poll", c)}>{c || "This section"}</button>)}</div>
        </Floating>
      )}

      <div className={`stu-save${dirty ? " show" : ""}`} role="region" aria-label="Save your changes" aria-hidden={!dirty}>
        <span className="stu-save-t"><i />{steps > 0 ? `${steps} change${steps === 1 ? "" : "s"} not saved yet` : "Changes not saved yet"}</span>
        <button type="button" disabled={hist.at === 0 || saving} onClick={undo} tabIndex={dirty ? 0 : -1}><i className="ti ti-arrow-back-up" />Undo</button>
        <button type="button" disabled={hist.at >= hist.list.length - 1 || saving} onClick={redo} tabIndex={dirty ? 0 : -1}><i className="ti ti-arrow-forward-up" />Redo</button>
        {draft.deleted.length > 0 && <button type="button" onClick={() => setDialog("bin")} tabIndex={dirty ? 0 : -1}><i className="ti ti-trash" />Bin ({draft.deleted.length})</button>}
        <button type="button" disabled={saving} onClick={discard} tabIndex={dirty ? 0 : -1}>Discard</button>
        <button type="button" className="go" disabled={saving} onClick={save} tabIndex={dirty ? 0 : -1}><i className={`ti ti-${saving ? "loader-2 spin" : "device-floppy"}`} />{saving ? "Saving…" : "Save"}</button>
      </div>
      {!dirty && hist.at < hist.list.length - 1 && <div className="stu-save show"><span className="stu-save-t"><i />Back at the last save</span><button type="button" onClick={redo}><i className="ti ti-arrow-forward-up" />Redo</button></div>}

      {toast && (
        <div key={toast.n} className={`adm-toast stu-toast${toast.bad ? " bad" : ""}`} role="status">
          {toast.text}{toast.undo && <button type="button" onClick={() => { undo(); setToast(null); }}>Undo</button>}
        </div>
      )}
      <Confirm ask={ask} onClose={() => setAsk(null)} />
      <Dialog open={dialog === "bin"} title="Bin" onClose={() => setDialog("")}>
        <p>Deleted cards wait here until you press Save. After that they&apos;re gone for good.</p>
        {draft.deleted.length === 0 && <p className="hint">The bin is empty.</p>}
        {draft.deleted.map((it) => <div key={it.id} className="stu-binrow"><b>{it.title || "Untitled"}</b><small>{it.category}</small><button type="button" className="b-out b-sm" onClick={() => restore(it)}><i className="ti ti-arrow-back-up" />Restore</button></div>)}
      </Dialog>
      <Dialog open={dialog === "where"} title="Where everything is" onClose={() => setDialog("")}>
        <p>Every box from the older pages, and where the same thing is now. Nothing you could change before is gone.</p>
        <dl className="stu-where">{WHERE.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      </Dialog>
    </div>
  );
}

/** The editor that opens beside a label: it floats, can be dragged by its top, and stays where it's put while the part inside it changes. */
function Popover({ x, y, title, children, foot, onClose }: { x: number; y: number; title: string; children: React.ReactNode; foot?: React.ReactNode; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState({ x, y });
  useEffect(() => { setAt({ x, y }); }, [x, y]);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = clamp(at.x, 8, Math.max(8, window.innerWidth - r.width - 8)), ny = clamp(at.y, 8, Math.max(8, window.innerHeight - r.height - 8));
    if (nx !== at.x || ny !== at.y) setAt({ x: nx, y: ny });
  });
  const drag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    const x0 = e.clientX - at.x, y0 = e.clientY - at.y;
    const move = (m: PointerEvent) => setAt({ x: m.clientX - x0, y: m.clientY - y0 });
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <div ref={box} className="stu-pop" style={{ left: at.x, top: at.y }} role="dialog" aria-label={title}>
      <div className="stu-pop-h" onPointerDown={drag}><i className="stu-dot" aria-hidden /><b>{title}</b><button type="button" className="adm-iconbtn" aria-label="Close" onClick={onClose}><i className="ti ti-x" /></button></div>
      <div className="stu-pop-b">{children}</div>
      {foot && <div className="stu-pop-f">{foot}</div>}
    </div>
  );
}

/** A small menu at a spot on the screen. A click anywhere else closes it. */
function Floating({ x, y, className, children, onClose }: { x: number; y: number; className: string; children: React.ReactNode; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState({ x, y });
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAt({ x: clamp(x, 8, Math.max(8, window.innerWidth - r.width - 8)), y: clamp(y, 8, Math.max(8, window.innerHeight - r.height - 8)) });
  }, [x, y]);
  useEffect(() => {
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) onClose(); };
    const t = setTimeout(() => window.addEventListener("pointerdown", away), 0);
    return () => { clearTimeout(t); window.removeEventListener("pointerdown", away); };
  }, [onClose]);
  return <div ref={box} className={className} style={{ left: at.x, top: at.y }} role="menu">{children}</div>;
}

/** Asks before anything risky, the way the rest of the dashboard does: Cancel has the focus, so an accidental Enter is safe. */
function Confirm({ ask, onClose }: { ask: Ask | null; onClose: () => void }) {
  const box = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (ask && !box.current?.open) { box.current?.showModal(); cancel.current?.focus(); } if (!ask && box.current?.open) box.current.close(); }, [ask]);
  return (
    <dialog ref={box} className="info-dlg confirm-dlg" aria-label={ask?.title} onClose={onClose} onClick={(e) => { if (e.target === box.current) onClose(); }}>
      {ask && (
        <div className="confirm-in">
          <span className="confirm-ico" aria-hidden="true"><i className="ti ti-alert-triangle" /></span>
          <b>{ask.title}</b>
          <p>{ask.message}</p>
          <div className="confirm-btns">
            <button ref={cancel} type="button" className="b-out" onClick={onClose}>Cancel</button>
            <button type="button" className="b-yes" onClick={() => { const run = ask.run; onClose(); run(); }}><i className="ti ti-check" />{ask.yes}</button>
          </div>
        </div>
      )}
    </dialog>
  );
}

function Dialog({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  const box = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open && !box.current?.open) box.current?.showModal(); if (!open && box.current?.open) box.current.close(); }, [open]);
  return (
    <dialog ref={box} className="info-dlg stu-dlg" aria-label={title} onClose={onClose} onClick={(e) => { if (e.target === box.current) onClose(); }}>
      <div className="info-in">
        <div className="info-h"><b>{title}</b><button type="button" className="adm-iconbtn" aria-label="Close" onClick={onClose}><i className="ti ti-x" /></button></div>
        {children}
      </div>
    </dialog>
  );
}
