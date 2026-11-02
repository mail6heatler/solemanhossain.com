import { getSections, getItemCounts, getRecentItems, getMessages, getStats, countUnread, getLiveCount } from "@/lib/data";
import { LAYOUTS } from "@/lib/settings";
import { createSection, moveSection, toggleSection } from "@/app/actions";
import { layoutIcon } from "@/lib/settings";
import { requireAdmin } from "@/lib/auth";

export default async function Overview() {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const [stats, sections, counts, recent, msgs, unread, live] = await Promise.all([
    getStats(), getSections(), getItemCounts(), getRecentItems(5), getMessages(), countUnread(), getLiveCount(),
  ]);
  const max = Math.max(1, ...stats.last14.map((d) => d.visitors));
  const activity = [
    ...recent.map((r) => ({ when: r.created_at, icon: r.type === "poll" ? "chart-bar" : "file-text", text: `${r.title}`, tag: r.section_title, href: `/admin/items/${r.id}`, tone: "" })),
    ...msgs.slice(0, 5).map((m) => ({ when: m.created_at, icon: "message-2", text: `Message from ${m.name}`, tag: m.read ? "inbox" : "new", href: "/admin/inbox", tone: m.read ? "blue" : "red" })),
  ].sort((a, b) => b.when.localeCompare(a.when)).slice(0, 7);

  return (
    <div className="adm-page">
      <h1 className="adm-h">Overview</h1>
      <p className="adm-sub">Everything happening across your site, at a glance</p>

      <div className="stats">
        <Stat icon="eye" k="here right now" v={String(live)} />
        <Stat icon="users" k="visitors today" v={String(stats.visitorsToday)} />
        <Stat icon="flame" k="most viewed (30 days)" v={stats.topSection} small />
        <Stat icon="message-circle" k="unread messages" v={String(unread)} href="/admin/inbox" />
        <Stat icon="chart-pie" k="active polls" v={String(stats.activePolls)} />
      </div>

      <div className="c">
        <div className="c-row">
          <div className="grow">
            <div className="c-title">Visitors · last 14 days</div>
            <div className="c-desc">{stats.visitorsWeek} this week · {stats.viewsToday} page views today</div>
          </div>
        </div>
        <div className="spark">
          {stats.last14.map((d) => (
            <div key={d.day} style={{ height: `${Math.max(4, (d.visitors / max) * 100)}%` }}
              data-tip={`${new Date(d.day).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}: ${d.visitors}`} />
          ))}
        </div>
      </div>

      <div className="adm-label">Recent activity</div>
      {activity.length === 0 && <div className="c" style={{ fontSize: 13, color: "var(--text-muted)" }}>Nothing yet. Add your first entry from a section below.</div>}
      {activity.map((a, i) => (
        <a key={i} href={a.href} className="c hov c-row" style={{ textDecoration: "none" }}>
          <i className={`ti ti-${a.icon}`} style={{ fontSize: 15, color: "var(--text-faint)" }} />
          <span className="grow" style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.text}</span>
          <span className={`tagx ${a.tone}`}>{a.tag}</span>
        </a>
      ))}

      <div className="adm-label">Sections on your homepage <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>in order</span></div>
      {sections.map((s, i) => (
        <div key={s.id} className={`c hov ${s.visible ? "" : "off"}`}>
          <div className="c-row">
            <span className="chipi"><i className={`ti ti-${layoutIcon(s.layout)}`} /></span>
            <div className="grow">
              <div className="c-title"><a href={`/admin/s/${s.id}`}>{s.code && `${s.code} · `}{s.title}</a></div>
              <div className="c-desc">{counts.get(s.id) ?? 0} entries · {s.layout}{!s.visible && " · hidden"}</div>
            </div>
            <div className="btns">
              <form action={moveSection}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="dir" value="up" />
                <button className="adm-iconbtn" disabled={i === 0} aria-label="Move up"><i className="ti ti-arrow-up" /></button></form>
              <form action={moveSection}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="dir" value="down" />
                <button className="adm-iconbtn" disabled={i === sections.length - 1} aria-label="Move down"><i className="ti ti-arrow-down" /></button></form>
              <form action={toggleSection}><input type="hidden" name="id" value={s.id} />
                <button className="adm-iconbtn" aria-label={s.visible ? "Hide" : "Show"} title={s.visible ? "Hide from site" : "Show on site"}><i className={`ti ${s.visible ? "ti-eye" : "ti-eye-off"}`} /></button></form>
              <a href={`/admin/s/${s.id}`} className="b-out b-sm"><i className="ti ti-adjustments" />Manage</a>
            </div>
          </div>
        </div>
      ))}
      <form action={createSection} className="c add-row" style={{ marginTop: 12 }}>
        <input className="inp" name="title" placeholder="New section, e.g. Music, Workouts, Recipes…" required />
        <select name="layout" defaultValue="cards" aria-label="Layout">
          {LAYOUTS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        <button className="b-dark"><i className="ti ti-plus" />Add section</button>
      </form>
    </div>
  );
}

function Stat({ icon, k, v, small, href }: { icon: string; k: string; v: string; small?: boolean; href?: string }) {
  const inner = (
    <>
      <span className="chipi"><i className={`ti ti-${icon}`} /></span>
      <div className="k">{k}</div>
      <div className={`v ${small ? "sm" : ""}`}>{v}</div>
    </>
  );
  return href
    ? <a href={href} className="c hov stat" style={{ textDecoration: "none", marginBottom: 0 }}>{inner}</a>
    : <div className="c hov stat" style={{ marginBottom: 0 }}>{inner}</div>;
}
