import { getSections, getSettings } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import CardBarStudio from "@/components/admin/CardBarStudio";

/** The Card buttons page: the bar at the bottom of every card, previewed on the real homepage (components/admin/CardBarStudio.tsx). */
export default async function CardBarPage() {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const [s, sections] = await Promise.all([getSettings(), getSections({ visibleOnly: true })]);
  // the preview opens at the first section with cards (not the chat)
  const first = sections.find((x) => x.layout !== "chat" && x.layout !== "connect") ?? sections[0];
  return (
    <div className="adm-page hst-page">
      <CardBarStudio first={s.cardBar} anchor={first?.slug ?? ""} />
    </div>
  );
}
