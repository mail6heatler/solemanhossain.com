"use client";
/**
 * A comment's buttons in the Inbox: Reply opens a pop-up right here, and Pin, Hide and Delete happen at once, without leaving the Inbox.
 * Uses the live editor's `studioComment`, which works for every section's entries.
 */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { studioComment } from "@/app/actions";
import { COMMENT_MAX } from "@/lib/talk";

type C = { id: number; name: string; body: string; reply: string; pinned: boolean; hidden: boolean };

export default function CommentTools({ c }: { c: C }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [text, setText] = useState(c.reply);
  const [err, setErr] = useState("");
  const replyBox = useRef<HTMLDialogElement>(null);
  const delBox = useRef<HTMLDialogElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);

  const run = (op: "reply" | "pin" | "hide" | "delete", reply = "", done?: () => void) => start(async () => {
    setErr("");
    const ok = await studioComment(c.id, op, reply).then((r) => r !== null).catch(() => false);
    if (!ok) { setErr("That didn't save. Check your connection and try again."); return; }
    done?.();
    router.refresh();
  });

  return (
    <>
      <button type="button" className="b-dark b-sm" onClick={() => { setText(c.reply); setErr(""); replyBox.current?.showModal(); setTimeout(() => field.current?.focus(), 0); }}>
        <i className="ti ti-corner-down-left" />{c.reply ? "Edit reply" : "Reply"}
      </button>
      <button type="button" className="b-out b-sm" disabled={busy} onClick={() => run("pin")}><i className={`ti ${c.pinned ? "ti-pinned-off" : "ti-pin"}`} />{c.pinned ? "Unpin" : "Pin"}</button>
      <button type="button" className="b-out b-sm" disabled={busy} onClick={() => run("hide")}><i className={`ti ${c.hidden ? "ti-eye" : "ti-eye-off"}`} />{c.hidden ? "Show to visitors" : "Hide"}</button>
      <button type="button" className="b-out b-sm" disabled={busy} onClick={() => { delBox.current?.showModal(); cancel.current?.focus(); }}><i className="ti ti-trash" />Delete</button>
      {err && <span className="err" role="alert">{err}</span>}

      <dialog ref={replyBox} className="info-dlg" aria-label={`Reply to ${c.name}`} onClick={(e) => { if (e.target === replyBox.current) replyBox.current?.close(); }}>
        <div className="info-in">
          <div className="info-h"><b>Reply to {c.name}</b><button type="button" className="adm-iconbtn" aria-label="Close" onClick={() => replyBox.current?.close()}><i className="ti ti-x" /></button></div>
          <blockquote style={{ margin: "0 0 12px", padding: "8px 12px", borderLeft: "3px solid var(--mint)", color: "var(--text-soft)", fontSize: 13, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{c.body}</blockquote>
          <textarea ref={field} className="inp" rows={4} value={text} maxLength={COMMENT_MAX} placeholder="Write a reply. Visitors see it under the comment, marked as yours." aria-label="Your reply"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) run("reply", text, () => replyBox.current?.close()); }} />
          {err && <div className="err" style={{ marginTop: 6 }}>{err}</div>}
          <div className="btns" style={{ marginTop: 12, justifyContent: "flex-end" }}>
            {c.reply && <button type="button" className="b-out b-sm" disabled={busy} onClick={() => run("reply", "", () => replyBox.current?.close())}><i className="ti ti-x" />Remove reply</button>}
            <button type="button" className="b-out b-sm" onClick={() => replyBox.current?.close()}>Cancel</button>
            <button type="button" className="b-dark b-sm" disabled={busy || !text.trim() || text === c.reply} onClick={() => run("reply", text, () => replyBox.current?.close())}>
              <i className={`ti ${busy ? "ti-loader-2" : "ti-send"}`} />{busy ? "Saving…" : "Save reply"}
            </button>
          </div>
        </div>
      </dialog>

      <dialog ref={delBox} className="info-dlg confirm-dlg" aria-label="Delete this comment?" onClick={(e) => { if (e.target === delBox.current) delBox.current?.close(); }}>
        <div className="confirm-in">
          <span className="confirm-ico" aria-hidden="true"><i className="ti ti-alert-triangle" /></span>
          <b>Delete this comment?</b>
          <p>It&apos;s removed for good, with your reply. This can&apos;t be undone.</p>
          <div className="confirm-btns">
            <button ref={cancel} type="button" className="b-out" onClick={() => delBox.current?.close()}>Cancel</button>
            <button type="button" className="b-yes" onClick={() => { delBox.current?.close(); run("delete"); }}><i className="ti ti-check" />Yes, delete</button>
          </div>
        </div>
      </dialog>
    </>
  );
}
