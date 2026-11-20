/**
 * Mini Shourobh on a page (downloaded separately, once the page is idle). The site puts him in a fixed layer over the
 * page (Mascot.tsx); the dashboard's preview puts him in a box. He follows the homepage's sections (a move and a line
 * each, by the section's layout), can be picked up and thrown, tickled, played with, naps on the floor, plays when bored,
 * and notices fast scrolling, the end of the page, coming back to the tab and the card under the mouse.
 *
 * Talking to him (the scene): a click on him, or on his "Wanna chat?" bubble, dims the page; he jumps into the middle
 * under a spotlight and talks like a person: the device's own voice (settings.mascot.convo), his mouth in time with each
 * word, a gesture per sentence, the big acts mid-answer. The visitor has an avatar, picks tilted reply cards that fly to
 * him, types (he listens, and catches their words as they fly up), or sends a quick reaction. Goodbye: he steps aside, a
 * rocket lands in the middle on his floor, he hops in and it lifts off; he comes back by parachute.
 *
 * Smoothness: he draws only what changed (mascotRig.ts) and not at all while the page scrolls unless he's acting for
 * someone; ambient moves start only once scrolling rests; anything he spawns has a cap; physics runs on real time. The
 * scene's pieces exist only while it's open. Reduced motion: no jumping or acting, he answers in words. Slow devices
 * (html.lite): no breathing or ambient moves. Every part has a switch in settings.mascot (lib/mascot.ts).
 */
import { MZ_BIT_OF_LAYOUT, MZ_JEANS, MZ_QA, MZ_SHIRTS, type MascotSettings, type MascotView, type MzQa } from "@/lib/mascot";
import { pageY, prefersReducedMotion } from "./fx";
import {
  BITS, FUN, HAT_OF, IDLE_KEYS, MOMENTS, REST, CLEAR, ROCKET_SVG, Rig, SND, TALK, TRICKS, duckRig, lookVars, markGesture, pick, rps, setSound,
  sleepGround, sleepStand, stopSleep, useGsap, wakeRig, type TL,
} from "./mascotRig";

type GS = typeof import("gsap").gsap;
export type MascotCtl = {
  update(m: MascotSettings): void; ask(k: string): void; fun(k: string): void; trick(k: string): void; bit(k: string): void; moment(k: string): void;
  nap(): void; wake(): void; throwDemo(): void; openTalk(): void; testVoice(): void; stop(): void;
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const TIPS = ["Psst. Click me, I can talk!", "Try dragging me. I dare you.", "There is more below, keep going.", "Ask me who I am. 😎"];
const KEYS: [string, RegExp][] = [
  ["bye", /\b(bye|goodbye|good bye|see (you|ya)|later|gtg|tata|leaving)\b/], ["who", /\b(who|your name|about you|yourself|introduce)\b/], ["job", /\b(job|work|do you do|profession|career)\b/],
  ["from", /\b(from|where|live|city|country|dhaka|bangladesh)\b/], ["joke", /\b(joke|funny|laugh|lol)\b/], ["food", /\b(food|eat|hungry|cha|tea|fuchka|biryani|favou?rite)\b/],
  ["single", /\b(single|girlfriend|gf|date|crush|love|married|wife)\b/], ["sing", /\b(sing|song|music)\b/], ["trick", /\b(trick|dance|flip|flex)\b/],
  ["game", /\b(game|play|rock|paper|scissors)\b/], ["tour", /\b(around|tour|guide|next|show me)\b/], ["top", /\b(top|up|beginning|start)\b/],
  ["salam", /\b(salam|assalam|assalamu|salaam|assalamualaikum)\b/], ["hello", /\b(hi|hello|hey|yo|hola|kemon|kmn|sup)\b/],
];
const QE: Record<string, string> = { who: "😎", job: "💼", from: "📍", joke: "🥁", food: "🍜", single: "💘", sing: "🎤", trick: "🤸", game: "✊", tour: "🧭", bye: "👋", top: "⬆️" };
const FOLLOW: Record<string, string[]> = {
  start: ["who", "joke", "game"], who: ["job", "from", "single"], job: ["joke", "food", "sing"], from: ["food", "sing", "who"], joke: ["trick", "sing", "game"],
  food: ["from", "single", "joke"], single: ["sing", "joke", "who"], sing: ["trick", "game", "joke"], trick: ["game", "joke", "who"], game: ["joke", "who", "trick"],
  hello: ["who", "joke", "game"], shrug: ["who", "joke", "food"], nudge: ["who", "joke", "game"], react: ["who", "joke", "sing"],
};
const AVATARS = ["🦊", "🐼", "🐨", "🐯", "🐸", "🦁", "🐧", "🦄", "🐙", "🐵", "🐰", "🐻"];
const HINTS = ["Ask about his job…", "Say salam…", "Ask for a joke…", "Where is he from?", "Ask him to sing…", "Is he single? 👀", "Ask anything…"];
const QUICK: [string, string][] = [["👋", "wave"], ["😂", "laugh"], ["❤️", "love"], ["🔥", "fire"]];
const PLANE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.4 11.2 19.8 4.2c.6-.3 1.2.3 1 .9l-5.6 15.2c-.2.6-1 .7-1.3.1l-2.6-4.9-5.3-2.3c-.6-.3-.6-1.1 0-1.4Z" fill="currentColor"/></svg>`;
const MALE = /(\bmale\b|daniel|alex|fred|david|mark|george|guy|ryan|arthur|aaron|thomas|james|rishi|ravi|prabhat|oliver|liam)/i;
const FEMALE = /(female|samantha|victoria|karen|moira|tessa|zira|susan|hazel|serena|fiona|veena|aria|jenny|libby|sonia|natasha|heera|neerja|emma|ava|allison|kate)/i;
const stripEmoji = (t: string) => t.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{1F1E6}-\u{1F1FF}]/gu, "").replace(/\s+/g, " ").trim();
type Step = () => unknown;

