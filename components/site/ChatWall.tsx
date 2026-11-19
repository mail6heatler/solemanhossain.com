"use client";
import { useActionState, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { sendHello } from "@/app/actions";
import type { ConnectDesign, ConnectPiece } from "@/lib/connectLook";
import { AVAILS } from "@/lib/connectLook";
import { prefersReducedMotion } from "./fx";
import { partFn } from "./cardParts";

/** An approved note: on the Wall, and in the chat too if the owner wants. */
export type ChatNote = { id: number; name: string; body: string; day: string; reply?: string; hearts?: number };
/** A testimonial (an entry of the section) pinned on the Wall. */
export type WallPin = { id: number; title: string; body: string; by: string; href: string };
type Out = { key: number; name: string; body: string; pub: boolean; phase: "sending" | "sent" | "inbox" | "failed"; error?: string; first: boolean };
type Reply = { key: number; to: string; typing: boolean };
/** A message of the visitor's own chat with the owner, from /api/chat. */
type Mine = { id: number; owner: boolean; body: string; at: string; seen: boolean; fresh: boolean; react: string; pub: boolean; wall: boolean };

const COLORS = ["var(--pop2)", "var(--pop3)", "var(--mint)", "#f2c14e"];
export const tint = (name: string) => COLORS[Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const first = (name: string) => Array.from(name.trim())[0]?.toUpperCase() ?? "?";
/** How many of the newest notes pop in when the chat is first seen; older ones are above the fold of the thread anyway. */
const CASCADE = 8;
/** At most this many hearts and sparks float at once. */
const MAX_FX = 24;
const BURST = ["❤️", "✨", "💬", "🎉", "💌", "⭐"];
/** Notes on the Wall: paper colours and pins are materials, the same in every theme. */
const PAPER = ["#fff3a6", "#ffd6e5", "#cdeffd", "#d9f7c9", "#ffe0bf", "#e6dcff"];
const PINS = ["#e5484d", "#2b8ce6", "#f2b33d", "#2fbf71", "#9b6ef3"];
const TILT = [-3, 2.5, -1.5, 3, -2.5, 1.5];
const KEY_RE = /^[A-Za-z0-9_-]{20,64}$/;
const store = {
  get: (k: string) => { try { return localStorage.getItem(k) ?? ""; } catch { return ""; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private window: the chat lasts this visit */ } },
};
const newKey = () => {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[b & 63]).join("");
};
const dayOf = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/**
 * The chat half of the Connect section's window (ChatWindow). It's a private chat with the owner: the visitor's browser keeps a random key
 * (localStorage lc_chat) that goes with each message, and /api/chat gives back that conversation only, with the owner's replies, whether
 * they're around or typing, and which replies are new. The box is the same Say hello form (name, email, message, the wall tick, the key),
 * sent by the same server action, so without JavaScript it's an ordinary form. Approved notes live on the Wall: a button (pin badge, sticky tab
 * or cork button) opens a notice board (cork, fridge door, chalkboard or clothesline) over the chat, with testimonials, hearts and the owner's
 * public replies. With `live` (the chatfx switch) it moves like a real chat (see CLAUDE.md, "The chat comes alive").
 */
export default function ChatWall({ c, title, owner, avatar, initials, greet, emojis, notes, testi = [], plane, live, edit = false, boardOpen = false }: {
  c: ConnectDesign; title: string; owner: string; avatar: string; initials: string; greet: string[]; emojis: string[]; notes: ChatNote[]; testi?: WallPin[];
  plane: boolean; live: boolean; edit?: boolean; /** the editor shows the board open */ boardOpen?: boolean;
}) {
  const [state, action, pending] = useActionState(sendHello, undefined);
  const [outs, setOuts] = useState<Out[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [who, setWho] = useState({ name: "", email: "" });
  const [shown, setShown] = useState(greet.length);
  const [ownerTyping, setOwnerTyping] = useState(false);
  const [meTyping, setMeTyping] = useState(false);
  const [phase, setPhase] = useState<"" | "wait" | "go">("");
  const [tray, setTray] = useState(false);
  // the private chat
  const [key, setKey] = useState("");
  const [hasChat, setHasChat] = useState(false);
  const [mine, setMine] = useState<Mine[]>([]);
  const [online, setOnline] = useState(false);
  const [liveTyping, setLiveTyping] = useState(false);
  const [fresh, setFresh] = useState(0);
  const [inView, setInView] = useState(false);
  const [toastGone, setToastGone] = useState(false);
  const [copied, setCopied] = useState(false);
  // the Wall
  const [open, setOpen] = useState(boardOpen);
  const [hearted, setHearted] = useState<number[]>([]);
  const [heartN, setHeartN] = useState<Record<number, number>>({});
  const root = useRef<HTMLElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const nameBox = useRef<HTMLInputElement>(null);
  const send = useRef<HTMLButtonElement>(null);
  const fxBox = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const from = useRef<DOMRect | null>(null);
  const seen = useRef(state);
  const timers = useRef<number[]>([]);
  const typeTimer = useRef(0);
  const lastTap = useRef<{ t: number; el: Element | null }>({ t: 0, el: null });
  const keyRef = useRef("");
  const viewRef = useRef(false);
  const p = partFn(edit, c.parts);
  const on = (k: ConnectPiece) => !c.hide[k];
  const shownNotes = c.wallInChat ? notes : [];
  const wallCount = notes.length + (c.boardTesti ? testi.length : 0);

  const calm = () => prefersReducedMotion() || document.documentElement.classList.contains("lite");
  const moving = () => plane && !calm();
  const lively = () => live && !edit && !calm();
  const toEnd = () => { const t = thread.current; if (t) t.scrollTop = t.scrollHeight; };
  const later = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };

  useEffect(() => { toEnd(); return () => { timers.current.forEach(clearTimeout); clearTimeout(typeTimer.current); }; }, []);
  useEffect(() => { if (edit) setShown(greet.length); }, [edit, greet.length]);
  useEffect(() => { if (edit) setOpen(boardOpen); }, [edit, boardOpen]);

  // ---------- the private chat: the key, the conversation, and checking for replies ----------
  const fetchChat = async (look: boolean) => {
    const k = keyRef.current;
    if (!k || edit) return null;
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ k, look }) });
      if (!r.ok) return null;
      const d = (await r.json()) as { msgs: Mine[]; online: boolean; typing: boolean };
      setMine(d.msgs); setOnline(d.online); setLiveTyping(d.typing);
      const n = d.msgs.filter((m) => m.owner && m.fresh).length;
      setFresh(look ? 0 : n);
      return d;
    } catch { return null; }
  };
  useEffect(() => {
    if (edit) return;
    let k = store.get("lc_chat");
    // a chat link from another phone: #chat-<key>
    const m = /^#chat-([A-Za-z0-9_-]{20,64})$/.exec(location.hash);
    if (m) { k = m[1]; store.set("lc_chat", k); history.replaceState(null, "", location.pathname + location.search); later(700, () => root.current?.scrollIntoView({ behavior: "smooth", block: "center" })); }
    const had = KEY_RE.test(k);
    if (!had) k = newKey();
    keyRef.current = k; setKey(k); setHasChat(had);
    const nm = store.get("lc_chat_name");
    if (nm) { setWho((w) => ({ ...w, name: nm })); if (nameBox.current && !nameBox.current.value) nameBox.current.value = nm; }
    try { setHearted(JSON.parse(store.get("lc_hearts") || "[]").filter((x: unknown) => Number.isInteger(x))); } catch { /* none */ }
  }, [edit]);
  // is the chat on screen? (replies count as seen only then)
  useEffect(() => {
    const el = root.current;
    if (!el || edit) return;
    const io = new IntersectionObserver((es) => { const v = es.some((e) => e.isIntersecting && e.intersectionRatio > 0.3); viewRef.current = v; setInView(v); }, { threshold: [0, 0.3, 0.6] });
    io.observe(el);
    return () => io.disconnect();
  }, [edit]);
  // check for replies: every few seconds while the chat is on screen, less often otherwise, never while the tab is hidden
  useEffect(() => {
    if (!hasChat || edit) return;
    let stop = false, t = 0;
    const tick = async () => {
      if (stop) return;
      if (!document.hidden) await fetchChat(viewRef.current);
      if (!stop) t = window.setTimeout(tick, viewRef.current ? 5000 : 25000);
    };
    tick();
    const wake = () => { if (!document.hidden) { clearTimeout(t); tick(); } };
    document.addEventListener("visibilitychange", wake);
    return () => { stop = true; clearTimeout(t); document.removeEventListener("visibilitychange", wake); };
  }, [hasChat, edit]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (inView && fresh > 0) fetchChat(true); }, [inView]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- the arrival: the newest notes pop in, then the owner types each greeting bubble ----------
  useEffect(() => {
    if (!lively() || !root.current) return;
    const el = root.current;
    let played = false;
    const play = () => {
      played = true;
      timers.current.forEach(clearTimeout); timers.current = [];
      const n = Math.min(CASCADE, shownNotes.length);
      setPhase("go"); setShown(0);
      let at = 250 + n * 110;
      for (let i = 0; i < greet.length; i++) {
        const k = i;
        later(at, () => { if (on("typing")) setOwnerTyping(true); toEnd(); });
        at += on("typing") ? Math.min(1400, 600 + greet[k].length * 12) : 120;
        later(at, () => { setOwnerTyping(false); setShown(k + 1); });
        at += 260;
      }
      later(at + 700, () => setPhase(""));
    };
    const r = el.getBoundingClientRect();
    const inV = r.top < innerHeight * 0.8 && r.bottom > innerHeight * 0.2;
    if (!inV) { setPhase("wait"); setShown(0); }
    const io = new IntersectionObserver((es) => { if (!played && es.some((e) => e.isIntersecting && e.intersectionRatio > 0.3)) { io.disconnect(); play(); } }, { threshold: [0, 0.3, 0.6] });
    if (!inV) io.observe(el);
    const replay = () => { played = false; play(); };
    window.addEventListener("lc-chat-replay", replay);
    return () => { io.disconnect(); window.removeEventListener("lc-chat-replay", replay); };
  }, [live, edit]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const done = () => { setPhase(""); setShown(greet.length); setOwnerTyping(false); };
    window.addEventListener("lc-lite", done);
    return () => window.removeEventListener("lc-lite", done);
  }, [greet.length]);

  // ---------- what the server answered ----------
  useEffect(() => {
    if (state === seen.current || !state) return;
    seen.current = state;
    const last = [...outs].reverse().find((o) => o.phase === "sending");
    if (!last) return;
    const set = (ph: Out["phase"], error?: string) => setOuts((l) => l.map((o) => (o.key === last.key ? { ...o, phase: ph, error } : o)));
    if (state.error) { set("failed", state.error); return; }
    set("sent");
    // the message is now part of the chat: fetch it back, then the optimistic bubble steps aside for the real one
    later(500, async () => { const d = await fetchChat(viewRef.current); if (d) setOuts((l) => l.filter((o) => o.key !== last.key)); else set("inbox"); });
    if (on("autoreply") && last.first) {
      const typing = on("typing");
      later(1100, () => setReplies((r) => [...r, { key: last.key, to: last.name, typing }]));
      if (typing) later(2300, () => setReplies((r) => r.map((x) => (x.key === last.key ? { ...x, typing: false } : x))));
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- a new bubble lifts out of the box into its place ----------
  const lastKey = outs.at(-1)?.key;
  useLayoutEffect(() => {
    toEnd();
    const t = thread.current, rect = from.current;
    from.current = null;
    if (!t || !rect || !moving()) return;
    const els = t.querySelectorAll<HTMLElement>(".cw-msg.you.out p");
    const el = els[els.length - 1];
    if (!el) return;
    const to = el.getBoundingClientRect();
    el.animate([{ transform: `translate(${rect.left - to.left}px, ${rect.top - to.top}px) scale(.92)`, opacity: 0.3 }, { transform: "none", opacity: 1 }],
      { duration: 560, easing: "cubic-bezier(.2,.9,.25,1.15)" });
    send.current?.querySelector(".cw-plane")?.animate(
      [{ transform: "none", opacity: 1 }, { transform: "translate(30px,-30px) rotate(-10deg) scale(.8)", opacity: 0, offset: 0.45 }, { transform: "translate(-22px,22px)", opacity: 0, offset: 0.46 }, { transform: "none", opacity: 1 }],
      { duration: 1000, easing: "ease-in-out" });
  }, [lastKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { toEnd(); }, [outs, replies, shown, ownerTyping, meTyping, mine.length, liveTyping]);

  // ---------- small floating things: hearts on a double-tap, a burst on sending ----------
  const float = (x: number, y: number, chars: string[], spread: number) => {
    const holder = fxBox.current, base = root.current?.getBoundingClientRect();
    if (!holder || !base || calm()) return;
    for (const ch of chars) {
      if (holder.childElementCount >= MAX_FX) break;
      const s = document.createElement("i");
      s.textContent = ch;
      s.style.left = `${x - base.left}px`;
      s.style.top = `${y - base.top}px`;
      holder.appendChild(s);
      const dx = (Math.random() - 0.5) * spread, dy = -40 - Math.random() * spread;
      const a = s.animate([{ transform: "translate(-50%,-50%) scale(.4)", opacity: 0 }, { transform: `translate(calc(-50% + ${dx * 0.4}px), calc(-50% + ${dy * 0.4}px)) scale(1.15)`, opacity: 1, offset: 0.3 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.9) rotate(${dx / 3}deg)`, opacity: 0 }], { duration: 900 + Math.random() * 400, easing: "cubic-bezier(.2,.7,.3,1)" });
      a.onfinish = () => s.remove();
    }
  };
  const heart = (target: EventTarget | null, x: number, y: number) => {
    if (!live || edit || !on("hearts")) return;
    const bubble = (target as HTMLElement | null)?.closest?.(".cw-msg p:not(.cw-typing)");
    if (!bubble) return;
    bubble.classList.toggle("hearted");
    if (bubble.classList.contains("hearted")) float(x, y, ["❤️", "💖", "❤️"], 60);
  };
  const onTap = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    const now = performance.now(), el = (e.target as HTMLElement).closest(".cw-msg p");
    if (el && lastTap.current.el === el && now - lastTap.current.t < 320) { heart(e.target, e.clientX, e.clientY); lastTap.current = { t: 0, el: null }; }
    else lastTap.current = { t: now, el };
  };

  // ---------- the box ----------
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (edit) { e.preventDefault(); return; }
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim(), body = String(fd.get("message") ?? "").trim();
    setWho({ name: String(fd.get("name") ?? ""), email: String(fd.get("email") ?? "") });
    if (!name || body.length < 2 || pending) return; // the server explains what's missing
    // from now on this browser has a chat with the owner
    store.set("lc_chat", keyRef.current); store.set("lc_chat_name", name);
    setHasChat(true);
    from.current = box.current?.getBoundingClientRect() ?? null;
    setMeTyping(false); setTray(false);
    const isFirst = !mine.some((m) => !m.owner) && !outs.length;
    setOuts((l) => [...l, { key: Date.now(), name, body, pub: fd.get("public") === "on", phase: "sending", first: isFirst }]);
    window.dispatchEvent(new Event("lc-chat-sent")); // the visit receipt counts it
    if (live) { const r = send.current?.getBoundingClientRect(); if (r) float(r.left + r.width / 2, r.top + r.height / 2, BURST, 120); }
  };
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (!pending) e.currentTarget.form?.requestSubmit(); }
    if (e.key === "Escape" && tray) setTray(false);
  };
  const typed = () => {
    const has = !!box.current?.value.trim();
    send.current?.classList.toggle("ready", has);
    if (!live || edit || !on("typing")) return;
    if (has !== meTyping) setMeTyping(has);
    clearTimeout(typeTimer.current);
    if (has) typeTimer.current = window.setTimeout(() => setMeTyping(false), 1600);
  };
  const put = (text: string, replace = false) => {
    const t = box.current;
    if (!t) return;
    if (replace || !t.value.trim()) t.value = text;
    else { const at = t.selectionStart ?? t.value.length; t.setRangeText(text, at, t.selectionEnd ?? at, "end"); }
    t.focus();
    typed();
  };
  useEffect(() => {
    if (!tray) return;
    const close = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest?.(".cw-tray, .cw-emo")) setTray(false); };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [tray]);
  const copyLink = async () => {
    const url = `${location.origin}${location.pathname}#chat-${keyRef.current}`;
    try { await navigator.clipboard.writeText(url); } catch { window.prompt?.("Copy this link", url); }
    setCopied(true); later(5000, () => setCopied(false));
  };

  // ---------- the Wall ----------
  const openBoard = () => { if (edit) return; setOpen(true); setTray(false); };
  useEffect(() => {
    if (!open || edit) return;
    closeBtn.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.querySelector("dialog[open]")) setOpen(false); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, edit]);
  const toggleHeart = (n: ChatNote) => {
    if (edit) return;
    const was = hearted.includes(n.id);
    const next = was ? hearted.filter((x) => x !== n.id) : [...hearted, n.id];
    setHearted(next); store.set("lc_hearts", JSON.stringify(next.slice(-300)));
    if (!was) window.dispatchEvent(new Event("lc-heart"));
    setHeartN((h) => ({ ...h, [n.id]: Math.max(0, (h[n.id] ?? n.hearts ?? 0) + (was ? -1 : 1)) }));
    fetch("/api/chat/heart", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: n.id, on: !was }) })
      .then((r) => r.json()).then((d) => { if (d?.ok) setHeartN((h) => ({ ...h, [n.id]: d.hearts })); }).catch(() => {});
  };
  const wallBtn = (kind: string, inner: React.ReactNode) => (on("wallbtn") && c.wallBtn === kind
    ? <button type="button" className={`cw-wb cw-wb-${kind}`} onClick={openBoard} aria-haspopup="dialog" aria-expanded={open} aria-label={`Open the Wall: ${wallCount} notes`} {...p("cw-wb")}>{inner}</button>
    : null);
  const count = <span className="cw-count">{wallCount}</span>;

  const autoText = (to: string) => c.autoReply.replace(/\{name\}/gi, to) || `Got it, ${to}!`;
  const availLabel = AVAILS.find(([k]) => k === c.avail)![1];
  const anyTyping = ownerTyping || replies.some((r) => r.typing) || liveTyping;
  const ownerFace = <i className="cw-ini">{avatar ? <img src={avatar} alt="" loading="lazy" /> : initials}</i>;
  const blank = <i className="cw-ini cw-blank" aria-hidden />;
  const cascadeFrom = Math.max(0, shownNotes.length - CASCADE);
  const myName = who.name.trim() || "You";
  const lastMine = [...mine].reverse().find((m) => !m.owner);
  const firstFresh = mine.find((m) => m.owner && m.fresh)?.id;
  const portalTo = typeof document !== "undefined" ? document.querySelector(".site") : null;
  let lastDay = "", prevOwner: boolean | null = null;
  return (
    <section ref={root} className={`cw-main${phase ? ` cw-${phase}` : ""}`} aria-label={title}>
      <header className="cw-head" {...p("cw-head")}>
        <b>{title}</b>
        {on("headnote") && c.headNote && <span className="cw-hnote">{c.headNote}</span>}
        {wallBtn("badge", <><span className="cw-wb-pin" aria-hidden>📌</span>The Wall {count}</>)}
        {on("avail") && (
          <em className={`cw-hstat av-${online && !anyTyping ? "online" : c.avail}${anyTyping ? " typing" : ""}`} aria-live="polite">
            <i className="cw-dot" aria-hidden />{anyTyping ? `${owner} is typing…` : online ? "Online now" : availLabel}
          </em>
        )}
      </header>
      {wallBtn("tab", <><span aria-hidden>📌</span> The Wall {count}</>)}
      {wallBtn("fab", <><span aria-hidden>📌</span>{count}<span className="cw-wb-lbl">The Wall</span></>)}
      {fresh > 0 && c.badge && (
        <button type="button" className="cw-new" onClick={() => { const el = thread.current?.querySelector(`[data-id="${firstFresh}"]`); el?.scrollIntoView({ block: "center", behavior: "smooth" }); fetchChat(true); }}>
          {fresh} new {fresh === 1 ? "reply" : "replies"} from {owner} ↓
        </button>
      )}
      <div className="scrolly cw-thread" ref={thread} aria-live="polite" onDoubleClick={(e) => heart(e.target, e.clientX, e.clientY)} onPointerUp={onTap} {...p("cw-thread")}>
        <div className="cw-flow">
          {shownNotes.map((n, i) => {
            const day = on("days") && n.day !== lastDay ? n.day : "";
            lastDay = n.day;
            return (
              <div key={n.id} className={`cw-group${i >= cascadeFrom ? " cw-cas" : ""}`} style={i >= cascadeFrom ? ({ "--i": i - cascadeFrom } as React.CSSProperties) : undefined}>
                {day && <span className="cw-day">{day}</span>}
                <div className="cw-msg"><i className="cw-ini" style={{ "--c": tint(n.name) } as React.CSSProperties}>{first(n.name)}</i><div><span className="cw-by">{n.name}</span><p>{n.body}</p></div></div>
              </div>
            );
          })}
          {greet.slice(0, shown).map((g, i) => (
            <div key={`g${i}`} className={`cw-msg owner cw-greet${i > 0 ? " cont" : ""}`}>
              {i === 0 ? ownerFace : blank}
              <div>{i === 0 && <span className="cw-by">{owner}</span>}<p>{g}</p></div>
            </div>
          ))}
          {ownerTyping && <div className="cw-msg owner">{shown === 0 ? ownerFace : blank}<div><p className="cw-typing" aria-label={`${owner} is typing`}><i /><i /><i /></p></div></div>}
          {(() => { lastDay = ""; return null; })()}
          {mine.map((m) => {
            const day = on("days") ? dayOf(m.at) : "";
            const showDay = day && day !== lastDay;
            lastDay = day || lastDay;
            const cont = prevOwner === m.owner && !showDay;
            prevOwner = m.owner;
            return (
              <div key={m.id} className="cw-group" data-id={m.id}>
                {showDay && <span className="cw-day">{day}</span>}
                {m.owner ? (
                  <div className={`cw-msg owner${cont ? " cont" : ""}${m.fresh ? " cw-fresh" : ""}`}>
                    {cont ? blank : ownerFace}
                    <div>{!cont && <span className="cw-by">{owner}</span>}<p>{m.body}</p></div>
                  </div>
                ) : (
                  <div className={`cw-msg you${cont ? " cont" : ""}`}>
                    {cont ? blank : <i className="cw-ini" style={{ "--c": tint(myName) } as React.CSSProperties}>{first(myName)}</i>}
                    <div>
                      {!cont && <span className="cw-by">{myName}</span>}
                      <p className={m.react ? "reacted" : undefined} data-r={m.react || undefined}>{m.body}</p>
                      {m === lastMine && <span className={`cw-st${m.seen ? " read" : ""}`}>{m.seen ? `✓✓ Seen by ${owner}` : "✓✓ Delivered"}</span>}
                      {m === lastMine && (m.pub || m.wall) && <span className={`cw-tag${m.wall ? " on" : ""}`}>{m.wall ? "📌 On the Wall" : `⏳ Goes on the Wall once ${owner} approves it`}</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {outs.map((o) => {
            const reply = replies.find((r) => r.key === o.key);
            return (
              <div key={o.key} className="cw-group">
                <div className={`cw-msg you out${o.phase === "failed" ? " failed" : ""}`}>
                  <i className="cw-ini" style={{ "--c": tint(o.name) } as React.CSSProperties}>{first(o.name)}</i>
                  <div>
                    <span className="cw-by">{o.name}</span>
                    <p>{o.body}</p>
                    <span className="cw-st">{o.phase === "sending" ? "Sending…" : o.phase === "failed" ? `Not sent: ${o.error}` : "✓ Sent"}</span>
                  </div>
                </div>
                {reply && <AutoReply reply={reply} face={ownerFace} owner={owner} text={autoText(reply.to)} />}
              </div>
            );
          })}
          {replies.filter((r) => !outs.some((o) => o.key === r.key)).map((r) => <AutoReply key={r.key} reply={r} face={ownerFace} owner={owner} text={autoText(r.to)} />)}
          {liveTyping && !ownerTyping && <div className="cw-msg owner">{ownerFace}<div><p className="cw-typing" aria-label={`${owner} is typing`}><i /><i /><i /></p></div></div>}
          {meTyping && <div className="cw-msg you cw-mt"><div><p className="cw-typing" aria-label="You're typing"><i /><i /><i /></p></div></div>}
        </div>
      </div>
      <form action={edit ? undefined : action} onSubmit={onSubmit} className="cw-form" {...p("cw-form")}>
        {on("quick") && c.quick.length > 0 && outs.length === 0 && !mine.length && (
          <div className="cw-quick" role="group" aria-label="Quick starters" data-lenis-prevent {...p("cw-quick")}>
            {c.quick.map((q, i) => <button key={i} type="button" style={{ "--i": i } as React.CSSProperties} onClick={() => put(q, true)}>{q}</button>)}
          </div>
        )}
        <div className="cw-from">
          <label className="sr-only" htmlFor="cw-name">Your name</label>
          <input ref={nameBox} id="cw-name" name="name" placeholder={c.namePh || "Your name"} required maxLength={80} autoComplete="name" defaultValue={state?.values?.name ?? who.name} readOnly={edit} />
          {on("email") && <>
            <label className="sr-only" htmlFor="cw-email">Email</label>
            <input id="cw-email" name="email" type="email" placeholder={c.emailPh || "Email"} maxLength={160} autoComplete="email" defaultValue={state?.values?.email ?? who.email} readOnly={edit} />
          </>}
        </div>
        <div className="hp" aria-hidden><input name="website" tabIndex={-1} autoComplete="off" /></div>
        <input type="hidden" name="conv" value={key} />
        <div className="cw-row">
          {on("wall") && <label className="cw-wall" title={`Shows it on the public Wall once ${owner} approves it`}><input type="checkbox" name="public" /><span>📌<em> {c.wallLabel}</em></span></label>}
          {on("emoji") && emojis.length > 0 && (
            <button type="button" className={`cw-emo${tray ? " on" : ""}`} aria-label="Add an emoji" aria-expanded={tray} onClick={() => setTray((t) => !t)}>😊</button>
          )}
          {tray && (
            <div className="cw-tray" role="dialog" aria-label="Emojis" data-lenis-prevent>
              {emojis.map((em, i) => <button key={i} type="button" style={{ "--i": i } as React.CSSProperties} onClick={() => put(em)}>{em}</button>)}
            </div>
          )}
          <label className="sr-only" htmlFor="cw-message">Your message</label>
          <textarea id="cw-message" ref={box} name="message" rows={1} placeholder={c.msgPh || "What’s on your mind?"} required maxLength={2000} onKeyDown={onKey} onInput={typed} defaultValue={state?.values?.message ?? ""} readOnly={edit} />
          <button ref={send} className={`cw-send${pending ? " busy" : ""}`} aria-label="Send" disabled={pending}>
            <svg className="cw-ring" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="27" /></svg>
            <svg className="cw-plane" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 21 3l-8 18-2-8z" /></svg>
          </button>
        </div>
        {c.chatLink && hasChat && mine.length > 0 && (
          <button type="button" className="cw-link-copy" onClick={copyLink}>{copied ? "✓ Link copied. Keep it private: anyone with it can read this chat." : "🔗 Continue this chat on another phone"}</button>
        )}
        {state?.error && !outs.some((o) => o.phase === "failed") && <p className="err">{state.error}</p>}
      </form>

      {on("wallbtn") && (
        <div className={`cw-board bd-${c.board} wb-${c.wallBtn}${open ? " open" : ""}`} role="dialog" aria-label="The Wall" aria-hidden={!open} inert={!open || undefined} {...(open ? p("cw-board") : {})}>
          <div className="cw-bd-top">
            <b>📌 The Wall</b><small>{wallCount ? `${wallCount} ${wallCount === 1 ? "note" : "notes"} ${owner} pinned` : "Nothing pinned yet"}</small>
            <button ref={closeBtn} type="button" onClick={() => setOpen(false)}>Back to chat</button>
          </div>
          <div className="cw-bd-area" data-lenis-prevent>
            {wallCount === 0 && <p className="cw-bd-empty">No notes on the Wall yet. Tick 📌 when you write, and yours could be the first.</p>}
            {notes.slice().reverse().map((n, i) => {
              const h = heartN[n.id] ?? n.hearts ?? 0, mineH = hearted.includes(n.id);
              return (
                <div key={n.id} className="cw-nt" style={{ "--i": i, "--r": `${TILT[i % TILT.length]}deg`, "--c": PAPER[i % PAPER.length], "--pin": PINS[i % PINS.length] } as React.CSSProperties} data-m={first(n.name)}>
                  <p>{n.body}</p>
                  <span className="cw-nt-who">{n.name}{n.day ? ` · ${n.day}` : ""}</span>
                  {c.boardReply && n.reply && <span className="cw-nt-rp"><b>↪ {owner}:</b> {n.reply}</span>}
                  {c.boardHearts && <button type="button" className={`cw-nt-heart${mineH ? " on" : ""}`} aria-pressed={mineH} aria-label={mineH ? "Take back your heart" : "Heart this note"} onClick={() => toggleHeart(n)}>{mineH ? "❤️" : "🤍"}{h > 0 && <b>{h}</b>}</button>}
                </div>
              );
            })}
            {c.boardTesti && testi.map((t, j) => {
              const i = notes.length + j;
              return (
                <a key={`t${t.id}`} className="cw-nt tm" href={edit ? undefined : t.href} style={{ "--i": i, "--r": `${TILT[i % TILT.length]}deg`, "--c": PAPER[i % PAPER.length], "--pin": PINS[i % PINS.length] } as React.CSSProperties} data-m="★">
                  <p>{t.body}</p>
                  <span className="cw-nt-who">⭐ {t.by || t.title}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}
      <div className="cw-fx" ref={fxBox} aria-hidden />
      {portalTo && !edit && fresh > 0 && c.badge && !inView && !toastGone && createPortal(
        <div className="cw-toast" role="status">
          <button type="button" className="cw-toast-go" onClick={() => { const el = root.current; const lenis = (window as unknown as { __lenis?: { scrollTo(t: HTMLElement, o?: object): void } }).__lenis; if (el) { if (lenis) lenis.scrollTo(el, { offset: -120 }); else el.scrollIntoView({ behavior: "smooth", block: "center" }); } }}>
            <i className="cw-ini">{avatar ? <img src={avatar} alt="" /> : initials}</i>
            <span><b>{owner} replied to you</b><small>{fresh} new {fresh === 1 ? "message" : "messages"} · tap to read</small></span>
          </button>
          <button type="button" className="cw-toast-x" aria-label="Hide" onClick={() => setToastGone(true)}>×</button>
        </div>, portalTo)}
    </section>
  );
}

function AutoReply({ reply, face, owner, text }: { reply: Reply; face: React.ReactNode; owner: string; text: string }) {
  return (
    <div className="cw-msg owner">
      {face}
      <div>
        {reply.typing
          ? <p className="cw-typing" aria-label={`${owner} is typing`}><i /><i /><i /></p>
          : <><p>{text}</p><span className="cw-st">Automatic reply</span></>}
      </div>
    </div>
  );
}
