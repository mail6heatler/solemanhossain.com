import { notFound } from "next/navigation";
import { getLookCounts, getSampleItem, getSection, getSettings, getItems, getReactionCountsFor, type ReactionCounts } from "@/lib/data";
import { LAYOUTS, MOODS, hasStudio, isConnectLayout } from "@/lib/settings";
import { loadStudio } from "@/lib/studioData";
import Studio from "@/components/admin/studio/Studio";
import { createItem, deleteSection, moveItem, resetSectionLooks, saveLook, toggleItem, updateSection } from "@/app/actions";
import { ConfirmSubmit } from "@/components/admin/Widgets";
import LookControls from "@/components/admin/LookControls";
import OrderList from "@/components/admin/OrderList";
import { lookSample } from "@/components/admin/lookSample";
import { tripContext } from "@/components/site/TripFrame";
import { isCustom } from "@/lib/contentStyle";
import type { Item } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import SaveBox from "@/components/admin/SaveBox";
import { Box } from "@/components/admin/Box";
import BoxMemory from "@/components/admin/BoxMemory";
import { boxOpen } from "@/lib/boxes";

type P = { params: Promise<{ id: string }>; searchParams: Promise<{ card?: string }> };

export default async function SectionAdmin({ params, searchParams }: P) {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const { id } = await params;
  const section = /^\d+$/.test(id) ? await getSection({ id: Number(id) }) : null;
  if (!section) notFound();
  // a section laid out as Notes is edited in the live editor: its header, its cards, their order and each card's full view on one page
  if (hasStudio(section.layout)) {
    const data = await loadStudio(section.id);
    if (!data) notFound();
    const card = Number((await searchParams).card);
    return <Studio key={section.id} data={data} startCard={Number.isInteger(card) ? card : undefined} />;
  }
  const items = await getItems(section.id);
  const reactions = await getReactionCountsFor(items.map((i) => i.id));
  const [settings, sample, lookCounts] = await Promise.all([getSettings(), getSampleItem(section.id), getLookCounts()]);
  const ownLooks = lookCounts.get(section.id) ?? 0;

  // group entries by subsection (category), keeping the order you defined
  const names = [...section.categories];
  for (const it of items) if (it.category && !names.includes(it.category)) names.push(it.category);
  const groups = names.map((n) => ({ name: n, items: items.filter((i) => i.category === n) }));
  const loose = items.filter((i) => !i.category);
  if (loose.length || names.length === 0) groups.push({ name: "", items: loose });
  const isConnect = isConnectLayout(section.layout);
  const open = (name: string, first = true) => boxOpen(section.boxes, name, first);

  return (
    <div className="adm-page" key={section.id}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="adm-h">{section.code && `${section.code} · `}{section.title}</h1>
          <p className="adm-sub">{section.eyebrow_emoji} {section.eyebrow} · {items.length} entries · {section.visible ? "visible" : "hidden from the site"}</p>
        </div>
        <div className="btns">
          <a href={`/#${section.slug}`} target="_blank" className="b-out b-sm"><i className="ti ti-eye" />View on site</a>
        </div>
      </div>

      <BoxMemory />
      {isConnect && (
        <Box name="about" title="About this section" icon="info-circle" open={open("about")}>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
            This section shows your social links (edit them in <a href="/admin/settings">Settings</a>),
            the &ldquo;say hello&rdquo; form (messages arrive in your <a href="/admin/inbox">Inbox</a>) and the guest wall.
            Entries you add here appear as testimonials: put the quote in the story and the person&apos;s name in the subtitle.
            {section.layout === "chat" && <> As a Chat window, the notes you approve are the chat&apos;s history, your links are the contacts on its left, testimonials are pinned under them, and your hero photo and nickname are the chat&apos;s face.</>}
          </div>
        </Box>
      )}

      {items.length > 1 && (
        <Box name="order" id="order" title={`Order on the site: ${items.length} entries`} icon="arrows-sort" open={open("order", false)}>
          <OrderList sectionId={section.id} initial={items.map((it) => ({ id: it.id, title: it.title, pinned: it.pinned, visible: it.visible, kind: [it.type === "poll" ? "Poll" : "", it.category].filter(Boolean).join(" · ") }))} />
        </Box>
      )}

      <Box name="entries" title={`Entries (${items.length})`} icon="list" open={open("entries")}>
        {groups.map((g) => (
          <div key={g.name || "_none"}>
            <div className="cat-h">
              <h3>{g.name || "No subsection"}</h3><span className="n">{g.items.length}</span><span className="line" />
            </div>
            {g.items.map((it) => <Row key={it.id} it={it} all={g.items} reactions={reactions[it.id]} />)}
            <form action={createItem} className="add-row" style={{ marginBottom: 6 }}>
              <input type="hidden" name="section_id" value={section.id} />
              <input type="hidden" name="category" value={g.name} />
              <input className="inp" name="title" placeholder={`Add to ${g.name || "this section"}…`} required />
              <select name="type" defaultValue="post" aria-label="Type">
                <option value="post">Post</option>
                <option value="poll">Poll</option>
              </select>
              <button className="b-dark b-sm"><i className="ti ti-plus" />Add</button>
            </form>
          </div>
        ))}
      </Box>

      <Box name="look" title={`Size & look for this section${isCustom(section.style) ? " (customised)" : ""}`} icon="adjustments" open={open("look", isCustom(section.style))}>
        <form action={saveLook} id="look">
          <input type="hidden" name="kind" value="section" />
          <input type="hidden" name="id" value={section.id} />
          <input type="hidden" name="boxes" />
          <div className="f">
            <p className="c-desc" style={{ whiteSpace: "normal", margin: 0 }}>Overrides <a href="/admin/content">all content</a> for this section. One entry&apos;s own settings override this.</p>
            <LookControls initial={section.style} above={settings.contentStyle} sample={lookSample(sample, tripContext(settings, section))} layout={section.layout} level="this section" />
          </div>
        </form>
        {ownLooks > 0 && (
          <form action={resetSectionLooks} className="c c-row" style={{ marginTop: 14, marginBottom: 0 }}>
            <input type="hidden" name="id" value={section.id} />
            <div className="grow"><div className="c-desc">{ownLooks} {ownLooks === 1 ? "entry here has" : "entries here have"} their own size and look settings.</div></div>
            <ConfirmSubmit title="Back to following the section?" message="Every entry here goes back to following the section's size and look. Their own settings are cleared." yes="Yes, set them back" className="b-out b-sm"><i className="ti ti-restore" />Default for all entries here</ConfirmSubmit>
          </form>
        )}
      </Box>

      <form action={updateSection} id="settings">
        <input type="hidden" name="id" value={section.id} />
        <input type="hidden" name="boxes" />
        <Box name="settings" title="Section settings: titles, layout, subsections, emojis" icon="settings" open={open("settings", false)}>
          <div className="f">
            <div className="f3">
              <div className="fl"><label>Code tag</label><input className="inp" name="code" defaultValue={section.code} placeholder="G1" /></div>
              <div className="fl"><label>Nav label</label><input className="inp" name="nav_label" defaultValue={section.nav_label} /></div>
              <div className="fl"><label>Nav emoji</label><input className="inp" name="nav_emoji" defaultValue={section.nav_emoji} /></div>
            </div>
            <div className="f3">
              <div className="fl"><label>Small label (eyebrow)</label><input className="inp" name="eyebrow" defaultValue={section.eyebrow} /></div>
              <div className="fl"><label>Eyebrow emoji</label><input className="inp" name="eyebrow_emoji" defaultValue={section.eyebrow_emoji} /></div>
              <div className="fl"><label>URL name</label><input className="inp" name="slug" defaultValue={section.slug} /></div>
            </div>
            <div className="fl"><label>Big title</label><input className="inp" name="title" defaultValue={section.title} required /></div>
            <div className="fl"><label>Subtitle</label><textarea name="subtitle" defaultValue={section.subtitle} style={{ minHeight: 60 }} /></div>
            <div className="f2">
              <div className="fl"><label>Layout</label>
                <select name="layout" defaultValue={section.layout}>{LAYOUTS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</select>
              </div>
              <div className="fl"><label>Entries shown on the homepage</label><input className="inp" type="number" name="home_limit" min={1} max={60} defaultValue={section.home_limit} />
                <div className="hint">More than this adds a &ldquo;See all&rdquo; button.</div></div>
            </div>
            <div className="fl"><label>Subsections (one per line)</label><textarea name="categories" defaultValue={section.categories.join("\n")} />{section.layout === "study" && <div className="hint">With Study shelf, a subsection&apos;s name picks its entries&apos; object: books give a book; songs, music, podcasts, radio, video, film, listening or watching give a TV player; people give a framed portrait; the internet gives a phone; and anything else a note.</div>}{section.layout === "awards" && <div className="hint">With Achievement wall, a subsection&apos;s name picks its entries&apos; card: hall of fame gets a star on the red carpet; skills, certificates, courses or degrees a certificate; career, jobs or milestones an RFID staff card, bright if you still work there and faded if not; and anything else a newspaper front page, or a card mended in gold if the Mood is heavy.</div>}{section.layout === "notes" && <div className="hint">With Notes, a subsection&apos;s name picks its entries&apos; card: the unfiltered manual (or about, bio, who) an instruction manual; beliefs or values a protest sign; currently obsessed with (or now, playing, watching, reading) a story; random facts a collectible card; and anything else a plain note.</div>}{section.layout === "windows" && <div className="hint">With App windows, a subsection&apos;s name picks its entries&apos; app: data or storytelling a spreadsheet; code or problem solving a code editor; brain dumps or ideas a notes app; side quests or games a pocket games console; and anything else a browser window.</div>}{section.layout === "scrapbook" && <div className="hint">With Scrapbook pages, a subsection&apos;s name picks its entries&apos; page: a photo diary gets a diary page with a taped photo; where you&apos;ve lived a scrap of map with a pin; rituals or habits a habit tracker; random snapshots a pile of photos under a paperclip; and anything else a diary page.</div>}{section.layout === "tickets" && <div className="hint">With Boarding passes, a subsection&apos;s name picks its entries&apos; frame: a quest gets a camera, a bucket list a note with ticks, “Through my eyes” a polaroid, “Moments” a postcard, and anything else a ticket.</div>}</div>
            <div className="f2">
              <div className="fl"><label>Floating emojis (separate with spaces)</label><input className="inp" name="emojis" defaultValue={section.emojis} /></div>
              <div className="fl"><label>Message when empty</label><input className="inp" name="empty_text" defaultValue={section.empty_text} /></div>
            </div>
            <label className="switch"><input type="checkbox" name="visible" defaultChecked={section.visible} />Visible on the site</label>
            <label className="switch"><input type="checkbox" name="ribbon" defaultChecked={section.ribbon} />Show the sliding headline before this section</label>
          </div>
        </Box>
        <SaveBox label="Save section">
          <a href={`/#${section.slug}`} target="_blank" className="b-out"><i className="ti ti-eye" />View on site</a>
        </SaveBox>
      </form>

      <form action={deleteSection} className="c c-row" style={{ marginTop: 14, borderColor: "color-mix(in srgb, var(--danger) 30%, var(--card-border))" }}>
        <input type="hidden" name="id" value={section.id} />
        <div className="grow"><div className="c-title">Delete this section</div><div className="c-desc">Removes it and all {items.length} entries for good. Tip: hiding it is reversible.</div></div>
        <ConfirmSubmit title={`Delete "${section.title}"?`} message={`This removes the section${items.length === 0 ? "" : items.length === 1 ? " and its 1 entry" : ` and all ${items.length} entries`} for good. It can't be undone. Tip: hiding it keeps everything safe.`} yes="Yes, delete"><i className="ti ti-trash" />Delete</ConfirmSubmit>
      </form>
    </div>
  );
}

function Row({ it, all, reactions }: { it: Item; all: Item[]; reactions?: ReactionCounts }) {
  const idx = all.findIndex((x) => x.id === it.id);
  const r = Object.entries(reactions ?? {}).filter(([, n]) => n > 0).map(([e, n]) => `${e} ${n}`).join("  ");
  const desc = [
    it.type === "poll" ? `📊 poll · ${it.poll_options.length} options` : "",
    it.date_label, it.location, it.status, MOODS[it.mood]?.label, it.image_url ? "📷" : "", isCustom(it.style) ? "own size" : "", r,
  ].filter(Boolean).join(" · ");
  return (
    <div className={`c hov ${it.visible ? "" : "off"}`}>
      <div className="c-row">
        <div className="grow">
          <div className="c-title"><a href={`/admin/items/${it.id}`}>{it.pinned && "★ "}{it.title}</a></div>
          <div className="c-desc">{desc || it.subtitle || "—"}</div>
        </div>
        <div className="btns">
          <form action={moveItem}><input type="hidden" name="id" value={it.id} /><input type="hidden" name="section_id" value={it.section_id} /><input type="hidden" name="dir" value="up" />
            <button className="adm-iconbtn" disabled={idx === 0} aria-label="Move up"><i className="ti ti-arrow-up" /></button></form>
          <form action={moveItem}><input type="hidden" name="id" value={it.id} /><input type="hidden" name="section_id" value={it.section_id} /><input type="hidden" name="dir" value="down" />
            <button className="adm-iconbtn" disabled={idx === all.length - 1} aria-label="Move down"><i className="ti ti-arrow-down" /></button></form>
          <form action={toggleItem}><input type="hidden" name="id" value={it.id} />
            <button className="adm-iconbtn" aria-label={it.visible ? "Hide" : "Show"} title={it.visible ? "Hide" : "Show"}><i className={`ti ${it.visible ? "ti-eye" : "ti-eye-off"}`} /></button></form>
          <a href={`/admin/items/${it.id}`} className="b-out b-sm"><i className="ti ti-edit" />Edit</a>
        </div>
      </div>
    </div>
  );
}
