"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMsg, ChatSummary } from "@/lib/chat";
import { inboxDelete, inboxPoll, inboxReact, inboxReply, inboxSaved, inboxWall } from "@/app/actions";

const REACTS = ["❤️", "😂", "👍", "🙏", "😮", "🔥"];
const AVC = ["#e5487b", "#2bb3c0", "#9b6ef3", "#f2a33d", "#2f9e6a", "#e8663d"];
const color = (s: string) => AVC[Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0) % AVC.length];
const first = (s: string) => Array.from(s.trim())[0]?.toUpperCase() ?? "?";
function ago(iso: string) {
  const d = new Date(iso), s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 172800) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
const stamp = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const gmail = (to: string, name: string) => "https://mail.google.com/mail/?" + new URLSearchParams({ view: "cm", fs: "1", to, su: "Re: your message on my website", body: `Hi ${name},\n\n` });

/**
 * The Inbox's chats, like Messenger (Inbox → Chats). On the left every conversation, newest first, with a red dot until opened; on the right the
 * open one: what the visitor wrote and the owner's replies, a box to reply (it reaches the visitor in their chat on the site), saved replies,
 * an emoji on any of their messages, putting a note they asked to be public on the Wall with a public reply under it, and deleting.
 * It checks in every few seconds (`inboxPoll`), which also tells visitors the owner is online, marks the open chat seen, and says when the owner
 * is typing. On a phone it's one screen at a time.
 */
