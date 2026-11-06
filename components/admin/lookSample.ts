import type { Item } from "@/lib/data";
import { excerpt } from "@/components/site/Markdown";
import type { LookSample } from "./LookControls";

/** What the live preview shows: a real entry where there is one, so the owner judges with their own words and picture. */
export function lookSample(it: Item | null | undefined): LookSample {
  if (!it) return { title: "A sample card", subtitle: "A subtitle", body: "Your text appears here. Add an entry to preview with your own words and picture.", pic: "", tags: ["sample"], meta: "A place · 2026" };
  const pic = it.media.find((m) => m.type === "image")?.url ?? it.media.find((m) => m.thumb)?.thumb ?? "";
  return {
    title: it.title,
    subtitle: it.subtitle,
    body: excerpt(it.body, 600),
    pic,
    tags: it.tags,
    meta: [it.location, it.date_label].filter(Boolean).join(" · "),
  };
}