export function startMascot(layer: HTMLElement, view: MascotView, g: GS, opts: { preview?: boolean } = {}): MascotCtl {
  useGsap(g);
  const G = g, html = document.documentElement, preview = !!opts.preview, still = prefersReducedMotion();
  let cfg = view.m, lite = !preview && html.classList.contains("lite"), alive = true;
  const phoneMq = window.matchMedia("(max-width: 760px)");
  const offs: (() => void)[] = [];
  const on = (t: Window | Document | HTMLElement, type: string, fn: (e: never) => void, o?: AddEventListenerOptions) => { t.addEventListener(type, fn as EventListener, o); offs.push(() => t.removeEventListener(type, fn as EventListener, o)); };
  const timers: number[] = [];
  const every = (ms: number, fn: () => void) => timers.push(window.setInterval(fn, ms));
  const mk = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, inner = "") => { const e = document.createElement(tag); e.className = cls; if (inner) e.innerHTML = inner; return e; };

  /* ---------- what's in the layer: his spot, the rocket, him (rain and stars live in his own box, never over the site) ---------- */
  layer.innerHTML = `<div class="mz-home"></div><div class="mz-rk"></div><div class="mz" role="button" tabindex="0" aria-label="Mini Shourobh, the site's mascot. Press Enter to talk to him."><div class="mz-rain"></div><div class="mz-night"></div></div>`;
  const home = layer.querySelector(".mz-home") as HTMLElement, rocket = layer.querySelector(".mz-rk") as HTMLElement, wrap = layer.querySelector(".mz") as HTMLElement;
  const rainEl = wrap.querySelector(".mz-rain") as HTMLElement, nightEl = wrap.querySelector(".mz-night") as HTMLElement;
  for (let i = 0; i < 16; i++) { const d = document.createElement("i"); d.style.left = Math.random() * 100 + "%"; d.style.animationDuration = 0.55 + Math.random() * 0.4 + "s"; d.style.animationDelay = -Math.random() + "s"; rainEl.appendChild(d); }
  for (let i = 0; i < 7; i++) { const d = document.createElement("i"); d.textContent = i % 3 ? "✦" : "⋆"; d.style.left = 6 + Math.random() * 88 + "%"; d.style.top = Math.random() * 80 + "%"; d.style.animationDelay = -Math.random() * 2 + "s"; nightEl.appendChild(d); }
  rocket.innerHTML = ROCKET_SVG;
  const rkFace = rocket.querySelector(".mz-rk-face") as SVGGElement, rkFlame = rocket.querySelector(".mz-rk-flame") as SVGGElement;
  const paint = () => Object.entries(lookVars(cfg, MZ_SHIRTS, MZ_JEANS)).forEach(([k, v]) => layer.style.setProperty(k, v));
  paint();

  const rig = new Rig(wrap, layer, cfg, { mirror: cfg.side === "right", still: still || lite });
  rig.wrap = wrap;
  setSound(cfg.fun.sounds);

  let cur = "", curBit = "", busy = false, away = false, held = false, lastAct = Date.now(), lastBored = 0, duckCool = 0, trickI = 0, endDone = false;
  let hostBack: ReturnType<GS["delayedCall"]> | null = null, leanBack: ReturnType<GS["delayedCall"]> | null = null;
  const setLive = () => { rig.live = busy || away || held || CV.on; };
  const phone = () => phoneMq.matches;
  const visible = () => (preview || cfg.show) && (!phone() || cfg.phones);
  const free = () => visible() && !away && !held && !busy && !CV.on;

  /* ---------- hearts (remembered in this browser) ---------- */
  let hearts = new Set<string>(), unlocked = false, pendingSecret = false;
  try { const h = JSON.parse(localStorage.getItem("lc_mz_hearts") || "{}"); hearts = new Set(h.k || []); unlocked = !!h.u; } catch {}
  const saveHearts = () => { try { localStorage.setItem("lc_mz_hearts", JSON.stringify({ k: [...hearts], u: unlocked })); } catch {} };
  function addHeart(k: string) { if (!cfg.fun.hearts || hearts.has(k) || preview) return; hearts.add(k); if (hearts.size >= 5 && !unlocked) { unlocked = true; pendingSecret = true; } saveHearts(); }

  /* ---------- where he stands ---------- */
  function placeWrap(anim: boolean) {
    const right = cfg.side === "right"; wrap.classList.toggle("left", !right); home.classList.toggle("left", !right); rig.setMirror(right); rig.wrapDir = right ? -1 : 1;
    const v = cfg.place === "peek" ? { x: 0, y: 0, xPercent: right ? 44 : -44, rotation: right ? -14 : 14, yPercent: 5 } : { x: 0, y: 0, xPercent: 0, rotation: 0, yPercent: 0 };
    G.to(wrap, { ...v, scale: 1, opacity: 1, duration: anim ? 0.6 : 0, ease: "power3.inOut" });
  }
  const sizeWrap = () => { const w = (cfg.size / 100) * (phone() ? 96 : 150); wrap.style.width = w + "px"; home.style.width = w * 0.95 + "px"; };
  function updateVis() { wrap.style.display = visible() ? "" : "none"; home.style.display = visible() && cfg.place !== "peek" ? "" : "none"; if (!visible() && CV.on) closeScene(); }
  function leanIn() {
    if (cfg.place !== "peek") return; const right = cfg.side === "right"; leanBack?.kill();
    G.to(wrap, { xPercent: right ? 14 : -14, rotation: right ? -6 : 6, duration: 0.55, ease: "back.out(1.4)" });
    leanBack = G.delayedCall(6.5, () => { if (cfg.place === "peek" && !busy && !away && !held && !CV.on) G.to(wrap, { xPercent: right ? 44 : -44, rotation: right ? -14 : 14, duration: 0.7, ease: "power2.inOut" }); });
  }
  function walkTo(x: number, done: () => void) {
    const s = rig.s, from = Number(G.getProperty(wrap, "x")), dur = clamp(Math.abs(x - from) / 170, 0.5, 2.4);
    rig.run((t) => { t.call(() => { rig.setProp(null); rig.face("grin", "open"); }); const w = G.timeline({ repeat: -1 });
      w.to(s, { lg: 16, rg: -6, y: -7, rot: 2, lx: 68, rx: 162, ly: 212, ry: 224, duration: 0.17, ease: "sine.out" }).to(s, { y: 0, duration: 0.13, ease: "sine.in" }).to(s, { lg: -6, rg: 16, y: -7, rot: -2, lx: 78, rx: 172, ly: 224, ry: 212, duration: 0.17, ease: "sine.out" }).to(s, { y: 0, duration: 0.13, ease: "sine.in" }); t.add(w); });
    G.to(wrap, { x, duration: dur, ease: "power1.inOut", onComplete: done });
  }
  const restNow = () => rig.run((t) => rig.rest(t, 0.3));

  /* ---------- doing things ---------- */
  function act(fn: (r: Rig) => TL, o: { heart?: string; idle?: boolean } = {}) {
    if (!visible() || away || held || still) return null;
    if (o.heart) addHeart(o.heart);
    if (!o.idle) lastAct = Date.now();
    hostBack?.kill(); hostBack = null; if (!CV.on) G.killTweensOf(wrap, "x");
    stopSleep(rig); busy = true; setLive();
    const t = fn(rig);
    t.eventCallback("onComplete", () => { if (CV.on) { stance(); showCards(CV.last); return; } busy = false; setLive(); resume(); });
    return t;
  }
  function playBit(k: string) { if (lite || still) return null; if ((cfg.acts as Record<string, boolean>)[k] && BITS[k]) return BITS[k](rig); return rig.begin(null, "grin"); }
  function resume() {
    if (busy || away || held || !visible() || rig.sleeping || CV.on) return;
    if (pendingSecret && cfg.fun.hearts) { pendingSecret = false; act(FUN.secret); return; }
    if (Math.abs(Number(G.getProperty(wrap, "x"))) > 4) { walkTo(0, () => { placeWrap(true); restNow(); }); return; }
    if (!curBit || curBit === "hero" || cfg.place === "host" || !(cfg.acts as Record<string, boolean>)[curBit] || lite || still) { restNow(); return; }
    BITS[curBit](rig);
  }
  const lineFor = (k: string) => (k === "hero" ? cfg.greet.replace(/\{time\}/g, dayPart()) : (cfg.lines as Record<string, string>)[k] || "");
  function enterBit(k: string, talk: boolean) {
    curBit = k;
    if (!visible() || away || held || CV.on) return;
    if (still) { if (talk) rig.say(lineFor(k)); return; }
    if (rig.sleeping) { act((r) => wakeRig(r, true)); return; }
    if (busy) return;
    const line = talk && (cfg.chat !== "quiet" || k === "hero") ? lineFor(k) : "";
    if (cfg.place === "host" && !preview) {
      hostBack?.kill();
      const W = layer.clientWidth, w = wrap.offsetWidth, dist = Math.max(0, W / 2 - 12 - w / 2), dx = cfg.side === "right" ? -dist : dist;
      walkTo(dx, () => { if (busy || CV.on) return; playBit(k); if (line) window.setTimeout(() => rig.say(line), 300);
        hostBack = G.delayedCall(6.5, () => { if (!busy && !away && !held && !CV.on) walkTo(0, restNow); }); });
    } else { leanIn(); if (!playBit(k)) restNow(); if (line) window.setTimeout(() => { if (!busy && !CV.on) rig.say(line); }, 600); }
  }

  /* ---------- the owner's clock ---------- */
  function hourNow() { try { return Number(new Intl.DateTimeFormat("en-GB", { timeZone: view.timezone, hour: "numeric", hourCycle: "h23" }).format(new Date())); } catch { return new Date().getHours(); } }
  function todayMD() { try { const p = new Intl.DateTimeFormat("en-CA", { timeZone: view.timezone, month: "2-digit", day: "2-digit" }).formatToParts(new Date()); return `${p.find((x) => x.type === "month")?.value}-${p.find((x) => x.type === "day")?.value}`; } catch { return ""; } }
  const dayPart = () => { const h = hourNow(); return h < 5 ? "night" : h < 12 ? "morning" : h < 17 ? "afternoon" : h < 21 ? "evening" : "night"; };
  function autoMoment() {
    const M = cfg.moments; if (!M.auto) return "normal";
    if (M.birthday && M.birthday.slice(5) === todayMD()) return "birthday"; if (M.eid) return "eid"; if (M.rain) return "rain";
    const h = hourNow(); if (M.morning && h >= 5 && h < 10) return "morning"; if (M.night && (h >= 21 || h < 5)) return "night"; return "normal";
  }
  function setMoment(m: string, intro: boolean) {
    rig.setHat(HAT_OF[m] || null);
    rainEl.style.display = m === "rain" && !lite && !still ? "block" : "none"; nightEl.style.display = m === "night" ? "block" : "none";
    if (intro && MOMENTS[m]) act(MOMENTS[m], { heart: "moment" });
  }

  /* =================== the talking scene =================== */
  const CV = { on: false, token: 0, asked: new Set<string>(), performing: false, listening: false, idleAt: 0, nudged: 0, last: "start", mode: "" as "" | "game", lastInvite: 0, mt: 0, S: 1 };
  const dim = mk("div", "mzc-dim"), say = mk("div", "mzc-say"), cards = mk("div", "mzc-cards"), top = mk("div", "mzc-top"), invite = mk("button", "mzc-invite");
  const bar = mk("form", "mzc-bar"), you = mk("div", "mzc-you");
  [dim, say, cards, you, bar, top, invite].forEach((e) => { e.hidden = true; layer.appendChild(e); });
  say.setAttribute("aria-live", "polite"); invite.type = "button";
  dim.setAttribute("role", "presentation");
  top.innerHTML = `<button type="button" class="mzc-vo" aria-label="His voice on or off"></button><button type="button" class="mzc-x" aria-label="Close and send him back to his corner">✕</button>`;
  let av = ""; try { av = localStorage.getItem("lc_mz_av") || ""; } catch {} if (!AVATARS.includes(av)) { av = pick(AVATARS); try { localStorage.setItem("lc_mz_av", av); } catch {} }
  bar.innerHTML = `<span class="mzc-av" aria-hidden="true">${av}</span><input type="text" maxlength="80" autocomplete="off" aria-label="Ask him anything" placeholder="Ask me anything…"><span class="mzc-wave" aria-hidden="true"><i></i><i></i><i></i></span>
<span class="mzc-quick">${QUICK.map(([e, k]) => `<button type="button" data-q="${k}" aria-label="Send ${e}">${e}</button>`).join("")}</span><button type="button" class="mzc-mic" aria-label="Ask out loud">🎤</button><button type="submit" class="mzc-send" aria-label="Ask">${PLANE}</button>`;
  const input = bar.querySelector("input") as HTMLInputElement, sendBtn = bar.querySelector(".mzc-send") as HTMLElement, avEl = bar.querySelector(".mzc-av") as HTMLElement;
  const visitorName = () => { try { return (localStorage.getItem("lc_name") || "").trim().split(/\s+/)[0].slice(0, 20); } catch { return ""; } };
  const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
  const play = (fn: () => TL | null) => new Promise<void>((res) => { const t = fn(); if (!t) { res(); return; } t.eventCallback("onComplete", () => res()); });
  const linesOf = (k: string) => rig.linesOf(k as MzQa);

  /* his voice: the device's own (settings.mascot.convo), mouth in time with each word */
  const VOX = { ok: typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined", v: null as SpeechSynthesisVoice | null };
  function pickVoice() {
    if (!VOX.ok) return; let vs: SpeechSynthesisVoice[] = []; try { vs = speechSynthesis.getVoices(); } catch {} if (!vs.length) return;
    let v = cfg.convo.voiceName ? vs.find((x) => x.name === cfg.convo.voiceName) : undefined;
    if (!v) { const en = vs.filter((x) => /^en/i.test(x.lang)), k = cfg.convo.voiceKind; const pool = k === "male" ? en.filter((x) => MALE.test(x.name) && !FEMALE.test(x.name)) : k === "female" ? en.filter((x) => FEMALE.test(x.name)) : en; v = pool[0] || en[0] || vs[0]; }
    VOX.v = v || null;
  }
  if (VOX.ok) { pickVoice(); try { speechSynthesis.addEventListener("voiceschanged", pickVoice); offs.push(() => speechSynthesis.removeEventListener("voiceschanged", pickVoice)); } catch {} }
  const hush = () => { try { if (VOX.ok) speechSynthesis.cancel(); } catch {} };
  function viseme(w: string) { const x = w.toLowerCase(), m = /^[mbp]/.test(x) ? "flat" : /[ou]/.test(x) ? "o" : /a/.test(x) ? "open" : "grin"; rig.setMouth(m, true); clearTimeout(CV.mt); CV.mt = window.setTimeout(() => rig.setMouth(rig.mouth, true), 140); }
  function beat() { const s = rig.s; G.to(s, { nod: (Math.random() - 0.5) * 8, duration: 0.16, ease: "power1.out", overwrite: "auto" }); G.fromTo(s, { bob: 0 }, { bob: -1.8, duration: 0.09, yoyo: true, repeat: 1, overwrite: "auto" }); }
  function setSay(t: string, fresh = false) { say.hidden = false; say.textContent = t; if (fresh && !still) G.fromTo(say, { scale: 0.75, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.32, ease: "back.out(2.2)" }); placeSay(); }
  function speakLine(text: string) {
    const tok = CV.token;
    return new Promise<void>((res) => {
      if (!CV.on || tok !== CV.token || !text) { res(); return; }
      CV.idleAt = Date.now(); setSay("", true);
      const words = [...text.matchAll(/\S+/g)], n = words.length, clean = stripEmoji(text), voiced = cfg.convo.voice && VOX.ok && clean.length > 0, rate = cfg.convo.rate / 100;
      let shown = 0, done = false, tw = 0, safety = 0;
      const reveal = (i: number) => { i = clamp(i, 0, n - 1); if (i < shown) return; shown = i + 1; const w = words[i]; setSay(text.slice(0, (w.index ?? 0) + w[0].length)); viseme(w[0]); beat(); };
      const finish = () => { if (done) return; done = true; clearInterval(tw); clearTimeout(safety); if (tok === CV.token) setSay(text); G.to(rig.s, { nod: 0, duration: 0.3 }); window.setTimeout(res, 300); };
      const typeOn = (ms: number) => { let i = shown; clearInterval(tw); tw = window.setInterval(() => { if (tok !== CV.token) { finish(); return; } if (i >= n) { clearInterval(tw); if (!voiced) finish(); return; } reveal(i++); }, ms); };
      if (!voiced) { typeOn(still ? 60 : 250); return; }
      let gotB = false; const cw = [...clean.matchAll(/\S+/g)];
      const u = new SpeechSynthesisUtterance(clean); if (VOX.v) { u.voice = VOX.v; u.lang = VOX.v.lang; }
      u.rate = rate; u.pitch = cfg.convo.pitch / 100; u.volume = cfg.convo.volume / 100;
      u.onstart = () => { window.setTimeout(() => { if (!gotB && !done) typeOn(Math.round(330 / rate)); }, 380); };
      u.onboundary = (e) => { if (e.name && e.name !== "word") return; gotB = true; clearInterval(tw); let k = cw.findIndex((m) => (m.index ?? 0) + m[0].length > e.charIndex); if (k < 0) k = cw.length - 1; reveal(Math.round(((k + 1) / cw.length) * n) - 1); };
      u.onend = finish; u.onerror = finish;
      safety = window.setTimeout(finish, 2000 + (clean.length * 120) / rate);
      try { speechSynthesis.speak(u); } catch { typeOn(250); }
      window.setTimeout(() => { if (!done && !gotB && shown === 0) { let sp = false; try { sp = speechSynthesis.speaking; } catch {} if (!sp) typeOn(250); } }, 900);
    });
  }
  /* his bubble: beside his head on the roomier side, or above it */
  function placeSay() {
    if (say.hidden) return; const s = rig.s, L = layer.getBoundingClientRect();
    const a = rig.pt(70 + s.x, 92 + s.y), b = rig.pt(170 + s.x, 92 + s.y), tp = rig.pt(120 + s.x, 24 + s.y);
    const minX = Math.min(a[0], b[0]), maxX = Math.max(a[0], b[0]), hy = (a[1] + b[1]) / 2, w = say.offsetWidth, h = say.offsetHeight, roomL = minX - 12, roomR = L.width - maxX - 12;
    let x: number, y: number, side: string;
    if (Math.max(roomL, roomR) >= Math.min(w, 240) + 16) { if (roomR >= roomL) { x = maxX + 16; side = "r"; } else { x = minX - 16 - w; side = "l"; } y = hy - h * 0.8; }
    else { x = tp[0] - w / 2; y = tp[1] - h - 18; side = "t"; }
    x = clamp(x, 8, Math.max(8, L.width - w - 8)); y = clamp(y, 56, Math.max(56, L.height - h - 8));
    say.style.left = x + "px"; say.style.top = y + "px"; say.dataset.side = side;
    say.style.setProperty("--ty", clamp(hy - y, 18, h - 18) + "px"); say.style.setProperty("--tx", clamp(tp[0] - x, 22, w - 22) + "px");
  }
  function placeInvite() {
    if (invite.hidden) return; const [px, py] = rig.pt(120 + rig.s.x, 18 + rig.s.y), w = invite.offsetWidth, h = invite.offsetHeight, L = layer.getBoundingClientRect(), x = clamp(px - w / 2, 8, L.width - w - 8);
    invite.style.left = x + "px"; invite.style.top = Math.max(8, py - h - 12) + "px"; invite.style.setProperty("--tx", clamp(px - x, 16, w - 16) + "px");
  }
  const tick = () => { if (CV.on) placeSay(); placeInvite(); };
  G.ticker.add(tick); offs.push(() => G.ticker.remove(tick));

  /* gestures: a pose for the free hands and head, one per sentence */
  const GP: Record<string, Record<string, number>> = {
    open: { lx: 72, ly: 176, rx: 168, ry: 176, head: -3, brow: 0.5 }, chest: { rx: 126, ry: 178, lx: 86, ly: 214, head: 3, brow: 0.3 }, self: { rx: 134, ry: 166, lx: 84, ly: 214, head: -4, brow: 0.6 },
    point: { rx: 178, ry: 140, lx: 84, ly: 214, lean: 2, brow: 0.4 }, down: { rx: 170, ry: 206, lx: 84, ly: 214, gy: 0.5 }, sweep: { rx: 192, ry: 118, lx: 70, ly: 160, head: -5, brow: 0.8 },
    count: { lx: 74, ly: 136, rx: 104, ry: 150, head: 3 }, shrug: { lx: 62, ly: 194, rx: 178, ry: 194, brow: 1, head: 6 }, thumb: { rx: 178, ry: 138, lx: 84, ly: 214, brow: 0.7 },
    lean: { lx: 86, ly: 200, rx: 154, ry: 200, lean: 3, brow: 0.6 },
  };
  function gesture(name: string, free: "both" | "left" | "none" = "both") {
    const p: Record<string, number> = { gx: 0, gy: 0, lean: 0, ...(GP[name] || {}) };
    if (free === "left") { if (p.lx !== undefined) { delete p.rx; delete p.ry; } else if (p.rx !== undefined) { p.lx = 240 - p.rx; p.ly = p.ry; delete p.rx; delete p.ry; } }
    if (free === "none") { delete p.lx; delete p.ly; delete p.rx; delete p.ry; }
    G.to(rig.s, { ...p, duration: 0.5, ease: "power2.out", overwrite: "auto" });
    if (name === "thumb") rig.burst(["👍"], 178, 120, 1, "", 10);
  }
  async function talk(lines: string[], gest: string[] = [], free: "both" | "left" | "none" = "both") { for (let i = 0; i < lines.length; i++) { if (!CV.on) return; if (gest.length && !still) gesture(gest[i % gest.length], free); await speakLine(lines[i]); } }
  function stance() { const s = rig.s; rig.run((t) => { t.to(s, { ...REST, ...CLEAR, lx: 88, ly: 214, rx: 152, ry: 214, duration: 0.5, ease: "power2.inOut" }); t.call(() => { rig.setProp(null); rig.face("smile", "open"); rig.setGl(false); if (!still) rig.loop(G.to(s, { rot: 1.4, duration: 2.4, yoyo: true, repeat: -1, ease: "sine.inOut" })); }); }); }
  function listen() { if (CV.listening || CV.performing || !CV.on || still) return; CV.listening = true; const s = rig.s;
    rig.run((t) => { t.call(() => rig.face("smile", "open")); t.to(s, { ...REST, ...CLEAR, rx: 172, ry: 104, lx: 88, ly: 214, head: -7, gy: 0.7, brow: 0.5, lean: -2, duration: 0.4, ease: "power2.out" }); }); }
  const endLoops = (more: Record<string, number>) => play(() => { const t = G.timeline(); t.call(() => rig.stopLoops()); t.to(rig.s, { ...more, duration: 0.4 }); return t; });

  /* what he does for each question: steps run one after another; a newer question stops the older one between steps */
  const SCRIPT: Record<string, (arg?: string) => Step[]> = {
    start() { const s = rig.s, nm = visitorName(); return [
      () => play(() => { const t = rig.begin(null, "grin"); t.to(s, { rx: 182, ry: 100, lx: 84, ly: 214, duration: 0.35, ease: "back.out(1.7)" }); const w = G.timeline({ repeat: 3, yoyo: true }); w.to(s, { rx: 195, ry: 113, duration: 0.18 }); t.add(w); return t; }),
      () => talk([(nm ? `Hey ${nm}! ` : "") + cfg.convo.hello, "Ask me anything, or pick a card below 👇"], ["open", "point"])]; },
    who() { const s = rig.s; return [
      () => play(() => { const t = rig.begin(null, "grin"); t.to(s, { sy: 0.88, sx: 1.07, y: 2, duration: 0.14, ease: "power2.out" }).to(s, { y: -30, sy: 1.05, sx: 0.96, lx: 70, ly: 96, rx: 170, ry: 96, duration: 0.26, ease: "power2.out" }).call(() => SND.whoosh(0.5))
        .to(s, { y: 0, duration: 0.22, ease: "power2.in" }).to(s, { sy: 0.9, sx: 1.08, duration: 0.07 }).to(s, { sy: 1.03, sx: 1, upY: -3, lx: 90, ly: 212, rx: 150, ry: 212, hy: -2, head: -3, brow: 0.5, cape: 1, duration: 0.5, ease: "back.out(1.8)" })
        .call(() => { rig.loop(G.fromTo(s, { capeW: -6 }, { capeW: 7, duration: 0.55, yoyo: true, repeat: -1, ease: "sine.inOut" })); rig.burst(["💨", "💨"], 40, 210, 2, "", 30); })
        .to(s, { shades: 1, duration: 0.5, ease: "bounce.out" }).call(() => { rig.burst(["✨"], 132, 130, 1, "", 4); SND.ting(); }); return t; }),
      () => talk(linesOf("who"), ["self", "chest", "down", "sweep"]),
      () => endLoops({ cape: 0, shades: 0, capeW: 0 })]; },
    job() { const s = rig.s; return [
      () => play(() => { const t = rig.begin("laptop", "smile"); t.call(() => rig.setGl(true)); t.to(s, { lx: 92, ly: 205, rx: 148, ry: 205, gy: 0.8, hy: 3, duration: 0.4 }); const ty = G.timeline({ repeat: 7 }); ty.to(s, { ly: 199, ry: 206, duration: 0.06 }).to(s, { ly: 206, ry: 199, duration: 0.06 }); t.add(ty);
        t.call(() => { rig.face("grin"); rig.burst(["📊", "📈", "💡"], 120, 150, 3, "", 90); }).to(s, { gy: -0.1, hy: 0, brow: 0.7, duration: 0.25 }); return t; }),
      () => talk(linesOf("job"), ["open"], "none"), () => rig.setGl(false)]; },
    from() { const s = rig.s; return [
      () => play(() => { const t = rig.begin("flag", "grin"); t.to(s, { rx: 174, ry: 112, lx: 86, ly: 214, brow: 0.5, duration: 0.45, ease: "back.out(1.6)" }); t.call(() => { rig.loop(G.to(s, { rx: 182, ry: 104, pa: -10, duration: 0.45, yoyo: true, repeat: -1, ease: "sine.inOut" })); }); return t; }),
      () => talk(linesOf("from"), ["open", "down"], "left"),
      () => play(() => { const t = G.timeline(); t.call(() => rig.stopLoops()); t.to(s, { y: -12, duration: 0.16, yoyo: true, repeat: 3, ease: "power2.out" }); return t; })]; },
    joke() { const s = rig.s, L = linesOf("joke"), punch = L.length > 1 ? L.pop() : null; return [
      () => play(() => { const t = rig.begin(null, "grin"); t.to(s, { rx: 156, ry: 186, lx: 84, ly: 186, brow: 0.6, duration: 0.3 }); return t; }),
      () => talk(L, ["lean", "count"]), () => wait(450), () => (punch ? talk([punch], ["open"]) : null),
      () => play(() => { const t = G.timeline(); t.call(() => { rig.burst(["🥁", "ba-dum", "tss!"], 120, 40, 3, "bang", 130); SND.rimshot(); rig.face("grin", "happy"); });
        t.to(s, { lx: 108, ly: 200, rx: 132, ry: 200, duration: 0.2 }); t.to(s, { upY: -3, duration: 0.06, yoyo: true, repeat: 9 });
        t.to(s, { flip: 90, x: -24, y: 52, duration: 0.45, ease: "power2.in" }).call(() => { SND.thud(); rig.burst(["😂", "🤣", "😂"], 170, 210, 3, "", 90); });
        const k = G.timeline({ repeat: 5 }); k.to(s, { lg: -18, rg: 6, duration: 0.12 }).to(s, { lg: 6, rg: -18, duration: 0.12 }); t.add(k);
        t.to(s, { flip: 0, x: 0, y: -20, lg: 0, rg: 0, duration: 0.4, ease: "power2.out" }).to(s, { y: 0, duration: 0.2, ease: "power2.in" }); t.call(() => rig.face("grin", "open")); return t; })]; },
    food() { const s = rig.s, L = linesOf("food"); return [
      () => play(() => { const t = rig.begin("cup", "smile"); t.to(s, { rx: 150, ry: 174, lx: 86, ly: 214, duration: 0.35 }); t.call(() => rig.every(300, () => rig.burst([""], rig.s.rx - 2, rig.s.ry - 22, 1, "steam", 16))); return t; }),
      () => (L[0] ? talk([L[0]], ["open"], "left") : null),
      () => play(() => { const t = G.timeline(); t.to(s, { rx: 132, ry: 140, gy: 0.2, duration: 0.45, ease: "power2.inOut" }).call(() => { rig.eyes = "closed"; }).to({}, { duration: 0.7 }).call(() => rig.setEyes("open")).to(s, { rx: 150, ry: 174, gy: 0, duration: 0.35 }); t.call(() => rig.stopLoops()); return t; }),
      () => (L[1] ? talk([L[1]], ["point"], "left") : null),
      () => play(() => { const t = G.timeline(); t.call(() => rig.setProp(null)).to(s, { lx: 116, ly: 134, rx: 166, ry: 222, duration: 0.25, ease: "power2.out" }).call(() => rig.face("o")).to(s, { lx: 84, ly: 214, duration: 0.2 }).to({}, { duration: 0.4 });
        t.call(() => { rig.face("open"); SND.boing(); }).to(s, { blush: 1.5, brow: 1.5, sy: 1.06, duration: 0.15, ease: "power3.out" });
        t.call(() => { rig.say("SPICY! 🌶️🔥"); rig.every(200, () => { rig.burst(["💨"], 76, 100, 1, "", 20); rig.burst(["💨"], 164, 100, 1, "", 20); }); });
        const fan = G.timeline({ repeat: 7, yoyo: true }); fan.to(s, { lx: 106, ly: 128, duration: 0.08 }).to(s, { lx: 116, ly: 136, duration: 0.08 }); t.add(fan); t.to(s, { y: -14, duration: 0.16, yoyo: true, repeat: 3, ease: "power2.out" }, "<");
        t.call(() => { rig.stopLoops(); rig.face("grin", "happy"); }).to(s, { blush: 0, brow: 0, sy: 1, duration: 0.4 }); return t; }),
      () => talk(["Worth it. 😋"], ["thumb"])]; },
    single() { const s = rig.s; return [
      () => play(() => { const t = rig.begin(null, "smile"); t.to(s, { blush: 1.2, lx: 110, ly: 226, rx: 130, ry: 226, head: 8, gx: -0.9, gy: 0.5, brow: 0.6, duration: 0.45 }); t.call(() => { rig.loop(G.to(s, { rg: 10, rot: -1.5, duration: 0.35, yoyo: true, repeat: -1, ease: "sine.inOut" })); rig.burst(["💗", "💕", "💗"], 120, 60, 3, "", 100); }); return t; }),
      () => talk(linesOf("single"), [], "none"), () => endLoops({ blush: 0, rg: 0, rot: 0 })]; },
    sing() { const s = rig.s; return [
      () => play(() => { const t = rig.begin("mic", "grin", "happy"); t.to(s, { rx: 136, ry: 136, lx: 70, ly: 150, brow: 0.6, duration: 0.35, ease: "back.out(1.5)" }); t.call(() => { rig.loop(G.to(s, { rot: 4, head: 6, duration: 0.5, yoyo: true, repeat: -1, ease: "sine.inOut" })); rig.every(600, () => rig.burst([pick(["🎵", "🎶"])], 150, 110, 1, "", 60)); SND.notes(); }); return t; }),
      () => talk(linesOf("sing"), ["sweep"], "left"), () => endLoops({ rot: 0, head: 0 })]; },
    trick() { const list = Object.entries(cfg.tricks).filter(([, v]) => v).map(([k]) => k), k = list.length ? list[trickI++ % list.length] : "wave"; return [() => talk(["Watch this! 😎"], ["point"]), () => play(() => TRICKS[k](rig))]; },
    game() { return [() => talk(linesOf("game"), ["count"]), () => { CV.mode = "game"; }]; },
    rps(you) { return [() => play(() => rps(rig, you || "rock", (res) => { score[res]++; }))]; },
    tour() { const n = nextSection(), title = n ? (n.id === "hero" ? "the top" : (n.querySelector("h2")?.textContent || n.id).trim().slice(0, 40)) : "the homepage";
      return [() => talk([`${linesOf("tour")[0] || "Follow me!"} Next up: ${title}.`], ["sweep"]), () => closeScene(() => tourGo(n))]; },
    top() { return [() => talk(["Up we go! ⬆️"], ["point"]), () => closeScene(() => toTop())]; },
    bye() { return [() => rocketBye()]; },
    hello(line) { const s = rig.s; return [() => { if (!still) rig.loop(G.fromTo(s, { rx: 182, ry: 100 }, { rx: 195, ry: 113, duration: 0.18, yoyo: true, repeat: 7 })); }, () => talk([line || "Hi! 👋"]), () => rig.stopLoops()]; },
    laugh() { const s = rig.s; return [() => play(() => { const t = rig.begin(null, "grin", "happy"); t.to(s, { lx: 108, ly: 200, rx: 132, ry: 200, duration: 0.2 }); t.to(s, { upY: -3, rot: 2, duration: 0.07, yoyo: true, repeat: 11 }); t.call(() => { rig.burst(["😂", "🤣"], 120, 50, 3, "", 120); SND.giggle(); }, undefined, 0.2); return t; }), () => talk(["Haha! Glad you're having fun! 😄"], ["open"])]; },
    love() { const s = rig.s; return [() => play(() => { const t = rig.begin(null, "smile"); t.to(s, { blush: 1.3, rx: 126, ry: 178, lx: 110, ly: 200, head: 7, duration: 0.4 }); t.call(() => rig.burst(["💖", "💕", "💗"], 120, 50, 4, "", 130)); return t; }), () => talk(["Aww, right back at you! 💖"], [], "none"), () => endLoops({ blush: 0 })]; },
    fire() { return [() => play(() => TRICKS.fireup(rig))]; },
    nudge() { const s = rig.s; return [() => play(() => { const t = rig.begin(null, "smile"); const tap = G.timeline({ repeat: 5, yoyo: true }); tap.to(s, { rk: 7, duration: 0.12 }); t.add(tap); t.to(s, { gx: -0.9, head: -5, duration: 0.5 }, 0.35).to(s, { gx: 0.9, head: 5, duration: 0.7 }).to(s, { gx: 0, head: 0, duration: 0.4 }); return t; }), () => talk(["Still there? Ask me anything! 😄"], ["open"])]; },
    shrug() { return [() => talk(["Hmm, I don't know that one yet. Try a card! 👇"], ["shrug"])]; },
  };
  const score = { you: 0, him: 0, draw: 0 };
  const QKEYS = MZ_QA.map(([k]) => k as string);
  function convoAsk(k: string, arg?: string) {
    if (!CV.on) return; const tok = ++CV.token; hush();
    hideCards(); CV.performing = true; CV.listening = false; CV.idleAt = Date.now(); rig.stopLoops();
    const isQ = QKEYS.includes(k); if (isQ) addHeart("q-" + k);
    let steps: Step[] = still ? [() => talk(k === "start" ? [cfg.convo.hello] : isQ ? linesOf(k) : [arg || "Hmm! 🤔"])] : (SCRIPT[k] || SCRIPT.shrug)(arg);
    if (still && (k === "bye" || k === "top" || k === "tour")) steps = (SCRIPT[k] || SCRIPT.shrug)(arg);
    if (isQ && CV.asked.has(k) && !["trick", "game", "bye", "tour"].includes(k)) steps = [() => talk(["You already asked that! 😄 Okay, once more…"], ["shrug"]), ...steps];
    if (isQ) CV.asked.add(k);
    if (!still) G.fromTo(wrap, { scale: CV.S * 0.97 }, { scale: CV.S, duration: 0.5, ease: "power2.out" });
    (async () => { for (const st of steps) { if (tok !== CV.token || !CV.on) return; await st(); }
      if (tok !== CV.token || !CV.on) return; CV.performing = false; CV.last = k; stance(); showCards(k); CV.idleAt = Date.now(); })();
  }

  /* the visitor's side: tilted reply cards, their own words flying up to him, quick reactions */
  function hideCards() { cards.hidden = true; cards.innerHTML = ""; }
  function card(emoji: string, label: string, fn: (el: HTMLElement) => void, cls = "") {
    const b = mk("button", "mzc-card" + (cls ? " " + cls : ""), `<span class="mzc-em">${emoji}</span><span>${label}</span>`) as HTMLButtonElement; b.type = "button";
    b.style.setProperty("--r", (Math.random() * 6 - 3).toFixed(1) + "deg"); b.onclick = () => fn(b); cards.appendChild(b); return b;
  }
  function showCards(k: string) {
    cards.innerHTML = "";
    if (CV.mode === "game") {
      const sc = mk("div", "mzc-score"); sc.textContent = `You ${score.you} · Him ${score.him} · Draws ${score.draw}`; cards.appendChild(sc);
      ([["rock", "✊"], ["paper", "✋"], ["scissors", "✌️"]] as const).forEach(([c, e]) => card(e, c[0].toUpperCase() + c.slice(1), (el) => send(e, el, () => convoAsk("rps", c)), "big"));
      card("↩️", "Something else", () => { CV.mode = ""; showCards("game"); }, "sm");
    } else {
      const on = QKEYS.filter((x) => cfg.qa[x as MzQa]?.on && !["bye", "tour"].includes(x)), list: string[] = [];
      (FOLLOW[k] || []).forEach((x) => { if (on.includes(x) && !CV.asked.has(x) && list.length < 3) list.push(x); });
      on.forEach((x) => { if (!CV.asked.has(x) && !list.includes(x) && list.length < 3) list.push(x); });
      (FOLLOW[k] || on).forEach((x) => { if (on.includes(x) && !list.includes(x) && list.length < 3) list.push(x); });
      list.forEach((x) => card(QE[x] || "💬", cfg.qa[x as MzQa].q, (el) => send(cfg.qa[x as MzQa].q, el, () => convoAsk(x))));
      if (cfg.qa.tour.on && !preview) card("🧭", cfg.qa.tour.q, (el) => send(cfg.qa.tour.q, el, () => convoAsk("tour")), "sm");
      if (!preview) card("⬆️", "Take me to the top", (el) => send("Take me to the top", el, () => convoAsk("top")), "sm");
      if (cfg.qa.bye.on) card("👋", cfg.qa.bye.q, (el) => send(cfg.qa.bye.q, el, () => convoAsk("bye")), "sm");
    }
    cards.hidden = false;
    if (!still) G.fromTo(cards.children, { y: 40, opacity: 0, rotation: (i: number) => (i % 2 ? 12 : -12) }, { y: 0, opacity: 1, rotation: 0, duration: 0.5, stagger: 0.07, ease: "back.out(1.8)" });
  }
  /* their words (or a picked card) become a bubble that flies up to him; he catches it, then answers */
  function send(text: string, from: HTMLElement | null, then: () => void) {
    markGesture(); CV.idleAt = Date.now(); hideCards();
    you.textContent = text; you.hidden = false; G.killTweensOf(you);
    const L = layer.getBoundingClientRect(), A = (from || avEl).getBoundingClientRect();
    G.set(you, { x: 0, y: 0, scale: 1, opacity: 1, rotation: 0 });
    you.style.left = clamp(A.left - L.left, 8, L.width - you.offsetWidth - 8) + "px"; you.style.top = Math.max(8, A.top - L.top - you.offsetHeight - 10) + "px";
    if (still) { window.setTimeout(() => { you.hidden = true; then(); }, 600); return; }
    G.fromTo(avEl, { scale: 1 }, { scale: 1.25, duration: 0.15, yoyo: true, repeat: 1 });
    const [hx, hy] = rig.pt(120 + rig.s.x, 60 + rig.s.y), Y = you.getBoundingClientRect(), dx = hx - (Y.left - L.left + Y.width / 2), dy = hy - (Y.top - L.top + Y.height / 2);
    const t = G.timeline({ onComplete: () => { you.hidden = true; then(); } });
    t.fromTo(you, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: "back.out(2)" })
      .to({}, { duration: 0.45 })
      .to(you, { x: dx, y: dy, scale: 0.25, rotation: dx > 0 ? 14 : -14, duration: 0.55, ease: "power2.in" })
      .call(() => { const s = rig.s; G.to(s, { brow: 1.2, gy: -0.4, duration: 0.12, yoyo: true, repeat: 1 }); rig.burst(["💭"], 150, 30, 1, "", 10); })
      .to(you, { opacity: 0, duration: 0.12 });
  }
  function typed(v: string) {
    const m = KEYS.find(([, re]) => re.test(v.toLowerCase()));
    send(v, null, () => {
      if (!m) { convoAsk("shrug"); return; }
      if (m[0] === "salam") { convoAsk("hello", "Walaikum assalam! 👋 So good to see you."); return; }
      if (m[0] === "hello") { convoAsk("hello", pick(["Hello! 👋 Nice to meet you.", "Hey hey! 👋 Ask me anything.", "Hi there! 👋 What do you want to know?"])); return; }
      if (m[0] !== "top" && !cfg.qa[m[0] as MzQa]?.on) { convoAsk("shrug"); return; }
      convoAsk(m[0]);
    });
  }
  on(bar, "submit", (e: Event) => { e.preventDefault(); const v = input.value.trim(); input.value = ""; bar.classList.remove("typing"); CV.listening = false; if (!v) { input.focus(); return; }
    if (!still) G.fromTo(sendBtn.querySelector("svg"), { x: 0, y: 0, opacity: 1 }, { keyframes: [{ x: 16, y: -16, opacity: 0, duration: 0.3, ease: "power2.in" }, { x: -10, y: 10, duration: 0 }, { x: 0, y: 0, opacity: 1, duration: 0.25, ease: "back.out(2)" }] });
    typed(v); });
  on(input, "keydown", (e: KeyboardEvent) => e.stopPropagation()); // the site's own keyboard shortcuts stay out of it
  on(input, "input", () => { CV.idleAt = Date.now(); bar.classList.toggle("typing", !!input.value); if (CV.performing || !CV.on) return; if (input.value) { listen(); if (!still) G.fromTo(rig.s, { nod: 0 }, { nod: 3, duration: 0.1, yoyo: true, repeat: 1 }); } });
  on(input, "blur", () => { bar.classList.remove("typing"); if (CV.listening && !CV.performing && CV.on) { CV.listening = false; stance(); } });
  bar.querySelectorAll<HTMLButtonElement>("[data-q]").forEach((b) => on(b, "click", () => { const k = b.dataset.q || "wave"; const em = b.textContent || "";
    send(em, b, () => { if (k === "wave") convoAsk("hello", pick(["Hey hey! 👋", "Hi hi! 👋 Good to see you!"])); else convoAsk(k); }); }));
  on(bar.querySelector(".mzc-mic") as HTMLElement, "click", () => {
    const SR = (window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;
    if (!SR) { convoAsk("hello", "My ears only work in Chrome or Edge. Type it for me? 🎤"); return; }
    try { const r = new SR(); r.lang = "en-US"; r.interimResults = false; listen(); bar.classList.add("hearing");
      r.onresult = (ev) => { bar.classList.remove("hearing"); const t = ev.results[0][0].transcript; if (t) typed(t); };
      r.onerror = () => { bar.classList.remove("hearing"); convoAsk("hello", "Sorry, I didn't catch that. Type it for me? 🎤"); }; r.onend = () => bar.classList.remove("hearing"); r.start(); }
    catch { convoAsk("hello", "Sorry, I didn't catch that. Type it for me? 🎤"); }
  });
  const syncTop = () => { (top.querySelector(".mzc-vo") as HTMLElement).textContent = cfg.convo.voice ? "🔊" : "🔇"; (bar.querySelector(".mzc-mic") as HTMLElement).hidden = !cfg.convo.mic; };
  on(top.querySelector(".mzc-vo") as HTMLElement, "click", () => { cfg = { ...cfg, convo: { ...cfg.convo, voice: !cfg.convo.voice } }; if (!cfg.convo.voice) hush(); syncTop(); });
  on(top.querySelector(".mzc-x") as HTMLElement, "click", () => closeScene());
  on(dim, "click", () => closeScene());
  let hintI = 0;
  every(2600, () => { if (CV.on && !input.value && document.activeElement !== input) input.placeholder = HINTS[hintI++ % HINTS.length]; });

  /* opening and closing the scene */
  function target() { const L = layer.getBoundingClientRect(), w = wrap.offsetWidth, h = wrap.offsetHeight, S = clamp((L.height * 0.46) / h, 1.1, cfg.convo.scale / 100); return { x: L.width / 2 - (wrap.offsetLeft + w / 2), y: L.height * 0.7 - (wrap.offsetTop + h), S }; }
  function openScene(first?: string) {
    if (CV.on) { if (first) convoAsk(first); return; }
    if (!visible() || away || held) return;
    markGesture(); hideInvite(); hostBack?.kill(); hostBack = null; leanBack?.kill(); leanBack = null; stopSleep(rig); rig.hush();
    CV.on = true; busy = true; CV.mode = ""; CV.token++; CV.idleAt = Date.now(); setLive(); wrap.classList.add("on-stage");
    rig.sayHook = (t) => { if (!CV.on) return false; void speakLine(t); return "quiet"; };
    G.killTweensOf(wrap); G.set(wrap, { xPercent: 0, yPercent: 0, rotation: 0, transformOrigin: "50% 100%" });
    dim.style.setProperty("--mzd", String(cfg.convo.dim / 100)); dim.hidden = false; G.fromTo(dim, { opacity: 0 }, { opacity: 1, duration: still ? 0.01 : 0.5 });
    const T = target(), s = rig.s, cy = Number(G.getProperty(wrap, "y")); CV.S = T.S;
    const ready = () => { if (!CV.on) return; syncTop(); [top, bar].forEach((e) => { e.hidden = false; G.fromTo(e, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35 }); }); if (first) convoAsk(first); else convoAsk("start"); };
    if (still) { G.set(wrap, { x: T.x, y: T.y, scale: T.S }); ready(); return; }
    rig.run((t) => { t.call(() => { rig.setProp(null); rig.face("grin", "happy"); }); t.to(s, { ...REST, ...CLEAR, sy: 0.86, sx: 1.08, y: 3, duration: 0.14, ease: "power2.out" });
      t.to(s, { sy: 1.06, sx: 0.95, y: 0, lx: 70, ly: 96, rx: 170, ry: 96, lg: 14, rg: -14, duration: 0.3, ease: "power2.out" }); t.to(s, { lg: 0, rg: 0, lx: 74, ly: 200, rx: 166, ry: 200, duration: 0.3 }, "+=.16");
      t.to(s, { sy: 0.84, sx: 1.12, duration: 0.08 }); t.call(() => { SND.thud(); rig.face("grin", "open"); }); t.to(s, { ...REST, duration: 0.55, ease: "elastic.out(1,.45)" }); });
    G.to(wrap, { x: T.x, duration: 0.85, ease: "power1.inOut" });
    G.to(wrap, { keyframes: [{ y: Math.min(cy, T.y) - 150, duration: 0.45, ease: "power2.out" }, { y: T.y, duration: 0.4, ease: "power2.in" }] });
    G.to(wrap, { scale: T.S, duration: 0.85, ease: "power2.inOut", onComplete: () => { if (!CV.on) return; G.fromTo(wrap, { scale: T.S * 0.96 }, { scale: T.S, duration: 0.7, ease: "elastic.out(1,.5)" }); ready(); } });
  }
  function hideScene() { [say, cards, you, bar, top].forEach((e) => { e.hidden = true; }); cards.innerHTML = ""; input.blur(); }
  function closeScene(after?: () => void) {
    if (!CV.on) return; CV.on = false; CV.token++; CV.performing = false; CV.listening = false; hush(); hideScene(); rig.sayHook = null; rig.stopLoops();
    const s = rig.s, cy = Number(G.getProperty(wrap, "y"));
    const done = () => { wrap.classList.remove("on-stage"); busy = false; setLive(); placeWrap(true); resume(); after?.(); };
    G.to(dim, { opacity: 0, duration: still ? 0.01 : 0.6, delay: still ? 0 : 0.3, onComplete: () => { dim.hidden = true; } });
    G.killTweensOf(wrap);
    if (still) { G.set(wrap, { x: 0, y: 0, scale: 1 }); done(); return; }
    rig.run((t) => { t.call(() => { rig.setProp(null); rig.face("grin", "open"); }); t.to(s, { ...REST, ...CLEAR, rx: 182, ry: 100, duration: 0.25 }); t.to(s, { rx: 195, ry: 113, duration: 0.15, yoyo: true, repeat: 3 }); t.to(s, { ...REST, duration: 0.3 }); });
    G.to(wrap, { x: 0, duration: 0.8, delay: 0.35, ease: "power1.inOut" });
    G.to(wrap, { keyframes: [{ y: cy - 120, duration: 0.4, ease: "power2.out" }, { y: 0, duration: 0.4, ease: "power2.in" }], delay: 0.35 });
    G.to(wrap, { scale: 1, duration: 0.8, delay: 0.35, ease: "power2.inOut", onComplete: done });
  }
  every(1000, () => { if (CV.on && !CV.performing && !CV.listening && Date.now() - CV.idleAt > 14000 && Date.now() - CV.nudged > 25000 && !document.hidden) { CV.nudged = Date.now(); convoAsk("nudge"); } });

  /* the "Wanna chat?" invite over his head */
  function hideInvite() { if (invite.hidden) return; G.to(invite, { opacity: 0, scale: 0.8, duration: 0.2, onComplete: () => { invite.hidden = true; } }); }
  function showInvite() { invite.textContent = cfg.convo.inviteText || "Wanna chat? 💬"; invite.hidden = false; placeInvite(); CV.lastInvite = Date.now();
    G.fromTo(invite, { opacity: 0, scale: 0.5, y: 10 }, { opacity: 1, scale: 1, y: 0, duration: still ? 0.01 : 0.45, ease: "back.out(2.4)" }); window.setTimeout(hideInvite, 6500); }
  on(invite, "click", () => { hideInvite(); openScene(); });
  CV.lastInvite = Date.now() - Math.max(0, cfg.convo.inviteEvery - 8) * 1000;
  every(1000, () => { if (!preview && cfg.convo.invite && free() && !rig.sleeping && invite.hidden && !document.hidden && Date.now() - CV.lastInvite > cfg.convo.inviteEvery * 1000 && Date.now() - lastAct > 2500) showInvite(); });

  /* ---------- the tour and the top ---------- */
  const sectionEls = () => [...document.querySelectorAll<HTMLElement>("section[data-spy][id]")];
  function nextSection() { const list = sectionEls(); if (!list.length || preview) return null; const i = list.findIndex((x) => x.id === cur); return list[(i + 1) % list.length]; }
  const lenis = () => (window as unknown as { __lenis?: { scrollTo(t: HTMLElement | number, o?: object): void } }).__lenis;
  function tourGo(n: HTMLElement | null) { if (preview) return; if (!n) { location.href = "/"; return; } const l = lenis(); if (l) l.scrollTo(n); else n.scrollIntoView({ behavior: "smooth", block: "start" }); }
  function toTop() { if (preview) return; const l = lenis(); if (l) l.scrollTo(0, { duration: 1.4 }); else window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" }); }

  /* ---------- taps, tickles and throwing ---------- */
  let taps: number[] = [], tapT = 0, tickleN = 0, tickleT = 0;
  function onTap() {
    markGesture(); const now = Date.now(); taps = taps.filter((x) => now - x < 1100); taps.push(now); clearTimeout(tapT); lastAct = now;
    if (CV.on) return;
    if (rig.sleeping) { taps = []; act((r) => wakeRig(r)); return; }
    if (taps.length >= 3 && cfg.fun.tickle && !still) { taps = []; tickleN++; clearTimeout(tickleT); tickleT = window.setTimeout(() => (tickleN = 0), 7000);
      if (tickleN >= 3) { tickleN = 0; act(FUN.grumpy, { heart: "grumpy" }); } else act(FUN.tickle, { heart: "tickle" }); return; }
    tapT = window.setTimeout(() => { if (taps.length && taps.length < 3) openScene(); taps = []; }, 300);
  }
  on(wrap, "keydown", (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!CV.on) openScene(); } });
  type Hold = { id?: number; x0: number; y0: number; started: boolean; minX: number; maxX: number; minY: number; bx: number; by: number; cx: number; cy: number; vx: number; vy: number; lt: number; qr?: (v: number) => void };
  let drag: Hold | null = null;
  const newHold = (x0 = 0, y0 = 0, id?: number): Hold => ({ id, x0, y0, started: false, minX: 0, maxX: 0, minY: 0, bx: 0, by: 0, cx: 0, cy: 0, vx: 0, vy: 0, lt: 0 });
  function bounds() { const L = layer.getBoundingClientRect(), W = wrap.getBoundingClientRect(), cx = Number(G.getProperty(wrap, "x")), cy = Number(G.getProperty(wrap, "y")); const natL = W.left - L.left - cx, natT = W.top - L.top - cy; return { minX: 6 - natL, maxX: L.width - W.width - 6 - natL, minY: 6 - natT }; }
  function startHold(d: Hold) {
    d.started = true; held = true; setLive(); lastAct = Date.now(); addHeart("throw"); hideInvite();
    hostBack?.kill(); hostBack = null; leanBack?.kill(); leanBack = null; G.killTweensOf(wrap); stopSleep(rig); busy = false; rig.hush();
    G.set(wrap, { xPercent: 0, yPercent: 0, rotation: 0, scale: 1 }); Object.assign(d, bounds());
    d.bx = clamp(Number(G.getProperty(wrap, "x")), d.minX, d.maxX); d.by = Math.min(Number(G.getProperty(wrap, "y")), 0); d.cx = d.bx; d.cy = d.by; d.vx = 0; d.vy = 0; d.lt = performance.now();
    G.set(wrap, { transformOrigin: "50% 6%" }); d.qr = G.quickTo(wrap, "rotation", { duration: 0.35, ease: "power2.out" });
    const s = rig.s; rig.run((t) => { t.call(() => { rig.setProp(null); rig.face("open", "open"); }); t.to(s, { ...REST, ...CLEAR, lx: 68, ly: 100, rx: 172, ry: 100, brow: 1.3, duration: 0.18 });
      const k = G.timeline({ repeat: -1 }); k.to(s, { lg: 16, rg: -4, ly: 94, ry: 106, duration: 0.16, ease: "sine.inOut" }).to(s, { lg: 4, rg: -16, ly: 106, ry: 94, duration: 0.16, ease: "sine.inOut" }); t.add(k); });
    rig.say(pick(["Whoa! Put me down! 😱", "Hey! Where are we going?!", "Aaah! Not so high!"]), 1800); SND.boing();
  }
  function moveHold(d: Hold, px: number, py: number) {
    const x = clamp(d.bx + (px - d.x0), d.minX, d.maxX), y = clamp(d.by + (py - d.y0), d.minY, 0), now = performance.now(), dt = Math.max(1, now - d.lt);
    d.vx = d.vx * 0.6 + ((x - d.cx) / dt) * 1000 * 0.4; d.vy = d.vy * 0.6 + ((y - d.cy) / dt) * 1000 * 0.4; d.cx = x; d.cy = y; d.lt = now;
    G.set(wrap, { x, y }); d.qr?.(clamp(-d.vx * 0.025, -35, 35));
  }
  function fall(b: Hold, vx: number, vy: number) {
    held = false; busy = true; setLive();
    let x = Number(G.getProperty(wrap, "x")), y = Number(G.getProperty(wrap, "y")), rot = Number(G.getProperty(wrap, "rotation")), w = clamp(vx * 0.18, -420, 420), last = performance.now(), bounces = 0;
    G.killTweensOf(wrap); rig.say(pick(["Wheeeee!", "Aaaah!", "Weeee! 🤸"]), 1200);
    const step = (now: number) => {
      if (held || !alive) return; const dt = Math.min(0.032, (now - last) / 1000); last = now; vy += 2400 * dt; x += vx * dt; y += vy * dt; rot += w * dt;
      if (x < b.minX) { x = b.minX; vx = -vx * 0.5; w = -w * 0.6; SND.thud(); } if (x > b.maxX) { x = b.maxX; vx = -vx * 0.5; w = -w * 0.6; SND.thud(); }
      if (y < b.minY) { y = b.minY; vy = Math.abs(vy) * 0.3; }
      if (y >= 0) { y = 0; if (vy > 380 && bounces < 3) { vy = -vy * 0.36; vx *= 0.65; w *= 0.5; bounces++; SND.boing(); G.to(rig.s, { sy: 0.85, sx: 1.1, duration: 0.06, yoyo: true, repeat: 1 }); } else { G.set(wrap, { x, y: 0 }); landed(rot); return; } }
      G.set(wrap, { x, y, rotation: rot }); requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function landed(rot: number) {
    G.set(wrap, { rotation: (((rot % 360) + 540) % 360) - 180 }); G.to(wrap, { rotation: 0, duration: 0.35, ease: "back.out(2)", onComplete: () => { G.set(wrap, { transformOrigin: "50% 100%" }); } }); SND.thud();
    const s = rig.s, t = rig.run((t) => { t.call(() => rig.face("open", "open")); t.to(s, { sy: 0.8, sx: 1.14, y: 3, lx: 66, ly: 214, rx: 174, ry: 214, lg: -10, rg: 10, duration: 0.08 }).to(s, { ...REST, ...CLEAR, brow: 0.8, duration: 0.6, ease: "elastic.out(1,.45)" });
      t.call(() => { rig.face("smile", "open"); rig.burst(["💫", "⭐", "💫"], 120, 30, 3, "", 60); }); t.to(s, { head: 9, hx: 3, duration: 0.25, yoyo: true, repeat: 5, ease: "sine.inOut" }); t.to(s, { head: 0, hx: 0, duration: 0.2 });
      t.call(() => { rig.face("grin", "happy"); rig.say(pick(["Wheee! Again! 🤩", "That was fun! Again?", "My head is spinning… 😵‍💫"]), 1800); }); t.to({}, { duration: 1.3 }); t.call(() => rig.face("grin", "open")); });
    t.eventCallback("onComplete", () => { busy = false; setLive(); if (Math.abs(Number(G.getProperty(wrap, "x"))) > 4) walkTo(0, () => { placeWrap(true); resume(); }); else { placeWrap(true); resume(); } });
  }
  on(wrap, "pointerdown", (e: PointerEvent) => { if ((e.pointerType === "mouse" && e.button !== 0) || away || CV.on) return; markGesture(); drag = newHold(e.clientX, e.clientY, e.pointerId); try { wrap.setPointerCapture(e.pointerId); } catch {} });
  on(wrap, "pointermove", (e: PointerEvent) => { if (!drag || drag.id !== e.pointerId) return; if (!drag.started) { if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 7 || !cfg.fun.throw || still) return; startHold(drag); } moveHold(drag, e.clientX, e.clientY); });
  on(wrap, "pointerup", (e: PointerEvent) => { if (CV.on) { drag = null; return; } if (!drag || drag.id !== e.pointerId) return; const d = drag; drag = null; if (d.started) fall(d, clamp(d.vx, -2600, 2600), clamp(d.vy, -2600, 2600)); else onTap(); });
  on(wrap, "pointercancel", () => { if (drag?.started) fall(drag, 0, 0); drag = null; });
  function throwDemo() {
    if (!visible() || away || held || still || CV.on) return; const d = newHold(); startHold(d);
    const L = layer.getBoundingClientRect(), dir = cfg.side === "right" ? -1 : 1, tx = clamp(dir * Math.min(220, L.width * 0.35), d.minX, d.maxX), ty = Math.max(d.minY, -L.height * 0.5);
    G.to(wrap, { x: tx, y: ty, rotation: dir * -14, duration: 0.9, ease: "power2.out", onComplete: () => { if (!held) return; G.to(wrap, { rotation: dir * 12, duration: 0.25, yoyo: true, repeat: 1, onComplete: () => { if (held) fall(d, -dir * 1100, -650); } }); } });
  }

  /* ---------- the rocket: it lands on the floor he stands on (in the middle when he's on the stage) and lifts off from there ---------- */
  function puffs(x: number, y: number, n: number, spread = 50) {
    for (let i = 0; i < n; i++) { if (layer.querySelectorAll(".mz-puff").length > 40) return; const p = document.createElement("i"); p.className = "mz-puff"; p.style.left = x + "px"; p.style.top = y + "px"; layer.appendChild(p);
      G.fromTo(p, { xPercent: -50, yPercent: -50, scale: 0.3, opacity: 0.95 }, { x: (Math.random() - 0.5) * spread * 2, y: -Math.random() * 24, scale: 1 + Math.random() * 1.6, opacity: 0, duration: 1 + Math.random() * 0.7, ease: "power2.out", onComplete: () => p.remove() }); }
  }
  function bigText(txt: string, x: number, y: number) {
    const el = document.createElement("div"); el.className = "mz-count"; el.textContent = txt; el.style.left = x + "px"; el.style.top = y + "px"; layer.appendChild(el);
    G.fromTo(el, { xPercent: -50, yPercent: -100, scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: "back.out(2.5)" }); G.to(el, { opacity: 0, y: -18, duration: 0.3, delay: 0.6, onComplete: () => el.remove() });
  }
  let rocketTl: TL | null = null;
  const NOZZLE = 198 / 260, FEET = 296 / 310;
  async function rocketBye() {
    if (!visible() || away || held) return; addHeart("rocket");
    const staged = CV.on;
    if (!cfg.fun.rocket || still) { if (staged) { await talk([linesOf("bye")[0] || "Bye! 👋"], ["open"]); closeScene(); } else act((r) => TALK.hello(r, linesOf("bye")[0] || "Bye! 👋")); return; }
    hostBack?.kill(); hostBack = null; leanBack?.kill(); leanBack = null; stopSleep(rig); away = true; busy = true; setLive();
    if (staged) { CV.token++; CV.performing = true; hideScene(); } // the conversation ends here; his last words still show in his bubble
    G.killTweensOf(wrap);
    if (!staged) G.set(wrap, { x: 0, y: 0, rotation: 0, xPercent: 0, yPercent: 0, scale: 1, opacity: 1, transformOrigin: "50% 100%" });
    const s = rig.s, L0 = layer.getBoundingClientRect(), W0 = wrap.getBoundingClientRect();
    const floor = W0.top - L0.top + W0.height * FEET, rw = Math.round(Math.min(W0.width * 0.95, (floor * 0.9) / ((260 / 120) * NOZZLE))), rh = Math.round((rw * 260) / 120);
    const left = staged ? L0.width / 2 - rw / 2 : clamp(cfg.side === "right" ? W0.left - L0.left - rw * 0.9 : W0.right - L0.left - rw * 0.1, 6, L0.width - rw - 6), top = floor - rh * NOZZLE;
    // on the stage he steps aside so the rocket can land in the middle
    if (staged) {
      const roomR = L0.right - W0.right, dir = roomR > W0.left - L0.left ? 1 : -1, step = rw * 0.62 + W0.width * 0.32;
      rig.say(linesOf("bye")[0] || "Bye! 👋");
      await new Promise<void>((res) => walkTo(Number(G.getProperty(wrap, "x")) + dir * step, res));
      rig.run((t) => t.to(s, { ...REST, ...CLEAR, rx: 182, ry: 100, duration: 0.3 }));
    } else {
      const t = rig.begin(null, "grin"); t.to(s, { rx: 182, ry: 100, duration: 0.35, ease: "back.out(1.7)" }); const w = G.timeline({ repeat: 3, yoyo: true }); w.to(s, { rx: 195, ry: 113, duration: 0.18 }); t.add(w);
      t.call(() => rig.say(linesOf("bye")[0] || "Bye! 👋", 1700), undefined, 0.15);
    }
    if (!alive) return;
    Object.assign(rocket.style, { width: rw + "px", height: rh + "px", left: left + "px", top: top + "px", display: "block", zIndex: staged ? "4" : "1" });
    rkFace.setAttribute("opacity", "0"); rkFlame.style.opacity = "1";
    G.set(rocket, { x: 0, y: -(top + rh + 30), scaleY: 1, transformOrigin: "50% 76%" });
    const W = wrap.getBoundingClientRect(), L = layer.getBoundingClientRect(), cx0 = Number(G.getProperty(wrap, "x")), cy0 = Number(G.getProperty(wrap, "y")), sc0 = Number(G.getProperty(wrap, "scale"));
    const px = left + rw * 0.5, py = top + rh * (96 / 260), bcx = W.left - L.left + W.width / 2, bby = W.bottom - L.top, base = floor;
    let lastPuff = 0; const R = G.timeline(); rocketTl = R;
    R.to(rocket, { y: 0, duration: 1.25, ease: "power3.out" }, staged ? 0.1 : 0.4).call(() => { SND.thud(); puffs(left + rw / 2, base, 9, 60); rkFlame.style.opacity = "0"; })
      .to(rocket, { scaleY: 0.93, duration: 0.08 }).to(rocket, { scaleY: 1, duration: 0.4, ease: "elastic.out(1,.4)" }).call(() => rig.say("All aboard! 🚀", 1200)).to({}, { duration: 0.7 });
    R.addLabel("hop").call(() => { const tt = rig.begin(null, "grin", "happy"); tt.to(s, { lx: 70, ly: 96, rx: 170, ry: 96, duration: 0.25 }); }, undefined, "hop")
      .to(wrap, { x: cx0 + px - bcx, duration: 0.7, ease: "power1.inOut" }, "hop")
      .to(wrap, { keyframes: [{ y: cy0 + py - bby - 90, duration: 0.38, ease: "power2.out" }, { y: cy0 + py - bby + rw * 0.08, duration: 0.32, ease: "power2.in" }] }, "hop")
      .to(wrap, { scale: sc0 * 0.16, duration: 0.7, ease: "power2.in" }, "hop").to(wrap, { opacity: 0, duration: 0.12 }, "hop+=.6")
      .call(() => { rig.hush(); G.fromTo(rkFace, { attr: { opacity: 0 } }, { attr: { opacity: 1 }, duration: 0.3 }); SND.pop(); }).to({}, { duration: 0.5 });
    ["3", "2", "1"].forEach((n) => { R.call(() => { bigText(n, left + rw / 2, Math.max(70, top - 6)); SND.beep(); puffs(left + rw / 2, base, 2, 30); }).to(rocket, { x: 1.6, duration: 0.05, yoyo: true, repeat: 9, ease: "none" }); });
    R.call(() => { rkFlame.style.opacity = "1"; SND.whoosh(1.9); puffs(left + rw / 2, base, 12, 70); bigText("Lift-off! 🚀", left + rw / 2, Math.max(70, top - 6));
        if (staged) { CV.on = false; CV.token++; CV.performing = false; rig.sayHook = null; say.hidden = true; G.to(dim, { opacity: 0, duration: 1.6, delay: 0.4, onComplete: () => { dim.hidden = true; } }); } })
      .to(rocket, { x: 0, duration: 0.05 })
      .to(rocket, { y: -(top + rh + 80), duration: 1.8, ease: "power2.in", onUpdate() { const n = performance.now(); if (n - lastPuff > 60) { lastPuff = n; puffs(left + rw / 2 + (Math.random() - 0.5) * 8, base + Number(G.getProperty(rocket, "y")) + 20, 1, 14); } } })
      .call(() => { rocket.style.display = "none"; })
      .to({}, { duration: cfg.fun.backAfter }).call(parachuteBack);
  }
  function parachuteBack() {
    const L = layer.getBoundingClientRect(), s = rig.s; rkFace.setAttribute("opacity", "0"); wrap.classList.remove("on-stage");
    G.set(wrap, { x: 0, y: -(L.height + 40), scale: 1, opacity: 1, rotation: 0, xPercent: 0, yPercent: 0, transformOrigin: "50% -40%" });
    rig.kill(); Object.assign(s, REST, CLEAR, { chute: 1 }); rig.setProp(null); rig.face("grin", "open");
    rig.run((t) => { t.to(s, { lx: 70, ly: 92, rx: 170, ry: 92, lg: 6, rg: -6, duration: 0.1 }); const sw = G.timeline({ repeat: -1, yoyo: true }); sw.to(s, { lg: -6, rg: 6, duration: 0.6, ease: "sine.inOut" }); t.add(sw); });
    window.setTimeout(() => { if (alive) rig.say("Wheee! I'm baaack! 🪂", 2200); }, 900);
    G.fromTo(wrap, { rotation: -8 }, { rotation: 8, duration: 0.8, yoyo: true, repeat: 3, ease: "sine.inOut" });
    G.to(wrap, { y: 0, duration: 3.3, ease: "power1.out", onComplete: () => {
      G.killTweensOf(wrap, "rotation"); G.set(wrap, { rotation: 0, transformOrigin: "50% 100%" }); SND.boing();
      const t = rig.run((t) => { t.to(s, { sy: 0.84, sx: 1.12, lg: 0, rg: 0, duration: 0.08 }).to(s, { chute: 0, duration: 0.45, ease: "power2.in" }, "<").to(s, { ...REST, duration: 0.6, ease: "elastic.out(1,.4)" });
        t.call(() => { rig.say("I'm back! Did you miss me? 😄", 2200); rig.face("grin", "happy"); }); t.to({}, { duration: 1.3 }); t.call(() => rig.face("grin", "open")); });
      t.eventCallback("onComplete", () => { away = false; busy = false; setLive(); placeWrap(true); resume(); });
    } });
  }

  /* ---------- noticing the visitor (the real site only) ---------- */
  let io: IntersectionObserver | null = null, endIo: IntersectionObserver | null = null, restT = 0, lastY = 0, lastT = 0, windCool = 0, hiddenAt = 0, pointing = false, pointCard: Element | null = null;
  const greetOnce = () => { if (preview) return true; try { if (sessionStorage.getItem("lc_mz_hi")) return false; sessionStorage.setItem("lc_mz_hi", "1"); } catch {} return true; };
  if (!preview) {
    io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) cur = (e.target as HTMLElement).id; }, { rootMargin: "-45% 0px -50% 0px" });
    const hero = document.getElementById("hero"); if (hero) io.observe(hero);
    sectionEls().forEach((x) => io!.observe(x));
    const footer = document.querySelector(".site footer") || sectionEls().pop();
    if (footer) { endIo = new IntersectionObserver((es) => { const e = es[0]; if (e.isIntersecting && !endDone && cfg.fun.notice.end && pageY() > 400) { endDone = true; window.setTimeout(() => { if (free()) act(FUN.endParty, { heart: "end" }); }, 400); } }, { threshold: 0.3 }); endIo.observe(footer); }
    let told = "";
    on(window, "scroll", () => {
      const now = performance.now(), y = pageY(), v = Math.abs(y - lastY) / Math.max(1, now - lastT); lastY = y; lastT = now;
      lastAct = Date.now(); if (rig.sleeping && visible() && !away) act((r) => wakeRig(r));
      if (v > 3.5 && now > windCool && cfg.fun.notice.fast && free() && !lite) { windCool = now + 7000; act(FUN.wind, { heart: "wind" }); }
      if (y < 400) endDone = false;
      clearTimeout(restT); restT = window.setTimeout(() => {
        const id = cur || (sectionEls().length ? "" : "page"); if (!id || id === told) return; told = id;
        if (id === "hero") { enterBit("hero", greetOnce()); return; }
        const sec = document.getElementById(id), k = MZ_BIT_OF_LAYOUT[sec?.dataset.layout || ""]; enterBit(k || "", !!k);
      }, 420);
    }, { passive: true });
    on(document, "visibilitychange", () => { if (document.hidden) { hiddenAt = Date.now(); if (CV.on) hush(); return; } if (hiddenAt && Date.now() - hiddenAt > 2500 && cfg.fun.notice.back && free()) act(FUN.welcome, { heart: "back" }); hiddenAt = 0; });
    on(window, "lc-reacted", () => { if (cfg.cheer && free() && !lite) act(FUN.cheered, { heart: "react" }); });
    on(document, "pointerover", (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !(e.target instanceof Element) || layer.contains(e.target)) return;
      const c = e.target.closest(".card"); if (!c || c === pointCard) return; pointCard = c;
      if (!cfg.fun.notice.point || !free() || rig.sleeping || lite) return; pointing = true;
      const s = rig.s, L = layer.getBoundingClientRect(), cr = c.getBoundingClientRect(), cx = cr.left + cr.width / 2 - L.left, cy = cr.top + cr.height / 2 - L.top, [sx, sy] = rig.pt(156 + s.x, 158 + s.y);
      let dx = cx - sx; const dy = cy - sy; if (rig.mirror) dx = -dx; const n = Math.hypot(dx, dy) || 1;
      const name = (c.querySelector("h3, h4, h2, .t, b, strong")?.textContent || "").trim().slice(0, 36);
      const t = rig.begin(null, "grin"); t.to(s, { rx: 156 + (dx / n) * 72, ry: 158 + (dy / n) * 72, lean: clamp((dx / n) * 4, -4, 4), gx: clamp(dx / n, -1, 1), gy: clamp(dy / n, -1, 1), brow: 0.6, duration: 0.35, ease: "back.out(1.6)" });
      if (cfg.chat !== "quiet" && name) t.call(() => rig.say(pick([`Ooh, ${name}!`, `${name}? Good one.`, `That one! ${name}.`]), 1500));
    }, { passive: true });
    on(document, "pointerout", (e: PointerEvent) => { if (!(e.target instanceof Element)) return; const c = e.target.closest(".card"); if (!c || (e.relatedTarget instanceof Node && c.contains(e.relatedTarget))) return; pointCard = null; if (pointing) { pointing = false; if (free() && !rig.sleeping) resume(); } }, { passive: true });
  }

  /* ---------- eyes, ducking, waking ---------- */
  let lpx = 0, lpy = 0, lpt = 0;
  on(window, "pointermove", (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    rig.lookAt(e.clientX, e.clientY, cfg.follow && !lite);
    const now = performance.now(), sp = Math.hypot(e.clientX - lpx, e.clientY - lpy) / Math.max(1, now - lpt); lpx = e.clientX; lpy = e.clientY; lpt = now;
    if (!(e.movementX || e.movementY) || drag) return;
    if (preview) { const L = layer.getBoundingClientRect(); if (e.clientX < L.left || e.clientX > L.right || e.clientY < L.top || e.clientY > L.bottom) return; }
    lastAct = Date.now(); if (CV.on) CV.idleAt = Date.now();
    if (rig.sleeping && visible() && !away && !CV.on) { act((r) => wakeRig(r)); return; }
    if (!cfg.duck || !free() || still) return;
    const b = rig.rect; if (!b) return; const cx = b.left + b.width / 2, cy = b.top + b.height * 0.45;
    if (sp > 1.6 && Math.hypot(e.clientX - cx, e.clientY - cy) < b.width * 0.6 && Date.now() > duckCool) { duckCool = Date.now() + 4500; const dir = (e.clientX < cx ? -1 : 1) * (rig.mirror ? -1 : 1); act((r) => duckRig(r, dir)); }
  }, { passive: true });
  on(window, "keydown", (e: KeyboardEvent) => { lastAct = Date.now(); if (e.key === "Escape" && CV.on && !document.querySelector("dialog[open]")) closeScene(); });
  every(1000, () => {
    if (preview || !free() || rig.sleeping || still || document.hidden) return; const idle = Date.now() - lastAct;
    if (cfg.nap && idle > cfg.napAfter * 1000) { if (cfg.fun.ground) sleepGround(rig); else sleepStand(rig); return; }
    if (cfg.fun.bored && !lite && idle > cfg.fun.boredAfter * 1000 && Date.now() - lastBored > cfg.fun.boredAfter * 1000) { const list = IDLE_KEYS.filter((k) => cfg.fun.games[k]); if (list.length) { lastBored = Date.now(); act(FUN[pick(list)], { idle: true }); } }
  });
  every(17000, () => { if (!preview && cfg.chat === "chatty" && free() && !rig.sleeping && !rig.bubOn && Date.now() - lastAct < 60000 && !document.hidden) rig.say(pick(TIPS), 2600); });

  /* ---------- slow devices and screen changes ---------- */
  on(window, "lc-lite", () => { lite = true; rig.calm(true); rainEl.style.display = "none"; if (!busy && !away && !held && !CV.on) restNow(); });
  const onPhone = () => { if (CV.on) closeScene(); sizeWrap(); updateVis(); placeWrap(false); };
  phoneMq.addEventListener("change", onPhone); offs.push(() => phoneMq.removeEventListener("change", onPhone));
  on(window, "resize", () => { if (!CV.on) return; const T = target(); CV.S = T.S; G.to(wrap, { x: T.x, y: T.y, scale: T.S, duration: 0.3 }); });

  /* ---------- start ---------- */
  sizeWrap(); updateVis(); placeWrap(false); setMoment(autoMoment(), false);
  const startT = window.setTimeout(() => { if (preview) { enterBit("hero", true); return; } const hero = document.getElementById("hero"); const r = hero?.getBoundingClientRect(); if (r && r.bottom > 0 && r.top < innerHeight) enterBit("hero", greetOnce()); else if (!still && !lite) act(TRICKS.wave); }, 900);

  return {
    update(m) {
      const before = cfg; cfg = m; rig.cfg = m; rig.setLook(m); paint(); setSound(m.fun.sounds); sizeWrap(); updateVis(); syncTop(); pickVoice();
      if (before.side !== m.side || before.place !== m.place) { if (!CV.on) { hostBack?.kill(); G.set(wrap, { x: 0 }); placeWrap(true); } }
      if (JSON.stringify(before.moments) !== JSON.stringify(m.moments)) setMoment(autoMoment(), false);
      if (CV.on) dim.style.setProperty("--mzd", String(m.convo.dim / 100));
    },
    ask(k) { openScene(k); },
    openTalk() { openScene(); },
    fun(k) {
      if (k === "sleep") { if (!visible() || away || held || still || CV.on) return; busy = false; setLive(); rig.kill(); if (cfg.fun.ground) sleepGround(rig); else sleepStand(rig); }
      else if (k === "wake") { if (rig.sleeping) act((r) => wakeRig(r)); }
      else if (FUN[k]) act(FUN[k]);
    },
    trick(k) { if (TRICKS[k]) act(TRICKS[k]); },
    bit(k) { if (BITS[k] && !CV.on) enterBit(k, true); },
    moment(k) { setMoment(k, true); },
    nap() { if (!visible() || away || held || still || CV.on) return; busy = false; setLive(); rig.kill(); if (cfg.fun.ground) sleepGround(rig); else sleepStand(rig); },
    wake() { if (rig.sleeping) act((r) => wakeRig(r)); },
    throwDemo,
    testVoice() {
      markGesture(); pickVoice(); const line = cfg.convo.hello || "Hi! I'm Mini Shourobh.";
      if (CV.on) { void speakLine(line); return; }
      rig.say(line, 2600);
      if (!VOX.ok) return; hush(); try { const u = new SpeechSynthesisUtterance(stripEmoji(line)); if (VOX.v) { u.voice = VOX.v; u.lang = VOX.v.lang; } u.rate = cfg.convo.rate / 100; u.pitch = cfg.convo.pitch / 100; u.volume = cfg.convo.volume / 100; speechSynthesis.speak(u); } catch {}
    },
    stop() {
      alive = false; clearTimeout(startT); clearTimeout(restT); clearTimeout(tapT); clearTimeout(tickleT); timers.forEach(clearInterval); offs.forEach((f) => f()); io?.disconnect(); endIo?.disconnect(); hush();
      rocketTl?.kill(); hostBack?.kill(); leanBack?.kill(); G.killTweensOf(wrap); G.killTweensOf(rocket); stopSleep(rig); rig.destroy(); layer.innerHTML = "";
    },
  };
}

/* the bits of the browser's speech recognition this file uses (Chrome and Edge, behind the owner's switch) */
type SpeechRec = { lang: string; interimResults: boolean; onresult: ((ev: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start(): void };
