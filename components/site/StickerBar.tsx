"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { REACTION_EMOJIS } from "@/lib/settings";
import { DEFAULT_TALK, type TalkInfo } from "@/lib/talk";
import type { FeedEvent } from "@/lib/data";
import type { PartAttrs } from "./cardParts";
import { useCardBar } from "./BarCtx";
import { loadReactions, sendReaction } from "./reactLoad";
import { askName, savedName } from "./askName";
import { burst, whenSettled } from "./fx";

type Fx = typeof import("./stickerFx");
let fxP: Promise<Fx> | null = null;
/** The motion (stickerFx.ts, with GSAP): fetched once the page has settled, or the first time a card's buttons are pointed at. */
const loadFx = () => (fxP ??= import("./stickerFx"));
let warmed = false;

const NAMES: Record<string, string> = { "❤️": "Love", "🔥": "Fire", "😂": "Haha", "🤯": "Mind blown", "👏": "Clap" };
// a comment's name shows beside it, unlike a reaction's, so the name box says so (the same words as Talk.tsx)
const WORDS = { title: "Who's commenting?", why: "Your name shows next to your comment, and you only have to type it once.", ok: "Post it" };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;
/** how long a finger rests on React before the emojis come up to be chosen by sliding (shorter than the phone's own long press) */
const HOLD_MS = 280;

type Line = { ic: string; html: string };
/** What the LIVE strip says for one event. Who reacted is private, so a reaction is "Someone"; a comment's name and words are public. */
function lineOf(e: FeedEvent): Line {
  if (e.k === "react") return { ic: e.e ?? "❤️", html: `Someone reacted ${esc(e.e ?? "")}` };
  if (e.k === "talk") return { ic: "💬", html: `<b>${esc(e.name ?? "")}</b> commented “${esc(e.body ?? "")}”` };
  return { ic: "↗️", html: "Someone shared this" };
}

/** What the live editor shows: the buttons standing still, with the entry's real numbers. */
export type StillStickers = { counts: Record<string, number>; comments: number; feed: FeedEvent[] };

/**
 * The sticker buttons at the bottom of a card (2026-11-28, the owner's pick: number 3, the theme's colour, the Ink finish): React, Comment,
 * Share and Open as four equal stickers, and a thin LIVE strip under them typing recent reactions, comments and shares one after another.
 * Pointing at React (tapping it on a phone, or Enter) brings the emojis up, each with its own move; Comment flips the four buttons over into a
 * comment box, which flips back after posting or a click outside; reacting, commenting and sharing each end with their own animation
 * (stickerFx.ts). Which buttons show is the dashboard's Card buttons page (settings.cardBar, through BarCtx) and then the entry's own switches
 * (`talk`: react, comments, share, open). `parts` names and sizes the parts like everything else on the card (stickerParts in cardParts.tsx):
 * `tabs` (all four), `t-react`, `t-talk`, `t-share`, `t-open` and `strip`. `still` draws it for the live editor: nothing to click, nothing fetched.
 */
