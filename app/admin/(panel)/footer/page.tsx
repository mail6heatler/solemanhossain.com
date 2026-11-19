import { getSections, getSettings } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import { FooterStudio } from "@/components/admin/ChromeStudio";

/** The footer's dashboard page: its live editor (components/admin/ChromeStudio.tsx). */
export default async function FooterPage() {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const [s, sections] = await Promise.all([getSettings(), getSections({ visibleOnly: true })]);
  return <div className="adm-page hst-page"><FooterStudio first={{ footer: s.footer, footerLeft: s.footerLeft, footerRight: s.footerRight }} settings={s} sections={sections} /></div>;
}
