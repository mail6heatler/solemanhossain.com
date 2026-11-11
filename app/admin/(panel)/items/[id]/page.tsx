import { notFound } from "next/navigation";
import { getComments, getItem, getReactionPeople, getSection, getSections, getSettings, getPollCounts, getReactionCounts } from "@/lib/data";
import { MOODS, REACTION_EMOJIS, STUDY_STATUSES } from "@/lib/settings";
import { commentAction, deleteItem, resetPoll, resetReactions, saveLook, updateItem } from "@/app/actions";
import { ConfirmSubmit, LinksEditor, MediaField } from "@/components/admin/Widgets";
import LookControls from "@/components/admin/LookControls";
import { lookSample } from "@/components/admin/lookSample";
import { isCustom, mergeStyles } from "@/lib/contentStyle";
import { requireAdmin } from "@/lib/auth";
import SaveBox from "@/components/admin/SaveBox";
import { Box } from "@/components/admin/Box";
import BoxMemory from "@/components/admin/BoxMemory";
import { boxOpen } from "@/lib/boxes";
import { COMMENT_MAX, TALK_FEATURES } from "@/lib/talk";
import TripStatus from "@/components/admin/TripStatus";
import TripPanel from "@/components/admin/TripPanel";
import StudyPanel from "@/components/admin/StudyPanel";
import ComicPanel from "@/components/admin/ComicPanel";
import AwardDetails from "@/components/admin/AwardDetails";
import ScrapPanel from "@/components/admin/ScrapPanel";
import { tripContext } from "@/components/site/TripFrame";

type P = { params: Promise<{ id: string }> };

