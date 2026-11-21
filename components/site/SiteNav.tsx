import type { Section } from "@/lib/data";
import { isConnectLayout, type SiteSettings } from "@/lib/settings";
import { menuBg, type MenuDesign } from "@/lib/chrome";
import { BrandTypewriter } from "./Typewriters";
import MobileMenu from "./MobileMenu";
import ThemeSwitch from "./ThemeSwitch";
import NavFx, { NavFit, NowPlaying, SearchButton } from "./NavFx";

/** Light text over these backgrounds. */
const DARK_BGS = new Set(["eq", "aurora", "brick", "dhaka", "sky"]);
const NEON = ["#ff4fd8", "#ffe14d", "#4dd2ff", "#7dff8a", "#ff8a3d", "#c084ff", "#ff4f6d", "#4dffd2", "#ff9f4d", "#9dff4d"];

/** A skyline's outline for the Dhaka background, the same every time (no randomness between server and browser). */
function skyline(w: number, maxH: number) {
  let d = "M0 80", x = 0, seed = maxH;
  const r = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  while (x < w) { const bw = 14 + r() * 26, bh = 20 + r() * (maxH - 20); d += ` L${x.toFixed(0)} ${(80 - bh).toFixed(0)} L${(x + bw).toFixed(0)} ${(80 - bh).toFixed(0)}`; if (r() < .25) d += ` L${(x + bw / 2).toFixed(0)} ${(80 - bh - 10).toFixed(0)}`; x += bw; }
  return d + ` L${w} 80 Z`;
}
const sil = (c: string, h: number, w: number) => `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="80"><path fill="${c}" d="${skyline(w, h)}"/></svg>`)}")`;

