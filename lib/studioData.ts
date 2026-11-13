import { getComments, getItems, getPollCounts, getReactionCountsFor, getReactionPeople, getSection, getSections, getSettings, type Item } from "@/lib/data";
import { cleanStudy } from "./studyItem";
import { cleanComic } from "./comicItem";
import { cleanAward } from "./awardItem";
import { cleanScrap } from "./scrapItem";
import { cleanCard } from "./cardLook";
import { cleanBoxes } from "./boxes";
import { cleanTalk } from "./talk";
import { cleanPass } from "./tripPass";
import { cleanFv } from "./fullView";
import type { StudioData, StudioLive } from "./studio";

/** Reactions, who gave them, comments (hidden ones too) and a poll's votes, for the cards the editor shows. */
export async function loadLive(items: Pick<Item, "id" | "type" | "poll_options">[]): Promise<StudioLive> {
  const ids = items.map((i) => i.id);
  const [reactions, people, comments, votes] = await Promise.all([
    getReactionCountsFor(ids),
    Promise.all(ids.map((id) => getReactionPeople(id))),
    Promise.all(ids.map((id) => getComments(id, true))),
    Promise.all(items.map((i) => (i.type === "poll" ? getPollCounts(i.id, i.poll_options.length) : Promise.resolve([] as number[])))),
  ]);
  const live: StudioLive = { reactions, people: {}, comments: {}, votes: {} };
  ids.forEach((id, n) => { live.people[id] = people[n]; live.comments[id] = comments[n]; live.votes[id] = votes[n]; });
  return live;
}

/** Everything the live editor needs for one section, read fresh: the page uses it, and so does a Save, to hand back what's now stored. */
export async function loadStudio(sectionId: number): Promise<StudioData | null> {
  const section = await getSection({ id: sectionId });
  if (!section) return null;
  const [items, settings, sections] = await Promise.all([getItems(section.id), getSettings(), getSections()]);
  const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN; // big videos go to Vercel Blob when it's connected
  const blank: Item = {
    id: 0, section_id: section.id, category: "", type: "post", title: "", subtitle: "", body: "", image_url: "", tags: [], links: [], date_label: "", status: "",
    mood: "", location: "", poll_options: [], pinned: false, visible: true, sort: 0, created_at: new Date().toISOString(), media: [], style: {},
    pass: cleanPass("{}"), study: cleanStudy("{}"), comic: cleanComic("{}"), boxes: cleanBoxes("{}"), talk: cleanTalk("{}"), award: cleanAward("{}"),
    scrap: cleanScrap("{}"), card: cleanCard("{}"), fv: cleanFv("{}"),
  };
  const { id, slug, code, nav_label, nav_emoji, eyebrow, eyebrow_emoji, title, subtitle, layout, emojis, categories, empty_text, home_limit, visible, ribbon, style } = section;
  return {
    draft: {
      section: { id, slug, code, nav_label, nav_emoji, eyebrow, eyebrow_emoji, title, subtitle, layout, emojis, categories, empty_text, home_limit, visible, ribbon, style },
      items, deleted: [], ribbonSize: settings.ribbonSize, notefx: settings.effects.notefx, fullfx: settings.effects.fullfx,
    },
    live: await loadLive(items),
    settings,
    sections: sections.map((s) => ({ id: s.id, code: s.code, title: s.title })),
    index: Math.max(0, sections.filter((s) => s.visible).findIndex((s) => s.id === section.id)),
    blank, useBlob, maxVideoMb: useBlob ? 200 : process.env.VERCEL ? 4 : 60,
  };
}
