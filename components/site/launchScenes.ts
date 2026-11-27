// The launch screen's moving parts (lib/launch.ts, LaunchScreen.tsx). Loaded only while a launch screen is showing.
// Each scene's intro is CSS (it runs from the first paint, before this file exists); this follows the real loading and plays
// the opening with GSAP once the site is ready, so the heavy work is over by then and nothing stutters.
// Loading = the page (DOM), fonts, the window's load (pictures), then the heavy parts waking one by one (whenSettled in fx.ts).
import type { gsap as GsapType } from "gsap";
import { launchLines, launchWords, type LaunchNames, type LaunchSettings } from "@/lib/launch";
import { wakeState } from "./fx";

type G = typeof GsapType;
type Anim = ReturnType<G["timeline"]> | ReturnType<G["to"]>;
type Ctl = { progress(p: number): void; exit(): Anim; kill?(): void };
type Ctx = { el: HTMLElement; g: G; cfg: LaunchSettings; names: LaunchNames };

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const $ = <T extends Element = HTMLElement>(el: ParentNode, s: string) => el.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(el: ParentNode, s: string) => [...el.querySelectorAll<T>(s)];
/** a speech bubble that changes its words every few seconds, each change popping in */
function cycle(el: HTMLElement | null, lines: string[], ms: number, g: G) {
  if (!el || lines.length < 2) return 0;
  let i = 0;
  return window.setInterval(() => {
    i = (i + 1) % lines.length;
    g.fromTo(el, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2.2)", onStart: () => { el.textContent = lines[i]; } });
  }, ms);
}

// ================= 1 boarding gate =================
function gate({ el, g }: Ctx): Ctl {
  const plane = $(el, ".lg-plane")!, fill = $(el, ".lg-fill")!, pct = $(el, ".lg-pct")!, stat = $(el, ".lg-status")!, date = $(el, ".lg-date");
  if (date) date.textContent = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase();
  let last = "", lastV = -1;
  return {
    progress(p) {
      const v = Math.round(p * 100);
      if (v === lastV) return; lastV = v;
      plane.style.left = v + "%"; fill.style.width = v + "%";
      const s = p < 0.3 ? "CHECK-IN" : p < 0.6 ? "BOARDING" : p < 0.99 ? "FINAL CALL" : "READY";
      pct.textContent = (p < 0.3 ? "Checking in" : p < 0.6 ? "Boarding" : p < 0.99 ? "Final call" : "Ready to board") + " · " + v + "%";
      if (s !== last) { last = s; stat.textContent = s; g.fromTo(stat, { rotationX: -90 }, { rotationX: 0, duration: 0.3 }); }
    },
    exit() {
      const x = g.timeline();
      x.fromTo($(el, ".lg-stamp"), { opacity: 0, scale: 2.6, rotation: -32 }, { opacity: 1, scale: 1, rotation: -12, duration: 0.24, ease: "power4.in" })
        .to($(el, ".lg-pass"), { y: "+=5", duration: 0.05, yoyo: true, repeat: 1, ease: "power1.out" })
        .to($(el, ".lg-stub"), { rotation: 5, duration: 0.16, ease: "power2.out" }, "+=.3")
        .to($(el, ".lg-stub"), { rotation: 40, yPercent: 520, duration: 0.8, ease: "power2.in" })
        .to([$(el, ".lg-win"), $(el, ".lg-board"), $(el, ".lg-slot")], { yPercent: -25, opacity: 0, duration: 0.45, ease: "power2.in" }, "-=.4")
        .to($(el, ".lg-l"), { xPercent: -101, duration: 1.05, ease: "power3.inOut" }, "-=.1")
        .to($(el, ".lg-r"), { xPercent: 101, duration: 1.05, ease: "power3.inOut" }, "<");
      return x;
    },
  };
}

