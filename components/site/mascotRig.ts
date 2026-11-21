/**
 * One living copy of Mini Shourobh (lib/mascot.ts): the drawing, its joints and every move he knows. The site
 * (mascotEngine.ts) and the dashboard's preview (components/admin/MascotStudio.tsx) both use it. GSAP is handed in
 * by useGsap, because it's downloaded only once he's needed.
 *
 * How he moves: a state object `s` of plain numbers (joint angles, hand targets, squash, extras) is tweened by GSAP,
 * and `render` writes it to the SVG as transform attributes, only the ones that changed. Arms are two bones with an
 * elbow, solved each frame from where the hand should be (ik). Props in a hand stay upright, plus `pa`. Every class
 * and data attribute is prefixed (z…, mzj-, data-mz…) because the SVG's styles live in app/mascot.css.
 */
import type { MascotSettings } from "@/lib/mascot";

type GS = typeof import("gsap").gsap;
export type TL = ReturnType<GS["timeline"]>;
type Tw = ReturnType<GS["to"]>;
export type S = Record<string, number>;
let G!: GS;
export const useGsap = (g: GS) => { G = g; };
export const gs = () => G;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

/* ---------------- what he says: several versions of everything, never the same one twice in a row ---------------- */
const lastPick = new Map<string, string>();
/** One version of a line: "a|b|c", or a list. The one he said last time is skipped. */
export function vary(src: string | readonly string[]): string {
  const list = (typeof src === "string" ? src.split("|") : [...src]).map((x) => x.trim()).filter(Boolean);
  if (list.length < 2) return list[0] || "";
  const key = list.join("\u0001"), prev = lastPick.get(key), pool = list.filter((x) => x !== prev), v = pool[Math.floor(Math.random() * pool.length)];
  lastPick.set(key, v); return v;
}
/** An answer the owner wrote (lib/mascot.ts): an empty line starts a whole other version; each line is a sentence; | separates versions of a line. */
export function answer(text: string): string[] {
  const versions = String(text || "").split(/\n\s*\n/).map((v) => v.trim()).filter(Boolean);
  const one = versions.length > 1 ? vary(versions) : versions[0] || "";
  return one.split("\n").map((l) => vary(l)).filter(Boolean);
}
/** His own words (not the owner's), each with its versions. */
export const SAYS = {
  tada: ["Ta-da! ✨", "Nailed it! 🤸", "Stuck the landing! 😎", "Perfect ten, judges? ✨"],
  hmm: ["Hmm…", "Let me think…", "Hmmmm… 🤔"],
  upTop: ["Up top! ✋", "High five! ✋", "Gimme five! ✋"],
  letsGo: ["Let's go! 🔥", "Fired up! 🔥", "Bring it on! 🔥"],
  ahh: ["Ahh. ☕", "Mmm, perfect. ☕", "That hits the spot. ☕"],
  spicy: ["SPICY! 🌶️🔥", "HOT HOT HOT! 🌶️", "Water! WATER! 🔥"],
  worth: ["Worth it. 😋", "No regrets. 😋", "Totally worth it. 😋"],
  tickle: ["Hahaha, stop! That tickles! 😆", "Hehe, no! I'm ticklish! 🤭", "Stop it! Haha, okay, okay! 😆", "Ahaha! Not the belly! 😂"],
  grumpy: ["Okay. That's enough. 😤", "Hey! Hands off! 😤", "Not funny anymore. 😤"],
  forgive: ["…fine. I forgive you.", "…okay, okay. Friends again?", "…I can't stay mad at you."],
  record: ["{n} keepy-ups! New record! ⚽", "{n} in a row! Not bad, huh? ⚽", "{n}! My feet are on fire! 🔥", "Boom, {n} keepy-ups! ⚽"],
  messi: ["By the way, Messi is the GOAT 🐐"],
  comes: ["Here it comes…", "Ready… 🏏", "Bowl it to me!"],
  six: ["SIX! Out of the ground! 🏏", "That's a SIX! 🏏", "Bye bye, ball! SIX! 🏏"],
  yawn: ["Yaaawn…", "Yaaawn… so sleepy.", "*yawns* 🥱"],
  meme: ["Haha, this meme! 😂", "LOL, look at this! 😂", "Hahaha, I can't! 🤣"],
  wind: ["Whoa, slow down! 😵", "Easy! I'm getting dizzy! 😵", "Wheee, so fast! 💨"],
  end: ["You made it to the end! 🎉", "The end! You saw it all! 🎉", "Bottom of the page! Legend! 🥳"],
  welcome: ["You're back! I missed you! 🥳", "Hey, welcome back! 😄", "There you are! I missed you! 💖"],
  thanks: ["Yay, thank you! 💖", "Aww, thanks! 💖", "You're the best! 💖"],
  morning: ["Good morning! Cha first. ☕", "Morning! Need my cha. ☕", "Rise and shine! Cha time. ☕"],
  night: ["Up late too? 🌙 Me too.", "Night owl, huh? Me too. 🌙", "Can't sleep either? 🌙"],
  rain: ["Rainy day in Dhaka! ☔", "Brishti! Rain in Dhaka! ☔", "Perfect weather for cha. ☔"],
  eid: ["Eid Mubarak! 🌙✨", "Eid Mubarak to you! 🌙", "Happy Eid! 🌙✨"],
  bday: ["It's my birthday! 🎂", "Birthday time! 🎂", "Guess what day it is? 🎂"],
  nap: ["Yaaawn… nap time. 😴", "Just a little nap… 😴", "Five more minutes… 😴"],
  up: ["Huh?! I'm up, I'm up!", "Wha—? I wasn't sleeping!", "I'm awake! Totally awake! 😳"],
  whoa: ["Whoa!", "Yikes!", "Hey!", "Close one!"],
  rpsWin: ["{him} beats {you}! I win! Again? 😎", "Ha! {him} beats {you}! Again? 😎", "{him} wins! One more? 😎"],
  rpsLose: ["Aww, you win. Rematch? 😩", "Noooo! You got me. Again? 😩", "You're good at this! Rematch? 😩"],
  rpsDraw: ["Jinx! Great minds… again?", "Same! Again?", "A draw! One more?"],
} as const;

/* ---------------- sounds: made on the spot, only after the visitor has tapped or typed something ---------------- */
let soundOn = false, gestured = false;
export const setSound = (on: boolean) => { soundOn = on; };
export const markGesture = () => { gestured = true; };
let ctx: AudioContext | null = null;
function ac() {
  if (!soundOn || !gestured) return null;
  try {
    if (!ctx) { const A = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!A) return null; ctx = new A(); }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
}
function tone(f1: number, f2: number, d: number, type: OscillatorType = "sine", vol = 0.12, delay = 0) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.05);
}
function noise(d: number, vol: number, f1: number, f2: number, delay = 0) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay, n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = b;
  const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.setValueAtTime(f1, t); f.frequency.exponentialRampToValueAtTime(f2, t + d);
  const g = c.createGain(); g.gain.setValueAtTime(0.0008, t); g.gain.exponentialRampToValueAtTime(vol, t + d * 0.3); g.gain.exponentialRampToValueAtTime(0.0008, t + d);
  src.connect(f); f.connect(g); g.connect(c.destination); src.start(t); src.stop(t + d + 0.05);
}
export const SND = {
  pop: () => tone(420, 1300, 0.09, "sine", 0.18), boing: () => tone(160, 560, 0.28, "triangle", 0.16), thud: () => tone(130, 50, 0.2, "sine", 0.25),
  ding: () => { tone(880, 880, 0.5, "sine", 0.1); tone(1320, 1320, 0.6, "sine", 0.07, 0.1); }, ting: () => tone(2100, 2700, 0.18, "sine", 0.07),
  giggle: () => { for (let i = 0; i < 6; i++) tone(650 + (i % 2) * 120, 820 + (i % 2) * 120, 0.07, "triangle", 0.07, i * 0.1); },
  whoosh: (d = 1.6) => noise(d, 0.3, 250, 2400), snore: () => tone(110, 70, 1, "sawtooth", 0.025), yawn: () => tone(330, 170, 0.9, "triangle", 0.06),
  beep: () => tone(660, 660, 0.1, "square", 0.04), kick: () => tone(200, 90, 0.08, "sine", 0.2),
  rimshot: () => { tone(220, 140, 0.1, "triangle", 0.15); tone(260, 160, 0.1, "triangle", 0.15, 0.16); noise(0.25, 0.25, 3000, 6000, 0.34); },
  notes: () => { [523, 659, 784, 659, 880].forEach((f, i) => tone(f, f, 0.22, "sine", 0.06, i * 0.25)); },
};

/* ---------------- the drawing ---------------- */
type C3 = readonly (readonly [number, number, number])[];
const circles = (list: C3, cls: string) => list.map(([x, y, r]) => `<circle class="${cls}" cx="${x}" cy="${y}" r="${r}"/>`).join("");
const curlHi = (list: C3) => list.filter((_, i) => i % 2 === 0).map(([x, y, r]) => `<path class="zhi" d="M${x - r * 0.55},${y - r * 0.1} a${r * 0.6},${r * 0.6} 0 0 1 ${r * 0.75},${-r * 0.5}"/>`).join("");
const CURL_BACK: C3 = [[80, 86, 14], [82, 66, 16], [96, 50, 17], [118, 42, 19], [140, 48, 17], [156, 64, 16], [160, 86, 14], [79, 104, 10], [161, 104, 10]];
const CURL_FRONT: C3 = [[86, 74, 10], [96, 63, 12], [109, 57, 12.5], [123, 55, 12.5], [137, 59, 12], [149, 67, 11], [156, 78, 8.5], [100, 72, 8], [116, 69, 8.5], [131, 70, 8], [84, 83, 6.5], [157, 85, 6]];

