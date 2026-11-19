import { getSections, getSettings } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import { MenuStudio } from "@/components/admin/ChromeStudio";

/** The menu bar's dashboard page: its live editor (components/admin/ChromeStudio.tsx). */
export default async function MenuPage() {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const [s, sections] = await Promise.all([getSettings(), getSections({ visibleOnly: true })]);
  return <div className="adm-page hst-page"><MenuStudio first={s.menu} settings={s} sections={sections} /></div>;
}
