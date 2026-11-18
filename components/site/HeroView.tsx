import type { Section } from "@/lib/data";
import { MOODS, type SiteSettings } from "@/lib/settings";
import type { HeroDesign, HeroLook, HeroPiece } from "@/lib/heroLook";
import { Accent } from "./Markdown";
import { Clock, TypeOnce } from "./Typewriters";
import { AvatarTilt, DecodeText, Greeting, LivePill, Sticker } from "./HeroFx";
import RotatingHeadline from "./RotatingHeadline";
import { partFn, type PartFn } from "./cardParts";

/** One number on the hero: a section's count of entries, or the reactions. */
export type HeroStat = { key: string; n: number; label: string; emoji: string; to: string };

/**
 * The numbers the hero shows. The owner's chosen ones in their order, or, with none chosen, sections with entries (at most 4 tiles, so it lays
 * out evenly) and the reactions total. The homepage and the dashboard's hero editor both ask this.
 */
export function heroStats(sections: Pick<Section, "id" | "slug" | "layout" | "nav_label" | "title" | "nav_emoji">[], counts: Map<number, number> | Record<number, number>,
  reactions: number, design: HeroDesign, reactionsOn: boolean, connect: (layout: string) => boolean): HeroStat[] {
  const count = (id: number) => (counts instanceof Map ? counts.get(id) : counts[id]) ?? 0;
  const tile = (sec: (typeof sections)[number]): HeroStat => ({ key: sec.slug, n: count(sec.id), label: sec.nav_label || sec.title, emoji: sec.nav_emoji ?? "", to: `#${sec.slug}` });
  const react: HeroStat = { key: "reactions", n: reactions, label: "Reactions", emoji: "❤️", to: "" };
  if (design.stats.length) return design.stats.flatMap((k) => (k === "reactions" ? (reactionsOn ? [react] : []) : sections.filter((s) => s.slug === k).map(tile)));
  const showReactions = reactionsOn && reactions > 0;
  return [
    ...sections.filter((sec) => !connect(sec.layout) && count(sec.id) > 0).map(tile).slice(0, showReactions ? 3 : 4),
    ...(showReactions ? [react] : []),
  ];
}

/**
 * The hero, in any of its looks (lib/heroLook.ts): the hanging photo it always had, a magazine cover, a profile card, a boot screen, a movie poster,
 * or a name in lights. Every look shows the same words from the hero's settings, and every piece can be turned off. The homepage draws it, and so
 * does the dashboard's hero editor with `edit`, which names each piece (`data-part`) for its labels and keeps everything still.
 * `layers` are the background (aurora, 3D) and `emojis` the floating emojis, which only the homepage passes in.
 */
