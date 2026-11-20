"use client";
import { useEffect, useRef, useState } from "react";
import type { Section } from "@/lib/data";
import { MOODS, type SiteSettings } from "@/lib/settings";
import { Nav } from "@/components/site/SiteNav";
import { Footer } from "@/components/site/SiteFooter";
import { BottomBar } from "@/components/site/BottomBar";
import PhoneMenu from "@/components/site/PhoneMenu";

/** What the dashboard sends into a preview screen: the draft settings and the theme it wears. */
export type ChromeDraft = { type: "lc-chrome-draft"; settings: SiteSettings; skin: string };

/**
 * One screen of the Menu bar and Footer editors' previews (/admin/preview), shown in a frame at a real screen's width, so the site's own
 * phone and computer rules apply exactly. It draws the real menu bar, a short page with one block per section (so the scroll-spy, slimming,
 * hiding and progress work as you scroll inside it), the real footer and the phone's way around. The dashboard sends the unsaved draft in
 * with postMessage (ChromeDraft), so every change shows at once. Links don't leave the page; nothing is tracked.
 */
export default function ChromePreview({ first, sections, part }: { first: SiteSettings; sections: Section[]; part: "menu" | "footer" }) {
  const [s, setS] = useState(first);
  const root = useRef<HTMLDivElement>(null);

  // the draft from the dashboard
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== location.origin || (e.data as ChromeDraft)?.type !== "lc-chrome-draft") return;
      const d = e.data as ChromeDraft;
      const el = document.scrollingElement!;
      const atEnd = el.scrollHeight - el.scrollTop - innerHeight < 60;
      setS(d.settings);
      if (d.skin) document.documentElement.setAttribute("data-skin", d.skin);
      if (part === "footer" && atEnd) requestAnimationFrame(() => requestAnimationFrame(() => scrollTo(0, el.scrollHeight)));
    };
    addEventListener("message", on);
    parent.postMessage({ type: "lc-chrome-ready" }, location.origin);
    return () => removeEventListener("message", on);
  }, [part]);

  // the footer's screen starts at the bottom of the page
  useEffect(() => {
    if (part !== "footer") return;
    const t = setTimeout(() => scrollTo(0, document.scrollingElement!.scrollHeight), 120);
    return () => clearTimeout(t);
  }, [part]);

  // a small scroll-spy, as the site's: marks the section you're in and tells the menu bar (lc-spy)
  useEffect(() => {
    const blocks = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-spy]") ?? []);
    const io = new IntersectionObserver((list) => {
      const hit = list.filter((x) => x.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!hit) return;
      const id = hit.target.id;
      document.querySelectorAll<HTMLAnchorElement>(".navlinks a[data-link], .bbar a[data-link]").forEach((a) => a.classList.toggle("active", a.dataset.link === id));
      dispatchEvent(new Event("lc-spy"));
    }, { rootMargin: "-40% 0px -55% 0px", threshold: [0, .01] });
    blocks.forEach((b) => io.observe(b));
    return () => io.disconnect();
  }, [sections]);

  // links stay on this page: only #anchors move
  useEffect(() => {
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a");
      if (!a) return;
      const h = a.getAttribute("href") || "";
      if (h.startsWith("#")) return;
      e.preventDefault();
      if (h === "/" || h.startsWith("/#")) {
        const to = h.length > 2 ? document.getElementById(h.slice(2)) : null;
        if (to) to.scrollIntoView({ behavior: "smooth" }); else scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    document.addEventListener("click", click, true);
    return () => document.removeEventListener("click", click, true);
  }, []);

  const shown = sections.filter((x) => !s.menu.hidden.includes(x.slug));
  const mood = MOODS[s.mood];
  const phone = s.menu.phone;
  const bbar = s.effects.bottombar && phone === "bottom";
  const menuLinks = shown.map((x) => ({ href: `#${x.slug}`, label: x.nav_label || x.title, emoji: x.nav_emoji }));
  return (
    <div ref={root} className={`site cpv ${bbar ? "has-bbar" : ""}${s.effects.navpill ? " fx-navpill" : ""}`}
      style={(mood ? { "--m": mood.color, "--m-deep": mood.deep } : {}) as React.CSSProperties}>
      <Nav settings={s} sections={sections} onHome />
      <div id="hero" data-spy className="cpv-hero">
        <span className="eyebrow">{s.nickname || s.fullName}</span>
        <h1 className="stitle">{s.fullName}</h1>
        <p className="ssub">A short page to try the menu bar on: scroll it to see the bar slim down, hide, fill its progress line and follow the section you&apos;re in.</p>
      </div>
      {sections.map((x) => (
        <div key={x.id} id={x.slug} data-spy className="cpv-sec">
          <span className="eyebrow">{x.code} · {x.nav_emoji} {x.eyebrow}</span>
          <h2 className="stitle">{x.title}</h2>
          {x.subtitle && <p className="ssub">{x.subtitle}</p>}
        </div>
      ))}
      <Footer settings={s} sections={sections} onHome />
      {bbar && <BottomBar sections={shown} onHome />}
      {(phone === "orb" || phone === "sheet") && <PhoneMenu kind={phone} links={[{ href: "#hero", label: "Home", emoji: "🏠" }, ...menuLinks]} />}
    </div>
  );
}
