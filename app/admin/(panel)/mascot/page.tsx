import { getSections, getSettings } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import MascotStudio from "@/components/admin/MascotStudio";

/** Mini Shourobh's dashboard page: a live preview of him and every setting (components/admin/MascotStudio.tsx). */
export default async function MascotPage() {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const [s, sections] = await Promise.all([getSettings(), getSections()]);
  return (
    <div className="adm-page hst-page">
      <MascotStudio first={s.mascot} timezone={s.timezone} sections={sections.map((x) => ({ title: x.nav_label || x.title, emoji: x.nav_emoji || "", layout: x.layout, code: x.code }))} />
    </div>
  );
}
