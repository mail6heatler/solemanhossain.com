// Scroll-linked motion. Downloaded separately (see Living.tsx).
// Everything here animates things that are fully visible by default, so failure leaves a normal page.
// One loop runs while the page moves, on kept positions: it never asks the browser for a position mid-frame, which is what
// made the old scroll library cost a style pass on every scroll event. It sleeps when nothing is moving.
import { docTop, pageY } from "./fx";

export type ScrollFxFlags = { sectionfx: boolean; heroexit: boolean; ghost: boolean; wordscrub: boolean; velocity: boolean; footername: boolean; imgreveal: boolean };

const qsa = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(s));
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function startScrollFx(fx: ScrollFxFlags) {
  const cleanups: (() => void)[] = [];

  // the one loop: each tick returns true while it still has settling to do
  const ticks: ((ms: number, y: number) => boolean)[] = [];
  let raf = 0, lastT = 0;
  const frame = (t: number) => {
    raf = 0;
    const ms = lastT ? Math.min(t - lastT, 200) : 16.7;
    lastT = t;
    const y = pageY();
    let more = false;
    for (const tick of ticks) if (tick(ms, y)) more = true;
    if (more) wake(); else lastT = 0;
  };
  const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };
  // a phone's address bar sliding away is not a real resize
  let vw = window.innerWidth, vh = window.innerHeight;
  const realResize = () => {
    if (window.innerWidth === vw && Math.abs(window.innerHeight - vh) < 140) return false;
    vw = window.innerWidth; vh = window.innerHeight;
    return true;
  };

  // scroll-scrubbed effects: progress from page position a to b, eased towards it over `lag` seconds
  type Scrub = { range: () => [number, number]; tau: number; apply: (p: number) => void; a: number; b: number; cur: number; shown: number };
  const scrubs: Scrub[] = [];
  const scrub = (range: Scrub["range"], lag: number, apply: Scrub["apply"]) => scrubs.push({ range, tau: (lag * 1000) / 3, apply, a: 0, b: 1, cur: -1, shown: -1 });
  const undo: (() => void)[] = [];

  // the hero's contents sink and fade while the next chapter rises over them
  if (fx.heroexit) {
    const hero = document.getElementById("hero");
    const inner = hero?.querySelector<HTMLElement>(".hero-inner");
    if (hero && inner) {
      let h = 0;
      scrub(() => { h = hero.offsetHeight; return [docTop(hero), docTop(hero) + h - vh * 0.15]; }, 0.35, (p) => {
        inner.style.transform = p ? `translate3d(0, ${(p * h * 0.2).toFixed(1)}px, 0) scale(${(1 - p * 0.06).toFixed(4)})` : "";
        inner.style.opacity = p ? (1 - p).toFixed(3) : "";
        inner.style.visibility = p >= 1 ? "hidden" : "";
      });
      undo.push(() => { inner.style.transform = inner.style.opacity = inner.style.visibility = ""; });
      const cue = hero.querySelector<HTMLElement>(".scrollcue");
      if (cue) {
        scrub(() => [docTop(hero), docTop(hero) + hero.offsetHeight * 0.12], 0, (p) => {
          cue.style.opacity = p ? (1 - p).toFixed(3) : "";
          cue.style.visibility = p >= 1 ? "hidden" : "";
        });
        undo.push(() => { cue.style.opacity = cue.style.visibility = ""; });
      }
    }
  }

  // giant chapter marks drift against the scroll
  if (fx.ghost) {
    qsa(".ghost").forEach((g) => {
      const section = g.closest("section");
      if (!section) return;
      scrub(() => { const t = docTop(section); return [t - vh, t + section.offsetHeight]; }, 0.6, (p) => {
        g.style.transform = `translate(${(12 - 28 * p).toFixed(2)}%, ${(8 - 16 * p).toFixed(2)}%)`;
      });
      undo.push(() => { g.style.transform = ""; });
    });
  }

  // subtitles fill in word by word
  if (fx.wordscrub) {
    qsa(".ssub").forEach((el) => {
      const words = qsa(".sw", el);
      if (!words.length) return;
      const total = 1 + 0.08 * (words.length - 1), shown = words.map(() => -1);
      scrub(() => { const t = docTop(el); return [t - vh * 0.92, t - vh * 0.58]; }, 0.4, (p) => {
        words.forEach((w, i) => {
          const op = Math.round((0.14 + 0.86 * clamp(p * total - i * 0.08, 0, 1)) * 50) / 50;
          if (op !== shown[i]) { shown[i] = op; w.style.opacity = String(op); }
        });
      });
      undo.push(() => words.forEach((w) => { w.style.opacity = ""; }));
    });
  }

  // the name at the very end of the page rises out of the floor, letter by letter
  if (fx.footername) {
    const giant = document.querySelector<HTMLElement>(".foot-giant");
    const chars = giant ? qsa(".ch", giant) : [];
    if (giant && chars.length) {
      const total = 1 + 0.05 * (chars.length - 1), shown = chars.map(() => -1);
      scrub(() => { const t = docTop(giant); return [t - vh, t + giant.offsetHeight - vh * 0.99]; }, 0.7, (p) => {
        chars.forEach((c, i) => {
          const q = clamp(p * total - i * 0.05, 0, 1);
          const y = Math.round(105 * Math.pow(1 - q, 3) * 10) / 10;
          if (y !== shown[i]) { shown[i] = y; c.style.transform = `translateY(${y}%)`; }
        });
      });
      undo.push(() => chars.forEach((c) => { c.style.transform = ""; }));
    }
  }

  // photo grids: columns slide at slightly different speeds (not on phones, where there is less room)
  if (fx.imgreveal && window.matchMedia("(min-width: 761px)").matches) {
    qsa(".photogrid:not(.side-track)").forEach((grid) => {
      const cells = Array.from(grid.children) as HTMLElement[];
      if (cells.length < 4) return;
      const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").length || 1;
      scrub(() => { const t = docTop(grid); return [t - vh, t + grid.offsetHeight]; }, 0.5, (p) => {
        cells.forEach((c, i) => {
          const amount = (i % cols) % 2 ? 26 : -14;
          c.style.transform = `translateY(${(amount * (1 - 2 * p)).toFixed(1)}px)`;
        });
      });
      undo.push(() => cells.forEach((c) => { c.style.transform = ""; }));
    });
  }

  const measureScrubs = () => { for (const s of scrubs) { const [a, b] = s.range(); s.a = a; s.b = Math.max(b, a + 1); } };
  measureScrubs();
  if (scrubs.length) {
    ticks.push((ms, y) => {
      let more = false;
      for (const s of scrubs) {
        const want = clamp((y - s.a) / (s.b - s.a), 0, 1);
        if (s.cur < 0 || !s.tau) s.cur = want;
        else if (s.cur !== want) {
          s.cur += (want - s.cur) * (1 - Math.exp(-ms / s.tau)); // real time, so slow devices don't get slow motion
          if (Math.abs(want - s.cur) < 0.0015) s.cur = want; else more = true;
        }
        if (s.cur !== s.shown) { s.shown = s.cur; s.apply(s.cur); }
      }
      return more;
    });
  }
  cleanups.push(() => undo.forEach((u) => u()));

  // every chapter arrives tipped back and rising, then leaves its own way: shrink, tilt back, slide or swing.
  // Runs by hand rather than through ScrollTrigger so a chapter at rest has no transform at all.
  if (fx.sectionfx) {
    const secs = qsa("section.chap[data-spy]").flatMap((s, i) => {
      const inner = s.querySelector<HTMLElement>(":scope > .chap-inner");
      return inner ? [{ s, inner, kind: i % 4, en: 1, ex: 0, top: 0, h: 0 }] : [];
    });
    const small = window.matchMedia("(max-width: 760px)");
    const ease = (p: number) => p * p * (3 - 2 * p);
    let lastY = -1, busy = true;
    const clear = (o: (typeof secs)[number]) => {
      if (!o.inner.style.transform) return;
      o.inner.style.transform = ""; o.inner.style.opacity = ""; o.inner.style.transformOrigin = ""; o.inner.style.willChange = "";
    };
    const wantEnter = (top: number) => clamp((vh - top) / (vh * 0.62), 0, 1);
    const wantExit = (bottom: number) => clamp((vh * 0.4 - bottom) / (vh * 0.4), 0, 1);
    // kept positions: sections aren't transformed, so these only change when the layout does
    const measureSecs = () => { for (const o of secs) { o.top = o.s.offsetTop; o.h = o.s.offsetHeight; } busy = true; wake(); };
    const secSizes = new ResizeObserver(measureSecs);
    secSizes.observe(document.body);
    measureSecs();
    // only chapters near the screen are measured; one coming back starts where it should be
    const near = new Set<(typeof secs)[number]>();
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      const o = secs.find((x) => x.s === e.target);
      if (!o) return;
      if (e.isIntersecting) { const t = o.top - pageY(); o.en = wantEnter(t); o.ex = wantExit(t + o.h); near.add(o); busy = true; wake(); }
      else { near.delete(o); clear(o); }
    }), { rootMargin: "25% 0px" });
    secs.forEach((o) => io.observe(o.s));
    const tick = (ms: number, scrollNow: number) => {
      if (scrollNow === lastY && !busy) return false; // nothing moved and everything has settled: no work at all
      lastY = scrollNow; busy = false;
      const k = small.matches ? 0.55 : 1, blend = 1 - Math.pow(0.8, Math.min(ms, 200) / 16.7);
      for (const o of near) {
        const t = o.top - scrollNow;
        const wantEn = wantEnter(t), wantEx = wantExit(t + o.h);
        o.en += (wantEn - o.en) * blend; o.ex += (wantEx - o.ex) * blend;
        if (Math.abs(wantEn - o.en) < 0.012) o.en = wantEn; else busy = true;
        if (Math.abs(wantEx - o.ex) < 0.012) o.ex = wantEx; else busy = true;
        const inn = 1 - ease(o.en), out = ease(o.ex);
        if (inn === 0 && out === 0) { clear(o); continue; }
        let x = 0, y = 90 * inn * k, sc = 1 - 0.06 * inn, rx = 12 * inn * k, ry = 0, rz = 0, origin = "50% 0%";
        if (out > 0) {
          if (o.kind === 0) { sc -= 0.17 * out; y -= 44 * out; origin = "50% 100%"; } // shrink, like the hero
          else if (o.kind === 1) { rx -= 26 * out * k; sc -= 0.08 * out; origin = "50% 100%"; } // tips backward
          else if (o.kind === 2) { x -= window.innerWidth * 0.11 * out * k; rz -= 2.6 * out * k; sc -= 0.05 * out; } // slides away
          else { ry += 20 * out * k; x += window.innerWidth * 0.05 * out * k; sc -= 0.07 * out; origin = "100% 60%"; } // swings like a door
        }
        // while moving it's kept as one ready-made picture, so the text isn't redrawn at every size
        o.inner.style.willChange = "transform, opacity";
        o.inner.style.transformOrigin = origin;
        o.inner.style.transform = `perspective(1400px) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotate(${rz.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
        o.inner.style.opacity = (1 - 0.72 * inn - 0.82 * out).toFixed(3);
      }
      return busy;
    };
    ticks.push(tick);
    cleanups.push(() => {
      io.disconnect();
      secSizes.disconnect();
      secs.forEach(clear);
    });
  }

  // scroll speed drives the marquee + ribbons: faster and leaning when scrolling fast, backwards when scrolling up
  // Only bands on screen are touched, and only when the value really changes.
  if (fx.velocity) {
    const bands = qsa(".marquee, .ribbon").flatMap((b) => {
      const track = b.querySelector<HTMLElement>(".marquee-track, .ribbon-track");
      return track ? [{ b, track, anims: track.getAnimations(), seen: false }] : [];
    });
    if (bands.length) {
      let last = pageY(), v = 0, rate = 1, skew = 0;
      const apply = (o: (typeof bands)[number]) => {
        for (const a of o.anims) if (a.playbackRate !== rate) a.playbackRate = rate;
        o.track.style.transform = skew ? `skewX(${skew}deg)` : "";
      };
      const io = new IntersectionObserver((es) => es.forEach((e) => {
        const o = bands.find((x) => x.b === e.target);
        if (!o) return;
        o.seen = e.isIntersecting;
        if (o.seen) apply(o);
      }));
      bands.forEach((o) => io.observe(o.b));
      const tick = (_ms: number, y: number) => {
        const d = y - last;
        last = y;
        if (d === 0 && v === 0) return false;
        v += (d - v) * 0.1;
        if (Math.abs(v) < 0.05) v = 0;
        const k = clamp(v / 42, -1, 1);
        const nextRate = 1 + Math.round(k * 7), nextSkew = Math.round(-k * 14 * 2) / 2;
        if (nextRate !== rate || nextSkew !== skew) {
          rate = nextRate; skew = nextSkew;
          for (const o of bands) if (o.seen) apply(o);
        }
        return v !== 0;
      };
      ticks.push(tick);
      cleanups.push(() => {
        io.disconnect();
        for (const o of bands) { for (const a of o.anims) a.playbackRate = 1; o.track.style.transform = ""; }
      });
    }
  }

  // page height changes after photos load and when sideways rows measure themselves
  const pageSize = new ResizeObserver(() => { measureScrubs(); wake(); });
  pageSize.observe(document.body);
  const onResize = () => { if (realResize()) { measureScrubs(); wake(); } };
  window.addEventListener("resize", onResize);
  window.addEventListener("scroll", wake, { passive: true });
  wake();
  cleanups.push(() => {
    cancelAnimationFrame(raf);
    pageSize.disconnect();
    window.removeEventListener("resize", onResize);
    window.removeEventListener("scroll", wake);
  });

  return () => cleanups.forEach((c) => c());
}