function svgMarkup(u: string) {
  const P = `url(#mzPlaid-${u})`, T = `url(#mzTee-${u})`, LENS = `url(#mzLens-${u})`, GOLD = `url(#mzGold-${u})`;
  const ARM = (cls: string, hp: string, thumb: string) => `<g class="mzj-sh${cls}"><path class="zo" fill="${P}" d="M-11,-7 Q0,-13 11,-7 L10,38 Q0,42 -10,38 Z"/><g class="mzj-el${cls}">
  <path class="zo zsk" d="M-7,-2 H7 L6.5,30 Q0,33 -6.5,30 Z"/><path class="zo zsh2" d="M-9.5,-3 H9.5 L9,7 H-9 Z"/>
  <g transform="translate(0 32)"><g class="mzj-hp${cls}">${hp}</g><circle class="zo zsk" r="9"/><path class="zo zsk" d="${thumb}"/><path d="M-3,3.5 Q0,5.5 3,3.5" fill="none" stroke="rgba(90,30,10,.35)" stroke-width="1.5"/></g></g></g>`;
  const PROPS = `
<g data-mzprop="bino"><rect class="zo" x="-31" y="-7" width="42" height="12" rx="5" fill="#30384a"/><circle class="zo" cx="-20" cy="-1" r="10.5" fill="#3b4559"/><circle cx="-20" cy="-1" r="6.5" fill="${LENS}"/><circle cx="-22.5" cy="-3.5" r="1.8" fill="#fff"/><circle class="zo" cx="0" cy="-1" r="10.5" fill="#3b4559"/><circle cx="0" cy="-1" r="6.5" fill="${LENS}"/><circle cx="-2.5" cy="-3.5" r="1.8" fill="#fff"/></g>
<g data-mzprop="camera"><rect class="zo" x="-32" y="-24" width="14" height="8" rx="2" fill="#2f3542"/><rect class="zo" x="-38" y="-17" width="46" height="30" rx="6" fill="#2f3542"/><rect x="-36.5" y="-9" width="43" height="5" fill="var(--mz-acc)" opacity=".8"/><circle class="zo" cx="-15" cy="-2" r="11.5" fill="#1d2129"/><circle cx="-15" cy="-2" r="7.2" fill="${LENS}"/><circle cx="-18" cy="-5" r="2" fill="#fff"/><rect x="0" y="-14" width="5" height="4" rx="1" fill="#ffd34d"/><circle data-mzflash cx="-15" cy="-2" r="19" fill="#fff" opacity="0"/></g>
<g data-mzprop="mega"><path class="zo" d="M-2,-6 L30,-19 L30,15 L-2,4 Z" fill="var(--mz-acc)"/><ellipse class="zo" cx="30" cy="-2" rx="5.5" ry="17" fill="#ffe0b8"/><rect class="zo" x="-11" y="-7" width="10" height="12" rx="3" fill="#30384a"/><rect class="zo" x="5" y="2" width="7" height="13" rx="2.5" fill="#30384a"/></g>
<g data-mzprop="trophy"><path class="zo" d="M-14,-37 Q-25,-36 -21,-26 Q-18,-20 -11,-21" fill="none"/><path class="zo" d="M14,-37 Q25,-36 21,-26 Q18,-20 11,-21" fill="none"/><path class="zo" d="M-15,-44 H15 Q15,-18 0,-14 Q-15,-18 -15,-44 Z" fill="${GOLD}"/><rect class="zo" x="-3" y="-15" width="6" height="11" fill="${GOLD}"/><rect class="zo" x="-11" y="-5" width="22" height="9" rx="2" fill="#5b3a1e"/><path d="M0,-38 l2.4,5 5.4,.6 -4,3.7 1.1,5.3 -4.9,-2.7 -4.9,2.7 1.1,-5.3 -4,-3.7 5.4,-.6 z" fill="#fff8cf"/></g>
<g data-mzprop="phone"><rect class="zo" x="-10" y="-32" width="20" height="36" rx="4" fill="#1d2230"/><rect x="-7.3" y="-28" width="14.6" height="27" rx="2" fill="#7fd3ff"/><path d="M0,-11 c-4,-3.4 -6,-5.4 -6,-7.4 a3,3 0 0 1 6,-.6 a3,3 0 0 1 6,.6 c0,2 -2,4 -6,7.4 z" fill="var(--mz-acc)"/></g>
<g data-mzprop="flag"><rect class="zo" x="-2.2" y="-80" width="4.4" height="88" rx="2" fill="#8a5a33"/><circle class="zo" cx="0" cy="-82" r="3.5" fill="#ffc23a"/><g class="zcloth"><rect class="zo" x="2" y="-78" width="48" height="30" rx="1.5" fill="#0b6b47"/><circle cx="23.6" cy="-63" r="9.5" fill="#e3263a"/></g></g>
<g data-mzprop="mic"><rect class="zo" x="-3.5" y="-6" width="7" height="24" rx="3" fill="#2e3442"/><circle class="zo" cx="0" cy="-13" r="8.5" fill="#c9cfda"/><path d="M-6,-15 H6 M-7,-11 H7 M-4,-19 H4" stroke="#8a93a6" stroke-width="1.2"/></g>
<g data-mzprop="cup"><path class="zo" d="M10,-12 Q18,-11 16,-4 Q14,1 8,0" fill="none"/><path class="zo" d="M-10,-16 H10 L8,3 Q0,7 -8,3 Z" fill="#fff"/><path d="M-9,-13 H9" stroke="#a0582d" stroke-width="3"/><path d="M-6,-6 Q0,-3 6,-6" stroke="var(--mz-acc)" stroke-width="2" fill="none"/></g>
<g data-mzprop="umbrella"><path d="M0,10 V-138" stroke="var(--mz-ink)" stroke-width="3"/><path d="M0,10 Q0,18 -7,18" fill="none" stroke="var(--mz-ink)" stroke-width="3" stroke-linecap="round"/><path class="zo" d="M-62,-136 C-56,-176 -30,-192 0,-192 C30,-192 56,-176 62,-136 Q46,-146 31,-136 Q16,-146 0,-136 Q-16,-146 -31,-136 Q-46,-146 -62,-136 Z" fill="var(--mz-acc)"/><path d="M-31,-136 C-30,-168 -16,-190 0,-192 C16,-190 30,-168 31,-136 Q16,-146 0,-136 Q-16,-146 -31,-136 Z" fill="#fff" opacity=".85"/></g>
<g data-mzprop="lantern"><circle cx="0" cy="30" r="26" fill="#ffd77a" opacity=".35"/><path d="M0,2 V12" stroke="var(--mz-ink)" stroke-width="2"/><path class="zo" d="M-7,12 H7 L9,16 H-9 Z" fill="#c98a1e"/><path class="zo" d="M-11,16 H11 Q17,30 11,44 H-11 Q-17,30 -11,16 Z" fill="#ffc23a"/><path d="M-4,17 Q-7,30 -4,43 M4,17 Q7,30 4,43" stroke="#c98a1e" stroke-width="1.6" fill="none"/><path class="zo" d="M-8,44 H8 L5,49 H-5 Z" fill="#c98a1e"/><circle cx="0" cy="30" r="4" fill="#fff6c9"/></g>
<g data-mzprop="guide"><rect class="zo" x="-2" y="-72" width="4" height="80" rx="2" fill="#5b6377"/><path class="zo" d="M2,-72 L42,-60 L2,-48 Z" fill="#ffc23a"/><path d="M16,-63 l1.6,3.2 3.5,.5 -2.5,2.5 .6,3.5 -3.2,-1.7 -3.2,1.7 .6,-3.5 -2.5,-2.5 3.5,-.5 z" fill="var(--mz-acc)"/></g>
<g data-mzprop="bat"><rect class="zo" x="-3" y="-8" width="6" height="24" rx="2" fill="#2f3542"/><path class="zo" d="M-7.5,15 H7.5 L8.5,84 Q0,90 -8.5,84 Z" fill="#e8c88a"/><path d="M0,20 V80" stroke="rgba(120,80,30,.3)" stroke-width="2"/></g>`;
  const EYE = (c: string) => `<g class="mzj-eye${c}"><ellipse class="zo" rx="9.5" ry="11" fill="#fff"/><g class="mzj-pup${c}"><circle r="6.4" fill="#4a2c1a"/><circle r="3.3" fill="#140b07"/><circle cx="-2.3" cy="-2.8" r="2" fill="#fff"/><circle cx="2.4" cy="2.2" r=".9" fill="#fff" opacity=".7"/></g></g><path data-mzeh class="zhap" d="M-9,3 Q0,-7 9,3"/>`;
  const JAW = "M77,102 C78,134 98,151 120,151 C142,151 162,134 163,102 C159,120 151,130 141,133 C133,127 107,127 99,133 C89,130 81,120 77,102 Z";
  return `<svg class="mz-svg" viewBox="0 0 240 310" aria-hidden="true" focusable="false"><defs>
<pattern id="mzPlaid-${u}" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" style="fill:var(--mz-shirt)"/><rect y="5" width="18" height="7" style="fill:var(--mz-shirt-dk);opacity:.55"/><rect x="5" width="7" height="18" style="fill:var(--mz-shirt-dk);opacity:.55"/><rect y="8" width="18" height="1.2" fill="#fff" opacity=".2"/><rect x="8" width="1.2" height="18" fill="#fff" opacity=".2"/></pattern>
<pattern id="mzBlanket-${u}" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#6d5ce8"/><rect width="11" height="22" fill="#7f70f2"/><rect y="10" width="22" height="2" fill="#ffc23a" opacity=".7"/></pattern>
<radialGradient id="mzSkinHi-${u}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="mzLens-${u}" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#b9ecff"/><stop offset=".55" stop-color="#3f8fc4"/><stop offset="1" stop-color="#1b3b5e"/></radialGradient>
<linearGradient id="mzGold-${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0a6"/><stop offset=".45" stop-color="#f2bd36"/><stop offset="1" stop-color="#b9781a"/></linearGradient>
<linearGradient id="mzTee-${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf6ea"/><stop offset="1" stop-color="#e9e0cc"/></linearGradient></defs>
<g class="mzj-root">
<ellipse class="mzj-shadow" cx="120" cy="297" rx="46" ry="7" fill="rgba(0,0,0,.2)"/>
<g class="mzj-pillow"><path class="zo" d="M150,270 Q147,261 158,261 Q199,254 240,261 Q251,261 249,270 Q253,283 249,291 Q250,300 239,299 Q199,304 159,299 Q148,300 150,291 Q145,280 150,270 Z" fill="#bcd3ff"/>
  <path d="M160,268 Q199,262 238,268" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".75"/><path d="M162,292 Q199,297 236,292" fill="none" stroke="rgba(40,60,120,.22)" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M176,276 l3,3 m10,-4 l3,3 m10,-3 l3,3 m10,-4 l3,3 m10,-2 l3,3" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".55"/></g>
<g class="mzj-chute"><path d="M42,-40 L70,92 M82,-40 L72,90 M158,-40 L168,90 M198,-40 L170,92" fill="none" stroke="var(--mz-ink)" stroke-width="1.4"/>
  <path class="zo" d="M40,-40 C40,-100 80,-126 120,-126 C160,-126 200,-100 200,-40 Q180,-50 160,-40 Q140,-50 120,-40 Q100,-50 80,-40 Q60,-50 40,-40 Z" fill="var(--mz-acc)"/>
  <path d="M80,-40 C82,-96 100,-125 120,-126 C140,-125 158,-96 160,-40 Q140,-50 120,-40 Q100,-50 80,-40 Z" fill="#fff" opacity=".88"/></g>
<g class="mzj-body">
  <g class="mzj-cape"><path class="zo" d="M86,154 Q120,146 154,154 L178,262 Q164,255 150,266 Q135,257 120,268 Q105,257 90,266 Q76,255 62,262 Z" fill="var(--mz-acc)"/><path d="M92,160 Q120,154 148,160 L160,220 Q120,210 80,220 Z" fill="rgba(0,0,0,.2)"/></g>
  <g transform="translate(107 228)"><g class="mzj-legL"><path class="zo zjn" d="M-12,-2 H12 L11,54 H-11 Z"/><path d="M4,4 L3,46" stroke="rgba(0,0,0,.16)" stroke-width="1.5"/><path class="zo zjn2" d="M-12,47 H12 V56 H-12 Z"/>
    <path class="zo zshoe" d="M-17,60 Q-17,52 -8,52 H8 Q13,52 13,60 V63 Q13,67 8,67 H-13 Q-18,67 -17,60 Z"/><path d="M-17,63.5 H13" stroke="var(--mz-acc)" stroke-width="2"/><path d="M-6,55.5 h8 M-6,58.5 h8" stroke="#b9b9b2" stroke-width="1.4"/></g></g>
  <g transform="translate(133 228)"><g class="mzj-legR"><path class="zo zjn" d="M-12,-2 H12 L11,54 H-11 Z"/><path d="M-4,4 L-3,46" stroke="rgba(0,0,0,.16)" stroke-width="1.5"/><path class="zo zjn2" d="M-12,47 H12 V56 H-12 Z"/>
    <path class="zo zshoe" d="M17,60 Q17,52 8,52 H-8 Q-13,52 -13,60 V63 Q-13,67 -8,67 H13 Q18,67 17,60 Z"/><path d="M17,63.5 H-13" stroke="var(--mz-acc)" stroke-width="2"/><path d="M6,55.5 h-8 M6,58.5 h-8" stroke="#b9b9b2" stroke-width="1.4"/></g></g>
  <g class="mzj-upper">
    <path class="zo zsk" d="M110,120 H130 V156 H110 Z"/><path class="zsd" d="M110,136 H130 V148 Q120,153 110,148 Z"/>
    <path class="zo zjn" d="M88,212 H152 L155,236 Q120,242 85,236 Z"/>
    <path class="zo" fill="${T}" d="M84,156 C92,150 100,148 108,148 Q120,158 132,148 C140,148 148,150 156,156 C161,182 160,204 158,226 Q120,232 82,226 C80,204 79,182 84,156 Z"/>
    <path d="M110,196 Q120,200 130,196" fill="none" stroke="rgba(120,90,40,.25)" stroke-width="1.6"/>
    <path class="zo" fill="${P}" d="M84,156 C92,150 100,148 106,148 L100,168 L108,228 Q94,229 82,226 C80,204 79,182 84,156 Z"/>
    <path class="zo" fill="${P}" d="M156,156 C148,150 140,148 134,148 L140,168 L132,228 Q146,229 158,226 C160,204 161,182 156,156 Z"/>
    <path class="zo zsh2" d="M106,148 L99,168 L91,153 Q99,149 106,148 Z"/><path class="zo zsh2" d="M134,148 L141,168 L149,153 Q141,149 134,148 Z"/>
    <rect class="zo" fill="${P}" x="86" y="175" width="13" height="12" rx="2" stroke-width="1.6"/><circle cx="103" cy="190" r="1.7" fill="var(--mz-ink)"/><circle cx="104.5" cy="208" r="1.7" fill="var(--mz-ink)"/>
    <g class="mzj-head">
      <g data-mzhair="curly">${circles(CURL_BACK, "zhro")}${circles(CURL_BACK, "zhr")}${curlHi(CURL_BACK)}</g>
      <ellipse class="zo zsk" cx="76" cy="103" rx="8.5" ry="11.5"/><path d="M74,98 Q71,104 75,109" fill="none" stroke="rgba(110,40,10,.35)" stroke-width="1.8"/>
      <ellipse class="zo zsk" cx="164" cy="103" rx="8.5" ry="11.5"/><path d="M166,98 Q169,104 165,109" fill="none" stroke="rgba(110,40,10,.35)" stroke-width="1.8"/>
      <path class="zo zsk" d="M120,52 C151,52 165,74 164,101 C163,130 145,149 120,149 C95,149 77,130 76,101 C75,74 89,52 120,52 Z"/>
      <path class="zsd" d="M164,101 C163,130 145,149 120,149 C138,143 154,127 157,104 Z"/><ellipse cx="104" cy="84" rx="24" ry="18" fill="url(#mzSkinHi-${u})"/>
      <g data-mzbeard="trim"><path class="zo zbd" d="${JAW}"/><path class="zo zbd" stroke-width="1.8" d="M103,125 C108,118 116,118 120,121 C124,118 132,118 137,125 C131,123 125,124 120,126 C115,124 109,123 103,125 Z"/></g>
      <g data-mzbeard="stubble"><path class="zstub" d="${JAW}"/><path class="zstub" d="M103,125 C108,119 116,119 120,121 C124,119 132,119 137,125 C131,123 125,124 120,126 C115,124 109,123 103,125 Z"/></g>
      <ellipse class="mzj-blush" cx="92" cy="117" rx="6.5" ry="3.6" fill="#ff6f61" opacity=".28"/><ellipse class="mzj-blush" cx="148" cy="117" rx="6.5" ry="3.6" fill="#ff6f61" opacity=".28"/>
      <g data-mzm="grin"><path class="zo" d="M106,128 Q120,130 134,128 Q131,143 120,143 Q109,143 106,128 Z" fill="#5c1f1b"/><path d="M108,129.3 L132,129.3 L131,133.5 Q120,135.5 109,133.5 Z" fill="#fff"/><ellipse cx="120" cy="139.5" rx="6" ry="2.8" fill="#e46a5f"/></g>
      <path data-mzm="smile" class="zln" d="M108,130 Q120,139 132,130"/>
      <ellipse data-mzm="open" class="zo" cx="120" cy="134" rx="6.5" ry="8" fill="#5c1f1b"/>
      <ellipse data-mzm="o" class="zo" cx="121" cy="134" rx="3.6" ry="4.2" fill="#5c1f1b"/>
      <path data-mzm="sleep" class="zln" d="M113,133 Q120,137 127,133"/>
      <path data-mzm="flat" class="zln" d="M110,134 H130"/>
      <path data-mzm="sad" class="zln" d="M109,138 Q120,129 131,138"/>
      <path d="M119,103 C116,111 114,115 119,117 C122,118 125,116 126,114" fill="none" stroke="rgba(90,35,15,.5)" stroke-width="2.2" stroke-linecap="round"/>
      <g transform="translate(103 100)">${EYE("L")}</g><g transform="translate(137 100)">${EYE("R")}</g>
      <g class="mzj-brows"><path class="zbrow" d="M92,86 Q102,79 113,84"/><path class="zbrow" d="M127,84 Q138,79 148,86"/></g>
      <g data-mzhair="curly">${circles(CURL_FRONT, "zhro")}${circles(CURL_FRONT, "zhr")}${curlHi(CURL_FRONT)}</g>
      <g data-mzhair="swept"><path class="zo zhr" d="M77,98 C70,62 92,36 122,38 C152,34 172,58 163,96 C160,80 150,70 138,70 C146,62 136,54 124,60 C112,52 94,62 92,74 C86,78 80,86 77,98 Z"/><path class="zhi" d="M100,50 Q118,40 140,44"/></g>
      <g data-mzhair="short"><path class="zo zhr" d="M77,94 C74,62 96,44 120,44 C146,44 166,60 163,94 C156,76 140,66 120,66 C102,66 86,74 77,94 Z"/><path class="zhi" d="M98,54 Q118,46 138,50"/></g>
      <g data-mzhat="night"><path class="zo" d="M80,74 Q84,30 124,28 Q162,30 176,68 Q196,86 208,112 Q190,98 168,78 Q148,64 122,62 Q96,62 80,74 Z" fill="#4b5bd6"/><path class="zo" d="M77,76 Q120,56 168,76 L170,86 Q120,66 75,86 Z" fill="#fff"/><circle class="zo" cx="209" cy="115" r="8" fill="#fff"/><circle cx="110" cy="44" r="2.5" fill="#ffd34d"/><circle cx="140" cy="48" r="2" fill="#ffd34d"/></g>
      <g data-mzhat="party"><path class="zo" d="M98,56 L122,-6 L146,56 Q122,63 98,56 Z" fill="#ffc23a"/><path d="M106,38 L138,38 M111,22 L133,22" stroke="var(--mz-acc)" stroke-width="4"/><circle class="zo" cx="122" cy="-9" r="6.5" fill="var(--mz-acc)"/></g>
      <g data-mzhat="tupi"><path class="zo" d="M84,66 Q86,40 120,38 Q154,40 156,66 Q120,56 84,66 Z" fill="#fdfcf7"/><path d="M90,58 Q120,50 150,58" fill="none" stroke="#d9c98f" stroke-width="2" stroke-dasharray="3 3"/></g>
      <g data-mzgl><rect class="zo" x="90" y="89" width="26" height="22" rx="8" fill="rgba(255,255,255,.14)"/><rect class="zo" x="124" y="89" width="26" height="22" rx="8" fill="rgba(255,255,255,.14)"/><path class="zln" d="M116,97 Q120,94 124,97"/></g>
      <g class="mzj-shades"><path class="zo" d="M88,90 H116 Q117,109 103,111 Q89,110 88,90 Z" fill="#14161c"/><path class="zo" d="M124,90 H152 Q151,110 137,111 Q123,109 124,90 Z" fill="#14161c"/><path class="zln" d="M116,93 Q120,90 124,93"/><path d="M92,94 L101,94 M128,94 L137,94" stroke="#fff" stroke-opacity=".45" stroke-width="2.4" stroke-linecap="round"/></g>
    </g>
    <g data-mzprop="laptop"><path class="zo" d="M80,172 Q80,166 86,166 H154 Q160,166 160,172 V206 H80 Z" fill="#c9cfda"/><path d="M120,192 c-6,-5 -9,-8 -9,-11 a4.5,4.5 0 0 1 9,-1 a4.5,4.5 0 0 1 9,1 c0,3 -3,6 -9,11 z" fill="var(--mz-acc)" opacity=".85"/><rect class="zo" x="72" y="204" width="96" height="7" rx="3" fill="#a7afbe"/></g>
    <g data-mzprop="book"><rect class="zo" x="91" y="164" width="58" height="44" rx="3" fill="#ffc23a"/><rect x="91" y="164" width="7" height="44" fill="rgba(0,0,0,.18)"/><rect x="104" y="174" width="36" height="4" rx="2" fill="rgba(0,0,0,.35)"/><rect x="104" y="182" width="26" height="3" rx="1.5" fill="rgba(0,0,0,.25)"/><path d="M122,192 l3,6 6,1 -4.5,4 1.2,6 -5.7,-3 -5.7,3 1.2,-6 -4.5,-4 6,-1 z" fill="#fff" opacity=".85"/></g>
    <g data-mzprop="cake"><ellipse class="zo" cx="120" cy="207" rx="36" ry="6" fill="#fff"/><rect class="zo" x="93" y="176" width="54" height="29" rx="5" fill="#ff8fb1"/><path d="M93,182 Q99,190 105,182 Q111,190 117,182 Q123,190 129,182 Q135,190 141,182 L147,182 V181 Q147,176 142,176 H98 Q93,176 93,181 Z" fill="#fff"/><circle cx="104" cy="196" r="2" fill="#ffc23a"/><circle cx="120" cy="198" r="2" fill="#7cc6ff"/><circle cx="136" cy="196" r="2" fill="#7cf0c4"/><rect class="zo" x="117.5" y="159" width="5" height="17" rx="1.5" fill="#7cc6ff" stroke-width="1.5"/><path class="zflame" d="M120,144 Q127,153 120,159 Q113,153 120,144 Z" fill="#ffb02e"/></g>
    <g transform="translate(156 158)">${ARM("R", PROPS, "M-5,-6 Q-12,-8 -10.5,-1 Q-9,2 -6,1")}</g>
    <g transform="translate(84 158)">${ARM("L", "", "M5,-6 Q12,-8 10.5,-1 Q9,2 6,1")}</g>
  </g>
</g>
<g class="mzj-blanket"><path class="zo" d="M-22,297 L-22,216 Q-20,198 2,200 Q40,192 80,197 Q118,191 140,203 Q148,210 148,297 Z" fill="url(#mzBlanket-${u})"/><path d="M-18,213 Q40,203 144,212" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="5" stroke-linecap="round"/></g>
<circle class="mzj-snot" cx="168" cy="236" r="0" fill="rgba(170,220,255,.55)" stroke="rgba(80,140,200,.75)" stroke-width="1.5"/>
<g class="mzj-ball"><g data-mzball="foot"><circle class="zo" r="22" fill="#fff"/><path d="M0,-8.5 L8.1,-2.6 5,7 -5,7 -8.1,-2.6 Z" fill="var(--mz-ink)"/>
  <path d="M0,-8.5 V-16 M8.1,-2.6 L15.4,-5 M5,7 L9.5,13.3 M-5,7 L-9.5,13.3 M-8.1,-2.6 L-15.4,-5" stroke="var(--mz-ink)" stroke-width="2"/>
  <path d="M-6.5,-20.9 L0,-16 6.5,-20.9 Q0,-22.6 -6.5,-20.9 Z M15.4,-5 L19.9,-10.4 Q21.7,-4 21.3,2.2 Z M9.5,13.3 L16.5,14.3 Q12.6,19.4 6.4,21.4 Z M-9.5,13.3 L-6.4,21.4 Q-12.6,19.4 -16.5,14.3 Z M-15.4,-5 L-21.3,2.2 Q-21.7,-4 -19.9,-10.4 Z" fill="var(--mz-ink)"/>
  <ellipse cx="-8" cy="-11" rx="6" ry="3.5" fill="#fff" opacity=".7" transform="rotate(-35 -8 -11)"/></g>
  <g data-mzball="cricket"><circle class="zo" r="9" fill="#c8242b"/><path d="M-6.4,-6.4 Q0,0 -6.4,6.4 M6.4,-6.4 Q0,0 6.4,6.4" fill="none" stroke="#f6e6c8" stroke-width="1.4" stroke-dasharray="2 1.6"/></g></g>
<g class="mzj-plane"><path class="zo" d="M0,0 L-28,-11 L-11,0 Z" fill="#fff"/><path class="zo" d="M0,0 L-28,11 L-11,0 Z" fill="#e8eefc"/></g>
</g></svg>`;
}

