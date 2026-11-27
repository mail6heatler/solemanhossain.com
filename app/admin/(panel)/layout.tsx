import "../../studio.css";
import "../../adminThemes.css";
import "../../adminOverview.css";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { getSections, getSettings, getMessages, countUnread, getCommentTotals, getReactionTotals, getRecentComments, getRecentReactions } from "@/lib/data";
import Shell from "@/components/admin/Shell";
import { layoutIcon } from "@/lib/settings";
import { Toast } from "@/components/admin/Widgets";
import OwnerMark from "@/components/admin/OwnerMark";
import { after } from "next/server";
import { housekeeping } from "@/lib/opsServer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

/** The dashboard's theme (adminThemes.css), put on <html> before anything paints, so pages never flash the old colours.
 *  Nothing chosen yet: Glass Aurora (the owner's pick, 2026-11-26). Shell.tsx's palette button changes it. */
const LOOK_SCRIPT = `(function(){var h=document.documentElement,t="aurora",v=0;try{var s=JSON.parse(localStorage.getItem("lc_admin_look")||"null");if(s&&/^(light|dark|aurora|bento)$/.test(s.t)){t=s.t;v=+s.v||0}}catch(e){}h.setAttribute("data-adm",t);h.setAttribute("data-adm-v",String(v))})()`;

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
  return `${Math.round(h / 24)} d ago`;
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  after(housekeeping); // automatic backups and clean-up, after the page is sent (lib/opsServer.ts)
  const [settings, sections, unread, unreadMsgs, reactions, newReactions, talks, newComments] = await Promise.all([
    getSettings(), getSections(), countUnread(), getMessages("unread"), getReactionTotals(), getRecentReactions(5, true), getCommentTotals(), getRecentComments(5, true),
  ]);
  // the bell and the inbox badge count new messages and new reactions together, newest first
  const notifs = [
    ...unreadMsgs.slice(0, 5).map((m) => ({ key: `m${m.id}`, at: m.created_at, name: m.name, body: m.body, href: `/admin/inbox?f=chats&c=${m.conv ?? `m${m.id}`}`, icon: "message-2" })),
    ...newReactions.map((r) => ({ key: `r${r.item_id}${r.emoji}${r.visitor}${r.created_at}`, at: r.created_at, name: `${r.emoji} ${r.visitor}`, body: `reacted to “${r.title}”`, href: "/admin/inbox?f=reactions", icon: "heart" })),
    ...newComments.map((c) => ({ key: `c${c.id}`, at: c.created_at, name: c.name, body: c.body, href: "/admin/inbox?f=comments", icon: "message-circle" })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6).map(({ at, ...n }) => ({ ...n, when: ago(at) }));
  return (
    <>
    <script dangerouslySetInnerHTML={{ __html: LOOK_SCRIPT }} />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Sora:wght@400;600;700&display=swap" precedence="default" />
    <Shell
      sections={sections.map((s) => ({ id: s.id, code: s.code, title: s.title, nav_label: s.nav_label, visible: s.visible, icon: layoutIcon(s.layout) }))}
      unread={unread + reactions.fresh + talks.fresh}
      notifs={notifs}
      owner={{ name: settings.fullName, initials: settings.initials, avatar: settings.avatarUrl }}
    >
      {children}
      <Suspense><Toast /></Suspense>
      <OwnerMark />
    </Shell>
    </>
  );
}
