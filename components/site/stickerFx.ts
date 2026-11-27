// The sticker buttons' motion (components/site/StickerBar.tsx), with GSAP. A separate download: it loads once the page has settled, or the
// first time a card's buttons are pointed at. Only transform and opacity move. Loops stop when the mouse leaves, so buttons at rest stand still.
// Things that fly (a reaction into its button, a comment into the strip, a paper plane) go in one fixed layer in <body>, outside every card and
// chapter, carrying the card's theme colours with them.
import { gsap } from "gsap";

type Tw = gsap.core.Tween | gsap.core.Timeline;
const loops = new WeakMap<Element, Tw>();
const stopLoop = (el: Element) => { loops.get(el)?.kill(); loops.delete(el); };

/** Each emoji's own move: a heart beats, fire flickers, laughter shakes, a mind blows up and settles, hands clap. */
function move(el: HTMLElement, emoji: string, repeat: number): Tw {
  const tl = gsap.timeline({ repeat, repeatDelay: 0.25 });
  if (emoji === "❤️") tl.to(el, { scale: 1.32, duration: 0.11, ease: "power2.out" }).to(el, { scale: 0.96, duration: 0.11 }).to(el, { scale: 1.2, duration: 0.1 }).to(el, { scale: 1, duration: 0.42, ease: "elastic.out(1, .4)" });
  else if (emoji === "🔥") { gsap.set(el, { transformOrigin: "50% 100%" }); tl.to(el, { scaleY: 1.24, scaleX: 0.9, skewX: -7, y: -2, duration: 0.09 }).to(el, { scaleY: 0.94, scaleX: 1.06, skewX: 6, y: 0, duration: 0.09 }).to(el, { scaleY: 1.16, scaleX: 0.94, skewX: -4, duration: 0.09 }).to(el, { scaleY: 1, scaleX: 1, skewX: 0, duration: 0.16 }); }
  else if (emoji === "😂") tl.to(el, { rotation: -16, y: -3, duration: 0.07 }).to(el, { rotation: 15, y: 0, duration: 0.07 }).to(el, { rotation: -12, y: -2, duration: 0.07 }).to(el, { rotation: 10, y: 0, duration: 0.07 }).to(el, { rotation: 0, duration: 0.3, ease: "elastic.out(1, .45)" });
  else if (emoji === "🤯") tl.to(el, { scale: 1.45, rotation: 8, duration: 0.2, ease: "power2.out" }).to(el, { scale: 0.88, rotation: -4, duration: 0.12 }).to(el, { scale: 1, rotation: 0, duration: 0.5, ease: "elastic.out(1, .35)" });
  else if (emoji === "👏") tl.to(el, { scaleX: 0.68, rotation: -8, duration: 0.08 }).to(el, { scaleX: 1.06, rotation: 0, duration: 0.09 }).to(el, { scaleX: 0.7, rotation: 6, duration: 0.08 }).to(el, { scaleX: 1, rotation: 0, duration: 0.28, ease: "back.out(3)" });
  else tl.to(el, { y: -6, duration: 0.14, ease: "power2.out" }).to(el, { y: 0, duration: 0.4, ease: "bounce.out" });
  return tl;
}