/** Him standing still, for the dashboard's "Where he stands" screens (no GSAP: mascot.css's .mzp-fig hides what moves). */
export const mascotStill = () => svgMarkup("still");

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** The rocket that takes him away when someone says goodbye: his own private rocket, its name painted on the side (settings.mascot.fun.rocketName). */
export function rocketSvg(name: string) {
  const words = String(name || "").trim().toUpperCase().split(/\s+/).filter(Boolean), last = words.length > 1 ? words.pop()! : "", top = words.join(" ");
  const fit = (t: string, per: number, max: number) => (t.length * per > max ? ` textLength="${max}" lengthAdjust="spacingAndGlyphs"` : "");
  const label = top ? `<rect x="35" y="124" width="50" height="${last ? 31 : 17}" rx="4" fill="var(--mz-acc)" stroke="var(--mz-ink)" stroke-width="1.6"/>
<text x="60" y="137.5" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="10" letter-spacing=".4" fill="#fff"${fit(top, 6.6, 44)}>${esc(top)}</text>
${last ? `<text x="60" y="150.5" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="9" letter-spacing="1.2" fill="#ffe38a"${fit(`★ ${last} ★`, 6.4, 44)}>★ ${esc(last)} ★</text>` : ""}` : "";
  return ROCKET_SVG.replace("<!--name-->", label);
}
const ROCKET_SVG = `<svg viewBox="0 0 120 260" aria-hidden="true" focusable="false"><defs><clipPath id="mzRkWin"><circle cx="60" cy="96" r="15"/></clipPath></defs>
<g class="mz-rk-flame"><path d="M42,198 Q60,262 78,198 Z" fill="#ffb02e"/><path d="M50,198 Q60,236 70,198 Z" fill="#fff3a6"/></g>
<path d="M30,148 L8,198 L36,188 Z" fill="var(--mz-acc)" stroke="var(--mz-ink)" stroke-width="2.4" stroke-linejoin="round"/><path d="M90,148 L112,198 L84,188 Z" fill="var(--mz-acc)" stroke="var(--mz-ink)" stroke-width="2.4" stroke-linejoin="round"/>
<rect x="47" y="186" width="26" height="12" rx="2" fill="#9aa3b6" stroke="var(--mz-ink)" stroke-width="2.4"/>
<path d="M60,8 C92,40 94,110 88,192 H32 C26,110 28,40 60,8 Z" fill="#f4f6fb" stroke="var(--mz-ink)" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M60,8 C76,24 84,40 87,56 H33 C36,40 44,24 60,8 Z" fill="var(--mz-acc)" stroke="var(--mz-ink)" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M33,166 H87" stroke="#d6dbe6" stroke-width="3"/><path d="M40,60 Q36,110 40,170" stroke="#fff" stroke-width="4" fill="none" opacity=".8"/><!--name-->
<circle cx="60" cy="96" r="20" fill="#2b3a5c" stroke="var(--mz-ink)" stroke-width="2.4"/><circle cx="60" cy="96" r="15" fill="#8fd3ff"/>
<g class="mz-rk-face" clip-path="url(#mzRkWin)" opacity="0"><circle cx="60" cy="102" r="10" fill="var(--mz-skin)"/><circle cx="51" cy="94" r="5" fill="var(--mz-hair)"/><circle cx="57" cy="90" r="5.5" fill="var(--mz-hair)"/><circle cx="64" cy="90" r="5.5" fill="var(--mz-hair)"/><circle cx="69" cy="95" r="4.5" fill="var(--mz-hair)"/>
<circle cx="56.5" cy="101" r="1.6" fill="#140b07"/><circle cx="63.5" cy="101" r="1.6" fill="#140b07"/><path d="M55.5,105.5 Q60,109.5 64.5,105.5" stroke="#5c1f1b" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>
<path d="M50,86 Q55,82 61,82" stroke="#fff" stroke-width="2.5" fill="none" opacity=".7" stroke-linecap="round"/></svg>`;

/** His materials, set as custom properties on whatever holds him. */
export function lookVars(m: MascotSettings, shirts: Record<string, readonly string[]>, jeans: Record<string, readonly string[]>): Record<string, string> {
  return {
    "--mz-skin": m.skin, "--mz-hair": "#2a1b15", "--mz-beard": "#6b3b26", "--mz-ink": "#24160f", "--mz-acc": "#ff5a46",
    "--mz-shirt": shirts[m.shirt][0], "--mz-shirt-dk": shirts[m.shirt][1], "--mz-jeans": jeans[m.jeans][0], "--mz-jeans-dk": jeans[m.jeans][1],
  };
}

export const REST: S = { x: 0, y: 0, sx: 1, sy: 1, flip: 0, rot: 0, lean: 0, upY: 0, head: 0, hx: 0, hy: 0, lx: 74, ly: 222, rx: 166, ry: 222, lg: 0, rg: 0, lk: 0, rk: 0, pa: 0, brow: 0, gx: 0, gy: 0, flash: 0 };
export const CLEAR: S = { cape: 0, capeW: 0, shades: 0, chute: 0, blush: 0, bo: 0, bub: 0, bed: 0, flame: 0, blanketY: 0 };
const restTo = (extra: S = {}, d = 0.35, ease = "power2.inOut") => ({ ...REST, ...CLEAR, ...extra, duration: d, ease });

let uidN = 0;
type Eyes = "open" | "happy" | "closed";

