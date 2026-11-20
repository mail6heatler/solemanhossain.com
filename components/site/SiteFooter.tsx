import type { Section } from "@/lib/data";
import { isConnectLayout, type SiteSettings } from "@/lib/settings";
import { linkView } from "@/lib/connectLook";
import { FAN_THEMES, THEME_CREDITS } from "@/lib/themeCredits";
import { Split } from "./Split";
import { DhakaClock, EggName, FooterOn, MapFooter, PassFooter, ReceiptFooter, Skyline, TopButton, type FootData } from "./FooterFx";

/**
 * The footer (settings.footer, lib/chrome.ts), in one of nine looks the owner picks on its dashboard page: three receipts built from the
 * visitor's own visit (the receipt, the receipt as map and links, the boarding pass), a treasure map, end credits, a signed letter, Dhaka at
 * night, map and links, or the giant name it always had. It's compact: a fixed height, smaller than a section. Under the look, the extras
 * (links, Dhaka's time, back to the top, Surprise me), the owner's two footer lines, and the fan themes' credits. `preview` is the dashboard's copy.
 */
export function Footer({ settings, sections = [], onHome = true, preview = false }: { settings: SiteSettings; sections?: Section[]; onHome?: boolean; preview?: boolean }) {
  const f = settings.footer, ex = f.extras;
  const year = String(new Date().getFullYear());
  const owner = settings.nickname || settings.fullName;
  const href = (s: Section) => (onHome ? `#${s.slug}` : `/#${s.slug}`);
  const connect = sections.find((s) => isConnectLayout(s.layout));
  const links = settings.socials.map((s) => { const v = linkView(s); return { label: s.label, url: s.url, icon: v.icon, logo: v.logo, color: v.color, ink: v.ink }; });
  const d: FootData = {
    sections: sections.map((s) => ({ slug: s.slug, label: s.nav_label || s.title, emoji: s.nav_emoji, code: s.code, href: href(s) })),
    links, owner, full: settings.fullName, photo: settings.avatarUrl || "", connectHref: connect ? href(connect) : "/", design: f, preview,
  };
  const name = <EggName on={!!ex.egg}>{owner}</EggName>;
  let body: React.ReactNode = null;
  if (f.look === "receipt" || f.look === "rcmap") body = <ReceiptFooter d={d} map={f.look === "rcmap"} />;
  else if (f.look === "rcpass") body = <PassFooter d={d} />;
  else if (f.look === "tmap") body = <MapFooter d={d} />;
  else if (f.look === "credits") body = (
    <div className="cr-box"><div className="cr-roll">
      <div className="cr-ttl">{name}<span>{f.tagline}</span></div>
      <div className="cr-grp"><span>Starring</span>{d.sections.map((s) => <a key={s.slug} href={preview ? undefined : s.href}>{s.emoji} {s.label} <em>as {s.code || "itself"}</em></a>)}</div>
      <div className="cr-grp"><span>Written, built &amp; directed by</span><b>{settings.fullName}</b></div>
      <div className="cr-grp"><span>Filmed on location in</span><b>{settings.location || "Dhaka, Bangladesh"}</b></div>
      <div className="cr-grp"><span>Special thanks</span><b>Everyone who said hello</b>{links.map((l) => <a key={l.url} href={preview ? undefined : l.url} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>)}</div>
      <div className="cr-end">THE END</div>
    </div></div>
  );
  else if (f.look === "letter") body = (
    <div className="lt-paper">
      <div className="lt-stamp">DHAKA<b><DhakaClock /></b>BANGLADESH</div>
      <p>{f.letter}</p>
      <span className="lt-sig">{f.signature || owner}</span>
    </div>
  );
  else if (f.look === "skyline") body = (
    <div className="sk">
      <Skyline sections={d.sections} preview={preview} />
      <i className="sk-moon" aria-hidden />
      <div className="sk-title"><b>{name}</b><span>Good night from Dhaka 🌙 · <DhakaClock /></span></div>
      <div className="sk-street"><span className="sk-rick" aria-hidden>🛺</span></div>
    </div>
  );
  else if (f.look === "map") body = (
    <div className="mp">
      <div className="mp-me"><b>{name}</b><span>{settings.headline1} {settings.headline2.replace(/\*/g, "")}</span></div>
      <div><h6>Sections</h6><ul>{d.sections.map((s) => <li key={s.slug}><a href={preview ? undefined : s.href}>{s.emoji} {s.label}</a></li>)}</ul></div>
      <div><h6>Reach me</h6><ul>{links.map((l) => <li key={l.url}><a href={preview ? undefined : l.url} target="_blank" rel="noopener noreferrer">{l.label} ↗</a></li>)}<li><a href={preview ? undefined : d.connectHref}>💬 Say hello</a></li></ul></div>
    </div>
  );
  else body = settings.effects.footername && owner ? (
    <div className="foot-giant" aria-hidden={!ex.egg} style={{ ["--n" as string]: Array.from(owner).length }}><EggName on={!!ex.egg}><Split text={owner} /></EggName></div>
  ) : null;

  return (
    <footer className={`ft2 ft-${f.look}${preview ? " ft-preview" : ""}`}>
      <div className="ft2-stage">{body}</div>
      <div className="ft2-strip">
        {ex.links && links.map((l) => (
          <a key={l.url} className="ft2-pill" href={preview ? undefined : l.url} {...(l.url.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            <i style={l.color && !l.logo ? { background: l.color, color: l.ink } : undefined}>{l.logo ? <img src={l.logo} alt="" loading="lazy" /> : <i className={`ti ti-${l.icon}`} />}</i>{l.label}
          </a>
        ))}
        {ex.time && <span className="ft2-pill">🕐 <DhakaClock /> in Dhaka</span>}
        {ex.surprise && settings.effects.surprise && <a href={preview ? undefined : "/surprise"} className="ft2-pill dice-btn-text">🎲 Surprise me</a>}
        {ex.top && <TopButton />}
      </div>
      <div className="ft2-legal"><span>{settings.footerLeft.replace("{year}", year)}</span><span>{settings.footerRight}</span></div>
      {Array.from(new Set([...FAN_THEMES, ...Object.keys(THEME_CREDITS)])).map((k) => {
        const c = THEME_CREDITS[k];
        return (
          <p key={k} className={`theme-credit tc-${k}`}>
            {FAN_THEMES.includes(k) && "Unofficial fan theme: not affiliated with or endorsed by anyone named or shown. "}
            {c && <span className="tc-pic">Photo: <a href={c.page} target="_blank" rel="noopener noreferrer">{c.title}</a> by {c.author}, {c.licenseUrl ? <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer">{c.license}</a> : c.license}, cropped.</span>}
          </p>
        );
      })}
      <FooterOn />
    </footer>
  );
}
