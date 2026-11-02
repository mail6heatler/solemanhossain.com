import { getMessages, getSettings } from "@/lib/data";
import { messageAction } from "@/app/actions";
import { ConfirmSubmit, CopyButton } from "@/components/admin/Widgets";
import { requireAdmin } from "@/lib/auth";
import type { Message } from "@/lib/data";

type P = { searchParams: Promise<{ f?: string }> };

const fmt = (iso: string, timeZone: string) => {
  try { return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone }); }
  catch { return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }); }
};

/** Opens a pre-filled reply in Gmail (browser), so no email app is needed. */
function gmailReply(m: Message, timeZone: string) {
  const subject = "Re: your message on my website";
  const when = fmt(m.created_at, timeZone);
  const quoted = m.body.slice(0, 1500).split(/\r?\n/).map((l) => `> ${l}`).join("\n");
  const body = `Hi ${m.name},\n\n\n\n---\nOn ${when}, you wrote:\n${quoted}`;
  return "https://mail.google.com/mail/?" + new URLSearchParams({ view: "cm", fs: "1", to: m.email, su: subject, body });
}

export default async function Inbox({ searchParams }: P) {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const { f } = await searchParams;
  const filter = f === "unread" || f === "public" ? f : "all";
  const [msgs, settings] = await Promise.all([getMessages(filter), getSettings()]);
  const tz = settings.timezone || "UTC";

  return (
    <div className="adm-page">
      <h1 className="adm-h">Inbox</h1>
      <p className="adm-sub">Messages from the &ldquo;say hello&rdquo; form. Approve a note to show it on your public guest wall.</p>
      <div className="btns" style={{ marginBottom: 16 }}>
        {[["all", "All"], ["unread", "Unread"], ["public", "On the wall"]].map(([k, l]) => (
          <a key={k} href={k === "all" ? "/admin/inbox" : `/admin/inbox?f=${k}`} className={filter === k ? "b-dark b-sm" : "b-out b-sm"}>{l}</a>
        ))}
        <form action={messageAction} style={{ marginLeft: "auto" }}><input type="hidden" name="op" value="allread" /><input type="hidden" name="id" value="0" />
          <button className="b-out b-sm"><i className="ti ti-checks" />Mark all read</button></form>
      </div>
      {msgs.length === 0 && <div className="c" style={{ fontSize: 13, color: "var(--text-muted)" }}>No messages here yet.</div>}
      {msgs.map((m) => (
        <div key={m.id} className={`c msg ${m.read ? "" : "unread"}`}>
          <span className="chipi"><i className="ti ti-user" /></span>
          <div className="grow" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className="who">{m.name}</span>
              {m.email && <span className="when">{m.email}</span>}
              {!m.email && <span className="when">· no email left, can&apos;t reply</span>}
              <span className="when">· {fmt(m.created_at, tz)}</span>
              {!m.read && <span className="tagx red">new</span>}
              {m.wants_public && !m.approved && <span className="tagx amber">wants to be on the wall</span>}
              {m.approved && <span className="tagx">on the wall</span>}
            </div>
            <p>{m.body}</p>
            <div className="btns" style={{ marginTop: 10 }}>
              {m.email && (
                <>
                  <a href={gmailReply(m, tz)} target="_blank" rel="noopener noreferrer" className="b-dark b-sm" title="Opens a reply in Gmail (new tab)"><i className="ti ti-mail-forward" />Reply in Gmail</a>
                  <CopyButton text={m.email} label="Copy email" />
                </>
              )}
              <form action={messageAction}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="op" value="approve" />
                <button className="b-out b-sm"><i className={`ti ${m.approved ? "ti-eye-off" : "ti-pin"}`} />{m.approved ? "Remove from wall" : "Show on wall"}</button></form>
              <form action={messageAction}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="op" value="read" />
                <button className="b-out b-sm">{m.read ? "Mark unread" : "Mark read"}</button></form>
              <form action={messageAction}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="op" value="delete" />
                <ConfirmSubmit message="Delete this message?" className="b-danger b-sm"><i className="ti ti-trash" />Delete</ConfirmSubmit></form>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