/* ---------------- the rig ---------------- */
export class Rig {
  host: HTMLElement; layer: HTMLElement; svg: SVGSVGElement; mirror = false; still: boolean;
  cfg: MascotSettings;
  s: S; tl: TL | null = null; loops: (Tw | TL)[] = []; ints: number[] = [];
  mouth = "grin"; eyes: Eyes = "open"; sleeping = false; bubOn = false; glTemp = false; hat: string | null = null;
  zzz = 0; snoreTl: TL | null = null; sayT = 0; flapI = 0; bubAt = 0; rect: DOMRect | null = null; rectAt = 0;
  bub: HTMLDivElement; qx: (v: number) => void; qy: (v: number) => void;
  /** set by the site: the box he stands in, so a move can slide him (the secret moonwalk) */
  wrap: HTMLElement | null = null; wrapDir = 1;
  /** true while he's acting for someone (a click, a throw, the rocket): then he keeps drawing even while the page scrolls */
  live = false;
  private el: Record<string, Element>; private blush: Element[]; private written = new Map<Element, string>(); private idle: (Tw | TL)[] = []; private alive = true;

  constructor(host: HTMLElement, layer: HTMLElement, cfg: MascotSettings, opts: { mirror?: boolean; still?: boolean } = {}) {
    this.host = host; this.layer = layer; this.cfg = cfg; this.still = !!opts.still;
    host.insertAdjacentHTML("afterbegin", svgMarkup(String(++uidN)));
    const svg = (this.svg = host.querySelector("svg.mz-svg") as SVGSVGElement);
    const q = (c: string) => svg.querySelector(c) as Element;
    this.el = {
      root: q(".mzj-root"), body: q(".mzj-body"), upper: q(".mzj-upper"), head: q(".mzj-head"), shL: q(".mzj-shL"), elL: q(".mzj-elL"), hpL: q(".mzj-hpL"), shR: q(".mzj-shR"), elR: q(".mzj-elR"), hpR: q(".mzj-hpR"),
      legL: q(".mzj-legL"), legR: q(".mzj-legR"), eyeL: q(".mzj-eyeL"), eyeR: q(".mzj-eyeR"), pupL: q(".mzj-pupL"), pupR: q(".mzj-pupR"), brows: q(".mzj-brows"), shadow: q(".mzj-shadow"),
      plane: q(".mzj-plane"), flash: q("[data-mzflash]"), cape: q(".mzj-cape"), shades: q(".mzj-shades"), chute: q(".mzj-chute"), pillow: q(".mzj-pillow"), blanket: q(".mzj-blanket"),
      snot: q(".mzj-snot"), ball: q(".mzj-ball"), flame: q(".zflame"), gl: q("[data-mzgl]"), football: q('[data-mzball="foot"]'), cball: q('[data-mzball="cricket"]'),
    };
    this.blush = [...svg.querySelectorAll(".mzj-blush")];
    this.s = { ...REST, ...CLEAR, lookX: 0, lookY: 0, blink: 1, breath: 0, plX: 0, plY: 0, plR: 0, plO: 0, bx: 0, by: 0, br: 0, ck: 0, nod: 0, bob: 0 };
    this.qx = G.quickTo(this.s, "lookX", { duration: 0.45, ease: "power3" }); this.qy = G.quickTo(this.s, "lookY", { duration: 0.45, ease: "power3" });
    this.bub = document.createElement("div"); this.bub.className = "mz-bub"; this.bub.setAttribute("aria-live", "polite"); layer.appendChild(this.bub);
    this.face("grin", "open"); this.setProp(null); this.setHat(null); this.setLook(cfg); this.setMirror(!!opts.mirror);
    this.render = this.render.bind(this); G.ticker.add(this.render);
    this.calm(this.still);
  }
  /** breathing and blinking on or off (off with reduced motion and on slow devices) */
  calm(on: boolean) {
    this.idle.forEach((t) => t.kill()); this.idle = [];
    if (on) { this.s.breath = 0; return; }
    this.idle.push(G.to(this.s, { breath: 1, duration: 1.8, yoyo: true, repeat: -1, ease: "sine.inOut" }));
    const blink = () => { if (!this.alive) return; const d = G.delayedCall(1.8 + Math.random() * 3.6, () => {
      if (!this.sleeping && this.eyes === "open") { G.to(this.s, { blink: 0.06, duration: 0.07, yoyo: true, repeat: 1, ease: "power1.in" }); if (Math.random() < 0.2) G.to(this.s, { blink: 0.06, duration: 0.07, yoyo: true, repeat: 1, delay: 0.28 }); }
      blink(); }); this.idle.push(d as unknown as Tw); };
    blink();
  }
  destroy() { this.alive = false; this.kill(); this.calm(true); G.ticker.remove(this.render); clearInterval(this.zzz); this.snoreTl?.kill(); clearTimeout(this.sayT); clearInterval(this.flapI); G.killTweensOf(this.s); this.bub.remove(); this.svg.remove(); }
  setMirror(m: boolean) { this.mirror = m; this.el.root.setAttribute("transform", m ? "translate(240 0) scale(-1 1)" : ""); }
  private ik(sx: number, sy: number, tx: number, ty: number, side: "L" | "R", sg: Record<string, number>) {
    const A = 36, B = 32, dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy) || 0.001;
    const dc = clamp(d, Math.abs(A - B) + 3, A + B - 0.4), phi = Math.atan2(dy, dx), al = Math.acos(clamp((A * A + dc * dc - B * B) / (2 * A * dc), -1, 1)), out = side === "L" ? -1 : 1;
    const c = [1, -1].map((g) => { const th = phi + g * al, ex = sx + A * Math.cos(th); return { g, th, ex, ey: sy + A * Math.sin(th), sc: out * (ex - 120) }; });
    let p = c[0].sc >= c[1].sc ? c[0] : c[1]; const prev = c.find((o) => o.g === sg[side]);
    if (prev && p !== prev && Math.abs(p.sc - prev.sc) < 5) p = prev; sg[side] = p.g;
    const hx = sx + dc * Math.cos(phi), hy = sy + dc * Math.sin(phi), ps = Math.atan2(hy - p.ey, hx - p.ex);
    const r1 = (p.th * 180) / Math.PI - 90; let r2 = ((ps - p.th) * 180) / Math.PI; r2 = (((r2 % 360) + 540) % 360) - 180; return [r1, r2];
  }
  private sg: Record<string, number> = { L: 1, R: -1 };
  private w(el: Element, name: string, v: string) { const k = this.written.get(el); const key = name + v; if (k === key) return; this.written.set(el, key); el.setAttribute(name, v); }
  private show(el: Element, on: boolean) { const v = on ? "" : "none"; if ((el as SVGElement).style.display !== v) (el as SVGElement).style.display = v; }
  render() {
    if (!this.alive || this.host.offsetParent === null) return;
    if (!this.live && document.documentElement.classList.contains("scrolling")) return; // rests while the page scrolls, unless he's doing something now
    const s = this.s, e = this.el, f = (n: number) => Math.round(n * 100) / 100;
    this.w(e.body, "transform", `translate(${f(s.x)} ${f(s.y)}) rotate(${f(s.flip)} 120 190) rotate(${f(s.rot)} 120 296) translate(120 296) scale(${f(s.sx)} ${f(s.sy)}) translate(-120 -296)`);
    this.w(e.upper, "transform", `translate(0 ${f(s.upY + s.bob - s.breath * 1.4)}) rotate(${f(s.lean)} 120 228)`);
    const lx = clamp(s.lookX + s.gx, -1, 1), ly = clamp(s.lookY + s.gy, -1, 1);
    this.w(e.head, "transform", `translate(${f(s.hx + lx * 1.6)} ${f(s.hy + s.breath * 0.4)}) rotate(${f(s.head + s.nod + lx * 5)} 120 150)`);
    const L = this.ik(84, 158, s.lx, s.ly, "L", this.sg), R = this.ik(156, 158, s.rx, s.ry, "R", this.sg);
    this.w(e.shL, "transform", `rotate(${f(L[0])})`); this.w(e.elL, "transform", `translate(0 36) rotate(${f(L[1])})`); this.w(e.hpL, "transform", `rotate(${f(-(L[0] + L[1]))})`);
    this.w(e.shR, "transform", `rotate(${f(R[0])})`); this.w(e.elR, "transform", `translate(0 36) rotate(${f(R[1])})`); this.w(e.hpR, "transform", `rotate(${f(-(R[0] + R[1]) + s.pa)})`);
    this.w(e.legL, "transform", `rotate(${f(s.lg)}) translate(0 ${f(-s.lk)})`); this.w(e.legR, "transform", `rotate(${f(s.rg)}) translate(0 ${f(-s.rk)})`);
    const b = this.eyes === "closed" ? 0.08 : s.blink; this.w(e.eyeL, "transform", `scale(1 ${f(b)})`); this.w(e.eyeR, "transform", `scale(1 ${f(b)})`);
    const pt = `translate(${f(lx * 2.8)} ${f(ly * 2.6)})`; this.w(e.pupL, "transform", pt); this.w(e.pupR, "transform", pt);
    this.w(e.brows, "transform", `translate(0 ${f(-s.brow * 3)})`);
    const h = Math.max(0, -s.y), lie = h < 2 ? clamp(Math.abs(s.flip) / 90, 0, 1) : 0;
    this.w(e.shadow, "rx", String(f(46 * (1 - Math.min(0.55, h / 220)) + 72 * lie))); this.w(e.shadow, "opacity", String(f(1 - Math.min(0.6, h / 200))));
    this.show(e.cape, s.cape > 0.01); if (s.cape > 0.01) this.w(e.cape, "transform", `translate(120 154) skewX(${f(s.capeW)}) scale(1 ${f(s.cape)}) translate(-120 -154)`);
    this.show(e.shades, s.shades > 0.01); if (s.shades > 0.01) { this.w(e.shades, "transform", `translate(0 ${f(-(1 - s.shades) * 30)})`); this.w(e.shades, "opacity", String(f(s.shades))); }
    const bl = String(f(Math.min(1, 0.28 + 0.5 * s.blush))); this.blush.forEach((x) => this.w(x, "opacity", bl));
    this.show(e.chute, s.chute > 0.01); if (s.chute > 0.01) { this.w(e.chute, "transform", `translate(120 -40) scale(1 ${f(s.chute)}) translate(-120 40)`); this.w(e.chute, "opacity", String(f(Math.min(1, s.chute * 2)))); }
    const bed = s.bed > 0.01; this.show(e.pillow, bed); this.show(e.blanket, bed);
    if (bed) { this.w(e.pillow, "opacity", String(f(s.bed))); this.w(e.pillow, "transform", `translate(199 296) scale(${f(0.4 + 0.6 * s.bed)}) translate(-199 -296)`); this.w(e.blanket, "opacity", String(f(s.bed))); this.w(e.blanket, "transform", `translate(0 ${f(s.blanketY)}) translate(0 297) scale(1 ${f(1 + s.breath * 0.04)}) translate(0 -297)`); }
    this.show(e.snot, s.bub > 0.6); if (s.bub > 0.6) { this.w(e.snot, "r", String(f(s.bub))); this.w(e.snot, "cx", String(f(170 - s.bub * 0.8))); this.w(e.snot, "cy", String(f(236 - s.bub * 0.4))); }
    this.show(e.ball, s.bo > 0.01); if (s.bo > 0.01) { this.show(e.football, s.ck < 0.5); this.show(e.cball, s.ck >= 0.5); this.w(e.ball, "transform", `translate(${f(s.bx)} ${f(s.by)}) rotate(${f(s.br)})`); this.w(e.ball, "opacity", String(f(s.bo))); }
    this.w(e.flame, "opacity", String(f(s.flame)));
    this.show(e.plane, s.plO > 0.01); if (s.plO > 0.01) { this.w(e.plane, "transform", `translate(${f(s.plX)} ${f(s.plY)}) rotate(${f(s.plR)})`); this.w(e.plane, "opacity", String(f(s.plO))); }
    this.w(e.flash, "opacity", String(f(s.flash)));
    if (this.bubOn) { const n = performance.now(); if (n - this.bubAt > 90) { this.bubAt = n; this.placeBub(); } }
  }
  /** a point of his drawing, in the layer's pixels */
  pt(x: number, y: number): [number, number] {
    const m = (this.el.root as SVGGraphicsElement).getScreenCTM(); if (!m) return [0, 0];
    const q = new DOMPoint(x, y).matrixTransform(m), L = this.layer.getBoundingClientRect(); return [q.x - L.left, q.y - L.top];
  }
  setMouth(m: string, temp = false) { if (!temp) this.mouth = m; this.svg.querySelectorAll<SVGElement>("[data-mzm]").forEach((g) => { g.style.display = g.dataset.mzm === m ? "" : "none"; }); }
  setEyes(v: Eyes) { this.eyes = v; const hap = v === "happy"; [this.el.eyeL, this.el.eyeR].forEach((g) => ((g as SVGElement).style.display = hap ? "none" : "")); this.svg.querySelectorAll<SVGElement>("[data-mzeh]").forEach((g) => { g.style.display = hap ? "" : "none"; }); }
  face(m: string, eyes?: Eyes) { this.setMouth(m); if (eyes) this.setEyes(eyes); }
  setProp(p: string | null) { this.svg.querySelectorAll<SVGElement>("[data-mzprop]").forEach((g) => { g.style.display = g.dataset.mzprop === p ? "" : "none"; }); }
  setHat(h: string | null) { this.hat = h; this.svg.querySelectorAll<SVGElement>("[data-mzhat]").forEach((g) => { g.style.display = g.dataset.mzhat === h ? "" : "none"; }); }
  setGl(v: boolean) { this.glTemp = v; (this.el.gl as SVGElement).style.display = this.cfg.glasses || v ? "" : "none"; }
  setLook(c: MascotSettings) {
    this.cfg = c;
    this.svg.querySelectorAll<SVGElement>("[data-mzhair]").forEach((g) => { g.style.display = g.dataset.mzhair === c.hair ? "" : "none"; });
    this.svg.querySelectorAll<SVGElement>("[data-mzbeard]").forEach((g) => { g.style.display = g.dataset.mzbeard === c.beard ? "" : "none"; });
    this.setGl(this.glTemp);
  }
  /** eyes and head turn toward a point on the screen (his box's position is read at most four times a second) */
  lookAt(x: number, y: number, on: boolean) {
    if (!on || this.sleeping) { this.qx(0); this.qy(0); return; }
    const n = performance.now(); if (!this.rect || n - this.rectAt > 250) { this.rect = this.svg.getBoundingClientRect(); this.rectAt = n; }
    const b = this.rect; if (!b.width) return;
    let dx = (x - (b.left + b.width / 2)) / 260; const dy = (y - (b.top + b.height * 0.32)) / 220; if (this.mirror) dx = -dx;
    this.qx(clamp(dx, -1, 1)); this.qy(clamp(dy, -1, 1));
  }
  run(build: (t: TL, s: S) => void) { this.kill(); const t = G.timeline(); this.tl = t; build(t, this.s); return t; }
  stopLoops() { this.loops.forEach((l) => l.kill()); this.loops = []; this.ints.forEach(clearInterval); this.ints = []; }
  kill() { if (this.tl) { this.tl.kill(); this.tl = null; } this.stopLoops(); }
  loop<T extends Tw | TL>(tw: T) { this.loops.push(tw); return tw; }
  every(ms: number, fn: () => void) { this.ints.push(window.setInterval(fn, ms)); }
  begin(prop: string | null, mouth = "grin", eyes: Eyes = "open") {
    return this.run((t) => { t.to(this.s, restTo()); t.call(() => { this.setProp(prop); this.face(mouth, eyes); this.setGl(false); }); });
  }
  rest(t: TL, d = 0.5) { t.call(() => this.stopLoops()); t.to(this.s, restTo({}, d)); t.call(() => { this.setProp(null); this.face("grin", "open"); this.setGl(false); }); return t; }
  burst(chars: string[], x: number, y: number, n = 4, cls = "", spread = 90) {
    const L = this.layer; if (L.querySelectorAll(".mz-p").length > 34) return;
    const [px, py] = this.pt(x + this.s.x, y + this.s.y);
    for (let i = 0; i < n; i++) {
      const sp = document.createElement("span"); sp.className = "mz-p " + cls; sp.textContent = chars[i % chars.length]; sp.style.left = px + "px"; sp.style.top = py + "px"; L.appendChild(sp);
      G.fromTo(sp, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 0.3, opacity: 0 }, { x: (Math.random() - 0.5) * spread, y: -55 - Math.random() * 70, rotation: (Math.random() - 0.5) * 50, scale: 1, opacity: 1, duration: 0.55, delay: i * 0.07, ease: "power2.out",
        onComplete() { G.to(sp, { opacity: 0, y: "-=34", duration: 0.7, delay: 0.15, ease: "power1.in", onComplete: () => sp.remove() }); } });
    }
  }
  placeBub() {
    const b = this.bub, [px, py] = this.pt(120 + this.s.x, 22 + this.s.y);
    const lw = this.layer.clientWidth, lh = this.layer.clientHeight, bw = b.offsetWidth, bh = b.offsetHeight;
    const left = clamp(px - bw / 2, 8, Math.max(8, lw - bw - 8)), top = clamp(py - bh - 10, 8, Math.max(8, lh - bh - 8));
    b.style.left = left + "px"; b.style.top = top + "px"; b.style.setProperty("--tail", clamp(px - left, 16, bw - 16) + "px");
  }
  /** set by the site while his chat is open: what he says goes into the chat instead of the bubble over his head */
  sayHook: ((text: string) => boolean | "quiet") | null = null;
  say(text: string, ms?: number) {
    if (!text) return;
    const hooked = this.sayHook?.(text);
    if (hooked) { if (this.bubOn) this.hush(); if (hooked !== "quiet") this.flap(text); return; }
    const b = this.bub; fillWords(b, text); this.bubOn = true; this.placeBub(); this.bubAt = performance.now();
    G.killTweensOf(b); G.fromTo(b, { opacity: 0, scale: 0.7, y: 8 }, { opacity: 1, scale: 1, y: 0, duration: this.still ? 0.01 : 0.38, ease: "back.out(2.2)" });
    clearTimeout(this.sayT); this.sayT = window.setTimeout(() => G.to(b, { opacity: 0, scale: 0.9, duration: 0.25, onComplete: () => { this.bubOn = false; } }), ms || Math.max(2400, text.length * 75));
    this.flap(text);
  }
  /** his mouth moves while he talks */
  private flap(text: string) {
    if (this.sleeping || this.still) return; clearInterval(this.flapI); let n = Math.min(16, Math.ceil(text.length / 3.5)), o = false;
    this.flapI = window.setInterval(() => { if (this.sleeping || n-- <= 0) { clearInterval(this.flapI); if (!this.sleeping) this.setMouth(this.mouth); return; } o = !o; this.setMouth(o ? "open" : this.mouth, true); }, 105);
  }
  hush() { clearTimeout(this.sayT); clearInterval(this.flapI); G.to(this.bub, { opacity: 0, duration: 0.15, onComplete: () => { this.bubOn = false; } }); }
  launchPlane(x: number, y: number) { const s = this.s; G.killTweensOf(s, "plX,plY,plR,plO"); Object.assign(s, { plX: x, plY: y, plR: -14, plO: 1 });
    G.to(s, { plX: x + 250, plY: y - 150, plR: -28, duration: 1.5, ease: "power1.in" }); G.to(s, { plO: 0, duration: 0.4, delay: 1.1 }); }
  /** an answer's sentences, one version picked at random each time it's asked */
  linesOf(k: keyof MascotSettings["qa"]) { return answer(String(this.cfg.qa[k]?.a || "")); }
}