export default function ChatInbox({ initial, startOpen, owner, avatar, saved: savedStart, reactOn, editorHref }: {
  initial: ChatSummary[]; startOpen: string; owner: string; avatar: string; saved: string[]; reactOn: boolean; editorHref: string;
}) {
  const [chats, setChats] = useState(initial);
  const [open, setOpen] = useState(startOpen);
  const [thread, setThread] = useState<ChatMsg[] | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "wall">("all");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ t: string; bad?: boolean } | null>(null);
  const [saved, setSaved] = useState(savedStart);
  const [editSaved, setEditSaved] = useState(false);
  const [savedText, setSavedText] = useState(savedStart.join("\n"));
  const [confirmDel, setConfirmDel] = useState(false);
  const [wallDraft, setWallDraft] = useState<Record<number, string>>({});
  const [showThread, setShowThread] = useState(!!startOpen);
  const typedAt = useRef(0), pingedAt = useRef(0);
  const openRef = useRef(open);
  openRef.current = open;
  const msgs = useRef<HTMLDivElement>(null);
  const say = (t: string, bad = false) => { setNote({ t, bad }); window.setTimeout(() => setNote((n) => (n?.t === t ? null : n)), 4500); };

  const poll = useCallback(async (typing = false) => {
    const key = openRef.current;
    try {
      const r = await inboxPoll(key, typing);
      setChats(r.chats);
      if (openRef.current === key) setThread(r.thread);
    } catch { /* offline for a moment: the next check tries again */ }
  }, []);
  useEffect(() => { setThread(null); setConfirmDel(false); poll(); }, [open, poll]);
  useEffect(() => {
    const t = window.setInterval(() => { if (!document.hidden) poll(Date.now() - typedAt.current < 5000); }, 4000);
    return () => clearInterval(t);
  }, [poll]);
  useEffect(() => { const el = msgs.current; if (el) el.scrollTop = el.scrollHeight; }, [thread?.length, open]);
  useEffect(() => { const u = new URL(location.href); if (open) u.searchParams.set("c", open); else u.searchParams.delete("c"); history.replaceState(null, "", u); }, [open]);

  const cur = chats.find((c) => c.key === open);
  const list = chats.filter((c) => filter === "all" || (filter === "unread" ? c.unread > 0 : c.wallAsk || c.onWall));
  const unread = chats.filter((c) => c.unread > 0).length;
  const pick = (k: string) => { setOpen(k); setShowThread(true); setText(""); };

  const send = async (body = text) => {
    if (!open || !body.trim() || busy) return;
    setBusy(true);
    const r = await inboxReply(open, body).catch(() => null);
    setBusy(false);
    if (!r) { say("That didn't send. Check your connection and try again.", true); return; }
    if (!r.ok) { say(r.error, true); return; }
    setText(""); typedAt.current = 0; setThread(r.thread); poll();
  };
  const onType = (v: string) => {
    setText(v);
    typedAt.current = Date.now();
    if (Date.now() - pingedAt.current > 3000 && v.trim()) { pingedAt.current = Date.now(); poll(true); }
  };
  const react = async (m: ChatMsg, e: string) => {
    setThread((t) => t && t.map((x) => (x.id === m.id ? { ...x, react: x.react === e ? "" : e } : x)));
    await inboxReact(m.id, e).catch(() => say("That didn't save. Try again.", true));
  };
  const wall = async (m: ChatMsg, on: boolean) => {
    const r = await inboxWall(m.id, on, wallDraft[m.id] ?? m.wallReply).catch(() => null);
    if (!r || !r.ok) { say(r && !r.ok ? r.error : "That didn't save. Try again.", true); return; }
    say(on ? "It's on the Wall now." : "Taken off the Wall."); poll();
  };
  const del = async () => {
    await inboxDelete(open).catch(() => null);
    setConfirmDel(false); setOpen(""); setShowThread(false); say("Chat deleted."); poll();
  };
  const keepSaved = async () => {
    const l = savedText.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 10);
    setSaved(l); setEditSaved(false);
    await inboxSaved(l).catch(() => say("Saved replies didn't save. Try again.", true));
  };

  return (
    <div className={`ci${showThread ? " in-th" : ""}`}>
      <aside className="ci-list">
        <div className="ci-list-top">
          <b>Chats</b>{unread > 0 && <span className="ci-cnt">{unread} new</span>}
          <a className="ci-set" href={editorHref} title="What visitors see: Connect's live editor"><i className="ti ti-settings" /></a>
        </div>
        <div className="ci-filters" role="group" aria-label="Show">
          {([["all", "All"], ["unread", "Unread"], ["wall", "📌 Wall"]] as const).map(([k, l]) => <button key={k} type="button" className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{l}</button>)}
        </div>
        {list.length === 0 && <p className="ci-empty">{filter === "all" ? "No messages yet. When someone writes in your chat, it shows up here." : "Nothing here."}</p>}
        {list.map((c) => (
          <button key={c.key} type="button" className={`ci-conv${c.key === open ? " on" : ""}${c.unread ? " un" : ""}`} onClick={() => pick(c.key)}>
            <span className="ci-av" style={{ background: color(c.name) }}>{first(c.name)}</span>
            <span className="ci-mid"><b>{c.name}</b><small>{c.lastFromOwner ? "You: " : ""}{c.last}</small></span>
            <span className="ci-end"><small>{ago(c.lastAt)}</small>{c.unread > 0 ? <i className="ci-dot" aria-label={`${c.unread} unread`} /> : c.wallAsk ? <em title="Asked to be on the Wall">📌</em> : null}</span>
          </button>
        ))}
      </aside>

      <section className="ci-th">
        {!cur ? (
          <div className="ci-none"><i className="ti ti-messages" /><p>Pick a chat on the left to read it and reply.</p><p className="ci-small">Your replies show up in the visitor&apos;s chat on your site, with typing dots if they&apos;re there, and a &ldquo;new reply&rdquo; badge when they come back.</p></div>
        ) : (
          <>
            <header className="ci-head">
              <button type="button" className="ci-back" onClick={() => setShowThread(false)} aria-label="Back to all chats"><i className="ti ti-arrow-left" /></button>
              <span className="ci-av" style={{ background: color(cur.name) }}>{first(cur.name)}</span>
              <span className="ci-who"><b>{cur.name}</b><small>{cur.email || "No email left"}{cur.canReply ? "" : " · wrote before replies existed"}</small></span>
              <span className="ci-acts">
                {cur.email && <a className="b-out b-sm" href={gmail(cur.email, cur.name)} target="_blank" rel="noopener noreferrer" title="Opens an email to them in Gmail"><i className="ti ti-mail" />Gmail</a>}
                {confirmDel
                  ? <span className="ci-confirm">Delete this whole chat for good? <button type="button" className="b-danger b-sm" onClick={del}>Yes, delete</button><button type="button" className="b-out b-sm" onClick={() => setConfirmDel(false)}>No</button></span>
                  : <button type="button" className="adm-iconbtn" aria-label="Delete this chat" title="Delete this chat" onClick={() => setConfirmDel(true)}><i className="ti ti-trash" /></button>}
              </span>
            </header>
            <div className="ci-msgs" ref={msgs}>
              {thread === null && <p className="ci-small" style={{ margin: "auto" }}>Opening…</p>}
              {thread?.map((m) => m.fromOwner ? (
                <div key={m.id} className="ci-m me">
                  <p>{m.body}</p>
                  <small>{stamp(m.at)} · {m.seen ? "Seen" : "Sent"}</small>
                </div>
              ) : (
                <div key={m.id} className="ci-m">
                  <p>{m.body}{m.react && <span className="ci-rx">{m.react}</span>}</p>
                  <small>{stamp(m.at)}{m.wantsPublic ? (m.approved ? " · 📌 on the Wall" : " · asked to be on the Wall") : ""}{m.hearts ? ` · ❤️ ${m.hearts}` : ""}</small>
                  <span className="ci-tools">
                    {reactOn && REACTS.map((e) => <button key={e} type="button" className={m.react === e ? "on" : ""} onClick={() => react(m, e)} aria-label={`React ${e}`}>{e}</button>)}
                    {m.wantsPublic && <button type="button" className="ci-wallbtn" onClick={() => wall(m, !m.approved)}>{m.approved ? "Take off the Wall" : "📌 Put on the Wall"}</button>}
                  </span>
                  {m.approved && (
                    <span className="ci-wallreply">
                      <input className="inp" value={wallDraft[m.id] ?? m.wallReply} maxLength={300} placeholder="Your public reply under it on the Wall (optional)" onChange={(e) => setWallDraft((d) => ({ ...d, [m.id]: e.target.value }))} />
                      {(wallDraft[m.id] ?? m.wallReply) !== m.wallReply && <button type="button" className="b-dark b-sm" onClick={() => wall(m, true)}>Save</button>}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {cur.canReply ? (
              <>
                <div className="ci-saved">
                  {editSaved ? (
                    <div className="ci-saved-ed">
                      <textarea className="inp" rows={3} value={savedText} onChange={(e) => setSavedText(e.target.value)} placeholder="One saved reply per line" />
                      <button type="button" className="b-dark b-sm" onClick={keepSaved}>Save</button><button type="button" className="b-out b-sm" onClick={() => setEditSaved(false)}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      {saved.map((s, i) => <button key={i} type="button" onClick={() => setText(s)}>{s}</button>)}
                      <button type="button" className="ci-saved-edit" onClick={() => { setSavedText(saved.join("\n")); setEditSaved(true); }}><i className="ti ti-pencil" />{saved.length ? "Edit" : "Add saved replies"}</button>
                    </>
                  )}
                </div>
                <form className="ci-box" onSubmit={(e) => { e.preventDefault(); send(); }}>
                  <textarea className="inp" rows={1} value={text} placeholder={`Reply to ${cur.name}…`} maxLength={2000} onChange={(e) => onType(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} aria-label={`Reply to ${cur.name}`} />
                  <button className="b-mint" disabled={busy || !text.trim()}><i className={`ti ti-${busy ? "loader-2" : "send"}`} />Reply</button>
                </form>
                <p className="ci-small ci-foot">{avatar ? <img src={avatar} alt="" /> : null}They see it in their chat on your site as {owner}. Enter sends, Shift+Enter starts a new line.</p>
              </>
            ) : (
              <p className="ci-small ci-old">This message came in before replies existed, so a reply can&apos;t reach them on your site.{cur.email ? " Use Gmail above to answer by email." : " They didn't leave an email."}</p>
            )}
          </>
        )}
      </section>
      {note && <div className={`adm-toast${note.bad ? " bad" : ""}`} role="status">{note.t}</div>}
    </div>
  );
}
