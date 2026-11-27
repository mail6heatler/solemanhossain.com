// The sticker buttons' motion (components/site/StickerBar.tsx), with GSAP. A separate download: it loads once the page has settled, or the
// first time a card's buttons are pointed at. Only transform and opacity move, with soft springs and no random tilts (2026-11-28, the owner
// asked for it smoother: measured 34 to 40 frames a second with the emojis up before, against 85 idle). The buttons' own lift and press are
// CSS (stickerbar.css), which the browser runs by itself. Loops stop when the mouse leaves, so buttons at rest stand still.
// Things that fly (a reaction into its button, a comment into the strip, a paper plane) go in one fixed layer in <body>, outside every card and
// chapter, carrying the card's theme colours with them, and each follows one smooth curve.
import { gsap } from "gsap";

type Tw = gsap.core.Tween | gsap.core.Timeline;
const loops = new WeakMap<Element, Tw>();
const stopLoop = (el: Element) => { loops.get(el)?.kill(); loops.delete(el); };

/** Each emoji's own move, played while the mouse is on it: a heart beats, fire flickers, laughter shakes, a mind blows up and settles, hands clap. */
function move(el: HTMLElement, emoji: string): Tw {
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.35, defaults: { ease: "sine.inOut" } });
  if (emoji === "❤️") tl.to(el, { scale: 1.2, duration: 0.14, ease: "power2.out" }).to(el, { scale: 1, duration: 0.16 }).to(el, { scale: 1.12, duration: 0.12, ease: "power2.out" }).to(el, { scale: 1, duration: 0.3 });
  else if (emoji === "🔥") { gsap.set(el, { transformOrigin: "50% 100%" }); tl.to(el, { scaleY: 1.14, scaleX: 0.94, skewX: -5, duration: 0.14 }).to(el, { scaleY: 0.97, scaleX: 1.03, skewX: 4, duration: 0.14 }).to(el, { scaleY: 1, scaleX: 1, skewX: 0, duration: 0.18 }); }
  else if (emoji === "😂") tl.to(el, { rotation: -12, y: -2, duration: 0.1 }).to(el, { rotation: 10, y: 0, duration: 0.12 }).to(el, { rotation: -6, duration: 0.12 }).to(el, { rotation: 0, duration: 0.2 });
  else if (emoji === "🤯") tl.to(el, { scale: 1.28, rotation: 6, duration: 0.24, ease: "power2.out" }).to(el, { scale: 1, rotation: 0, duration: 0.36, ease: "back.out(1.6)" });
  else if (emoji === "👏") tl.to(el, { scaleX: 0.78, rotation: -6, duration: 0.1 }).to(el, { scaleX: 1, rotation: 0, duration: 0.12 }).to(el, { scaleX: 0.8, rotation: 4, duration: 0.1 }).to(el, { scaleX: 1, rotation: 0, duration: 0.2 });
  else tl.to(el, { y: -4, duration: 0.2, ease: "power2.out" }).to(el, { y: 0, duration: 0.3, ease: "power2.in" });
  return tl;
}