/** The emojis jump out of the React button as stickers, each landing at its own small angle with its own move. */
export function openTray(tray: HTMLElement) {
  const btns = Array.from(tray.querySelectorAll<HTMLElement>(".stb-e"));
  gsap.killTweensOf([tray, ...btns]);
  tray.classList.remove("stb-pre");
  gsap.fromTo(tray, { opacity: 0, scale: 0.55, y: 10 }, { opacity: 1, scale: 1, y: 0, duration: 0.34, ease: "back.out(2)", transformOrigin: "24px 100%", clearProps: "transform" });
  btns.forEach((b, i) => {
    gsap.fromTo(b, { opacity: 0, y: 34, scale: 0.3, rotation: gsap.utils.random(-40, 40) },
      { opacity: 1, y: 0, scale: 1, rotation: gsap.utils.random(-8, 8), duration: 0.6, delay: 0.05 + i * 0.05, ease: "elastic.out(1, .5)",
        onComplete: () => { const e = b.querySelector<HTMLElement>(".stb-em"); if (e) move(e, b.dataset.e ?? "", 0); } });
  });
}
export function closeTray(tray: HTMLElement): Promise<void> {
  const btns = Array.from(tray.querySelectorAll<HTMLElement>(".stb-e"));
  btns.forEach((b) => { const e = b.querySelector(".stb-em"); if (e) { stopLoop(e); gsap.killTweensOf(e); } });
  return new Promise((done) => {
    gsap.timeline({ onComplete: done })
      .to(btns.slice().reverse(), { opacity: 0, y: 16, scale: 0.4, duration: 0.16, stagger: 0.025, ease: "power2.in", overwrite: true })
      .to(tray, { opacity: 0, scale: 0.8, y: 6, duration: 0.14, ease: "power2.in", transformOrigin: "24px 100%" }, "-=0.08");
  });
}
export function emojiEnter(btn: HTMLElement) {
  gsap.to(btn, { y: -8, scale: 1.3, duration: 0.26, ease: "back.out(3)", overwrite: "auto" });
  const e = btn.querySelector<HTMLElement>(".stb-em");
  if (e) { stopLoop(e); loops.set(e, move(e, btn.dataset.e ?? "", -1)); }
}
export function emojiLeave(btn: HTMLElement) {
  gsap.to(btn, { y: 0, scale: 1, duration: 0.35, ease: "elastic.out(1, .5)", overwrite: "auto" });
  const e = btn.querySelector<HTMLElement>(".stb-em");
  if (e) { stopLoop(e); gsap.to(e, { scale: 1, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, y: 0, duration: 0.2, overwrite: true }); }
}
/** The picked one squashes. */
export function squash(btn: HTMLElement) {
  const e = btn.querySelector<HTMLElement>(".stb-em") ?? btn;
  gsap.fromTo(e, { scaleX: 1.5, scaleY: 0.62 }, { scaleX: 1, scaleY: 1, duration: 0.7, ease: "elastic.out(1, .35)", overwrite: true });
}

/** Comment: the four buttons flip over, and their back is the comment box; and back again. */
export function flip(front: HTMLElement, back: HTMLElement, open: boolean): Promise<void> {
  const [a, b] = open ? [front, back] : [back, front];
  return new Promise((done) => {
    gsap.timeline({ onComplete: () => { gsap.set([front, back], { clearProps: "transform" }); done(); } })
      .to(a, { rotationX: 90, duration: 0.2, ease: "power2.in", transformOrigin: "50% 50%" })
      .set(a, { opacity: 0 }).set(b, { opacity: 1 })
      .fromTo(b, { rotationX: -90 }, { rotationX: 0, duration: 0.42, ease: "back.out(1.8)", transformOrigin: "50% 50%" });
  });
}

