/**
 * What stays on the screen while a visitor has sent Mini Shourobh away (bye and hi, settings.mascot.bye.away, 2026-11-28): his head
 * peeking up from his corner (blinking, peeking a little higher and waving now and then), the mini tarot card with him locked inside
 * (floating, shining, knocking to get out), or just a "Bring back Mini Shourobh" pill while the footer is on screen. A press brings him back.
 *
 * Light on purpose: no GSAP and none of his animation code (Mascot.tsx loads only this on later pages of a visit while he's away).
 * His head is his real one, drawn from his settings with the same shapes and styles as mascotRig.ts (mascotCurls.ts, mascotWear.ts,
 * the `.mz-svg` rules in app/mascot.css), and everything that moves is a CSS animation on transform (app/mascot.css, "while he's away").
 * The tarot card's design (`cardHtml`) lives here too, because his engine draws the big card he's locked into with the same markup.
 */
import { glassesSvg, hatSvg } from "./mascotWear";
import { CURL_BACK, CURL_FRONT, circles, curlHi, type C3 } from "./mascotCurls";
import { awayLeft } from "./mascotAway";
import { wearOf, type MascotSettings } from "@/lib/mascot";

const JAW = "M77,102 C78,134 98,151 120,151 C142,151 162,134 163,102 C159,120 151,130 141,133 C133,127 107,127 99,133 C89,130 81,120 77,102 Z";
const LIP = "M103,125 C108,118 116,118 120,121 C124,118 132,118 137,125 C131,123 125,124 120,126 C115,124 109,123 103,125 Z";
const EYE = `<ellipse class="zo" rx="9.5" ry="11" fill="#fff"/><circle r="6.4" fill="#4a2c1a"/><circle r="3.3" fill="#140b07"/><circle cx="-2.3" cy="-2.8" r="2" fill="#fff"/>`;
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** a hand pressed flat on glass: palm, thumb and three finger lines, in the drawing's coordinates */
const palm = (x: number, y: number, cls: string) => `<g class="${cls}"><circle class="zo zsk" cx="${x}" cy="${y}" r="13"/><path class="zln" d="M${x - 7},${y - 9} v-10 M${x},${y - 12} v-12 M${x + 7},${y - 9} v-10"/></g>`;

/**
 * His head alone, in the full drawing's own coordinates (240 × 310), cut to `viewBox`. `shocked` opens his mouth and lifts his brows;
 * `hands` adds his two hands pressed against the glass below his chin (locked in the tarot card).
 */
export function headSvg(m: MascotSettings, u: string, viewBox: string, o: { shocked?: boolean; hands?: boolean } = {}): string {
  const w = wearOf(m), hat = w.hat !== "none" ? hatSvg(w.hat, m.hair) : { svg: "", clipY: null as number | null };
  const clip = hat.clipY != null ? ` clip-path="url(#mzHc-${u})"` : ""; // under a hat his hair stops at the band, as on him
  const curls = (list: C3) => `<g${clip}>${circles(list, "zhro")}${circles(list, "zhr")}${curlHi(list)}</g>`;
  const front = m.hair === "curly" ? curls(CURL_FRONT)
    : m.hair === "swept" ? `<g${clip}><path class="zo zhr" d="M77,98 C70,62 92,36 122,38 C152,34 172,58 163,96 C160,80 150,70 138,70 C146,62 136,54 124,60 C112,52 94,62 92,74 C86,78 80,86 77,98 Z"/><path class="zhi" d="M100,50 Q118,40 140,44"/></g>`
    : `<g${clip}><path class="zo zhr" d="M77,94 C74,62 96,44 120,44 C146,44 166,60 163,94 C156,76 140,66 120,66 C102,66 86,74 77,94 Z"/><path class="zhi" d="M98,54 Q118,46 138,50"/></g>`;
  const beard = m.beard === "trim" ? `<path class="zo zbd" d="${JAW}"/><path class="zo zbd" stroke-width="1.8" d="${LIP}"/>`
    : m.beard === "stubble" ? `<path class="zstub" d="${JAW}"/><path class="zstub" d="${LIP}"/>` : "";
  const mouth = o.shocked ? `<ellipse class="zo" cx="120" cy="134" rx="6.5" ry="8" fill="#5c1f1b"/>` : `<path class="zln" d="M108,130 Q120,139 132,130"/>`;
  const brows = o.shocked ? `<path class="zbrow" d="M92,80 Q102,73 113,78"/><path class="zbrow" d="M127,78 Q138,73 148,80"/>` : `<path class="zbrow" d="M92,86 Q102,79 113,84"/><path class="zbrow" d="M127,84 Q138,79 148,86"/>`;
  return `<svg class="mz-svg" viewBox="${viewBox}" aria-hidden="true" focusable="false"><defs>
<radialGradient id="mzSkinHi-${u}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<clipPath id="mzHc-${u}" clipPathUnits="userSpaceOnUse"><rect x="-60" y="${hat.clipY ?? -400}" width="360" height="420"/></clipPath></defs>
${m.hair === "curly" ? curls(CURL_BACK) : ""}
<ellipse class="zo zsk" cx="76" cy="103" rx="8.5" ry="11.5"/><ellipse class="zo zsk" cx="164" cy="103" rx="8.5" ry="11.5"/>
<path class="zo zsk" d="M120,52 C151,52 165,74 164,101 C163,130 145,149 120,149 C95,149 77,130 76,101 C75,74 89,52 120,52 Z"/>
<path class="zsd" d="M164,101 C163,130 145,149 120,149 C138,143 154,127 157,104 Z"/><ellipse cx="104" cy="84" rx="24" ry="18" fill="url(#mzSkinHi-${u})"/>
${beard}
<ellipse cx="92" cy="117" rx="6.5" ry="3.6" fill="#ff6f61" opacity=".28"/><ellipse cx="148" cy="117" rx="6.5" ry="3.6" fill="#ff6f61" opacity=".28"/>
${mouth}
<path d="M119,103 C116,111 114,115 119,117 C122,118 125,116 126,114" fill="none" stroke="rgba(90,35,15,.5)" stroke-width="2.2" stroke-linecap="round"/>
<g transform="translate(103 100)"><g class="mz-pk-eye lc-rest">${EYE}</g></g><g transform="translate(137 100)"><g class="mz-pk-eye lc-rest">${EYE}</g></g>
${brows}
${front}${hat.svg}${w.glasses !== "none" ? glassesSvg(w.glasses, u) : ""}${o.hands ? palm(86, 186, "mz-tc-hl") + palm(154, 186, "mz-tc-hr") : ""}</svg>`;
}