export default function StickerBar({ id, href, label, talk, parts = {}, reactions = true, still }: { id: number; href?: string; label: string; talk?: TalkInfo; parts?: Record<string, PartAttrs>; reactions?: boolean; still?: StillStickers }) {
  const cfg = useCardBar();
  const p = (key: string, base?: React.CSSProperties): PartAttrs => { const a = parts[key] ?? {}; return base ? { ...a, style: { ...base, ...a.style } } : a; };
  const t = talk ?? DEFAULT_TALK;
  const [counts, setCounts] = useState<Record<string, number>>(still?.counts ?? {});
  const [mine, setMine] = useState<string[]>([]);
  const [comments, setComments] = useState(still?.comments ?? 0);
  const [feed, setFeed] = useState<FeedEvent[]>(still?.feed ?? []);
  const [tray, setTray] = useState(false);
  const [saying, setSaying] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  const front = useRef<HTMLDivElement>(null);
  const say = useRef<HTMLFormElement>(null);
  const trayEl = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLSpanElement>(null);
  const reactTab = useRef<HTMLButtonElement>(null);
  const talkTab = useRef<HTMLButtonElement>(null);
  const totalEl = useRef<HTMLElement>(null);
  const talkN = useRef<HTMLElement>(null);
  // kept across draws, so a timer set before a re-draw still knows the truth
  const st = useRef({ by: "" as "" | "hover" | "click", openT: 0 as ReturnType<typeof setTimeout> | 0, closeT: 0 as ReturnType<typeof setTimeout> | 0, busy: false, up: false, closing: false,
    cur: null as HTMLElement | null, total: -1, comments: -1, own: [] as Line[], lines: [] as Line[], shown: "", timer: 0 as ReturnType<typeof setTimeout> | 0, typer: 0, seen: false,
    // each card types at its own speed, so two strips that do change together still don't move in step
    cps: 32 + Math.random() * 12, heldAt: 0 });
  st.current.up = tray;

  const showReact = reactions && cfg.react && t.react;
  const showTalk = cfg.talk && t.comments;
  const showShare = cfg.share && t.share;
  const showOpen = cfg.open && t.open;
  const n = [showReact, showTalk, showShare, showOpen].filter(Boolean).length;
  const total = REACTION_EMOJIS.reduce((a, e) => a + (counts[e] ?? 0), 0);
  const ranked = REACTION_EMOJIS.map((e) => counts[e] ?? 0).sort((a, b) => b - a);
  const crowned = t.top && ranked[0] > (ranked[1] ?? 0) ? REACTION_EMOJIS.find((e) => (counts[e] ?? 0) === ranked[0]) : undefined;
  const myEmoji = mine.find((e) => (REACTION_EMOJIS as readonly string[]).includes(e));

  /** Motion only with Lively on the dashboard, motion allowed by the visitor, and a device that isn't a slow one. */
  const lively = () => cfg.motion === "lively" && !still && !matchMedia("(prefers-reduced-motion: reduce)").matches && !document.documentElement.classList.contains("lite");
  const fx = (run: (f: Fx) => void) => { if (lively()) loadFx().then(run).catch(() => {}); };

  // ---------- numbers, and keeping in step with other bars for the same entry ----------
  useEffect(() => {
    if (still) return;
    let live = true;
    loadReactions(id).then((s) => { if (live) { setCounts(s.counts); setMine(s.mine); setComments(s.comments ?? 0); setFeed(s.feed ?? []); } });
    const sync = (e: Event) => { const d = (e as CustomEvent<{ id: number; counts: Record<string, number>; mine: string[] }>).detail; if (d.id === id) { setCounts(d.counts); setMine(d.mine); } };
    const talked = (e: Event) => { const d = (e as CustomEvent<{ id: number; count: number }>).detail; if (d.id === id) setComments(d.count); };
    addEventListener("lc-react", sync);
    addEventListener("lc-talk", talked);
    if (!warmed && cfg.motion === "lively") { warmed = true; whenSettled(() => { loadFx().catch(() => {}); }, 6); }
    return () => { live = false; removeEventListener("lc-react", sync); removeEventListener("lc-talk", talked); };
  }, [id, still, cfg.motion]);
  useEffect(() => { const s = st.current; if (s.total >= 0 && s.total !== total && totalEl.current) { const el = totalEl.current, up = total > s.total; fx((f) => f.rollIn(el, up)); } s.total = total; }, [total]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const s = st.current; if (s.comments >= 0 && s.comments !== comments && talkN.current) { const el = talkN.current, up = comments > s.comments; fx((f) => f.rollIn(el, up)); } s.comments = comments; }, [comments]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- the LIVE strip: one line after another, typed, only while it's on screen ----------
  // Every card keeps its own time (the owner saw them all type at once, 2026-11-28): the first change comes after a random 1 to 6 seconds, each
  // next one after a random 4 to 9, and a card with only one line types it once and then rests until something new happens.
  // It types by the screen's own frames into one text node, at the card's own speed, then shows the line with its bold name.
  const write = (l: Line, type: boolean) => {
    const el = line.current; if (!el) return;
    cancelAnimationFrame(st.current.typer);
    st.current.shown = l.html;
    const head = `<span class="stb-li">${l.ic}</span>`;
    const root = document.documentElement;
    if (!type || !lively() || root.classList.contains("scrolling")) { el.innerHTML = `${head}<span class="stb-lt">${l.html}</span>`; return; }
    const plain = Array.from(l.html.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
    el.innerHTML = `${head}<span class="stb-lt"><span class="stb-caret"></span></span>`;
    const body = el.querySelector(".stb-lt") as HTMLElement, txt = document.createTextNode("");
    body.prepend(txt);
    const t0 = performance.now();
    let shown = 0;
    const step = (now: number) => {
      const i = Math.min(plain.length, Math.floor(((now - t0) / 1000) * st.current.cps));
      if (i !== shown) { shown = i; txt.data = plain.slice(0, i).join(""); }
      if (i < plain.length) st.current.typer = requestAnimationFrame(step);
      else setTimeout(() => { if (body.isConnected && txt.isConnected) body.innerHTML = l.html; }, 450);
    };
    st.current.typer = requestAnimationFrame(step);
  };
  const next = () => {
    const s = st.current, all = [...s.own, ...s.lines];
    const fresh = all.filter((l) => l.html !== s.shown);
    if (!fresh.length) return; // only the line that's already showing: it stays still
    write(fresh[Math.floor(Math.random() * fresh.length)], true);
  };
  const schedule = (first: boolean) => {
    const s = st.current;
    clearTimeout(s.timer);
    s.timer = setTimeout(() => { if (!document.hidden && st.current.seen) next(); schedule(false); }, first ? 1000 + Math.random() * 5000 : 4000 + Math.random() * 5000);
  };
  const pushOwn = (l: Line) => { const s = st.current; s.own = [l, ...s.own.filter((x) => x.html !== l.html)].slice(0, 3); write(l, true); if (strip.current) fx((f) => f.bump(strip.current as HTMLElement)); schedule(false); };
  useEffect(() => {
    const s = st.current;
    const kinds = feed.filter((e) => (e.k === "react" ? showReact : e.k === "talk" ? showTalk : showShare));
    s.lines = kinds.length ? kinds.map(lineOf) : [{ ic: "✨", html: showReact ? "Be the first to react" : showTalk ? "Be the first to say something" : "Nothing here yet" }];
    if (still) { write(s.lines[0], false); return; }
    if (!s.own.length) write(s.lines[0], false);
  }, [feed, showReact, showTalk, showShare, still]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = strip.current;
    if (still || !el) return;
    const io = new IntersectionObserver(([e]) => { st.current.seen = e.isIntersecting; });
    io.observe(el);
    schedule(true);
    return () => { io.disconnect(); clearTimeout(st.current.timer); cancelAnimationFrame(st.current.typer); };
  }, [still]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- the emojis that come up ----------
  useIso(() => {
    const el = trayEl.current;
    if (!tray || !el) return;
    if (!lively()) { el.classList.remove("stb-pre"); return; }
    loadFx().then((f) => { if (trayEl.current === el && !st.current.closing) f.openTray(el); }).catch(() => el.classList.remove("stb-pre"));
  }, [tray]);
  const openTray = (by: "hover" | "click") => {
    const s = st.current;
    clearTimeout(s.closeT); clearTimeout(s.openT);
    s.closing = false;
    if (s.up) { if (by === "click") s.by = "click"; return; }
    if (saying) return;
    s.by = by; s.up = true;
    setTray(true);
  };
  const closeTray = () => {
    const s = st.current;
    clearTimeout(s.openT); clearTimeout(s.closeT);
    if (!s.up || s.closing) return;
    s.by = "";
    const shut = () => { s.closing = false; s.up = false; setTray(false); };
    const el = trayEl.current;
    if (el && lively() && fxP) { s.closing = true; loadFx().then((f) => f.closeTray(el)).then(() => { if (s.closing) shut(); }).catch(shut); }
    else shut();
  };
  const pick = async (emoji: string, btn: HTMLButtonElement) => {
    const s = st.current;
    if (s.busy || still) return;
    const adding = !mine.includes(emoji);
    let name = savedName();
    if (adding && !name) { name = await askName(emoji); if (!name) return; }
    s.busy = true;
    const before = { counts, mine };
    setMine((m) => (adding ? [...m, emoji] : m.filter((x) => x !== emoji)));
    setCounts((c) => ({ ...c, [emoji]: Math.max(0, (c[emoji] ?? 0) + (adding ? 1 : -1)) }));
    const go = lively();
    if (adding) {
      const r = btn.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top, [emoji], go ? 12 : 5, go ? 95 : 50);
      fx((f) => { f.squash(btn); if (reactTab.current) f.flyReaction(btn, emoji, reactTab.current); });
      pushOwn({ ic: emoji, html: `<b>You</b> reacted ${emoji}` });
    }
    setTimeout(closeTray, go ? 420 : 150);
    try { if (!(await sendReaction(id, emoji, name, adding))) { setCounts(before.counts); setMine(before.mine); } }
    catch { setCounts(before.counts); setMine(before.mine); }
    finally { s.busy = false; }
  };

  // ---------- Comment: the four buttons flip over into a comment box, and back ----------
  useIso(() => {
    const f = front.current, b = say.current;
    if (!saying || !f || !b) return;
    f.style.pointerEvents = "none";
    const focus = () => b.querySelector("input")?.focus({ preventScroll: true });
    if (!lively()) { f.style.opacity = "0"; focus(); return; }
    b.style.opacity = "0";
    loadFx().then((x) => x.flip(f, b, true)).then(focus).catch(() => { f.style.opacity = "0"; b.style.opacity = "1"; focus(); });
  }, [saying]);
  const openSay = () => { if (still || saying) return; closeTray(); setSaying(true); };
  const closeSay = () => {
    const f = front.current, b = say.current;
    if (!saying || !f || !b) return;
    // hide the box in this same frame, before anything about it is reset: React would only hide it on its next render, and for that one frame
    // the box showed again, flat over the buttons (the owner saw the flick, 2026-11-28)
    const done = () => { b.hidden = true; b.style.opacity = ""; f.style.opacity = ""; f.style.pointerEvents = ""; setSaying(false); };
    if (lively() && fxP) loadFx().then((x) => x.flip(f, b, false)).then(done).catch(done);
    else done();
  };
  useEffect(() => {
    if (!saying) return;
    const away = (e: PointerEvent) => { if (!say.current?.contains(e.target as Node)) closeSay(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") closeSay(); };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", away, true); document.removeEventListener("keydown", key); };
  });
  const post = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const name = savedName() || (await askName("💬", WORDS));
      if (!name) return; // they closed the box: nothing is posted, and what they wrote stays
      const r = await fetch("/api/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, body, name }) });
      const a: { comments?: unknown[]; error?: string } = await r.json().catch(() => ({}));
      if (!r.ok) { const tab = talkTab.current ?? say.current; if (tab) loadFx().then((f) => f.label(tab, a.error ?? "That didn't work. Try again.", !lively())).catch(() => {}); return; }
      setText("");
      const count = a.comments?.length ?? comments + 1;
      setComments(count);
      window.dispatchEvent(new CustomEvent("lc-talk", { detail: { id, count } }));
      window.dispatchEvent(new Event("lc-talked"));
      const l: Line = { ic: "💬", html: `<b>You</b> commented “${esc(body)}”` };
      const input = say.current?.querySelector("input");
      if (lively() && input) loadFx().then((f) => f.flyComment(body, input, strip.current, () => pushOwn(l))).catch(() => pushOwn(l));
      else pushOwn(l);
      closeSay();
      setTimeout(() => { const tab = talkTab.current; if (tab) fx((f) => { f.hop(tab); f.label(tab, "+1", false, 22); }); }, lively() ? 650 : 0);
    } catch {
      const tab = talkTab.current; if (tab) loadFx().then((f) => f.label(tab, "That didn't work. Try again.", !lively())).catch(() => {});
    } finally { setSending(false); }
  };

  // ---------- Share: a paper plane, and the link copied (or the phone's share menu) ----------
  const share = async (tab: HTMLButtonElement) => {
    const coarse = matchMedia("(any-pointer: coarse)").matches;
    fx((f) => f.flyPlane(tab));
    fetch("/api/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => {});
    setTimeout(() => pushOwn({ ic: "↗️", html: "<b>You</b> shared this" }), lively() ? 700 : 0);
    const url = new URL(href ?? location.pathname, location.href).href;
    if (navigator.share && coarse) { loadFx().then((f) => f.label(tab, "Share menu opens", !lively())).catch(() => {}); try { await navigator.share({ url }); } catch {} return; }
    let ok = true;
    try { await navigator.clipboard.writeText(url); } catch { ok = false; }
    loadFx().then((f) => f.label(tab, ok ? "Link copied ✓" : "Couldn't copy it", !lively())).catch(() => {});
  };

  // ---------- pointing and leaving (the press itself is CSS: stickerbar.css); nothing of this in the live editor ----------
  useEffect(() => {
    const b = bar.current, foot = b?.parentElement, root = document.documentElement;
    if (still || !b || !foot) return;
    const s = st.current;
    const kindOf = (el: Element) => (el.classList.contains("stb-react") ? "react" : el.classList.contains("stb-talk") ? "talk" : el.classList.contains("stb-share") ? "share" : "open");
    const tabOf = (x: EventTarget | null) => { const el = (x as Element | null)?.closest?.(".stb-t") as HTMLElement | null; return el && b.contains(el) ? el : null; };
    const enter = (tab: HTMLElement | null) => {
      const was = s.cur;
      if (tab === was) return;
      s.cur = tab;
      if (was) fx((f) => f.tabLeave(was, kindOf(was)));
      if (tab) fx((f) => f.tabEnter(tab, kindOf(tab)));
      if (tab && kindOf(tab) === "react") { clearTimeout(s.closeT); clearTimeout(s.openT); s.openT = setTimeout(() => openTray("hover"), 110); }
      else if (tab && s.by === "hover") { clearTimeout(s.closeT); s.closeT = setTimeout(closeTray, 220); }
    };
    // only a mouse really moving counts: Chrome also says "pointer over" when scrolling brings a card under a mouse that's resting
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || (!e.movementX && !e.movementY) || root.classList.contains("scrolling")) return;
      if ((e.target as Element).closest?.(".stb-tray")) { clearTimeout(s.closeT); return; }
      enter(tabOf(e.target));
    };
    const onLeave = (e: PointerEvent) => { if (e.pointerType !== "mouse") return; enter(null); clearTimeout(s.openT); if (s.by === "hover") { clearTimeout(s.closeT); s.closeT = setTimeout(closeTray, 300); } };
    const warm = () => { if (cfg.motion === "lively") loadFx().catch(() => {}); };
    foot.addEventListener("pointermove", onMove);
    foot.addEventListener("pointerleave", onLeave);
    foot.addEventListener("pointerenter", warm, { once: true });
    return () => {
      clearTimeout(s.openT); clearTimeout(s.closeT);
      foot.removeEventListener("pointermove", onMove); foot.removeEventListener("pointerleave", onLeave);
      foot.removeEventListener("pointerenter", warm);
    };
  });
  // while the emojis are up: a tap elsewhere or Escape puts them away
  useEffect(() => {
    if (!tray || still) return;
    const away = (e: PointerEvent) => { if (!bar.current?.contains(e.target as Node)) closeTray(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { closeTray(); reactTab.current?.focus(); } };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", away, true); document.removeEventListener("keydown", key); };
  });
  // ---------- phones: press and hold React, slide onto an emoji, let go to give it (the owner asked, 2026-11-28: "like Facebook") ----------
  // A quick tap still opens the emojis to tap one. A finger that rests on React for HOLD_MS brings them up; from then on the page stays still
  // (touchmove's preventDefault, on this one button only, so a swipe that starts anywhere else never waits for a script), the emoji under the
  // finger rises above it with its name, and letting go on it gives it. Letting go away from the emojis gives nothing; letting go without
  // moving leaves them up to tap. A finger that moves before the hold is scrolling, and is left alone.
  const live = useRef({ pick, openTray, closeTray, lively, fx });
  live.current = { pick, openTray, closeTray, lively, fx };
  useEffect(() => {
    const tab = reactTab.current;
    if (still || !tab) return;
    const s = st.current;
    let timer: ReturnType<typeof setTimeout> | 0 = 0, x0 = 0, y0 = 0, holding = false, moved = false, hot: HTMLButtonElement | null = null;
    const setHot = (b: HTMLButtonElement | null) => {
      if (b === hot) return;
      const was = hot; hot = b;
      if (was) { was.classList.remove("stb-hot", "stb-hot-still"); if (fxP) loadFx().then((f) => f.emojiLeave(was)).catch(() => {}); }
      if (!b) return;
      if (live.current.lively()) { b.classList.add("stb-hot"); live.current.fx((f) => f.emojiEnter(b, true)); } else b.classList.add("stb-hot", "stb-hot-still");
      navigator.vibrate?.(6);
    };
    // which emoji's place the finger is over: by where each one sits in the row, not by what's under the finger, because the chosen one rises out
    // of its place (and would hand the finger to its neighbour). Offsets ignore zoom and movement, so they're scaled by the tray's real width.
    const slotAt = (x: number, y: number) => {
      const tr = trayEl.current; if (!tr) return null;
      const r = tr.getBoundingClientRect(); if (!r.width || y > r.bottom + 28 || y < r.top - 90 || x < r.left - 14 || x > r.right + 14) return null;
      const k = r.width / (tr.offsetWidth || r.width);
      let best: HTMLButtonElement | null = null, gap = Infinity;
      for (const b of Array.from(tr.querySelectorAll<HTMLButtonElement>(".stb-e"))) { const d = Math.abs(x - (r.left + (b.offsetLeft + b.offsetWidth / 2) * k)); if (d < gap) { gap = d; best = b; } }
      return best;
    };
    const end = () => { if (timer) clearTimeout(timer); timer = 0; holding = false; moved = false; setHot(null); tab.classList.remove("stb-hold"); };
    const start = (e: TouchEvent) => {
      if (e.touches.length !== 1) { end(); return; }
      const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; moved = false;
      if (cfg.motion === "lively") loadFx().catch(() => {});
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = 0; holding = true; s.heldAt = Date.now(); tab.classList.add("stb-hold"); live.current.openTray("click"); navigator.vibrate?.(12); }, HOLD_MS);
    };
    const move = (e: TouchEvent) => {
      const t = e.touches[0]; if (!t) return;
      if (!holding) { if (timer && Math.hypot(t.clientX - x0, t.clientY - y0) > 10) { clearTimeout(timer); timer = 0; } return; }
      if (e.cancelable) e.preventDefault();
      moved = moved || Math.hypot(t.clientX - x0, t.clientY - y0) > 6;
      setHot(slotAt(t.clientX, t.clientY));
    };
    const up = (e: TouchEvent) => {
      if (!holding) { if (timer) clearTimeout(timer); timer = 0; return; } // a quick tap: its click opens the emojis, as before
      if (e.cancelable) e.preventDefault(); // no click after a hold
      s.heldAt = Date.now();
      const b = hot, emoji = b?.dataset.e, away = moved;
      end();
      if (b && emoji) live.current.pick(emoji, b);
      else if (away) live.current.closeTray();
    };
    const menu = (e: Event) => { if (holding || timer) e.preventDefault(); }; // no "copy / share" menu from holding the button
    tab.addEventListener("touchstart", start, { passive: true });
    tab.addEventListener("touchmove", move, { passive: false });
    tab.addEventListener("touchend", up, { passive: false });
    tab.addEventListener("touchcancel", end);
    tab.addEventListener("contextmenu", menu);
    return () => {
      end();
      tab.removeEventListener("touchstart", start); tab.removeEventListener("touchmove", move); tab.removeEventListener("touchend", up);
      tab.removeEventListener("touchcancel", end); tab.removeEventListener("contextmenu", menu);
    };
  }, [still, showReact, cfg.motion]);

  // the dashboard's Card buttons page: ▶ makes the first card on screen show its emojis coming up
  useEffect(() => {
    if (still) return;
    const play = () => {
      const all = Array.from(document.querySelectorAll(".stb")).filter((el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; });
      if (all[0] !== bar.current) return;
      openTray("click"); setTimeout(closeTray, 2600);
    };
    addEventListener("lc-bar-play", play);
    return () => removeEventListener("lc-bar-play", play);
  });

  if (!n && !cfg.strip) return null;
  const stop = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); };
  const ti = still ? { tabIndex: -1 } : {};
  const openInner = <span className="stb-face"><span className="stb-ic"><i className="ti ti-arrows-maximize" aria-hidden /></span><span className="stb-w">Open</span></span>;

  return (
    <>
      {n > 0 && (
        <div ref={bar} className={`stb${tray ? " stb-up" : ""}`} role="group" aria-label="React, comment, share or open" {...p("tabs", { "--n": n } as React.CSSProperties)}>
          <div ref={front} className="stb-tabs">
            {showReact && (
              <button ref={reactTab} type="button" className={`stb-t stb-react${myEmoji ? " stb-mine" : ""}`} {...ti} {...p("t-react")} aria-expanded={tray}
                aria-label={`React (${total} so far)${myEmoji ? `, you gave ${myEmoji}` : ""}`}
                onClick={(e) => {
                  stop(e);
                  if (still || Date.now() - st.current.heldAt < 600) return; // the click a phone may still send after press, hold and slide
                  if (!tray) { openTray("click"); if (e.detail === 0) setTimeout(() => trayEl.current?.querySelector<HTMLElement>(".stb-e")?.focus(), 30); }
                  else if (st.current.by === "hover") st.current.by = "click";
                  else closeTray();
                }}>
                <span className="stb-face"><span className="stb-ic">{myEmoji ? <span className="stb-me">{myEmoji}</span> : <i className="ti ti-mood-smile" aria-hidden />}{total > 0 && <b ref={totalEl} className="stb-n" key={total}>{total}</b>}</span>
                <span className="stb-w">React</span></span>
              </button>
            )}
            {showTalk && (
              <button ref={talkTab} type="button" className="stb-t stb-talk" {...ti} {...p("t-talk")} aria-label={`Comment (${comments} so far)`} onClick={(e) => { stop(e); openSay(); }}>
                <span className="stb-face"><span className="stb-ic"><i className="ti ti-message-circle" aria-hidden /><span className="stb-dots" aria-hidden><i /><i /><i /></span>{comments > 0 && <b ref={talkN} className="stb-n" key={comments}>{comments}</b>}</span>
                <span className="stb-w">Comment</span></span>
              </button>
            )}
            {showShare && (
              <button type="button" className="stb-t stb-share" {...ti} {...p("t-share")} aria-label="Share this" onClick={(e) => { stop(e); if (!still) share(e.currentTarget); }}>
                <span className="stb-face"><span className="stb-ic"><i className="ti ti-share" aria-hidden /></span><span className="stb-w">Share</span></span>
              </button>
            )}
            {showOpen && (still || !href
              ? <span className="stb-t stb-open" role="button" {...ti} {...p("t-open")}>{openInner}</span>
              : <a className="stb-t stb-open" href={href} aria-label={`Open: ${label}`} {...p("t-open")}>{openInner}</a>)}
          </div>
          {showTalk && !still && (
            <form ref={say} className="stb-say" hidden={!saying} onSubmit={(e) => { stop(e); post(); }} onClick={(e) => e.stopPropagation()}>
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder={savedName() ? `Say something as ${savedName()}…` : "Write a comment…"} aria-label="Your comment" autoComplete="off" />
              <button type="submit" className="stb-send" aria-label="Post your comment" disabled={sending || !text.trim()}><i className={`ti ti-${sending ? "loader-2" : "send"}`} aria-hidden /></button>
              <button type="button" className="stb-x" aria-label="Close" onClick={(e) => { stop(e); closeSay(); }}><i className="ti ti-x" aria-hidden /></button>
            </form>
          )}
          {tray && (
            <div ref={trayEl} className={`stb-tray${lively() ? " stb-pre" : ""}`} role="group" aria-label="Pick a reaction">
              {REACTION_EMOJIS.map((e) => {
                const c = counts[e] ?? 0;
                return (
                  <button key={e} type="button" className={`stb-e${mine.includes(e) ? " stb-on" : ""}${e === crowned ? " stb-top" : ""}`} data-e={e} data-name={NAMES[e] ?? ""} aria-pressed={mine.includes(e)}
                    aria-label={`${NAMES[e] ?? "React"} ${e}, ${c} so far`} onClick={(ev) => { stop(ev); pick(e, ev.currentTarget); }}
                    onPointerEnter={(ev) => { if (ev.pointerType === "mouse") { const b = ev.currentTarget; fx((f) => f.emojiEnter(b)); } }}
                    onPointerLeave={(ev) => { if (ev.pointerType === "mouse" && fxP) { const b = ev.currentTarget; loadFx().then((f) => f.emojiLeave(b)).catch(() => {}); } }}>
                    <span className="stb-em" aria-hidden>{e}</span><span className="stb-c" aria-hidden>{c > 0 ? c : ""}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      {cfg.strip && (
        <div ref={strip} className="stb-strip" {...p("strip")} aria-live="off">
          <span className="stb-live">LIVE</span>
          <span className="stb-win"><span ref={line} className="stb-line" /></span>
        </div>
      )}
    </>
  );
}