/**
 * Puts a sentence into a bubble as one span per word, so the bubble has its final size from the start and the words fade in
 * smoothly, one after another (CSS: .mz-w, with --i for the corner bubble's delay; the talking scene adds .on itself).
 */
export function fillWords(el: HTMLElement, text: string): HTMLElement[] {
  el.textContent = ""; const out: HTMLElement[] = [];
  text.split(/(\s+)/).forEach((p) => {
    if (!p) return; if (/^\s+$/.test(p)) { el.appendChild(document.createTextNode(" ")); return; }
    const w = document.createElement("span"); w.className = "mz-w"; w.textContent = p; w.style.setProperty("--i", String(out.length)); el.appendChild(w); out.push(w);
  });
  return out;
}

/* ---------------- shared bits of timeline ---------------- */
export function talkSeq(t: TL, r: Rig, lines: string[]) { lines.forEach((ln) => { const d = Math.max(1.5, Math.min(4.5, ln.length * 0.058)); t.call(() => r.say(ln, d * 1000 + 250)); t.to({}, { duration: d }); }); }
const hop = (t: TL, s: S, n = 1) => t.to(s, { y: -12, duration: 0.16, yoyo: true, repeat: n * 2 - 1, ease: "power2.out" });
const tl = () => G.timeline();
type Act = (r: Rig) => TL;

/* ---------------- each section's move ---------------- */
export const BITS: Record<string, Act> = {
  hero(r) { const s = r.s, t = r.begin(null, "grin");
    t.to(s, { rx: 182, ry: 100, lx: 78, ly: 220, head: -4, brow: 0.6, duration: 0.5, ease: "back.out(1.7)" });
    const w = G.timeline({ repeat: 5, yoyo: true }); w.to(s, { rx: 195, ry: 113, duration: 0.2, ease: "sine.inOut" }); t.add(w);
    t.to(s, { y: -7, duration: 0.2, yoyo: true, repeat: 3, ease: "power1.out" }, "<"); return r.rest(t); },
  me(r) { const s = r.s, t = r.begin(null, "grin");
    t.to(s, { rx: 126, ry: 178, lx: 88, ly: 214, brow: 0.4, duration: 0.55, ease: "power3.out" });
    const lp = G.timeline({ repeat: -1, repeatDelay: 1.3 }); lp.to(s, { head: 6, hy: 2, duration: 0.25, ease: "sine.out" }).to(s, { head: 0, hy: 0, duration: 0.3 }).to(s, { upY: -3, sy: 1.025, duration: 0.35, ease: "sine.out" }).to(s, { upY: 0, sy: 1, duration: 0.45, ease: "sine.inOut" });
    t.add(lp); return t; },
  made(r) { const s = r.s, t = r.begin("laptop", "smile");
    t.to(s, { lx: 92, ly: 205, rx: 148, ry: 205, gy: 0.8, hy: 3, head: 2, duration: 0.5, ease: "power2.out" });
    const lp = G.timeline({ repeat: -1 }), ty = G.timeline({ repeat: 7 }); ty.to(s, { ly: 200, ry: 206, duration: 0.09 }).to(s, { ly: 206, ry: 200, duration: 0.09 });
    lp.add(ty).to(s, { gy: -0.1, hy: 0, head: -3, duration: 0.3, ease: "power2.out" }).call(() => r.face("grin")).to(s, { brow: 0.7, duration: 0.2 }).to({}, { duration: 0.7 }).to(s, { gy: 0.8, hy: 3, head: 2, brow: 0, duration: 0.3 }).call(() => r.face("smile"));
    t.add(lp); return t; },
  adventures(r) { const s = r.s, t = r.begin("bino", "smile");
    t.to(s, { lx: 110, ly: 104, rx: 130, ry: 104, duration: 0.55, ease: "power3.out" });
    const lp = G.timeline({ repeat: -1, repeatDelay: 0.4 });
    lp.to(s, { head: -7, lx: 105, rx: 125, hx: -2, lean: -2, duration: 1.1, ease: "sine.inOut" }).to(s, { head: 7, lx: 115, rx: 135, hx: 2, lean: 2, duration: 1.8, ease: "sine.inOut" }).to(s, { head: 0, lx: 110, rx: 130, hx: 0, lean: 0, duration: 0.9, ease: "sine.inOut" })
      .to(s, { lx: 96, ly: 176, rx: 150, ry: 176, duration: 0.35, ease: "power2.out" }).call(() => r.face("grin")).to(s, { brow: 1, y: -6, duration: 0.2, yoyo: true, repeat: 1 }).to({}, { duration: 0.6 }).call(() => r.face("smile")).to(s, { lx: 110, ly: 104, rx: 130, ry: 104, duration: 0.4, ease: "power2.inOut" });
    t.add(lp); return t; },
  influences(r) { const s = r.s, t = r.begin("book", "smile");
    t.to(s, { lx: 93, ly: 190, rx: 147, ry: 190, gy: 0.9, hy: 3, head: 3, duration: 0.5, ease: "power2.out" });
    const lp = G.timeline({ repeat: -1, repeatDelay: 0.3 }), rd = G.timeline({ repeat: 2 }); rd.to(s, { gx: -0.6, duration: 0.05 }).to(s, { gx: 0.6, duration: 1, ease: "none" });
    lp.add(rd).to(s, { gx: 0, gy: -0.1, hy: 0, head: -2, brow: 0.8, duration: 0.35 }).call(() => r.face("grin")).to(s, { ly: 186, ry: 186, duration: 0.25, yoyo: true, repeat: 1 }).to({}, { duration: 0.5 }).call(() => r.face("smile")).to(s, { gy: 0.9, hy: 3, head: 3, brow: 0, duration: 0.35 });
    t.add(lp); return t; },
  feed(r) { const s = r.s, t = r.begin("mega", "grin");
    t.to(s, { rx: 140, ry: 130, lx: 86, ly: 214, duration: 0.45, ease: "power3.out" });
    const lp = G.timeline({ repeat: -1, repeatDelay: 1.1 });
    lp.to(s, { lean: -5, upY: 1, brow: 0.4, duration: 0.35, ease: "power2.out" }).call(() => r.face("open")).to(s, { lean: 6, rx: 144, brow: -0.6, duration: 0.14, ease: "power3.out" }).call(() => r.burst(["!", "!!", "!"], 185, 110, 3, "bang", 60)).to(s, { lean: 5, duration: 0.7 }).call(() => r.face("grin")).to(s, { lean: 0, brow: 0, duration: 0.4, ease: "power2.inOut" });
    t.add(lp); return t; },
  growth(r) { const s = r.s, t = r.begin("trophy", "grin");
    t.to(s, { rx: 178, ry: 98, lx: 80, ly: 214, duration: 0.5, ease: "back.out(1.6)" });
    for (let i = 0; i < 2; i++) t.to(s, { sy: 0.88, sx: 1.08, duration: 0.14, ease: "power2.out" }).to(s, { y: -46, sy: 1.06, sx: 0.96, duration: 0.3, ease: "power2.out" }).call(() => { r.face("grin", "happy"); r.burst(["⭐", "✨", "🏆"], 178, 40, 4, "", 110); }).to(s, { y: 0, duration: 0.28, ease: "power2.in" }).to(s, { sy: 0.88, sx: 1.1, duration: 0.08 }).to(s, { sy: 1, sx: 1, duration: 0.45, ease: "elastic.out(1,.4)" });
    t.call(() => r.face("grin", "open")); const lp = G.timeline({ repeat: -1, yoyo: true }); lp.to(s, { ry: 92, head: -3, duration: 0.7, ease: "sine.inOut" }); t.add(lp); return t; },
  life(r) { const s = r.s, t = r.begin("camera", "smile");
    t.to(s, { rx: 136, ry: 106, lx: 104, ly: 110, duration: 0.5, ease: "power3.out" });
    const lp = G.timeline({ repeat: -1, repeatDelay: 1.4 });
    lp.to(s, { upY: -1, duration: 0.25 }).to(s, { flash: 1, duration: 0.05 }).call(() => r.burst(["📸"], 100, 70, 1, "", 30)).to(s, { flash: 0, duration: 0.4 }).to(s, { upY: 0, duration: 0.2 }).to(s, { rx: 166, ry: 188, lx: 90, ly: 206, duration: 0.4, ease: "power2.out" }).call(() => r.face("grin")).to(s, { brow: 0.8, duration: 0.2 }).to({}, { duration: 0.8 }).call(() => r.face("smile")).to(s, { rx: 136, ry: 106, lx: 104, ly: 110, brow: 0, duration: 0.4, ease: "power2.inOut" });
    t.add(lp); return t; },
  connect(r) { const s = r.s, t = r.begin("phone", "smile");
    t.to(s, { rx: 142, ry: 178, lx: 86, ly: 214, gy: 0.6, hy: 2, duration: 0.45, ease: "power3.out" });
    const lp = G.timeline({ repeat: -1, repeatDelay: 1.2 });
    lp.to(s, { ry: 174, duration: 0.1, yoyo: true, repeat: 5 }).to(s, { gy: 0, hy: 0, duration: 0.25 }).call(() => r.face("grin")).to(s, { rx: 150, ry: 160, duration: 0.15, ease: "power2.out" }).call(() => { r.launchPlane(150, 130); r.burst(["💌", "💛"], 150, 140, 2, "", 60); }).to(s, { rx: 142, ry: 178, duration: 0.3 }).to({}, { duration: 0.9 }).call(() => r.face("smile")).to(s, { gy: 0.6, hy: 2, duration: 0.3 });
    t.add(lp); return t; },
};