/** The emojis rise out of the React button together, in one soft wave. */
export function openTray(tray: HTMLElement) {
  const btns = Array.from(tray.querySelectorAll<HTMLElement>(".stb-e"));
  gsap.killTweensOf([tray, ...btns]);
  tray.classList.remove("stb-pre");
  gsap.fromTo(tray, { opacity: 0, scale: 0.86, y: 8 }, { opacity: 1, scale: 1, y: 0, duration: 0.32, ease: "power3.out", transformOrigin: "24px 100%", clearProps: "transform" });
  gsap.fromTo(btns, { opacity: 0, y: 12, scale: 0.6 }, { opacity: 1, y: 0, scale: 1, duration: 0.38, ease: "back.out(1.5)", stagger: 0.035, delay: 0.04 });
}
/** They sink back the same way, last one first. */
export function closeTray(tray: HTMLElement): Promise<void> {
  const btns = Array.from(tray.querySelectorAll<HTMLElement>(".stb-e"));
  btns.forEach((b) => { const e = b.querySelector(".stb-em"); if (e) stopLoop(e); });
  return new Promise((done) => {
    gsap.timeline({ onComplete: done })
      .to(btns, { opacity: 0, y: 8, scale: 0.7, duration: 0.16, stagger: { each: 0.02, from: "end" }, ease: "power2.in", overwrite: true })
      .to(tray, { opacity: 0, scale: 0.9, y: 4, duration: 0.18, ease: "power2.in", transformOrigin: "24px 100%" }, "-=0.1");
  });
}
/** The emoji under the mouse lifts a little and does its own move until the mouse leaves it. */
export function emojiEnter(btn: HTMLElement) {
  gsap.to(btn, { y: -6, scale: 1.2, duration: 0.24, ease: "back.out(1.6)", overwrite: "auto" });
  const e = btn.querySelector<HTMLElement>(".stb-em");
  if (e) { stopLoop(e); loops.set(e, move(e, btn.dataset.e ?? "")); }
}
export function emojiLeave(btn: HTMLElement) {
  gsap.to(btn, { y: 0, scale: 1, duration: 0.28, ease: "power2.out", overwrite: "auto" });
  const e = btn.querySelector<HTMLElement>(".stb-em");
  if (e) { stopLoop(e); gsap.to(e, { scale: 1, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, y: 0, duration: 0.2, ease: "power2.out", overwrite: true }); }
}
/** The picked one gives a soft squash. */
export function squash(btn: HTMLElement) {
  const e = btn.querySelector<HTMLElement>(".stb-em") ?? btn;
  gsap.fromTo(e, { scaleX: 1.28, scaleY: 0.8 }, { scaleX: 1, scaleY: 1, duration: 0.45, ease: "back.out(2)", overwrite: true });
}

/**
 * Comment: one continuous 3D flip. The buttons turn over while the comment box turns in from behind them, both at once, and the bar lifts a
 * touch as it turns. Each face hides its back only while turning, so at rest nothing is a layer of its own.
 */
export function flip(front: HTMLElement, back: HTMLElement, open: boolean): Promise<void> {
  const [out, inn] = open ? [front, back] : [back, front];
  const bar = front.parentElement;
  return new Promise((done) => {
    gsap.set([out, inn], { backfaceVisibility: "hidden", opacity: 1, transformOrigin: "50% 50%" });
    gsap.set(inn, { rotationX: open ? 180 : -180 });
    const tl = gsap.timeline({ onComplete: () => { gsap.set(out, { opacity: 0 }); gsap.set([out, inn], { clearProps: "transform,backfaceVisibility" }); done(); } })
      .to(out, { rotationX: open ? -180 : 180, duration: 0.56, ease: "power3.inOut" }, 0)
      .to(inn, { rotationX: 0, duration: 0.56, ease: "power3.inOut" }, 0);
    if (bar) tl.to(bar, { y: -4, duration: 0.28, ease: "sine.out", yoyo: true, repeat: 1, clearProps: "transform" }, 0);
  });
}

/** A button under the mouse: its sticker lifts by CSS; its icon does its own small thing here. */
export function tabEnter(tab: HTMLElement, kind: string) {
  const ic = tab.querySelector<HTMLElement>(".stb-ic > :first-child");
  if (!ic) return;
  if (kind === "react") gsap.fromTo(ic, { rotation: 0 }, { keyframes: { rotation: [0, -12, 9, -5, 0] }, duration: 0.5, ease: "sine.inOut", overwrite: true });
  else if (kind === "talk") {
    gsap.fromTo(ic, { rotation: -10, scale: 0.92 }, { rotation: 0, scale: 1, duration: 0.42, ease: "back.out(2)", overwrite: true });
    const dots = tab.querySelectorAll<HTMLElement>(".stb-dots i");
    if (dots.length) { tab.classList.add("stb-typing"); stopLoop(tab); loops.set(tab, gsap.to(dots, { y: -2.5, duration: 0.32, ease: "sine.inOut", stagger: { each: 0.12, repeat: -1, yoyo: true } })); }
  } else if (kind === "share") gsap.timeline().to(ic, { x: 7, y: -7, opacity: 0, duration: 0.16, ease: "power2.in" }).set(ic, { x: -7, y: 7 }).to(ic, { x: 0, y: 0, opacity: 1, duration: 0.3, ease: "power3.out" });
  else if (kind === "open") gsap.to(ic, { scale: 1.18, duration: 0.26, ease: "power2.out", overwrite: true });
}
export function tabLeave(tab: HTMLElement, kind: string) {
  if (kind === "talk") { stopLoop(tab); tab.classList.remove("stb-typing"); const d = tab.querySelectorAll(".stb-dots i"); if (d.length) gsap.set(d, { clearProps: "transform" }); }
  if (kind === "open") { const ic = tab.querySelector(".stb-ic > :first-child"); if (ic) gsap.to(ic, { scale: 1, duration: 0.26, ease: "power2.out", overwrite: true }); }
}
/** A number that changed rolls in. */
export function rollIn(el: HTMLElement, up: boolean) { gsap.fromTo(el, { yPercent: up ? 80 : -80, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, ease: "back.out(1.6)", clearProps: "transform" }); }
/** Something new arrived in the strip: a soft bounce. */
export function bump(el: HTMLElement) { gsap.fromTo(el, { scaleY: 1.12 }, { scaleY: 1, duration: 0.4, ease: "back.out(2)", clearProps: "transform" }); }
/** The button that was just used gives a little hop. */
export function hop(el: HTMLElement) { gsap.fromTo(el, { y: 0 }, { y: -6, duration: 0.2, yoyo: true, repeat: 1, ease: "sine.inOut", clearProps: "transform" }); }
/** The React button stamps softly when its emoji lands. */
export function stamp(el: HTMLElement) { gsap.fromTo(el, { scaleX: 1.08, scaleY: 0.9 }, { scaleX: 1, scaleY: 1, duration: 0.42, ease: "back.out(2)", clearProps: "transform" }); }

