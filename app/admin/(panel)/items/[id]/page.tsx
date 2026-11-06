import { notFound } from "next/navigation";
import { getItem, getSection, getSections, getSettings, getPollCounts, getReactionCounts } from "@/lib/data";
import { MOODS, REACTION_EMOJIS } from "@/lib/settings";
import { deleteItem, resetPoll, resetReactions, saveLook, updateItem } from "@/app/actions";
import { ConfirmSubmit, LinksEditor, MediaField } from "@/components/admin/Widgets";
import LookControls from "@/components/admin/LookControls";
import { lookSample } from "@/components/admin/lookSample";
import { isCustom, mergeStyles } from "@/lib/contentStyle";
import { requireAdmin } from "@/lib/auth";
import SaveBox from "@/components/admin/SaveBox";

type P = { params: Promise<{ id: string }> };

export default async function ItemEditor({ params }: P) {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const { id } = await params;
  const item = /^\d+$/.test(id) ? await getItem(Number(id)) : null;
  if (!item) notFound();
  const [section, sections, settings] = await Promise.all([getSection({ id: item.section_id }), getSections(), getSettings()]);
  const isPoll = item.type === "poll";
  const counts = isPoll ? await getPollCounts(item.id, item.poll_options.length) : [];
  const reactions = isPoll ? {} : await getReactionCounts(item.id);
  const reactionTotal = Object.values(reactions).reduce((a, b) => a + b, 0);
  const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN; // big videos go to Vercel Blob when it's connected
  const total = counts.reduce((a, b) => a + b, 0);
  const cats = Array.from(new Set([...(section?.categories ?? []), item.category].filter(Boolean)));

  return (
    <div className="adm-page">
      <a href={`/admin/s/${item.section_id}`} className="b-out b-sm" style={{ marginBottom: 14 }}><i className="ti ti-arrow-left" />{section?.code} · {section?.title}</a>
      <h1 className="adm-h" style={{ marginTop: 12 }}>{isPoll ? "📊 " : ""}{item.title}</h1>
      <p className="adm-sub">
        {item.category || "No subsection"} · {item.visible ? "visible" : "hidden"} ·{" "}
        {section && <a href={`/s/${section.slug}/${item.id}`} target="_blank">open on site ↗</a>}
      </p>

      <form action={updateItem}>
        <input type="hidden" name="id" value={item.id} />
        <div className="c f">
          <div className="fl"><label>Title</label><input className="inp" name="title" defaultValue={item.title} required /></div>
          <div className="f2">
            <div className="fl"><label>Subtitle (author, tech stack, a person&apos;s name…)</label><input className="inp" name="subtitle" defaultValue={item.subtitle} /></div>
            <div className="fl"><label>Subsection</label>
              <input className="inp" name="category" defaultValue={item.category} list="cats" placeholder="Pick or type a new one" />
              <datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
          </div>
        </div>

        {isPoll && (
          <>
            <div className="adm-label">Poll options</div>
            <div className="c f">
              <div className="fl"><label>One option per line (2 to 8)</label><textarea name="poll_options" defaultValue={item.poll_options.join("\n")} style={{ minHeight: 110 }} /></div>
              <div>
                {item.poll_options.map((o, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12.5, margin: "4px 0" }}>
                    <span style={{ width: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o}</span>
                    <div style={{ flex: 1, height: 8, background: "var(--page-bg)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: `${total ? (counts[i] / total) * 100 : 0}%`, height: "100%", background: "var(--mint)" }} />
                    </div>
                    <b style={{ width: 40, textAlign: "right" }}>{counts[i]}</b>
                  </div>
                ))}
                <div className="c-desc">{total} votes so far</div>
              </div>
            </div>
          </>
        )}

        <div className="adm-label">Story</div>
        <div className="c f">
          <div className="fl">
            <label>Write freely. **bold**, _italic_, ## heading, &gt; quote, - list, [link](https://…)</label>
            <textarea name="body" className="tall" defaultValue={item.body} />
          </div>
          <div className="fl"><span className="lab">Photos &amp; videos</span>
            <MediaField name="media" initial={item.media} useBlob={useBlob} maxVideoMb={useBlob ? 200 : process.env.VERCEL ? 4 : 60} /></div>
        </div>

        <div className="adm-label">Details</div>
        <div className="c f">
          <div className="f3">
            <div className="fl"><label>Date (any text)</label><input className="inp" name="date_label" defaultValue={item.date_label} placeholder="March 2026, Last summer…" /></div>
            <div className="fl"><label>Place</label><input className="inp" name="location" defaultValue={item.location} placeholder="Cox's Bazar" /></div>
            <div className="fl"><label>Status</label><input className="inp" name="status" defaultValue={item.status} placeholder="Reading, Done, In progress…" /></div>
          </div>
          <div className="f2">
            <div className="fl"><label>Mood</label>
              <select name="mood" defaultValue={item.mood}>
                <option value="">— none —</option>
                {Object.entries(MOODS).map(([k, m]) => <option key={k} value={k}>{m.emoji} {m.label}</option>)}
              </select>
            </div>
            <div className="fl"><label>Tags (comma separated)</label><input className="inp" name="tags" defaultValue={item.tags.join(", ")} /></div>
          </div>
          <div className="fl"><span className="lab">Buttons on the entry page (first one is highlighted)</span><LinksEditor name="links" initial={item.links} /></div>
          <div className="f2">
            <div className="fl"><label>Section</label>
              <select name="section_id" defaultValue={item.section_id}>{sections.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.title}</option>)}</select>
            </div>
          </div>
          <div className="switches">
            <label className="switch"><input type="checkbox" name="visible" defaultChecked={item.visible} />Visible on site</label>
            <label className="switch"><input type="checkbox" name="pinned" defaultChecked={item.pinned} />Pin / feature at the top</label>
          </div>
        </div>

        <SaveBox label="Save entry">
          <a href={`/admin/s/${item.section_id}`} className="b-out"><i className="ti ti-arrow-left" />Back</a>
          {section && <a href={`/s/${section.slug}/${item.id}`} target="_blank" className="b-out"><i className="ti ti-eye" />Open on site</a>}
        </SaveBox>
      </form>

      <form action={saveLook} id="look">
        <input type="hidden" name="kind" value="item" />
        <input type="hidden" name="id" value={item.id} />
        <details className="c" style={{ marginTop: 24 }} open={isCustom(item.style)}>
          <summary><i className="ti ti-adjustments" style={{ color: "var(--icon)" }} />Size &amp; look for this {isPoll ? "poll" : "entry"}{isCustom(item.style) ? " (customised)" : ""}<i className="ti ti-chevron-down" style={{ marginLeft: "auto" }} /></summary>
          <div className="f" style={{ marginTop: 12 }}>
            <p className="c-desc" style={{ whiteSpace: "normal", margin: 0 }}>Overrides its section and <a href="/admin/content">all content</a>, for this one only.</p>
            <LookControls initial={item.style} above={mergeStyles(settings.contentStyle, section?.style)} sample={lookSample(item)} layout={section?.layout ?? "cards"} level="this entry" />
          </div>
        </details>
      </form>

      {!isPoll && (
        <div className="c c-row" style={{ marginTop: 24 }}>
          <div className="grow">
            <div className="c-title">Reactions</div>
            <div className="c-desc" style={{ whiteSpace: "normal", fontSize: 15 }}>
              {REACTION_EMOJIS.map((e) => <span key={e} style={{ marginRight: 14 }}>{e} <b>{reactions[e] ?? 0}</b></span>)}
            </div>
          </div>
          {reactionTotal > 0 && (
            <form action={resetReactions}><input type="hidden" name="id" value={item.id} />
              <ConfirmSubmit message="Clear all reactions on this entry?" className="b-out b-sm"><i className="ti ti-refresh" />Reset reactions</ConfirmSubmit></form>
          )}
        </div>
      )}

      <div className="c c-row" style={{ marginTop: 24 }}>
        <div className="grow"><div className="c-title">Danger zone</div><div className="c-desc">Hiding is reversible. Deleting is not.</div></div>
        <div className="btns">
          {isPoll && (
            <form action={resetPoll}><input type="hidden" name="id" value={item.id} />
              <ConfirmSubmit message="Clear all votes on this poll?" className="b-out b-sm"><i className="ti ti-refresh" />Reset votes</ConfirmSubmit></form>
          )}
          <form action={deleteItem}><input type="hidden" name="id" value={item.id} />
            <ConfirmSubmit message={`Delete "${item.title}"?`}><i className="ti ti-trash" />Delete</ConfirmSubmit></form>
        </div>
      </div>
    </div>
  );
}
