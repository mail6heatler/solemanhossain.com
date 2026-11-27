import type { Item } from "@/lib/data";
import type { Look } from "@/lib/contentStyle";
import { questProgress, winLookOf } from "@/lib/cardLook";
import Markdown from "./Markdown";
import PollCard from "./PollCard";
import { Cover, MediaBadges } from "./Media";
import { Box, CardLink, LinkButtons, Meta, partFn, type PartAttrs, type PartFn } from "./cardParts";

export const fileName = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "project";
export const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
const DONE = /done|finish|complete|live|ship/i;

/** A project with no picture still fills its window: its own details, written as a few lines of code. */
function CodeView({ it, hideSubtitle, hideTags, hideDate, attrs }: { it: Item; hideSubtitle: boolean; hideTags: boolean; hideDate: boolean; attrs: PartAttrs }) {
  const str = (v: string) => <span className="cd-str">&quot;{v}&quot;</span>;
  const link = it.links.find((x) => /^https?:/.test(x.url));
  const fields: [string, React.ReactNode][] = [];
  if (it.status) fields.push(["status", str(it.status.toLowerCase())]);
  if (it.tags.length && !hideTags) fields.push(["stack", <>[{it.tags.map((t, i) => <span key={t}>{i > 0 && ", "}{str(t)}</span>)}]</>]);
  if (it.date_label && !hideDate) fields.push(["when", str(it.date_label)]);
  if (it.location && !hideDate) fields.push(["where", str(it.location)]);
  if (link) fields.push(["link", str(shortUrl(link.url))]);
  const call = <><span className="cd-fn">build</span>({str(fileName(it.title))}</>;
  const lines: React.ReactNode[] = [
    ...(it.subtitle && !hideSubtitle ? [<span key="c" className="cd-note">{`// ${it.subtitle}`}</span>] : []),
    ...(fields.length
      ? [<>{call}, {"{"}</>, ...fields.map(([k, v]) => <>{"  "}<span className="cd-key">{k}</span>: {v},</>), <>{"});"}</>]
      : [<>{call});</>]),
    <i key="end" className="blink-cursor" />,
  ];
  return <pre className="win-code" {...attrs}>{lines.map((line, i) => <span key={i} className="cd-line" style={{ ["--l" as string]: i }}>{line}</span>)}</pre>;
}

/**
 * One G2 project: an app window whose kind its subsection names (lib/cardLook.ts): a spreadsheet, a code editor, a notes app, a pocket games console,
 * or the browser. The homepage row draws it and so does the dashboard's live editor, which is why it's a file of its own. With `edit`, each part carries
 * its name (`data-part`) for the editor's labels, nothing on it leads anywhere, and a poll stands still. `home` names the window when it has no subsection.
 */
