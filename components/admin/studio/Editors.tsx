"use client";
import { useEffect, useRef, useState } from "react";
import type { Item } from "@/lib/data";
import { LAYOUTS, MOODS, REACTION_EMOJIS, RIBBON_SIZE } from "@/lib/settings";
import { NOTE_LOOKS, noteLookOf, type NoteLook } from "@/lib/cardLook";
import { isCustom, mergeStyles } from "@/lib/contentStyle";
import { COMMENT_MAX, TALK_FEATURES } from "@/lib/talk";
import { FV_BGS, FV_LAYOUTS, FV_OPENS, FV_PARTS, FV_QUOTE_MAX, fvLook, type FvPart } from "@/lib/fullView";
import type { StudioData, StudioDraft, StudioLive, StudioSection } from "@/lib/studio";
import { ConfirmSubmit, LinksEditor, MediaField } from "@/components/admin/Widgets";
import { deleteSection } from "@/app/actions";
import { Chips, LookFields, Seg, Slider, Sw, Txt } from "./Fields";

/** What each card look does with an entry's words, said under the Looks like box. */
const NOTE_HINTS: Record<NoteLook, string> = {
  manual: "Your photo is on the cover. Date is the version, Place is “made in”, tags are what it runs on, and each paragraph or line of the text is a numbered step.",
  sign: "The title is painted on the sign, in the colour of its Mood. The rest sits under it.",
  story: "The first picture fills the card, with a bar at the top for each picture. The subsection is the sticker.",
  fact: "Its number is its place among the facts. Status is the rarity (Rare when empty), and the first picture is the art.",
  plain: "The plain note.",
};

/** What a part is called on each card. A manual has a Version, not a Date; the labels on the card and in these editors use the card's own words. */
const NAMES: Record<string, string> = {
  sub: "Subsection", title: "Title", subtitle: "Subtitle", body: "Story", pic: "Pictures", date: "Date", place: "Place", mood: "Mood", status: "Status", tags: "Tags",
  links: "Buttons", poll: "Poll", reacts: "Reactions & comments", size: "Size & look", more: "Show, pin, move", quote: "Pull quote", fv: "Full view options",
};
const BY_LOOK: Record<NoteLook, Record<string, string>> = {
  manual: { date: "Version", place: "Made in", tags: "Runs on", body: "Steps", sub: "Manual name" },
  sign: { title: "Slogan", mood: "Paint colour", body: "Small print" },
  story: { sub: "Sticker", pic: "Story pictures", title: "Headline" },
  fact: { status: "Rarity", body: "The fact", title: "Card name", sub: "Fact number" },
  plain: {},
};
export const partName = (key: string, look: NoteLook) => (key.startsWith("fvb:") ? FV_PARTS.find(([k]) => k === key.slice(4))?.[1] ?? key : BY_LOOK[look][key] ?? NAMES[key] ?? key);
export const SEC_NAMES: Record<string, string> = {
  title: "Big title", subtitle: "Subtitle", eyebrow: "Small label", eyebrow_emoji: "Label emoji", code: "Code tag", nav_label: "Menu name", nav_emoji: "Menu emoji", slug: "URL name",
  emojis: "Floating emojis", categories: "Subsections", layout: "Layout", home_limit: "Cards on the homepage", empty_text: "Message when empty", visible: "Visible on the site",
  ribbon: "Sliding belt", look: "Size & look for every card", motion: "Movement", danger: "Delete this section",
};
/** Parts you type straight onto the preview, when what's shown there is exactly what's stored. */
export const TYPED = ["title", "subtitle", "date", "place", "status", "quote", "eyebrow"];
export const CARD_KEYS = ["sub", "title", "subtitle", "body", "pic", "date", "place", "mood", "status", "tags", "links", "size", "reacts", "more"];