// ================= 2 rocket launch =================
function rocket({ el, g, cfg, names }: Ctx): Ctl {
  const bub = $(el, ".lr-bub"), say = $(el, ".lr-say"), fuel = $(el, ".lr-fuel i")!, pp = $(el, ".lr-pp")!, pl = $(el, ".lr-pl")!, count = $(el, ".lr-count")!;
  const flame = $<SVGGElement>(el, ".lr-flame")!, rk = $(el, ".lr-rocket")!, rkIn = $(el, ".lr-rocket-in")!, mini = $(el, ".lr-mini-in");
  const iv = cycle(say, launchLines(cfg.rocket.lines, names), 1700, g);
  g.set(flame, { transformOrigin: "50% 0%", scaleY: 0, opacity: 0 });
  let lastV = -1;
  return {
    progress(p) {
      fuel.style.transform = `scaleY(${p.toFixed(3)})`;
      const v = Math.round(p * 100); if (v === lastV) return; lastV = v;
      pp.textContent = v + "%"; pl.textContent = p >= 1 ? "READY" : "FUELLING";
    },
    exit() {
      clearInterval(iv);
      const x = g.timeline(), W = el.clientWidth, H = el.clientHeight;
      const n = cfg.rocket.countFrom, step = n > 5 ? 0.32 : 0.5;
      if (bub) x.to(bub, { scale: 0, opacity: 0, duration: 0.2 });
      x.call(() => { pl.textContent = "LAUNCH"; }).add("go");
      if (mini) {
        const rr = rk.getBoundingClientRect(), mr = mini.getBoundingClientRect();
        const dx = rr.left + rr.width * 0.36 - (mr.left + mr.width / 2);
        x.to(mini, { x: dx, duration: 0.9, ease: "power1.inOut" }, "go")
          .to(mini, { y: -H * 0.02, duration: 0.11, yoyo: true, repeat: 7, ease: "sine.out" }, "go")
          .to(mini, { scale: 0.2, opacity: 0, transformOrigin: "50% 100%", duration: 0.22 }, "go+=.9")
          .to($(el, ".lr-door"), { fill: "#7ee8a2", duration: 0.1, yoyo: true, repeat: 1 }, "go+=1");
      }
      for (let i = 0; i < n; i++) {
        const at = 0.15 + i * step;
        x.call(() => { count.textContent = String(n - i); }, undefined, `go+=${at}`)
          .fromTo(count, { opacity: 0, scale: 1.8 }, { opacity: 1, scale: 1, duration: Math.min(0.3, step * 0.6), ease: "power3.out" }, `go+=${at}`)
          .to(count, { opacity: 0, duration: 0.14 }, `go+=${at + step * 0.7}`);
      }
      const ign = `go+=${Math.max(mini ? 1.2 : 0.3, 0.15 + n * step)}`;
      x.add("ign", ign)
        .to(flame, { scaleY: 1, opacity: 1, duration: 0.25, ease: "power2.out" }, "ign")
        .call(() => flame.classList.add("lit"), undefined, "ign+=.2")
        .to(rkIn, { x: "random(-3, 3)", duration: 0.04, repeat: 14, repeatRefresh: true, ease: "none" }, "ign");
      const puffs = $$(el, ".lr-puff");
      x.fromTo(puffs, { scale: 0, x: 0, y: 0, opacity: 0.95 }, { scale: () => rnd(1.2, 3.4), x: () => rnd(-0.42, 0.42) * W, y: () => -rnd(0, 0.16) * H, duration: () => rnd(1.1, 1.8), ease: "power2.out", stagger: 0.02 }, "ign+=.1")
        .to(rk, { y: -H * 1.45, duration: 1.9, ease: "power2.in" }, "ign+=.6")
        .to($(el, ".lr-fog"), { opacity: 0.92, duration: 0.7, ease: "power1.in" }, "ign+=1.3")
        .to(el, { opacity: 0, duration: 0.8, ease: "power1.out" }, "ign+=2.05");
      return x;
    },
    kill() { clearInterval(iv); },
  };
}