/* ---------------- tricks ---------------- */
export const TRICKS: Record<string, Act> = {
  wave(r) { const s = r.s, t = r.begin(null, "grin"); t.to(s, { rx: 182, ry: 100, head: -4, brow: 0.6, duration: 0.4, ease: "back.out(1.7)" }); const w = G.timeline({ repeat: 5, yoyo: true }); w.to(s, { rx: 195, ry: 113, duration: 0.18, ease: "sine.inOut" }); t.add(w); return r.rest(t); },
  flex(r) { const s = r.s, t = r.begin(null, "grin"); t.to(s, { lx: 66, ly: 126, rx: 174, ry: 126, brow: -0.5, sx: 1.04, upY: -2, duration: 0.35, ease: "back.out(2)" }); t.to(s, { ly: 120, ry: 120, sx: 1.07, duration: 0.18, yoyo: true, repeat: 3 }); t.call(() => { r.burst(["💪"], 70, 110, 1, "", 20); r.burst(["💪"], 170, 110, 1, "", 20); }); t.to({}, { duration: 0.4 }); return r.rest(t); },
  dance(r) { const s = r.s, t = r.begin(null, "grin", "happy"), d = G.timeline({ repeat: 3 });
    d.to(s, { rot: 5, lg: 10, rg: 3, lx: 70, ly: 128, rx: 168, ry: 214, head: 6, y: -5, duration: 0.22, ease: "power2.out" }).to(s, { y: 0, duration: 0.13, ease: "power2.in" }).to(s, { rot: -5, lg: -3, rg: -10, lx: 72, ly: 214, rx: 170, ry: 128, head: -6, y: -5, duration: 0.22, ease: "power2.out" }).to(s, { y: 0, duration: 0.13, ease: "power2.in" });
    t.add(d); t.call(() => r.burst(["🎵", "🎶"], 120, 40, 3, "", 120)); return r.rest(t); },
  cheer(r) { const s = r.s, t = r.begin(null, "grin", "happy");
    for (let i = 0; i < 2; i++) t.to(s, { sy: 0.86, sx: 1.1, y: 2, lx: 80, ly: 200, rx: 160, ry: 200, duration: 0.14, ease: "power2.out" }).to(s, { y: -58, sy: 1.08, sx: 0.94, lx: 70, ly: 88, rx: 170, ry: 88, duration: 0.32, ease: "power2.out" }).call(() => { r.burst(["❤️", "💛", "✨"], 120, 40, 5, "", 140); SND.boing(); }).to(s, { y: 0, duration: 0.3, ease: "power2.in" }).to(s, { sy: 0.86, sx: 1.12, duration: 0.08 }).to(s, { sy: 1, sx: 1, duration: 0.4, ease: "elastic.out(1,.4)" });
    return r.rest(t); },
  backflip(r) { const s = r.s, t = r.begin(null, "open");
    t.to(s, { sy: 0.84, sx: 1.1, y: 4, lx: 72, ly: 208, rx: 168, ry: 208, brow: 1, duration: 0.22, ease: "power2.out" }); t.addLabel("go"); t.call(() => SND.whoosh(0.6), undefined, "go");
    t.to(s, { y: -120, sy: 1.06, sx: 0.95, duration: 0.42, ease: "power2.out" }, "go"); t.to(s, { flip: -360, duration: 0.76, ease: "power1.inOut" }, "go"); t.to(s, { lg: 28, rg: -28, lx: 98, ly: 198, rx: 142, ry: 198, duration: 0.2 }, "go+=.1");
    t.to(s, { y: 0, duration: 0.36, ease: "power2.in" }, "go+=.42"); t.to(s, { lg: 0, rg: 0, lx: 66, ly: 116, rx: 174, ry: 116, duration: 0.2 }, "go+=.56"); t.to(s, { sy: 0.84, sx: 1.12, duration: 0.08 }, "go+=.78");
    t.call(() => { s.flip = 0; r.face("grin", "happy"); r.say(vary(SAYS.tada), 1400); r.burst(["✨", "⭐"], 120, 60, 4, "", 130); SND.ding(); }); t.to(s, { sy: 1, sx: 1, duration: 0.5, ease: "elastic.out(1,.35)" }); t.to({}, { duration: 0.5 }); return r.rest(t); },
  think(r) { const s = r.s, t = r.begin(null, "smile"); t.to(s, { rx: 128, ry: 142, lx: 100, ly: 200, head: 7, gx: -0.7, gy: -0.9, brow: 0.8, duration: 0.5, ease: "power2.out" }); t.call(() => r.say(vary(SAYS.hmm), 1300)); t.to(s, { head: 10, duration: 1, yoyo: true, repeat: 1, ease: "sine.inOut" });
    t.call(() => { r.face("grin", "open"); r.burst(["💡"], 120, 22, 1, "", 10); SND.ting(); }); t.to(s, { brow: 1.3, gy: 0, gx: 0, y: -12, rx: 176, ry: 96, duration: 0.2, ease: "power2.out" }).to(s, { y: 0, duration: 0.2, ease: "power2.in" }); t.to({}, { duration: 0.5 }); return r.rest(t); },
  highfive(r) { const s = r.s, t = r.begin(null, "grin"); t.to(s, { rx: 190, ry: 96, lean: -4, brow: 0.6, duration: 0.3, ease: "back.out(2)" }); t.call(() => r.say(vary(SAYS.upTop), 1500)); t.to({}, { duration: 0.7 });
    t.to(s, { rx: 199, ry: 88, duration: 0.08 }); t.call(() => { r.burst(["✋", "✨", "💥"], 200, 80, 4, "", 80); SND.kick(); }); t.to(s, { rx: 186, ry: 100, duration: 0.3, ease: "back.out(3)" }); t.to({}, { duration: 0.4 }); return r.rest(t); },
  fireup(r) { const s = r.s, t = r.begin(null, "grin"); t.to(s, { brow: -0.6, duration: 0.2 }); const p = G.timeline({ repeat: 3 });
    p.to(s, { lx: 98, ly: 150, rx: 150, ry: 116, y: -9, duration: 0.16, ease: "power2.out" }).to(s, { y: 0, duration: 0.12, ease: "power2.in" }).to(s, { lx: 90, ly: 116, rx: 142, ry: 150, y: -9, duration: 0.16, ease: "power2.out" }).to(s, { y: 0, duration: 0.12, ease: "power2.in" });
    t.add(p); t.call(() => { r.say(vary(SAYS.letsGo), 1500); r.burst(["🔥"], 120, 30, 3, "", 110); }); t.to({}, { duration: 0.4 }); return r.rest(t); },
};

/* ---------------- answers ---------------- */
export const TALK = {
  who(r: Rig) { const s = r.s, t = r.begin(null, "grin");
    t.to(s, { sy: 0.88, sx: 1.07, y: 2, duration: 0.14, ease: "power2.out" }).to(s, { y: -30, sy: 1.05, sx: 0.96, lx: 70, ly: 96, rx: 170, ry: 96, duration: 0.26, ease: "power2.out" }).call(() => SND.whoosh(0.5))
      .to(s, { y: 0, duration: 0.22, ease: "power2.in" }).to(s, { sy: 0.9, sx: 1.08, duration: 0.07 })
      .to(s, { sy: 1.03, sx: 1, upY: -3, lx: 90, ly: 212, rx: 150, ry: 212, hy: -2, gy: -0.35, head: -3, brow: 0.5, cape: 1, duration: 0.5, ease: "back.out(1.8)" })
      .call(() => { r.loop(G.fromTo(s, { capeW: -6 }, { capeW: 7, duration: 0.55, yoyo: true, repeat: -1, ease: "sine.inOut" })); r.burst(["💨", "💨"], 40, 210, 2, "", 30); })
      .to(s, { shades: 1, duration: 0.5, ease: "bounce.out" }).call(() => { r.burst(["✨"], 132, 130, 1, "", 4); SND.ting(); });
    const at = t.duration(); talkSeq(t, r, r.linesOf("who"));
    const g = tl(); g.to(s, { rx: 126, ry: 178, duration: 0.3, ease: "power2.out" }).to(s, { upY: -6, sy: 1.05, duration: 0.3, yoyo: true, repeat: 1 }).to(s, { rx: 150, ry: 212, duration: 0.3 }, "+=.5").to(s, { head: 4, duration: 0.5, yoyo: true, repeat: 3, ease: "sine.inOut" });
    t.add(g, at + 0.2); t.call(() => r.stopLoops()); t.to(s, { cape: 0, shades: 0, capeW: 0, duration: 0.4 }); return r.rest(t); },
  job(r: Rig) { const s = r.s, t = r.begin("laptop", "smile"); t.call(() => r.setGl(true));
    t.to(s, { lx: 92, ly: 205, rx: 148, ry: 205, gy: 0.8, hy: 3, duration: 0.4 }); const ty = G.timeline({ repeat: 7 }); ty.to(s, { ly: 199, ry: 206, duration: 0.06 }).to(s, { ly: 206, ry: 199, duration: 0.06 }); t.add(ty);
    t.call(() => { r.face("grin"); r.burst(["📊", "📈", "💡"], 120, 150, 3, "", 90); }).to(s, { gy: -0.1, hy: 0, brow: 0.7, duration: 0.25 });
    talkSeq(t, r, r.linesOf("job")); t.call(() => r.setGl(false)); return r.rest(t); },
  from(r: Rig) { const s = r.s, t = r.begin("flag", "grin"); t.to(s, { rx: 174, ry: 112, lx: 86, ly: 214, brow: 0.5, duration: 0.45, ease: "back.out(1.6)" });
    const at = t.duration(); talkSeq(t, r, r.linesOf("from")); const len = Math.max(1, t.duration() - at);
    const g = G.timeline({ repeat: Math.max(1, Math.floor(len / 0.45)), yoyo: true }); g.to(s, { rx: 182, ry: 104, pa: -10, duration: 0.45, ease: "sine.inOut" }); t.add(g, at);
    hop(t, s, 2); return r.rest(t); },
  joke(r: Rig) { const s = r.s, t = r.begin(null, "grin"), L = r.linesOf("joke"), punch = L.length > 1 ? L.pop() : null;
    t.to(s, { rx: 156, ry: 186, lx: 84, ly: 186, brow: 0.6, gy: -0.2, duration: 0.3 }); talkSeq(t, r, L);
    if (punch) { t.to(s, { brow: 1, duration: 0.2 }).to({}, { duration: 0.35 }); t.call(() => r.say(punch, 2400)); t.to({}, { duration: 1.2 }); }
    t.call(() => { r.burst(["🥁", "ba-dum", "tss!"], 120, 40, 3, "bang", 130); SND.rimshot(); r.face("grin", "happy"); });
    t.to(s, { lx: 108, ly: 200, rx: 132, ry: 200, duration: 0.2 }); t.to(s, { upY: -3, duration: 0.06, yoyo: true, repeat: 9 });
    t.to(s, { flip: 90, x: -24, y: 52, duration: 0.45, ease: "power2.in" }).call(() => { SND.thud(); r.burst(["😂", "🤣", "😂"], 170, 210, 3, "", 90); });
    const k = G.timeline({ repeat: 5 }); k.to(s, { lg: -18, rg: 6, duration: 0.12 }).to(s, { lg: 6, rg: -18, duration: 0.12 }); t.add(k);
    t.to(s, { flip: 0, x: 0, y: -20, lg: 0, rg: 0, duration: 0.4, ease: "power2.out" }).to(s, { y: 0, duration: 0.2, ease: "power2.in" }); t.call(() => r.face("grin", "open")); return r.rest(t); },
  food(r: Rig) { const s = r.s, t = r.begin("cup", "smile"), L = r.linesOf("food");
    t.to(s, { rx: 150, ry: 174, lx: 86, ly: 214, duration: 0.35, ease: "power2.out" }); t.call(() => r.every(300, () => r.burst([""], r.s.rx - 2, r.s.ry - 22, 1, "steam", 16)));
    if (L[0]) t.call(() => r.say(L[0], 2000));
    t.to(s, { rx: 132, ry: 140, gy: 0.2, duration: 0.45, ease: "power2.inOut" }, "+=.6").call(() => { r.eyes = "closed"; }).to({}, { duration: 0.7 }).call(() => { r.setEyes("open"); r.say(vary(SAYS.ahh), 900); }).to(s, { rx: 150, ry: 174, gy: 0, duration: 0.35 });
    t.call(() => r.stopLoops()); if (L[1]) { t.call(() => r.say(L[1], 1800)); t.to({}, { duration: 1.5 }); }
    t.call(() => r.setProp(null)).to(s, { lx: 116, ly: 134, rx: 166, ry: 222, duration: 0.25, ease: "power2.out" }).call(() => r.face("o")).to(s, { lx: 84, ly: 214, duration: 0.2 }).to({}, { duration: 0.4 });
    t.call(() => { r.face("open"); SND.boing(); }).to(s, { blush: 1.5, brow: 1.5, sy: 1.06, duration: 0.15, ease: "power3.out" });
    t.call(() => { r.say(vary(SAYS.spicy), 1600); r.every(200, () => { r.burst(["💨"], 76, 100, 1, "", 20); r.burst(["💨"], 164, 100, 1, "", 20); }); });
    const fan = G.timeline({ repeat: 7, yoyo: true }); fan.to(s, { lx: 106, ly: 128, duration: 0.08 }).to(s, { lx: 116, ly: 136, duration: 0.08 }); t.add(fan); t.to(s, { y: -14, duration: 0.16, yoyo: true, repeat: 3, ease: "power2.out" }, "<");
    t.call(() => { r.stopLoops(); r.face("grin", "happy"); r.say(vary(SAYS.worth), 1400); }).to(s, { blush: 0, brow: 0, sy: 1, duration: 0.4 }).to({}, { duration: 1 }); return r.rest(t); },
  single(r: Rig) { const s = r.s, t = r.begin(null, "smile"); t.to(s, { blush: 1.2, lx: 110, ly: 226, rx: 130, ry: 226, head: 8, gx: -0.9, gy: 0.5, brow: 0.6, duration: 0.45, ease: "power2.out" });
    const at = t.duration(); talkSeq(t, r, r.linesOf("single")); const len = Math.max(1, t.duration() - at);
    const sw = G.timeline({ repeat: Math.max(1, Math.floor(len / 0.35)), yoyo: true }); sw.to(s, { rg: 10, rot: -1.5, duration: 0.35, ease: "sine.inOut" }); t.add(sw, at);
    t.call(() => r.burst(["💗", "💕", "💗"], 120, 60, 3, "", 100), undefined, at + 0.3); return r.rest(t); },
  sing(r: Rig) { const s = r.s, t = r.begin("mic", "grin", "happy"); t.to(s, { rx: 136, ry: 136, lx: 70, ly: 150, brow: 0.6, duration: 0.35, ease: "back.out(1.5)" });
    const at = t.duration(); talkSeq(t, r, r.linesOf("sing")); if (t.duration() - at < 2.6) t.to({}, { duration: 2.6 - (t.duration() - at) }); const len = t.duration() - at;
    const sw = G.timeline({ repeat: Math.floor(len / 0.5), yoyo: true }); sw.to(s, { rot: 4, head: 6, lx: 64, ly: 140, duration: 0.5, ease: "sine.inOut" }); t.add(sw, at);
    for (let k = 0; k < len; k += 0.6) t.call(() => r.burst([pick(["🎵", "🎶"])], 150, 110, 1, "", 60), undefined, at + k);
    t.call(() => SND.notes(), undefined, at); return r.rest(t); },
  guide(r: Rig, line: string, go: () => void) { const s = r.s, t = r.begin("guide", "grin");
    t.to(s, { rx: 176, ry: 104, lx: 84, ly: 214, duration: 0.4, ease: "back.out(1.6)" }); const w = G.timeline({ repeat: 3, yoyo: true }); w.to(s, { rx: 182, ry: 98, duration: 0.2 }); t.add(w);
    t.call(() => r.say(line, 1800), undefined, 0.5); t.to({}, { duration: 0.7 }); t.call(go); return r.rest(t, 0.3); },
  hello(r: Rig, line: string) { const s = r.s, t = r.begin(null, "grin"); t.to(s, { rx: 182, ry: 100, duration: 0.35, ease: "back.out(1.7)" }); t.call(() => r.say(line, 1800)); const w = G.timeline({ repeat: 5, yoyo: true }); w.to(s, { rx: 195, ry: 113, duration: 0.18 }); t.add(w); return r.rest(t); },
  shrug(r: Rig) { const s = r.s, t = r.begin(null, "flat"); t.to(s, { lx: 62, ly: 194, rx: 178, ry: 194, head: 7, brow: 1, upY: -2, duration: 0.35, ease: "back.out(2)" }); t.call(() => r.say("Hmm, I only know a few things. Try one of these 👇", 2400)); t.to({}, { duration: 2.1 }); return r.rest(t); },
  intro(r: Rig, line: string) { const s = r.s, t = r.begin(null, "grin"); t.to(s, { rx: 150, ry: 172, lx: 90, ly: 172, brow: 0.6, duration: 0.3 }); t.call(() => r.say(line, 1800)); t.to({}, { duration: 1.4 }); return r.rest(t); },
};

