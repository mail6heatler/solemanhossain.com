import type { Section } from "@/lib/data";
import { bannerView, MOODS, type SiteSettings } from "@/lib/settings";
import { BrandTypewriter } from "./Typewriters";
import MobileMenu from "./MobileMenu";
import Effects from "./Effects";
import ThemeSwitch from "./ThemeSwitch";
import DemoMode from "./Demo";
import Living from "./Living";
import ThemeFx from "./ThemeFx";
import HangingBanner from "./HangingBanner";
import { Split } from "./Split";

export function Nav({ settings, sections, onHome }: { settings: SiteSettings; sections: Section[]; onHome: boolean }) {
  const href = (s: Section) => (onHome ? `#${s.slug}` : `/#${s.slug}`);
  return (
    <nav className="nav">
      <a href="/" className="brand" aria-label={settings.fullName}>
        <span className="dot" />
        <span className="brand-text">
          <BrandTypewriter phrases={settings.brandPhrases.length ? settings.brandPhrases : [settings.fullName]} animate={settings.effects.typewriter} />
        </span>
      </a>
      <div className="nav-right">
        <ul className="navlinks">
          {settings.effects.navpill && <li className="nav-pill" aria-hidden />}
          {sections.map((s) => {
            const label = s.nav_label || s.title;
            return (
              <li key={s.id}>
                <a href={href(s)} data-link={s.slug}><span className="ne">{s.nav_emoji}</span>
                  {settings.effects.navpill ? <span className="roll"><span>{label}</span><span aria-hidden>{label}</span></span> : label}
                </a>
              </li>
            );
          })}
        </ul>
        {settings.effects.surprise && (
          <a className="icon-btn dice-btn" href="/surprise" aria-label="Surprise me: open a random entry" title="Surprise me">🎲</a>
        )}
        {settings.themeSwitch && (
          <ThemeSwitch defaultTheme={settings.defaultTheme} timezone={settings.timezone} shuffle={settings.effects.shuffle} wipe={settings.effects.themewipe} />
        )}
        <MobileMenu links={sections.map((s) => ({ href: href(s), label: s.nav_label || s.title, emoji: s.nav_emoji }))} />
      </div>
    </nav>
  );
}

export function Rail({ sections }: { sections: Section[] }) {
  return (
    <div id="rail" className="on-dark" aria-hidden>
      <a className="stop" data-target="hero" href="#hero"><span className="label">Hero</span><span className="node" /></a>
      {sections.map((s) => (
        <a key={s.id} className="stop" data-target={s.slug} href={`#${s.slug}`} style={{ textDecoration: "none" }}>
          <span className="label">{s.code ? `${s.code} · ` : ""}{s.nav_label || s.title}</span><span className="node" />
        </a>
      ))}
    </div>
  );
}

/** App-style menu at the bottom of the screen on phones. */
export function BottomBar({ sections, onHome }: { sections: Section[]; onHome: boolean }) {
  return (
    <nav className="bbar" aria-label="Sections">
      <a href={onHome ? "#hero" : "/"} data-link="hero"><span className="e" aria-hidden>🏠</span>Home</a>
      {sections.map((s) => (
        <a key={s.id} href={onHome ? `#${s.slug}` : `/#${s.slug}`} data-link={s.slug}>
          <span className="e" aria-hidden>{s.nav_emoji || "✦"}</span>{s.nav_label || s.title}
        </a>
      ))}
    </nav>
  );
}

const SPOTS = [
  { top: "18%", right: "22%" }, { top: "66%", right: "12%" }, { top: "42%", right: "30%" },
  { top: "78%", right: "26%" }, { top: "28%", right: "8%" }, { top: "56%", right: "40%" },
];

export function FloatingEmojis({ emojis, enabled, hero }: { emojis: string; enabled: boolean; hero?: boolean }) {
  if (!enabled) return null;
  const list = Array.from(emojis.trim().split(/\s+/).filter(Boolean)).slice(0, 6);
  const spots = hero
    ? [{ top: "18%", left: "58%" }, { top: "66%", left: "54%" }, { top: "40%", left: "70%" }, { top: "78%", left: "74%" }, { top: "28%", left: "82%" }, { top: "54%", left: "44%" }]
    : SPOTS;
  return (
    <>
      {list.map((e, i) => (
        <span key={i} className="float-emo" style={spots[i % spots.length]} title="drag me">{e}</span>
      ))}
    </>
  );
}

export function Footer({ settings }: { settings: SiteSettings }) {
  const year = String(new Date().getFullYear());
  const giant = settings.nickname || settings.fullName;
  return (
    <footer>
      {settings.effects.footername && giant && (
        <div className="foot-giant" aria-hidden style={{ ["--n" as string]: Array.from(giant).length }}><Split text={giant} /></div>
      )}
      <span>{settings.footerLeft.replace("{year}", year)}</span>
      {settings.effects.surprise && <a href="/surprise" className="dice-btn-text">🎲 Surprise me</a>}
      <span>{settings.footerRight}</span>
    </footer>
  );
}

/** Effects that are purely CSS: they switch on through a fx-<key> class on the page wrapper. */
const LOOKS = ["intro", "cardtilt", "spotlight", "ambient", "liquid", "navpill", "sheets", "splittext", "themefx"] as const;

export function SiteShell({ settings, sections, onHome, children }:
  { settings: SiteSettings; sections: Section[]; onHome: boolean; children: React.ReactNode }) {
  const fx = settings.effects;
  const mood = MOODS[settings.mood];
  const style = (mood ? { "--m": mood.color, "--m-deep": mood.deep } : {}) as React.CSSProperties;
  return (
    <div className={`site ${fx.bottombar ? "has-bbar" : ""} ${LOOKS.filter((k) => fx[k]).map((k) => `fx-${k}`).join(" ")}`} style={style}>
      <Effects
        cursor={fx.cursor} track totop={fx.totop}
        fx={{ smooth: fx.smooth, countup: fx.countup, timeline: fx.timeline, sparkles: fx.sparkles, explorer: fx.explorer && onHome, party: fx.party }}
        partyWord={settings.partyWord}
        sparkleEmojis={(settings.heroEmojis.trim().split(/\s+/).filter(Boolean).slice(0, 8))}
      />
      {fx.themefx && <ThemeFx />}
      <HangingBanner banner={settings.banner.on && settings.banner.title ? bannerView(settings.banner, settings.timezone) : null} fall={fx.bannerfall} />
      <Living fx={{ sectionfx: fx.sectionfx, cardtilt: fx.cardtilt, spotlight: fx.spotlight, liquid: fx.liquid, navpill: fx.navpill, kinetic: fx.kinetic, smartcursor: fx.smartcursor && fx.cursor, splittext: fx.splittext, imgreveal: fx.imgreveal, ambient: fx.ambient, magnetic: fx.magnetic, heroexit: fx.heroexit, ghost: fx.ghost, wordscrub: fx.wordscrub, velocity: fx.velocity, footername: fx.footername }} />
      {onHome && <DemoMode fx={fx} extras={{ themeSwitch: settings.themeSwitch, showMood: settings.showMood }} />}
      <Nav settings={settings} sections={sections} onHome={onHome} />
      {onHome && <Rail sections={sections} />}
      {children}
      <Footer settings={settings} />
      {fx.bottombar && <BottomBar sections={sections} onHome={onHome} />}
    </div>
  );
}
