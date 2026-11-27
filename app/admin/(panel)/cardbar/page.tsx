import { getSections, getSettings } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import CardBarStudio from "@/components/admin/CardBarStudio";
import { STICKER_LAYOUTS } from "@/lib/cardBar";

/** The Card buttons page: the sticker buttons at the bottom of cards, previewed on the real homepage (components/admin/CardBarStudio.tsx). */
export default async function CardBarPage() {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const [s, sections] = await Promise.all([getSettings(), getSections({ visibleOnly: true })]);
  // the preview opens at the first section that has the sticker buttons (G1 so far)
  const first = sections.find((x) => STICKER_LAYOUTS.includes(x.layout)) ?? sections[0];
  return (
    <div className="adm-page hst-page">
      <CardBarStudio first={s.cardBar} anchor={first?.slug ?? ""} />
    </div>
  );
}