/* ---------------- playing ---------------- */
export const FUN: Record<string, Act> = {
  tickle(r) { const s = r.s, t = r.begin(null, "grin", "happy"); t.call(() => { r.say(vary(SAYS.tickle), 1800); SND.giggle(); });
    t.to(s, { lx: 110, ly: 200, rx: 130, ry: 200, sy: 0.95, duration: 0.12 }); t.to(s, { rot: 5, upY: -2, duration: 0.07, yoyo: true, repeat: 11, ease: "sine.inOut" }); t.call(() => r.burst(["ha", "ha", "😆", "ha"], 120, 60, 4, "ha", 120), undefined, "<");
    t.to(s, { y: -10, duration: 0.15, yoyo: true, repeat: 1 }); return r.rest(t); },
  grumpy(r) { const s = r.s, t = r.begin(null, "flat"); t.to(s, { lx: 142, ly: 192, rx: 98, ry: 192, brow: -1, head: -6, gx: -0.7, duration: 0.35, ease: "power2.out" });
    t.call(() => { r.say(vary(SAYS.grumpy), 1800); r.burst(["💢"], 150, 40, 1, "", 10); }); t.to(s, { upY: -2, duration: 0.3, yoyo: true, repeat: 3 }); t.call(() => r.burst(["💢"], 100, 40, 1, "", 10));
    t.to({}, { duration: 0.6 }); t.call(() => { r.face("smile"); r.say(vary(SAYS.forgive), 1600); }); t.to(s, { brow: 0.4, head: 0, gx: 0, duration: 0.4 }); t.to({}, { duration: 1 }); return r.rest(t); },
  /* keepy-ups with a real-size football (r 22, about half his head), a random count, then the owner's line: Messi is the GOAT */
  football(r) { const s = r.s, t = r.begin(null, "smile"), n = 5 + Math.floor(Math.random() * 5), HIT = 248;
    t.call(() => { Object.assign(s, { bx: 140, by: -60, bo: 1, br: 0, ck: 0 }); }); t.to(s, { lx: 80, ly: 214, rx: 160, ry: 214, gy: 0.7, duration: 0.3 });
    t.to(s, { by: HIT, bx: 108, duration: 0.6, ease: "power2.in" });
    for (let i = 0; i < n; i++) { const right = i % 2 === 0, nx = right ? 132 : 108;
      t.call(() => SND.kick()); t.to(s, { [right ? "lk" : "rk"]: 12, sy: 0.97, duration: 0.07, ease: "power2.out" });
      t.to(s, { by: 162 - Math.random() * 24, bx: nx + (Math.random() - 0.5) * 6, br: "+=220", gy: 0.1, duration: 0.38, ease: "power2.out" }, "<"); t.to(s, { rk: 0, lk: 0, sy: 1, duration: 0.14 }, "<.08");
      t.to(s, { by: HIT, gy: 0.7, duration: 0.38, ease: "power2.in" }); }
    t.call(() => SND.kick()); t.to(s, { rk: 18, duration: 0.07 }); t.to(s, { by: -220, bx: 320, br: "+=700", duration: 0.8, ease: "power1.out" }, "<"); t.to(s, { bo: 0, duration: 0.25 }, "-=.25"); t.to(s, { rk: 0, gy: -0.6, duration: 0.2 }, "<-.5");
    t.call(() => { r.face("grin", "happy"); r.say(vary(SAYS.record).replace("{n}", String(n)), 1900); r.burst(["⚽", "✨"], 120, 40, 2, "", 90); }); t.to(s, { rx: 170, ry: 96, y: -10, duration: 0.2, ease: "power2.out" }).to(s, { y: 0, duration: 0.2, ease: "power2.in" }); t.to({}, { duration: 1.6 });
    t.to(s, { rx: 176, ry: 138, lx: 88, ly: 214, head: -5, brow: 0.9, duration: 0.3, ease: "back.out(2)" });
    t.call(() => { r.face("grin", "open"); r.say(vary(SAYS.messi), 3000); r.burst(["🐐", "⭐", "🐐"], 176, 100, 3, "", 100); SND.ting(); });
    t.to(s, { ry: 132, duration: 0.18, yoyo: true, repeat: 3 }); t.to({}, { duration: 2.2 }); return r.rest(t); },
  cricket(r) { const s = r.s, t = r.begin("bat", "grin");
    t.to(s, { rx: 150, ry: 198, lx: 134, ly: 192, sy: 0.95, lean: 3, pa: 25, gx: 0.8, duration: 0.4, ease: "power2.out" });
    t.call(() => { Object.assign(s, { bx: 440, by: 180, bo: 1, br: 0, ck: 1 }); r.say(vary(SAYS.comes), 1000); }); t.to({}, { duration: 0.5 });
    t.to(s, { bx: 300, by: 290, br: "-=240", duration: 0.36, ease: "power1.in" }); t.call(() => SND.thud()); t.to(s, { bx: 178, by: 242, br: "-=200", duration: 0.3, ease: "power1.out" });
    t.to(s, { pa: -115, rx: 176, ry: 146, lx: 160, ly: 150, lean: -4, sy: 1, duration: 0.16, ease: "power3.out" }, "-=.1");
    t.call(() => SND.kick()); t.to(s, { bx: 560, by: -280, br: "+=900", duration: 0.8, ease: "power1.out" }); t.to(s, { bo: 0, duration: 0.2 }, "-=.2");
    t.call(() => { r.face("grin", "happy"); r.burst(["SIX!", "🏏", "🎉"], 150, 40, 3, "bang", 120); r.say(vary(SAYS.six), 1800); SND.ding(); });
    t.to(s, { y: -14, duration: 0.18, yoyo: true, repeat: 3, ease: "power2.out" }); t.to({}, { duration: 0.6 }); return r.rest(t); },
  yawn(r) { const s = r.s, t = r.begin(null, "open"); t.call(() => { r.eyes = "closed"; SND.yawn(); r.say(vary(SAYS.yawn), 1400); });
    t.to(s, { lx: 72, ly: 90, rx: 168, ry: 90, sy: 1.05, y: -4, duration: 0.6, ease: "power2.out" }); t.to(s, { rot: 3, duration: 0.4, yoyo: true, repeat: 1 }); t.to(s, { sy: 1, y: 0, duration: 0.3 }); t.call(() => r.face("smile", "open")); t.to({}, { duration: 0.4 }); return r.rest(t); },
  whistle(r) { const s = r.s, t = r.begin(null, "o"); t.to(s, { lx: 92, ly: 212, rx: 148, ry: 212, gx: 0.6, gy: -0.4, duration: 0.4 });
    const sw = G.timeline({ repeat: 5, yoyo: true }); sw.to(s, { rot: 3, head: 4, duration: 0.45, ease: "sine.inOut" }); t.add(sw);
    for (let k = 0; k < 2.6; k += 0.5) t.call(() => r.burst([pick(["🎵", "🎶"])], 130, 120, 1, "", 50), undefined, 0.5 + k); t.call(() => SND.notes(), undefined, 0.5); return r.rest(t); },
  phone(r) { const s = r.s, t = r.begin("phone", "smile"); t.to(s, { rx: 142, ry: 178, lx: 112, ly: 184, gy: 0.7, hy: 2, duration: 0.4 });
    t.to(s, { ry: 174, duration: 0.1, yoyo: true, repeat: 5 }); t.to({}, { duration: 0.4 }); t.call(() => { r.face("grin", "happy"); r.say(vary(SAYS.meme), 1600); r.burst(["😂", "🤣"], 140, 100, 2, "", 70); SND.giggle(); });
    t.to(s, { upY: -3, duration: 0.06, yoyo: true, repeat: 11 }); t.to({}, { duration: 0.5 }); return r.rest(t); },
  wind(r) { const s = r.s, t = r.begin(null, "open"); t.call(() => { r.say(vary(SAYS.wind), 1500); r.burst(["💨", "💨", "💨"], 40, 140, 3, "", 30); SND.whoosh(0.7); });
    t.to(s, { lean: -9, lx: 98, ly: 118, rx: 142, ry: 118, brow: 1.2, blink: 0.4, duration: 0.2, ease: "power2.out" }); t.to(s, { lean: -6, duration: 0.08, yoyo: true, repeat: 9 }); t.to(s, { blink: 1, duration: 0.2 }); return r.rest(t); },
  endParty(r) { const s = r.s, t = r.begin(null, "grin", "happy"); t.call(() => { r.say(vary(SAYS.end), 2000); SND.ding(); });
    for (let i = 0; i < 2; i++) t.to(s, { y: -50, lx: 70, ly: 88, rx: 170, ry: 88, duration: 0.3, ease: "power2.out" }).call(() => r.burst(["🎉", "🎊", "✨", "🥳"], 120, 40, 5, "", 160)).to(s, { y: 0, duration: 0.28, ease: "power2.in" }).to(s, { sy: 0.88, sx: 1.1, duration: 0.08 }).to(s, { sy: 1, sx: 1, duration: 0.35, ease: "elastic.out(1,.4)" });
    return r.rest(t); },
  welcome(r) { const s = r.s, t = r.begin(null, "grin", "happy"); t.call(() => { r.say(vary(SAYS.welcome), 1900); SND.ding(); });
    t.to(s, { y: -40, lx: 70, ly: 90, rx: 170, ry: 90, duration: 0.28, ease: "power2.out" }).call(() => r.burst(["💖", "💛", "✨"], 120, 40, 4, "", 130)).to(s, { y: 0, duration: 0.25, ease: "power2.in" }).to(s, { sy: 0.88, duration: 0.07 }).to(s, { sy: 1, duration: 0.4, ease: "elastic.out(1,.4)" }); t.to({}, { duration: 0.6 }); return r.rest(t); },
  cheered(r) { const t = TRICKS.cheer(r); t.call(() => r.say(vary(SAYS.thanks), 1800), undefined, 0.3); return t; },
  secret(r) { const s = r.s, t = r.begin(null, "grin"), wrap = r.wrap, dir = r.wrapDir;
    t.call(() => { r.say("We're best friends now! Here's my secret move… 🕺", 2200); SND.ding(); r.burst(["💞", "💖"], 120, 40, 3, "", 100); }); t.to({}, { duration: 1.3 });
    t.addLabel("mw"); const legs = G.timeline({ repeat: 5 }); legs.to(s, { lk: 10, rk: 0, lg: -4, rg: 2, duration: 0.22, ease: "sine.inOut" }).to(s, { lk: 0, rk: 10, lg: 2, rg: -4, duration: 0.22, ease: "sine.inOut" }); t.add(legs, "mw");
    t.to(s, { lean: -3, lx: 80, ly: 214, rx: 120, ry: 156, head: -5, duration: 0.3 }, "mw"); if (wrap) t.to(wrap, { x: "+=" + dir * 110, duration: 2.6, ease: "none" }, "mw");
    t.to(s, { sx: -1, duration: 0.22, ease: "power1.in" }).to(s, { sx: 1, duration: 0.22, ease: "power1.out" });
    t.to(s, { sy: 1.07, y: -6, rx: 170, ry: 100, lk: 0, rk: 0, duration: 0.15 }).call(() => { r.say("Hee-hee! 🕺", 1400); r.burst(["✨", "⭐", "💖"], 120, 40, 4, "", 120); });
    t.to({}, { duration: 0.8 }); t.to(s, { sy: 1, y: 0, duration: 0.2 }); if (wrap) t.to(wrap, { x: 0, duration: 0.9, ease: "power2.inOut" }); return r.rest(t); },
};
export const IDLE_KEYS = ["football", "cricket", "yawn", "whistle", "phone"] as const;

