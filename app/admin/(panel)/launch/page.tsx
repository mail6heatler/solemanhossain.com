import { getSettings } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import LaunchStudio from "@/components/admin/LaunchStudio";

/** The launch screen's dashboard page: live screens and every setting (components/admin/LaunchStudio.tsx). */
export default async function LaunchPage() {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const s = await getSettings();
  return (
    <div className="adm-page hst-page">
      <LaunchStudio first={s.launch} names={{ nick: s.nickname || s.fullName, name: s.fullName, rocket: s.mascot.fun.rocketName || "SHOUROBH ONE" }} />
    </div>
  );
}
