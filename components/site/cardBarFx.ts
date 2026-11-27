// The card bar's motion (components/site/CardBar.tsx), with GSAP. A separate download: it loads once the page has settled, or the first time a
// card's bar is pointed at, so the first page load stays light. Only transform and opacity move. Everything here is a short tween or a loop
// that stops when the mouse leaves, so a bar at rest is standing still (the owner's rule), and nothing starts while the page scrolls.
import { gsap } from "gsap";

type Tw = gsap.core.Tween | gsap.core.Timeline;
const loops = new WeakMap<Element, Tw>();
const stopLoop = (el: Element) => { loops.get(el)?.kill(); loops.delete(el); };

/** Each emoji's own move: a heart beats, fire flickers, laughter shakes, a mind blows up and settles, hands clap. */
function move(el: HTMLElement, emoji: string, repeat: number): Tw {
  const tl = gsap.timeline({ repeat, repeatDelay: 0.25, defaults: { overwrite: "auto" } });
  switch (emoji) {
    case "❤️":
      tl.to(el, { scale: 1.32, duration: 0.11, ease: "power2.out" }).to(el, { scale: 0.96, duration: 0.11 })
        .to(el, { scale: 1.2, duration: 0.1, ease: "power2.out" }).to(el, { scale: 1, duration: 0.42, ease: "elastic.out(1, .4)" });
      break;
    case "🔥":
      gsap.set(el, { transformOrigin: "50% 100%" });
      tl.to(el, { scaleY: 1.24, scaleX: 0.9, skewX: -7, y: -2, duration: 0.09, ease: "sine.inOut" })
        .to(el, { scaleY: 0.94, scaleX: 1.06, skewX: 6, y: 0, duration: 0.09, ease: "sine.inOut" })
        .to(el, { scaleY: 1.16, scaleX: 0.94, skewX: -4, y: -1, duration: 0.09, ease: "sine.inOut" })
        .to(el, { scaleY: 1, scaleX: 1, skewX: 0, y: 0, duration: 0.16, ease: "sine.out" });
      break;
    case "😂":
      tl.to(el, { rotation: -16, y: -3, duration: 0.07 }).to(el, { rotation: 15, y: 0, duration: 0.07 })
        .to(el, { rotation: -12, y: -2, duration: 0.07 }).to(el, { rotation: 10, y: 0, duration: 0.07 })
        .to(el, { rotation: 0, duration: 0.3, ease: "elastic.out(1, .45)" });
      break;
    case "🤯":
      tl.to(el, { scale: 1.45, rotation: 8, duration: 0.2, ease: "power2.out" })
        .to(el, { scale: 0.88, rotation: -4, duration: 0.12, ease: "power2.in" })
        .to(el, { scale: 1, rotation: 0, duration: 0.5, ease: "elastic.out(1, .35)" });
      break;
    case "👏":
      tl.to(el, { scaleX: 0.68, rotation: -8, duration: 0.08 }).to(el, { scaleX: 1.06, rotation: 0, duration: 0.09 })
        .to(el, { scaleX: 0.7, rotation: 6, duration: 0.08 }).to(el, { scaleX: 1, rotation: 0, duration: 0.28, ease: "back.out(3)" });
      break;
    default:
      tl.to(el, { y: -6, duration: 0.14, ease: "power2.out" }).to(el, { y: 0, duration: 0.4, ease: "bounce.out" });
  }
  return tl;
}

/** The emojis come up out of the React tab one after another, each landing with its own move. */
export function openTray(tray: HTMLElement) {
  const btns = Array.from(tray.querySelectorAll<HTMLElement>(".ce"));
  gsap.killTweensOf([tray, ...btns]);
  tray.classList.remove("pre");
  gsap.fromTo(tray, { opacity: 0, scale: 0.55, y: 10 }, { opacity: 1, scale: 1, y: 0, duration: 0.34, ease: "back.out(2)", transformOrigin: "22px 100%", clearProps: "transform" });
  btns.forEach((b, i) => {
    gsap.fromTo(b, { opacity: 0, y: 28, scale: 0.2, rotation: i % 2 ? 22 : -22 },
      { opacity: 1, y: 0, scale: 1, rotation: 0, duration: 0.52, delay: 0.05 + i * 0.05, ease: "back.out(2.6)",
        onComplete: () => { const e = b.querySelector<HTMLElement>(".ce-e"); if (e) move(e, b.dataset.e ?? "", 0); } });
  });
}

