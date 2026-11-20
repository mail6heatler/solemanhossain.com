/**
 * Mini Shourobh on a page (downloaded separately, once the page is idle). The site puts him in a fixed layer over the
 * page (Mascot.tsx); the dashboard's preview puts him in a box. He follows the homepage's sections (a move and a line
 * each, by the section's layout), talks (ready questions and typed words), can be picked up and thrown, tickled,
 * played with, leaves in a rocket, naps on the floor, plays when bored, and notices fast scrolling, the end of the page,
 * coming back to the tab and the card under the mouse. Every part has a switch in settings.mascot (lib/mascot.ts).
 *
 * Smoothness: he draws only what changed (mascotRig.ts) and not at all while the page scrolls unless he's acting for
 * someone; ambient moves start only once scrolling rests; anything he spawns has a cap; physics runs on real time.
 * Reduced motion: he stands still and answers in bubbles. Slow devices (html.lite): no breathing or ambient moves.
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
  nap(): void; wake(): void; throwDemo(): void; openTalk(): void; stop(): void;
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const TIPS = ["Psst. Click me, I can talk!", "Try dragging me. I dare you.", "There is more below, keep going.", "Ask me who I am. 😎"];
const KEYS: [string, RegExp][] = [
  ["bye", /\b(bye|goodbye|good bye|see (you|ya)|later|gtg|tata|leaving)\b/], ["who", /\b(who|your name|about you|yourself|introduce)\b/], ["job", /\b(job|work|do you do|profession|career)\b/],
  ["from", /\b(from|where|live|city|country|dhaka|bangladesh)\b/], ["joke", /\b(joke|funny|laugh|lol)\b/], ["food", /\b(food|eat|hungry|cha|tea|fuchka|biryani|favou?rite)\b/],
  ["single", /\b(single|girlfriend|gf|date|crush|love|married|wife)\b/], ["sing", /\b(sing|song|music)\b/], ["trick", /\b(trick|dance|flip|flex)\b/],
  ["game", /\b(game|play|rock|paper|scissors)\b/], ["tour", /\b(around|tour|guide|next|show me)\b/], ["salam", /\b(salam|assalam|assalamu|salaam|assalamualaikum)\b/],
  ["hello", /\b(hi|hello|hey|yo|hola|kemon|kmn|sup)\b/],
];

export function startMascot(layer: HTMLElement, view: MascotView, g: GS, opts: { preview?: boolean } = {}): MascotCtl {
  useGsap(g);
  const G = g, html = document.documentElement, preview = !!opts.preview, still = prefersReducedMotion();
  let cfg = view.m, lite = !preview && html.classList.contains("lite");
  const phoneMq = window.matchMedia("(max-width: 760px)");
  const offs: (() => void)[] = [];
  const on = <K extends keyof WindowEventMap>(t: Window | Document, type: K | string, fn: (e: never) => void, o?: AddEventListenerOptions) => { t.addEventListener(type, fn as EventListener, o); offs.push(() => t.removeEventListener(type, fn as EventListener, o)); };
  const timers: number[] = [];
  const every = (ms: number, fn: () => void) => timers.push(window.setInterval(fn, ms));

  /* ---------- what's in the layer ---------- */
  layer.innerHTML = `<div class="mz-rain"></div><div class="mz-night"></div><div class="mz-rk"></div><div class="mz" role="button" tabindex="0" aria-label="Mini Shourobh, the site's mascot. Press Enter to talk to him."></div>`;
  const rainEl = layer.querySelector(".mz-rain") as HTMLElement, nightEl = layer.querySelector(".mz-night") as HTMLElement, rocket = layer.querySelector(".mz-rk") as HTMLElement, wrap = layer.querySelector(".mz") as HTMLElement;
  for (let i = 0; i < 36; i++) { const d = document.createElement("i"); d.style.left = Math.random() * 100 + "%"; d.style.animationDuration = 0.55 + Math.random() * 0.4 + "s"; d.style.animationDelay = -Math.random() + "s"; rainEl.appendChild(d); }
  for (let i = 0; i < 14; i++) { const d = document.createElement("i"); d.textContent = "✦"; d.style.left = Math.random() * 100 + "%"; d.style.top = Math.random() * 60 + "%"; d.style.animationDelay = -Math.random() * 2 + "s"; nightEl.appendChild(d); }
  rocket.innerHTML = ROCKET_SVG;
  const rkFace = rocket.querySelector(".mz-rk-face") as SVGGElement, rkFlame = rocket.querySelector(".mz-rk-flame") as SVGGElement;
  const paint = () => Object.entries(lookVars(cfg, MZ_SHIRTS, MZ_JEANS)).forEach(([k, v]) => layer.style.setProperty(k, v));
  paint();

  const rig = new Rig(wrap, layer, cfg, { mirror: cfg.side === "right", still: still || lite });
  rig.wrap = wrap;
  setSound(cfg.fun.sounds);

  let cur = "", curBit = "", busy = false, away = false, held = false, lastAct = Date.now(), lastBored = 0, duckCool = 0, trickI = 0, endDone = false, moment = "normal";
  let hostBack: ReturnType<GS["delayedCall"]> | null = null, leanBack: ReturnType<GS["delayedCall"]> | null = null;
  const setLive = () => { rig.live = busy || away || held; };
  const phone = () => phoneMq.matches;
  const visible = () => (preview || cfg.show) && (!phone() || cfg.phones);
  const free = () => visible() && !away && !held && !busy;

  /* ---------- hearts (remembered in this browser) ---------- */
  let hearts = new Set<string>(), unlocked = false, pendingSecret = false;
  try { const h = JSON.parse(localStorage.getItem("lc_mz_hearts") || "{}"); hearts = new Set(h.k || []); unlocked = !!h.u; } catch {}
  const saveHearts = () => { try { localStorage.setItem("lc_mz_hearts", JSON.stringify({ k: [...hearts], u: unlocked })); } catch {} };
  const heartRow = () => { const n = Math.min(5, hearts.size); return "❤️".repeat(n) + "🤍".repeat(5 - n); };
  function addHeart(k: string) { if (!cfg.fun.hearts || hearts.has(k) || preview) return; hearts.add(k); if (hearts.size >= 5 && !unlocked) { unlocked = true; pendingSecret = true; } saveHearts(); drawTalk(); }

  /* ---------- where he stands ---------- */
  function placeWrap(anim: boolean) {
    const right = cfg.side === "right"; wrap.classList.toggle("left", !right); rig.setMirror(right); rig.wrapDir = right ? -1 : 1;
    const v = cfg.place === "peek" ? { x: 0, y: 0, xPercent: right ? 44 : -44, rotation: right ? -14 : 14, yPercent: 5 } : { x: 0, y: 0, xPercent: 0, rotation: 0, yPercent: 0 };
    G.to(wrap, { ...v, scale: 1, opacity: 1, duration: anim ? 0.6 : 0, ease: "power3.inOut" });
  }
  const sizeWrap = () => { wrap.style.width = (cfg.size / 100) * (phone() ? 96 : 150) + "px"; };
  function updateVis() { wrap.style.display = visible() ? "" : "none"; if (!visible()) closeTalk(); }
  function leanIn() {
    if (cfg.place !== "peek") return; const right = cfg.side === "right"; leanBack?.kill();
    G.to(wrap, { xPercent: right ? 14 : -14, rotation: right ? -6 : 6, duration: 0.55, ease: "back.out(1.4)" });
    leanBack = G.delayedCall(6.5, () => { if (cfg.place === "peek" && !busy && !away && !held) G.to(wrap, { xPercent: right ? 44 : -44, rotation: right ? -14 : 14, duration: 0.7, ease: "power2.inOut" }); });
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
    hostBack?.kill(); hostBack = null; G.killTweensOf(wrap, "x");
    stopSleep(rig); busy = true; setLive();
    const t = fn(rig);
    t.eventCallback("onComplete", () => { busy = false; setLive(); resume(); });
    return t;
  }
  function playBit(k: string) { if (lite || still) return null; if ((cfg.acts as Record<string, boolean>)[k] && BITS[k]) return BITS[k](rig); return rig.begin(null, "grin"); }
  function resume() {
    if (busy || away || held || !visible() || rig.sleeping) return;
    if (pendingSecret && cfg.fun.hearts) { pendingSecret = false; act(FUN.secret); return; }
    if (Math.abs(Number(G.getProperty(wrap, "x"))) > 4) { walkTo(0, () => { placeWrap(true); restNow(); }); return; }
    if (!curBit || curBit === "hero" || cfg.place === "host" || !(cfg.acts as Record<string, boolean>)[curBit] || lite || still) { restNow(); return; }
    BITS[curBit](rig);
  }
  const lineFor = (k: string) => (k === "hero" ? cfg.greet.replace(/\{time\}/g, dayPart()) : (cfg.lines as Record<string, string>)[k] || "");
  function enterBit(k: string, talk: boolean) {
    curBit = k;
    if (!visible() || away || held || still) { if (still && talk) rig.say(lineFor(k)); return; }
    if (rig.sleeping) { act((r) => wakeRig(r, true)); return; }
    if (busy) return;
    const line = talk && (cfg.chat !== "quiet" || k === "hero") ? lineFor(k) : "";
    if (cfg.place === "host" && !preview) {
      hostBack?.kill();
      const W = layer.clientWidth, w = wrap.offsetWidth, dist = Math.max(0, W / 2 - 12 - w / 2), dx = cfg.side === "right" ? -dist : dist;
      walkTo(dx, () => { if (busy) return; playBit(k); if (line) window.setTimeout(() => rig.say(line), 300);
        hostBack = G.delayedCall(6.5, () => { if (!busy && !away && !held) walkTo(0, restNow); }); });
    } else { leanIn(); if (!playBit(k)) restNow(); if (line) window.setTimeout(() => { if (!busy) rig.say(line); }, 600); }
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
    moment = m; rig.setHat(HAT_OF[m] || null);
    rainEl.style.display = m === "rain" && !lite && !still ? "block" : "none"; nightEl.style.display = m === "night" ? "block" : "none";
    if (intro && MOMENTS[m]) act(MOMENTS[m], { heart: "moment" });
  }

  /* ---------- the chat ---------- */
  const talkEl = document.createElement("div"); talkEl.className = "mz-talk"; talkEl.hidden = true; talkEl.setAttribute("data-lenis-prevent", "");
  talkEl.innerHTML = `<div class="mz-t-h"><b>Talk to me</b><span class="mz-t-hearts" title="Friendship hearts"></span><button type="button" class="mz-t-x" aria-label="Close">×</button></div><div class="mz-t-body"></div><form class="mz-t-f"><input type="text" maxlength="80" placeholder="Or type something…" autocomplete="off" aria-label="Say something to him"><button type="submit">Send</button></form>`;
  layer.appendChild(talkEl);
  let talkMode: "q" | "game" = "q"; const score = { you: 0, him: 0, draw: 0 };
  function drawTalk() {
    const b = talkEl.querySelector(".mz-t-body") as HTMLElement; b.innerHTML = "";
    (talkEl.querySelector(".mz-t-hearts") as HTMLElement).textContent = cfg.fun.hearts && !preview ? heartRow() : "";
    const btn = (label: string, fn: () => void, cls = "") => { const x = document.createElement("button"); x.type = "button"; x.textContent = label; if (cls) x.className = cls; x.onclick = fn; b.appendChild(x); };
    if (talkMode === "game") {
      const sc = document.createElement("div"); sc.className = "mz-t-score"; sc.textContent = `You ${score.you} · Him ${score.him} · Draws ${score.draw}`; b.appendChild(sc);
      ([["rock", "✊"], ["paper", "✋"], ["scissors", "✌️"]] as const).forEach(([k, e]) => btn(e, () => playRps(k), "mz-t-rps"));
      btn("← Questions", () => { talkMode = "q"; drawTalk(); });
    } else MZ_QA.forEach(([k]) => { const q = cfg.qa[k]; if (q.on && q.q) btn(q.q, () => ask(k)); });
  }
  function positionTalk() {
    const L = layer.getBoundingClientRect(), W = wrap.getBoundingClientRect(), tw = Math.min(250, L.width - 24); talkEl.style.width = tw + "px";
    const mid = W.left + W.width / 2 - L.left, left = mid > L.width / 2 ? W.left - L.left - tw - 6 : W.right - L.left + 6;
    talkEl.style.left = clamp(left, 8, L.width - tw - 8) + "px";
  }
  function openTalk() {
    if (!visible() || away) return; drawTalk(); positionTalk(); if (!talkEl.hidden) return; talkEl.hidden = false;
    G.fromTo(talkEl, { opacity: 0, y: 10, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: still ? 0.01 : 0.3, ease: "back.out(1.8)" });
    if (!rig.sleeping && !busy) rig.say(pick(["Ask me anything! 👇", "Hey! What do you want to know?", "Ooh, a visitor! Ask away 👇"]), 1800);
  }
  function closeTalk() { talkEl.hidden = true; talkMode = "q"; }
  (talkEl.querySelector(".mz-t-x") as HTMLElement).onclick = closeTalk;
  (talkEl.querySelector(".mz-t-f") as HTMLFormElement).addEventListener("submit", (e) => { e.preventDefault(); const inp = talkEl.querySelector("input") as HTMLInputElement; const v = inp.value.trim(); inp.value = ""; if (v) typed(v); });
  function sayLines(lines: string[]) { let at = 0; lines.forEach((ln) => { window.setTimeout(() => rig.say(ln, Math.max(1500, ln.length * 60) + 250), at); at += Math.max(1500, ln.length * 60); }); }
  function typed(v: string) {
    markGesture(); const m = KEYS.find(([, re]) => re.test(v.toLowerCase()));
    if (!m) { if (still) rig.say("Hmm, I only know a few things. Try one of these 👇"); else act(TALK.shrug); return; }
    if (m[0] === "salam" || m[0] === "hello") { const line = m[0] === "salam" ? "Walaikum assalam! 👋" : pick(["Hello! 👋 Nice to meet you.", "Hey hey! 👋", "Hi there! 👋"]); if (still) rig.say(line); else act((r) => TALK.hello(r, line), { heart: "q-hello" }); return; }
    if (!cfg.qa[m[0] as MzQa]?.on) { if (still) rig.say("Hmm, ask me something else! 👇"); else act(TALK.shrug); return; }
    ask(m[0]);
  }
  function ask(k: string) {
    markGesture(); const q = cfg.qa[k as MzQa]; if (!q) return;
    if (still) { if (k === "game" || k === "trick" || k === "tour") { rig.say(rig.linesOf(k as MzQa)[0] || "Let's do that another time!"); return; } sayLines(rig.linesOf(k as MzQa)); return; }
    if (k === "bye") { closeTalk(); rocketBye(); return; }
    if (k === "trick") { nextTrick(); return; }
    if (k === "game") { talkMode = "game"; drawTalk(); act((r) => TALK.intro(r, r.linesOf("game")[0] || "Rock, paper, scissors!"), { heart: "q-game" }); return; }
    if (k === "tour") { closeTalk(); act((r) => TALK.guide(r, tourLine(), tourGo), { heart: "q-tour" }); return; }
    const fn = (TALK as unknown as Record<string, (r: Rig) => TL>)[k]; if (fn) act(fn, { heart: "q-" + k });
  }
  function playRps(you: string) { markGesture(); act((r) => rps(r, you, (res) => { score[res]++; if (talkMode === "game") drawTalk(); }), { heart: "rps" }); }

  /* ---------- the tour ---------- */
  const sectionEls = () => [...document.querySelectorAll<HTMLElement>("section[data-spy][id]")];
  function nextSection() { const list = sectionEls(); if (!list.length || preview) return null; const i = list.findIndex((s) => s.id === cur); return list[(i + 1) % list.length]; }
  function tourLine() { const n = nextSection(), first = rig.linesOf("tour")[0] || "Follow me!"; if (!n) return preview ? first : first + " To the homepage!"; const t = n.querySelector("h2")?.textContent?.trim() || n.id; return `${first} Next up: ${n.id === "hero" ? "the top" : t.slice(0, 40)}.`; }
  function tourGo() {
    const n = nextSection(); if (preview) return; if (!n) { location.href = "/"; return; }
    const l = (window as unknown as { __lenis?: { scrollTo(t: HTMLElement): void } }).__lenis; if (l) l.scrollTo(n); else n.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- tricks ---------- */
  function nextTrick() { const list = Object.entries(cfg.tricks).filter(([, v]) => v).map(([k]) => k); if (!list.length) { rig.say("No tricks today. 🙃", 1600); return; } const k = list[trickI++ % list.length]; act(TRICKS[k], { heart: "trick" }); }

  /* ---------- taps, tickles and throwing ---------- */
  let taps: number[] = [], tapT = 0, tickleN = 0, tickleT = 0;
  function onTap() {
    markGesture(); const now = Date.now(); taps = taps.filter((x) => now - x < 1100); taps.push(now); clearTimeout(tapT); lastAct = now;
    if (rig.sleeping) { taps = []; act((r) => wakeRig(r)); return; }
    if (taps.length >= 3 && cfg.fun.tickle && !still) { taps = []; tickleN++; clearTimeout(tickleT); tickleT = window.setTimeout(() => (tickleN = 0), 7000); closeTalk();
      if (tickleN >= 3) { tickleN = 0; act(FUN.grumpy, { heart: "grumpy" }); } else act(FUN.tickle, { heart: "tickle" }); return; }
    tapT = window.setTimeout(() => { if (taps.length && taps.length < 3) (talkEl.hidden ? openTalk() : closeTalk()); taps = []; }, 300);
  }
  wrap.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); markGesture(); talkEl.hidden ? openTalk() : closeTalk(); } });
  type Hold = { id?: number; x0: number; y0: number; started: boolean; minX: number; maxX: number; minY: number; bx: number; by: number; cx: number; cy: number; vx: number; vy: number; lt: number; qr?: (v: number) => void };
  let drag: Hold | null = null;
  function bounds() { const L = layer.getBoundingClientRect(), W = wrap.getBoundingClientRect(), cx = Number(G.getProperty(wrap, "x")), cy = Number(G.getProperty(wrap, "y")); const natL = W.left - L.left - cx, natT = W.top - L.top - cy; return { minX: 6 - natL, maxX: L.width - W.width - 6 - natL, minY: 6 - natT }; }
  function startHold(d: Hold) {
    d.started = true; held = true; setLive(); closeTalk(); lastAct = Date.now(); addHeart("throw");
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
  wrap.addEventListener("pointerdown", (e) => { if ((e.pointerType === "mouse" && e.button !== 0) || away) return; markGesture(); drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, started: false, minX: 0, maxX: 0, minY: 0, bx: 0, by: 0, cx: 0, cy: 0, vx: 0, vy: 0, lt: 0 }; try { wrap.setPointerCapture(e.pointerId); } catch {} });
  wrap.addEventListener("pointermove", (e) => { if (!drag || drag.id !== e.pointerId) return; if (!drag.started) { if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 7 || !cfg.fun.throw || still) return; startHold(drag); } moveHold(drag, e.clientX, e.clientY); });
  wrap.addEventListener("pointerup", (e) => { if (!drag || drag.id !== e.pointerId) return; const d = drag; drag = null; if (d.started) fall(d, clamp(d.vx, -2600, 2600), clamp(d.vy, -2600, 2600)); else onTap(); });
  wrap.addEventListener("pointercancel", () => { if (drag?.started) fall(drag, 0, 0); drag = null; });
  function throwDemo() {
    if (!visible() || away || held || still) return; const d: Hold = { x0: 0, y0: 0, started: false, minX: 0, maxX: 0, minY: 0, bx: 0, by: 0, cx: 0, cy: 0, vx: 0, vy: 0, lt: 0 }; startHold(d);
    const L = layer.getBoundingClientRect(), dir = cfg.side === "right" ? -1 : 1, tx = clamp(dir * Math.min(220, L.width * 0.35), d.minX, d.maxX), ty = Math.max(d.minY, -L.height * 0.5);
    G.to(wrap, { x: tx, y: ty, rotation: dir * -14, duration: 0.9, ease: "power2.out", onComplete: () => { if (!held) return; G.to(wrap, { rotation: dir * 12, duration: 0.25, yoyo: true, repeat: 1, onComplete: () => { if (held) fall(d, -dir * 1100, -650); } }); } });
  }

  /* ---------- the rocket ---------- */
  function puffs(x: number, y: number, n: number, spread = 50) {
    for (let i = 0; i < n; i++) { if (layer.querySelectorAll(".mz-puff").length > 40) return; const p = document.createElement("i"); p.className = "mz-puff"; p.style.left = x + "px"; p.style.top = y + "px"; layer.appendChild(p);
      G.fromTo(p, { xPercent: -50, yPercent: -50, scale: 0.3, opacity: 0.95 }, { x: (Math.random() - 0.5) * spread * 2, y: -Math.random() * 24, scale: 1 + Math.random() * 1.6, opacity: 0, duration: 1 + Math.random() * 0.7, ease: "power2.out", onComplete: () => p.remove() }); }
  }
  function bigText(txt: string, x: number, y: number) {
    const el = document.createElement("div"); el.className = "mz-count"; el.textContent = txt; el.style.left = x + "px"; el.style.top = y + "px"; layer.appendChild(el);
    G.fromTo(el, { xPercent: -50, yPercent: -100, scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: "back.out(2.5)" }); G.to(el, { opacity: 0, y: -18, duration: 0.3, delay: 0.6, onComplete: () => el.remove() });
  }
  let rocketTl: TL | null = null;
  function rocketBye() {
    if (!visible() || away || held) return; addHeart("rocket");
    if (!cfg.fun.rocket) { act((r) => TALK.hello(r, r.linesOf("bye")[0] || "Bye! 👋")); return; }
    closeTalk(); hostBack?.kill(); hostBack = null; leanBack?.kill(); leanBack = null; stopSleep(rig); away = true; busy = true; setLive();
    G.killTweensOf(wrap); G.set(wrap, { x: 0, y: 0, rotation: 0, xPercent: 0, yPercent: 0, scale: 1, opacity: 1, transformOrigin: "50% 100%" });
    const L = layer.getBoundingClientRect(), W = wrap.getBoundingClientRect(), rw = Math.round(W.width * 0.95), rh = Math.round((rw * 260) / 120);
    const left = clamp(cfg.side === "right" ? W.left - L.left - rw * 0.9 : W.right - L.left - rw * 0.1, 6, L.width - rw - 6), top = L.height - rh - 2;
    Object.assign(rocket.style, { width: rw + "px", height: rh + "px", left: left + "px", top: top + "px", display: "block" }); rkFace.setAttribute("opacity", "0"); rkFlame.style.opacity = "1";
    G.set(rocket, { x: 0, y: -(top + rh + 30), scaleY: 1, transformOrigin: "50% 100%" });
    const s = rig.s, t = rig.begin(null, "grin"); t.to(s, { rx: 182, ry: 100, duration: 0.35, ease: "back.out(1.7)" }); const w = G.timeline({ repeat: 3, yoyo: true }); w.to(s, { rx: 195, ry: 113, duration: 0.18 }); t.add(w); t.call(() => rig.say(rig.linesOf("bye")[0] || "Bye! 👋", 1700), undefined, 0.15);
    const px = left + rw * 0.5, py = top + rh * (96 / 260), bcx = W.left - L.left + W.width / 2, bby = W.bottom - L.top, base = top + rh * (196 / 260);
    let lastPuff = 0; const R = G.timeline(); rocketTl = R;
    R.to(rocket, { y: 0, duration: 1.25, ease: "power3.out" }, 0.4).call(() => { SND.thud(); puffs(left + rw / 2, base, 9, 60); rkFlame.style.opacity = "0"; })
      .to(rocket, { scaleY: 0.93, duration: 0.08 }).to(rocket, { scaleY: 1, duration: 0.4, ease: "elastic.out(1,.4)" }).call(() => rig.say("All aboard! 🚀", 1200)).to({}, { duration: 0.7 });
    R.addLabel("hop").call(() => { const tt = rig.begin(null, "grin", "happy"); tt.to(s, { lx: 70, ly: 96, rx: 170, ry: 96, duration: 0.25 }); }, undefined, "hop")
      .to(wrap, { x: px - bcx, duration: 0.7, ease: "power1.inOut" }, "hop")
      .to(wrap, { keyframes: [{ y: py - bby - 90, duration: 0.38, ease: "power2.out" }, { y: py - bby + rw * 0.08, duration: 0.32, ease: "power2.in" }] }, "hop")
      .to(wrap, { scale: 0.16, duration: 0.7, ease: "power2.in" }, "hop").to(wrap, { opacity: 0, duration: 0.12 }, "hop+=.6")
      .call(() => { rig.hush(); G.fromTo(rkFace, { attr: { opacity: 0 } }, { attr: { opacity: 1 }, duration: 0.3 }); SND.pop(); }).to({}, { duration: 0.5 });
    ["3", "2", "1"].forEach((n) => { R.call(() => { bigText(n, left + rw / 2, top - 6); SND.beep(); puffs(left + rw / 2, base, 2, 30); }).to(rocket, { x: 1.6, duration: 0.05, yoyo: true, repeat: 9, ease: "none" }); });
    R.call(() => { rkFlame.style.opacity = "1"; SND.whoosh(1.9); puffs(left + rw / 2, base, 12, 70); bigText("Lift-off! 🚀", left + rw / 2, top - 6); }).to(rocket, { x: 0, duration: 0.05 })
      .to(rocket, { y: -(top + rh + 80), duration: 1.8, ease: "power2.in", onUpdate() { const n = performance.now(); if (n - lastPuff > 60) { lastPuff = n; puffs(left + rw / 2 + (Math.random() - 0.5) * 8, base + Number(G.getProperty(rocket, "y")) + 20, 1, 14); } } })
      .call(() => { rocket.style.display = "none"; })
      .to({}, { duration: cfg.fun.backAfter }).call(parachuteBack);
  }
  function parachuteBack() {
    const L = layer.getBoundingClientRect(), s = rig.s; rkFace.setAttribute("opacity", "0");
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
  if (!preview) {
    io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) cur = (e.target as HTMLElement).id; }, { rootMargin: "-45% 0px -50% 0px" });
    const hero = document.getElementById("hero"); if (hero) io.observe(hero);
    sectionEls().forEach((s) => io!.observe(s));
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
    on(document, "visibilitychange", () => { if (document.hidden) { hiddenAt = Date.now(); return; } if (hiddenAt && Date.now() - hiddenAt > 2500 && cfg.fun.notice.back && free()) act(FUN.welcome, { heart: "back" }); hiddenAt = 0; });
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
  const greetOnce = () => { if (preview) return true; try { if (sessionStorage.getItem("lc_mz_hi")) return false; sessionStorage.setItem("lc_mz_hi", "1"); } catch {} return true; };

  /* ---------- eyes, ducking, waking ---------- */
  let lpx = 0, lpy = 0, lpt = 0;
  on(window, "pointermove", (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    rig.lookAt(e.clientX, e.clientY, cfg.follow && !lite);
    const now = performance.now(), sp = Math.hypot(e.clientX - lpx, e.clientY - lpy) / Math.max(1, now - lpt); lpx = e.clientX; lpy = e.clientY; lpt = now;
    if (!(e.movementX || e.movementY) || drag) return;
    if (preview) { const L = layer.getBoundingClientRect(); if (e.clientX < L.left || e.clientX > L.right || e.clientY < L.top || e.clientY > L.bottom) return; }
    lastAct = Date.now();
    if (rig.sleeping && visible() && !away) { act((r) => wakeRig(r)); return; }
    if (!cfg.duck || !free() || still) return;
    const b = rig.rect; if (!b) return; const cx = b.left + b.width / 2, cy = b.top + b.height * 0.45;
    if (sp > 1.6 && Math.hypot(e.clientX - cx, e.clientY - cy) < b.width * 0.6 && Date.now() > duckCool) { duckCool = Date.now() + 4500; const dir = (e.clientX < cx ? -1 : 1) * (rig.mirror ? -1 : 1); act((r) => duckRig(r, dir)); }
  }, { passive: true });
  on(window, "keydown", () => { lastAct = Date.now(); });
  on(window, "keydown", (e: KeyboardEvent) => { if (e.key === "Escape" && !talkEl.hidden && !document.querySelector("dialog[open]")) closeTalk(); });
  every(1000, () => {
    if (preview || !free() || rig.sleeping || still || document.hidden) return; const idle = Date.now() - lastAct;
    if (cfg.nap && idle > cfg.napAfter * 1000) { rig.live = false; cfg.fun.ground ? sleepGround(rig) : sleepStand(rig); return; }
    if (cfg.fun.bored && !lite && idle > cfg.fun.boredAfter * 1000 && Date.now() - lastBored > cfg.fun.boredAfter * 1000) { const list = IDLE_KEYS.filter((k) => cfg.fun.games[k]); if (list.length) { lastBored = Date.now(); act(FUN[pick(list)], { idle: true }); } }
  });
  every(17000, () => { if (!preview && cfg.chat === "chatty" && free() && !rig.sleeping && !rig.bubOn && Date.now() - lastAct < 60000 && !document.hidden) rig.say(pick(TIPS), 2600); });

  /* ---------- slow devices and screen changes ---------- */
  const toLite = () => { lite = true; rig.calm(true); rainEl.style.display = "none"; if (!busy && !away && !held) restNow(); };
  on(window, "lc-lite", toLite);
  const onPhone = () => { sizeWrap(); updateVis(); closeTalk(); placeWrap(false); };
  phoneMq.addEventListener("change", onPhone); offs.push(() => phoneMq.removeEventListener("change", onPhone));

  /* ---------- start ---------- */
  let alive = true;
  sizeWrap(); updateVis(); placeWrap(false); setMoment(autoMoment(), false); drawTalk();
  const startT = window.setTimeout(() => { if (preview) { enterBit("hero", true); return; } const hero = document.getElementById("hero"); const r = hero?.getBoundingClientRect(); if (r && r.bottom > 0 && r.top < innerHeight) enterBit("hero", greetOnce()); else if (!still && !lite) act(TRICKS.wave); }, 900);

  return {
    update(m) {
      const before = cfg; cfg = m; rig.cfg = m; rig.setLook(m); paint(); setSound(m.fun.sounds); sizeWrap(); updateVis(); drawTalk();
      if (before.side !== m.side || before.place !== m.place) { hostBack?.kill(); G.set(wrap, { x: 0 }); placeWrap(true); }
      if (JSON.stringify(before.moments) !== JSON.stringify(m.moments)) setMoment(autoMoment(), false);
    },
    ask, openTalk,
    fun(k) { if (k === "sleep") { if (!visible() || away || held || still) return; busy = false; setLive(); rig.kill(); cfg.fun.ground ? sleepGround(rig) : sleepStand(rig); } else if (k === "wake") { if (rig.sleeping) act((r) => wakeRig(r)); } else if (FUN[k]) act(FUN[k]); },
    trick(k) { if (TRICKS[k]) act(TRICKS[k]); },
    bit(k) { if (!BITS[k]) return; enterBit(k, true); },
    moment(k) { setMoment(k, true); },
    nap() { if (!visible() || away || held || still) return; busy = false; setLive(); rig.kill(); cfg.fun.ground ? sleepGround(rig) : sleepStand(rig); },
    wake() { if (rig.sleeping) act((r) => wakeRig(r)); },
    throwDemo,
    stop() {
      alive = false; clearTimeout(startT); clearTimeout(restT); clearTimeout(tapT); clearTimeout(tickleT); timers.forEach(clearInterval); offs.forEach((f) => f()); io?.disconnect(); endIo?.disconnect();
      rocketTl?.kill(); hostBack?.kill(); leanBack?.kill(); G.killTweensOf(wrap); G.killTweensOf(rocket); stopSleep(rig); rig.destroy(); layer.innerHTML = "";
    },
  };
}
