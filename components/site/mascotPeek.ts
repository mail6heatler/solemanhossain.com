/**
 * What stays on the screen while a visitor has sent Mini Shourobh away (bye and hi, settings.mascot.bye.away, 2026-11-28): his head
 * peeking up from his corner (blinking, peeking a little higher and waving now and then), a round badge with his face, or just a
 * "Bring back Mini Shourobh" pill while the footer is on screen. A press brings him back (`onHi`).
 *
 * Light on purpose: no GSAP and none of his animation code (Mascot.tsx loads only this on later pages of a visit while he's away).
 * The head is his real one, drawn from his settings with the same shapes and styles as mascotRig.ts (mascotCurls.ts, mascotWear.ts,
 * the `.mz-svg` rules in app/mascot.css), and everything that moves is a CSS animation on transform (app/mascot.css, "while he's away").
 */
import { glassesSvg, hatSvg } from "./mascotWear";
import { CURL_BACK, CURL_FRONT, circles, curlHi, type C3 } from "./mascotCurls";
import { awayLeft } from "./mascotAway";
import { wearOf, type MascotSettings } from "@/lib/mascot";

const JAW = "M77,102 C78,134 98,151 120,151 C142,151 162,134 163,102 C159,120 151,130 141,133 C133,127 107,127 99,133 C89,130 81,120 77,102 Z";
const LIP = "M103,125 C108,118 116,118 120,121 C124,118 132,118 137,125 C131,123 125,124 120,126 C115,124 109,123 103,125 Z";
const EYE = `<ellipse class="zo" rx="9.5" ry="11" fill="#fff"/><circle r="6.4" fill="#4a2c1a"/><circle r="3.3" fill="#140b07"/><circle cx="-2.3" cy="-2.8" r="2" fill="#fff"/>`;

/** his head alone, in the full drawing's own coordinates (240 × 310), cut to `viewBox` */
export function headSvg(m: MascotSettings, u: string, viewBox: string): string {
  const w = wearOf(m), hat = w.hat !== "none" ? hatSvg(w.hat, m.hair) : { svg: "", clipY: null as number | null };
  const clip = hat.clipY != null ? ` clip-path="url(#mzHc-${u})"` : ""; // under a hat his hair stops at the band, as on him
  const curls = (list: C3) => `<g${clip}>${circles(list, "zhro")}${circles(list, "zhr")}${curlHi(list)}</g>`;
  const front = m.hair === "curly" ? curls(CURL_FRONT)
    : m.hair === "swept" ? `<g${clip}><path class="zo zhr" d="M77,98 C70,62 92,36 122,38 C152,34 172,58 163,96 C160,80 150,70 138,70 C146,62 136,54 124,60 C112,52 94,62 92,74 C86,78 80,86 77,98 Z"/><path class="zhi" d="M100,50 Q118,40 140,44"/></g>`
    : `<g${clip}><path class="zo zhr" d="M77,94 C74,62 96,44 120,44 C146,44 166,60 163,94 C156,76 140,66 120,66 C102,66 86,74 77,94 Z"/><path class="zhi" d="M98,54 Q118,46 138,50"/></g>`;
  const beard = m.beard === "trim" ? `<path class="zo zbd" d="${JAW}"/><path class="zo zbd" stroke-width="1.8" d="${LIP}"/>`
    : m.beard === "stubble" ? `<path class="zstub" d="${JAW}"/><path class="zstub" d="${LIP}"/>` : "";
  return `<svg class="mz-svg" viewBox="${viewBox}" aria-hidden="true" focusable="false"><defs>
<radialGradient id="mzSkinHi-${u}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<clipPath id="mzHc-${u}" clipPathUnits="userSpaceOnUse"><rect x="-60" y="${hat.clipY ?? -400}" width="360" height="420"/></clipPath></defs>
${m.hair === "curly" ? curls(CURL_BACK) : ""}
<ellipse class="zo zsk" cx="76" cy="103" rx="8.5" ry="11.5"/><ellipse class="zo zsk" cx="164" cy="103" rx="8.5" ry="11.5"/>
<path class="zo zsk" d="M120,52 C151,52 165,74 164,101 C163,130 145,149 120,149 C95,149 77,130 76,101 C75,74 89,52 120,52 Z"/>
<path class="zsd" d="M164,101 C163,130 145,149 120,149 C138,143 154,127 157,104 Z"/><ellipse cx="104" cy="84" rx="24" ry="18" fill="url(#mzSkinHi-${u})"/>
${beard}
<ellipse cx="92" cy="117" rx="6.5" ry="3.6" fill="#ff6f61" opacity=".28"/><ellipse cx="148" cy="117" rx="6.5" ry="3.6" fill="#ff6f61" opacity=".28"/>
<path class="zln" d="M108,130 Q120,139 132,130"/>
<path d="M119,103 C116,111 114,115 119,117 C122,118 125,116 126,114" fill="none" stroke="rgba(90,35,15,.5)" stroke-width="2.2" stroke-linecap="round"/>
<g transform="translate(103 100)"><g class="mz-pk-eye lc-rest">${EYE}</g></g><g transform="translate(137 100)"><g class="mz-pk-eye lc-rest">${EYE}</g></g>
<path class="zbrow" d="M92,86 Q102,79 113,84"/><path class="zbrow" d="M127,84 Q138,79 148,86"/>
${front}${hat.svg}${w.glasses !== "none" ? glassesSvg(w.glasses, u) : ""}</svg>`;
}