// ================= 3 name from particles =================
function particles({ el, g, cfg }: Ctx): Ctl {
  const cv = $<HTMLCanvasElement>(el, ".lp-cv")!, word = $(el, ".lp-word")!, sub = $(el, ".lp-sub")!, pct = $(el, ".lp-pct")!;
  const ctx = cv.getContext("2d");
  const W = el.clientWidth, H = el.clientHeight, dpr = Math.min(1.5, window.devicePixelRatio || 1);
  type P = { x: number; y: number; vx: number; vy: number; tx: number; ty: number; th: number; c: number; a: number };
  let P: P[] = [], size = 2, prog = 0, boom = false, mx = -1e4, my = -1e4, t = 0, built = false, dead = false, subShown = false;
  const build = () => {
    if (dead || !ctx) return;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.scale(dpr, dpr);
    const off = document.createElement("canvas"); off.width = W; off.height = H;
    const o = off.getContext("2d"); if (!o) return;
    const text = word.textContent || "";
    let fs = Math.min(W * 0.24, H * 0.3);
    const setF = () => { o.font = `700 ${fs}px "Space Grotesk", Arial, sans-serif`; };
    setF(); while (o.measureText(text).width > W * 0.88 && fs > 8) { fs *= 0.95; setF(); }
    o.textAlign = "center"; o.textBaseline = "middle"; o.fillStyle = "#fff"; o.fillText(text, W / 2, H * 0.44);
    const data = o.getImageData(0, 0, W, H).data;
    // the finest grid that stays under ~1800 dots, so the letters read clearly at any screen size
    let step = 2, pts: [number, number][] = [];
    for (;;) { pts = []; for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (data[(y * W + x) * 4 + 3] > 140) pts.push([x, y]); if (pts.length <= 1800 || step > 14) break; step++; }
    P = pts.map(([tx, ty]) => ({ x: rnd(0, W), y: rnd(0, H), vx: rnd(-30, 30), vy: rnd(-30, 30), tx, ty, th: rnd(0.02, 0.96), c: Math.random() < 0.78 ? 0 : 1, a: 1 }));
    size = Math.max(1.4, step * 0.7);
    built = true;
    word.classList.add("gone");
    g.ticker.add(tick);
  };
  const cols = getComputedStyle(el).getPropertyValue("--la").trim() || "#7ee8a2";
  const tick = (_t: number, dms: number) => {
    if (!ctx) return;
    const dt = Math.min(0.05, dms / 1000); t += dt;
    for (const p of P) {
      if (boom) { p.vy += 60 * dt; p.a = Math.max(0, p.a - dt * 1.1); }
      else if (prog >= p.th) { p.vx += ((p.tx - p.x) * 46 - p.vx * 9) * dt; p.vy += ((p.ty - p.y) * 46 - p.vy * 9) * dt; } // a spring pulls it to its place in the name
      else { p.vx += Math.sin(t * 0.8 + p.th * 30) * 40 * dt; p.vy += Math.cos(t * 0.7 + p.th * 22) * 40 * dt; p.vx *= 0.985; p.vy *= 0.985; } // not loaded yet: it drifts
      const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
      if (!boom && d2 < 4900) { const f = (1 - d2 / 4900) * 1600 * dt, d = Math.sqrt(d2) || 1; p.vx += (dx / d) * f; p.vy += (dy / d) * f; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (!boom) { if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; }
    }
    ctx.clearRect(0, 0, W, H);
    [cols, "#9fd8e6"].forEach((col, ci) => {
      ctx.fillStyle = col;
      for (const p of P) if (p.c === ci && p.a > 0) { ctx.globalAlpha = p.a; ctx.fillRect(p.x, p.y, size, size); }
    });
    ctx.globalAlpha = 1;
  };
  const move = (e: PointerEvent) => { mx = e.clientX; my = e.clientY; };
  const leave = () => { mx = my = -1e4; };
  if (cfg.particles.touch) { el.addEventListener("pointermove", move); el.addEventListener("pointerleave", leave); }
  // the name is traced from its font, so wait for it (briefly)
  const fontP = document.fonts ? Promise.race([document.fonts.load('700 40px "Space Grotesk"'), new Promise((r) => setTimeout(r, 900))]) : Promise.resolve();
  fontP.then(build, build);
  let lastV = -1;
  return {
    progress(p) {
      prog = p;
      const v = Math.round(p * 100);
      if (v !== lastV) { lastV = v; pct.textContent = (p < 1 ? "GATHERING · " : "READY · ") + v + "%"; }
      if (p > 0.6 && !subShown) { subShown = true; g.to(sub, { opacity: 1, letterSpacing: "0.32em", duration: 1.2, ease: "power2.out" }); }
    },
    exit() {
      const x = g.timeline();
      x.to($$(el, ".lp-pct, .lp-hint"), { opacity: 0, duration: 0.3 })
        .call(() => {
          if (!built) return;
          boom = true;
          for (const p of P) { const dx = p.x - W / 2, dy = p.y - H * 0.44, d = Math.hypot(dx, dy) || 1, s = rnd(260, 820); p.vx = (dx / d) * s; p.vy = (dy / d) * s - 80; }
        }, undefined, "+=.35")
        .to(sub, { opacity: 0, scale: 1.3, duration: 0.5, ease: "power2.in" }, "<")
        .to($(el, ".lp-bg"), { opacity: 0, duration: 1, ease: "power1.inOut" }, "<.15")
        .to(el, { opacity: 0, duration: 0.4 }, "+=.35");
      return x;
    },
    kill() { dead = true; g.ticker.remove(tick); el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); },
  };
}

