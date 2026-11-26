"use client";
import { messageAction } from "@/app/actions";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

/* the dashboard's themes (app/adminThemes.css): Classic light or dark, Glass Aurora and Bento Bold, each with colour sets */
type LookT = "light" | "dark" | "aurora" | "bento";
type Look = { t: LookT; v: number };
const LOOKS: { t: LookT; name: string; desc: string; pv: string; sets?: [string, string, string][] }[] = [
  { t: "aurora", name: "Glass Aurora", desc: "Frosted glass over slow northern lights", pv: "radial-gradient(circle at 25% 30%, #7cf0d4, transparent 60%), radial-gradient(circle at 80% 70%, #b69cff, transparent 60%), #0a0c19",
    sets: [["Aurora", "#7cf0d4", "#b69cff"], ["Sunset", "#ffb17a", "#ff6fa5"], ["Ice", "#9fd3ff", "#c9b8ff"]] },
  { t: "bento", name: "Bento Bold", desc: "Chunky blocks, black outlines, bold colours", pv: "linear-gradient(90deg, #f2b631 0 33%, #9cc5a1 33% 66%, #e2552d 66%)",
    sets: [["Muted bold", "#f2b631", "#2c4a7a"], ["Earth", "#d9a441", "#5b4636"], ["Mono + lime", "#d9f99d", "#1c1917"]] },
  { t: "light", name: "Classic", desc: "The sage dashboard you had before", pv: "linear-gradient(90deg, #232c28 0 30%, #edf1ec 30%)" },
  { t: "dark", name: "Classic dark", desc: "The same, in dark", pv: "linear-gradient(90deg, #131816 0 30%, #1f2623 30%)" },
];
const readLook = (): Look => { const h = document.documentElement, t = h.getAttribute("data-adm") as LookT | null; return { t: t && LOOKS.some((l) => l.t === t) ? t : "aurora", v: Number(h.getAttribute("data-adm-v")) || 0 }; };

type NavSection = { id: number; code: string; title: string; nav_label: string; visible: boolean; icon: string };
type Notif = { key: string; name: string; body: string; when: string; href: string; icon: string };


