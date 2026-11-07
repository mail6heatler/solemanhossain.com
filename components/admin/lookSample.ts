import { passView, tripContext } from "@/components/site/TripFrame";
import { EMPTY_PASS } from "@/lib/tripPass";
import { studyView } from "@/components/site/StudyFrame";
import { EMPTY_STUDY } from "@/lib/studyItem";
import type { Item } from "@/lib/data";
import { excerpt } from "@/components/site/Markdown";
import type { LookSample } from "./LookControls";

/** What the live preview shows: a real entry where there is one, so the owner judges with their own words and picture. */
export function lookSample(it: Item | null | undefined, trip?: ReturnType<typeof tripContext>): LookSample {
  const context = trip ?? { home: "Home", passenger: "Your name", code: "TR", fallback: "" };
  if (!it) return { title: "A sample card", subtitle: "A subtitle", body: "Your text appears here. Add an entry to preview with your own words and picture.", pic: "", tags: ["sample"], meta: "A place · 2026",
    trip: passView({ category: "", status: "", title: "A sample card", subtitle: "", location: "", date_label: "", tags: [], pass: EMPTY_PASS }, { ...context, index: 0 }),
    study: studyView({ category: "", status: "", title: "A sample card", subtitle: "A subtitle", tags: [], media: [], study: EMPTY_STUDY }, { code: context.code, fallback: context.fallback, index: 0 }) };
  const pic = it.media.find((m) => m.type === "image")?.url ?? it.media.find((m) => m.thumb)?.thumb ?? "";
  return {
    title: it.title,
    subtitle: it.subtitle,
    body: excerpt(it.body, 600),
    pic,
    tags: it.tags,
    meta: [it.location, it.date_label].filter(Boolean).join(" · "),
    trip: passView(it, { ...context, index: 0 }),
    study: studyView(it, { code: context.code, fallback: context.fallback, index: 0 }),
  };
}
