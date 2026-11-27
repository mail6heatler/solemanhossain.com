// Settings → safety, security, site status, visitors and tools (2026-11-27). Stored in settings.ops and cleaned on read and save.
// Only switches and words live here, because pages can show the settings document; anything private (Telegram, two-step login,
// the private-mode password, spam words, blocked visitors) is in the `secrets` table (lib/opsServer.ts).

export type OpsSettings = {
  backups: { on: boolean; every: "day" | "week"; keep: number };
  bin: { on: boolean; days: number };
  history: { on: boolean; keep: number };
  lockout: { on: boolean; tries: number; minutes: number };
  loginLog: { on: boolean };
  twoStep: { on: boolean };
  maintenance: { on: boolean; title: string; text: string; emoji: string };
  private: { on: boolean; title: string; text: string };
  noindex: boolean;
  share: { on: boolean; image: string; title: string; text: string };
  icons: { tab: string; app: string; appName: string };
  /** false: the owner's own browsing isn't counted as visits */
  countMe: boolean;
  alerts: { on: boolean; chat: boolean; comments: boolean; reactions: boolean };
  spam: { on: boolean; perHour: number };
  cleanup: { on: boolean; months: number };
  /** short links: yoursite/<slug> opens <url> (app/[short]/page.tsx) */
  links: { slug: string; url: string }[];
};

export const OPS_LIMITS = {
  keepBackups: [3, 30], binDays: [7, 90], keepHistory: [10, 100], tries: [3, 10], minutes: [5, 120], perHour: [3, 60], months: [1, 36],
} as const;

export const DEFAULT_OPS: OpsSettings = {
  backups: { on: true, every: "day", keep: 10 },
  bin: { on: true, days: 30 },
  history: { on: true, keep: 30 },
  lockout: { on: true, tries: 5, minutes: 15 },
  loginLog: { on: true },
  twoStep: { on: false },
  maintenance: { on: false, title: "Back soon", text: "I'm making a few changes. Please come back in a little while.", emoji: "🛠️" },
  private: { on: false, title: "This site is private for now", text: "Enter the password to come in." },
  noindex: false,
  share: { on: false, image: "", title: "", text: "" },
  icons: { tab: "", app: "", appName: "" },
  countMe: false,
  alerts: { on: false, chat: true, comments: true, reactions: false },
  spam: { on: true, perHour: 12 },
  cleanup: { on: false, months: 12 },
  links: [],
};

const obj = (v: unknown) => (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
const flag = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const txt = (v: unknown, d: string, max: number) => (typeof v === "string" ? v.slice(0, max) : d);
const num = (v: unknown, d: number, [lo, hi]: readonly [number, number]) => (typeof v === "number" && isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d);
const url = (v: unknown) => (typeof v === "string" && /^(https:\/\/|\/media\/|\/)[^\s"'<>]*$/.test(v) ? v.slice(0, 500) : "");

export function cleanOps(raw: unknown): OpsSettings {
  const o = obj(raw), d = DEFAULT_OPS;
  const b = obj(o.backups), bin = obj(o.bin), h = obj(o.history), lo = obj(o.lockout), m = obj(o.maintenance), pr = obj(o.private);
  const sh = obj(o.share), ic = obj(o.icons), al = obj(o.alerts), sp = obj(o.spam), cl = obj(o.cleanup);
  return {
    backups: { on: flag(b.on, d.backups.on), every: b.every === "week" ? "week" : "day", keep: num(b.keep, d.backups.keep, OPS_LIMITS.keepBackups) },
    bin: { on: flag(bin.on, d.bin.on), days: num(bin.days, d.bin.days, OPS_LIMITS.binDays) },
    history: { on: flag(h.on, d.history.on), keep: num(h.keep, d.history.keep, OPS_LIMITS.keepHistory) },
    lockout: { on: flag(lo.on, d.lockout.on), tries: num(lo.tries, d.lockout.tries, OPS_LIMITS.tries), minutes: num(lo.minutes, d.lockout.minutes, OPS_LIMITS.minutes) },
    loginLog: { on: flag(obj(o.loginLog).on, d.loginLog.on) },
    twoStep: { on: flag(obj(o.twoStep).on, d.twoStep.on) },
    maintenance: { on: flag(m.on, d.maintenance.on), title: txt(m.title, d.maintenance.title, 80), text: txt(m.text, d.maintenance.text, 300), emoji: txt(m.emoji, d.maintenance.emoji, 8) },
    private: { on: flag(pr.on, d.private.on), title: txt(pr.title, d.private.title, 80), text: txt(pr.text, d.private.text, 200) },
    noindex: flag(o.noindex, d.noindex),
    share: { on: flag(sh.on, d.share.on), image: url(sh.image), title: txt(sh.title, "", 90), text: txt(sh.text, "", 200) },
    icons: { tab: url(ic.tab), app: url(ic.app), appName: txt(ic.appName, "", 30) },
    countMe: flag(o.countMe, d.countMe),
    alerts: { on: flag(al.on, d.alerts.on), chat: flag(al.chat, d.alerts.chat), comments: flag(al.comments, d.alerts.comments), reactions: flag(al.reactions, d.alerts.reactions) },
    spam: { on: flag(sp.on, d.spam.on), perHour: num(sp.perHour, d.spam.perHour, OPS_LIMITS.perHour) },
    cleanup: { on: flag(cl.on, d.cleanup.on), months: num(cl.months, d.cleanup.months, OPS_LIMITS.months) },
    links: cleanLinks(o.links),
  };
}

/** words the site's own pages use, so a short link can't take them */
export const RESERVED_SLUGS = ["admin", "api", "s", "media", "surprise", "robots.txt", "manifest.webmanifest", "icon.svg", "favicon.ico", "sitemap.xml", "_next", "fonts", "icons", "themes"];
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,29}$/;
function cleanLinks(v: unknown) {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>(), out: { slug: string; url: string }[] = [];
  for (const x of v.slice(0, 60)) {
    const o = obj(x);
    const slug = String(o.slug ?? "").trim().toLowerCase();
    const url = String(o.url ?? "").trim().slice(0, 600);
    if (!SLUG_RE.test(slug) || RESERVED_SLUGS.includes(slug) || seen.has(slug)) continue;
    if (!/^(https?:\/\/|mailto:|tel:|\/)[^\s"'<>]+$/i.test(url)) continue;
    seen.add(slug); out.push({ slug, url });
  }
  return out;
}

/** a device's name from its browser's description, e.g. "Chrome on Windows" */
export function deviceName(ua: string) {
  const b = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "A browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iPhone or iPad" : /Mac OS X|Macintosh/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "a device";
  return `${b} on ${os}`;
}
