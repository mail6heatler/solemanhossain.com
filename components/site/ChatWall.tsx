"use client";
import { useActionState, useEffect, useLayoutEffect, useRef, useState } from "react";
import { sendHello } from "@/app/actions";
import type { ConnectDesign, ConnectPiece } from "@/lib/connectLook";
import { AVAILS } from "@/lib/connectLook";
import { prefersReducedMotion } from "./fx";
import { partFn } from "./cardParts";

export type ChatNote = { id: number; name: string; body: string; day: string };
type Out = { key: number; name: string; body: string; pub: boolean; phase: "sending" | "sent" | "inbox" | "failed"; error?: string };
type Reply = { key: number; to: string; typing: boolean };

const COLORS = ["var(--pop2)", "var(--pop3)", "var(--mint)", "#f2c14e"];
export const tint = (name: string) => COLORS[Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const first = (name: string) => Array.from(name.trim())[0]?.toUpperCase() ?? "?";
/** How many of the newest notes pop in when the chat is first seen; older ones are above the fold of the thread anyway. */
const CASCADE = 8;
/** At most this many hearts and sparks float at once. */
const MAX_FX = 24;
const BURST = ["❤️", "✨", "💬", "🎉", "💌", "⭐"];

/**
 * The chat half of the Connect section's window (ChatWindow): the notes the owner approved are the history, then the owner's greeting bubbles,
 * then the box: the same Say hello form (name, email for a reply, message, and the wall tick), sent by the same server action, so without
 * JavaScript it's an ordinary form. A sent message appears at once as the visitor's own bubble, its ticks follow what the server answers, and the
 * owner's automatic reply (settings.connect.autoReply, {name} filled in) follows, marked as automatic.
 * With `live` (the chatfx switch) it moves like a real chat: the newest notes pop in when it's first seen, typing dots come before each greeting
 * bubble, the visitor's own typing bubble shows while they type, a double-tap hearts a bubble and sending sets off a small burst. Every one of those
 * starts from what's already drawn, so nothing waits on JavaScript to be seen. With the paper plane switch the message lifts out of the box.
 */
export default function ChatWall({ c, title, owner, avatar, initials, greet, emojis, notes, plane, live, edit = false }: {
  c: ConnectDesign; title: string; owner: string; avatar: string; initials: string; greet: string[]; emojis: string[]; notes: ChatNote[];
  plane: boolean; live: boolean; edit?: boolean;
}) {
  const [state, action, pending] = useActionState(sendHello, undefined);
  const [outs, setOuts] = useState<Out[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [who, setWho] = useState({ name: "", email: "" });
  /** how many greeting bubbles show; all of them until the arrival plays */
  const [shown, setShown] = useState(greet.length);
  const [ownerTyping, setOwnerTyping] = useState(false);
  const [meTyping, setMeTyping] = useState(false);
  const [phase, setPhase] = useState<"" | "wait" | "go">("");
  const [tray, setTray] = useState(false);
  const root = useRef<HTMLElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const send = useRef<HTMLButtonElement>(null);
  const fxBox = useRef<HTMLDivElement>(null);
  const from = useRef<DOMRect | null>(null);
  const seen = useRef(state);
  const timers = useRef<number[]>([]);
  const typeTimer = useRef(0);
  const lastTap = useRef<{ t: number; el: Element | null }>({ t: 0, el: null });
  const p = partFn(edit, c.parts);
  const on = (k: ConnectPiece) => !c.hide[k];

  const calm = () => prefersReducedMotion() || document.documentElement.classList.contains("lite");
  const moving = () => plane && !calm();
  const lively = () => live && !edit && !calm();
  const toEnd = () => { const t = thread.current; if (t) t.scrollTop = t.scrollHeight; };
  const later = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };

  // the newest note and the greeting sit just above the box, as in any chat
  useEffect(() => { toEnd(); return () => { timers.current.forEach(clearTimeout); clearTimeout(typeTimer.current); }; }, []);
  // the editor changes the greeting as it's typed: show all of it there
  useEffect(() => { if (edit) setShown(greet.length); }, [edit, greet.length]);

  // ---------- the arrival: the newest notes pop in, then the owner types each greeting bubble ----------
  useEffect(() => {
    if (!lively() || !root.current) return;
    const el = root.current;
    let played = false;
    const play = () => {
      played = true;
      timers.current.forEach(clearTimeout); timers.current = [];
      const n = Math.min(CASCADE, notes.length);
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
    const inView = r.top < innerHeight * 0.8 && r.bottom > innerHeight * 0.2;
    if (!inView) { setPhase("wait"); setShown(0); }
    const io = new IntersectionObserver((es) => { if (!played && es.some((e) => e.isIntersecting && e.intersectionRatio > 0.3)) { io.disconnect(); play(); } }, { threshold: [0, 0.3, 0.6] });
    if (!inView) io.observe(el);
    const replay = () => { played = false; play(); };
    window.addEventListener("lc-chat-replay", replay);
    return () => { io.disconnect(); window.removeEventListener("lc-chat-replay", replay); };
  }, [live, edit]); // eslint-disable-line react-hooks/exhaustive-deps

  // a slow device that turns light mid-visit: show everything at once
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
    later(650, () => set("inbox"));
    if (on("autoreply")) {
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
    const mine = t.querySelectorAll<HTMLElement>(".cw-msg.you:not(.cw-mt) p");
    const el = mine[mine.length - 1];
    if (!el) return;
    const to = el.getBoundingClientRect();
    el.animate([{ transform: `translate(${rect.left - to.left}px, ${rect.top - to.top}px) scale(.92)`, opacity: 0.3 }, { transform: "none", opacity: 1 }],
      { duration: 560, easing: "cubic-bezier(.2,.9,.25,1.15)" });
    send.current?.querySelector(".cw-plane")?.animate(
      [{ transform: "none", opacity: 1 }, { transform: "translate(30px,-30px) rotate(-10deg) scale(.8)", opacity: 0, offset: 0.45 }, { transform: "translate(-22px,22px)", opacity: 0, offset: 0.46 }, { transform: "none", opacity: 1 }],
      { duration: 1000, easing: "ease-in-out" });
  }, [lastKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { toEnd(); }, [outs, replies, shown, ownerTyping, meTyping]);

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
    if (e.pointerType === "mouse") return; // a mouse double-clicks
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
    from.current = box.current?.getBoundingClientRect() ?? null;
    setMeTyping(false); setTray(false);
    setOuts((l) => [...l, { key: Date.now(), name, body, pub: fd.get("public") === "on", phase: "sending" }]);
    if (live) { const r = send.current?.getBoundingClientRect(); if (r) float(r.left + r.width / 2, r.top + r.height / 2, BURST, 120); }
  };
  // Enter sends, Shift+Enter starts a new line
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

  const autoText = (to: string) => c.autoReply.replace(/\{name\}/gi, to) || `Got it, ${to}!`;
  const availLabel = AVAILS.find(([k]) => k === c.avail)![1];
  const anyReplyTyping = replies.some((r) => r.typing);
  const ownerFace = <i className="cw-ini">{avatar ? <img src={avatar} alt="" loading="lazy" /> : initials}</i>;
  const cascadeFrom = Math.max(0, notes.length - CASCADE);
  let lastDay = "";
  return (
    <section ref={root} className={`cw-main${phase ? ` cw-${phase}` : ""}`} aria-label={title}>
      <header className="cw-head" {...p("cw-head")}>
        <b>{title}</b>
        {on("headnote") && c.headNote && <span className="cw-hnote">{c.headNote}</span>}
        {on("avail") && (
          <em className={`cw-hstat av-${c.avail}${ownerTyping || anyReplyTyping ? " typing" : ""}`} aria-live="polite">
            <i className="cw-dot" aria-hidden />{ownerTyping || anyReplyTyping ? `${owner} is typing…` : availLabel}
          </em>
        )}
      </header>
      <div className="scrolly cw-thread" ref={thread} aria-live="polite" onDoubleClick={(e) => heart(e.target, e.clientX, e.clientY)} onPointerUp={onTap} {...p("cw-thread")}>
        <div className="cw-flow">
          {notes.length === 0 && <span className="cw-day">No notes on the wall yet. Yours could be the first.</span>}
          {notes.map((n, i) => {
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
              {i === 0 ? ownerFace : <i className="cw-ini cw-blank" aria-hidden />}
              <div>{i === 0 && <span className="cw-by">{owner}</span>}<p>{g}</p></div>
            </div>
          ))}
          {ownerTyping && <div className="cw-msg owner">{shown === 0 ? ownerFace : <i className="cw-ini cw-blank" aria-hidden />}<div><p className="cw-typing" aria-label={`${owner} is typing`}><i /><i /><i /></p></div></div>}
          {outs.map((o) => {
            const reply = replies.find((r) => r.key === o.key);
            return (
              <div key={o.key} className="cw-group">
                <div className={`cw-msg you${o.phase === "failed" ? " failed" : ""}`}>
                  <i className="cw-ini" style={{ "--c": tint(o.name) } as React.CSSProperties}>{first(o.name)}</i>
                  <div>
                    <span className="cw-by">{o.name}</span>
                    <p>{o.body}</p>
                    <span className={`cw-st${o.phase === "inbox" ? " read" : ""}`}>
                      {o.phase === "sending" ? "Sending…" : o.phase === "sent" ? "✓ Sent" : o.phase === "inbox" ? `✓✓ In ${owner}’s inbox` : `Not sent: ${o.error}`}
                    </span>
                    {o.phase === "inbox" && <span className={`cw-tag${o.pub ? "" : " priv"}`}>{o.pub ? `⏳ Goes on the wall once ${owner} approves it` : `🔒 Only ${owner} will see this`}</span>}
                  </div>
                </div>
                {reply && (
                  <div className="cw-msg owner">
                    {ownerFace}
                    <div>
                      {reply.typing
                        ? <p className="cw-typing" aria-label={`${owner} is typing`}><i /><i /><i /></p>
                        : <><p>{autoText(reply.to)}</p><span className="cw-st">Automatic reply</span></>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {meTyping && <div className="cw-msg you cw-mt"><div><p className="cw-typing" aria-label="You're typing"><i /><i /><i /></p></div></div>}
        </div>
      </div>
      <form action={edit ? undefined : action} onSubmit={onSubmit} className="cw-form" {...p("cw-form")}>
        {on("quick") && c.quick.length > 0 && outs.length === 0 && (
          <div className="cw-quick" role="group" aria-label="Quick starters" {...p("cw-quick")}>
            {c.quick.map((q, i) => <button key={i} type="button" style={{ "--i": i } as React.CSSProperties} onClick={() => put(q, true)}>{q}</button>)}
          </div>
        )}
        <div className="cw-from">
          <label className="sr-only" htmlFor="cw-name">Your name</label>
          <input id="cw-name" name="name" placeholder={c.namePh || "Your name"} required maxLength={80} autoComplete="name" defaultValue={state?.values?.name ?? who.name} readOnly={edit} />
          {on("email") && <>
            <label className="sr-only" htmlFor="cw-email">Email</label>
            <input id="cw-email" name="email" type="email" placeholder={c.emailPh || "Email"} maxLength={160} autoComplete="email" defaultValue={state?.values?.email ?? who.email} readOnly={edit} />
          </>}
        </div>
        <div className="hp" aria-hidden><input name="website" tabIndex={-1} autoComplete="off" /></div>
        <div className="cw-row">
          {on("wall") && <label className="cw-wall" title={`Shows it on the public wall once ${owner} approves it`}><input type="checkbox" name="public" /><span>📌<em> {c.wallLabel}</em></span></label>}
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
        {state?.error && !outs.some((o) => o.phase === "failed") && <p className="err">{state.error}</p>}
      </form>
      <div className="cw-fx" ref={fxBox} aria-hidden />
    </section>
  );
}
