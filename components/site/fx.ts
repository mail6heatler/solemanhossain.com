"use client";
// Small browser-only helpers shared by the fun effects.

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The current accent colour (follows the mood + theme). */
export function accent() {
  const el = document.querySelector(".site");
  const v = el ? getComputedStyle(el).getPropertyValue("--mint").trim() : "";
  return v || "#7ee8a2";
}

/** Confetti from an element (or the middle of the screen). canvas-confetti is loaded only when first needed. */
export async function confettiFrom(el?: Element | null, opts: { count?: number; spread?: number } = {}) {
  if (prefersReducedMotion()) return;
  const { default: confetti } = await import("canvas-confetti");
  let origin = { x: 0.5, y: 0.5 };
  if (el) {
    const r = el.getBoundingClientRect();
    origin = { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight };
  }
  confetti({ particleCount: opts.count ?? 80, spread: opts.spread ?? 70, startVelocity: 36, origin, colors: [accent(), "#ffffff", "#b49be6", "#6fc3d4", "#f2c14e"], disableForReducedMotion: true });
}

/** Side cannons for party mode. */
export async function confettiCannons(ms = 2500) {
  if (prefersReducedMotion()) return;
  const { default: confetti } = await import("canvas-confetti");
  const end = Date.now() + ms;
  (function frame() {
    confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } });
    confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

/** Emojis that burst out from a point. */
export function burst(x: number, y: number, emojis: string[], n = 8, spread = 100) {
  if (prefersReducedMotion() || emojis.length === 0) return;
  for (let i = 0; i < n; i++) {
    const s = document.createElement("span");
    s.className = "fx-particle";
    s.textContent = emojis[i % emojis.length];
    document.body.appendChild(s);
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.6;
    const d = spread * (0.5 + Math.random() * 0.6);
    const anim = s.animate(
      [
        { transform: `translate(${x - 10}px, ${y - 12}px) scale(.6)`, opacity: 1 },
        { transform: `translate(${x - 10 + Math.cos(a) * d}px, ${y - 42 + Math.sin(a) * d}px) scale(1.1) rotate(${(Math.random() - 0.5) * 120}deg)`, opacity: 0 },
      ],
      { duration: 800 + Math.random() * 400, easing: "cubic-bezier(.2,.8,.2,1)" }
    );
    anim.onfinish = () => s.remove();
  }
}

/** Emojis raining from the top (party mode). */
export function rain(emojis: string[], n = 36) {
  if (prefersReducedMotion()) return;
  for (let i = 0; i < n; i++) {
    const s = document.createElement("span");
    s.className = "fx-particle";
    s.textContent = emojis[i % emojis.length];
    s.style.fontSize = 18 + Math.random() * 16 + "px";
    document.body.appendChild(s);
    const x = Math.random() * innerWidth;
    s.animate(
      [
        { transform: `translate(${x}px, -40px) rotate(0deg)` },
        { transform: `translate(${x + (Math.random() - 0.5) * 120}px, ${innerHeight + 40}px) rotate(${(Math.random() - 0.5) * 540}deg)` },
      ],
      { duration: 2400 + Math.random() * 2200, delay: Math.random() * 1500, easing: "linear", fill: "backwards" }
    ).onfinish = () => s.remove();
  }
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
/** A short message at the bottom of the screen. */
export function toast(msg: string, ms = 3000) {
  let t = document.getElementById("site-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "site-toast";
    t.className = "site-toast";
    t.setAttribute("role", "status");
    t.setAttribute("aria-live", "polite");
    (document.querySelector(".site") ?? document.body).appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t!.classList.remove("on"), ms);
}
