"use client";
import { useActionState, useEffect, useLayoutEffect, useRef, useState } from "react";
import { sendHello } from "@/app/actions";
import { prefersReducedMotion } from "./fx";

export type ChatNote = { id: number; name: string; body: string; day: string };
type Out = { key: number; name: string; body: string; pub: boolean; phase: "sending" | "sent" | "inbox" | "failed"; error?: string };
type Reply = { key: number; to: string; typing: boolean };

const COLORS = ["var(--pop2)", "var(--pop3)", "var(--mint)", "#f2c14e"];
export const tint = (name: string) => COLORS[Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const first = (name: string) => Array.from(name.trim())[0]?.toUpperCase() ?? "?";

/**
 * The chat half of a Connect section laid out as Chat window: the notes the owner approved are the history, and the box at the bottom is the
 * same Say hello form (name, email for a reply, message, and the wall tick), sent by the same server action. A sent message appears at once as
 * the visitor's own bubble, its ticks follow what the server answers, and a short automatic reply says it arrived, marked as automatic.
 * With the paper plane switch on, the message lifts out of the box into the chat and a plane takes off from the send button.
 * Without JavaScript it's an ordinary form, and the page reloads with the answer.
 */
export default function ChatWall({ title, owner, avatar, initials, notes, plane }:
  { title: string; owner: string; avatar: string; initials: string; notes: ChatNote[]; plane: boolean }) {
  const [state, action, pending] = useActionState(sendHello, undefined);
  const [outs, setOuts] = useState<Out[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [who, setWho] = useState({ name: "", email: "" });
  const thread = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const send = useRef<HTMLButtonElement>(null);
  const from = useRef<DOMRect | null>(null);
  const seen = useRef(state);
  const timers = useRef<number[]>([]);

  const moving = () => plane && !prefersReducedMotion() && !document.documentElement.classList.contains("lite");
  const toEnd = () => { const t = thread.current; if (t) t.scrollTop = t.scrollHeight; };
  const later = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };

  // the newest note and the greeting sit just above the box, as in any chat
  useEffect(() => { toEnd(); return () => timers.current.forEach(clearTimeout); }, []);

  // what the server answered
  useEffect(() => {
    if (state === seen.current || !state) return;
    seen.current = state;
    const last = [...outs].reverse().find((o) => o.phase === "sending");
    if (!last) return;
    const set = (phase: Out["phase"], error?: string) => setOuts((l) => l.map((o) => (o.key === last.key ? { ...o, phase, error } : o)));
    if (state.error) { set("failed", state.error); return; }
    set("sent");
    later(650, () => set("inbox"));
    later(1100, () => setReplies((r) => [...r, { key: last.key, to: last.name, typing: true }]));
    later(2200, () => setReplies((r) => r.map((x) => (x.key === last.key ? { ...x, typing: false } : x))));
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  // a new bubble lifts out of the box into its place
  const lastKey = outs.at(-1)?.key;
  useLayoutEffect(() => {
    toEnd();
    const t = thread.current, rect = from.current;
    from.current = null;
    if (!t || !rect || !moving()) return;
    const mine = t.querySelectorAll<HTMLElement>(".cw-msg.you p");
    const p = mine[mine.length - 1];
    if (!p) return;
    const to = p.getBoundingClientRect();
    p.animate([{ transform: `translate(${rect.left - to.left}px, ${rect.top - to.top}px) scale(.92)`, opacity: 0.3 }, { transform: "none", opacity: 1 }],
      { duration: 560, easing: "cubic-bezier(.2,.9,.25,1.15)" });
    send.current?.querySelector(".cw-plane")?.animate(
      [{ transform: "none", opacity: 1 }, { transform: "translate(30px,-30px) rotate(-10deg) scale(.8)", opacity: 0, offset: 0.45 }, { transform: "translate(-22px,22px)", opacity: 0, offset: 0.46 }, { transform: "none", opacity: 1 }],
      { duration: 1000, easing: "ease-in-out" });
  }, [lastKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { toEnd(); }, [outs, replies]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim(), body = String(fd.get("message") ?? "").trim();
    setWho({ name: String(fd.get("name") ?? ""), email: String(fd.get("email") ?? "") });
    if (!name || body.length < 2 || pending) return; // the server explains what's missing
    from.current = box.current?.getBoundingClientRect() ?? null;
    setOuts((l) => [...l, { key: Date.now(), name, body, pub: fd.get("public") === "on", phase: "sending" }]);
  };
  // Enter sends, Shift+Enter starts a new line
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (!pending) e.currentTarget.form?.requestSubmit(); }
  };

  let lastDay = "";
  return (
    <section className="cw-main" aria-label={title}>
      <header className="cw-head"><b>{title}</b><span>🌍 The wall: notes {owner} approved, for everyone to read</span></header>
      <div className="scrolly cw-thread" ref={thread} aria-live="polite">
        <div className="cw-flow">
          {notes.length === 0 && <span className="cw-day">No notes on the wall yet. Yours could be the first.</span>}
          {notes.map((n) => {
            const day = n.day !== lastDay ? n.day : "";
            lastDay = n.day;
            return (
              <div key={n.id} className="cw-group">
                {day && <span className="cw-day">{day}</span>}
                <div className="cw-msg"><i className="cw-ini" style={{ "--c": tint(n.name) } as React.CSSProperties}>{first(n.name)}</i><div><span className="cw-who">{n.name}</span><p>{n.body}</p></div></div>
              </div>
            );
          })}
          <div className="cw-msg owner">
            <i className="cw-ini">{avatar ? <img src={avatar} alt="" loading="lazy" /> : initials}</i>
            <div><span className="cw-who">{owner}</span><p>{title}</p><p>Write anything below. I read every message.</p></div>
          </div>
          {outs.map((o) => {
            const reply = replies.find((r) => r.key === o.key);
            return (
              <div key={o.key} className="cw-group">
                <div className={`cw-msg you${o.phase === "failed" ? " failed" : ""}`}>
                  <i className="cw-ini" style={{ "--c": tint(o.name) } as React.CSSProperties}>{first(o.name)}</i>
                  <div>
                    <span className="cw-who">{o.name}</span>
                    <p>{o.body}</p>
                    <span className={`cw-st${o.phase === "inbox" ? " read" : ""}`}>
                      {o.phase === "sending" ? "Sending…" : o.phase === "sent" ? "✓ Sent" : o.phase === "inbox" ? `✓✓ In ${owner}’s inbox` : `Not sent: ${o.error}`}
                    </span>
                    {o.phase === "inbox" && <span className={`cw-tag${o.pub ? "" : " priv"}`}>{o.pub ? `⏳ Goes on the wall once ${owner} approves it` : `🔒 Only ${owner} will see this`}</span>}
                  </div>
                </div>
                {reply && (
                  <div className="cw-msg owner">
                    <i className="cw-ini">{avatar ? <img src={avatar} alt="" /> : initials}</i>
                    <div>
                      {reply.typing
                        ? <p className="cw-typing" aria-label={`${owner} is typing`}><i /><i /><i /></p>
                        : <><p>Got it, {reply.to}! 🙌 I’ll read it soon.</p><span className="cw-st">Automatic reply</span></>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <form action={action} onSubmit={onSubmit} className="cw-form">
        <div className="cw-from">
          <label className="sr-only" htmlFor="cw-name">Your name</label>
          <input id="cw-name" name="name" placeholder="Your name" required maxLength={80} autoComplete="name" defaultValue={state?.values?.name ?? who.name} />
          <label className="sr-only" htmlFor="cw-email">Email</label>
          <input id="cw-email" name="email" type="email" placeholder="Email, if you’d like a reply" maxLength={160} autoComplete="email" defaultValue={state?.values?.email ?? who.email} />
        </div>
        <div className="hp" aria-hidden><input name="website" tabIndex={-1} autoComplete="off" /></div>
        <div className="cw-row">
          <label className="cw-wall" title={`Shows it on the public wall once ${owner} approves it`}><input type="checkbox" name="public" /><span>📌<em> Pin on the wall</em></span></label>
          <label className="sr-only" htmlFor="cw-message">Your message</label>
          <textarea id="cw-message" ref={box} name="message" rows={1} placeholder="What’s on your mind?" required maxLength={2000} onKeyDown={onKey} defaultValue={state?.values?.message ?? ""} />
          <button ref={send} className={`cw-send${pending ? " busy" : ""}`} aria-label="Send" disabled={pending}>
            <svg className="cw-ring" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="27" /></svg>
            <svg className="cw-plane" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 21 3l-8 18-2-8z" /></svg>
          </button>
        </div>
        {state?.error && !outs.some((o) => o.phase === "failed") && <p className="err">{state.error}</p>}
      </form>
    </section>
  );
}
