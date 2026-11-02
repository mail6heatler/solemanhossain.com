import { notFound } from "next/navigation";
import { getSection, getItems } from "@/lib/data";
import { LAYOUTS, MOODS } from "@/lib/settings";
import { createItem, deleteSection, moveItem, toggleItem, updateSection } from "@/app/actions";
import { ConfirmSubmit } from "@/components/admin/Widgets";
import type { Item } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";

type P = { params: Promise<{ id: string }> };

export default async function SectionAdmin({ params }: P) {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const { id } = await params;
  const section = /^\d+$/.test(id) ? await getSection({ id: Number(id) }) : null;
  if (!section) notFound();
  const items = await getItems(section.id);

  // group entries by subsection (category), keeping the order you defined
  const names = [...section.categories];
  for (const it of items) if (it.category && !names.includes(it.category)) names.push(it.category);
  const groups = names.map((n) => ({ name: n, items: items.filter((i) => i.category === n) }));
  const loose = items.filter((i) => !i.category);
  if (loose.length || names.length === 0) groups.push({ name: "", items: loose });
  const isConnect = section.layout === "connect";

  return (
    <div className="adm-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="adm-h">{section.code && `${section.code} · `}{section.title}</h1>
          <p className="adm-sub">{section.eyebrow_emoji} {section.eyebrow} · {items.length} entries · {section.visible ? "visible" : "hidden from the site"}</p>
        </div>
        <div className="btns">
          <a href={`/#${section.slug}`} target="_blank" className="b-out b-sm"><i className="ti ti-eye" />View on site</a>
          <a href="#settings" className="b-out b-sm"><i className="ti ti-settings" />Section settings</a>
        </div>
      </div>

      {isConnect && (
        <div className="c" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
          <i className="ti ti-info-circle" style={{ color: "var(--icon)" }} /> This section shows your social links (edit them in <a href="/admin/settings">Settings</a>),
          the &ldquo;say hello&rdquo; form (messages arrive in your <a href="/admin/inbox">Inbox</a>) and the guest wall.
          Entries you add here appear as testimonials: put the quote in the story and the person&apos;s name in the subtitle.
        </div>
      )}

      {groups.map((g) => (
        <div key={g.name || "_none"}>
          <div className="cat-h">
            <h3>{g.name || "No subsection"}</h3><span className="n">{g.items.length}</span><span className="line" />
          </div>
          {g.items.map((it) => <Row key={it.id} it={it} all={g.items} />)}
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

      <form action={updateSection} id="settings">
        <details className="c" style={{ marginTop: 26 }}>
          <summary><i className="ti ti-settings" style={{ color: "var(--icon)" }} />Section settings: titles, layout, subsections, emojis<i className="ti ti-chevron-down" /></summary>
          <input type="hidden" name="id" value={section.id} />
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
            <div className="fl"><label>Subsections (one per line)</label><textarea name="categories" defaultValue={section.categories.join("\n")} /></div>
            <div className="f2">
              <div className="fl"><label>Floating emojis (separate with spaces)</label><input className="inp" name="emojis" defaultValue={section.emojis} /></div>
              <div className="fl"><label>Message when empty</label><input className="inp" name="empty_text" defaultValue={section.empty_text} /></div>
            </div>
            <label className="switch"><input type="checkbox" name="visible" defaultChecked={section.visible} />Visible on the site</label>
            <div><button className="b-mint"><i className="ti ti-device-floppy" />Save section</button></div>
          </div>
        </details>
      </form>

      <form action={deleteSection} className="c c-row" style={{ marginTop: 14, borderColor: "color-mix(in srgb, var(--danger) 30%, var(--card-border))" }}>
        <input type="hidden" name="id" value={section.id} />
        <div className="grow"><div className="c-title">Delete this section</div><div className="c-desc">Removes it and all {items.length} entries for good. Tip: hiding it is reversible.</div></div>
        <ConfirmSubmit message={`Delete "${section.title}" and all ${items.length} entries? This can't be undone.`}><i className="ti ti-trash" />Delete</ConfirmSubmit>
      </form>
    </div>
  );
}

function Row({ it, all }: { it: Item; all: Item[] }) {
  const idx = all.findIndex((x) => x.id === it.id);
  const desc = [
    it.type === "poll" ? `📊 poll · ${it.poll_options.length} options` : "",
    it.date_label, it.location, it.status, MOODS[it.mood]?.label, it.image_url ? "📷" : "",
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