export default function WinCard({ it, l, href, home, slug, vt, zoom, confetti = false, edit, foot }: {
  it: Item; l: Look; href: string; home: string; slug: string; vt?: React.CSSProperties; zoom?: React.ReactNode; confetti?: boolean; edit?: boolean;
  /** the reaction bar, given the size and place of the bar and of the comment box */ foot?: (a: { bar: PartAttrs; talk: PartAttrs }) => React.ReactNode;
}) {
  const p: PartFn = partFn(edit, it.card.parts);
  const look = winLookOf(it.category, it.card.look);
  const pic = it.media[0] && !l.hide("pic");
  const link = it.links.find((x) => /^https?:/.test(x.url));
  const code = (look === "browser" || look === "code") && !it.media[0] && !l.hide("pic") && it.type !== "poll"; // its tags are then in the code
  const status = it.status && !(it.pinned && /feature/i.test(it.status)) ? it.status : "";
  const file = fileName(it.title);
  const rows = look === "sheet" ? [["Project", it.title, "title"], ["Status", status, "status"], ["When", l.hide("date") ? "" : it.date_label, "date"], ["Where", l.hide("date") ? "" : it.location, "place"], ["Tools", l.hide("tags") ? "" : it.tags.join(", "), "tags"], ["Link", link ? shortUrl(link.url) : "", "links"]].filter(([, v]) => v) : [];
  const raw = look === "notes" ? it.body.split("\n").map((x) => x.trim()).filter(Boolean) : [];
  const stickies = raw.slice(0, 3).map((x) => x.replace(/^(?:[-*+]|\d+\.)\s+/, "").replace(/[*_`#>]/g, "").trim()).filter(Boolean);
  const body = look === "notes" ? raw.slice(3).join("\n") : it.body;
  const q = questProgress(status);
  const hideTags = l.hide("tags") || code || look === "sheet" || look === "notes";
  const chrome = edit ? null : <a className="win-chrome" href={href} tabIndex={-1} aria-hidden />;
  const ext = (url: string, children: React.ReactNode) => (edit ? <span className="win-link">{children}</span> : <a href={url} target="_blank" rel="noopener noreferrer">{children}</a>);
  const poll = edit
    ? <div className="poll" {...p("poll")}>{it.poll_options.map((o, i) => <button key={i} type="button" className="poll-opt" tabIndex={-1}><span className="lbl"><span>{o}</span></span></button>)}<div className="poll-foot">Tap an option to vote and see results</div></div>
    : <PollCard id={it.id} options={it.poll_options} confetti={confetti} />;
  return (
    <div className={`card win wapp-${look}${pic ? "" : " no-pic"}${it.body.trim() || it.type === "poll" ? " with-text" : ""}${l.className}`} style={l.style}>
      {look === "console" ? (
        <div className="wa-console">
          {chrome}
          <div className="wa-screen" {...p("screen")}><div className="wa-lcd">
            <b {...p("title")}>{it.title}</b><span {...p("status")}>{q.label}</span>
            <span className="wa-blocks" aria-hidden>{Array.from({ length: 10 }, (_, n) => <i key={n} className={n < q.level ? "on" : undefined} style={{ "--n": n } as React.CSSProperties} />)}</span>
            {link ? ext(link.url, <>▶ {shortUrl(link.url)}</>) : <span>Press ▶ to play</span>}
          </div></div>
          <div className="wa-brand" {...p("brand")}><span>QUEST·BOY</span>{it.pinned && <em>★ featured</em>}</div>
          <div className="wa-ctrl" aria-hidden {...p("controls")}><i className="wa-dpad" /><span className="wa-ab"><i>B</i><i>A</i></span></div>
        </div>
      ) : (
        <div className="win-head">
          {chrome}
          <div className="win-bar" {...p("band")}>
            <span className="win-dots" aria-hidden><i /><i /><i /></span>
            <span className="win-name" {...p("sub")}>{it.category || home}</span>
            {it.pinned && <span className="win-flag">★ featured</span>}
            {status && <span className={`win-status${/progress|build|work|doing|wip|soon/i.test(status) ? " busy" : ""}`} {...p("status")}><i aria-hidden />{status}</span>}
          </div>
          <div className="win-url" {...p("url")}>
            <i className={`ti ti-${link ? "lock" : "folder"}`} aria-hidden />
            {link
              ? ext(link.url, <><span>{shortUrl(link.url)}</span><i className="ti ti-arrow-up-right" aria-hidden /></>)
              : <span>{look === "sheet" ? `${file}.xlsx` : look === "notes" ? `notes/${file}.md` : `~/${slug}/${file}`}</span>}
          </div>
        </div>
      )}
      <Box foot={foot?.({ bar: p("reacts"), talk: p("comments") })} to={edit ? undefined : href} label={it.title} fullAttrs={p("open")}
        full={edit ? <span className="full-view" role="button" {...p("open")}><span>Full view</span><i className="ti ti-arrow-right" aria-hidden /></span> : undefined}>
        {!edit && <CardLink to={href} label={it.title} />}
        {pic && <div className="pic-box" {...p("pic")}><div className="card-media"><Cover m={it.media[0]} className="card-img" style={vt} /><MediaBadges media={it.media} /></div>{zoom}</div>}
        {look === "sheet" && rows.length > 0 && (
          <div className="wa-sheet" {...p("sheet")}>
            <div className="wa-fx"><b>fx</b><span>=STORY(&quot;{it.title}&quot;)</span></div>
            <div className="wa-grid"><span className="h" /><span className="h">A</span><span className="h">B</span>
              {rows.map(([k, v], n) => <div key={k} style={{ display: "contents" }}><span className="h">{n + 1}</span><span>{k}</span><span className={k === "Status" || (!status && k === "Project") ? "sel" : undefined}>{v}</span></div>)}</div>
            <svg className="wa-spark" viewBox="0 0 280 40" preserveAspectRatio="none" aria-hidden><path d="M4 34 50 28 96 30 142 18 188 21 234 9 276 4" /></svg>
          </div>
        )}
        {look === "notes" && (
          <div className="wa-notes">
            <div className="wa-folders" {...p("tags")}>{(it.tags.length && !l.hide("tags") ? it.tags : [it.category || "Notes"]).slice(0, 4).map((t, n) => <span key={t} className={n === 0 ? "on" : undefined}>{t}</span>)}</div>
            <div className="wa-board" {...p("board")}>{(stickies.length ? stickies : [it.title]).map((t, n) => <span key={n} className={`wa-sticky s${n}`}>{t}</span>)}</div>
          </div>
        )}
        {code && <CodeView it={it} hideSubtitle={l.hide("subtitle")} hideTags={l.hide("tags")} hideDate={l.hide("date")} attrs={p("codeview")} />}
        {look === "code" && <div className="wa-term" aria-hidden {...p("term")}><span className="run">$ run {file}</span><span className={!status || DONE.test(status) ? "ok" : "busy"}>{!status || DONE.test(status) ? "✓ build passed" : `● ${status}`}</span><i className="wa-cur" /></div>}
        <div className="card-body">
          <h3 {...p("title")}>{it.title}</h3>
          {it.subtitle && !l.hide("subtitle") && !code && <p className="sub" {...p("subtitle")}>{it.subtitle}</p>}
          <Meta it={look === "console" ? { ...it, status: "" } : it} showCat={false} hideDate={l.hide("date") || code || look === "sheet"} p={p} />
          {it.type === "poll" ? poll : <Markdown className="md ex" {...p("body")}>{body}</Markdown>}
          <LinkButtons it={it} p={p} />
          {it.tags.length > 0 && !hideTags && <div className="tags" {...p("tags")}>{it.tags.map((t) => <span key={t}>{t}</span>)}</div>}
        </div>
      </Box>
    </div>
  );
}