// ---------- the fixed layer for things that fly ----------
const COLOURS = ["--mint", "--mint-deep", "--on-mint", "--fg", "--card", "--body"];
function layer() {
  let l = document.querySelector<HTMLElement>("body > .stb-fx");
  if (!l) { l = document.createElement("div"); l.className = "stb-fx"; l.setAttribute("aria-hidden", "true"); document.body.append(l); }
  return l;
}
/** A flying thing, carrying the colours of the card it came from (the theme's colours live on `.site`, which <body> is outside of). */
function flier(cls: string, from: Element) {
  const l = layer();
  if (l.childElementCount > 40) return null;
  const el = document.createElement("span");
  el.className = cls;
  const cs = getComputedStyle(from);
  COLOURS.forEach((k) => { const v = cs.getPropertyValue(k); if (v) el.style.setProperty(k, v); });
  l.append(el);
  return el;
}
const mid = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
type Pt = { x: number; y: number };
/** The bend of a hop from a to b: `lift` pixels above the higher end, halfway across. */
const over = (a: Pt, b: Pt, lift: number): Pt => ({ x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - lift });
/** Moves `el` along one quadratic curve from a to b, bending towards c. The caller's own onUpdate still runs, after the move. */
function curve(el: HTMLElement, a: Pt, b: Pt, c: Pt, vars: gsap.TweenVars) {
  const { onUpdate, ...rest } = vars, p = { t: 0 };
  return gsap.to(p, {
    t: 1, ...rest,
    onUpdate: () => {
      const t = p.t, u = 1 - t;
      gsap.set(el, { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y });
      if (typeof onUpdate === "function") (onUpdate as () => void)();
    },
  });
}

