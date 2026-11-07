import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { getSections, getSettings, getMessages, countUnread, getCommentTotals, getReactionTotals, getRecentComments, getRecentReactions } from "@/lib/data";
import Shell from "@/components/admin/Shell";
import { layoutIcon } from "@/lib/settings";
import { Toast } from "@/components/admin/Widgets";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

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
  const [settings, sections, unread, unreadMsgs, reactions, newReactions, talks, newComments] = await Promise.all([
    getSettings(), getSections(), countUnread(), getMessages("unread"), getReactionTotals(), getRecentReactions(5, true), getCommentTotals(), getRecentComments(5, true),
  ]);
  // the bell and the inbox badge count new messages and new reactions together, newest first
  const notifs = [
    ...unreadMsgs.slice(0, 5).map((m) => ({ key: `m${m.id}`, at: m.created_at, name: m.name, body: m.body, href: "/admin/inbox", icon: "message-2" })),
    ...newReactions.map((r) => ({ key: `r${r.item_id}${r.emoji}${r.visitor}${r.created_at}`, at: r.created_at, name: `${r.emoji} ${r.visitor}`, body: `reacted to “${r.title}”`, href: "/admin/inbox?f=reactions", icon: "heart" })),
    ...newComments.map((c) => ({ key: `c${c.id}`, at: c.created_at, name: c.name, body: c.body, href: "/admin/inbox?f=comments", icon: "message-circle" })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6).map(({ at, ...n }) => ({ ...n, when: ago(at) }));
  return (
    <Shell
      sections={sections.map((s) => ({ id: s.id, code: s.code, title: s.title, nav_label: s.nav_label, visible: s.visible, icon: layoutIcon(s.layout) }))}
      unread={unread + reactions.fresh + talks.fresh}
      notifs={notifs}
      owner={{ name: settings.fullName, initials: settings.initials, avatar: settings.avatarUrl }}
    >
      {children}
      <Suspense><Toast /></Suspense>
    </Shell>
  );
}
