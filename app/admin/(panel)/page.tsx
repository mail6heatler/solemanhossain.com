import { getSections, getItemCounts, getRecentItems, getMessages, getStats, countUnread, getLiveCount, getReactionTotals, getRecentReactions, getSettings } from "@/lib/data";
import { LAYOUTS } from "@/lib/settings";
import { createSection, moveSection, toggleSection } from "@/app/actions";
import { layoutIcon } from "@/lib/settings";
import { requireAdmin } from "@/lib/auth";
import CountUp from "@/components/admin/CountUp";

/** each section's own colour on the Overview: its icon tile, its share of the entries bar */
const HUES = ["#3fae6b", "#3d6694", "#d39a2a", "#c8574c", "#7a5ac8", "#1f8f8a", "#d06a9b", "#6b7f2e", "#b07a45", "#4f8fc0"];

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now"; if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
  const d = Math.round(h / 24); return d < 30 ? `${d} day${d > 1 ? "s" : ""} ago` : new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * The dashboard's Overview (decorated at the owner's request, 2026-11-26): a welcome banner with Dhaka's skyline at the real
 * time of day, numbers that count up with today against yesterday, a visitors chart, a bar of entries by section, an
 * activity timeline and the sections as cards. Colours come from the dashboard theme's tokens (app/adminOverview.css).
 */