export default function Shell({ sections, unread, notifs, owner, children }: {
  sections: NavSection[]; unread: number; notifs: Notif[];
  owner: { name: string; initials: string; avatar: string }; children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const [look, setLookState] = useState<Look>({ t: "aurora", v: 0 });
  const [picker, setPicker] = useState(false);
  const dark = look.t === "dark" || look.t === "aurora";
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [bell, setBell] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLookState(readLook()); }, []);
  const setLook = (l: Look) => {
    const h = document.documentElement; h.setAttribute("data-adm", l.t); h.setAttribute("data-adm-v", String(l.v));
    try { localStorage.setItem("lc_admin_look", JSON.stringify(l)); } catch {}
    setLookState(l);
  };
  // Aurora: a soft light follows the mouse over the cards (--mx, --my on the card under it), at most once a frame
  useEffect(() => {
    if (look.t !== "aurora") return;
    let raf = 0, ev: PointerEvent | null = null;
    const paint = () => { raf = 0; const e = ev; if (!e || !(e.target instanceof Element)) return; const c = e.target.closest(".adm-content .c") as HTMLElement | null; if (!c) return; const r = c.getBoundingClientRect(); c.style.setProperty("--mx", `${e.clientX - r.left}px`); c.style.setProperty("--my", `${e.clientY - r.top}px`); };
    const on = (e: PointerEvent) => { ev = e; if (!raf) raf = requestAnimationFrame(paint); };
    window.addEventListener("pointermove", on, { passive: true });
    return () => { window.removeEventListener("pointermove", on); cancelAnimationFrame(raf); };
  }, [look.t]);
  // each theme's moment when something is saved: the "Saved" message appearing (any page's, or an editor's) sets it off
  const lookRef = useRef(look); lookRef.current = look;
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const celebrate = () => {
      const t = lookRef.current.t;
      if (t === "aurora") {
        ["", " two"].forEach((k) => { const r = document.createElement("i"); r.className = "adm-ripple" + k; r.style.left = "50%"; r.style.top = "88px"; document.querySelector(".adm")?.appendChild(r); setTimeout(() => r.remove(), 1500); });
      } else if (t === "bento") {
        // the Saved message itself is the sticker, in the middle of the screen (adminThemes.css); the confetti bursts from there
        import("canvas-confetti").then(({ default: confetti }) => {
          const cs = getComputedStyle(document.querySelector(".adm") as Element), c = ["--b1", "--b2", "--b3", "--b4"].map((k) => cs.getPropertyValue(k).trim()).filter(Boolean);
          confetti({ particleCount: 110, spread: 85, startVelocity: 38, origin: { x: 0.5, y: 0.5 }, colors: c.length ? c : undefined, disableForReducedMotion: true });
        }).catch(() => {});
      }
    };
    const seen = new WeakSet<Element>();
    const mo = new MutationObserver((list) => {
      for (const m of list) m.addedNodes.forEach((n) => {
        if (!(n instanceof Element)) return; const el = n.matches(".adm-toast") ? n : n.querySelector(".adm-toast");
        if (el && !seen.has(el) && /saved/i.test(el.textContent || "")) { seen.add(el); celebrate(); }
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    const first = document.querySelector(".adm-toast"); if (first && /saved/i.test(first.textContent || "")) { seen.add(first); setTimeout(celebrate, 150); }
    return () => mo.disconnect();
  }, []);

  const links = useMemo(() => [
    { href: "/admin", label: "Overview", icon: "layout-dashboard" },
    { href: "/admin/menu", label: "Menu bar", icon: "layout-navbar" },
    { href: "/admin/hero", label: "G0 · Hero", icon: "home" },
    ...sections.map((s) => ({ href: `/admin/s/${s.id}`, label: `${s.code ? s.code + " · " : ""}${(s.nav_label || s.title).toLowerCase()}`, icon: s.icon, hidden: !s.visible })),
    { href: "/admin/footer", label: "Footer", icon: "layout-bottombar" },
    { href: "/admin/inbox", label: "Inbox", icon: "inbox", badge: unread },
    { href: "/admin/banner", label: "Hanging banner", icon: "speakerphone" },
    { href: "/admin/mascot", label: "Mascot", icon: "mood-happy" },
    { href: "/admin/content", label: "Content sizes", icon: "adjustments" },
    { href: "/admin/appearance", label: "Appearance", icon: "palette" },
    { href: "/admin/themes", label: "Theme pictures", icon: "photo" },
    { href: "/admin/settings", label: "Settings", icon: "settings" },
  ], [sections, unread]);

  const isOn = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(href + "/"));
  const current = links.find((l) => isOn(l.href)) ?? (path.startsWith("/admin/items") ? { label: "Editing entry" } : { label: "Overview" });
  const results = q.trim() ? links.filter((l) => l.label.toLowerCase().includes(q.trim().toLowerCase())) : [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") { setBell(false); setPicker(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { setBell(false); setPicker(false); setQ(""); }, [path]);
  const pickRef = useRef<HTMLDivElement>(null), bellRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!picker && !bell) return;
    const out = (e: PointerEvent) => {
      const t = e.target as Node;
      if (picker && pickRef.current && !pickRef.current.contains(t)) setPicker(false);
      if (bell && bellRef.current && !bellRef.current.contains(t)) setBell(false);
    };
    document.addEventListener("pointerdown", out);
    return () => document.removeEventListener("pointerdown", out);
  }, [picker, bell]);

  return (
    <div className={`adm ${dark ? "dark" : ""}`}>
      <div className="adm-sky" aria-hidden="true"><i /><i /><i /></div>
      <div className="adm-shell">
        <aside className="adm-side">
          <a href="/admin" className="adm-logo">
            <span className="sq">{owner.initials.slice(0, 1) || "✦"}</span>
            <span><b>{owner.name.split(" ")[0] || "My"} admin</b><small>{sections.length} sections</small></span>
          </a>
          <nav className="adm-nav">
            {links.slice(0, 1).map((l) => <A key={l.href} l={l} on={isOn(l.href)} />)}
            <div className="adm-divider" />
            {links.slice(1, -7).map((l) => <A key={l.href} l={l} on={isOn(l.href)} />)}
            <div className="adm-divider" />
            {links.slice(-7, -1).map((l) => <A key={l.href} l={l} on={isOn(l.href)} />)}
            <span className="mobile-only-settings">{links.slice(-1).map((l) => <A key={l.href} l={l} on={isOn(l.href)} />)}</span>
          </nav>
          <div className="adm-owner">
            <a href="/admin/settings" className={isOn("/admin/settings") ? "on" : ""}>
              <span className="av">{owner.avatar ? <img src={owner.avatar} alt="" /> : owner.initials}</span>
              <span style={{ minWidth: 0 }}><b>{owner.name}</b><small>account &amp; settings</small></span>
              <i className="ti ti-settings" />
            </a>
          </div>
        </aside>

        <div className="adm-main">
          <div className="adm-top">
            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
              <span className="adm-crumb"><i className="ti ti-point-filled" />{current.label}</span>
              <div className="adm-search">
                <i className="ti ti-search" />
                <input ref={searchRef} value={q} placeholder="Jump to section…" aria-label="Search sections"
                  onChange={(e) => { setQ(e.target.value); setSel(0); }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
                    if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
                    if (e.key === "Enter" && results[sel]) router.push(results[sel].href);
                    if (e.key === "Escape") { setQ(""); searchRef.current?.blur(); }
                  }} />
                {!q && <kbd>⌘K</kbd>}
                {results.length > 0 && (
                  <div className="adm-search-results">
                    {results.map((r, i) => (
                      <a key={r.href} href={r.href} className={i === sel ? "sel" : ""}><i className={`ti ti-${r.icon}`} />{r.label}<small>↵</small></a>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="adm-top-actions">
              <a href="/" target="_blank" className="adm-pillbtn">View site<i className="ti ti-external-link" /></a>
              <div ref={pickRef} style={{ position: "relative" }}>
                <button className="adm-iconbtn" onClick={() => { setPicker((p) => !p); setBell(false); }} aria-label="Dashboard theme" aria-expanded={picker} title="Dashboard theme">
                  <i className="ti ti-palette" />
                </button>
                {picker && (
                  <div className="adm-drop" style={{ width: 290 }}>
                    <div className="adm-drop-h"><span>Dashboard theme</span><span>only your dashboard</span></div>
                    <div className="adm-pick">
                      {LOOKS.map((l) => (
                        <div key={l.t}>
                          <button type="button" className={look.t === l.t ? "on" : ""} onClick={() => setLook({ t: l.t, v: look.t === l.t ? look.v : 0 })} aria-pressed={look.t === l.t}>
                            <span className="pv" style={{ background: l.pv }} /><span>{l.name}<small>{l.desc}</small></span>
                          </button>
                          {l.sets && look.t === l.t && (
                            <div className="sets">{l.sets.map(([n, a, b], i) => (
                              <button key={n} type="button" className={look.v === i ? "on" : ""} onClick={() => setLook({ t: l.t, v: i })} aria-pressed={look.v === i}>
                                <i style={{ background: `linear-gradient(90deg, ${a} 50%, ${b} 50%)` }} />{n}
                              </button>
                            ))}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div ref={bellRef} style={{ position: "relative" }}>
                <button className="adm-iconbtn" onClick={() => { setBell((b) => !b); setPicker(false); }} aria-label="Notifications">
                  <i className="ti ti-bell" />{unread > 0 && <span className="dotb" />}
                </button>
                {bell && (
                  <div className="adm-drop">
                    <div className="adm-drop-h"><span>New in your inbox</span><span>{unread}</span></div>
                    {notifs.length === 0 && <div style={{ padding: 14, fontSize: 12, color: "var(--text-faint)" }}>You&apos;re all caught up ✨</div>}
                    {notifs.map((n) => (
                      <a key={n.key} href={n.href} className="adm-notif">
                        <i className={`ti ti-${n.icon}`} />
                        <div>{n.name}: {n.body.slice(0, 60)}{n.body.length > 60 ? "…" : ""}<small>{n.when}</small></div>
                      </a>
                    ))}
                    {unread > 0 && <form action={messageAction} className="adm-notif" style={{ justifyContent: "center", padding: 6 }}>
                      <input type="hidden" name="op" value="allread" /><input type="hidden" name="id" value="0" />
                      <button className="b-out b-sm"><i className="ti ti-checks" />Mark all read</button>
                    </form>}
                    <a href="/admin/inbox" className="adm-notif" style={{ justifyContent: "center", color: "var(--icon)", fontSize: 12, fontWeight: 600 }}>Open inbox →</a>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="adm-content">{children}</div>
        </div>
      </div>
    </div>
  );
}

function A({ l, on }: { l: { href: string; label: string; icon: string; hidden?: boolean; badge?: number }; on: boolean }) {
  return (
    <a href={l.href} className={`adm-item ${on ? "on" : ""} ${l.hidden ? "hidden-sec" : ""}`} title={l.hidden ? "Hidden from the site" : undefined}>
      <i className={`ti ti-${l.icon}`} />{l.label}{l.hidden && <i className="ti ti-eye-off" style={{ fontSize: 12 }} />}
      {!!l.badge && <span className="badge">{l.badge}</span>}
    </a>
  );
}
