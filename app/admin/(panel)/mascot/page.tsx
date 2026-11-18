import { getSections, getSettings } from "@/lib/data";
import { saveMascot } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import SaveBox from "@/components/admin/SaveBox";
import MascotPanel from "@/components/admin/MascotPanel";

export default async function MascotPage() {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const [s, sections] = await Promise.all([getSettings(), getSections()]);
  return (
    <form action={saveMascot} className="adm-page">
      <h1 className="adm-h">Mascot</h1>
      <p className="adm-sub">A little character who plays hide and seek with your site: he peeks in from the edge, hangs from the menu bar, drops in on a rope, pops up from the bottom, sits on your cards and hides behind headings. Click him for a move.</p>
      <MascotPanel initial={s.mascot} sections={sections.map((x) => ({ slug: x.slug, title: x.nav_label || x.title, emoji: x.nav_emoji || "" }))} open={{}} />
      <SaveBox label="Save mascot" desc="Nothing goes live until you save.">
        <a href="/" target="_blank" className="b-out"><i className="ti ti-eye" />View site</a>
      </SaveBox>
    </form>
  );
}