const SUN = `<svg class="mz-tc-sun" viewBox="-12 -12 24 24" aria-hidden="true" focusable="false"><circle r="4.5" fill="currentColor"/><g stroke="currentColor" stroke-width="1.6" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M0 -7 V-10.5" transform="rotate(${a})"/>`).join("")}</g></svg>`;
const TWINKLES = [[18, 22], [72, 16], [30, 62], [80, 50], [55, 30]].map(([l, t]) => `<i class="mz-tc-tw" style="left:${l}%;top:${t}%">✦</i>`).join("");

/**
 * The tarot card he's locked into (an original design: indigo and gold, sun, moon and stars, his name and the owner's title). Sized in
 * em, so one font-size scales it. `locked` shows him inside; `hint` adds "Drop him here" under the big card.
 */
export function cardHtml(m: MascotSettings, u: string, o: { locked: boolean; hint?: boolean }): string {
  const b = m.bye, initial = (b.cardName.trim().split(/\s+/).pop() || "S").charAt(0).toUpperCase();
  return `<div class="mz-tc-float lc-rest"><div class="mz-tc-tilt"><div class="mz-tc-in lc-rest">
<div class="mz-tc-face">${SUN}<span class="mz-tc-moon" aria-hidden="true">☾</span><div class="mz-tc-num">0</div>
<div class="mz-tc-win"><div class="mz-tc-glow"></div>${TWINKLES}<div class="mz-tc-him${o.locked ? " on" : ""}">${headSvg(m, u, "40 16 160 194", { shocked: true, hands: true })}</div></div>
<div class="mz-tc-name">${esc(b.cardName)}</div><div class="mz-tc-banner">${esc(b.cardTitle)}</div><div class="mz-tc-seal${o.locked ? " on" : ""}">${esc(initial)}</div><div class="mz-tc-shine lc-rest"></div></div>
<div class="mz-tc-back"></div></div></div></div>${o.hint ? `<div class="mz-tc-hint">Drop him here ✨</div>` : ""}`;
}

/** where the mini card stands and how big it is (his engine glides the big card to exactly this) */
export function miniCardBox(m: MascotSettings, right: boolean, layerW: number, layerH: number) {
  const phone = typeof window !== "undefined" && matchMedia("(max-width: 760px)").matches;
  const w = (m.size / 100) * (phone ? 96 : 150), fs = Math.max(4.4, w * 0.055), cw = fs * 10, ch = fs * 17.4, gap = 14;
  return { fs, cw, ch, cx: right ? layerW - gap - cw / 2 : gap + cw / 2, cy: layerH - 10 - ch / 2, right, gap };
}

/** his hand, waving beside the peeking head */
const HAND = `<svg class="mz-svg" viewBox="-14 -16 28 30" aria-hidden="true" focusable="false"><circle class="zo zsk" r="9"/><path class="zo zsk" d="M-5,-6 Q-12,-8 -10.5,-1 Q-9,2 -6,1"/><path d="M-3,3.5 Q0,5.5 3,3.5" fill="none" stroke="rgba(90,30,10,.35)" stroke-width="1.5"/></svg>`;

/** which corner is his: his own side, unless the round phone menu (the orb) is there (the same rule as his engine) */
function hisSide(m: MascotSettings) {
  let right = m.side === "right";
  if (matchMedia("(max-width: 760px)").matches) {
    const o = document.querySelector<HTMLElement>(".pm-orb-btn")?.getBoundingClientRect();
    if (o && o.width && o.left + o.width / 2 > innerWidth / 2 === right) right = !right;
  }
  return right;
}

/**
 * Draws what stays (the owner's choice, or the mini tarot card when he was locked in one) in his layer and returns how to remove it.
 * A press calls `onHi` once it has played its goodbye ("card" when he bursts out of the card). With "back by himself after a few
 * minutes" it also calls `onHi` when that time runs out.
 */
export function mountAway(layer: HTMLElement, m: MascotSettings, onHi: (enter: string) => void, inCard = false): () => void {
  const b = m.bye, phone = matchMedia("(max-width: 760px)").matches, still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const w = (m.size / 100) * (phone ? 96 : 150), right = hisSide(m), card = inCard || b.away === "tarot";
  const u = "pk" + Math.random().toString(36).slice(2, 8);
  const el = document.createElement("button");
  el.type = "button"; el.title = card ? "Set Mini Shourobh free" : "Say hi to Mini Shourobh";
  el.setAttribute("aria-label", card ? "Set Mini Shourobh free from the tarot card" : "Say hi to Mini Shourobh: he comes back");
  for (const [k, v] of Object.entries({ "--mz-skin": m.skin, "--mz-hair": "#2a1b15", "--mz-beard": "#6b3b26", "--mz-ink": "#24160f", "--mz-acc": "#ff5a46" })) el.style.setProperty(k, v);
  let io: IntersectionObserver | null = null;
  const offs: (() => void)[] = [];
  if (card) {
    const box = miniCardBox(m, right, layer.clientWidth, layer.clientHeight);
    el.className = `mz-tc mini ${right ? "r" : "l"}${inCard ? "" : " drop"}`; el.style.fontSize = box.fs + "px";
    el.innerHTML = cardHtml(m, u, { locked: true }) + `<span class="mz-knock k1" aria-hidden="true">knock</span><span class="mz-knock k2" aria-hidden="true">knock</span><span class="mz-tc-burst" aria-hidden="true">${"<i>✦</i>".repeat(10)}</span>`;
    // a mouse tilts the card toward itself in 3D (one write per move, only while it's over the card)
    const tilt = el.querySelector<HTMLElement>(".mz-tc-tilt")!;
    const move = (e: PointerEvent) => { if (e.pointerType !== "mouse") return; const r = el.getBoundingClientRect(), dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5; tilt.style.transform = `rotateY(${(dx * 34).toFixed(1)}deg) rotateX(${(-dy * 28).toFixed(1)}deg) scale(1.08)`; };
    const leave = () => { tilt.style.transform = ""; };
    el.addEventListener("pointermove", move); el.addEventListener("pointerleave", leave);
    offs.push(() => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); });
  } else if (b.away === "link") {
    el.className = "mz-bring"; el.textContent = "👋 Bring back Mini Shourobh";
    // only while the footer is on screen; a page without a footer shows it all the time, so he can always be brought back
    const foot = document.querySelector(".site footer");
    if (foot) { io = new IntersectionObserver(([e]) => el.classList.toggle("on", e.isIntersecting), { threshold: 0.15 }); io.observe(foot); } else el.classList.add("on");
  } else {
    el.className = `mz-pk ${right ? "r" : "l"}`; el.style.width = Math.round(w * 0.78) + "px";
    el.innerHTML = `<span class="mz-pk-in lc-rest">${headSvg(m, u, "60 6 120 108")}</span><span class="mz-pk-hand lc-rest">${HAND}</span>`;
  }
  layer.appendChild(el);
  let t = 0, done = false;
  function cleanup() { done = true; clearTimeout(t); io?.disconnect(); offs.forEach((f) => f()); el.remove(); }
  // the card flips over, glows and bursts open in light (`freeing`, then `burst`) before he jumps out; the others just duck away
  const go = () => {
    if (done) return; done = true; clearTimeout(t);
    if (!card) { el.classList.add("going"); window.setTimeout(() => { cleanup(); onHi(""); }, still ? 0 : 280); return; }
    el.classList.add("freeing"); el.querySelector<HTMLElement>(".mz-tc-tilt")!.style.transform = "";
    window.setTimeout(() => el.classList.add("burst"), still ? 0 : 560);
    window.setTimeout(() => { cleanup(); onHi("card"); }, still ? 0 : 860);
  };
  el.addEventListener("click", go);
  const left = awayLeft();
  if (left > 0) t = window.setTimeout(go, Math.min(left, 2 ** 31 - 1));
  return cleanup;
}
