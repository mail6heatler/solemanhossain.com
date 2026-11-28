"use client";
import { useEffect, useRef } from "react";
import { artOf, type PopItem, type PopnewsSettings } from "@/lib/popnews";
import { whenSettled } from "./fx";

/** What the dashboard's Pop-up news page sends its screens (`/?pop=studio`): the unsaved settings and a play counter, with a look or one story to show. */
export type PopStudioMsg = { type: "lc-pop-draft"; cfg: PopnewsSettings; play: number; k?: string; only?: string };

const today = (tz: string) => { try { return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); } catch { return new Date().toISOString().slice(0, 10); } };
/** the owner's stories that show today (or just one, for the dashboard's ▶ Show this one) */
function manualItems(c: PopnewsSettings, tz: string, only?: string): PopItem[] {
  const d = today(tz);
  return c.stories
    .filter((s) => (only ? s.id === only : s.on && (!s.start || s.start <= d) && (!s.end || s.end >= d)) && (s.title.trim() || s.media.length))
    .map((s) => ({ id: s.id, tag: s.tag, title: s.title, text: s.text, media: s.media.find((m) => m.type === "image" || m.type === "video") ?? null, emoji: s.emoji || "📰", art: artOf(s.art), source: s.source, button: s.button || "Read more", link: s.link }));
}
/** the automatic headlines for these settings; asked once per page and settings (the server keeps them for 30 minutes) */
const asked = new Map<string, Promise<PopItem[]>>();
function autoItems(c: PopnewsSettings): Promise<PopItem[]> {
  const url = `/api/popnews?feeds=${c.feeds.join(",")}&count=${c.count}${c.off.length ? `&off=${[...c.off].sort().join(",")}` : ""}`;
  let p = asked.get(url);
  if (!p) {
    p = fetch(url).then((r) => r.json()).then((j: { items?: PopItem[] }) => (Array.isArray(j.items) ? j.items : [])).catch(() => []);
    asked.set(url, p);
    p.then((l) => { if (!l.length) asked.delete(url); });
  }
  return p;
}
/** everything switched on: the owner's stories first, then the automatic headlines */
async function allItems(c: PopnewsSettings, tz: string): Promise<PopItem[]> {
  return [...(c.manual ? manualItems(c, tz) : []), ...(c.auto ? await autoItems(c) : [])];
}
const sig = (items: PopItem[]) => items.map((i) => `${i.id}:${i.title}`).join("|");

/**
 * The news pop-up (lib/popnews.ts): after the launch screen has opened onto the site and the page has settled, it waits the owner's seconds
 * and shows their stories (or the feed's headlines) in the chosen look (popNewsShow.ts, downloaded only then). Once per visit, once a day,
 * or only when a story is new (sessionStorage `lc_pop`, localStorage `lc_pop_d`, `lc_pop_v`); "Don't show again today" is `lc_pop_hush`.
 * Never in a frame (except the dashboard's `?pop=studio`), over maintenance or private mode, or on a preview link; `?pop=show` shows it at once.
 * Views and taps are counted once per story per day per browser (`/api/popnews`), never the owner's or the dashboard's.
 */
export default function PopNews({ cfg, timezone, onHome }: { cfg: PopnewsSettings; timezone: string; onHome: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const key = JSON.stringify(cfg);
  useEffect(() => {
    const layer = ref.current;
    if (!layer) return;
    const c0 = JSON.parse(key) as PopnewsSettings, html = document.documentElement, qs = new URLSearchParams(location.search);
    const framed = window.self !== window.top, studio = framed && qs.get("pop") === "studio", force = qs.get("pop") === "show";
    let close: (() => void) | null = null, dead = false, timer = 0;
    const count = (id: string, kind: "view" | "click") => {
      if (studio || html.classList.contains("no-count")) return;
      const k = `lc_pop_${kind}_${id}`, d = new Date().toDateString();
      try { if (localStorage.getItem(k) === d) return; localStorage.setItem(k, d); } catch {}
      fetch("/api/popnews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ story: id, kind }), keepalive: true }).catch(() => {});
    };
    const open = async (c: PopnewsSettings, o: { only?: string; look?: string; items?: PopItem[] } = {}) => {
      close?.(); close = null;
      const items = o.items ?? (o.only ? manualItems(c, timezone, o.only) : await allItems(c, timezone));
      if (dead || !items.length) return false;
      const m = await import("./popNewsShow");
      if (dead) return false;
      close = await m.showPop(layer, items, {
        look: o.look || c.look, where: c.where, paperName: c.paperName, studio, slide: o.only ? 0 : c.slide,
        onView: (id) => count(id, "view"), onClick: (id) => count(id, "click"),
        onHush: () => { try { localStorage.setItem("lc_pop_hush", new Date().toDateString()); } catch {} },
        onClose: () => { close = null; },
      });
      if (dead) { close(); return false; } // left the page while its first picture was loading
      return true;
    };

    // the dashboard's screens: they show what the page sends, at once
    if (studio) {
      let played = 0;
      const on = (e: MessageEvent) => {
        const d = e.data as PopStudioMsg | undefined;
        if (e.origin !== location.origin || d?.type !== "lc-pop-draft") return;
        if (d.play > played) { played = d.play; void open(d.cfg, { only: d.only, look: d.k }); }
      };
      addEventListener("message", on);
      window.parent.postMessage({ type: "lc-pop-ready" }, location.origin);
      return () => { dead = true; removeEventListener("message", on); close?.(); };
    }
    if (framed) return;
    if (!force) {
      if (!c0.on || (!c0.manual && !c0.auto)) return;
      if (c0.pages === "home" && !onHome) return;
      if (!c0.phones && matchMedia("(max-width: 760px)").matches) return;
      if (html.classList.contains("gate-m") || html.classList.contains("gate-p")) return;
      if (["demo", "theme", "mz", "bar", "launch"].some((k) => qs.get(k))) return;
      try { if (localStorage.getItem("lc_pop_hush") === new Date().toDateString()) return; } catch {}
    }
    const go = async () => {
      if (dead) return;
      let items: PopItem[] | undefined;
      if (!force) {
        try {
          if (c0.when === "visit" && sessionStorage.getItem("lc_pop")) return;
          if (c0.when === "day" && localStorage.getItem("lc_pop_d") === new Date().toDateString()) return;
          if (c0.when === "new") { items = await allItems(c0, timezone); if (!items.length || localStorage.getItem("lc_pop_v") === sig(items)) return; }
        } catch {}
      }
      const shown = await open(c0, { items });
      if (shown && !force) try { sessionStorage.setItem("lc_pop", "1"); localStorage.setItem("lc_pop_d", new Date().toDateString()); if (items) localStorage.setItem("lc_pop_v", sig(items)); } catch {}
    };
    // after the launch screen has opened onto the site, once the page has settled, and then the owner's seconds
    const later = () => { timer = window.setTimeout(() => void go(), (force ? 0.4 : c0.wait) * 1000); };
    const already = () => { try { return (c0.when === "visit" && !!sessionStorage.getItem("lc_pop")) || (c0.when === "day" && localStorage.getItem("lc_pop_d") === new Date().toDateString()); } catch { return false; } };
    const afterLaunch = () => { if (c0.auto && !force && !already()) void autoItems(c0); if (html.classList.contains("launching")) addEventListener("lc-launch-done", later, { once: true }); else later(); };
    const cancel = whenSettled(afterLaunch, 4);
    return () => { dead = true; clearTimeout(timer); cancel(); removeEventListener("lc-launch-done", later); close?.(); };
  }, [key, onHome, timezone]);
  return <div ref={ref} className="pnw-layer" />;
}
