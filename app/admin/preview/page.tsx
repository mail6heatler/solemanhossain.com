import "../../studio.css";
import { getSections, getSettings } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import ChromePreview from "@/components/admin/ChromePreview";

export const dynamic = "force-dynamic";
export const metadata = { title: "Preview", robots: { index: false } };

/** One screen of the Menu bar and Footer editors' previews: the editor shows it in a frame and sends its draft in (ChromePreview). */
export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ part?: string }> }) {
  await requireAdmin();
  const [{ part }, s, sections] = await Promise.all([searchParams, getSettings(), getSections({ visibleOnly: true })]);
  return <ChromePreview first={s} sections={sections} part={part === "footer" ? "footer" : "menu"} />;
}