export default async function ItemEditor({ params }: P) {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const { id } = await params;
  const item = /^\d+$/.test(id) ? await getItem(Number(id)) : null;
  if (!item) notFound();
  const [section, sections, settings] = await Promise.all([getSection({ id: item.section_id }), getSections(), getSettings()]);
  const isPoll = item.type === "poll";
  const counts = isPoll ? await getPollCounts(item.id, item.poll_options.length) : [];
  const [reactions, people, comments] = await Promise.all([getReactionCounts(item.id), getReactionPeople(item.id), getComments(item.id, true)]);
  const reactionTotal = Object.values(reactions).reduce((a, b) => a + b, 0);
  const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN; // big videos go to Vercel Blob when it's connected
  const total = counts.reduce((a, b) => a + b, 0);
  const cats = Array.from(new Set([...(section?.categories ?? []), item.category].filter(Boolean)));
  const trip = tripContext(settings, section);
  const open = (name: string, first = true) => boxOpen(item.boxes, name, first);
  const when = (iso: string) => {
    try { return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: settings.timezone || "UTC" }); }
    catch { return new Date(iso).toLocaleString("en-GB"); }
  };

  return (
    <div className="adm-page" key={item.id}>
      <a href={`/admin/s/${item.section_id}`} className="b-out b-sm" style={{ marginBottom: 14 }}><i className="ti ti-arrow-left" />{section?.code} · {section?.title}</a>
      <h1 className="adm-h" style={{ marginTop: 12 }}>{isPoll ? "📊 " : ""}{item.title}</h1>
      <p className="adm-sub">
        {item.category || "No subsection"} · {item.visible ? "visible" : "hidden"} ·{" "}
        {section && <a href={`/s/${section.slug}/${item.id}`} target="_blank">open on site ↗</a>}
      </p>

      <BoxMemory />
      <form action={updateItem} id="entry">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="boxes" />
        <Box name="basics" title="Title & subsection" icon="forms" open={open("basics")}>
          <div className="f">
            <div className="fl"><label>Title</label><input className="inp" name="title" defaultValue={item.title} required /></div>
            <div className="f2">
              <div className="fl"><label>Subtitle (author, tech stack, a person&apos;s name…)</label><input className="inp" name="subtitle" defaultValue={item.subtitle} /></div>
              <div className="fl"><label>Subsection</label>
                <input className="inp" name="category" defaultValue={item.category} list="cats" placeholder="Pick or type a new one" />
                <datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
                {section?.layout === "study" && <div className="hint">Its name picks the object: books give a book; songs, music, podcasts, radio, video, film, listening or watching give a TV player; people give a framed portrait; the internet gives a phone; and anything else a note. You can also choose under On the shelf.</div>}
                {section?.layout === "awards" && <div className="hint">Its name picks the card: hall of fame gets a star on the red carpet; skills, certificates, courses or degrees a certificate; career, jobs or milestones an RFID staff card, bright if you still work there and faded if not; and anything else a newspaper front page, or a card mended in gold if its Mood is heavy. You can also choose one under Details, below.</div>}
                {section?.layout === "comic" && <div className="hint">Its name picks the panel: hot takes get a shout with flames; poems a night sky; sayings a fridge door; on repeat a spinning record; vibing waves in the Mood&apos;s colour; a brain dump a bin; chaos scraps of paper; quick fire a quiz show; and anything else a speech bubble. A poll under overrated or underrated gets a balance scale, and any other poll goes by how many options it has. You can also choose one under In the comic, below.</div>}
                {section?.layout === "scrapbook" && <div className="hint">Its name picks the page: a photo diary gets a diary page with a taped photo; where you&apos;ve lived (or homes, houses, cities) a scrap of map with a pin; rituals, habits or routines a habit tracker; random snapshots a pile of photos under a paperclip; and anything else a diary page. You can also choose one under On the page, below.</div>}
                {section?.layout === "tickets" && <div className="hint">Its name picks the frame: a quest gets a camera, a bucket list a note with ticks, “Through my eyes” a polaroid, “Moments” a postcard, and anything else a ticket.</div>}
              </div>
            </div>
          </div>
        </Box>

        {isPoll && (
          <Box name="poll" title="Poll options" icon="chart-bar" open={open("poll")}>
            <div className="f">
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
          </Box>
        )}

        <Box name="story" title="Story" icon="article" open={open("story")}>
          <div className="f">
            <div className="fl">
              <label>Write freely. **bold**, _italic_, ## heading, &gt; quote, - list, [link](https://…)</label>
              <textarea name="body" className="tall" defaultValue={item.body} />
            </div>
            <div className="fl"><span className="lab">{section?.layout === "study" ? "Photos, videos, sound & PDFs" : "Photos, videos & PDFs"}</span>
              <MediaField name="media" initial={item.media} useBlob={useBlob} maxVideoMb={useBlob ? 200 : process.env.VERCEL ? 4 : 60} allowAudio={section?.layout === "study"} /></div>
          </div>
        </Box>

        <Box name="details" title="Details" icon="list-details" open={open("details")}>
          <div className="f">
            {section?.layout === "awards" && <AwardDetails initial={item.award} title={item.title} category={item.category} mood={item.mood} date={item.date_label} />}
            <div className="f3">
              <div className="fl"><label>Date (any text)</label><input className="inp" name="date_label" defaultValue={item.date_label} placeholder="March 2026, Last summer…" /></div>
              <div className="fl"><label>Place</label><input className="inp" name="location" defaultValue={item.location} placeholder="Cox's Bazar" /></div>
              <div className="fl"><label htmlFor="status">Status</label>{section?.layout === "tickets" ? <TripStatus initial={item.status} /> : section?.layout === "study" ? <TripStatus initial={item.status} options={STUDY_STATUSES} hint="Shows on the book's ribbon, the player's sticker or the phone's notification." /> : <input className="inp" id="status" name="status" defaultValue={item.status} placeholder="Reading, Done, In progress…" />}</div>
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
        </Box>
        {section?.layout === "study" && <StudyPanel open={open("panel")} initial={item.study} category={item.category} />}
        {section?.layout === "scrapbook" && <ScrapPanel open={open("panel")} initial={item.scrap} category={item.category} />}
        {section?.layout === "comic" && <ComicPanel open={open("panel")} initial={item.comic} title={item.title} category={item.category} isPoll={isPoll} options={item.poll_options} hasPic={item.media.some((m) => m.type !== "audio")} />}
        {section?.layout === "tickets" && <TripPanel open={open("panel")} initial={item.pass} category={item.category} title={item.title} place={item.location} home={trip.home} passenger={trip.passenger} />}
      </form>

      <form action={saveLook} id="look">
        <input type="hidden" name="kind" value="item" />
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="boxes" />
        <Box name="look" title={`Size & look for this ${isPoll ? "poll" : "entry"}${isCustom(item.style) ? " (customised)" : ""}`} icon="adjustments" open={open("look", isCustom(item.style))}>
          <div className="f">
            <p className="c-desc" style={{ whiteSpace: "normal", margin: 0 }}>Overrides its section and <a href="/admin/content">all content</a>, for this one only.</p>
            <LookControls initial={item.style} above={mergeStyles(settings.contentStyle, section?.style)} sample={lookSample(item, trip)} layout={section?.layout ?? "cards"} level="this entry" />
          </div>
        </Box>
      </form>

      <Box name="reactions" title="Reactions & comments" icon="mood-smile" open={open("reactions")}>
        <div className="f">
          <div className="fl"><span className="lab">What this entry offers beyond its emojis</span>
            <input type="hidden" form="entry" name="talk_sent" value="1" />
            <div className="talk-switches">
              {TALK_FEATURES.map(([k, , label, hint]) => (
                <label key={k} className="switch"><input type="checkbox" form="entry" name="talk" value={k} defaultChecked={item.talk[k]} /><span>{label}<small>{hint}</small></span></label>
              ))}
            </div>
            <div className="hint">Press Save entry to keep these.</div>
          </div>

          <div className="c-row">
            <div className="grow">
              <div className="c-desc" style={{ whiteSpace: "normal", fontSize: 15 }}>
                {REACTION_EMOJIS.map((e) => <span key={e} style={{ marginRight: 14 }}>{e} <b>{reactions[e] ?? 0}</b></span>)}
              </div>
            </div>
            {reactionTotal > 0 && (
              <form action={resetReactions}><input type="hidden" name="id" value={item.id} />
                <ConfirmSubmit title="Reset reactions?" message="This clears all reactions on this entry. It can't be undone." yes="Yes, reset" className="b-out b-sm"><i className="ti ti-refresh" />Reset reactions</ConfirmSubmit></form>
            )}
          </div>

          {item.talk.who && people.length > 0 && (
            <div className="fl"><span className="lab">Who reacted (only you see this)</span>
              <div className="talk-people">
                {people.map((p, i) => <span key={i} title={when(p.created_at)}>{p.emoji} {p.name}</span>)}
              </div>
            </div>
          )}

          <div className="fl" id="comments"><span className="lab">Comments ({comments.length})</span>
            {comments.length === 0 && <div className="c-desc" style={{ whiteSpace: "normal" }}>{item.talk.comments ? "No comments yet. They show up here the moment someone posts one." : "Comments are off for this entry. Turn on Let people comment above, then press Save entry."}</div>}
            {comments.map((c) => (
              <div key={c.id} className={`c msg talk-admin${c.seen ? "" : " unread"}${c.hidden ? " off" : ""}`}>
                <div className="grow" style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span className="who">{c.name}</span>
                    <span className="when">· {when(c.created_at)}</span>
                    {!c.seen && <span className="tagx red">new</span>}
                    {c.pinned && <span className="tagx">pinned</span>}
                    {c.hidden && <span className="tagx amber">hidden from visitors</span>}
                  </div>
                  <p>{c.body}</p>
                  <form action={commentAction} className="add-row" style={{ marginTop: 10 }}>
                    <input type="hidden" name="id" value={c.id} /><input type="hidden" name="op" value="reply" />
                    <input className="inp" name="reply" defaultValue={c.reply} maxLength={COMMENT_MAX} placeholder="Write a reply. Visitors see it marked as yours." aria-label="Your reply" />
                    <button className="b-out b-sm"><i className="ti ti-corner-down-left" />Save reply</button>
                  </form>
                  <div className="btns" style={{ marginTop: 8 }}>
                    <form action={commentAction}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="op" value="pin" />
                      <button className="b-out b-sm"><i className="ti ti-pin" />{c.pinned ? "Unpin" : "Pin to the top"}</button></form>
                    <form action={commentAction}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="op" value="hide" />
                      <button className="b-out b-sm"><i className={`ti ${c.hidden ? "ti-eye" : "ti-eye-off"}`} />{c.hidden ? "Show it" : "Hide it"}</button></form>
                    <form action={commentAction}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="op" value="delete" />
                      <ConfirmSubmit title="Delete this comment?" message="It's removed for good. This can't be undone. Tip: hiding it keeps it, and only you can see it." yes="Yes, delete" className="b-danger b-sm"><i className="ti ti-trash" />Delete</ConfirmSubmit></form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Box>

      <SaveBox label="Save entry" form="entry">
        <a href={`/admin/s/${item.section_id}`} className="b-out"><i className="ti ti-arrow-left" />Back</a>
        {section && <a href={`/s/${section.slug}/${item.id}`} target="_blank" className="b-out"><i className="ti ti-eye" />Open on site</a>}
      </SaveBox>

      <div className="c c-row" style={{ marginTop: 14 }}>
        <div className="grow"><div className="c-title">Danger zone</div><div className="c-desc">Hiding is reversible. Deleting is not.</div></div>
        <div className="btns">
          {isPoll && (
            <form action={resetPoll}><input type="hidden" name="id" value={item.id} />
              <ConfirmSubmit title="Reset votes?" message="This clears all votes on this poll. It can't be undone." yes="Yes, reset" className="b-out b-sm"><i className="ti ti-refresh" />Reset votes</ConfirmSubmit></form>
          )}
          <form action={deleteItem}><input type="hidden" name="id" value={item.id} />
            <ConfirmSubmit title={`Delete "${item.title}"?`} message="This entry is removed for good. It can't be undone. Tip: hiding it keeps everything safe." yes="Yes, delete"><i className="ti ti-trash" />Delete</ConfirmSubmit></form>
        </div>
      </div>
    </div>
  );
}
