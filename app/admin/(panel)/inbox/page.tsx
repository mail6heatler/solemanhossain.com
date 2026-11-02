import { getMessages, getSettings, getRecentReactions, getReactionTotals, getReactionTotalsByEmoji, type ReactionEvent } from "@/lib/data";
import { messageAction } from "@/app/actions";
import { ConfirmSubmit, CopyButton } from "@/components/admin/Widgets";
import { requireAdmin } from "@/lib/auth";
import type { Message } from "@/lib/data";
import { REACTION_EMOJIS } from "@/lib/settings";

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
  const filter = f === "unread" || f === "public" || f === "reactions" ? f : "all";
  const [msgs, settings, totals] = await Promise.all([filter === "reactions" ? Promise.resolve([]) : getMessages(filter), getSettings(), getReactionTotals()]);
  const tz = settings.timezone || "UTC";
  const tabs: [string, string][] = [["all", "All"], ["unread", "Unread"], ["public", "On the wall"], ["reactions", `Reactions${totals.fresh ? ` · ${totals.fresh} new` : ""}`]];

  return (
    <div className="adm-page">
      <h1 className="adm-h">Inbox</h1>
      <p className="adm-sub">Messages from the &ldquo;say hello&rdquo; form, and reactions people leave on your entries.</p>
      <div className="btns" style={{ marginBottom: 16 }}>
        {tabs.map(([k, l]) => (
          <a key={k} href={k === "all" ? "/admin/inbox" : `/admin/inbox?f=${k}`} className={filter === k ? "b-dark b-sm" : "b-out b-sm"}>{l}</a>
        ))}
        {filter === "reactions" ? (
          totals.fresh > 0 && <form action={messageAction} style={{ marginLeft: "auto" }}><input type="hidden" name="op" value="reactions-seen" /><input type="hidden" name="id" value="0" />
            <button className="b-out b-sm"><i className="ti ti-checks" />Mark all seen</button></form>
        ) : (
          <form action={messageAction} style={{ marginLeft: "auto" }}><input type="hidden" name="op" value="allread" /><input type="hidden" name="id" value="0" />
            <button className="b-out b-sm"><i className="ti ti-checks" />Mark all read</button></form>
        )}
      </div>
      {filter === "reactions" && <ReactionList tz={tz} total={totals.total} fresh={totals.fresh} />}
      {filter === "all" && totals.fresh > 0 && (
        <a href="/admin/inbox?f=reactions" className="c hov c-row" style={{ textDecoration: "none" }}>
          <span className="chipi"><i className="ti ti-heart" /></span>
          <div className="grow"><div className="c-title">{totals.fresh} new reaction{totals.fresh === 1 ? "" : "s"}</div><div className="c-desc">See who reacted to what →</div></div>
          <span className="tagx red">new</span>
        </a>
      )}
      {filter !== "reactions" && msgs.length === 0 && <div className="c" style={{ fontSize: 13, color: "var(--text-muted)" }}>No messages here yet.</div>}
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

/** Newest reactions. Visitors are anonymous: the tag (Visitor #3f9a) is the same for the same browser, so you can spot regulars. */
async function ReactionList({ tz, total, fresh }: { tz: string; total: number; fresh: number }) {
  const [list, byEmoji] = await Promise.all([getRecentReactions(200), getReactionTotalsByEmoji()]);
  return (
    <>
      <div className="c c-row" style={{ flexWrap: "wrap", gap: 14 }}>
        <div className="grow"><div className="c-title">{total} reaction{total === 1 ? "" : "s"} in total{fresh ? ` · ${fresh} new` : ""}</div>
          <div className="c-desc" style={{ whiteSpace: "normal" }}>Reactions are anonymous. Each browser gets its own tag, so the same visitor always shows the same number.</div></div>
        <div style={{ display: "flex", gap: 14, fontSize: 15 }}>{REACTION_EMOJIS.map((e) => <span key={e}>{e} <b>{byEmoji[e] ?? 0}</b></span>)}</div>
      </div>
      {list.length === 0 && <div className="c" style={{ fontSize: 13, color: "var(--text-muted)" }}>No reactions yet. They show up here the moment someone taps an emoji on your site.</div>}
      {list.map((r: ReactionEvent, i) => (
        <div key={`${r.item_id}-${r.emoji}-${r.visitor}-${i}`} className={`c msg ${r.seen ? "" : "unread"}`}>
          <span className="chipi" style={{ fontSize: 17 }}>{r.emoji}</span>
          <div className="grow" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className="who">{r.visitor}</span>
              <span className="when">reacted {r.emoji} to</span>
              <a href={`/admin/items/${r.item_id}`} className="who" style={{ textDecoration: "underline" }}>{r.title}</a>
              <span className="when">· {r.section_title} · {fmt(r.created_at, tz)}</span>
              {!r.seen && <span className="tagx red">new</span>}
            </div>
            <div className="btns" style={{ marginTop: 8 }}>
              <a href={`/s/${r.section_slug}/${r.item_id}`} target="_blank" className="b-out b-sm"><i className="ti ti-external-link" />View on site</a>
              <a href={`/admin/items/${r.item_id}`} className="b-out b-sm"><i className="ti ti-edit" />Open entry</a>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
