"use client";
import { useEffect, useRef, useState } from "react";
import { BANNER_KINDS, type BannerView } from "@/lib/settings";
import { confettiFrom, prefersReducedMotion } from "./fx";
import { Split } from "./Split";

// How long it stays down before rolling itself up: longer when someone asked for it, and longer for more words.
const STAY_AUTO = 6000, STAY_PULLED = 10000, STAY_AFTER_HOVER = 3000;
const GAP = 22; // rope showing between the menu bar and the top of the banner
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const signature = (b: BannerView) => [b.kind, b.title, b.text, b.countdownIso].join("|");

function sample(): BannerView {
  return {
    kind: "upcoming", title: "Something big is coming", text: "This is only a preview: nobody else can see it. Write your own under Dashboard → Banner.",
    tab: "", linkLabel: "", linkUrl: "", countdownIso: new Date(Date.now() + 3 * 864e5 + 5 * 36e5).toISOString(), hideIso: "", autoDrop: true,
  };
}

/** Days / hours / minutes / seconds until the date, with digits that flip as they change. */
function Countdown({ iso }: { iso: string }) {
  const [left, setLeft] = useState(() => new Date(iso).getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setLeft(new Date(iso).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [iso]);
  if (left <= 0) return <div className="hb-now">It&apos;s happening now!</div>;
  const s = Math.floor(left / 1000);
  const parts: [string, number][] = [["days", Math.floor(s / 86400)], ["hrs", Math.floor(s / 3600) % 24], ["min", Math.floor(s / 60) % 60], ["sec", s % 60]];
  return (
    <div className="hb-count" role="timer">
      {parts.map(([label, n]) => (
        <span key={label} className="hb-unit"><b key={n}>{String(n).padStart(2, "0")}</b><small>{label}</small></span>
      ))}
    </div>
  );
}

function Banner({ data, demo, fall }: { data: BannerView; demo: boolean; fall: boolean }) {
  const kind = BANNER_KINDS[data.kind];
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const swing = useRef<HTMLDivElement>(null);
  const cloth = useRef<HTMLDivElement>(null);
  const tab = useRef<HTMLButtonElement>(null);
  const drop = useRef<(on: boolean) => void>(() => {});

  useEffect(() => {
    const el = root.current!, sw = swing.current!, cl = cloth.current!, tb = tab.current!;
    const nav = document.querySelector<HTMLElement>(".site .nav");
    const still = prefersReducedMotion();
    let C = 0, H = 0, pos = 0, v = 0, T = 0, a = 0, va = 0, raf = 0, shut = true;
    // what falls from the banner in this theme (loaded only where a banner exists)
    let falls: typeof import("./bannerFall") | null = null, pulled = 0;
    if (fall && !still && !document.documentElement.classList.contains("lite")) import("./bannerFall").then((m) => { falls = m; }).catch(() => {});
    const hem = () => { const r = cl.getBoundingClientRect(); return { x: r.left + 8, y: r.bottom + 10, w: r.width - 16 }; };
    let dragging = false, startY = 0, startPos = 0, moved = false, lastX = 0, onTab = false, openedAt = 0, lastScroll = window.scrollY;

    const place = () => {
      if (nav) el.style.top = `${Math.round(nav.getBoundingClientRect().bottom)}px`;
      C = cl.offsetHeight; H = C + GAP;
      if (T > 0) { T = H; if (still) pos = H; }
    };
    const paint = () => {
      sw.style.transform = `translate3d(0, ${(pos - C).toFixed(2)}px, 0) rotate(${a.toFixed(3)}deg) skewX(${(a * 0.4).toFixed(3)}deg)`;
      cl.style.opacity = String(clamp(pos / 26, 0, 1));
      cl.style.visibility = pos < 1 ? "hidden" : "visible";
    };
    let lastFrame = 0;
    const loop = (now: number) => {
      raf = 0;
      const steps = lastFrame ? clamp(Math.round((now - lastFrame) / 16.7), 1, 8) : 1;
      lastFrame = now;
      for (let i = 0; i < steps; i++) {
        if (!dragging) {
          v += (T - pos) * 0.07; v *= 0.8; pos += v;
          if (pos < 0) { pos = 0; v = 0; }
        }
        va += -a * 0.045; va *= 0.965; a += va;
      }
      paint();
      const resting = !dragging && Math.abs(T - pos) < 0.2 && Math.abs(v) < 0.1 && Math.abs(a) < 0.015 && Math.abs(va) < 0.012;
      if (resting) { pos = T; a = 0; va = 0; lastFrame = 0; paint(); return; }
      raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf && !still) raf = requestAnimationFrame(loop); };

    // rolls itself up after a while, but never while someone is reading it with the mouse on it, dragging it or using it from the keyboard
    let upTimer = 0, upAt = 0, hovering = false, focused = false;
    const readTime = Math.min(8000, (data.title.length + data.text.length) * 30);
    const arm = (ms: number) => {
      clearTimeout(upTimer);
      upAt = Date.now() + ms;
      upTimer = window.setTimeout(() => {
        if (dragging || hovering || focused || document.hidden) { arm(1500); return; }
        setDrop(false);
      }, ms);
    };
    const setDrop = (on: boolean, byItself = false) => {
      if (on === !shut) return;
      if (on) arm((byItself ? STAY_AUTO : STAY_PULLED) + readTime); else clearTimeout(upTimer);
      shut = !on;
      T = on ? H : 0;
      setOpen(on);
      if (on) {
        openedAt = window.scrollY;
        va += (Math.random() < 0.5 ? -1 : 1) * 0.42;
        if (!demo) try { localStorage.setItem("lc_banner_seen", signature(data)); } catch {}
        if (data.kind === "party") setTimeout(() => confettiFrom(tb, { count: 90, spread: 100 }), 340);
        if (!document.documentElement.classList.contains("lite")) falls?.pour(hem, 1.5);
      }
      if (still) { pos = T; paint(); } else kick();
    };
    drop.current = setDrop;

    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as Element;
      if (target.closest("a, .hb-close")) return;
      if (!target.closest(".hb-tab, .hb-cloth")) return;
      dragging = true; moved = false; startY = e.clientY; startPos = pos; lastX = e.clientX;
      onTab = !!target.closest(".hb-tab");
      el.classList.add("grabbing");
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const d = e.clientY - startY;
      if (Math.abs(d) > 4) moved = true;
      const p = startPos + d, next = p > H ? H + (p - H) * 0.28 : Math.max(0, p);
      if (next > pos) { pulled += next - pos; if (falls && pulled > 12) { falls.sprinkle(hem(), Math.min(4, Math.floor(pulled / 12))); pulled = 0; } }
      v = next - pos; pos = next;
      va += clamp((e.clientX - lastX) * 0.012, -0.5, 0.5);
      lastX = e.clientX;
      kick();
    };
    const up = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("grabbing");
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      if (moved) {
        const want = shut ? pos > 40 || v > 6 : pos > H * 0.62 && v > -6;
        if (want === !shut) { T = want ? H : 0; if (want) arm(STAY_PULLED + readTime); }
        else setDrop(want);
      } else if (onTab) setDrop(shut); // a plain tap
      kick();
    };
    // pointer taps are handled above; this click is the keyboard (Enter or Space on the tab)
    const click = (e: MouseEvent) => { if (e.detail === 0) setDrop(shut); };
    const nudge = (e: PointerEvent) => {
      if (dragging || shut || e.pointerType !== "mouse") return;
      va += clamp(e.movementX * 0.0035, -0.08, 0.08);
      kick();
    };
    const scroll = () => {
      const y = window.scrollY, d = y - lastScroll;
      lastScroll = y;
      if (nav) el.style.top = `${Math.round(nav.getBoundingClientRect().bottom)}px`;
      if (shut || dragging) return;
      va += clamp(d * 0.006, -0.3, 0.3);
      if (Math.abs(y - openedAt) > 700) setDrop(false); // it also rolls up once they've moved on; the tab stays
      kick();
    };
    const enter = (e: PointerEvent) => { if (e.pointerType === "mouse") hovering = true; };
    const leave = (e: PointerEvent) => { if (e.pointerType === "mouse") { hovering = false; if (!shut) arm(Math.max(upAt - Date.now(), STAY_AFTER_HOVER)); } };
    const focusIn = () => { focused = true; };
    const focusOut = (e: FocusEvent) => { if (!el.contains(e.relatedTarget as Node | null)) { focused = false; if (!shut) arm(Math.max(upAt - Date.now(), STAY_AFTER_HOVER)); } };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" && !shut && !document.querySelector("dialog[open]")) setDrop(false); };

    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("focusin", focusIn);
    el.addEventListener("focusout", focusOut);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    tb.addEventListener("click", click);
    cl.addEventListener("pointermove", nudge);
    window.addEventListener("scroll", scroll, { passive: true });
    document.addEventListener("keydown", key);
    const ro = new ResizeObserver(() => { place(); paint(); kick(); });
    ro.observe(cl);
    if (nav) ro.observe(nav);
    place(); paint();

    // arrives by itself once for each new announcement (it waits for the opening curtain)
    let seen = "";
    try { seen = localStorage.getItem("lc_banner_seen") || ""; } catch {}
    const intro = document.querySelector(".intro");
    const wait = intro && getComputedStyle(intro).display !== "none" ? 2500 : 1000;
    const timer = (data.autoDrop && seen !== signature(data)) || demo ? window.setTimeout(() => setDrop(true, true), wait) : 0;

    return () => {
      clearTimeout(timer);
      clearTimeout(upTimer);
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("focusin", focusIn);
      el.removeEventListener("focusout", focusOut);
      ro.disconnect();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      tb.removeEventListener("click", click);
      cl.removeEventListener("pointermove", nudge);
      window.removeEventListener("scroll", scroll);
      document.removeEventListener("keydown", key);
    };
  }, [data, demo, fall]);

  return (
    <aside ref={root} className={`hb k-${data.kind} ${open ? "open" : ""}`} aria-label="Announcement">
      <div ref={swing} className="hb-swing">
        <i className="hb-rope l" aria-hidden /><i className="hb-rope r" aria-hidden />
        <div ref={cloth} className="hb-cloth" inert={!open} style={{ visibility: "hidden" }}>
          <div className="hb-sway">
            <i className="hb-stripe" aria-hidden />
            <div className="hb-body">
              <span className="hb-badge"><i aria-hidden>{kind.emoji}</i>{kind.label}</span>
              <h2 className="hb-title"><Split text={data.title} /></h2>
              {data.text && <p className="hb-text">{data.text}</p>}
              {data.countdownIso && <Countdown iso={data.countdownIso} />}
              {data.linkUrl && data.linkLabel && (
                <a className="hb-cta" href={data.linkUrl} {...(data.linkUrl.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                  {data.linkLabel}<i className="ti ti-arrow-right" aria-hidden />
                </a>
              )}
            </div>
            <button type="button" className="hb-close" aria-label="Roll the announcement back up" onClick={() => drop.current(false)}><i className="ti ti-x" aria-hidden /></button>
            <i className="hb-hem" aria-hidden />
          </div>
        </div>
        <button ref={tab} type="button" className="hb-tab" aria-expanded={open} aria-label={open ? "Roll the announcement back up" : `Pull down the announcement: ${data.title}`}>
          <i className="hb-string" aria-hidden />
          <span className="hb-tag">
            <span className="hb-ping" aria-hidden />
            <span className="hb-emo" aria-hidden>{kind.emoji}</span>
            <span className="hb-lab">{open ? "Roll up" : data.tab || kind.tab}</span>
            <i className={`ti ${open ? "ti-chevron-up" : "ti-chevrons-down"}`} aria-hidden />
          </span>
        </button>
      </div>
    </aside>
  );
}

/** The announcement that hangs from the top of the site: pull the tab, and it drops down and swings. */
export default function HangingBanner({ banner, fall = true }: { banner: BannerView | null; fall?: boolean }) {
  const [view, setView] = useState<{ data: BannerView; demo: boolean } | null>(null);
  useEffect(() => {
    let live = true;
    const expired = (b: BannerView) => !!b.hideIso && new Date(b.hideIso).getTime() < Date.now();
    if (new URLSearchParams(location.search).get("demo") === "banner") {
      // the owner sees their own saved text before going live; anyone else who opens the link sees a sample
      fetch("/api/banner-preview").then((r) => (r.ok ? r.json() : null)).catch(() => null).then((d: BannerView | null) => {
        if (live) setView({ data: d && d.title ? d : sample(), demo: true });
      });
    } else if (banner && !expired(banner)) setView({ data: banner, demo: false });
    return () => { live = false; };
  }, [banner]);
  if (!view) return null;
  return <Banner data={view.data} demo={view.demo} fall={fall} />;
}