export default function HeroView({ s, d, stats, edit = false, layers, emojis, phone = false }: {
  s: SiteSettings; d: HeroDesign; stats: HeroStat[]; edit?: boolean; layers?: React.ReactNode; emojis?: React.ReactNode;
  /** the editor's phone preview: draw the phone look only */ phone?: boolean;
}) {
  const fx = s.effects;
  const p: PartFn = partFn(edit, d.parts);
  const on = (k: HeroPiece) => !d.hide[k];
  const mood = MOODS[s.mood];
  const place = (s.location || "").split(",")[0].trim();
  const owner = s.nickname || s.fullName;
  const sticker = fx.sticker;

  // ----- the pieces, drawn once and placed by each look -----
  const headlines = [[s.headline1, s.headline2].filter(Boolean).join(" "), ...d.rotate];
  const line = (text: string, delay: number) => (!edit && (fx.decode || fx.kinetic) ? <DecodeText text={text} delay={delay} animate={fx.decode} letters={fx.kinetic} /> : <Accent text={text} />);
  const head = (cls = "") => (
    <h1 className={cls} {...p("head")}>
      {d.rotateOn && d.rotate.length > 0 && !edit
        ? <RotatingHeadline lines={headlines} />
        : <>
          <span className="name-line"><span>{line(s.headline1, 250)}</span></span>
          {s.headline2 && <span className="name-line"><span>{line(s.headline2, 450)}</span></span>}
        </>}
    </h1>
  );
  const sub = s.subtitle ? <p className="hero-sub" {...p("subtitle")}><TypeOnce text={s.subtitle} animate={fx.typewriter && !edit} /></p> : null;
  const status = on("status") && s.statusText ? <div className="status" {...p("status")}><span className="pulse" />{s.statusText}</div> : null;
  const moodPill = on("mood") && s.showMood && mood ? <span className="mood-pill" {...p("mood")}><i aria-hidden />Today I&apos;m feeling {mood.emoji} {mood.label}</span> : null;
  const live = on("live") && fx.visitors ? (edit ? <span className="live-pill" {...p("live")}><i aria-hidden />2 people here right now 👀</span> : <span {...p("live")} style={{ display: "contents" }}><LivePill /></span>) : null;
  const pills = status || moodPill || live ? <div className="hero-pills">{status}{moodPill}{live}</div> : null;
  const roles = on("roles") && s.roleChips.length > 0 ? <div className="roles" {...p("roles")}>{s.roleChips.map((r, i) => <span key={i}>{r}</span>)}</div> : null;
  const now = on("now") && s.nowStatus ? <div className="now-pill" {...p("now")}>{s.nowStatus}</div> : null;
  const clock = on("clock") && s.timezone ? <div className="hero-clock" {...p("clock")}>🕐 Local time: <Clock timezone={s.timezone} label={s.clockLabel} /></div> : null;
  const greet = on("greeting") && fx.greeting && s.timezone ? <div {...p("greeting")}><Greeting timezone={s.timezone} place={place} /></div> : null;
  const statsBox = on("stats") && stats.length > 1 ? (
    <div className="hero-stats" aria-label="By the numbers" {...p("stats", { "--n": stats.length } as React.CSSProperties)}>
      {stats.map((st) => {
        const inner = <><b data-count={st.n}>{st.n}</b><span><i aria-hidden>{st.emoji}</i>{st.label}</span></>;
        return st.to && !edit ? <a key={st.key} href={st.to} className="hs">{inner}</a> : <div key={st.key} className="hs">{inner}</div>;
      })}
    </div>
  ) : null;
  const go = (url: string) => (edit ? undefined : url);
  const buttons: { label: string; url: string; icon: string; out?: boolean }[] = !on("buttons") ? [] : [
    ...(s.resumeUrl && s.ctaPrimaryLabel ? [{ label: s.ctaPrimaryLabel, url: s.resumeUrl, icon: "download", out: true }] : []),
    ...(s.ctaSecondaryLabel ? [{ label: s.ctaSecondaryLabel, url: s.ctaSecondaryUrl, icon: "send" }] : []),
    ...d.buttons.map((b) => ({ label: b.label, url: b.url, icon: "arrow-up-right", out: /^https?:/.test(b.url) })),
  ];
  const ext = (b: { out?: boolean }) => (b.out && !edit ? { target: "_blank", rel: "noopener" } : {});
  const ctas = (cls: string) => buttons.length > 0 ? (
    <div className={cls} {...p("buttons")}>
      {buttons.map((b, i) => <a key={i} className={`${i === 0 ? "btn-mint" : "btn-ghost"}${fx.magnetic ? " mag" : ""}`} href={go(b.url)} {...ext(b)}><i className={`ti ti-${b.icon}`} />{b.label}</a>)}
    </div>
  ) : null;
  // eslint-disable-next-line @next/next/no-img-element
  const photo = s.avatarUrl ? <img src={s.avatarUrl} alt={s.fullName} /> : <div className="avatar-ph">{s.initials || "✦"}</div>;
  const marquee = on("skills") && s.skills.length > 0 ? (
    <div className="marquee" aria-label="Skills" {...p("skills")}>
      <div className="marquee-track">{[...s.skills, ...s.skills].map((k, i) => <span key={i} aria-hidden={i >= s.skills.length}>{k}</span>)}</div>
    </div>
  ) : null;
  const cue = on("cue") && s.scrollCue ? <div className="scrollcue" {...p("cue")}><i className="ti ti-chevron-down" />{s.scrollCue}</div> : null;
  const shaped = `hl-shot shape-${d.shape}`;

  const look = (k: HeroLook): React.ReactNode => {
    if (k === "hang") {
      const avatar = sticker ? <>{photo}<i className="stk-tape a" aria-hidden /><i className="stk-tape b" aria-hidden /></> : photo;
      const framed = fx.tilt && !edit ? <AvatarTilt label={`${s.fullName}. Click for confetti`}>{avatar}</AvatarTilt> : <div className="avatar-tilt">{avatar}</div>;
      return <>
        <div className="hero-inner">
          <div>{pills}{head()}{sub}{roles}{now}{clock}{greet}{statsBox}</div>
          {!sticker && <div className="hero-right">
            <div className="avatar-wrap" {...p("photo")}>{fx.tilt && !edit ? framed : photo}<div className="avatar-ring" />{fx.tilt && <div className="avatar-orbit" aria-hidden><i /><i /></div>}</div>
            {ctas("ctas")}
          </div>}
        </div>
        {sticker && (
          <div className="hang">
            {buttons.length > 0 && <div className="ctas paper-ctas" {...p("buttons")}>
              {buttons.map((b, i) => <a key={i} className={`btn-paper ${i === 0 ? "p-main" : "p-alt"}${fx.magnetic ? " mag" : ""}`} href={go(b.url)} {...ext(b)}><span className="paper-face"><i className={`ti ti-${b.icon}`} />{b.label}</span><i className="paper-tape" aria-hidden /></a>)}
            </div>}
            <div className="avatar-wrap sticker" {...p("photo")}><Sticker>{framed}</Sticker></div>
          </div>
        )}
      </>;
    }
    if (k === "magazine") return <>
      {/* the cover photo fills the whole hero, so it sits outside the part that sinks away while scrolling */}
      <div className="mg-photo" {...p("photo")}>{photo}</div>
      <div className="hero-inner hl hl-mag">
        <div className="mg-top" {...p("band")}><span>Issue Nº {new Date().getFullYear() % 100} · {place || "Home"}</span>{clock}</div>
        <div className="mg-mast" {...p("mast")}>{(d.mast || owner).toUpperCase()}</div>
        <i className="mg-code" aria-hidden />
        <div className="mg-lines" {...p("lines")}>
          {status}{moodPill}{live}
          {on("roles") && s.roleChips.slice(0, 3).map((r, i) => <span key={i} className="mg-line">{r}</span>)}
          {on("stats") && stats.slice(0, 3).map((st) => <span key={st.key} className="mg-line"><b data-count={st.n}>{st.n}</b> {st.label} inside</span>)}
        </div>
        <div className="mg-story">{head("mg-head")}{sub}{now}{greet}{ctas("ctas mg-ctas")}</div>
      </div>
    </>;
    if (k === "profile") return (
      <div className="hero-inner hl hl-pro">
        <div className="pf-card">
          <div className="pf-cover" {...p("band")}><i className={`pf-av ${shaped}`} {...p("photo")}>{photo}</i></div>
          <div className="pf-body">
            <div className="pf-name"><b>{s.fullName}</b><span>@{(s.nickname || s.fullName).toLowerCase().replace(/\s+/g, "")}{place ? ` · ${place}` : ""}</span></div>
            {pills}{head("pf-head")}{sub}{now}
            {on("stats") && stats.length > 0 && <div className="pf-nums" {...p("stats")}>{stats.map((st) => <span key={st.key}><b data-count={st.n}>{st.n}</b>{st.label}</span>)}</div>}
            {ctas("ctas pf-ctas")}
            {on("roles") && s.roleChips.length > 0 && <div className="pf-hl" {...p("roles")}>{s.roleChips.map((r, i) => <span key={i}><i aria-hidden>{["🧠", "🧭", "✨", "🌏", "⚡", "🎯"][i % 6]}</i>{r}</span>)}</div>}
            {clock}{greet}
          </div>
        </div>
      </div>
    );
    if (k === "terminal") {
      const prompt = `${d.prompt || (s.nickname || "me").toLowerCase().replace(/\s+/g, "-")}@${(place || "home").toLowerCase().replace(/\s+/g, "-")}:~$`;
      let n = 0;
      const L = ({ cmd, children, cls = "" }: { cmd?: string; children?: React.ReactNode; cls?: string }) => <div className={`tm-l ${cls}`} style={{ "--i": n++ } as React.CSSProperties}>{cmd ? <><span className="tm-p">{prompt}</span> {cmd}</> : children}</div>;
      return (
        <div className="hero-inner hl hl-term">
          <div className="tm-win">
            <div className="tm-bar" {...p("band")}><i /><i /><i /><span>{owner.toLowerCase()} — zsh</span></div>
            <div className="tm-scr">
              <i className={`tm-photo ${shaped}`} {...p("photo")}>{photo}</i>
              <L cmd="whoami" /><L>{s.fullName}{s.nickname && s.nickname !== s.fullName ? ` (${s.nickname})` : ""}</L>
              {status && <><L cmd="status" /><L>{status}{moodPill}{live}</L></>}
              <L cmd="cat headline.txt" /><L>{head("tm-head")}</L>{sub && <L cls="tm-dim">{sub}</L>}
              {roles && <><L cmd="ls roles/" /><L>{roles}</L></>}
              {now && <><L cmd="cat now.txt" /><L>{now}</L></>}
              {statsBox && <><L cmd="wc -l sections/*" /><L>{statsBox}</L></>}
              {clock && <><L cmd="date" /><L>{clock}{greet}</L></>}
              {buttons.length > 0 && <L>{ctas("ctas tm-ctas")}</L>}
              <L><span className="tm-p">{prompt}</span> <i className="tm-cur" aria-hidden /></L>
            </div>
          </div>
        </div>
      );
    }
    if (k === "poster") return (
      <div className="hero-inner hl hl-post">
        <span className="ps-presents" {...p("band")}>{d.presents || `${place || "Home"} Pictures presents`}</span>
        <div className={`ps-shot ${shaped}`} {...p("photo")}>{photo}</div>
        {head("ps-head")}
        {sub}
        {on("stats") && stats.length > 0 && <div className="ps-reviews" {...p("stats")}><span className="ps-stars" aria-hidden>★★★★★</span>{stats.map((st) => <span key={st.key}>“<b data-count={st.n}>{st.n}</b> {st.label}”</span>)}</div>}
        {ctas("ctas ps-ctas")}
        {on("roles") && s.roleChips.length > 0 && <p className="ps-credits" {...p("roles")}>Starring <b>{s.fullName}</b> as {s.roleChips.join(" · ")}{on("skills") && s.skills.length ? ` · featuring ${s.skills.map((x) => x.replace(/^\S+\s/, "")).join(", ")}` : ""}</p>}
        <div className="ps-foot">{pills}{now}{clock}{greet}</div>
      </div>
    );
    return (
      <div className="hero-inner hl hl-lights">
        <div className="lt-main">
          <div className="lt-sign"><i className="lt-bulbs" aria-hidden />{pills}{head("lt-head")}{sub}</div>
          {on("roles") && s.roleChips.length > 0 && <div className="lt-tix" {...p("roles")}>{s.roleChips.map((r, i) => <span key={i}>{r}</span>)}</div>}
          {now}
          {on("stats") && stats.length > 0 && <p className="lt-stats" {...p("stats")}>{stats.map((st, i) => <span key={st.key}>{i > 0 && " ★ "}<b data-count={st.n}>{st.n}</b> {st.label}</span>)}</p>}
          {ctas("ctas lt-ctas")}
          {clock}{greet}
        </div>
        <div className={`lt-cut ${shaped}`} {...p("photo")}>{photo}</div>
      </div>
    );
  };

  const pl = d.phoneLook && d.phoneLook !== d.look ? d.phoneLook : "";
  const bg = d.bg === "own" ? layers : d.bg === "aurora" ? <div className="aurora" aria-hidden /> : d.bg === "blur" && s.avatarUrl ? <i className="hero-blur" aria-hidden style={{ backgroundImage: `url("${s.avatarUrl}")` }} /> : null;
  const cls = [
    `hl-is-${phone && pl ? pl : d.look}`,
    pl && !phone ? `hlp-is-${pl}` : "",
    `hbg-${d.bg}`,
    // the hanging photo needs room above the words on narrower screens: only where that look is the one showing
    sticker && (phone ? (pl || d.look) === "hang" : d.look === "hang") ? "hero-hang" : "",
    sticker && !phone && d.look === "hang" && pl ? "hang-desk" : "",
    sticker && !phone && d.look !== "hang" && pl === "hang" ? "hang-phone" : "",
  ].filter(Boolean).join(" ");
  return (
    <section id="hero" data-spy className={cls}>
      {bg}
      <i className="tf-band" aria-hidden />
      <i className="tf-a" aria-hidden />
      {on("emojis") && emojis}
      {phone ? look(pl || d.look) : pl ? <><div className="hl-desk">{look(d.look)}</div><div className="hl-phone">{look(pl)}</div></> : look(d.look)}
      {d.look !== "terminal" || pl ? cue : null}
      {marquee}
    </section>
  );
}