/** The menu bar's living background: drawn once here, moved only by CSS (transform and opacity) and by NavFx (the sky's time, the skyline's parallax). */
export function NavBg({ bg }: { bg: string }) {
  const n = (k: number) => Array.from({ length: k }, (_, i) => i);
  return (
    <div className={`mb-bg mbg-${bg}`} aria-hidden>
      {bg === "sky" && <>{n(28).map((i) => <i key={`s${i}`} className="mb-star" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 90}%`, animationDelay: `${(i % 7) * .3}s` }} />)}
        {n(4).map((i) => <i key={`c${i}`} className="mb-cloud" style={{ top: 6 + i * 9, animationDuration: `${26 + i * 8}s`, animationDelay: `${-i * 7}s` }} />)}<i className="mb-sun" /></>}
      {bg === "eq" && n(48).map((i) => <i key={i} className="mb-bar" style={{ animationDuration: `${.7 + ((i * 7) % 11) / 10}s`, animationDelay: `${-((i * 13) % 17) / 10}s` }} />)}
      {bg === "halftone" && <i className="mb-dots" />}
      {bg === "confetti" && n(18).map((i) => <i key={i} className="mb-conf" style={{ left: `${(i * 41) % 100}%`, background: ["#ff4d8d", "#35c2d1", "#7ee8a2", "#ffd36e", "#9b6ef3"][i % 5], animationDuration: `${3 + (i % 5)}s`, animationDelay: `${-(i % 7) * .6}s` }} />)}
      {bg === "theme" && n(8).map((i) => <i key={i} className="mb-shape" style={{ left: `${8 + i * 12}%`, top: `${10 + (i % 3) * 26}%`, width: 10 + (i % 4) * 5, height: 10 + (i % 4) * 5, borderRadius: i % 2 ? "50%" : 3, background: ["var(--pop2)", "var(--pop3)", "var(--mint)"][i % 3], animationDelay: `${-i * .5}s` }} />)}
      {bg === "dhaka" && <>
        <i className="mb-lay" data-k=".15" style={{ backgroundImage: sil("#9b4a7d", 46, 420), opacity: .6 }} />
        <i className="mb-lay" data-k=".35" style={{ backgroundImage: sil("#5e2a63", 60, 360) }} />
        <i className="mb-lay" data-k=".7" style={{ backgroundImage: sil("#2b173a", 72, 300) }} />
        <span className="mb-rick">🛺</span></>}
    </div>
  );
}

/**
 * The menu bar (settings.menu, lib/chrome.ts): one of nine looks over one of ten living backgrounds, with extras the owner switches on.
 * `classic` with the theme background is the bar as it always was. The links stay the site's own `.navlinks` (scroll-spy marks the one
 * you're in), so everything that already worked keeps working; NavFx adds what moves. `preview` is the dashboard's copy: not fixed.
 */
export function Nav({ settings, sections, onHome, preview = false }: { settings: SiteSettings; sections: Section[]; onHome: boolean; preview?: boolean }) {
  const m: MenuDesign = settings.menu;
  const ex = m.extras;
  const bg = menuBg(m);
  const plain = m.look === "classic" && bg === "theme";
  const href = (s: Section) => (onHome ? `#${s.slug}` : `/#${s.slug}`);
  const shown = sections.filter((s) => !m.hidden.includes(s.slug));
  const connect = sections.find((s) => isConnectLayout(s.layout));
  const cls = ["nav", plain ? "" : `mb mb-${m.look} nbg-${bg}${DARK_BGS.has(bg) ? " mb-dark" : ""}`, m.look === "ticker" ? "mb-hastick" : "",
    `ph-${m.phone}`, preview ? "mb-preview" : ""].filter(Boolean).join(" ");
  const tick = m.ticker.length ? m.ticker : ["● Online now"];
  // the name always types itself through its phrases (the owner's rule, 2026-11-19), in every look
  const name = <BrandTypewriter phrases={settings.brandPhrases.length ? settings.brandPhrases : [settings.fullName]} animate={settings.effects.typewriter} />;
  return (
    <nav className={cls} data-sky={m.sky} style={{ "--nm": m.size.name / 100, "--lk": m.size.links / 100, "--lg": `${m.size.gap}px`, "--nh": m.size.height / 100 } as React.CSSProperties}>
      {!plain && <NavBg bg={bg} />}
      {m.look === "ticker" && (
        <div className="mb-tick" aria-hidden>
          <span>{[0, 1].map((k) => <span key={k}>{tick.map((t, i) => <span key={i}>{t.split("{time}").map((p, j) => <span key={j}>{j > 0 && <b className="mb-time">--:--</b>}{p}</span>)}<em>·</em></span>)}</span>)}</span>
        </div>
      )}
      <a href="/" className="brand" aria-label={settings.fullName}>
        <span className="dot" />
        {m.look === "play" ? <NowPlaying name={name} sections={shown.map((s) => ({ slug: s.slug, label: s.nav_label || s.title, emoji: s.nav_emoji }))} />
          : <span className="brand-text">{name}</span>}
      </a>
      <div className="nav-right">
        <ul className="navlinks">
          {settings.effects.navpill && plain && <li className="nav-pill" aria-hidden />}
          {!plain && <li className="mb-deco" aria-hidden><i /></li>}
          {shown.map((s, i) => {
            const label = s.nav_label || s.title;
            return (
              <li key={s.id} style={{ ["--nc" as string]: NEON[i % NEON.length] }}>
                <a href={href(s)} data-link={s.slug}><span className="ne">{s.nav_emoji}</span>
                  {settings.effects.navpill && plain ? <span className="roll"><span>{label}</span><span aria-hidden>{label}</span></span> : <span className="lbl">{label}</span>}
                  <i className="mb-new" aria-label="new since your last visit" />
                </a>
              </li>
            );
          })}
        </ul>
        {ex.search && <SearchButton sections={shown.map((s) => ({ href: href(s), label: s.nav_label || s.title, emoji: s.nav_emoji }))} />}
        {settings.effects.surprise && ex.dice !== false && (
          <a className="icon-btn dice-btn" href="/surprise" aria-label="Surprise me: open a random entry" title="Surprise me">🎲</a>
        )}
        {settings.themeSwitch && (ex.theme !== false || (settings.effects.shuffle && ex.shuffle !== false)) && (
          <ThemeSwitch defaultTheme={settings.defaultTheme} timezone={settings.timezone} shuffle={settings.effects.shuffle && ex.shuffle !== false} menu={ex.theme !== false} wipe={settings.effects.themewipe} />
        )}
        {ex.hello && connect && m.helloLabel && <a className="mb-hello" href={href(connect)}>{m.helloLabel}</a>}
        {(m.phone === "bottom" || m.phone === "full") && ex.menubtn !== false && (
          <MobileMenu full={m.phone === "full"} links={shown.map((s) => ({ href: href(s), label: s.nav_label || s.title, emoji: s.nav_emoji, code: s.code }))} />
        )}
      </div>
      {ex.prog && <i className="mb-prog" aria-hidden />}
      <NavFit dep={`${m.look}|${m.size.name}|${m.size.links}|${m.size.gap}|${m.size.height}|${shown.length}|${settings.brandPhrases.join("|")}`} />
      {!plain || ex.hide || ex.slim || ex.prog || ex.newdots ? <NavFx look={m.look} sky={m.sky} extras={ex} preview={preview} /> : null}
    </nav>
  );
}
