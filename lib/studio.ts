import type { Comment, Item, Section } from "@/lib/data";
import type { SiteSettings } from "@/lib/settings";

/**
 * What the dashboard's live editor (components/admin/studio) holds and saves. One page edits a whole section: its header and settings, every card,
 * their order, and each card's full view, and one Save writes all of it (`saveStudio` in app/actions.ts).
 */
export type StudioSection = Pick<Section, "id" | "slug" | "code" | "nav_label" | "nav_emoji" | "eyebrow" | "eyebrow_emoji" | "title" | "subtitle" | "layout" | "emojis" | "categories" | "empty_text" | "home_limit" | "visible" | "ribbon" | "style">;

/** `items` are in the order visitors see. A card not saved yet has an id below zero. `deleted` are the cards in the bin. */
export type StudioDraft = {
  section: StudioSection;
  items: Item[];
  deleted: Item[];
  /** site-wide settings that show in this section: how thick the sliding belts are, and whether cards and full views move */
  ribbonSize: number;
  notefx: boolean;
  fullfx: boolean;
};

/** What visitors have done, which the editor shows but a Save never changes. Each is changed right away by its own button. */
export type StudioLive = {
  reactions: Record<number, Record<string, number>>;
  people: Record<number, { emoji: string; name: string; created_at: string }[]>;
  comments: Record<number, Comment[]>;
  votes: Record<number, number[]>;
};

export type StudioData = {
  draft: StudioDraft;
  live: StudioLive;
  settings: SiteSettings;
  /** every section, for moving a card to another one */
  sections: { id: number; code: string; title: string }[];
  /** this section's place on the homepage: every second one has the other background */
  index: number;
  /** an empty card, to start a new one from */
  blank: Item;
  useBlob: boolean;
  maxVideoMb: number;
};

/** What a Save sends: only what the editor can change. */
export type StudioSave = {
  sectionId: number;
  section: Omit<StudioSection, "id">;
  ribbonSize: number;
  notefx: boolean;
  fullfx: boolean;
  items: Pick<Item, "id" | "section_id" | "category" | "type" | "title" | "subtitle" | "body" | "tags" | "links" | "date_label" | "status" | "mood" | "location" | "poll_options" | "pinned" | "visible" | "media" | "style" | "card" | "talk" | "fv">[];
  deleted: number[];
};

export const toSave = (d: StudioDraft): StudioSave => {
  const { id, ...section } = d.section;
  return {
    sectionId: id, section, ribbonSize: d.ribbonSize, notefx: d.notefx, fullfx: d.fullfx,
    items: d.items.map((it) => ({
      id: it.id, section_id: it.section_id, category: it.category, type: it.type, title: it.title, subtitle: it.subtitle, body: it.body, tags: it.tags, links: it.links,
      date_label: it.date_label, status: it.status, mood: it.mood, location: it.location, poll_options: it.poll_options, pinned: it.pinned, visible: it.visible,
      media: it.media, style: it.style, card: it.card, talk: it.talk, fv: it.fv,
    })),
    deleted: d.deleted.map((it) => it.id).filter((n) => n > 0),
  };
};

/** Visitors see pinned cards first, so the editor keeps them first too. */
export const pinnedFirst = (items: Item[]) => [...items.filter((i) => i.pinned), ...items.filter((i) => !i.pinned)];