/* ---------------- moments ---------------- */
export const MOMENTS: Record<string, Act> = {
  morning(r) { const s = r.s, t = r.begin(null, "open"); t.call(() => { r.eyes = "closed"; SND.yawn(); }); t.to(s, { lx: 72, ly: 90, rx: 168, ry: 90, sy: 1.05, y: -4, duration: 0.6 }); t.to({}, { duration: 0.6 });
    t.to(s, { sy: 1, y: 0, lx: 84, ly: 214, rx: 150, ry: 174, duration: 0.4 }); t.call(() => { r.setProp("cup"); r.face("smile", "open"); r.say(vary(SAYS.morning), 2200); r.every(300, () => r.burst([""], r.s.rx - 2, r.s.ry - 22, 1, "steam", 16)); });
    t.to(s, { rx: 132, ry: 140, duration: 0.45 }, "+=.7").to({}, { duration: 0.6 }).to(s, { rx: 150, ry: 174, duration: 0.35 }).call(() => r.face("grin")); t.to({}, { duration: 0.8 }); return r.rest(t); },
  night(r) { const s = r.s, t = r.begin(null, "open"); t.call(() => { r.eyes = "closed"; SND.yawn(); }); t.to(s, { lx: 72, ly: 90, rx: 168, ry: 90, sy: 1.04, duration: 0.6 }); t.to({}, { duration: 0.4 });
    t.to(s, { sy: 1, lx: 74, ly: 222, rx: 166, ry: 222, duration: 0.4 }); t.call(() => { r.face("smile", "open"); r.say(vary(SAYS.night), 2000); }); t.to(s, { head: 6, duration: 0.6, yoyo: true, repeat: 1 }); return r.rest(t); },
  rain(r) { const s = r.s, t = r.begin("umbrella", "grin"); t.to(s, { rx: 158, ry: 138, lx: 84, ly: 214, duration: 0.45, ease: "back.out(1.5)" }); t.call(() => r.say(vary(SAYS.rain), 2000));
    t.to(s, { y: -10, duration: 0.18, yoyo: true, repeat: 3 }); t.to(s, { rot: 3, pa: -6, duration: 0.5, yoyo: true, repeat: 3, ease: "sine.inOut" }); return r.rest(t); },
  eid(r) { const s = r.s, t = r.begin("lantern", "grin", "happy"); t.to(s, { rx: 178, ry: 132, lx: 84, ly: 214, duration: 0.45, ease: "back.out(1.5)" });
    t.call(() => { r.say(vary(SAYS.eid), 2200); r.burst(["🌙", "✨", "⭐"], 170, 60, 4, "", 120); SND.ding(); }); t.to(s, { y: -12, duration: 0.18, yoyo: true, repeat: 3 }); t.to(s, { pa: 8, duration: 0.5, yoyo: true, repeat: 3, ease: "sine.inOut" }); return r.rest(t); },
  birthday(r) { const s = r.s, t = r.begin("cake", "grin"); t.to(s, { lx: 90, ly: 206, rx: 150, ry: 206, flame: 1, duration: 0.45 });
    t.call(() => r.say(vary(SAYS.bday), 1800)); t.to({}, { duration: 1.4 }); t.to(s, { gy: 0.6, hy: 3, duration: 0.25 }); t.call(() => r.face("o")); t.to(s, { blush: 0.8, duration: 0.2 });
    t.to(s, { flame: 0, duration: 0.25 }, "+=.3"); t.call(() => { r.burst(["💨"], 120, 140, 1, "", 10); SND.pop(); });
    t.call(() => { r.face("grin", "happy"); r.burst(["🎉", "🎊", "🎈", "✨"], 120, 40, 6, "", 170); SND.ding(); }); t.to(s, { blush: 0, gy: 0, hy: 0, y: -16, duration: 0.2, yoyo: true, repeat: 3 }); t.to({}, { duration: 0.6 }); return r.rest(t); },
};
export const HAT_OF: Record<string, string> = { night: "night", birthday: "party", eid: "tupi" };

/* ---------------- sleeping, waking, ducking ---------------- */
export function stopSleep(r: Rig) { if (!r.sleeping && !r.snoreTl) return; r.sleeping = false; clearInterval(r.zzz); r.snoreTl?.kill(); r.snoreTl = null; }
export function sleepStand(r: Rig) { const s = r.s;
  r.run((t) => { t.call(() => { r.setProp(null); r.face("sleep", "open"); r.eyes = "closed"; }); t.to(s, restTo({ head: 11, hy: 5, lean: 3, upY: 4, lx: 80, ly: 228, rx: 160, ry: 228, gy: 0.5 }, 1.4, "sine.inOut")); });
  r.sleeping = true; clearInterval(r.zzz); r.zzz = window.setInterval(() => r.burst(["z", "Z"], 150, 58, 1, "zz", 40), 1150); }
export function sleepGround(r: Rig) { const s = r.s;
  r.run((t) => {
    t.call(() => { r.setProp(null); r.face("open", "open"); }); t.to(s, restTo({}, 0.3));
    t.to(s, { lx: 72, ly: 92, rx: 168, ry: 92, sy: 1.05, duration: 0.5, ease: "power2.out" }); t.call(() => { r.eyes = "closed"; r.say(vary(SAYS.nap), 1600); SND.yawn(); }); t.to({}, { duration: 0.8 });
    t.to(s, { lx: 74, ly: 222, rx: 166, ry: 222, sy: 0.86, sx: 1.06, duration: 0.35, ease: "power2.inOut" }); t.set(s, { blanketY: -170 }); t.to(s, { bed: 1, duration: 0.3, ease: "back.out(2)" });
    // he lies down with his head bent up onto the pillow (the head turns at the neck, so it rests on the pillow's top, not the floor)
    t.to(s, { flip: 90, x: -24, y: 52, sy: 1, sx: 1, head: -10, duration: 0.75, ease: "power2.inOut" }); t.call(() => { r.setMouth("sleep"); SND.thud(); });
    t.to(s, { head: -19, hy: -1, duration: 0.5, ease: "back.out(1.6)" });
    t.to(s, { blanketY: 0, duration: 0.75, ease: "bounce.out" }, "<.1");
    t.call(() => { const z = G.timeline({ repeat: -1 }); z.to(s, { bub: 9, head: -21, duration: 1.4, ease: "sine.inOut", onStart: () => SND.snore() }).to(s, { bub: 2, head: -19, duration: 1.1, ease: "sine.inOut" }).to(s, { lg: -7, rg: 5, duration: 0.15, yoyo: true, repeat: 1 }); r.snoreTl = z; });
  });
  r.sleeping = true; clearInterval(r.zzz); r.zzz = window.setInterval(() => r.burst(["z", "Z"], 224, 148, 1, "zz", 30), 1300); }
export function wakeRig(r: Rig, quiet = false) { stopSleep(r); const s = r.s, ground = s.bed > 0.5 || Math.abs(s.flip) > 45;
  return r.run((t) => {
    if (ground) { t.to(s, { bub: 15, duration: 0.15, ease: "power1.in" }).call(() => { r.burst(["💥"], 182, 178, 1, "", 10); SND.pop(); }).set(s, { bub: 0 }); }
    t.call(() => r.face("open", "open")); t.to(s, { brow: 1.4, duration: 0.1 });
    if (ground) { t.to(s, { blanketY: -220, duration: 0.45, ease: "power2.out" }); t.to(s, { flip: 0, x: 0, y: -40, head: 0, hy: 0, duration: 0.4, ease: "power2.out" }, "<"); t.to(s, { bed: 0, duration: 0.3 }, "<.15"); t.to(s, { y: 0, duration: 0.25, ease: "power2.in" }); t.set(s, { blanketY: 0 }); }
    else t.to(s, { y: -16, head: 0, hy: 0, lean: 0, upY: 0, gy: 0, duration: 0.18, ease: "power2.out" }).to(s, { y: 0, duration: 0.2, ease: "power2.in" });
    t.call(() => { if (!quiet) r.say(vary(SAYS.up), 1800); r.face("grin", "open"); });
    t.to(s, restTo({}, 0.5)); }); }
export function duckRig(r: Rig, dir: number) { const s = r.s;
  return r.run((t) => { t.call(() => { r.setProp(null); r.face("open", "open"); }); t.to(s, restTo({ sy: 0.8, sx: 1.1, y: 4, lean: dir * -7, head: dir * -8, brow: 1.3, lx: 98, ly: 146, rx: 142, ry: 146 }, 0.14, "power3.out"));
    t.call(() => r.say(vary(SAYS.whoa), 1100)); t.to({}, { duration: 0.4 }); t.call(() => r.face("grin", "open")); t.to(s, { ...REST, duration: 0.7, ease: "elastic.out(1,.45)" }); }); }
/** Rock, paper or scissors from him; you pick yours. Returns who won. */
export function rps(r: Rig, you: string, onScore: (res: "you" | "him" | "draw") => void) {
  const em: Record<string, string> = { rock: "✊", paper: "✋", scissors: "✌️" }, him = pick(["rock", "paper", "scissors"]);
  const res = you === him ? "draw" : (you === "rock" && him === "scissors") || (you === "paper" && him === "rock") || (you === "scissors" && him === "paper") ? "you" : "him";
  const s = r.s, t = r.begin(null, "grin"); t.to(s, { lx: 84, ly: 214, rx: 166, ry: 150, brow: -0.3, duration: 0.25 });
  ["Rock…", "Paper…", "Scissors!"].forEach((w) => { t.call(() => { r.say(w, 650); SND.beep(); }); t.to(s, { ry: 128, duration: 0.16, ease: "power2.out" }).to(s, { ry: 150, duration: 0.16, ease: "power2.in" }); t.to({}, { duration: 0.1 }); });
  t.to(s, { rx: 180, ry: 118, duration: 0.15, ease: "back.out(2)" });
  t.call(() => { r.hush(); const [px, py] = r.pt(s.rx + s.x + 8, s.ry + s.y - 24), el = document.createElement("div"); el.className = "mz-sign"; el.textContent = em[him]; el.style.left = px + "px"; el.style.top = py + "px"; r.layer.appendChild(el);
    G.fromTo(el, { xPercent: -50, yPercent: -50, scale: 0.2, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.4, ease: "back.out(2.5)" }); G.to(el, { opacity: 0, y: -20, duration: 0.4, delay: 2, onComplete: () => el.remove() }); });
  t.to({}, { duration: 1 }); t.call(() => onScore(res));
  if (res === "him") { t.call(() => { r.face("grin", "happy"); r.say(vary(SAYS.rpsWin).replace("{him}", em[him]).replace("{you}", em[you]), 2000); SND.ding(); }); t.to(s, { y: -30, lx: 70, ly: 90, rx: 170, ry: 90, duration: 0.25, ease: "power2.out" }).to(s, { y: 0, duration: 0.22, ease: "power2.in" }); t.to(s, { rot: 4, duration: 0.15, yoyo: true, repeat: 3 }); }
  else if (res === "you") { t.call(() => { r.face("sad"); r.say(vary(SAYS.rpsLose), 2000); }); t.to(s, { head: 8, hy: 3, gy: 0.8, lean: 3, lx: 100, ly: 226, rx: 140, ry: 226, brow: 0.8, duration: 0.4 }); t.to(s, { rg: 12, duration: 0.25, yoyo: true, repeat: 3 }); }
  else { t.call(() => { r.face("grin"); r.say(vary(SAYS.rpsDraw), 1800); }); t.to(s, { lx: 62, ly: 194, rx: 178, ry: 194, brow: 1, duration: 0.3, ease: "back.out(2)" }); }
  t.to({}, { duration: 1.2 }); return r.rest(t);
}