/** They drop back into the tab, last one first. */
export function closeTray(tray: HTMLElement): Promise<void> {
  const btns = Array.from(tray.querySelectorAll<HTMLElement>(".ce"));
  btns.forEach((b) => { stopLoop(b); const e = b.querySelector(".ce-e"); if (e) { stopLoop(e); gsap.killTweensOf(e); gsap.set(e, { clearProps: "transform" }); } });
  return new Promise((done) => {
    gsap.timeline({ onComplete: () => { gsap.set([tray, ...btns], { clearProps: "transform,opacity" }); done(); } })
      .to(btns.slice().reverse(), { opacity: 0, y: 16, scale: 0.4, duration: 0.16, stagger: 0.025, ease: "power2.in", overwrite: true })
      .to(tray, { opacity: 0, scale: 0.8, y: 6, duration: 0.14, ease: "power2.in", transformOrigin: "22px 100%" }, "-=0.08");
  });
}

/** Pointing at one emoji lifts it, and it keeps doing its move until the mouse leaves it. */
export function emojiEnter(btn: HTMLElement) {
  gsap.to(btn, { y: -8, scale: 1.3, duration: 0.26, ease: "back.out(3)", overwrite: "auto" });
  const e = btn.querySelector<HTMLElement>(".ce-e");
  if (e) { stopLoop(e); loops.set(e, move(e, btn.dataset.e ?? "", -1)); }
}
export function emojiLeave(btn: HTMLElement) {
  gsap.to(btn, { y: 0, scale: 1, duration: 0.35, ease: "elastic.out(1, .5)", overwrite: "auto" });
  const e = btn.querySelector<HTMLElement>(".ce-e");
  if (e) { stopLoop(e); gsap.to(e, { scale: 1, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, y: 0, duration: 0.2, overwrite: true }); }
}

/** The one picked: it squashes, and a copy flies from it into the React tab, which squashes as it lands. */
export function picked(btn: HTMLElement, emoji: string, tabIcon: HTMLElement | null, adding: boolean) {
  const e = btn.querySelector<HTMLElement>(".ce-e") ?? btn;
  gsap.fromTo(e, { scaleX: 1.5, scaleY: 0.62 }, { scaleX: 1, scaleY: 1, duration: 0.7, ease: "elastic.out(1, .35)", overwrite: true });
  if (!adding || !tabIcon) return;
  const a = btn.getBoundingClientRect(), b = tabIcon.getBoundingClientRect();
  const fly = document.createElement("span");
  fly.className = "cbar-fly";
  fly.textContent = emoji;
  document.body.append(fly);
  const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2, x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
  gsap.set(fly, { x: x0, y: y0, xPercent: -50, yPercent: -50, scale: 1.3 });
  gsap.timeline({ onComplete: () => { fly.remove(); gsap.fromTo(tabIcon, { scale: 1.55, rotation: -12 }, { scale: 1, rotation: 0, duration: 0.6, ease: "elastic.out(1, .4)" }); } })
    .to(fly, { x: x1, duration: 0.42, ease: "power1.inOut" }, 0)
    .to(fly, { y: Math.min(y0, y1) - 46, duration: 0.2, ease: "power2.out" }, 0)
    .to(fly, { y: y1, duration: 0.22, ease: "power2.in" }, 0.2)
    .to(fly, { scale: 0.7, rotation: 20, duration: 0.42 }, 0);
}

