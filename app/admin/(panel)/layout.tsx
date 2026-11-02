import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { getSections, getSettings, getMessages, countUnread } from "@/lib/data";
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
  const [settings, sections, unread, unreadMsgs] = await Promise.all([
    getSettings(), getSections(), countUnread(), getMessages("unread"),
  ]);
  return (
    <Shell
      sections={sections.map((s) => ({ id: s.id, code: s.code, title: s.title, nav_label: s.nav_label, visible: s.visible, icon: layoutIcon(s.layout) }))}
      unread={unread}
      notifs={unreadMsgs.slice(0, 5).map((m) => ({ id: m.id, name: m.name, body: m.body, when: ago(m.created_at) }))}
      owner={{ name: settings.fullName, initials: settings.initials, avatar: settings.avatarUrl }}
    >
      {children}
      <Suspense><Toast /></Suspense>
    </Shell>
  );
}
