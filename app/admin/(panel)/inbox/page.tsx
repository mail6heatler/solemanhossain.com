import { countUnread, getCommentTotals, getRecentComments, getSections, getSettings, getRecentReactions, getReactionTotals, getReactionTotalsByEmoji, type ReactionEvent } from "@/lib/data";
import { listChats } from "@/lib/chat";
import ChatInbox from "@/components/admin/ChatInbox";
import { isConnectLayout } from "@/lib/settings";
import { messageAction } from "@/app/actions";

import CommentTools from "@/components/admin/CommentTools";
import { requireAdmin } from "@/lib/auth";
import { REACTION_EMOJIS } from "@/lib/settings";

type P = { searchParams: Promise<{ f?: string; c?: string }> };

const fmt = (iso: string, timeZone: string) => {
  try { return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone }); }
  catch { return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }); }
};

export default async function Inbox({ searchParams }: P) {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const { f, c } = await searchParams;
  // messages are chats now (ChatInbox); the old Unread and On the wall tabs are filters inside it
  const filter = f === "reactions" || f === "comments" ? f : "all";
  const [chats, settings, totals, talks, unreadMsgs, sections] = await Promise.all([filter === "all" ? listChats() : Promise.resolve([]), getSettings(), getReactionTotals(), getCommentTotals(), countUnread(), getSections()]);
  const connect = sections.find((x) => isConnectLayout(x.layout));
  const anyNew = unreadMsgs + totals.fresh + talks.fresh;
  // every form here says which tab it was on, so the page comes back to it
  const tab = <input type="hidden" name="f" value={filter} />;
  const tz = settings.timezone || "UTC";
  const tabs: [string, string][] = [["all", `Chats${unreadMsgs ? ` · ${unreadMsgs} new` : ""}`], ["reactions", `Reactions${totals.fresh ? ` · ${totals.fresh} new` : ""}`], ["comments", `Comments${talks.fresh ? ` · ${talks.fresh} new` : ""}`]];

  return (
    <div className="adm-page">
      <h1 className="adm-h">Inbox</h1>
      <p className="adm-sub">Chats with the people who write to you, and the reactions and comments people leave on your entries.</p>
      <div className="btns" style={{ marginBottom: 16 }}>
        {tabs.map(([k, l]) => (
          <a key={k} href={k === "all" ? "/admin/inbox" : `/admin/inbox?f=${k}`} className={filter === k ? "b-dark b-sm" : "b-out b-sm"}>{l}</a>
        ))}
        {filter === "reactions" ? (
          totals.fresh > 0 && <form action={messageAction} style={{ marginLeft: "auto" }}><input type="hidden" name="op" value="reactions-seen" /><input type="hidden" name="id" value="0" />{tab}
            <button className="b-out b-sm"><i className="ti ti-checks" />Mark all seen</button></form>
        ) : filter === "comments" ? (
          talks.fresh > 0 && <form action={messageAction} style={{ marginLeft: "auto" }}><input type="hidden" name="op" value="comments-seen" /><input type="hidden" name="id" value="0" />{tab}
            <button className="b-out b-sm"><i className="ti ti-checks" />Mark all seen</button></form>
        ) : (
          <form action={messageAction} style={{ marginLeft: "auto" }}><input type="hidden" name="op" value="allread" /><input type="hidden" name="id" value="0" />{tab}
            <button className="b-out b-sm" disabled={!anyNew} title={anyNew ? "Marks every message, reaction and comment as read" : "Nothing new to mark"}><i className="ti ti-checks" />Mark all read</button></form>
        )}
      </div>
      {filter === "reactions" && <ReactionList tz={tz} total={totals.total} fresh={totals.fresh} />}
      {filter === "comments" && <CommentList tz={tz} />}
      {filter === "all" && talks.fresh > 0 && (
        <a href="/admin/inbox?f=comments" className="c hov c-row" style={{ textDecoration: "none" }}>
          <span className="chipi"><i className="ti ti-message-circle" /></span>
          <div className="grow"><div className="c-title">{talks.fresh} new comment{talks.fresh === 1 ? "" : "s"}</div><div className="c-desc">See who said what →</div></div>
          <span className="tagx red">new</span>
        </a>
      )}
      {filter === "all" && totals.fresh > 0 && (
        <a href="/admin/inbox?f=reactions" className="c hov c-row" style={{ textDecoration: "none" }}>
          <span className="chipi"><i className="ti ti-heart" /></span>
          <div className="grow"><div className="c-title">{totals.fresh} new reaction{totals.fresh === 1 ? "" : "s"}</div><div className="c-desc">See who reacted to what →</div></div>
          <span className="tagx red">new</span>
        </a>
      )}
      {filter === "all" && (
        <ChatInbox initial={chats} startOpen={c && chats.some((x) => x.key === c) ? c : chats[0]?.key ?? ""} owner={settings.connect.name || settings.nickname || settings.fullName}
          avatar={settings.connect.face || settings.avatarUrl} saved={settings.connect.saved} reactOn={settings.connect.react} editorHref={connect ? `/admin/s/${connect.id}` : "/admin"} />
      )}
    </div>
  );
}

/** Newest reactions, with the name each person typed. Older ones from before names show a tag like Visitor #3f9a. */
async function CommentList({ tz }: { tz: string }) {
  const list = await getRecentComments(200);
  if (list.length === 0) return <div className="c" style={{ fontSize: 13, color: "var(--text-muted)" }}>No comments yet. They show up here the moment someone posts one. An entry takes comments once you turn on Let people comment on its page.</div>;
  return (
    <>
      {list.map((c) => (
        <div key={c.id} className={`c msg ${c.seen ? "" : "unread"}${c.hidden ? " off" : ""}`}>
          <span className="chipi"><i className="ti ti-message-circle" /></span>
          <div className="grow" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className="who">{c.name}</span>
              <span className="when">commented on</span>
              <a href={`/admin/items/${c.item_id}#comments`} className="who" style={{ textDecoration: "underline" }}>{c.title}</a>
              <span className="when">· {c.section_title} · {fmt(c.created_at, tz)}</span>
              {!c.seen && <span className="tagx red">new</span>}
              {c.hidden && <span className="tagx amber">hidden from visitors</span>}
              {c.pinned && <span className="tagx">pinned</span>}
            </div>
            <p>{c.body}</p>
            {c.reply && <p style={{ margin: "6px 0 0", paddingLeft: 10, borderLeft: "3px solid var(--mint)", color: "var(--text-soft)", fontSize: 13 }}><b>Your reply:</b> {c.reply}</p>}
            <div className="btns" style={{ marginTop: 8 }}>
              <CommentTools c={{ id: c.id, name: c.name, body: c.body, reply: c.reply, pinned: c.pinned, hidden: c.hidden }} />
              <a href={`/s/${c.section_slug}/${c.item_id}`} target="_blank" className="b-out b-sm"><i className="ti ti-external-link" />View on site</a>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

async function ReactionList({ tz, total, fresh }: { tz: string; total: number; fresh: number }) {
  const [list, byEmoji] = await Promise.all([getRecentReactions(200), getReactionTotalsByEmoji()]);
  return (
    <>
      <div className="c c-row" style={{ flexWrap: "wrap", gap: 14 }}>
        <div className="grow"><div className="c-title">{total} reaction{total === 1 ? "" : "s"} in total{fresh ? ` · ${fresh} new` : ""}</div>
          <div className="c-desc" style={{ whiteSpace: "normal" }}>People type their name the first time they react, so you can see who each one is from. It&apos;s whatever they typed, so it isn&apos;t proof of identity. Reactions from before names show a tag like Visitor #3f9a.</div></div>
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
