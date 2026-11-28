import SiteGate from "./SiteGate";
import LaunchScreen from "./LaunchScreen";
import { CardBarProvider } from "./BarCtx";
import type { Section } from "@/lib/data";
import { bannerView, MOODS, type SiteSettings } from "@/lib/settings";
import Effects from "./Effects";
import DemoMode from "./Demo";
import Living from "./Living";
import ThemeFx from "./ThemeFx";
import HangingBanner from "./HangingBanner";
import Mascot from "./Mascot";
import FitScreens from "./FitScreens";
import { FAN_THEMES, THEME_CREDITS } from "@/lib/themeCredits";
import { Nav } from "./SiteNav";
import { Footer } from "./SiteFooter";
import PhoneMenu from "./PhoneMenu";
import VisitTracker from "./VisitTracker";
import OpenInBrowser from "./OpenInBrowser";
import { BottomBar } from "./BottomBar";
export { Nav, Footer, BottomBar };

const CLEAN_URL = /^(https?:\/\/|\/)[\w\-./:%?=&~+#,]+$/;
/** Pictures the owner added to themes, as CSS. Only a URL with no quotes, brackets or spaces can get in here. */
function themePicCss(pics: Record<string, string>) {
  return Object.entries(pics).filter(([k, u]) => /^[a-z0-9]+$/.test(k) && CLEAN_URL.test(u))
    .map(([k, u]) => `html[data-skin="${k}"] .site{--theme-pic:url("${u}")}`).join("");
}
/** What each theme's credit line says; CSS shows only the active theme's. */
function themeCreditCss(pics: Record<string, string>) {
  const keys = Array.from(new Set([...FAN_THEMES, ...Object.keys(THEME_CREDITS)]));
  return keys.map((k) => `html[data-skin="${k}"] .tc-${k}{display:block}`).join("") + Object.keys(pics).map((k) => (/^[a-z0-9]+$/.test(k) ? `.tc-${k} .tc-pic{display:none}` : "")).join("");
}

export function Rail({ sections, hero }: { sections: Section[]; hero: boolean }) {
  return (
    <div id="rail" className={hero ? "on-dark" : undefined} aria-hidden>
      {hero && <a className="stop" data-target="hero" href="#hero"><span className="label">Hero</span><span className="node" /></a>}
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

/** Effects that are purely CSS: they switch on through a fx-<key> class on the page wrapper. */
const LOOKS = ["intro", "cardtilt", "spotlight", "ambient", "liquid", "navpill", "sheets", "splittext", "themefx", "reactfx", "windowfx", "tripfx", "studyfx", "comicfx", "awardfx", "scrapfx", "notefx", "fullfx", "chatfx"] as const;

export function SiteShell({ settings, sections, onHome, children }:
  { settings: SiteSettings; sections: Section[]; onHome: boolean; children: React.ReactNode }) {
  const fx = settings.effects;
  const mood = MOODS[settings.mood];
  const style = (mood ? { "--m": mood.color, "--m-deep": mood.deep } : {}) as React.CSSProperties;
  // the phone's way around: the bottom bar as before, or the menu bar's orb or sheet (settings.menu.phone)
  const phone = settings.menu.phone;
  const bbar = fx.bottombar && phone === "bottom";
  const menuLinks = sections.filter((s) => !settings.menu.hidden.includes(s.slug)).map((s) => ({ href: onHome ? `#${s.slug}` : `/#${s.slug}`, label: s.nav_label || s.title, emoji: s.nav_emoji }));
  return (
    <div className={`site ${onHome ? "home " : ""}${bbar ? "has-bbar" : ""} ${LOOKS.filter((k) => fx[k]).map((k) => `fx-${k}`).join(" ")}`} style={style}>
      {/* the launch screen: shown before the first paint by skinScript when it should play (lib/launch.ts). It comes first in the page, so it's in
          the first piece the browser reads: further down (it was after the footer, halfway through the page) a slow load drew the site first and
          showed it for a moment (the owner saw the flick, 2026-11-28). launch.css also covers the page from the first frame until it takes over. */}
      <LaunchScreen cfg={settings.launch} names={{ nick: settings.nickname || settings.fullName, name: settings.fullName, rocket: settings.mascot.fun.rocketName || "SHOUROBH ONE" }} />
      <Effects
        cursor={fx.cursor} track totop={fx.totop && !settings.mascot.show /* the bottom-right corner is the mascot's while he's on; the footer keeps Back to top */}
        fx={{ autolite: fx.autolite, smooth: fx.smooth, countup: fx.countup, timeline: fx.timeline, sparkles: fx.sparkles, explorer: fx.explorer && onHome, party: fx.party }}
        partyWord={settings.partyWord}
        sparkleEmojis={(settings.heroEmojis.trim().split(/\s+/).filter(Boolean).slice(0, 8))}
      />
      <style>{themeCreditCss(settings.themePics) + themePicCss(settings.themePics)}</style>
      {fx.themefx && <ThemeFx />}
      <HangingBanner banner={settings.banner.on && settings.banner.title ? bannerView(settings.banner, settings.timezone) : null} fall={fx.bannerfall} />
      <Living fx={{ reactfx: fx.reactfx && fx.reactions, cardtilt: fx.cardtilt, spotlight: fx.spotlight, liquid: fx.liquid, navpill: fx.navpill, kinetic: fx.kinetic, smartcursor: fx.smartcursor && fx.cursor, splittext: fx.splittext, imgreveal: fx.imgreveal, ambient: fx.ambient, magnetic: fx.magnetic, ghost: fx.ghost, wordscrub: fx.wordscrub, velocity: fx.velocity, footername: fx.footername }} />
      {onHome && <FitScreens />}
      {onHome && <DemoMode fx={fx} extras={{ themeSwitch: settings.themeSwitch, showMood: settings.showMood }} />}
      {settings.menu.show && <Nav settings={settings} sections={sections} onHome={onHome} />}
      {onHome && <Rail sections={sections} hero={!settings.heroHidden} />}
      {/* the sticker buttons on cards follow the dashboard's Card buttons page (lib/cardBar.ts) */}
      <CardBarProvider value={settings.cardBar}>{children}</CardBarProvider>
      {settings.footer.show && <Footer settings={settings} sections={sections} onHome={onHome} />}
      {/* drawn even when he's hidden: it stays empty then, except on the Mascot page's screens */}
      <Mascot view={{ m: settings.mascot, timezone: settings.timezone }} phoneMenu={phone} />
      {bbar && <BottomBar sections={sections.filter((s) => !settings.menu.hidden.includes(s.slug))} onHome={onHome} />}
      {(phone === "orb" || phone === "sheet") && <PhoneMenu kind={phone} links={[{ href: onHome ? "#hero" : "/", label: "Home", emoji: "🏠" }, ...menuLinks]} />}
      {(settings.ops.maintenance.on || settings.ops.private.on) && <SiteGate ops={settings.ops} name={settings.nickname || settings.fullName} />}
      <VisitTracker />
      <OpenInBrowser />
    </div>
  );
}
