import type { Section } from "@/lib/data";
import type { SiteSettings } from "@/lib/settings";
import { BrandTypewriter } from "./Typewriters";
import MobileMenu from "./MobileMenu";
import Effects from "./Effects";

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
      <ul className="navlinks">
        {sections.map((s) => (
          <li key={s.id}>
            <a href={href(s)} data-link={s.slug}><span className="ne">{s.nav_emoji}</span>{s.nav_label || s.title}</a>
          </li>
        ))}
      </ul>
      <MobileMenu links={sections.map((s) => ({ href: href(s), label: s.nav_label || s.title, emoji: s.nav_emoji }))} />
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
  return (
    <footer>
      <span>{settings.footerLeft.replace("{year}", year)}</span>
      <span>{settings.footerRight}</span>
    </footer>
  );
}

export function SiteShell({ settings, sections, onHome, children }:
  { settings: SiteSettings; sections: Section[]; onHome: boolean; children: React.ReactNode }) {
  return (
    <div className="site">
      <Effects cursor={settings.effects.cursor} track />
      <Nav settings={settings} sections={sections} onHome={onHome} />
      {onHome && <Rail sections={sections} />}
      {children}
      <Footer settings={settings} />
    </div>
  );
}
