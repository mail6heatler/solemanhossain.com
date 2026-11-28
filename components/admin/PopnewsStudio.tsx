"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_POPNEWS, POP_ARTS, POP_FEEDS, POP_LIMITS, POP_LOOKS, POP_PAGES, POP_WHEN, POP_WHERE, newStory, type PopStory, type PopnewsSettings } from "@/lib/popnews";
import type { Media } from "@/lib/settings";
import { NEWS_SOURCES } from "@/lib/newsSources";
import { savePopnews } from "@/app/actions";
import type { PopStudioMsg } from "@/components/site/PopNews";
import { MediaField } from "./Widgets";
import { SaveBar, SiteScreens } from "./ChromeStudio";

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const TAGS = ["🔥 Trending", "🌍 Viral", "📰 News", "⚡ Breaking", "🎉 New", "🇧🇩 Today in Dhaka"];

/* small pieces of the page, outside the editor so typing never remounts them */
const Box = ({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) => (
  <details className="c box" open={open}><summary><span>{title}</span><i className="ti ti-chevron-down" /></summary><div className="f">{children}</div></details>
);
const Chips = <T extends string>({ list, value, onPick }: { list: readonly (readonly [T, string])[]; value: T; onPick: (v: T) => void }) => (
  <div className="hst-chips">{list.map(([k, label]) => <button key={k} type="button" className={`hst-chip${value === k ? " on" : ""}`} aria-pressed={value === k} onClick={() => onPick(k)}>{label}</button>)}</div>
);
const Sw = ({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) => (
  <label className="switch"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />{children}</label>
);
const Range = ({ id, label, value, lim, unit, onChange }: { id: string; label: string; value: number; lim: readonly [number, number]; unit: string; onChange: (v: number) => void }) => (
  <div className="fl cs-slider"><label htmlFor={id}>{label} <b>{value}{unit}</b></label><input id={id} type="range" min={lim[0]} max={lim[1]} step={1} value={value} onChange={(e) => onChange(+e.target.value)} /></div>
);
const Txt = ({ id, label, value, max, onChange, hint, placeholder }: { id: string; label: string; value: string; max: number; onChange: (v: string) => void; hint?: string; placeholder?: string }) => (
  <div className="fl"><label htmlFor={id}>{label}</label><input id={id} className="inp" maxLength={max} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />{hint && <div className="hint">{hint}</div>}</div>
);

/** one story: everything it says and shows, its picture, GIF or video (uploaded or linked), its dates and its numbers */
function StoryEditor({ s, i, n, stats, useBlob, maxVideoMb, set, move, remove, show }: {
  s: PopStory; i: number; n: number; stats?: { views: number; clicks: number }; useBlob: boolean; maxVideoMb: number;
  set: (patch: Partial<PopStory>) => void; move: (d: number) => void; remove: () => void; show: () => void;
}) {
  const [sure, setSure] = useState(false);
  const id = (k: string) => `pop-${s.id}-${k}`;
  return (
    <details className="c box" open={i === 0}>
      <summary><span>{s.on ? "" : "⏸ "}{s.emoji} {s.title.trim() || "A story without a headline yet"}</span><i className="ti ti-chevron-down" /></summary>
      <div className="f">
        <div className="hst-chips">
          <button type="button" className="hst-chip on" onClick={show}>▶ Show this one</button>
          <button type="button" className="hst-chip" disabled={i === 0} onClick={() => move(-1)}><i className="ti ti-arrow-up" /> Earlier</button>
          <button type="button" className="hst-chip" disabled={i === n - 1} onClick={() => move(1)}><i className="ti ti-arrow-down" /> Later</button>
          <button type="button" className={`hst-chip${sure ? " on" : ""}`} onClick={() => { if (sure) remove(); else { setSure(true); setTimeout(() => setSure(false), 3000); } }}><i className="ti ti-trash" /> {sure ? "Tap again to delete" : "Delete"}</button>
        </div>
        <Sw checked={s.on} onChange={(v) => set({ on: v })}>Showing (off keeps it saved, but visitors don&apos;t see it)</Sw>
        {stats && <div className="hint"><i className="ti ti-chart-bar" /> Last 30 days: seen by {stats.views}, button tapped {stats.clicks} {stats.clicks === 1 ? "time" : "times"}.</div>}
        <div className="fl"><label htmlFor={id("tag")}>Tag</label><input id={id("tag")} className="inp" maxLength={30} value={s.tag} onChange={(e) => set({ tag: e.target.value })} />
          <div className="hst-chips">{TAGS.map((t) => <button key={t} type="button" className={`hst-chip${s.tag === t ? " on" : ""}`} onClick={() => set({ tag: t })}>{t}</button>)}</div></div>
        <Txt id={id("title")} label="Headline" value={s.title} max={140} onChange={(v) => set({ title: v })} placeholder="What's happening?" />
        <div className="fl"><label htmlFor={id("text")}>A short line</label><textarea id={id("text")} className="inp" rows={3} maxLength={400} value={s.text} onChange={(e) => set({ text: e.target.value })} /></div>
        <div className="fl"><label>Picture, GIF or video</label>
          <MediaField name={id("media")} initial={s.media} useBlob={useBlob} maxVideoMb={maxVideoMb} onChange={(m: Media[]) => set({ media: m.filter((x) => x.type === "image" || x.type === "video") })} />
          <div className="hint">Drop files here or choose them, or paste a link. The first picture or video shows; a video plays silently on a loop.</div></div>
        <div className="fl"><label>Without a picture: an emoji on a colour</label>
          <div className="hst-chips"><input className="inp" style={{ width: 70 }} maxLength={8} value={s.emoji} onChange={(e) => set({ emoji: e.target.value })} aria-label="Emoji" />
            {POP_ARTS.map(([k, bg]) => <button key={k} type="button" className={`hst-chip${s.art === k ? " on" : ""}`} aria-label={k} title={k} onClick={() => set({ art: k })} style={{ width: 34, height: 28, padding: 0, background: bg, outline: s.art === k ? "2px solid var(--text-strong, #111)" : "none", outlineOffset: 2 }} />)}</div></div>
        <Txt id={id("source")} label="Where it's from" value={s.source} max={40} onChange={(v) => set({ source: v })} placeholder="e.g. Life Chronicle, a newspaper's name" />
        <Txt id={id("button")} label="The button's words" value={s.button} max={24} onChange={(v) => set({ button: v })} placeholder="Read more" />
        <Txt id={id("link")} label="The button opens" value={s.link} max={500} onChange={(v) => set({ link: v })} placeholder="https://… or a page of your site like /s/feed" hint="Empty hides the button. Other sites open in a new tab." />
        <div className="hst-chips">
          <div className="fl"><label htmlFor={id("start")}>Shows from</label><input id={id("start")} className="inp" type="date" value={s.start} onChange={(e) => set({ start: e.target.value })} /></div>
          <div className="fl"><label htmlFor={id("end")}>Until</label><input id={id("end")} className="inp" type="date" value={s.end} onChange={(e) => set({ end: e.target.value })} /></div>
        </div>
        <div className="hint">Empty dates mean always. After its last day it disappears by itself.</div>
      </div>
    </details>
  );
}

/**
 * The news pop-up's dashboard page (/admin/popnews), in the menu's bottom group beside Launch screen: your real homepage on a computer and a
 * phone screen (`/?pop=studio`, components/site/PopNews.tsx) showing the pop-up with this page's unsaved settings, and everything beside it.
 * "Your own stories" and "Automatic headlines" are exclusive: turning one on turns the other off. One Save writes settings.popnews (savePopnews).
 */
export default function PopnewsStudio({ first, stats, useBlob, maxVideoMb }: { first: PopnewsSettings; stats: Record<string, { views: number; clicks: number }>; useBlob: boolean; maxVideoMb: number }) {
  const router = useRouter();
  const [saved, setSaved] = useState(first);
  const [d, setD] = useState(first);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ t: string; bad?: boolean } | null>(null);
  const [play, setPlay] = useState<{ n: number; k?: string; only?: string }>({ n: 1 });
  const dirty = !same(d, saved);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 4000); return () => clearTimeout(t); }, [note]);

  const set = (patch: Partial<PopnewsSettings>) => setD((x) => ({ ...x, ...patch }));
  const setStory = (i: number, patch: Partial<PopStory>) => setD((x) => ({ ...x, stories: x.stories.map((s, k) => (k === i ? { ...s, ...patch } : s)) }));
  const moveStory = (i: number, dir: number) => setD((x) => { const l = [...x.stories], j = i + dir; if (j < 0 || j >= l.length) return x; [l[i], l[j]] = [l[j], l[i]]; return { ...x, stories: l }; });
  const show = (o: { k?: string; only?: string } = {}) => setPlay((p) => ({ n: p.n + 1, ...o }));
  const draft: PopStudioMsg = { type: "lc-pop-draft", cfg: d, play: play.n, k: play.k, only: play.only };
  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    const r = await savePopnews(d).catch(() => null);
    setSaving(false);
    if (!r || !r.ok) { setNote({ t: r && !r.ok ? r.error : "That didn't save. Check your connection and try again.", bad: true }); return; }
    setSaved(d); setNote({ t: "Saved. It's live on your site." }); router.refresh();
  };
  const live = d.stories.filter((s) => s.on && (s.title.trim() || s.media.length)).length;
  const feedName = (k: string) => (POP_FEEDS.find(([x]) => x === k) || POP_FEEDS[0])[1];
  const sites = NEWS_SOURCES.filter((s) => d.feeds.includes(s.cat as never)), sitesOn = sites.filter((s) => !d.off.includes(s.id)).length;
  const pickFeed = (k: (typeof POP_FEEDS)[number][0]) => set({ feeds: d.feeds.includes(k) ? (d.feeds.length > 1 ? d.feeds.filter((x) => x !== k) : d.feeds) : POP_FEEDS.map(([x]) => x).filter((x) => x === k || d.feeds.includes(x)) });
  const status = !d.on ? "Hidden on site" : d.auto ? `Showing automatic headlines: ${d.feeds.map(feedName).join(", ")}, from ${sitesOn} news sites` : d.manual ? `Showing your stories: ${live} on` : "Both sources are off, so nothing shows";

  return (
    <div className="stu cs">
      <header className="stu-top">
        <div className="stu-name"><h1 className="adm-h">Pop-up news</h1><p className="adm-sub">{status}{dirty ? " · changes not saved" : ""}</p></div>
        <div className="btns stu-topbtns">
          <label className="switch cs-show"><input type="checkbox" checked={d.on} onChange={(e) => set({ on: e.target.checked })} />{d.on ? "Showing on site" : "Hidden on site"}</label>
          <a href="/?pop=show" target="_blank" className="b-out b-sm"><i className="ti ti-eye" />View on site</a>
        </div>
      </header>

      <div className="cs-work">
        <SiteScreens src="/?pop=studio" draft={draft} ready="lc-pop-ready" hint="Your real homepage with the pop-up over it, using your changes before saving. Press ▶ to show it again" />

        <div className="cs-grid">
          <div className="cs-panel">
            <div className="mzs-bench">
              <div className="mzs-bench-top"><b>Show it now</b><span className="hint">Each plays on both screens, with your unsaved changes.</span></div>
              <div className="hst-chips">
                <button type="button" className="hst-chip on" onClick={() => show()}>▶ As set</button>
                {POP_LOOKS.filter(([k]) => k !== "random").map(([k, l]) => <button key={k} type="button" className="hst-chip" onClick={() => show({ k })}>▶ {l}</button>)}
              </div>
            </div>

            <Box title="Where the stories come from">
              <Sw checked={d.manual} onChange={(v) => set(v ? { manual: true, auto: false } : { manual: false })}>✍️ Your own stories: you write each one, and visitors see exactly what you chose</Sw>
              <Sw checked={d.auto} onChange={(v) => set(v ? { auto: true, manual: false } : { auto: false, manual: true })}>🤖 Automatic headlines: the newest stories from dozens of news sites, with their pictures, renewed every 30 minutes (turning this on turns your own stories off)</Sw>
              {d.auto && <div className="hint">Your own stories are paused, not deleted: switch them back on any time. Each headline shows its site&apos;s name and picture and opens the full story on that site; you don&apos;t check them first.</div>}
              {d.auto && (
                <div className="mzs-sub">
                  <div className="fl"><label>Categories (one or more)</label>
                    <div className="hst-chips">{POP_FEEDS.map(([k, l]) => <button key={k} type="button" className={`hst-chip${d.feeds.includes(k) ? " on" : ""}`} aria-pressed={d.feeds.includes(k)} onClick={() => pickFeed(k)}>{l}</button>)}</div>
                    <div className="hint">Several are mixed together, newest first, and the sites take turns so one never fills them all. Only the last day&apos;s stories (two days if there are too few).</div></div>
                  <Range id="pop-count" label="How many headlines" value={d.count} lim={POP_LIMITS.count} unit="" onChange={(v) => set({ count: v })} />
                  <div className="fl"><label>News sites ({sitesOn} of {sites.length} on)</label>
                    {d.feeds.map((cat) => (
                      <div key={cat} className="pop-sites"><div className="hint"><b>{feedName(cat)}</b></div>
                        <div className="hst-chips">{NEWS_SOURCES.filter((s) => s.cat === cat).map((s) => { const on = !d.off.includes(s.id); return (
                          <button key={s.id} type="button" className={`hst-chip${on ? " on" : ""}`} aria-pressed={on} onClick={() => set({ off: on ? [...d.off, s.id] : d.off.filter((x) => x !== s.id) })}>{on ? "✓ " : ""}{s.label || s.name}</button>); })}</div></div>
                    ))}
                    <div className="hint">Tap a site to leave it out (or back in). A site that&apos;s down is simply skipped. Pictures come from each story&apos;s own site and are shown whole on every screen.</div></div>
                  {stats.auto && <div className="hint"><i className="ti ti-chart-bar" /> Last 30 days: seen by {stats.auto.views}, a headline tapped {stats.auto.clicks} times.</div>}
                </div>
              )}
            </Box>

            <Box title={`Your stories (${d.stories.length})`}>
              {!d.manual && <div className="hint">These are paused while {d.auto ? "automatic headlines are on" : "your own stories are off"}. You can still edit them and ▶ show one here.</div>}
              {d.stories.map((s, i) => (
                <StoryEditor key={s.id} s={s} i={i} n={d.stories.length} stats={stats[s.id]} useBlob={useBlob} maxVideoMb={maxVideoMb}
                  set={(p) => setStory(i, p)} move={(dir) => moveStory(i, dir)} remove={() => setD((x) => ({ ...x, stories: x.stories.filter((_, k) => k !== i) }))} show={() => show({ only: s.id })} />
              ))}
              <div className="btns">
                <button type="button" className="b-out b-sm" disabled={d.stories.length >= POP_LIMITS.stories} onClick={() => setD((x) => ({ ...x, stories: [...x.stories, newStory()] }))}><i className="ti ti-plus" />Add a story</button>
                <span className="hint">Up to {POP_LIMITS.stories}. Visitors go through them in this order, like stories.</span>
              </div>
            </Box>

            <Box title="The look">
              <Chips list={POP_LOOKS} value={d.look} onPick={(v) => set({ look: v })} />
              <div className="hint">{({ breaking: "A red BREAKING bar slams in, a LIVE dot pulses, the headline types itself and a ticker runs.", story: "A phone-style story with progress bars and a 🔥 badge; it moves on by itself, or tap its sides.", gift: "A box drops in and wobbles, the lid pops with confetti and the news rises out.", paper: "A newspaper spins in like an old movie and an EXTRA! stamp slams on.", random: "One of the four, picked at random each time it shows." } as Record<string, string>)[d.look]}</div>
              <div className="fl"><label>Where it sits</label><Chips list={POP_WHERE} value={d.where} onPick={(v) => set({ where: v })} /><div className="hint">{d.where === "middle" ? "In the middle, with the site dimmed a little behind it." : "Smaller, in the bottom-left corner, with nothing dimmed (Mini Shourobh keeps the other corner)."}</div></div>
              {(d.look === "paper" || d.look === "random") && <Txt id="pop-paper" label="The newspaper's name" value={d.paperName} max={40} onChange={(v) => set({ paperName: v })} />}
            </Box>

            <Box title="When it shows">
              <Chips list={POP_WHEN} value={d.when} onPick={(v) => set({ when: v })} />
              <Range id="pop-wait" label="After the site is ready, wait" value={d.wait} lim={POP_LIMITS.wait} unit=" s" onChange={(v) => set({ wait: v })} />
              <div className="hint">It always waits for the launch screen to open onto the site first. Visitors can close it, or pick &ldquo;Don&apos;t show again today&rdquo;.</div>
              <div className="fl"><label>On which pages</label><Chips list={POP_PAGES} value={d.pages} onPick={(v) => set({ pages: v })} /></div>
              <Sw checked={d.phones} onChange={(v) => set({ phones: v })}>Also on phones</Sw>
            </Box>
            <div className="btns"><button type="button" className="b-out b-sm" onClick={() => setD({ ...DEFAULT_POPNEWS, stories: d.stories })}>Back to the starting settings (your stories stay)</button></div>
          </div>
        </div>
      </div>
      {note && <div className={`adm-toast stu-toast${note.bad ? " bad" : ""}`} role="status">{note.t}</div>}
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={() => setD(saved)} />
    </div>
  );
}