export default async function Overview() {
  await requireAdmin(); // pages render in parallel with the layout, so each page must check too
  const [settings, stats, sections, counts, recent, msgs, unread, live, reactions, recentReactions] = await Promise.all([
    getSettings(), getStats(), getSections(), getItemCounts(), getRecentItems(5), getMessages(), countUnread(), getLiveCount(),
    getReactionTotals(), getRecentReactions(5),
  ]);
  const tz = settings.timezone || "Asia/Dhaka", now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(now)) % 24;
  const part = hour < 5 ? "night" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 20 ? "evening" : "night";
  const sky = hour >= 5 && hour < 8 ? "dawn" : hour >= 8 && hour < 17 ? "day" : hour >= 17 && hour < 19 ? "dusk" : "night";
  const emoji = { morning: "☀️", afternoon: "🌤️", evening: "🌆", night: "🌙" }[part];
  const dateLine = `${now.toLocaleDateString("en-GB", { timeZone: tz, weekday: "long", day: "numeric", month: "long" })} · ${now.toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" })} in ${tz.split("/").pop()?.replace(/_/g, " ")}`;
  const first = (settings.fullName || "").split(" ")[0] || "there";

  const days = stats.last14, today = days[days.length - 1]?.visitors ?? stats.visitorsToday, yesterday = days[days.length - 2]?.visitors ?? 0;
  const diff = today - yesterday, avg = Math.round(days.reduce((a, d) => a + d.visitors, 0) / Math.max(1, days.length));
  const best = days.reduce((b, d) => (d.visitors > b.visitors ? d : b), days[0] ?? { day: "", visitors: 0 });
  const totalEntries = sections.reduce((a, s) => a + (counts.get(s.id) ?? 0), 0), shown = sections.filter((s) => s.visible).length;
  const summary = [`${stats.visitorsToday} visitor${stats.visitorsToday === 1 ? "" : "s"} today`, unread ? `${unread} unread message${unread === 1 ? "" : "s"}` : "no unread messages", reactions.fresh ? `${reactions.fresh} new reaction${reactions.fresh === 1 ? "" : "s"}` : ""].filter(Boolean);

  const activity = [
    ...recent.map((r) => ({ when: r.created_at, icon: r.type === "poll" ? "chart-bar" : "file-text", kind: "entry", text: `${r.title}`, tag: r.section_title, href: `/admin/items/${r.id}`, tone: "" })),
    ...msgs.slice(0, 5).map((m) => ({ when: m.created_at, icon: "message-2", kind: "msg", text: `Message from ${m.name}`, tag: m.read ? "inbox" : "new", href: "/admin/inbox", tone: m.read ? "blue" : "red" })),
    ...recentReactions.map((r) => ({ when: r.created_at, icon: "heart", kind: "react", text: `${r.visitor} reacted ${r.emoji} to “${r.title}”`, tag: r.seen ? "reaction" : "new", href: "/admin/inbox?f=reactions", tone: r.seen ? "" : "red" })),
  ].sort((a, b) => b.when.localeCompare(a.when)).slice(0, 8);

  /* the chart: an area and a line over 14 days, a dashed average, and today's dot */
  const W = 600, H = 170, top = Math.max(4, ...days.map((d) => d.visitors)) * 1.15;
  const pts = days.map((d, i) => [Math.round((i / Math.max(1, days.length - 1)) * W), Math.round(H - 22 - (d.visitors / top) * (H - 40))] as const);
  const line = pts.map((p) => p.join(",")).join(" L"), avgY = Math.round(H - 22 - (avg / top) * (H - 40));
  const spark = days.slice(-7), smax = Math.max(1, ...spark.map((d) => d.visitors));

  return (
    <div className="adm-page ov">
      <section className={`c ov-hero sky-${sky}`}>
        <div className="ov-hero-txt">
          <span className="ov-date"><i className="ti ti-calendar-event" />{dateLine}</span>
          <h1 className="adm-h">Good {part}, {first} <span className="ov-emo">{emoji}</span></h1>
          <p className="ov-sum">{summary.join(" · ")}.</p>
          <span className="ov-live"><i />{live} {live === 1 ? "person" : "people"} on your site right now</span>
          <div className="ov-quick">
            <a href="/" target="_blank" className="b-mint b-sm"><i className="ti ti-external-link" />View site</a>
            <a href="/admin/inbox" className="b-out b-sm"><i className="ti ti-inbox" />Inbox{unread ? <em>{unread}</em> : null}</a>
            <a href="/admin/hero" className="b-out b-sm"><i className="ti ti-home" />Hero</a>
            <a href="/admin/mascot" className="b-out b-sm"><i className="ti ti-mood-happy" />Mascot</a>
            <a href="/admin/appearance" className="b-out b-sm"><i className="ti ti-palette" />Appearance</a>
          </div>
        </div>
        {/* the same cut-out picture as the website's hero, whole and with no background, standing in front of the skyline */}
        <div className={`ov-me${settings.avatarUrl ? "" : " none"}`} aria-hidden="true">
          {settings.avatarUrl ? <img src={settings.avatarUrl} alt="" /> : <b>{settings.initials}</b>}
        </div>
        <svg className="ov-city" viewBox="0 0 1000 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          {sky === "night" || sky === "dusk" ? <g className="ov-stars">{[[80, 18], [190, 34], [300, 12], [420, 28], [560, 16], [680, 36], [790, 14], [900, 30]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" style={{ animationDelay: `-${i * 0.4}s` }} />)}</g> : null}
          <circle className="ov-sun" cx="860" cy={sky === "day" ? 34 : 46} r="16" />
          <g className="ov-cloud"><ellipse cx="160" cy="40" rx="34" ry="10" /><ellipse cx="184" cy="33" rx="20" ry="11" /></g>
          <path className="ov-sky" d="M0 120 V92 h30 v-18 h24 v26 h14 v-40 h22 v44 h16 v-28 h26 v32 h10 v-52 h8 v-10 h8 v10 h8 v58 h18 v-34 h24 v38 h14 v-22 h22 v-20 h16 v42 h18 v-30 h24 v36 h14 v-16 h18 v24 h30 v-46 a18 18 0 0 1 36 0 v46 h12 v-70 l5 -12 l5 12 v70 h20 v-26 h22 v30 h16 v-44 h24 v40 h12 v-22 h26 v26 h18 v-38 h20 v42 h16 v-18 h22 v24 h24 v-52 h18 v50 h20 v-28 h26 v34 h30 V120 Z" />
          {sky === "night" || sky === "dusk" ? <g className="ov-win">{[[44, 98], [100, 86], [150, 96], [214, 82], [262, 100], [330, 90], [412, 96], [478, 88], [560, 100], [640, 92], [702, 84], [770, 98], [846, 90], [930, 96]].map(([x, y], i) => <rect key={i} x={x} y={y} width="5" height="6" style={{ animationDelay: `-${(i % 5) * 0.7}s` }} />)}</g> : null}
        </svg>
      </section>

      <div className="stats ov-stats">
        <Stat icon="eye" k="here right now" v={live} live />
        <Stat icon="users" k="visitors today" v={stats.visitorsToday} note={diff === 0 ? "same as yesterday" : `${diff > 0 ? "↑" : "↓"} ${Math.abs(diff)} on yesterday`} up={diff >= 0}
          spark={<svg viewBox="0 0 70 22" className="ov-spark" aria-hidden="true"><polyline points={spark.map((d, i) => `${Math.round((i / Math.max(1, spark.length - 1)) * 70)},${Math.round(20 - (d.visitors / smax) * 18)}`).join(" ")} /></svg>} />
        <Stat icon="flame" k="most viewed (30 days)" text={stats.topSection} />
        <Stat icon="message-circle" k="unread messages" v={unread} href="/admin/inbox" note={unread ? "waiting for you" : "all caught up ✨"} />
        <Stat icon="heart" k="reactions" v={reactions.total} href="/admin/inbox?f=reactions" note={reactions.fresh ? `${reactions.fresh} new` : "all seen"} />
        <Stat icon="chart-pie" k="active polls" v={stats.activePolls} />
      </div>

      <div className="ov-two">
        <div className="c ov-chart">
          <div className="ov-h"><b>Visitors · last 14 days</b><small>{stats.visitorsWeek} this week · {stats.viewsToday} page views today</small></div>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Visitors over the last 14 days; today ${today}, average ${avg}`}>
            <defs><linearGradient id="ovA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="ov-a0" /><stop offset="1" className="ov-a1" /></linearGradient></defs>
            <line className="ov-avg" x1="0" x2={W} y1={avgY} y2={avgY} vectorEffect="non-scaling-stroke" />
            <path className="ov-area" d={`M0,${H - 22} L${line} L${W},${H - 22} Z`} fill="url(#ovA)" />
            <path className="ov-line" d={`M${line}`} vectorEffect="non-scaling-stroke" />
            {pts.map(([x, y], i) => <circle key={i} className={i === pts.length - 1 ? "ov-pt now" : "ov-pt"} cx={x} cy={y} r={i === pts.length - 1 ? 5 : 3} vectorEffect="non-scaling-stroke"><title>{`${new Date(days[i].day).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}: ${days[i].visitors}`}</title></circle>)}
          </svg>
          <div className="ov-axis">{days.map((d, i) => <span key={d.day}>{i === days.length - 1 ? "today" : i % 3 === 1 ? new Date(d.day).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}</span>)}</div>
          <div className="ov-chips"><span><i className="ti ti-chart-line" />average {avg} a day</span>{best?.visitors ? <span><i className="ti ti-trophy" />best day {new Date(best.day).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}: {best.visitors}</span> : null}</div>
        </div>

        <div className="c ov-site">
          <div className="ov-h"><b>Your site</b><small>{shown} of {sections.length} sections showing</small></div>
          <div className="ov-big"><b><CountUp to={totalEntries} /></b><span>entries across your sections</span></div>
          <div className="ov-bar" aria-hidden="true">{sections.map((s, i) => { const n = counts.get(s.id) ?? 0; return n ? <i key={s.id} style={{ flexGrow: n, background: HUES[i % HUES.length] }} title={`${s.title}: ${n}`} /> : null; })}</div>
          <ul className="ov-legend">{sections.map((s, i) => <li key={s.id}><i style={{ background: HUES[i % HUES.length] }} /><a href={`/admin/s/${s.id}`}>{s.code ? `${s.code} ` : ""}{s.nav_label || s.title}</a><b>{counts.get(s.id) ?? 0}</b></li>)}</ul>
        </div>
      </div>

      <div className="adm-label">Recent activity</div>
      <div className="c ov-tl">
        {activity.length === 0 && <p className="ov-empty">Nothing yet. Add your first entry from a section below.</p>}
        {activity.map((a, i) => (
          <a key={i} href={a.href} className={`ov-ev k-${a.kind}`}>
            <span className="ov-dot"><i className={`ti ti-${a.icon}`} /></span>
            <span className="ov-ev-t">{a.text}<small>{ago(a.when)}</small></span>
            <span className={`tagx ${a.tone}`}>{a.tag}</span>
          </a>
        ))}
      </div>

      <div className="adm-label">Sections on your homepage <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>in order</span></div>
      <div className="ov-secs">
        {sections.map((s, i) => {
          const n = counts.get(s.id) ?? 0, most = Math.max(1, ...sections.map((x) => counts.get(x.id) ?? 0));
          return (
            <div key={s.id} className={`c hov ov-sec ${s.visible ? "" : "off"}`} style={{ "--hue": HUES[i % HUES.length] } as React.CSSProperties}>
              <div className="c-row">
                <span className="ov-ico"><i className={`ti ti-${layoutIcon(s.layout)}`} /></span>
                <div className="grow">
                  <div className="c-title"><a href={`/admin/s/${s.id}`}>{s.code && <em className="ov-code">{s.code}</em>}{s.title}</a></div>
                  <div className="c-desc">{n} entr{n === 1 ? "y" : "ies"} · {LAYOUTS.find((l) => l.value === s.layout)?.label ?? s.layout}{!s.visible && " · hidden"}</div>
                </div>
              </div>
              <div className="ov-meter" aria-hidden="true"><i style={{ width: `${Math.round((n / most) * 100)}%` }} /></div>
              <div className="btns ov-acts">
                <form action={moveSection}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="dir" value="up" />
                  <button className="adm-iconbtn" disabled={i === 0} aria-label="Move up"><i className="ti ti-arrow-up" /></button></form>
                <form action={moveSection}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="dir" value="down" />
                  <button className="adm-iconbtn" disabled={i === sections.length - 1} aria-label="Move down"><i className="ti ti-arrow-down" /></button></form>
                <form action={toggleSection}><input type="hidden" name="id" value={s.id} />
                  <button className="adm-iconbtn" aria-label={s.visible ? "Hide" : "Show"} title={s.visible ? "Hide from site" : "Show on site"}><i className={`ti ${s.visible ? "ti-eye" : "ti-eye-off"}`} /></button></form>
                <a href={`/admin/s/${s.id}`} className="b-out b-sm"><i className="ti ti-adjustments" />Manage</a>
              </div>
            </div>
          );
        })}
      </div>
      <form action={createSection} className="c add-row ov-add">
        <span className="ov-ico plus"><i className="ti ti-plus" /></span>
        <input className="inp" name="title" placeholder="New section, e.g. Music, Workouts, Recipes…" required />
        <select name="layout" defaultValue="cards" aria-label="Layout">
          {LAYOUTS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        <button className="b-dark"><i className="ti ti-plus" />Add section</button>
      </form>
    </div>
  );
}

function Stat({ icon, k, v, text, href, note, up = true, live, spark }: { icon: string; k: string; v?: number; text?: string; href?: string; note?: string; up?: boolean; live?: boolean; spark?: React.ReactNode }) {
  const inner = (
    <>
      <span className="ov-top"><span className="chipi"><i className={`ti ti-${icon}`} /></span>{live && <span className="ov-pulse" aria-hidden="true" />}{spark}</span>
      <div className="k">{k}</div>
      <div className={`v ${text ? "sm" : ""}`}>{text ?? <CountUp to={v ?? 0} />}</div>
      {note && <div className={`ov-note ${up ? "up" : "down"}`}>{note}</div>}
    </>
  );
  return href
    ? <a href={href} className="c hov stat" style={{ textDecoration: "none", marginBottom: 0 }}>{inner}</a>
    : <div className="c hov stat" style={{ marginBottom: 0 }}>{inner}</div>;
}