export type Ed = {
  data: StudioData; draft: StudioDraft; live: StudioLive; item: Item | null; card: NoteLook; rev: number;
  setItem: (patch: Partial<Item>, tag?: string) => void;
  setSection: (patch: Partial<StudioSection>, tag?: string) => void;
  setDraft: (fn: (d: StudioDraft) => StudioDraft, tag?: string) => void;
  ask: (c: { title: string; message: string; yes: string; run: () => void }) => void;
  comment: (id: number, op: "reply" | "pin" | "hide" | "delete", reply?: string) => void;
  reset: (kind: "reactions" | "votes") => void;
  remove: (it: Item) => void; duplicate: (it: Item) => void; play: () => void; busy: boolean;
  open: (scope: "card" | "fv" | "sec", key: string) => void;
};

const Pills = ({ options, value, onPick }: { options: string[]; value: string; onPick: (v: string) => void }) => (
  <div className="stu-pills">{options.map((o) => <button key={o} type="button" className={o === value ? "on" : ""} onClick={() => onPick(o)}>{o}</button>)}</div>
);

/** A poll's options, one per line. It keeps what's typed, blank lines and all, and hands on the lines that say something. */
function PollLines({ item, onChange }: { item: Item; onChange: (lines: string[]) => void }) {
  const [text, setText] = useState(item.poll_options.join("\n"));
  return (
    <label className="fl stu-f">
      <span className="lab">One option per line (2 to 8)</span>
      <textarea value={text} style={{ minHeight: 120 }} onChange={(e) => { setText(e.target.value); onChange(e.target.value.split("\n").map((l) => l.trim().slice(0, 120)).filter(Boolean).slice(0, 8)); }} />
    </label>
  );
}

function Comments({ ed, item }: { ed: Ed; item: Item }) {
  const list = ed.live.comments[item.id] ?? [];
  const tz = ed.data.settings.timezone || "UTC";
  const when = (iso: string) => { try { return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: tz }); } catch { return new Date(iso).toLocaleString("en-GB"); } };
  return (
    <div className="fl stu-f">
      <span className="lab">Comments ({list.length})</span>
      {list.length === 0 && <span className="hint">{item.talk.comments ? "No comments yet. They show up here the moment someone posts one." : "Comments are off for this card. Turn on “Let people comment” above."}</span>}
      {list.map((c) => (
        <div key={c.id} className={`stu-comment${c.hidden ? " off" : ""}`}>
          <div className="stu-comment-top"><b>{c.name}</b><span>{when(c.created_at)}</span>{!c.seen && <span className="tagx red">new</span>}{c.pinned && <span className="tagx">pinned</span>}{c.hidden && <span className="tagx amber">hidden</span>}</div>
          <p>{c.body}</p>
          <ReplyBox key={`${c.id}:${c.reply}`} start={c.reply} busy={ed.busy} onSave={(r) => ed.comment(c.id, "reply", r)} />
          <div className="btns">
            <button type="button" className="b-out b-sm" disabled={ed.busy} onClick={() => ed.comment(c.id, "pin")}><i className="ti ti-pin" />{c.pinned ? "Unpin" : "Pin to the top"}</button>
            <button type="button" className="b-out b-sm" disabled={ed.busy} onClick={() => ed.comment(c.id, "hide")}><i className={`ti ${c.hidden ? "ti-eye" : "ti-eye-off"}`} />{c.hidden ? "Show it" : "Hide it"}</button>
            <button type="button" className="b-danger b-sm" disabled={ed.busy} onClick={() => ed.ask({ title: "Delete this comment?", message: "It's removed for good, right away. This can't be undone. Tip: hiding it keeps it, and only you can see it.", yes: "Yes, delete", run: () => ed.comment(c.id, "delete") })}><i className="ti ti-trash" />Delete</button>
          </div>
        </div>
      ))}
      {list.length > 0 && <span className="hint">Replies, pins, hiding and deleting happen right away. They aren&apos;t part of Save or Undo.</span>}
    </div>
  );
}
function ReplyBox({ start, busy, onSave }: { start: string; busy: boolean; onSave: (r: string) => void }) {
  const [text, setText] = useState(start);
  return (
    <div className="add-row">
      <input className="inp" value={text} maxLength={COMMENT_MAX} placeholder="Write a reply. Visitors see it marked as yours." aria-label="Your reply" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSave(text); } }} />
      <button type="button" className="b-out b-sm" disabled={busy || text === start} onClick={() => onSave(text)}><i className="ti ti-corner-down-left" />Save reply</button>
    </div>
  );
}