/** A button under the mouse lifts and tilts like a sticker being picked up, and its icon does its own thing. */
export function tabEnter(tab: HTMLElement, kind: string) {
  gsap.to(tab, { y: -3, rotation: gsap.utils.random(-3, 3), duration: 0.25, ease: "back.out(3)", overwrite: "auto" });
  const ic = tab.querySelector<HTMLElement>(".stb-ic > :first-child");
  if (!ic) return;
  if (kind === "react") gsap.fromTo(ic, { rotation: 0 }, { keyframes: { rotation: [0, -16, 12, -7, 0] }, duration: 0.55, ease: "sine.inOut" });
  else if (kind === "talk") {
    gsap.fromTo(ic, { rotation: -14, scale: 0.9 }, { rotation: 0, scale: 1, duration: 0.6, ease: "elastic.out(1, .4)" });
    const dots = tab.querySelectorAll<HTMLElement>(".stb-dots i");
    if (dots.length) { tab.classList.add("stb-typing"); stopLoop(tab); loops.set(tab, gsap.to(dots, { y: -3, duration: 0.28, ease: "sine.inOut", stagger: { each: 0.12, repeat: -1, yoyo: true } })); }
  } else if (kind === "share") gsap.timeline().to(ic, { x: 9, y: -9, opacity: 0, duration: 0.16, ease: "power2.in" }).set(ic, { x: -9, y: 9 }).to(ic, { x: 0, y: 0, opacity: 1, duration: 0.34, ease: "back.out(2.4)" });
  else if (kind === "open") gsap.to(ic, { scale: 1.28, duration: 0.3, ease: "back.out(3)", overwrite: true });
}
export function tabLeave(tab: HTMLElement, kind: string) {
  gsap.to(tab, { y: 0, rotation: 0, duration: 0.3, ease: "power2.out", overwrite: "auto" });
  if (kind === "talk") { stopLoop(tab); tab.classList.remove("stb-typing"); const d = tab.querySelectorAll(".stb-dots i"); if (d.length) gsap.set(d, { clearProps: "transform" }); }
  if (kind === "open") { const ic = tab.querySelector(".stb-ic > :first-child"); if (ic) gsap.to(ic, { scale: 1, duration: 0.3, overwrite: true }); }
}
export function press(tab: HTMLElement) { gsap.to(tab, { scale: 0.9, duration: 0.08, ease: "power2.out", overwrite: "auto" }); }
export function release(tab: HTMLElement) { gsap.to(tab, { scale: 1, duration: 0.5, ease: "elastic.out(1, .4)", overwrite: "auto" }); }
/** A number that changed rolls in. */
export function rollIn(el: HTMLElement, up: boolean) { gsap.fromTo(el, { yPercent: up ? 90 : -90, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: "back.out(2.2)", clearProps: "transform" }); }
/** Something new arrived in the strip: it bounces. */
export function bump(el: HTMLElement) { gsap.fromTo(el, { scaleY: 1.28, scaleX: 1.03 }, { scaleY: 1, scaleX: 1, duration: 0.55, ease: "elastic.out(1, .4)", clearProps: "transform" }); }
/** The button that was just used gives a little hop. */
export function hop(el: HTMLElement) { gsap.fromTo(el, { y: 0 }, { y: -9, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out", clearProps: "transform" }); }
/** The React button stamps when its emoji lands. */
export function stamp(el: HTMLElement) { gsap.fromTo(el, { scaleX: 1.14, scaleY: 0.84 }, { scaleX: 1, scaleY: 1, duration: 0.6, ease: "elastic.out(1, .4)", clearProps: "transform" }); }

// ---------- the fixed layer for things that fly ----------
const COLOURS = ["--mint", "--mint-deep", "--on-mint", "--fg", "--card", "--body"];
function layer() {
  let l = document.querySelector<HTMLElement>("body > .stb-fx");
  if (!l) { l = document.createElement("div"); l.className = "stb-fx"; l.setAttribute("aria-hidden", "true"); document.body.append(l); }
  return l;
}
/** A flying thing, carrying the colours of the card it came from (the theme's colours live on `.site`, which <body> is outside of). */
function flier(cls: string, from: Element) {
  const el = document.createElement("span");
  el.className = cls;
  const cs = getComputedStyle(from);
  COLOURS.forEach((k) => { const v = cs.getPropertyValue(k); if (v) el.style.setProperty(k, v); });
  const l = layer();
  if (l.childElementCount > 40) return null;
  l.append(el);
  return el;
}
const mid = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };

export function ring(el: Element) {
  const r = flier("stb-ring", el); if (!r) return;
  const p = mid(el);
  gsap.fromTo(r, { x: p.x, y: p.y, xPercent: -50, yPercent: -50, scale: 0.4, opacity: 0.95 }, { scale: 2.4, opacity: 0, duration: 0.65, ease: "power2.out", onComplete: () => r.remove() });
}
/** A little sticker that pops up over a button, says something, and floats away. `still` shows it without the motion. */
export function label(el: Element, text: string, still = false, up = 28) {
  const l = flier("stb-lab", el); if (!l) return;
  l.textContent = text;
  const p = mid(el);
  gsap.set(l, { x: p.x, y: p.y - p.h / 2 - 6, xPercent: -50, yPercent: -100 });
  if (still) { setTimeout(() => l.remove(), 1500); return; }
  gsap.timeline({ onComplete: () => l.remove() })
    .fromTo(l, { scale: 0, rotation: -14 }, { scale: 1, rotation: -4, duration: 0.45, ease: "back.out(2.6)" })
    .to(l, { y: `-=${up}`, opacity: 0, duration: 0.45, ease: "power2.in" }, "+=1");
}
/** A reaction: the emoji flies from where it was picked into the React button, which stamps, rings and shows +1. */
export function flyReaction(from: Element, emoji: string, tab: Element) {
  const f = flier("stb-flyemo", from); if (!f) return;
  f.textContent = emoji;
  const a = mid(from), b = mid(tab);
  gsap.set(f, { x: a.x, y: a.y, xPercent: -50, yPercent: -50, scale: 1.3 });
  gsap.timeline({ onComplete: () => { f.remove(); if (!tab.isConnected) return; ring(tab); label(tab, "+1", false, 22); stamp(tab as HTMLElement); } })
    .to(f, { x: b.x, duration: 0.5, ease: "power1.inOut" }, 0)
    .to(f, { y: Math.min(a.y, b.y) - 50, duration: 0.24, ease: "power2.out" }, 0).to(f, { y: b.y, duration: 0.26, ease: "power2.in" }, 0.24)
    .to(f, { scale: 0.75, rotation: 25, duration: 0.5 }, 0);
}
/** A comment: what was written becomes a speech-bubble sticker that pops up, then dives into the strip; `done` runs when it lands. */
export function flyComment(text: string, from: Element, strip: Element | null, done: () => void) {
  const bub = flier("stb-bub", from);
  if (!bub) { done(); return; }
  const ch = Array.from(text);
  bub.textContent = "💬 " + (ch.length > 32 ? ch.slice(0, 31).join("") + "…" : text);
  const a = mid(from);
  gsap.set(bub, { x: a.x, y: a.y, xPercent: -50, yPercent: -50 });
  const tl = gsap.timeline({ onComplete: () => { bub.remove(); done(); } })
    .fromTo(bub, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, y: a.y - 74, rotation: -4, duration: 0.5, ease: "back.out(2)" })
    .to(bub, { rotation: 3, duration: 0.28, ease: "sine.inOut" });
  if (strip && strip.isConnected) {
    const t = mid(strip);
    tl.to(bub, { x: t.x, y: t.y, scale: 0.3, opacity: 0.15, rotation: 0, duration: 0.45, ease: "power2.in" }).add(() => bump(strip as HTMLElement), "-=.06");
  } else tl.to(bub, { y: a.y - 150, opacity: 0, duration: 0.4, ease: "power2.in" });
}
const PLANE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 11.2 21.5 2.5l-6.3 18.6-3.8-7.6-8.9-2.3Z" style="fill:var(--mint);stroke:var(--fg);stroke-width:1.7;stroke-linejoin:round"/><path d="M11.4 13.5 21.5 2.5" style="fill:none;stroke:var(--fg);stroke-width:1.7;stroke-linecap:round"/></svg>';
/** A share: a paper plane in the theme's colour takes off from the button and flies away, leaving a dotted trail. */
export function flyPlane(tab: Element) {
  const pl = flier("stb-plane", tab); if (!pl) return;
  pl.innerHTML = PLANE;
  const a = mid(tab);
  gsap.set(pl, { x: a.x, y: a.y, xPercent: -50, yPercent: -50, scale: 0.4, rotation: 12 });
  let last = 0, dots = 0;
  gsap.timeline({
    onUpdate: () => {
      const now = performance.now(); if (now - last < 45 || dots >= 26) return;
      last = now; dots++;
      const d = flier("stb-dot", tab); if (!d) return;
      gsap.set(d, { x: gsap.getProperty(pl, "x"), y: gsap.getProperty(pl, "y"), xPercent: -50, yPercent: -50 });
      gsap.to(d, { opacity: 0, scale: 0.3, duration: 0.7, delay: 0.15, onComplete: () => d.remove() });
    },
    onComplete: () => pl.remove(),
  })
    .to(pl, { scale: 1.15, rotation: -12, duration: 0.25, ease: "back.out(3)" })
    .to(pl, { x: a.x + 240, duration: 1.15, ease: "power1.in" }, 0.2)
    .to(pl, { y: a.y - 70, duration: 0.45, ease: "sine.out" }, 0.2).to(pl, { y: a.y - 320, duration: 0.7, ease: "power2.in" }, 0.65)
    .to(pl, { rotation: -38, scale: 0.85, duration: 0.8 }, 0.4).to(pl, { opacity: 0, duration: 0.25 }, 1.1);
}