/** his hand, waving beside the peeking head */
const HAND = `<svg class="mz-svg" viewBox="-14 -16 28 30" aria-hidden="true" focusable="false"><circle class="zo zsk" r="9"/><path class="zo zsk" d="M-5,-6 Q-12,-8 -10.5,-1 Q-9,2 -6,1"/><path d="M-3,3.5 Q0,5.5 3,3.5" fill="none" stroke="rgba(90,30,10,.35)" stroke-width="1.5"/></svg>`;

/**
 * Draws what stays (the owner's choice) in his layer and returns how to remove it. A press calls `onHi` once it has ducked away.
 * With "back by himself after a few minutes" it also calls `onHi` when that time runs out.
 */
export function mountAway(layer: HTMLElement, m: MascotSettings, onHi: () => void): () => void {
  const b = m.bye, phone = matchMedia("(max-width: 760px)").matches, still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const w = (m.size / 100) * (phone ? 96 : 150);
  let right = m.side === "right";
  if (phone) { // the same rule as his own spot: the round phone menu (the orb) in his corner sends him to the other one
    const o = document.querySelector<HTMLElement>(".pm-orb-btn")?.getBoundingClientRect();
    if (o && o.width && o.left + o.width / 2 > innerWidth / 2 === right) right = !right;
  }
  const u = "pk" + Math.random().toString(36).slice(2, 8);
  const el = document.createElement("button");
  el.type = "button"; el.title = "Say hi to Mini Shourobh"; el.setAttribute("aria-label", "Say hi to Mini Shourobh: he comes back");
  for (const [k, v] of Object.entries({ "--mz-skin": m.skin, "--mz-hair": "#2a1b15", "--mz-beard": "#6b3b26", "--mz-ink": "#24160f", "--mz-acc": "#ff5a46" })) el.style.setProperty(k, v);
  let io: IntersectionObserver | null = null;
  if (b.away === "badge") {
    el.className = `mz-badge ${right ? "r" : "l"}`; el.style.width = Math.round(Math.max(48, w * 0.42)) + "px";
    el.innerHTML = `<span class="mz-badge-in lc-rest">${headSvg(m, u, "50 22 140 140")}</span><i aria-hidden="true">👋</i>`;
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
  function cleanup() { done = true; clearTimeout(t); io?.disconnect(); el.remove(); }
  const go = () => { if (done) return; done = true; clearTimeout(t); el.classList.add("going"); window.setTimeout(() => { cleanup(); onHi(); }, still ? 0 : 280); };
  el.addEventListener("click", go);
  const left = awayLeft();
  if (left > 0) t = window.setTimeout(go, Math.min(left, 2 ** 31 - 1));
  return cleanup;
}