/** A tab under the mouse comes alive, each in its own way. */
export function tabEnter(tab: HTMLElement, kind: string) {
  const ic = tab.querySelector<HTMLElement>(".ic > :first-child");
  if (!ic) return;
  if (kind === "react") gsap.fromTo(ic, { rotation: 0 }, { keyframes: { rotation: [0, -16, 12, -7, 0] }, duration: 0.55, ease: "sine.inOut", overwrite: true });
  else if (kind === "talk") {
    gsap.fromTo(ic, { rotation: -14, scale: 0.9 }, { rotation: 0, scale: 1, duration: 0.6, ease: "elastic.out(1, .4)", overwrite: true });
    const dots = tab.querySelectorAll<HTMLElement>(".dots i");
    if (dots.length) { tab.classList.add("typing"); stopLoop(tab); loops.set(tab, gsap.to(dots, { y: -3, duration: 0.28, ease: "sine.inOut", stagger: { each: 0.12, repeat: -1, yoyo: true } })); }
  } else if (kind === "share") {
    gsap.timeline({ defaults: { overwrite: "auto" } })
      .to(ic, { x: 9, y: -9, opacity: 0, duration: 0.16, ease: "power2.in" })
      .set(ic, { x: -9, y: 9 })
      .to(ic, { x: 0, y: 0, opacity: 1, duration: 0.34, ease: "back.out(2.4)" });
  } else if (kind === "open") gsap.to(ic, { scale: 1.3, duration: 0.3, ease: "back.out(3)", overwrite: true });
}
export function tabLeave(tab: HTMLElement, kind: string) {
  const ic = tab.querySelector<HTMLElement>(".ic > :first-child");
  if (kind === "talk") {
    stopLoop(tab);
    tab.classList.remove("typing");
    const dots = tab.querySelectorAll(".dots i");
    if (dots.length) gsap.set(dots, { clearProps: "transform" });
  }
  if (kind === "open" && ic) gsap.to(ic, { scale: 1, duration: 0.3, ease: "power2.out", overwrite: true });
}

/** A press squashes the tab a little; letting go springs it back. */
export function press(tab: HTMLElement) { gsap.to(tab, { scale: 0.9, duration: 0.08, ease: "power2.out", overwrite: "auto" }); }
export function release(tab: HTMLElement) { gsap.to(tab, { scale: 1, duration: 0.5, ease: "elastic.out(1, .4)", overwrite: "auto", clearProps: "transform" }); }

/** The soft highlight slides to the tab under the mouse (it moves by `x` and `y`; its size is set, not animated). */
export function slideHi(hi: HTMLElement, foot: HTMLElement, tab: HTMLElement | null) {
  if (!tab) { gsap.to(hi, { opacity: 0, duration: 0.25, overwrite: "auto" }); return; }
  const f = foot.getBoundingClientRect(), t = tab.getBoundingClientRect(), k = f.width / (foot.offsetWidth || f.width) || 1;
  const x = (t.left - f.left) / k, y = (t.top - f.top) / k, w = t.width / k, h = t.height / k;
  const first = Number(gsap.getProperty(hi, "opacity")) < 0.05;
  gsap.set(hi, { width: w, height: h });
  if (first) gsap.set(hi, { x, y, scale: 0.7 });
  gsap.to(hi, { x, y, opacity: 1, scale: 1, duration: first ? 0.25 : 0.38, ease: "power3.out", overwrite: "auto" });
}

/** A number that changed rolls in from below (up) or above (down). */
export function rollIn(el: HTMLElement, up: boolean) {
  gsap.fromTo(el, { yPercent: up ? 90 : -90, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: "back.out(2.2)", clearProps: "transform" });
}

/** Share: the arrow shoots off and comes back. */
export function shared(tab: HTMLElement) {
  const ic = tab.querySelector<HTMLElement>(".ic > :first-child");
  if (ic) gsap.timeline().to(ic, { x: 14, y: -14, opacity: 0, duration: 0.18, ease: "power2.in" }).set(ic, { x: -10, y: 10 }).to(ic, { x: 0, y: 0, opacity: 1, duration: 0.4, ease: "back.out(2.6)" });
}