// ================= 4 movie opening =================
function movie({ el, g }: Ctx): Ctl {
  const grainCv = $<HTMLCanvasElement>(el, ".lm-grain"), gc = grainCv?.getContext("2d"), img = gc?.createImageData(240, 150);
  let acc = 0;
  const grain = (_t: number, dms: number) => {
    acc += dms; if (acc < 55 || !gc || !img) return; acc = 0;
    const d = img.data; for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    gc.putImageData(img, 0, 0);
  };
  if (gc) g.ticker.add(grain);
  const num = $(el, ".lm-num")!, load = $(el, ".lm-load")!;
  let lastN = 5, lastV = -1;
  return {
    progress(p) {
      const n = Math.max(1, 5 - Math.floor(p * 5));
      if (n !== lastN) { lastN = n; num.textContent = String(n); }
      const v = Math.round(p * 100); if (v !== lastV) { lastV = v; load.textContent = (p < 1 ? "LOADING REEL · " : "REEL READY · ") + v + "%"; }
    },
    exit() {
      const x = g.timeline(), W = el.clientWidth;
      x.to($(el, ".lm-flash"), { opacity: 0.9, duration: 0.06 })
        .set([$(el, ".lm-leader"), load, $(el, ".lm-prod")], { opacity: 0 })
        .to($(el, ".lm-flash"), { opacity: 0, duration: 0.35 })
        .fromTo($(el, ".lm-streak"), { x: -W * 0.7, opacity: 1 }, { x: W * 1.05, duration: 0.55, ease: "power2.inOut" }, "-=.25")
        .fromTo($(el, ".lm-title b"), { opacity: 0, scale: 1.7 }, { opacity: 1, scale: 1, duration: 0.5, ease: "expo.out" }, "-=.35")
        .to($(el, ".lm-title"), { x: "random(-7, 7)", y: "random(-4, 4)", duration: 0.045, repeat: 6, repeatRefresh: true, ease: "none" }, "<.05")
        .set($(el, ".lm-title"), { x: 0, y: 0 })
        .to($$(el, ".lm-title span i"), { opacity: 1, duration: 0.02, stagger: 0.045 }, "+=.1")
        .set(el, { clipPath: "inset(0% 0% 0% 0%)" })
        .to(el, { clipPath: "inset(50% 0% 50% 0%)", duration: 0.9, ease: "power3.inOut" }, "+=.6");
      return x;
    },
    kill() { g.ticker.remove(grain); },
  };
}