export function ring(el: Element) {
  const r = flier("stb-ring", el); if (!r) return;
  const p = mid(el);
  gsap.fromTo(r, { x: p.x, y: p.y, xPercent: -50, yPercent: -50, scale: 0.5, opacity: 0.9 }, { scale: 2.2, opacity: 0, duration: 0.6, ease: "power2.out", onComplete: () => r.remove() });
}
/** A little sticker that pops up over a button, says something, and floats away. `still` shows it without the motion. */
export function label(el: Element, text: string, still = false, up = 24) {
  const l = flier("stb-lab", el); if (!l) return;
  l.textContent = text;
  const p = mid(el);
  gsap.set(l, { x: p.x, y: p.y - p.h / 2 - 6, xPercent: -50, yPercent: -100 });
  if (still) { setTimeout(() => l.remove(), 1500); return; }
  gsap.timeline({ onComplete: () => l.remove() })
    .fromTo(l, { scale: 0.6, opacity: 0, rotation: -6 }, { scale: 1, opacity: 1, rotation: -3, duration: 0.32, ease: "back.out(1.8)" })
    .to(l, { y: `-=${up}`, opacity: 0, duration: 0.5, ease: "power1.in" }, "+=0.9");
}
/** A reaction: the emoji glides on one curve from where it was picked into the React button, which stamps, rings and shows +1. */
export function flyReaction(from: Element, emoji: string, tab: Element) {
  const f = flier("stb-flyemo", from); if (!f) return;
  f.textContent = emoji;
  const a = mid(from), b = mid(tab);
  gsap.set(f, { x: a.x, y: a.y, xPercent: -50, yPercent: -50, scale: 1.2 });
  gsap.to(f, { scale: 0.8, rotation: 14, duration: 0.55, ease: "power2.inOut" });
  curve(f, a, b, over(a, b, 40), { duration: 0.55, ease: "power2.inOut", onComplete: () => { f.remove(); if (!tab.isConnected) return; ring(tab); label(tab, "+1"); stamp(tab as HTMLElement); } });
}
/** A comment: what was written becomes a speech-bubble sticker that rises, then glides down into the strip; `done` runs when it lands. */
export function flyComment(text: string, from: Element, strip: Element | null, done: () => void) {
  const bub = flier("stb-bub", from);
  if (!bub) { done(); return; }
  const ch = Array.from(text);
  bub.textContent = "💬 " + (ch.length > 32 ? ch.slice(0, 31).join("") + "…" : text);
  const a = mid(from), top = { x: a.x, y: a.y - 64 };
  gsap.set(bub, { x: a.x, y: a.y, xPercent: -50, yPercent: -50 });
  const tl = gsap.timeline({ onComplete: () => { bub.remove(); done(); } })
    .fromTo(bub, { scale: 0.6, opacity: 0, rotation: -2 }, { scale: 1, opacity: 1, y: top.y, rotation: -3, duration: 0.42, ease: "back.out(1.6)" })
    .to(bub, { rotation: 0, duration: 0.3, ease: "sine.inOut" });
  if (strip && strip.isConnected) {
    const t = mid(strip);
    tl.add(() => { curve(bub, top, t, over(top, t, 24), { duration: 0.5, ease: "power2.in" }); gsap.to(bub, { scale: 0.35, opacity: 0.2, duration: 0.5, ease: "power2.in" }); })
      .to({}, { duration: 0.5 })
      .add(() => bump(strip as HTMLElement), "-=.08");
  } else tl.to(bub, { y: top.y - 80, opacity: 0, duration: 0.4, ease: "power2.in" });
}
const PLANE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 11.2 21.5 2.5l-6.3 18.6-3.8-7.6-8.9-2.3Z" style="fill:var(--mint);stroke:var(--fg);stroke-width:1.7;stroke-linejoin:round"/><path d="M11.4 13.5 21.5 2.5" style="fill:none;stroke:var(--fg);stroke-width:1.7;stroke-linecap:round"/></svg>';
/** A share: a paper plane in the theme's colour takes off from the button on one rising curve, leaving a dotted trail. */
export function flyPlane(tab: Element) {
  const pl = flier("stb-plane", tab); if (!pl) return;
  pl.innerHTML = PLANE;
  const a = mid(tab), b = { x: a.x + 260, y: a.y - 300 };
  gsap.set(pl, { x: a.x, y: a.y, xPercent: -50, yPercent: -50, scale: 0.5, rotation: 8 });
  let last = 0, dots = 0;
  gsap.timeline({ onComplete: () => pl.remove() })
    .to(pl, { scale: 1.05, rotation: -14, duration: 0.3, ease: "power2.out" })
    .to(pl, { rotation: -36, scale: 0.85, duration: 1, ease: "sine.inOut" }, 0.25)
    .to(pl, { opacity: 0, duration: 0.3 }, 1.05);
  // it runs along the ground a moment, then climbs
  curve(pl, a, b, { x: a.x + 200, y: a.y - 30 }, {
    duration: 1.3, ease: "power1.in", delay: 0.12,
    onUpdate() {
      const now = performance.now(); if (now - last < 50 || dots >= 22) return;
      last = now; dots++;
      const d = flier("stb-dot", tab); if (!d) return;
      gsap.set(d, { x: gsap.getProperty(pl, "x"), y: gsap.getProperty(pl, "y"), xPercent: -50, yPercent: -50 });
      gsap.to(d, { opacity: 0, scale: 0.4, duration: 0.7, delay: 0.1, ease: "power1.in", onComplete: () => d.remove() });
    },
  });
}
