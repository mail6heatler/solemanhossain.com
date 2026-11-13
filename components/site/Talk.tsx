"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { COMMENT_MAX } from "@/lib/talk";
import { burst } from "./fx";
import { askName, savedName } from "./askName";
import type { PartAttrs } from "./cardParts";

type Comment = { id: number; name: string; body: string; reply: string; pinned: boolean; at: string };
type Answer = { comments?: Comment[]; owner?: string; error?: string };

// The reaction box's name is only for the owner, but a comment's shows beside it, so this says so
const WORDS = { title: "Who's commenting?", why: "Your name shows next to your comment, and you only have to type it once.", ok: "Post it" };

const ago = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

/** Tells every bar for this entry how many comments it now has. */
const tellCount = (id: number, count: number) => window.dispatchEvent(new CustomEvent("lc-talk", { detail: { id, count } }));

/** The box you type in. A new comment rises from it, unless that's switched off. */
function Say({ id, float, big, onPosted }: { id: number; float: boolean; big?: boolean; onPosted: (a: Answer) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [fly, setFly] = useState<{ text: string; n: number } | null>(null);
  const [who, setWho] = useState("");
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const named = () => setWho(savedName());
    named();
    window.addEventListener("lc-name", named);
    return () => window.removeEventListener("lc-name", named);
  }, []);

  const post = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setNote("");
    try {
      const name = savedName() || (await askName("💬", WORDS));
      if (!name) return; // they closed the box: nothing is posted, and what they wrote stays
      const r = await fetch("/api/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, body, name }) });
      const a: Answer = await r.json();
      if (!r.ok) { setNote(a.error ?? "That didn't work. Try again."); return; }
      setText("");
      if (float) {
        setFly((f) => ({ text: body, n: (f?.n ?? 0) + 1 }));
        const b = button.current?.getBoundingClientRect();
        if (b) burst(b.left + b.width / 2, b.top, ["💬", "✨"], 8, 70);
      }
      onPosted(a);
    } catch {
      setNote("That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  };
  const field = {
    value: text,
    maxLength: COMMENT_MAX,
    placeholder: who ? `Say something as ${who}…` : "Say something…",
    "aria-label": "Your comment",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setText(e.target.value); setNote(""); },
  };
  return (
    <form className={`talk-say${big ? " big" : ""}`} onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); post(); }}>
      {big
        ? <textarea {...field} rows={2} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); post(); } }} />
        : <input {...field} type="text" />}
      <button ref={button} className="talk-send" aria-label="Post your comment" disabled={busy || !text.trim()}><i className="ti ti-send" aria-hidden="true" /></button>
      {note && <span className="talk-note" role="status">{note}</span>}
      {fly && <span key={fly.n} className="talk-fly" aria-hidden="true" onAnimationEnd={() => setFly(null)}>{fly.text}</span>}
      {big && who && <button type="button" className="talk-as" onClick={() => askName("💬", WORDS)} title="Change your name">as {who} <i className="ti ti-pencil" aria-hidden="true" /></button>}
    </form>
  );
}

/** The comments, pinned first and then newest first, with the box above them: under the emojis on an entry's page, and in the card's pop-up. */
export function TalkPanel({ id, float, attrs }: { id: number; float: boolean; attrs?: PartAttrs }) {
  const [list, setList] = useState<Comment[] | null>(null);
  const [owner, setOwner] = useState("");
  useEffect(() => {
    let live = true;
    fetch(`/api/comments?id=${id}`).then((r) => r.json()).then((a: Answer) => { if (live) { setList(a.comments ?? []); setOwner(a.owner ?? ""); } }).catch(() => { if (live) setList([]); });
    return () => { live = false; };
  }, [id]);
  return (
    <div className="talk-panel" {...attrs}>
      <Say id={id} float={float} big onPosted={(a) => { if (a.comments) { setList(a.comments); tellCount(id, a.comments.length); } }} />
      <ul className="talk-list">
        {list === null && <li className="talk-none">Loading…</li>}
        {list?.length === 0 && <li className="talk-none">Nobody has said anything yet. Be the first!</li>}
        {list?.map((c, i) => (
          <li key={c.id} className={`talk-c${c.pinned ? " pinned" : ""}`} style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
            <div className="talk-who"><b>{c.name}</b><span>{ago(c.at)}</span>{c.pinned && <span className="talk-pin"><i className="ti ti-pin" aria-hidden="true" /> Pinned</span>}</div>
            <p>{c.body}</p>
            {c.reply && <div className="talk-reply"><b>{owner} replied</b><p>{c.reply}</p></div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** All of an entry's comments, opened from a card. Native, so it sits above everything, and it lives in `.site` so the card's own colours don't reach it. */
function TalkDialog({ id, float, onClose }: { id: number; float: boolean; onClose: () => void }) {
  const box = useRef<HTMLDialogElement>(null);
  const [home, setHome] = useState<Element | null>(null);
  useEffect(() => { setHome(document.querySelector(".site") ?? document.body); }, []);
  useEffect(() => { if (home) box.current?.showModal(); }, [home]);
  if (!home) return null;
  return createPortal(
    <dialog ref={box} className="talk-dlg" aria-label="Comments" onClose={onClose} onClick={(e) => { if (e.target === box.current) box.current?.close(); }}>
      <div className="talk-dlg-in" data-lenis-prevent>
        <div className="talk-dlg-top">
          <b><i className="ti ti-message-circle" aria-hidden="true" /> Comments</b>
          <button type="button" className="talk-x" aria-label="Close" onClick={() => box.current?.close()}><i className="ti ti-x" aria-hidden="true" /></button>
        </div>
        <TalkPanel id={id} float={float} />
      </div>
    </dialog>,
    home,
  );
}

/** On a card: a 💬 button with the count, which opens them all, and a line to type in, under the emojis. The card stays its size, so its text part gives way. */
export function TalkRow({ id, count, float, attrs }: { id: number; count: number; float: boolean; attrs?: PartAttrs }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="talk-row" onClick={(e) => e.stopPropagation()} {...attrs}>
      <button type="button" className="talk-count" aria-label={`Open the comments (${count})`} onClick={(e) => { e.preventDefault(); setOpen(true); }}>
        <i className="ti ti-message-circle" aria-hidden="true" />{count > 0 && <b>{count}</b>}
      </button>
      <Say id={id} float={float} onPosted={(a) => { if (a.comments) tellCount(id, a.comments.length); }} />
      {open && <TalkDialog id={id} float={float} onClose={() => setOpen(false)} />}
    </div>
  );
}

/** Opens the phone's share menu, or copies the link on a computer. */
export function ShareButton({ href, compact }: { href?: string; compact: boolean }) {
  const [said, setSaid] = useState("");
  const share = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = new URL(href ?? location.pathname, location.href).href;
    if (navigator.share && matchMedia("(any-pointer: coarse)").matches) { try { await navigator.share({ url }); } catch {} return; }
    try { await navigator.clipboard.writeText(url); setSaid("Link copied!"); } catch { setSaid("Couldn't copy it"); }
    setTimeout(() => setSaid(""), 1500);
  };
  return (
    <button type="button" className="r-share" aria-label="Share this" title="Share" onClick={share}>
      <i className="ti ti-share" aria-hidden="true" />{!compact && <span>Share</span>}
      {said && <span className="r-said" role="status">{said}</span>}
    </button>
  );
}