// ================= 5 dhaka street race =================
function street({ el, g, cfg, names }: Ctx): Ctl {
  const cng = $(el, ".ls-cng")!, rick = $(el, ".ls-rick")!, pct = $(el, ".ls-pct")!, bub = $(el, ".ls-say");
  const iv = cycle(bub, launchLines(cfg.street.lines, names), 1600, g);
  let lastV = -1;
  return {
    progress(p) {
      const v = Math.round(p * 100); if (v === lastV) return; lastV = v;
      const range = el.clientWidth * 0.64;
      // moved by `translate` with a CSS transition, so the ride stays smooth however often this runs
      cng.style.translate = `${Math.round(p * range)}px 0`; rick.style.translate = `${Math.round(p * range * 0.86)}px 0`;
      pct.textContent = v + "%";
    },
    exit() {
      clearInterval(iv);
      const x = g.timeline(), W = el.clientWidth;
      if (bub) x.call(() => { bub.textContent = launchWords(cfg.street.done, names); }).fromTo(bub, { scale: 0.6 }, { scale: 1, duration: 0.3, ease: "back.out(3)" });
      x.to(cng, { x: W * 1.15, duration: 1.05, ease: "power2.in" }, "+=.15")
        .to(rick, { x: W * 1.08, duration: 1.4, ease: "power2.in" }, "<.12")
        .fromTo($(el, ".ls-flag"), { rotation: -18 }, { rotation: 18, duration: 0.12, yoyo: true, repeat: 7, ease: "sine.inOut" }, "<.2")
        .fromTo($(el, ".ls-peep"), { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(3)" }, "<.1")
        .to($(el, ".ls-peep"), { opacity: 0, y: -20, duration: 0.3 }, "+=.4")
        .to(el, { yPercent: -100, duration: 0.95, ease: "power3.inOut" }, "-=.15");
      return x;
    },
    kill() { clearInterval(iv); },
  };
}

// ================= 6 scrapbook cover =================
function book({ el, g, cfg }: Ctx): Ctl {
  const sts = $$(el, ".lk-st"), cap = $(el, ".lk-cap")!, bk = $(el, ".lk-book")!;
  let shown = 0;
  const slap = () => { const s = sts[shown++]; if (!s) return; s.classList.add("on"); g.fromTo(bk, { y: 0 }, { y: 2, duration: 0.06, yoyo: true, repeat: 1, delay: 0.22 }); };
  return {
    progress(p) {
      const k = Math.min(6, Math.floor(p * 6 + 1e-6));
      if (k <= shown) return;
      while (shown < k) slap();
      cap.textContent = k < 6 ? `${cfg.book.collecting} ${k} of 6` : cfg.book.allIn;
    },
    exit() {
      while (shown < 6) slap();
      cap.textContent = cfg.book.allIn;
      const x = g.timeline({ delay: 0.3 });
      x.to($(el, ".lk-band"), { scaleX: 1.6, duration: 0.12, ease: "power2.out" })
        .to($(el, ".lk-band"), { x: el.clientWidth * 0.35, y: -el.clientHeight * 0.25, rotation: 80, opacity: 0, duration: 0.45, ease: "power2.in" })
        .to($(el, ".lk-cover"), { rotationY: -172, duration: 1.15, ease: "power2.inOut" }, "-=.2")
        .to([$(el, ".lk-page.p1"), $(el, ".lk-page.p2")], { rotationY: -170, duration: 0.62, stagger: 0.17, ease: "power1.inOut" }, "-=.55")
        .to(cap, { opacity: 0, duration: 0.3 }, "<")
        .to(bk, { scale: 3.4, duration: 0.85, ease: "power2.in" }, "+=.35")
        .to(el, { opacity: 0, duration: 0.45 }, "-=.4");
      return x;
    },
  };
}

// ================= calm (motion turned off) =================
function calm({ el, g }: Ctx): Ctl {
  const bar = $(el, ".lq-bar i")!;
  return { progress(p) { bar.style.transform = `scaleX(${p.toFixed(3)})`; }, exit: () => g.to(el, { opacity: 0, duration: 0.5, ease: "none" }) };
}

const SCENES: Record<string, (c: Ctx) => Ctl> = { gate, rocket, particles, movie, street, book, calm };

/**
 * Runs the launch screen that skinScript chose. `fake` (the dashboard's preview, where the page has long finished loading)
 * pretends to load for 3.4 seconds so the owner sees the whole show. Returns a stop.
 */
export function startLaunch(root: HTMLElement, k: string, o: { gsap: G; cfg: LaunchSettings; names: LaunchNames; fake: boolean }) {
  const h = document.documentElement, g = o.gsap, cfg = o.cfg;
  const el = root.querySelector<HTMLElement>(`.lch-${k}`);
  if (!h.classList.contains("launching") || !el || !SCENES[k]) { h.classList.remove("launching"); h.removeAttribute("data-launch"); return () => {}; }
  h.classList.add("launch-run");
  const skipB = $<HTMLButtonElement>(root, ".lch-skip"), enterB = $<HTMLButtonElement>(root, ".lch-enter");
  if (skipB) skipB.hidden = false;
  const gx = g.context(() => {}, root);
  let ctl: Ctl = { progress() {}, exit: () => g.to({}, { duration: 0 }) };
  gx.add(() => { ctl = SCENES[k]({ el, g, cfg, names: o.names }); });

  const t0 = performance.now(), minMs = cfg.minSec * 1000, maxMs = cfg.maxSec * 1000;
  let fontsOk = !document.fonts || document.fonts.status === "loaded", loadOk = document.readyState === "complete";
  document.fonts?.ready.then(() => { fontsOk = true; });
  const onLoad = () => { loadOk = true; };
  addEventListener("load", onLoad, { once: true });
  const target = () => {
    const now = performance.now();
    if (o.fake) return Math.min(1, (now - t0) / 3400);
    const w = wakeState();
    const wake = !loadOk ? 0 : w.n ? Math.min(1, w.d / w.n) : 1;
    if (loadOk && fontsOk && w.idle && now - w.last > 700) return 1; // everything has woken and had a moment to settle
    return Math.min(0.97, 0.12 * (document.readyState !== "loading" ? 1 : 0) + 0.14 * (fontsOk ? 1 : 0) + 0.3 * (loadOk ? 1 : 0) + 0.44 * wake);
  };

  let shown = 0, last = t0, raf = 0, ready = false, leaving = false, dead = false;
  const loop = (now: number) => {
    raf = 0;
    if (dead || leaving) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const t = target();
    shown += (t - shown) * (1 - Math.exp(-dt * 5)); // eased, so the bar glides instead of jumping between steps
    if (t >= 1 && shown > 0.992) shown = 1;
    ctl.progress(shown);
    const age = now - t0;
    if (!ready && ((shown >= 1 && age >= minMs) || age >= maxMs)) { ready = true; whenReady(); return; }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  const whenReady = () => {
    ctl.progress(1);
    if (cfg.ready === "enter" && enterB) {
      enterB.hidden = false;
      gx.add(() => { g.fromTo(enterB, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2.2)", onComplete: () => enterB.classList.add("pulse") }); });
      enterB.focus({ preventScroll: true });
    } else leave(false);
  };
  const leave = (fast: boolean) => {
    if (dead || leaving) return;
    leaving = true;
    cancelAnimationFrame(raf);
    if (skipB) skipB.hidden = true;
    if (enterB) { enterB.hidden = true; enterB.classList.remove("pulse"); }
    el.classList.add("x"); // the CSS intros stop, so GSAP owns what moves from here
    exitTl = fast ? g.to(el, { opacity: 0, duration: 0.35, ease: "none" }) : ctl.exit();
    exitTl.eventCallback("onComplete", finish);
  };
  let exitTl: Anim | null = null;
  const finish = () => {
    if (dead) return;
    dead = true;
    h.classList.remove("launching", "launch-run");
    h.removeAttribute("data-launch");
    off();
    try { ctl.kill?.(); } catch { /* */ }
    gx.revert();
    window.dispatchEvent(new Event("lc-launch-done"));
  };

  // a key skips (or enters, once ready); so does a click anywhere when the owner allows it
  const key = (e: KeyboardEvent) => {
    if (e.key === "Tab" || e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") return;
    if (ready) leave(false); else if (cfg.skip) leave(true);
  };
  const click = (e: MouseEvent) => {
    const t = e.target as Element;
    if (t.closest(".lch-skip")) { leave(true); return; }
    if (t.closest(".lch-enter")) { leave(false); return; }
    if (!cfg.clickSkips) return;
    if (ready) leave(false); else if (cfg.skip) leave(true);
  };
  addEventListener("keydown", key);
  root.addEventListener("click", click);
  const off = () => { removeEventListener("keydown", key); root.removeEventListener("click", click); removeEventListener("load", onLoad); };

  return () => {
    if (dead) return;
    dead = true;
    cancelAnimationFrame(raf);
    off();
    exitTl?.kill();
    try { ctl.kill?.(); } catch { /* */ }
    gx.revert();
  };
}
