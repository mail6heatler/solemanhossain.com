// Scroll-linked motion, driven by GSAP ScrollTrigger. Downloaded separately (see Living.tsx).
// Everything here animates things that are fully visible by default, so failure leaves a normal page.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export type ScrollFxFlags = { sectionfx: boolean; heroexit: boolean; ghost: boolean; wordscrub: boolean; velocity: boolean; footername: boolean; imgreveal: boolean };

const qsa = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(s));
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function startScrollFx(fx: ScrollFxFlags) {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  const cleanups: (() => void)[] = [];

  const ctx = gsap.context(() => {
    // the hero's contents sink and fade while the next chapter rises over them
    if (fx.heroexit) {
      const hero = document.getElementById("hero");
      const inner = hero?.querySelector(".hero-inner");
      if (hero && inner) {
        const st = { trigger: hero, start: "top top", end: "bottom 15%", scrub: 0.35 };
        gsap.to(inner, { y: () => hero.offsetHeight * 0.2, scale: 0.94, autoAlpha: 0, ease: "none", scrollTrigger: st });
        const cue = hero.querySelector(".scrollcue");
        if (cue) gsap.to(cue, { autoAlpha: 0, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "12% top", scrub: true } });
      }
    }

    // giant chapter marks drift against the scroll
    if (fx.ghost) {
      qsa(".ghost").forEach((g) => {
        const section = g.closest("section");
        if (!section) return;
        gsap.fromTo(g, { xPercent: 12, yPercent: 8 }, { xPercent: -16, yPercent: -8, ease: "none", scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 0.6 } });
      });
    }

    // subtitles fill in word by word
    if (fx.wordscrub) {
      qsa(".ssub").forEach((p) => {
        const words = qsa(".sw", p);
        if (!words.length) return;
        gsap.fromTo(words, { opacity: 0.14 }, { opacity: 1, stagger: 0.08, ease: "none", scrollTrigger: { trigger: p, start: "top 92%", end: "top 58%", scrub: 0.4 } });
      });
    }

    // the name at the very end of the page rises out of the floor, letter by letter
    if (fx.footername) {
      const giant = document.querySelector(".foot-giant");
      const chars = giant ? qsa(".ch", giant) : [];
      if (giant && chars.length) {
        gsap.fromTo(chars, { yPercent: 105 }, { yPercent: 0, stagger: 0.05, ease: "power2.out", scrollTrigger: { trigger: giant, start: "top 100%", end: "bottom 99%", scrub: 0.7 } });
      }
    }

    // photo grids: columns slide at slightly different speeds (not on phones, where there is less room)
    if (fx.imgreveal && window.matchMedia("(min-width: 761px)").matches) {
      qsa(".photogrid").forEach((grid) => {
        const cells = Array.from(grid.children) as HTMLElement[];
        if (cells.length < 4) return;
        const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").length || 1;
        cells.forEach((c, i) => {
          const amount = (i % cols) % 2 ? 26 : -14;
          gsap.fromTo(c, { y: amount }, { y: -amount, ease: "none", scrollTrigger: { trigger: grid, start: "top bottom", end: "bottom top", scrub: 0.5 } });
        });
      });
    }
  });
  cleanups.push(() => ctx.revert());

  // every chapter arrives tipped back and rising, then leaves its own way: shrink, tilt back, slide or swing.
  // Runs by hand rather than through ScrollTrigger so a chapter at rest has no transform at all.
  if (fx.sectionfx) {
    const secs = qsa("section.chap[data-spy]").flatMap((s, i) => {
      const inner = s.querySelector<HTMLElement>(":scope > .chap-inner");
      return inner ? [{ s, inner, kind: i % 4, en: 1, ex: 0 }] : [];
    });
    const small = window.matchMedia("(max-width: 760px)");
    const ease = (p: number) => p * p * (3 - 2 * p);
    let vh = window.innerHeight, lastY = -1, busy = true;
    const onResize = () => { vh = window.innerHeight; busy = true; };
    window.addEventListener("resize", onResize);
    const clear = (o: (typeof secs)[number]) => {
      if (!o.inner.style.transform) return;
      o.inner.style.transform = ""; o.inner.style.opacity = ""; o.inner.style.transformOrigin = ""; o.inner.style.willChange = "";
    };
    const wantEnter = (r: DOMRect) => clamp((vh - r.top) / (vh * 0.62), 0, 1);
    const wantExit = (r: DOMRect) => clamp((vh * 0.4 - r.bottom) / (vh * 0.4), 0, 1);
    // only chapters near the screen are measured; one coming back starts where it should be
    const near = new Set<(typeof secs)[number]>();
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      const o = secs.find((x) => x.s === e.target);
      if (!o) return;
      if (e.isIntersecting) { const r = o.s.getBoundingClientRect(); o.en = wantEnter(r); o.ex = wantExit(r); near.add(o); busy = true; }
      else { near.delete(o); clear(o); }
    }), { rootMargin: "25% 0px" });
    secs.forEach((o) => io.observe(o.s));
    const tick = (_t: number, ms: number) => {
      const scrollNow = window.scrollY;
      if (scrollNow === lastY && !busy) return; // nothing moved and everything has settled: no work at all
      lastY = scrollNow; busy = false;
      const k = small.matches ? 0.55 : 1, blend = 1 - Math.pow(0.8, Math.min(ms, 200) / 16.7);
      for (const o of near) {
        const r = o.s.getBoundingClientRect();
        const wantEn = wantEnter(r), wantEx = wantExit(r);
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
    };
    gsap.ticker.add(tick);
    cleanups.push(() => {
      gsap.ticker.remove(tick);
      io.disconnect();
      window.removeEventListener("resize", onResize);
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
      let last = window.scrollY, v = 0, rate = 1, skew = 0;
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
      const tick = () => {
        const y = window.scrollY, d = y - last;
        last = y;
        if (d === 0 && v === 0) return;
        v += (d - v) * 0.1;
        if (Math.abs(v) < 0.05) v = 0;
        const k = clamp(v / 42, -1, 1);
        const nextRate = 1 + Math.round(k * 7), nextSkew = Math.round(-k * 14 * 2) / 2;
        if (nextRate === rate && nextSkew === skew) return;
        rate = nextRate; skew = nextSkew;
        for (const o of bands) if (o.seen) apply(o);
      };
      gsap.ticker.add(tick);
      cleanups.push(() => {
        gsap.ticker.remove(tick);
        io.disconnect();
        for (const o of bands) { for (const a of o.anims) a.playbackRate = 1; o.track.style.transform = ""; }
      });
    }
  }

  // Lenis scrolls on its own clock: keep ScrollTrigger in step with it
  let unhook: (() => void) | undefined, tries = 0;
  const hook = () => {
    const l = (window as unknown as { __lenis?: { on(e: string, f: () => void): () => void } }).__lenis;
    if (l) { unhook = l.on("scroll", ScrollTrigger.update); return; }
    if (tries++ < 20) timer = window.setTimeout(hook, 150);
  };
  let timer = window.setTimeout(hook, 0);
  cleanups.push(() => { clearTimeout(timer); unhook?.(); });

  // page height changes after photos load and when the sideways strip measures itself: re-measure once things settle
  let debounce = 0, height = document.documentElement.scrollHeight;
  const ro = new ResizeObserver(() => {
    const h = document.documentElement.scrollHeight;
    if (Math.abs(h - height) < 2) return;
    height = h;
    clearTimeout(debounce);
    debounce = window.setTimeout(() => ScrollTrigger.refresh(), 180);
  });
  ro.observe(document.body);
  cleanups.push(() => { ro.disconnect(); clearTimeout(debounce); });

  return () => cleanups.forEach((c) => c());
}
