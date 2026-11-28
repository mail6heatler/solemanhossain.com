import { getSettings } from "@/lib/data";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import PopnewsStudio from "@/components/admin/PopnewsStudio";

/** The news pop-up's dashboard page: live screens, the stories and every setting (components/admin/PopnewsStudio.tsx). */
export default async function PopnewsPage() {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const s = await getSettings();
  // each story's last 30 days (and the feed's, as "auto"); the table appears on its own after a deploy, so a fresh site may not have it yet
  const rows = await query<{ story: string; views: number; clicks: number }>(
    "SELECT story, SUM(views)::int AS views, SUM(clicks)::int AS clicks FROM popnews_stats WHERE day > CURRENT_DATE - 30 GROUP BY story",
  ).catch(() => []);
  const stats = Object.fromEntries(rows.map((r) => [r.story, { views: Number(r.views) || 0, clicks: Number(r.clicks) || 0 }]));
  const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
  return (
    <div className="adm-page hst-page">
      <PopnewsStudio first={s.popnews} stats={stats} useBlob={useBlob} maxVideoMb={useBlob ? 200 : process.env.VERCEL ? 4 : 60} />
    </div>
  );
}