/** One part of a card, opened from its label. */
export function CardEditor({ ed, k }: { ed: Ed; k: string }) {
  const it = ed.item;
  if (!it) return <p className="hint">Pick a card first.</p>;
  const { draft, data, live } = ed;
  const name = (key: string) => partName(key, ed.card);
  const cats = Array.from(new Set([...draft.section.categories, ...draft.items.map((i) => i.category)].filter(Boolean)));
  const cover = it.media.find((m) => m.type === "image")?.url ?? it.media.find((m) => m.thumb)?.thumb ?? "";
  const counts = live.reactions[it.id] ?? {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  switch (k) {
    case "sub": {
      const auto = NOTE_LOOKS.find(([key]) => key === noteLookOf(it.category))?.[1] ?? "";
      return <>
        <Txt label="Subsection" value={it.category} placeholder="Pick one below, or type a new one" onChange={(v) => ed.setItem({ category: v.replace(/,/g, " ") }, "category")} />
        <Pills options={cats} value={it.category} onPick={(c) => ed.setItem({ category: c })} />
        <div className="fl stu-f">
          <label className="lab" htmlFor="stu-look">Looks like</label>
          <select id="stu-look" value={it.card.look} onChange={(e) => ed.setItem({ card: { look: e.target.value as Item["card"]["look"] } })}>
            <option value="">Automatic, from its subsection: {auto}</option>
            {NOTE_LOOKS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <span className="hint">{NOTE_HINTS[ed.card]}</span>
        </div>
      </>;
    }
    case "title": return <Txt label={name("title")} value={it.title} focus placeholder="What's it called?" max={300} onChange={(v) => ed.setItem({ title: v }, "title")} />;
    case "subtitle": return <Txt label={name("subtitle")} value={it.subtitle} focus placeholder="A line under the title" max={300} onChange={(v) => ed.setItem({ subtitle: v }, "subtitle")} />;
    case "body": return <Txt label={name("body")} area tall focus value={it.body} onChange={(v) => ed.setItem({ body: v }, "body")}
      hint={<>{ed.card === "manual" && "Each paragraph or list line becomes a numbered step. "}Write freely. **bold**, _italic_, ## heading, &gt; quote, - list, [link](https://…){it.type === "poll" && ". On the card a poll shows its options instead; this text shows in the full view."}</>} />;
    case "pic": return <>
      <div className="fl stu-f"><span className="lab">Photos, videos &amp; PDFs</span>
        <MediaField key={`${it.id}:${ed.rev}`} name="media" initial={it.media} useBlob={data.useBlob} maxVideoMb={data.maxVideoMb} onChange={(media) => ed.setItem({ media: media as Item["media"] })} />
      </div>
      <button type="button" className="stu-link" onClick={() => ed.open("card", "size")}>Its fit, its height on the card and the part that stays in view are under Size &amp; look →</button>
    </>;
    case "date": return <Txt label={`${name("date")} (any text)`} value={it.date_label} focus placeholder="March 2026, Last summer…" max={80} onChange={(v) => ed.setItem({ date_label: v }, "date")} />;
    case "place": return <Txt label={name("place")} value={it.location} focus placeholder="Dhaka, Bangladesh" max={160} onChange={(v) => ed.setItem({ location: v }, "place")} />;
    case "status": return <>
      <Txt label={name("status")} value={it.status} focus placeholder={ed.card === "fact" ? "Rare" : "Reading, Done, In progress…"} max={60} onChange={(v) => ed.setItem({ status: v }, "status")} />
      <Pills options={ed.card === "fact" ? ["Common", "Rare", "Epic", "Legendary"] : ["Now", "Done", "In progress", "Planned"]} value={it.status} onPick={(v) => ed.setItem({ status: v })} />
    </>;
    case "mood": return (
      <div className="fl stu-f">
        <span className="lab">{name("mood")}</span>
        <div className="stu-moods">
          {Object.entries(MOODS).map(([key, m]) => <button key={key} type="button" className={it.mood === key ? "on" : ""} onClick={() => ed.setItem({ mood: key })}><i style={{ background: m.color }} />{m.emoji} {m.label}</button>)}
          <button type="button" className={it.mood ? "" : "on"} onClick={() => ed.setItem({ mood: "" })}>None</button>
        </div>
        <span className="hint">{ed.card === "sign" ? "The sign's letters are painted in this colour." : "Its colour tints the card and its full view."}</span>
      </div>
    );
    case "tags": return <Chips label={name("tags")} value={it.tags} onChange={(tags) => ed.setItem({ tags })} />;
    case "links": return (
      <div className="fl stu-f"><span className="lab">Buttons (the first one is highlighted in the full view)</span>
        <LinksEditor key={`${it.id}:${ed.rev}`} name="links" initial={it.links} onChange={(rows) => ed.setItem({ links: rows.map(({ label, url }) => ({ label, url })) }, "links")} />
        <span className="hint">A button needs a label and a link that starts with https://, mailto: or tel:. The card shows the first three.</span>
      </div>
    );
    case "poll": {
      const votes = live.votes[it.id] ?? [], sum = votes.reduce((a, b) => a + b, 0);
      return <>
        <PollLines key={`${it.id}:${ed.rev}`} item={it} onChange={(poll_options) => ed.setItem({ poll_options }, "poll")} />
        <div className="fl stu-f">
          {it.poll_options.map((o, i) => (
            <div key={i} className="stu-vote"><span>{o}</span><div><i style={{ width: `${sum ? ((votes[i] ?? 0) / sum) * 100 : 0}%` }} /></div><b>{votes[i] ?? 0}</b></div>
          ))}
          <span className="hint">{sum} vote{sum === 1 ? "" : "s"} so far.</span>
          {sum > 0 && <button type="button" className="b-out b-sm" disabled={ed.busy} onClick={() => ed.ask({ title: "Reset votes?", message: "This clears all votes on this poll, right away. It can't be undone.", yes: "Yes, reset", run: () => ed.reset("votes") })}><i className="ti ti-refresh" />Reset votes</button>}
        </div>
      </>;
    }
    case "size": return <>
      <p className="hint" style={{ margin: 0 }}>For this card only. It overrides the section&apos;s and <a href="/admin/content">all content</a>&apos;s. You can also drag the card&apos;s corner.</p>
      <LookFields st={it.style} above={mergeStyles(data.settings.contentStyle, draft.section.style)} pic={cover} level="this card" hasText={!!it.body.trim()} onChange={(style) => ed.setItem({ style }, "style")} />
    </>;
    case "reacts": return <>
      <div className="fl stu-f">
        <span className="lab">What this card offers beyond its emojis</span>
        <div className="stu-switches">{TALK_FEATURES.map(([key, , label, hint]) => <Sw key={key} label={label} hint={hint} on={it.talk[key]} onChange={(on) => ed.setItem({ talk: { ...it.talk, [key]: on } })} />)}</div>
        <span className="hint">The emoji bar itself is always there.</span>
      </div>
      <div className="fl stu-f">
        <span className="lab">Reactions so far</span>
        <div className="stu-counts">{REACTION_EMOJIS.map((e) => <span key={e}>{e} <b>{counts[e] ?? 0}</b></span>)}</div>
        {total > 0 && <button type="button" className="b-out b-sm" disabled={ed.busy} onClick={() => ed.ask({ title: "Reset reactions?", message: "This clears all reactions on this card, right away. It can't be undone.", yes: "Yes, reset", run: () => ed.reset("reactions") })}><i className="ti ti-refresh" />Reset reactions</button>}
      </div>
      {it.talk.who && (live.people[it.id]?.length ?? 0) > 0 && (
        <div className="fl stu-f"><span className="lab">Who reacted (only you see this)</span>
          <div className="talk-people">{live.people[it.id].map((p, i) => <span key={i}>{p.emoji} {p.name}</span>)}</div>
        </div>
      )}
      {it.id > 0 ? <Comments ed={ed} item={it} /> : <span className="hint">Save first: a new card gets reactions and comments once it&apos;s on the site.</span>}
    </>;
    case "more": {
      const elsewhere = it.section_id !== draft.section.id;
      return <>
        <div className="stu-switches">
          <Sw label="Visible on the site" hint="Off hides it from visitors. It stays here, faded." on={it.visible} onChange={(visible) => ed.setItem({ visible })} />
          <Sw label="Pin to the front" hint="Pinned cards always come first in the row." on={it.pinned} onChange={(pinned) => ed.setItem({ pinned })} />
        </div>
        <div className="fl stu-f">
          <label className="lab" htmlFor="stu-sec">Section</label>
          <select id="stu-sec" value={it.section_id} onChange={(e) => ed.setItem({ section_id: Number(e.target.value) })}>
            {data.sections.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.title}</option>)}
          </select>
          {elsewhere && <span className="hint">It moves there when you save, and leaves this page.</span>}
        </div>
        <div className="btns">
          {it.id > 0 && it.visible && draft.section.visible && <a className="b-out b-sm" href={`/s/${draft.section.slug}/${it.id}`} target="_blank"><i className="ti ti-external-link" />Open on the site</a>}
          <button type="button" className="b-out b-sm" onClick={() => ed.duplicate(it)}><i className="ti ti-copy" />Duplicate</button>
          <button type="button" className="b-danger b-sm" onClick={() => ed.remove(it)}><i className="ti ti-trash" />Delete…</button>
        </div>
        <span className="hint">{it.type === "poll" ? "This card is a poll." : "This card is a post."}{it.id > 0 ? "" : " It's new: it goes on the site when you save."}</span>
      </>;
    }
    case "quote": return <Txt label="Pull quote (only in the full view)" area focus value={it.fv.quote} max={FV_QUOTE_MAX} placeholder="One line you want to stand out" onChange={(v) => ed.setItem({ fv: { ...it.fv, quote: v } }, "quote")} hint="Leave it empty and the full view has no pull quote." />;
  }
  return <p className="hint">Nothing to change here.</p>;
}

/** The full view's own choices: nothing here shows on the card. `k` is "fv", or "fvb:" and a part for one part's options. */
export function FullEditor({ ed, k }: { ed: Ed; k: string }) {
  const it = ed.item;
  if (!it) return <p className="hint">Pick a card first.</p>;
  const fv = it.fv;
  const set = (patch: Partial<Item["fv"]>, tag?: string) => ed.setItem({ fv: { ...fv, ...patch } }, tag);
  const now = fvLook(fv, ed.card, it.media.some((m) => m.type !== "audio"));
  // every choice starts with Automatic, which says what the card's own look picks
  const withAuto = <T extends string>(list: readonly (readonly [T, string, ...string[]])[], cur: T): (readonly [T | "", string])[] =>
    [["", `Automatic (${list.find(([key]) => key === cur)?.[1] ?? ""})`] as const, ...list.map(([key, label]) => [key, label] as const)];
  const moved = Object.keys(fv.at).length > 0;
  if (k.startsWith("fvb:")) {
    const part = k.slice(4) as FvPart;
    const inside: Record<FvPart, string[]> = { pic: ["pic"], title: ["sub", "title", "subtitle"], facts: ["date", "place", "mood", "status"], quote: ["quote"], story: it.type === "poll" ? ["poll", "body"] : ["body"], gallery: ["pic"], tags: ["tags"], buttons: ["links"], reacts: ["reacts"] };
    return <>
      <Sw label="Show this part in the full view" on={!fv.hide[part]} onChange={(on) => { const hide = { ...fv.hide }; if (on) delete hide[part]; else hide[part] = true; set({ hide }); }} />
      <p className="hint" style={{ margin: 0 }}>Drag its handle to move it anywhere on the page, and its corner to resize it. A part grows by itself if what&apos;s in it needs more room.</p>
      <div className="fl stu-f"><span className="lab">What&apos;s in it</span>
        <div className="stu-pills">{inside[part].map((key) => <button key={key} type="button" onClick={() => ed.open("card", key)}>{partName(key, ed.card)} →</button>)}</div>
      </div>
    </>;
  }
  return <>
    <div className="fl stu-f"><span className="lab">Layout</span>
      <Seg label="Layout" value={fv.layout} options={withAuto(FV_LAYOUTS, now.layout)} onChange={(layout) => set({ layout, at: {} })} />
      <span className="hint">{FV_LAYOUTS.find(([key]) => key === now.layout)?.[2]}. Choosing a layout puts every part back in its place.</span>
    </div>
    <div className="fl stu-f"><span className="lab">Background</span>
      <Seg label="Background" value={fv.bg} options={withAuto(FV_BGS, now.bg)} onChange={(bg) => set({ bg })} />
    </div>
    <div className="fl stu-f"><span className="lab">How it opens</span>
      <Seg label="How it opens" value={fv.open} options={withAuto(FV_OPENS, now.open)} onChange={(open) => { set({ open }); setTimeout(ed.play, 60); }} />
      <div className="btns"><button type="button" className="b-out b-sm" onClick={ed.play}><i className="ti ti-player-play" />Play the opening</button></div>
      {!ed.draft.fullfx && <span className="hint">Movement in full views is switched off for the whole site. It&apos;s under Section settings, Movement.</span>}
    </div>
    <Txt label="Pull quote (only in the full view)" area value={fv.quote} max={FV_QUOTE_MAX} placeholder="One line you want to stand out" onChange={(v) => set({ quote: v }, "quote")} />
    <div className="fl stu-f"><span className="lab">Parts in the full view</span>
      <div className="stu-switches">{FV_PARTS.map(([part, label]) => <Sw key={part} label={label} on={!fv.hide[part]} onChange={(on) => { const hide = { ...fv.hide }; if (on) delete hide[part]; else hide[part] = true; set({ hide }); }} />)}</div>
      <span className="hint">A part with nothing in it (no tags, no pull quote) isn&apos;t drawn and leaves no gap.</span>
    </div>
    <div className="btns"><button type="button" className="b-out b-sm" disabled={!moved} onClick={() => set({ at: {} })}><i className="ti ti-restore" />Put every part back where the layout had it</button></div>
    <span className="hint">Only the full view has these: the layout, background, opening, pull quote, and moving its parts. Drag a part by its handle to put it anywhere; drag its corner to resize it. Phones always stack the parts, top to bottom.</span>
  </>;
}

/** Everything about the section itself, in one place. `focus` is the part that was clicked: it's scrolled to and lit. */
export function SectionEditor({ ed, focus }: { ed: Ed; focus: string }) {
  const { draft, data } = ed;
  const s = draft.section;
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { box.current?.querySelector(`[data-k="${focus}"]`)?.scrollIntoView({ block: "nearest" }); }, [focus]);
  const G = ({ k, children }: { k: string; children: React.ReactNode }) => <div className={`stu-g${focus === k ? " on" : ""}`} data-k={k}>{children}</div>;
  const own = draft.items.filter((i) => isCustom(i.style)).length;
  const renameCat = (i: number, v: string) => {
    const name = v.replace(/,/g, " "), old = s.categories[i];
    ed.setDraft((d) => ({ ...d, section: { ...d.section, categories: d.section.categories.map((c, j) => (j === i ? name : c)) }, items: d.items.map((it) => (old && it.category === old ? { ...it, category: name } : it)) }), `cat${i}`);
  };
  const moveCat = (i: number, by: number) => { const j = i + by; if (j < 0 || j >= s.categories.length) return; const c = [...s.categories]; [c[i], c[j]] = [c[j], c[i]]; ed.setSection({ categories: c }); };
  return (
    <div ref={box} className="stu-secform">
      {G({ k: "title", children: <Txt label={SEC_NAMES.title} value={s.title} max={160} onChange={(v) => ed.setSection({ title: v }, "s-title")} /> })}
      {G({ k: "subtitle", children: <Txt label={SEC_NAMES.subtitle} area value={s.subtitle} max={400} onChange={(v) => ed.setSection({ subtitle: v }, "s-subtitle")} /> })}
      {G({ k: "eyebrow", children: <div className="f2"><Txt label={SEC_NAMES.eyebrow} value={s.eyebrow} max={80} onChange={(v) => ed.setSection({ eyebrow: v }, "s-eyebrow")} /><Txt label={SEC_NAMES.eyebrow_emoji} value={s.eyebrow_emoji} max={16} onChange={(v) => ed.setSection({ eyebrow_emoji: v }, "s-ee")} /></div> })}
      {G({ k: "code", children: <div className="f3"><Txt label={SEC_NAMES.code} value={s.code} max={8} placeholder="G1" onChange={(v) => ed.setSection({ code: v }, "s-code")} /><Txt label={SEC_NAMES.nav_label} value={s.nav_label} max={40} onChange={(v) => ed.setSection({ nav_label: v }, "s-nav")} /><Txt label={SEC_NAMES.nav_emoji} value={s.nav_emoji} max={16} onChange={(v) => ed.setSection({ nav_emoji: v }, "s-ne")} /></div> })}
      {G({ k: "slug", children: <Txt label={SEC_NAMES.slug} value={s.slug} max={60} onChange={(v) => ed.setSection({ slug: v }, "s-slug")} hint={`Its address is /s/${s.slug || "…"} and links to it use #${s.slug || "…"}. Changing it breaks links people already have.`} /> })}
      {G({ k: "emojis", children: <Txt label={`${SEC_NAMES.emojis} (separate with spaces)`} value={s.emojis} max={80} onChange={(v) => ed.setSection({ emojis: v }, "s-emojis")} /> })}
      {G({ k: "categories", children: (
        <div className="fl stu-f"><span className="lab">{SEC_NAMES.categories}</span>
          {s.categories.map((c, i) => (
            <div key={i} className="stu-cat">
              <input className="inp" value={c} aria-label={`Subsection ${i + 1}`} onChange={(e) => renameCat(i, e.target.value)} />
              <button type="button" className="adm-iconbtn" disabled={i === 0} aria-label="Move up" onClick={() => moveCat(i, -1)}><i className="ti ti-arrow-up" /></button>
              <button type="button" className="adm-iconbtn" disabled={i === s.categories.length - 1} aria-label="Move down" onClick={() => moveCat(i, 1)}><i className="ti ti-arrow-down" /></button>
              <button type="button" className="adm-iconbtn" aria-label={`Remove ${c}`} onClick={() => ed.setSection({ categories: s.categories.filter((_, j) => j !== i) })}><i className="ti ti-x" /></button>
            </div>
          ))}
          <div><button type="button" className="b-out b-sm" onClick={() => ed.setSection({ categories: [...s.categories, "New subsection"] })}><i className="ti ti-plus" />Add a subsection</button></div>
          <span className="hint">Renaming one renames it on its cards too. Its name picks its cards&apos; look: the unfiltered manual (or about, bio, who) an instruction manual; beliefs or values a protest sign; currently obsessed with (or now, playing, watching, reading) a story; random facts a collectible card; and anything else a plain note.</span>
        </div>
      ) })}
      {G({ k: "home_limit", children: (
        <div className="fl stu-f">
          <Slider label={SEC_NAMES.home_limit} value={s.home_limit} range={[1, 60]} unit="" fallback={6} onChange={(n) => ed.setSection({ home_limit: n }, "s-limit")} />
          <span className="hint">More cards than this adds a “See all” button.</span>
        </div>
      ) })}
      {G({ k: "empty_text", children: <Txt label={SEC_NAMES.empty_text} value={s.empty_text} max={300} onChange={(v) => ed.setSection({ empty_text: v }, "s-empty")} /> })}
      {G({ k: "visible", children: <Sw label={SEC_NAMES.visible} hint="Off takes the whole section off the site and out of the menu. Nothing is deleted." on={s.visible} onChange={(visible) => ed.setSection({ visible })} /> })}
      {G({ k: "ribbon", children: <>
        <Sw label="Show the sliding belt before this section" on={s.ribbon} onChange={(ribbon) => ed.setSection({ ribbon })} />
        <div className="fl stu-f">
          <Slider label="Belt size, for every section's belt" value={draft.ribbonSize} range={RIBBON_SIZE} unit="%" fallback={100} onChange={(n) => ed.setDraft((d) => ({ ...d, ribbonSize: n }), "belt")} onClear={draft.ribbonSize === 100 ? undefined : () => ed.setDraft((d) => ({ ...d, ribbonSize: 100 }))} />
          {!data.settings.effects.ribbons && <span className="hint">Sliding belts are switched off for the whole site, on the <a href="/admin/appearance">Appearance</a> page.</span>}
        </div>
      </> })}
      {G({ k: "motion", children: (
        <div className="fl stu-f"><span className="lab">{SEC_NAMES.motion} (for the whole site)</span>
          <div className="stu-switches">
            <Sw label="Cards come alive" hint="The manual opens, the sign waves, the story's bars run, light sweeps a collectible card." on={draft.notefx} onChange={(notefx) => ed.setDraft((d) => ({ ...d, notefx }))} />
            <Sw label="Full views arrive piece by piece" hint="An opened card's parts unfold, rise or zoom in, and its detail cards straighten when pointed at." on={draft.fullfx} onChange={(fullfx) => ed.setDraft((d) => ({ ...d, fullfx }))} />
          </div>
          <span className="hint">Every other effect is on the <a href="/admin/appearance">Appearance</a> page.</span>
        </div>
      ) })}
      {G({ k: "look", children: <>
        <span className="lab stu-lab">{SEC_NAMES.look} in this section</span>
        <p className="hint" style={{ margin: 0 }}>Overrides <a href="/admin/content">all content</a> for this section. One card&apos;s own settings override this.</p>
        <LookFields st={s.style} above={data.settings.contentStyle} level="this section" hasText onChange={(style) => ed.setSection({ style }, "s-style")} />
        {own > 0 && (
          <div className="stu-note">{own} {own === 1 ? "card here has its" : "cards here have their"} own size and look.
            <button type="button" className="b-out b-sm" onClick={() => ed.ask({ title: "Back to following the section?", message: "Every card here goes back to following the section's size and look. Their own settings are cleared when you save.", yes: "Yes, set them back", run: () => ed.setDraft((d) => ({ ...d, items: d.items.map((i) => (isCustom(i.style) ? { ...i, style: {} } : i)) })) })}><i className="ti ti-restore" />Default for all cards here</button>
          </div>
        )}
      </> })}
      {G({ k: "layout", children: (
        <div className="fl stu-f">
          <label className="lab" htmlFor="stu-layout">{SEC_NAMES.layout}</label>
          <select id="stu-layout" value={s.layout} onChange={(e) => ed.setSection({ layout: e.target.value })}>{LAYOUTS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</select>
          {s.layout !== "notes" && <span className="hint">After you save, this section uses the older boxes to edit, until that layout gets this editor too.</span>}
        </div>
      ) })}
      {G({ k: "danger", children: (
        <form action={deleteSection} className="stu-note danger">
          <input type="hidden" name="id" value={s.id} />
          <span>Delete this section and all {draft.items.length} of its cards for good. Tip: hiding it is reversible.</span>
          <ConfirmSubmit title={`Delete "${s.title}"?`} message={`This removes the section${draft.items.length === 0 ? "" : draft.items.length === 1 ? " and its 1 card" : ` and all ${draft.items.length} cards`} for good, right away. It can't be undone. Tip: hiding it keeps everything safe.`} yes="Yes, delete" className="b-danger b-sm"><i className="ti ti-trash" />Delete section</ConfirmSubmit>
        </form>
      ) })}
    </div>
  );
}
