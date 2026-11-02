"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type NavSection = { id: number; code: string; title: string; nav_label: string; visible: boolean; icon: string };
type Notif = { key: string; name: string; body: string; when: string; href: string; icon: string };


export default function Shell({ sections, unread, notifs, owner, children }: {
  sections: NavSection[]; unread: number; notifs: Notif[];
  owner: { name: string; initials: string; avatar: string }; children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [bell, setBell] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { setDark(localStorage.getItem("lc_admin_theme") === "dark"); } catch {}
  }, []);
  const toggleTheme = () => {
    setDark((d) => { try { localStorage.setItem("lc_admin_theme", d ? "light" : "dark"); } catch {} return !d; });
  };

  const links = useMemo(() => [
    { href: "/admin", label: "Overview", icon: "layout-dashboard" },
    { href: "/admin/hero", label: "G0 · Hero", icon: "home" },
    ...sections.map((s) => ({ href: `/admin/s/${s.id}`, label: `${s.code ? s.code + " · " : ""}${(s.nav_label || s.title).toLowerCase()}`, icon: s.icon, hidden: !s.visible })),
    { href: "/admin/inbox", label: "Inbox", icon: "inbox", badge: unread },
    { href: "/admin/appearance", label: "Appearance", icon: "palette" },
    { href: "/admin/settings", label: "Settings", icon: "settings" },
  ], [sections, unread]);

  const isOn = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(href + "/"));
  const current = links.find((l) => isOn(l.href)) ?? (path.startsWith("/admin/items") ? { label: "Editing entry" } : { label: "Overview" });
  const results = q.trim() ? links.filter((l) => l.label.toLowerCase().includes(q.trim().toLowerCase())) : [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") setBell(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { setBell(false); setQ(""); }, [path]);

  return (
    <div className={`adm ${dark ? "dark" : ""}`}>
      <div className="adm-shell">
        <aside className="adm-side">
          <a href="/admin" className="adm-logo">
            <span className="sq">{owner.initials.slice(0, 1) || "✦"}</span>
            <span><b>{owner.name.split(" ")[0] || "My"} admin</b><small>{sections.length} sections</small></span>
          </a>
          <nav className="adm-nav">
            {links.slice(0, 1).map((l) => <A key={l.href} l={l} on={isOn(l.href)} />)}
            <div className="adm-divider" />
            {links.slice(1, -3).map((l) => <A key={l.href} l={l} on={isOn(l.href)} />)}
            <div className="adm-divider" />
            {links.slice(-3, -1).map((l) => <A key={l.href} l={l} on={isOn(l.href)} />)}
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
              <button className="adm-iconbtn" onClick={toggleTheme} aria-label={dark ? "Light mode" : "Dark mode"}>
                <i className={`ti ${dark ? "ti-sun" : "ti-moon"}`} />
              </button>
              <div style={{ position: "relative" }}>
                <button className="adm-iconbtn" onClick={() => setBell((b) => !b)} aria-label="Notifications">
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
