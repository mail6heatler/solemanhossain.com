// Mouse-driven motion (and the few scroll-triggered bits that need no library). No dependencies.

export type HoverFxFlags = { reactfx: boolean; footername: boolean; cardtilt: boolean; spotlight: boolean; liquid: boolean; navpill: boolean; kinetic: boolean; smartcursor: boolean; splittext: boolean; imgreveal: boolean; ambient: boolean; magnetic: boolean };

const TILT = ".card, .trip, .note, .wall-note, .ph-tile";
const SPOT_GROUPS = ".grid3, .notes, .strip, .photogrid, .wall, .hero-stats";
const SPOT_ITEMS = ".card, .trip, .note, .wall-note, .ph-tile, .hs";
const LIQUID = ".btn-ghost, .see-all, .connectrow a, .btn-line, .filters a:not(.on), .roles span";
const MAGNETS = ".mag, .see-all, .connectrow a, .btn-ink, .btn-line";
const WIPE = ".card-media, .trip .ph, .ph-tile:not(.txt), .post-media, .note-media, .entry .hero-img, .g-tile";
const GLYPHS = "!<>-_/[]{}=+*^?#01";

import { pageY } from "./fx";

const qsa = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(s));

export function startHoverFx(fx: HoverFxFlags) {
  const cleanups: (() => void)[] = [];
  const on = <K extends keyof DocumentEventMap>(k: K, f: (e: DocumentEventMap[K]) => void, o?: AddEventListenerOptions) => {
    document.addEventListener(k, f, o);
    cleanups.push(() => document.removeEventListener(k, f, o));
  };
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // ---------- works on every device: photos wipe into view, chapter labels decode ----------
  if (fx.imgreveal) {
    const els = qsa(WIPE);
    const vh = window.innerHeight;
    // a fully clipped element never counts as on screen, so each photo is watched through its parent
    const waiting = new Map<Element, HTMLElement[]>();
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      waiting.get(e.target)?.forEach((el) => el.classList.add("seen"));
      waiting.delete(e.target);
    }), { threshold: 0.05, rootMargin: "0px 0px -6% 0px" });
    els.forEach((el) => {
      const parent = el.parentElement;
      if (!parent || el.getBoundingClientRect().top < vh * 0.9) return; // already on screen at load: leave it alone
      el.classList.add("wipe");
      waiting.set(parent, [...(waiting.get(parent) ?? []), el]);
      io.observe(parent);
    });
    cleanups.push(() => { io.disconnect(); els.forEach((el) => el.classList.remove("wipe", "seen")); });
  }

  if (fx.splittext) {
    const scramble = (el: HTMLElement) => {
      const text = el.dataset.t ?? el.textContent ?? "";
      el.dataset.t = text;
      if (!/^[\u0000-ɏ\s]*$/.test(text)) return;
      if (el.dataset.busy) return;
      el.dataset.busy = "1";
      const t0 = performance.now(), dur = 650;
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / dur), done = Math.floor(p * text.length);
        el.textContent = Array.from(text, (c, i) => (i < done || c === " " ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join("");
        if (p < 1) requestAnimationFrame(step);
        else { el.textContent = text; delete el.dataset.busy; }
      };
      requestAnimationFrame(step);
    };
    const tags = qsa(".eb-t");
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      scramble(e.target as HTMLElement);
    }), { threshold: 1 });
    tags.forEach((t) => io.observe(t));
    const again = (e: PointerEvent) => { const t = (e.currentTarget as HTMLElement).querySelector<HTMLElement>(".eb-t"); if (t) scramble(t); };
    const hosts = tags.map((t) => t.closest<HTMLElement>(".eyebrow")).filter(Boolean) as HTMLElement[];
    hosts.forEach((h) => h.addEventListener("pointerenter", again));
    cleanups.push(() => { io.disconnect(); hosts.forEach((h) => h.removeEventListener("pointerenter", again)); });
  }

  // ---------- the giant footer name always fills the width exactly, whatever the name or theme font ----------
  if (fx.footername) {
    const box = document.querySelector<HTMLElement>(".foot-giant");
    const text = box?.querySelector<HTMLElement>(".split");
    if (box && text) {
      text.style.display = "inline-block";
      const fit = () => {
        box.style.fontSize = "";
        const size = parseFloat(getComputedStyle(box).fontSize), w = text.getBoundingClientRect().width;
        if (w > 0) box.style.fontSize = `${Math.min(300, (box.clientWidth * 0.985 * size) / w).toFixed(1)}px`;
      };
      const later = () => { fit(); window.setTimeout(fit, 500); }; // a new theme's font may still be loading
      fit();
      document.fonts?.ready.then(fit);
      window.addEventListener("resize", fit);
      window.addEventListener("skinchange", later);
      cleanups.push(() => { window.removeEventListener("resize", fit); window.removeEventListener("skinchange", later); });
    }
  }

  // ---------- nav: the small header while scrolled works on every device ----------
  if (fx.navpill) {
    const nav = document.querySelector<HTMLElement>(".site .nav");
    if (nav) {
      const sync = () => nav.classList.toggle("scrolled", pageY() > 60);
      sync();
      window.addEventListener("scroll", sync, { passive: true });
      cleanups.push(() => window.removeEventListener("scroll", sync));
    }
  }

  // reaction bars: a soft wave now and then, a few at a time, only on bars on screen and only while scrolling is at rest:
  // starting animations while the page scrolls cost about 10% of the frames, and nobody can watch a bar rushing past
  if (fx.reactfx) {
    const bars = qsa(".reacts");
    if (bars.length) {
      const seen = new Set<HTMLElement>();
      const lastWave = new Map<HTMLElement, number>();
      const wave = (b: HTMLElement) => {
        lastWave.set(b, performance.now());
        b.classList.add("wave");
        setTimeout(() => b.classList.remove("wave"), 1500);
      };
      const due = (b: HTMLElement) => performance.now() - (lastWave.get(b) ?? -1e9) > 5000;
      const io = new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) seen.add(e.target as HTMLElement); else seen.delete(e.target as HTMLElement);
      }));
      bars.forEach((b) => io.observe(b));
      let scrolledAt = 0;
      const onScroll = () => { scrolledAt = performance.now(); };
      window.addEventListener("scroll", onScroll, { passive: true });
      const timer = window.setInterval(() => {
        if (document.hidden || document.documentElement.classList.contains("lite") || performance.now() - scrolledAt < 500) return;
        [...seen].filter(due).sort((a, b) => (lastWave.get(a) ?? 0) - (lastWave.get(b) ?? 0)).slice(0, 3).forEach(wave);
      }, 1200);
      cleanups.push(() => {
        clearInterval(timer);
        io.disconnect();
        window.removeEventListener("scroll", onScroll);
        bars.forEach((b) => b.classList.remove("wave"));
      });
    }
  }

  // phones have no hover, so a flip card's back could never be read: the first tap flips it, the second opens it
  if (!fine) {
    const flipTap = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.(".flip") as HTMLElement | null;
      if (!a) return;
      if (!a.classList.contains("flipped")) {
        e.preventDefault();
        document.querySelector(".flip.flipped")?.classList.remove("flipped");
        a.classList.add("flipped");
      }
    };
    document.addEventListener("click", flipTap);
    cleanups.push(() => document.removeEventListener("click", flipTap));
  }

  if (!fine) return () => cleanups.forEach((c) => c());

  // ---------- one frame for every mouse effect ----------
  // Each effect first reads where things are, then all of them write, so the browser works out the page
  // once per frame instead of once per card (reading after a write makes it redo its styles on the spot).
  type Job = { read?: () => void; write: () => void };
  const jobs = new Set<Job>();
  let jobRaf = 0;
  const runJobs = () => {
    jobRaf = 0;
    const list = [...jobs];
    jobs.clear();
    for (const j of list) j.read?.();
    for (const j of list) j.write();
  };
  const schedule = (j: Job) => { jobs.add(j); if (!jobRaf) jobRaf = requestAnimationFrame(runJobs); };
  cleanups.push(() => { cancelAnimationFrame(jobRaf); jobs.clear(); });
  let px = -999, py = -999;
  on("pointermove", (e) => { px = e.clientX; py = e.clientY; }, { passive: true }); // first, so every effect below sees this move

  // ---------- 3D tilt with spring, and the glare inside the card ----------
  if (fx.cardtilt) {
    type T = { el: HTMLElement; rx: number; ry: number; lift: number; trx: number; try_: number; tlift: number; gx: number; gy: number };
    const live = new Map<HTMLElement, T>();
    let cur: T | null = null, moved = false, last = 0;
    const job: Job = {
      read: () => {
        if (!moved || !cur) return;
        const r = cur.el.getBoundingClientRect();
        const ux = (px - r.left) / r.width, uy = (py - r.top) / r.height;
        cur.try_ = (ux - 0.5) * 18; cur.trx = -(uy - 0.5) * 18; cur.tlift = 6;
        cur.gx = ux * 100; cur.gy = uy * 100;
      },
      write: () => {
        if (moved && cur) {
          cur.el.style.setProperty("--gx", `${cur.gx.toFixed(1)}%`);
          cur.el.style.setProperty("--gy", `${cur.gy.toFixed(1)}%`);
        }
        moved = false;
        // the spring runs on real time, so it feels the same at any frame rate
        const now = performance.now();
        const dt = last ? Math.min(64, now - last) : 16.7;
        last = now;
        const k = 1 - Math.pow(0.86, dt / 16.7);
        for (const [el, t] of live) {
          t.rx += (t.trx - t.rx) * k; t.ry += (t.try_ - t.ry) * k; t.lift += (t.tlift - t.lift) * k;
          if (t !== cur && Math.abs(t.rx) < 0.06 && Math.abs(t.ry) < 0.06 && Math.abs(t.lift) < 0.12) {
            el.style.transform = ""; el.classList.remove("tilting"); live.delete(el); continue;
          }
          el.style.transform = `perspective(900px) rotateX(${t.rx.toFixed(2)}deg) rotateY(${t.ry.toFixed(2)}deg) translateY(${(-t.lift).toFixed(2)}px)`;
        }
        if (live.size) schedule(job); else last = 0;
      },
    };
    on("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      // on the reaction bar the card settles flat: tilting would slide the small buttons out from under the mouse
      const el = (e.target as Element).closest?.(".card-foot, .reacts, .win-url a, .tv-panel") ? null : (e.target as Element).closest?.(TILT) as HTMLElement | null;
      if (cur && cur.el !== el) { cur.trx = cur.try_ = cur.tlift = 0; cur = null; }
      if (el) {
        let t = live.get(el);
        if (!t) { t = { el, rx: 0, ry: 0, lift: 0, trx: 0, try_: 0, tlift: 0, gx: 50, gy: 50 }; live.set(el, t); el.classList.add("tilting"); }
        cur = t;
        moved = true;
      }
      schedule(job);
    }, { passive: true });
    on("pointerleave", () => { if (cur) { cur.trx = cur.try_ = cur.tlift = 0; cur = null; schedule(job); } });
    cleanups.push(() => {
      live.forEach((t) => { t.el.style.transform = ""; t.el.classList.remove("tilting"); });
    });
  }

  // ---------- the lit-up border on the card under the mouse and its neighbours ----------
  if (fx.spotlight) {
    let group: Element | null = null, items: HTMLElement[] = [], rects: DOMRect[] = [];
    const lit = new Set<HTMLElement>();
    const unlight = (c: HTMLElement) => { c.style.removeProperty("--lit-x"); c.style.removeProperty("--lit-y"); lit.delete(c); };
    const job: Job = {
      read: () => { rects = group ? items.map((c) => c.getBoundingClientRect()) : []; },
      write: () => {
        items.forEach((c, i) => {
          const r = rects[i];
          if (!r) return;
          // only boxes the light can reach change; the rest are put out of reach once
          if (px > r.left - 250 && px < r.right + 250 && py > r.top - 250 && py < r.bottom + 250) {
            c.style.setProperty("--lit-x", `${Math.round(px - r.left)}px`);
            c.style.setProperty("--lit-y", `${Math.round(py - r.top)}px`);
            lit.add(c);
          } else if (lit.has(c)) unlight(c);
        });
      },
    };
    on("pointermove", (e) => {
      const g = (e.target as Element).closest?.(SPOT_GROUPS) ?? null;
      if (g !== group) {
        group?.classList.remove("spot-on");
        lit.forEach(unlight);
        g?.classList.add("spot-on");
        group = g;
        items = g ? qsa(SPOT_ITEMS, g) : [];
      }
      if (g) schedule(job);
    }, { passive: true });
    cleanups.push(() => { group?.classList.remove("spot-on"); lit.forEach(unlight); });
  }

  // ---------- the section background glows softly under the mouse ----------
  if (fx.ambient) {
    let sec: HTMLElement | null = null, r: DOMRect | null = null;
    const job: Job = {
      read: () => { r = sec ? sec.getBoundingClientRect() : null; },
      write: () => {
        if (!sec || !r) return;
        sec.style.setProperty("--amx", `${Math.round(px - r.left)}px`);
        sec.style.setProperty("--amy", `${Math.round(py - r.top)}px`);
      },
    };
    on("pointermove", (e) => {
      const s = (e.target as Element).closest?.("section.chap") as HTMLElement | null;
      if (s !== sec) { sec?.classList.remove("amb-on"); s?.classList.add("amb-on"); sec = s; }
      if (s) schedule(job);
    }, { passive: true });
    cleanups.push(() => { sec?.classList.remove("amb-on"); });
  }

  // ---------- liquid buttons: the colour pours in from where the mouse came in ----------
  if (fx.liquid) {
    on("pointerover", (e) => {
      const el = (e.target as Element).closest?.(LIQUID) as HTMLElement | null;
      if (!el || (e.relatedTarget instanceof Node && el.contains(e.relatedTarget))) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--lx", `${e.clientX - r.left}px`);
      el.style.setProperty("--ly", `${e.clientY - r.top}px`);
    }, { passive: true });
    on("pointerout", (e) => {
      const el = (e.target as Element).closest?.(LIQUID) as HTMLElement | null;
      if (!el || (e.relatedTarget instanceof Node && el.contains(e.relatedTarget))) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--lx", `${e.clientX - r.left}px`);
      el.style.setProperty("--ly", `${e.clientY - r.top}px`);
    }, { passive: true });
  }

  // ---------- nav highlight that slides between links ----------
  if (fx.navpill) {
    const list = document.querySelector<HTMLElement>(".navlinks");
    const pill = list?.querySelector<HTMLElement>(".nav-pill");
    if (list && pill) {
      const moveTo = (a: HTMLElement | null | undefined) => {
        if (!a) { pill.style.opacity = "0"; return; }
        const r = a.getBoundingClientRect(), p = list.getBoundingClientRect();
        const z = p.width / (list.offsetWidth || p.width) || 1; // the menu's sizes zoom the links (--lk, --fit): place in the list's own pixels
        pill.style.opacity = "1";
        pill.style.width = `${r.width / z}px`;
        pill.style.transform = `translate(${(r.left - p.left) / z}px, ${(r.top - p.top) / z}px)`;
        pill.style.height = `${r.height / z}px`;
      };
      const active = () => list.querySelector<HTMLElement>("a.active");
      let hovering = false;
      const over = (e: PointerEvent) => { const a = (e.target as Element).closest?.("a") as HTMLElement | null; if (a) { hovering = true; moveTo(a); } };
      const out = () => { hovering = false; moveTo(active()); };
      const spy = () => { if (!hovering) moveTo(active()); };
      list.addEventListener("pointerover", over);
      list.addEventListener("pointerleave", out);
      window.addEventListener("lc-spy", spy);
      window.addEventListener("resize", spy);
      spy();
      cleanups.push(() => {
        list.removeEventListener("pointerover", over);
        list.removeEventListener("pointerleave", out);
        window.removeEventListener("lc-spy", spy);
        window.removeEventListener("resize", spy);
      });
    }
  }

  // ---------- headline letters bulge and lean away from the mouse ----------
  if (fx.kinetic) {
    const hero = document.getElementById("hero");
    const h1 = hero?.querySelector<HTMLElement>("h1");
    const chars = h1 ? qsa(".kc", h1) : [];
    if (hero && h1 && chars.length) {
      type C = { el: HTMLElement; x: number; y: number; f: number };
      let list: C[] = [], mx = -9999, my = -9999, active = false, raf = 0, ox = 0, oy = 0;
      const measure = () => {
        const base = h1.getBoundingClientRect();
        ox = base.left; oy = base.top;
        list = chars.map((el) => {
          const prev = el.style.transform;
          el.style.transform = "";
          const r = el.getBoundingClientRect();
          el.style.transform = prev;
          return { el, x: r.left + r.width / 2 - ox, y: r.top + r.height / 2 - oy, f: 0 };
        });
      };
      const R = 170;
      const loop = () => {
        let moving = false;
        const base = h1.getBoundingClientRect();
        for (const c of list) {
          const dx = base.left + c.x - mx, dy = base.top + c.y - my, d = Math.hypot(dx, dy);
          const target = active && d < R ? 1 - d / R : 0;
          c.f += (target - c.f) * 0.16;
          if (c.f < 0.002 && target === 0) {
            if (c.el.style.transform) { c.el.style.transform = ""; c.el.classList.remove("hot"); }
            continue;
          }
          moving = true;
          const f = c.f * c.f * (3 - 2 * c.f);
          c.el.style.transform = `translate3d(${((dx / (d || 1)) * f * 7).toFixed(2)}px, ${(-f * 20).toFixed(2)}px, 0) rotate(${((dx / R) * f * 9).toFixed(2)}deg) scale(${(1 + f * 0.2).toFixed(3)})`;
          c.el.classList.toggle("hot", f > 0.45);
        }
        raf = moving || active ? requestAnimationFrame(loop) : 0;
      };
      const move = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        mx = e.clientX; my = e.clientY;
        if (!active) { measure(); active = true; }
        if (!raf) raf = requestAnimationFrame(loop);
      };
      const leave = () => { active = false; };
      hero.addEventListener("pointermove", move, { passive: true });
      hero.addEventListener("pointerleave", leave);
      window.addEventListener("resize", leave);
      // the letters only work once they're out from behind their slide-up mask
      const t = window.setTimeout(() => h1.classList.add("kin-ready"), 2600);
      cleanups.push(() => {
        clearTimeout(t);
        cancelAnimationFrame(raf);
        hero.removeEventListener("pointermove", move);
        hero.removeEventListener("pointerleave", leave);
        window.removeEventListener("resize", leave);
        chars.forEach((c) => { c.style.transform = ""; c.classList.remove("hot"); });
      });
    }
  }

  // ---------- magnetic buttons lean toward the mouse and spring back ----------
  if (fx.magnetic) {
    const mags = qsa(MAGNETS);
    const visible = new Set<HTMLElement>();
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      const el = e.target as HTMLElement;
      if (e.isIntersecting) visible.add(el);
      else { visible.delete(el); el.style.transform = ""; }
    }));
    mags.forEach((m) => { m.classList.add("mag"); io.observe(m); });
    // every button is measured first, then only the ones whose lean changed are written
    let aims: [HTMLElement, string][] = [];
    const job: Job = {
      read: () => {
        aims = [...visible].map((b) => {
          const r = b.getBoundingClientRect();
          const dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2);
          const reach = Math.max(r.width, r.height) / 2 + 46;
          return [b, Math.hypot(dx, dy) < reach ? `translate(${(dx * 0.26).toFixed(1)}px, ${(dy * 0.32).toFixed(1)}px)` : ""];
        });
      },
      write: () => { for (const [b, t] of aims) if (b.style.transform !== t) b.style.transform = t; },
    };
    on("pointermove", () => { if (visible.size) schedule(job); }, { passive: true });
    cleanups.push(() => { io.disconnect(); mags.forEach((m) => (m.style.transform = "")); });
  }

  // ---------- the cursor ring reacts to what's under it, and says what a click will do ----------
  if (fx.smartcursor) {
    const ring = document.getElementById("cursor-ring");
    const label = document.getElementById("cursor-label");
    if (ring && label) {
      const kinds: [string, string, string][] = [
        ["input, textarea, select", "c-text", ""],
        [".hb-close", "c-link", "Close"],
        [".hb-tab", "c-link", "Pull"],
        [".hb-cta", "c-link", "Go"],
        [".hb-cloth", "c-link", "Drag up"],
        [".float-emo", "c-big", "Drag"],
        [".reacts button", "c-link", "React"],
        [".poll-opt", "c-link", "Vote"],
        [".avatar-tilt", "c-big", "Click me"],
        ["button.ph-tile, .g-tile, .hero-img-btn", "c-big", "View"],
        [".flip", "c-big", "Read"],
        [".can-play .tv-bezel", "c-big", "Play"],
        [".trip:not(.entry-pass)", "c-big", "Explore"],
        [".shelf-row, .tl-row", "c-big", "Read"],
        [".win-url a", "c-link", "Visit"],
        [".dock-i", "c-link", "Jump"],
        [".card", "c-big", "Open"],
        ["a.ph-tile", "c-big", "Open"],
        [".post h3 a, .more-media, .md a", "c-link", "Read"],
        [".ctas .btn-mint, .btn-paper.p-main", "c-link", "Download"],
        [".ctas .btn-ghost, .btn-paper.p-alt", "c-link", "Say hi"],
        [".hello button", "c-link", "Send"],
        [".see-all", "c-link", "See all"],
        ['a[href^="mailto:"]', "c-link", "Email"],
        [".connectrow a, .btn-ink, .btn-line", "c-link", "Visit"],
        [".navlinks a, .hero-stats a, #rail .stop", "c-link", "Jump"],
        [".brand", "c-link", "Home"],
        [".dice-btn, .dice-btn-text", "c-link", "Surprise"],
        [".shuffle-btn", "c-link", "Shuffle"],
        [".skin-menu button", "c-link", "Pick"],
        [".skin-pick .icon-btn", "c-link", "Themes"],
        [".totop", "c-link", "Top"],
        [".back", "c-link", "Back"],
        [".filters a", "c-link", "Filter"],
        [".marquee", "c-link", "Paused"],
        ['a[target="_blank"]', "c-link", "Visit"],
        ["a", "c-link", "Open"],
        ["button", "c-link", "Click"],
      ];
      let shown = "";
      on("pointerover", (e) => {
        const t = e.target as Element;
        // first match wins, so small buttons inside a card (reactions) come before the card itself
        const hit = kinds.find(([sel]) => t.closest?.(sel));
        const cls = hit?.[1] ?? "", text = hit?.[2] ?? "";
        const sig = cls + text;
        if (sig === shown) return;
        shown = sig;
        ring.className = cls;
        label.textContent = text;
      }, { passive: true });
      cleanups.push(() => { ring.className = ""; label.textContent = ""; });
    }
  }

  return () => cleanups.forEach((c) => c());
}
