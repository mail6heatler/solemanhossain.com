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
import { MZ_BIT_OF_LAYOUT, MZ_JEANS, MZ_QA, MZ_SHIRTS, type MascotSettings, type MascotView, type MzPos, type MzQa } from "@/lib/mascot";
import { saveMascotSpot } from "@/app/actions";
import { pageY, prefersReducedMotion } from "./fx";
import {
  BITS, FUN, HAT_OF, IDLE_KEYS, MOMENTS, REST, CLEAR, Rig, SND, TALK, TRICKS, duckRig, fillWords, lookVars, markGesture, pick, rocketSvg, rps, setSound,
  sleepGround, sleepStand, stopSleep, useGsap, vary, wakeRig, type TL,
} from "./mascotRig";

type GS = typeof import("gsap").gsap;
export type MascotCtl = {
  update(m: MascotSettings): void; ask(k: string): void; fun(k: string): void; trick(k: string): void; bit(k: string): void; moment(k: string): void;
  nap(): void; wake(): void; throwDemo(): void; openTalk(): void; testVoice(): void; stop(): void;
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const TIPS = ["Psst. Click me, I can talk!", "Try dragging me. I dare you.", "There is more below, keep going.", "Ask me who I am. 😎", "Tap me three times. I dare you. 🤭"];
const QE: Record<string, string> = { who: "😎", job: "💼", from: "📍", joke: "🥁", food: "🍜", single: "💘", sing: "🎤", trick: "🤸", game: "✊", tour: "🧭", bye: "👋", top: "⬆️" };
const FOLLOW: Record<string, string[]> = {
  start: ["who", "joke", "game"], who: ["job", "from", "single"], job: ["joke", "food", "sing"], from: ["food", "sing", "who"], joke: ["trick", "sing", "game"],
  food: ["from", "single", "joke"], single: ["sing", "joke", "who"], sing: ["trick", "game", "joke"], trick: ["game", "joke", "who"], game: ["joke", "who", "trick"],
  hello: ["who", "joke", "game"], shrug: ["who", "joke", "food"], nudge: ["who", "joke", "game"], react: ["who", "joke", "sing"], soon: ["who", "joke", "game"],
};
const AVATARS = ["🦊", "🐼", "🐨", "🐯", "🐸", "🦁", "🐧", "🦄", "🐙", "🐵", "🐰", "🐻"];
const QUICK: [string, string][] = [["👋", "wave"], ["😂", "laugh"], ["❤️", "love"], ["🔥", "fire"]];
/* his own lines in the talking scene, each with versions (the owner's are in settings.mascot, lib/mascot.ts) */
const LINES = {
  pick: ["Pick a card below 👇", "Go on, pick a card! 👇", "Choose one below 👇", "Tap a card, any card! 👇"],
  again: ["You already asked that! 😄 Okay, once more…", "Again? Okay, okay! 😄", "Déjà vu! Here it is again… 😄"],
  watch: ["Watch this! 😎", "Ready? Watch! 😎", "Check this out! 😎"],
  hi: ["Hey hey! 👋", "Hi hi! 👋 Good to see you!", "Hello there! 👋", "Heyyy! 👋"],
  laugh: ["Haha! Glad you're having fun! 😄", "Hahaha! You're funny! 😂", "LOL! Love that! 😄"],
  love: ["Aww, right back at you! 💖", "Stop it, I'm blushing! 💖", "Love you too, friend! 💖"],
  nudge: ["Still there? Pick a card! 😄", "Hellooo? I'm still here! 😄", "Don't be shy, pick one! 😄"],
  shrug: ["Hmm, I don't know that one yet. Try a card! 👇", "Ooh, good one. Ask me something else? 👇"],
  soon: ["Soon you'll be able to type anything, and I'll answer like a real AI! 🤖", "Typing to me is coming soon. I'm getting a big brain upgrade! 🧠✨", "Coming soon: ask me anything! I'm in AI school right now. 🎓"],
  soon2: ["For now, pick a card 👇", "Till then, the cards are all yours 👇", "Meanwhile, try a card! 👇"],
  aboard: ["All aboard! 🚀", "Hop in! 🚀", "Next stop: space! 🚀"],
  back: ["Wheee! I'm baaack! 🪂", "Coming in for landing! 🪂", "Look out below! 🪂"],
  home: ["I'm back! Did you miss me? 😄", "Home sweet corner! 😄", "Space was fun. Hi again! 😄"],
  whoa: ["Whoa! Put me down! 😱", "Hey! Where are we going?!", "Aaah! Not so high!", "Wheee, I'm flying!"],
  wee: ["Wheeeee!", "Aaaah!", "Weeee! 🤸", "Incoming!"],
  again2: ["Wheee! Again! 🤩", "That was fun! Again?", "My head is spinning… 😵‍💫", "10/10 would fly again! 😄"],
};
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
  for (let i = 0; i < 16; i++) { const d = document.createElement("i"); d.className = "mz-rest"; d.style.left = Math.random() * 100 + "%"; d.style.animationDuration = 0.55 + Math.random() * 0.4 + "s"; d.style.animationDelay = -Math.random() + "s"; rainEl.appendChild(d); }
  for (let i = 0; i < 7; i++) { const d = document.createElement("i"); d.className = "mz-rest"; d.textContent = i % 3 ? "✦" : "⋆"; d.style.left = 6 + Math.random() * 88 + "%"; d.style.top = Math.random() * 80 + "%"; d.style.animationDelay = -Math.random() * 2 + "s"; nightEl.appendChild(d); }
  let rkFace!: SVGGElement, rkFlame!: SVGGElement, rkName = "";
  const drawRocket = () => { if (rkName === cfg.fun.rocketName) return; rkName = cfg.fun.rocketName; rocket.innerHTML = rocketSvg(rkName); rkFace = rocket.querySelector(".mz-rk-face") as SVGGElement; rkFlame = rocket.querySelector(".mz-rk-flame") as SVGGElement; };
  drawRocket();
  const paint = () => Object.entries(lookVars(cfg, MZ_SHIRTS, MZ_JEANS)).forEach(([k, v]) => layer.style.setProperty(k, v));
  paint();

  /* which way he faces: toward the middle of the screen (true when he stands on its right half) */
  let isRight = cfg.side === "right";
  const rig = new Rig(wrap, layer, cfg, { mirror: isRight, still: still || lite });
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

  /* ---------- where he stands ----------
     His spot is the one placed by hand (settings.mascot.pos, a computer's and a phone's, carried there on the site itself or
     dragged on the dashboard), or the corner on `side`. It's worked out when he starts, and again only when the width changes.
     Steady on every phone browser (the owner's rule, 2026-11-21): when a browser's bars slide away while scrolling, the page's
     area grows at its top (an address bar on top, Chrome's default), its bottom (a bottom toolbar, as on iPhones) or both
     (Samsung Internet). `topShare` is the part that grows at the top. He's held from the edge that doesn't move, and where both
     move, from the bottom and nudged by the bottom's share on every height change (`anchor`). The share is learnt from the
     visitor's own finger: a touch's screenY minus its clientY is where the page's top edge is on the glass, so a height change
     shows how much of it happened at the top. It's remembered in that browser (lc_mz_top). On phones he also steps off the
     round menu button (the orb) and stays above the pull-up sheet's handle. */
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let topShare = ios ? 0 : 1;
  try { const v = parseFloat(localStorage.getItem("lc_mz_top") || ""); if (v >= 0 && v <= 1) topShare = v; } catch {}
  let baseW = -1, baseH = 0, baseBottom = 4;
  function anchor() {
    if (!baseH) return; const H = layer.clientHeight, h = wrap.offsetHeight || 120, s = wrap.style, hs = home.style, steady = phone() && !preview;
    if (steady && topShare <= 0.15) { const top = baseH - baseBottom - h; s.bottom = hs.bottom = "auto"; s.top = top + "px"; hs.top = top + h - 24 + "px"; return; }
    const b = steady && topShare < 0.85 ? baseBottom + (H - baseH) * (1 - topShare) : baseBottom;
    s.top = hs.top = "auto"; s.bottom = b + "px"; hs.bottom = Math.max(0, b - 4) + "px";
  }
  /** the browser's bars turned out to work differently: keep him exactly where he is now, held the new way */
  function rebase() { const H = layer.clientHeight; if (!H) return; baseBottom = H - (wrap.offsetTop + wrap.offsetHeight); baseH = H; anchor(); }
  function placeBase(force = false) {
    const W = layer.clientWidth, H = layer.clientHeight; if (!W || (!force && W === baseW)) return; baseW = W;
    const ph = phone(), p = ph ? cfg.pos.phone : cfg.pos.desk, w = wrap.offsetWidth || (cfg.size / 100) * (ph ? 96 : 150), h = wrap.offsetHeight || w * 1.29;
    let left = cfg.side === "right" ? W - w - 12 : 12, bottom = 4;
    if (p) { left = clamp((p.x / 100) * W - w / 2, 4, Math.max(4, W - w - 4)); bottom = clamp((p.y / 100) * H, 2, Math.max(2, H - h - 2)); }
    if (cfg.place === "peek") left = left + w / 2 > W / 2 ? W - w - 12 : 12; // peeking only works from an edge
    if (ph && !preview) {
      const orb = document.querySelector<HTMLElement>(".pm-orb-btn"), L = layer.getBoundingClientRect(), o = orb?.getBoundingClientRect();
      if (o && o.width && left < o.right - L.left + 6 && left + w > o.left - L.left - 6 && bottom < L.bottom - o.top + 8) {
        if (!p) left = o.left - L.left + o.width / 2 > W / 2 ? 12 : W - w - 12; // the corner by default: the other corner
        else bottom = L.bottom - o.top + 8; // a placed spot: he stands on top of the orb
      }
    }
    isRight = left + w / 2 > W / 2;
    const s = wrap.style, hs = home.style;
    s.right = hs.right = "auto"; s.left = left + "px"; hs.left = left + w * 0.025 + "px";
    baseBottom = bottom; baseH = H; anchor();
  }
  if (!ios && !preview) {
    let last: { o: number; h: number; w: number } | null = null;
    on(window, "touchmove", (e: TouchEvent) => {
      const t = e.touches[0]; if (!t) return; const o = t.screenY - t.clientY, h = window.innerHeight, w = window.innerWidth;
      if (!(o > 4) || !phone()) { last = null; return; } // screenY isn't measured from the glass here: nothing to learn
      const p = last; last = { o, h, w }; if (!p || p.w !== w) return;
      const d = h - p.h; if (Math.abs(d) < 24) return;
      const share = (p.o - o) / d; if (share < -0.25 || share > 1.25) return;
      const v = Math.round(clamp(share, 0, 1) * 20) / 20; if (Math.abs(v - topShare) < 0.1) return;
      topShare = v; try { localStorage.setItem("lc_mz_top", String(v)); } catch {}
      if (!CV.on && !held && !away) rebase();
    }, { passive: true });
  }
  function placeWrap(anim: boolean) {
    placeBase(); const right = isRight; wrap.classList.toggle("left", !right); home.classList.toggle("left", !right); rig.setMirror(right); rig.wrapDir = right ? -1 : 1;
    const v = cfg.place === "peek" ? { x: 0, y: 0, xPercent: right ? 44 : -44, rotation: right ? -14 : 14, yPercent: 5 } : { x: 0, y: 0, xPercent: 0, rotation: 0, yPercent: 0 };
    G.to(wrap, { ...v, scale: 1, opacity: 1, duration: anim ? 0.6 : 0, ease: "power3.inOut" });
  }
  const sizeWrap = () => { const w = (cfg.size / 100) * (phone() ? 96 : 150); wrap.style.width = w + "px"; home.style.width = w * 0.95 + "px"; placeBase(true); };
  /** on a phone he stays exactly where he is: no walking to the middle, no leaning in, nothing that scrolling sets off (the owner's rule) */
  const planted = () => phone() && !preview;
  /* On phones he holds completely still while the page scrolls (the owner's rule, 2026-11-21): whatever he's doing pauses where it
     is and carries on once scrolling stops, and nothing new starts meanwhile. A throw, the rocket or the talking scene isn't paused. */
  type Pausable = { pause(): unknown; resume(): unknown; isActive(): boolean; paused(): boolean; parent?: unknown };
  let scrollingNow = false, scrollStop = 0, frozen: Pausable[] = [];
  function freeze() {
    if (frozen.length || CV.on || away || held) return;
    const top = (t: Pausable) => !t.parent || t.parent === G.globalTimeline; // a tween inside a timeline pauses with it
    const list = [rig.tl, ...rig.loops, ...G.getTweensOf(rig.s), ...G.getTweensOf(wrap)] as (Pausable | null)[];
    frozen = [...new Set(list.filter((t): t is Pausable => !!t && top(t) && t.isActive() && !t.paused()))];
    frozen.forEach((t) => t.pause());
  }
  function thaw() { const l = frozen; frozen = []; l.forEach((t) => t.resume()); }
  function phoneScroll() {
    if (!planted()) return;
    if (!scrollingNow) { scrollingNow = true; freeze(); }
    clearTimeout(scrollStop); scrollStop = window.setTimeout(() => { scrollingNow = false; thaw(); }, 220);
  }
  function updateVis() { wrap.style.display = visible() ? "" : "none"; home.style.display = visible() && cfg.place !== "peek" ? "" : "none"; if (!visible() && CV.on) closeScene(); }
  function leanIn() {
    if (cfg.place !== "peek" || planted()) return; const right = isRight; leanBack?.kill();
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
  const lineFor = (k: string) => vary(k === "hero" ? cfg.greet.replace(/\{time\}/g, dayPart()) : (cfg.lines as Record<string, string>)[k] || "");
  function enterBit(k: string, talk: boolean) {
    curBit = k;
    if (!visible() || away || held || CV.on) return;
    if (still) { if (talk) rig.say(lineFor(k)); return; }
    if (rig.sleeping) { act((r) => wakeRig(r, true)); return; }
    if (busy) return;
    const line = talk && (cfg.chat !== "quiet" || k === "hero") ? lineFor(k) : "";
    if (cfg.place === "host" && !preview && !planted()) {
      hostBack?.kill();
      const W = layer.clientWidth, w = wrap.offsetWidth, dx = W / 2 - (wrap.offsetLeft + w / 2);
      walkTo(dx, () => { if (busy || CV.on) return; playBit(k); if (line) window.setTimeout(() => rig.say(line), 300);
        hostBack = G.delayedCall(6.5, () => { if (!busy && !away && !held && !CV.on) walkTo(0, restNow); }); });
    } else { leanIn(); if (!playBit(k)) restNow(); if (line) window.setTimeout(() => { if (!busy && !CV.on) { hideInvite(true); rig.say(line); } }, 600); }
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
  const CV = { on: false, token: 0, asked: new Set<string>(), performing: false, idleAt: 0, nudged: 0, last: "start", mode: "" as "" | "game", lastInvite: 0, mt: 0, S: 1, sx: 0, sy: 0, side: "" };
  const dim = mk("div", "mzc-dim"), say = mk("div", "mzc-say"), cards = mk("div", "mzc-cards"), top = mk("div", "mzc-top"), invite = mk("button", "mzc-invite");
  const bar = mk("div", "mzc-bar"), you = mk("div", "mzc-you");
  [dim, say, cards, you, bar, top, invite].forEach((e) => { e.hidden = true; layer.appendChild(e); });
  say.setAttribute("aria-live", "polite"); invite.type = "button";
  dim.setAttribute("role", "presentation");
  top.innerHTML = `<button type="button" class="mzc-vo" aria-label="His voice on or off"></button><button type="button" class="mzc-x" aria-label="Close and send him back to his corner">✕</button>`;
  let av = ""; try { av = localStorage.getItem("lc_mz_av") || ""; } catch {} if (!AVATARS.includes(av)) { av = pick(AVATARS); try { localStorage.setItem("lc_mz_av", av); } catch {} }
  // typing to him is the AI assistant that's coming (the owner's plan, 2026-11-21): the box shows it, and a tap on it gets a playful "soon"
  bar.innerHTML = `<span class="mzc-av" aria-hidden="true">${av}</span><button type="button" class="mzc-soon" aria-label="Typing to him: an AI assistant, coming soon"><span class="mzc-soon-ic" aria-hidden="true">✨</span><span class="mzc-soon-t">Ask me anything…</span><b class="mzc-soon-b">AI · coming soon</b></button>
<span class="mzc-quick">${QUICK.map(([e, k]) => `<button type="button" data-q="${k}" aria-label="Send ${e}">${e}</button>`).join("")}</span>`;
  const avEl = bar.querySelector(".mzc-av") as HTMLElement, soonEl = bar.querySelector(".mzc-soon") as HTMLElement;
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
  function viseme(w: string) { const x = w.toLowerCase(), m = /^[mbp]/.test(x) ? "flat" : /[ou]/.test(x) ? "o" : /a/.test(x) ? "open" : "grin"; rig.setMouth(m, true); clearTimeout(CV.mt); CV.mt = window.setTimeout(() => rig.setMouth(rig.mouth, true), 150); }
  /* a small nod now and then while he talks (every word made his head jerk) */
  function beat() { const s = rig.s; G.to(s, { nod: (Math.random() - 0.5) * 5, duration: 0.45, ease: "sine.inOut", overwrite: "auto" }); }
  /**
   * Says one sentence. The bubble gets every word at once (fillWords), so it has its final size and place from the start, and the
   * words fade in one after another in time with his voice: by its word boundaries when the device reports them, otherwise by the
   * time it takes to say that much at his speed. Without a voice the words come at an easy reading pace, then stay long enough to read.
   */
  function speakLine(text: string) {
    const tok = CV.token;
    return new Promise<void>((res) => {
      if (!CV.on || tok !== CV.token || !text) { res(); return; }
      CV.idleAt = Date.now();
      const spans = fillWords(say, text), n = spans.length, starts: number[] = [];
      let at = 0; spans.forEach((sp) => { starts.push(at); at += (sp.textContent || "").length + 1; });
      say.hidden = false; CV.side = ""; placeSay(true);
      if (!still) G.fromTo(say, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2)" });
      const clean = stripEmoji(text), voiced = cfg.convo.voice && VOX.ok && clean.length > 0, rate = cfg.convo.rate / 100, total = Math.max(1, at - 1);
      let shown = 0, done = false, raf = 0, safety = 0, t0 = 0, msPer = still ? 0 : 30, spoken = 0, ended = false, heard = false;
      const show = (k: number) => { k = clamp(k, 0, n); while (shown < k) { const sp = spans[shown++]; sp.classList.add("on"); viseme(sp.textContent || ""); if (shown % 3 === 1) beat(); } };
      const frame = (now: number) => {
        raf = 0; if (done) return; if (tok !== CV.token) { finish(); return; }
        const byTime = t0 ? (now - t0) / msPer : 0, chars = voiced ? Math.min(Math.max(byTime, spoken), ended ? total : total * 0.96) : byTime;
        let k = shown; while (k < n && starts[k] <= chars) k++; show(k);
        if (shown >= n && (!voiced || ended)) { finish(); return; }
        raf = requestAnimationFrame(frame);
      };
      const run = (per: number) => { if (done) return; msPer = per; if (!t0) t0 = performance.now(); if (!raf) raf = requestAnimationFrame(frame); };
      const finish = () => {
        if (done) return; done = true; cancelAnimationFrame(raf); clearTimeout(safety);
        if (tok === CV.token) show(n); G.to(rig.s, { nod: 0, duration: 0.3 });
        window.setTimeout(res, heard ? 380 : clamp(text.length * 38, 900, 2800)); // without a voice: time to read it
      };
      if (!voiced) { if (still) { show(n); finish(); } else run(30); return; }
      const u = new SpeechSynthesisUtterance(clean); if (VOX.v) { u.voice = VOX.v; u.lang = VOX.v.lang; }
      u.rate = rate; u.pitch = cfg.convo.pitch / 100; u.volume = cfg.convo.volume / 100;
      u.onstart = () => { heard = true; run(Math.round(66 / rate)); }; // about 15 letters a second at normal speed
      u.onboundary = (e) => { if (e.name && e.name !== "word") return; spoken = Math.max(spoken, (e.charIndex / Math.max(1, clean.length)) * total + 2); if (!t0) run(Math.round(66 / rate)); };
      u.onend = () => { ended = true; if (heard) spoken = total; run(msPer || 30); }; u.onerror = () => { ended = true; run(msPer || 30); };
      safety = window.setTimeout(() => { ended = true; finish(); }, 2500 + (clean.length * 130) / rate);
      try { speechSynthesis.speak(u); } catch { ended = true; run(30); }
      window.setTimeout(() => { if (!done && !t0) { let sp = false; try { sp = speechSynthesis.speaking; } catch {} if (!sp) { ended = true; run(30); } } }, 900);
    });
  }
  /* his bubble: beside his head on the roomier side, or above it. It glides after him rather than jumping with every nod,
     and keeps its side unless that side runs out of room. */
  function placeSay(snap = false) {
    if (say.hidden) return; const s = rig.s, L = layer.getBoundingClientRect();
    const a = rig.pt(70 + s.x, 92 + s.y), b = rig.pt(170 + s.x, 92 + s.y), tp = rig.pt(120 + s.x, 24 + s.y);
    const minX = Math.min(a[0], b[0]), maxX = Math.max(a[0], b[0]), hy = (a[1] + b[1]) / 2, w = say.offsetWidth, h = say.offsetHeight, roomL = minX - 12, roomR = L.width - maxX - 12, need = w + 16;
    let side = CV.side;
    if (!side || (side === "r" && roomR < need) || (side === "l" && roomL < need)) side = roomR >= need && roomR >= roomL ? "r" : roomL >= need ? "l" : "t";
    CV.side = side;
    let x: number, y: number;
    if (side === "r") { x = maxX + 16; y = hy - h * 0.8; } else if (side === "l") { x = minX - 16 - w; y = hy - h * 0.8; } else { x = tp[0] - w / 2; y = tp[1] - h - 18; }
    x = clamp(x, 8, Math.max(8, L.width - w - 8)); y = clamp(y, 56, Math.max(56, L.height - h - 8));
    if (snap || Math.abs(x - CV.sx) > 120 || Math.abs(y - CV.sy) > 120) { CV.sx = x; CV.sy = y; }
    else { const dx = x - CV.sx, dy = y - CV.sy; if (Math.abs(dx) > 0.6) CV.sx += dx * 0.18; if (Math.abs(dy) > 0.6) CV.sy += dy * 0.18; }
    say.style.left = Math.round(CV.sx) + "px"; say.style.top = Math.round(CV.sy) + "px"; say.dataset.side = side;
    say.style.setProperty("--ty", clamp(hy - CV.sy, 18, h - 18) + "px"); say.style.setProperty("--tx", clamp(tp[0] - CV.sx, 22, w - 22) + "px");
  }
  function placeInvite() {
    if (invite.hidden) return; const [px, py] = rig.pt(120 + rig.s.x, 18 + rig.s.y), w = invite.offsetWidth, h = invite.offsetHeight, L = layer.getBoundingClientRect(), x = clamp(px - w / 2, 8, L.width - w - 8);
    invite.style.left = x + "px"; invite.style.top = Math.max(8, py - h - 12) + "px"; invite.style.setProperty("--tx", clamp(px - x, 16, w - 16) + "px");
  }
  const tick = () => { if (CV.on) placeSay(); placeInvite(); if (!invite.hidden && (rig.bubOn || CV.on)) hideInvite(true); };
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
  const endLoops = (more: Record<string, number>) => play(() => { const t = G.timeline(); t.call(() => rig.stopLoops()); t.to(rig.s, { ...more, duration: 0.4 }); return t; });

  /* what he does for each question: steps run one after another; a newer question stops the older one between steps */
  const SCRIPT: Record<string, (arg?: string) => Step[]> = {
    start() { const s = rig.s, nm = visitorName(); return [
      () => play(() => { const t = rig.begin(null, "grin"); t.to(s, { rx: 182, ry: 100, lx: 84, ly: 214, duration: 0.35, ease: "back.out(1.7)" }); const w = G.timeline({ repeat: 3, yoyo: true }); w.to(s, { rx: 195, ry: 113, duration: 0.18 }); t.add(w); return t; }),
      () => talk([(nm ? `Hey ${nm}! ` : "") + vary(cfg.convo.hello), vary(LINES.pick)], ["open", "point"])]; },
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
        t.call(() => { rig.say(vary(["SPICY! 🌶️🔥", "HOT HOT HOT! 🌶️", "Water! WATER! 🔥"])); rig.every(200, () => { rig.burst(["💨"], 76, 100, 1, "", 20); rig.burst(["💨"], 164, 100, 1, "", 20); }); });
        const fan = G.timeline({ repeat: 7, yoyo: true }); fan.to(s, { lx: 106, ly: 128, duration: 0.08 }).to(s, { lx: 116, ly: 136, duration: 0.08 }); t.add(fan); t.to(s, { y: -14, duration: 0.16, yoyo: true, repeat: 3, ease: "power2.out" }, "<");
        t.call(() => { rig.stopLoops(); rig.face("grin", "happy"); }).to(s, { blush: 0, brow: 0, sy: 1, duration: 0.4 }); return t; }),
      () => talk([vary(["Worth it. 😋", "No regrets. 😋", "Totally worth it. 😋"])], ["thumb"])]; },
    single() { const s = rig.s; return [
      () => play(() => { const t = rig.begin(null, "smile"); t.to(s, { blush: 1.2, lx: 110, ly: 226, rx: 130, ry: 226, head: 8, gx: -0.9, gy: 0.5, brow: 0.6, duration: 0.45 }); t.call(() => { rig.loop(G.to(s, { rg: 10, rot: -1.5, duration: 0.35, yoyo: true, repeat: -1, ease: "sine.inOut" })); rig.burst(["💗", "💕", "💗"], 120, 60, 3, "", 100); }); return t; }),
      () => talk(linesOf("single"), [], "none"), () => endLoops({ blush: 0, rg: 0, rot: 0 })]; },
    sing() { const s = rig.s; return [
      () => play(() => { const t = rig.begin("mic", "grin", "happy"); t.to(s, { rx: 136, ry: 136, lx: 70, ly: 150, brow: 0.6, duration: 0.35, ease: "back.out(1.5)" }); t.call(() => { rig.loop(G.to(s, { rot: 4, head: 6, duration: 0.5, yoyo: true, repeat: -1, ease: "sine.inOut" })); rig.every(600, () => rig.burst([pick(["🎵", "🎶"])], 150, 110, 1, "", 60)); SND.notes(); }); return t; }),
      () => talk(linesOf("sing"), ["sweep"], "left"), () => endLoops({ rot: 0, head: 0 })]; },
    trick() { const list = Object.entries(cfg.tricks).filter(([, v]) => v).map(([k]) => k), k = list.length ? list[trickI++ % list.length] : "wave"; return [() => talk([vary(LINES.watch)], ["point"]), () => play(() => TRICKS[k](rig))]; },
    game() { return [() => talk(linesOf("game"), ["count"]), () => { CV.mode = "game"; }]; },
    rps(you) { return [() => play(() => rps(rig, you || "rock", (res) => { score[res]++; }))]; },
    tour() { const n = nextSection(), title = n ? (n.id === "hero" ? "the top" : (n.querySelector("h2")?.textContent || n.id).trim().slice(0, 40)) : "the homepage";
      return [() => talk([`${linesOf("tour")[0] || "Follow me!"} Next up: ${title}.`], ["sweep"]), () => closeScene(() => tourGo(n))]; },
    top() { return [() => talk([vary(["Up we go! ⬆️", "To the top! ⬆️", "Going up! 🛗"])], ["point"]), () => closeScene(() => toTop())]; },
    bye() { return [() => rocketBye()]; },
    hello(line) { const s = rig.s; return [() => { if (!still) rig.loop(G.fromTo(s, { rx: 182, ry: 100 }, { rx: 195, ry: 113, duration: 0.18, yoyo: true, repeat: 7 })); }, () => talk([line || "Hi! 👋"]), () => rig.stopLoops()]; },
    laugh() { const s = rig.s; return [() => play(() => { const t = rig.begin(null, "grin", "happy"); t.to(s, { lx: 108, ly: 200, rx: 132, ry: 200, duration: 0.2 }); t.to(s, { upY: -3, rot: 2, duration: 0.07, yoyo: true, repeat: 11 }); t.call(() => { rig.burst(["😂", "🤣"], 120, 50, 3, "", 120); SND.giggle(); }, undefined, 0.2); return t; }), () => talk([vary(LINES.laugh)], ["open"])]; },
    love() { const s = rig.s; return [() => play(() => { const t = rig.begin(null, "smile"); t.to(s, { blush: 1.3, rx: 126, ry: 178, lx: 110, ly: 200, head: 7, duration: 0.4 }); t.call(() => rig.burst(["💖", "💕", "💗"], 120, 50, 4, "", 130)); return t; }), () => talk([vary(LINES.love)], [], "none"), () => endLoops({ blush: 0 })]; },
    fire() { return [() => play(() => TRICKS.fireup(rig))]; },
    nudge() { const s = rig.s; return [() => play(() => { const t = rig.begin(null, "smile"); const tap = G.timeline({ repeat: 5, yoyo: true }); tap.to(s, { rk: 7, duration: 0.12 }); t.add(tap); t.to(s, { gx: -0.9, head: -5, duration: 0.5 }, 0.35).to(s, { gx: 0.9, head: 5, duration: 0.7 }).to(s, { gx: 0, head: 0, duration: 0.4 }); return t; }), () => talk([vary(LINES.nudge)], ["open"])]; },
    shrug() { return [() => talk([vary(LINES.shrug)], ["shrug"])]; },
    /* a tap on the "coming soon" box: he taps his head (a big brain on the way), sparkles, then sends them back to the cards */
    soon() { const s = rig.s; return [
      () => play(() => { const t = rig.begin(null, "grin"); t.to(s, { rx: 140, ry: 74, lx: 84, ly: 214, head: -4, brow: 0.8, gy: -0.6, duration: 0.35, ease: "back.out(1.8)" });
        const tp = G.timeline({ repeat: 3, yoyo: true }); tp.to(s, { ry: 68, duration: 0.12 }); t.add(tp); t.call(() => { rig.burst(["🤖", "✨", "🧠"], 120, 30, 3, "", 120); SND.ting(); }); return t; }),
      () => talk([vary(LINES.soon), vary(LINES.soon2)], ["open", "down"])]; },
  };
  const score = { you: 0, him: 0, draw: 0 };
  const QKEYS = MZ_QA.map(([k]) => k as string);
  function convoAsk(k: string, arg?: string) {
    if (!CV.on) return; const tok = ++CV.token; hush();
    hideCards(); CV.performing = true; CV.idleAt = Date.now(); rig.stopLoops();
    const isQ = QKEYS.includes(k); if (isQ) addHeart("q-" + k);
    let steps: Step[] = still ? [() => talk(k === "start" ? [vary(cfg.convo.hello)] : k === "soon" ? [vary(LINES.soon), vary(LINES.soon2)] : isQ ? linesOf(k) : [arg || "Hmm! 🤔"])] : (SCRIPT[k] || SCRIPT.shrug)(arg);
    if (still && (k === "bye" || k === "top" || k === "tour")) steps = (SCRIPT[k] || SCRIPT.shrug)(arg);
    // asked again: his answer comes in another version anyway (answer() never repeats the last one), so only sometimes he points it out
    if (isQ && CV.asked.has(k) && !["trick", "game", "bye", "tour"].includes(k) && Math.random() < 0.5) steps = [() => talk([vary(LINES.again)], ["shrug"]), ...steps];
    if (isQ) CV.asked.add(k);
    if (!still) G.fromTo(wrap, { scale: CV.S * 0.97 }, { scale: CV.S, duration: 0.5, ease: "power2.out" });
    (async () => { for (const st of steps) { if (tok !== CV.token || !CV.on) return; await st(); }
      if (tok !== CV.token || !CV.on) return; CV.performing = false; CV.last = k; stance(); showCards(k); CV.idleAt = Date.now(); })();
  }

  /* the visitor's side: a hand of reply cards, all the same size (the owner's rule), and quick reactions */
  function hideCards() { cards.hidden = true; cards.innerHTML = ""; cards.classList.remove("going"); }
  function card(emoji: string, label: string, fn: (el: HTMLElement) => void, cls = "") {
    const b = mk("button", "mzc-card" + (cls ? " " + cls : "")) as HTMLButtonElement; b.type = "button";
    const em = mk("span", "mzc-em"), tx = mk("span", "mzc-lb"); em.textContent = emoji; tx.textContent = label; b.title = label; b.append(em, tx);
    b.style.setProperty("--r", (Math.random() * 6 - 3).toFixed(1) + "deg"); b.onclick = () => { if (!cards.classList.contains("going")) fn(b); }; cards.appendChild(b); return b;
  }
  function showCards(k: string) {
    cards.innerHTML = ""; cards.classList.remove("going");
    if (CV.mode === "game") {
      const sc = mk("div", "mzc-score"); sc.textContent = `You ${score.you} · Him ${score.him} · Draws ${score.draw}`; cards.appendChild(sc);
      ([["rock", "✊"], ["paper", "✋"], ["scissors", "✌️"]] as const).forEach(([c, e]) => card(e, c[0].toUpperCase() + c.slice(1), (el) => send(e, el, () => convoAsk("rps", c))));
      card("↩️", "Something else", () => { CV.mode = ""; showCards("game"); });
    } else {
      const on = QKEYS.filter((x) => cfg.qa[x as MzQa]?.on && !["bye", "tour"].includes(x)), list: string[] = [];
      (FOLLOW[k] || []).forEach((x) => { if (on.includes(x) && !CV.asked.has(x) && list.length < 3) list.push(x); });
      on.forEach((x) => { if (!CV.asked.has(x) && !list.includes(x) && list.length < 3) list.push(x); });
      (FOLLOW[k] || on).forEach((x) => { if (on.includes(x) && !list.includes(x) && list.length < 3) list.push(x); });
      list.forEach((x) => card(QE[x] || "💬", cfg.qa[x as MzQa].q, (el) => send(cfg.qa[x as MzQa].q, el, () => convoAsk(x))));
      if (cfg.qa.tour.on && !preview) card("🧭", cfg.qa.tour.q, (el) => send(cfg.qa.tour.q, el, () => convoAsk("tour")));
      if (!preview) card("⬆️", "Take me to the top", (el) => send("Take me to the top", el, () => convoAsk("top")));
      if (cfg.qa.bye.on) card("👋", cfg.qa.bye.q, (el) => send(cfg.qa.bye.q, el, () => convoAsk("bye")));
    }
    cards.hidden = false;
    if (!still) G.fromTo(cards.querySelectorAll(".mzc-card"), { y: 50, opacity: 0, rotation: (i: number) => (i % 2 ? 14 : -14), scale: 0.8 }, { y: 0, opacity: 1, rotation: 0, scale: 1, duration: 0.55, stagger: 0.06, ease: "back.out(1.9)" });
  }
  /* a sparkle left behind by a flying card; capped, and gone in under a second */
  function trail(x: number, y: number) {
    if (layer.querySelectorAll(".mzc-trail").length > 16) return; const d = mk("i", "mzc-trail"); d.textContent = pick(["✨", "⭐", "✦"]); d.style.left = x + "px"; d.style.top = y + "px"; layer.appendChild(d);
    G.fromTo(d, { xPercent: -50, yPercent: -50, scale: 1, opacity: 0.95 }, { scale: 0.2, opacity: 0, y: 10 + Math.random() * 14, x: (Math.random() - 0.5) * 18, duration: 0.7, ease: "power1.out", onComplete: () => d.remove() });
  }
  /**
   * A picked card flies to him, a different way each time (the owner asked for more fun): it spins over in an arc, folds into a
   * paper plane that loops before landing, or bounces over in hops. The other cards drop away, he reaches up, catches it with a
   * squash and a sparkle, then answers. Only transform and opacity move.
   */
  function send(text: string, from: HTMLElement | null, then: () => void) {
    markGesture(); CV.idleAt = Date.now();
    const L = layer.getBoundingClientRect(), src = from || avEl, A = src.getBoundingClientRect();
    if (still) { hideCards(); window.setTimeout(then, 300); return; }
    cards.classList.add("going");
    const others = [...cards.children].filter((c) => c !== from) as HTMLElement[];
    if (others.length) G.to(others, { y: 70, opacity: 0, rotation: () => (Math.random() - 0.5) * 50, duration: 0.42, stagger: 0.03, ease: "power2.in" });
    you.textContent = text; you.className = "mzc-you"; you.hidden = false; G.killTweensOf(you);
    G.set(you, { x: 0, y: 0, scale: 1, scaleX: 1, scaleY: 1, opacity: 1, rotation: 0, xPercent: -50, yPercent: -50 });
    const sx = A.left - L.left + A.width / 2, sy = A.top - L.top + A.height / 2; you.style.left = sx + "px"; you.style.top = sy + "px";
    if (from && cards.contains(from)) G.to(from, { opacity: 0, scale: 1.15, duration: 0.18 }); else G.fromTo(avEl, { scale: 1 }, { scale: 1.25, duration: 0.15, yoyo: true, repeat: 1 });
    const [hx, hy] = rig.pt(120 + rig.s.x, 150 + rig.s.y), dx = hx - sx, dy = hy - sy, dir = dx >= 0 ? 1 : -1, s = rig.s;
    const style = vary(["arc", "plane", "hop"]);
    let last = 0; const tr = () => { const n = performance.now(); if (n - last < 55) return; last = n; const b = you.getBoundingClientRect(); trail(b.left - L.left + b.width / 2, b.top - L.top + b.height / 2); };
    const reach = () => { rig.stopLoops(); G.to(s, { lx: 98, ly: 112, rx: 142, ry: 112, brow: 1, gy: -0.5, duration: 0.3, ease: "power2.out", overwrite: "auto" }); };
    const catchIt = () => {
      SND.pop(); rig.burst(["✨", "💥", "⭐"], 120, 120, 3, "", 80);
      G.to(s, { sy: 0.9, sx: 1.08, ly: 128, ry: 128, duration: 0.08, yoyo: true, repeat: 1 }); G.to(s, { brow: 0, gy: 0, duration: 0.4, delay: 0.2 });
      G.to(you, { scale: 0, opacity: 0, duration: 0.16, ease: "power2.in", onComplete: () => { you.hidden = true; hideCards(); then(); } });
    };
    const t = G.timeline({ onUpdate: tr });
    t.fromTo(you, { scale: 0.5, opacity: 0 }, { scale: 1.1, opacity: 1, duration: 0.2, ease: "back.out(2.4)" }).to(you, { scale: 1, duration: 0.12 });
    if (style === "plane") {
      // squashes flat, turns into a paper plane and loops the loop on its way
      t.to(you, { scaleY: 0.08, duration: 0.14, ease: "power2.in" }).call(() => { you.textContent = "✈️"; you.classList.add("plane"); }).to(you, { scaleY: 1, rotation: dir > 0 ? -30 : 210, duration: 0.16, ease: "back.out(3)" });
      t.to(you, { keyframes: [
        { x: dx * 0.35, y: dy * 0.2 - 120, rotation: dir > 0 ? -50 : 230, duration: 0.42, ease: "sine.out" },
        { x: dx * 0.55, y: dy * 0.2 - 190, rotation: dir > 0 ? -200 : 380, duration: 0.32, ease: "none" },
        { x: dx * 0.45, y: dy * 0.2 - 90, rotation: dir > 0 ? -330 : 510, duration: 0.3, ease: "none" },
        { x: dx, y: dy, rotation: dir > 0 ? -340 : 520, duration: 0.42, ease: "power2.in" }] });
    } else if (style === "hop") {
      // bounces over in three hops, squashing as it lands
      const hops = 3; for (let i = 1; i <= hops; i++) { const f = i / hops, h = 110 - i * 22;
        t.to(you, { keyframes: [{ x: dx * (f - 0.5 / hops), y: dy * f - h, rotation: `+=${dir * 120}`, duration: 0.2, ease: "power1.out" }, { x: dx * f, y: dy * f, rotation: `+=${dir * 120}`, duration: 0.2, ease: "power1.in" }] });
        if (i < hops) t.to(you, { scaleY: 0.75, scaleX: 1.2, duration: 0.06, yoyo: true, repeat: 1 }); }
    } else {
      // spins over in a high arc
      t.addLabel("fly").to(you, { x: dx, duration: 0.9, ease: "power1.inOut" }, "fly").to(you, { rotation: dir * 720, scale: 0.7, duration: 0.9, ease: "power1.inOut" }, "fly")
        .to(you, { keyframes: [{ y: Math.min(dy, 0) - 170, duration: 0.42, ease: "power2.out" }, { y: dy, duration: 0.48, ease: "power2.in" }] }, "fly");
    }
    t.call(reach, undefined, Math.max(0.2, t.duration() - 0.45)).call(catchIt, undefined, t.duration());
  }
  on(soonEl, "click", () => { markGesture(); if (!CV.on) return; G.fromTo(soonEl, { scale: 1 }, { scale: 0.94, duration: 0.09, yoyo: true, repeat: 1 }); convoAsk("soon"); });
  bar.querySelectorAll<HTMLButtonElement>("[data-q]").forEach((b) => on(b, "click", () => { const k = b.dataset.q || "wave"; const em = b.textContent || "";
    send(em, b, () => { if (k === "wave") convoAsk("hello", vary(LINES.hi)); else convoAsk(k); }); }));
  const syncTop = () => { (top.querySelector(".mzc-vo") as HTMLElement).textContent = cfg.convo.voice ? "🔊" : "🔇"; };
  on(top.querySelector(".mzc-vo") as HTMLElement, "click", () => { cfg = { ...cfg, convo: { ...cfg.convo, voice: !cfg.convo.voice } }; if (!cfg.convo.voice) hush(); syncTop(); });
  on(top.querySelector(".mzc-x") as HTMLElement, "click", () => closeScene());
  on(dim, "click", () => closeScene());

  /* opening and closing the scene */
  function target() { const L = layer.getBoundingClientRect(), w = wrap.offsetWidth, h = wrap.offsetHeight, S = clamp((L.height * (phone() ? 0.4 : 0.46)) / h, 1.1, cfg.convo.scale / 100); return { x: L.width / 2 - (wrap.offsetLeft + w / 2), y: L.height * (phone() ? 0.6 : 0.68) - (wrap.offsetTop + h), S }; }
  function openScene(first?: string) {
    if (CV.on) { if (first) convoAsk(first); return; }
    if (!visible() || away || held) return;
    markGesture(); hideInvite(true); rig.hush(); hostBack?.kill(); hostBack = null; leanBack?.kill(); leanBack = null; stopSleep(rig); rig.hush();
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
  function hideScene() { [say, cards, you, bar, top].forEach((e) => { e.hidden = true; }); cards.innerHTML = ""; cards.classList.remove("going"); layer.querySelectorAll(".mzc-trail").forEach((e) => e.remove()); }
  function closeScene(after?: () => void) {
    if (!CV.on) return; CV.on = false; CV.token++; CV.performing = false; hush(); hideScene(); rig.sayHook = null; rig.stopLoops();
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
  every(1000, () => { if (CV.on && !CV.performing && Date.now() - CV.idleAt > 14000 && Date.now() - CV.nudged > 25000 && !document.hidden) { CV.nudged = Date.now(); convoAsk("nudge"); } });

  /* the "Wanna chat?" invite over his head */
  /* never at the same time as anything else he says, and gone at once when the talking scene opens (the two used to overlap on phones) */
  let inviteT = 0;
  function hideInvite(now = false) { clearTimeout(inviteT); if (invite.hidden) return; G.killTweensOf(invite); if (now || still) { invite.hidden = true; return; } G.to(invite, { opacity: 0, scale: 0.8, duration: 0.2, onComplete: () => { invite.hidden = true; } }); }
  function showInvite() { if (rig.bubOn || CV.on) return; invite.textContent = vary(cfg.convo.inviteText) || "Wanna chat? 💬"; invite.hidden = false; placeInvite(); CV.lastInvite = Date.now();
    G.fromTo(invite, { opacity: 0, scale: 0.5, y: 10 }, { opacity: 1, scale: 1, y: 0, duration: still ? 0.01 : 0.45, ease: "back.out(2.4)" }); clearTimeout(inviteT); inviteT = window.setTimeout(() => hideInvite(), 6500); }
  on(invite, "click", () => { hideInvite(true); openScene(); });
  CV.lastInvite = Date.now() - Math.max(0, cfg.convo.inviteEvery - 8) * 1000;
  every(1000, () => { if (!preview && cfg.convo.invite && free() && !rig.sleeping && invite.hidden && !rig.bubOn && !document.hidden && Date.now() - CV.lastInvite > cfg.convo.inviteEvery * 1000 && Date.now() - lastAct > 2500) showInvite(); });

  /* ---------- the tour and the top ---------- */
  const sectionEls = () => [...document.querySelectorAll<HTMLElement>("section[data-spy][id]")];
  function nextSection() { const list = sectionEls(); if (!list.length || preview) return null; const i = list.findIndex((x) => x.id === cur); return list[(i + 1) % list.length]; }
  function tourGo(n: HTMLElement | null) { if (preview) return; if (!n) { location.href = "/"; return; } n.scrollIntoView({ behavior: "smooth", block: "start" }); }
  function toTop() { if (preview) return; window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" }); }

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
  type Hold = { id?: number; x0: number; y0: number; started: boolean; minX: number; maxX: number; minY: number; bx: number; by: number; cx: number; cy: number; vx: number; vy: number; lt: number; qr?: (v: number) => void; carry?: boolean; maxY?: number; natL?: number; natT?: number };
  let drag: Hold | null = null;
  const newHold = (x0 = 0, y0 = 0, id?: number): Hold => ({ id, x0, y0, started: false, minX: 0, maxX: 0, minY: 0, bx: 0, by: 0, cx: 0, cy: 0, vx: 0, vy: 0, lt: 0 });
  function bounds() { const L = layer.getBoundingClientRect(), W = wrap.getBoundingClientRect(), cx = Number(G.getProperty(wrap, "x")), cy = Number(G.getProperty(wrap, "y")); const natL = W.left - L.left - cx, natT = W.top - L.top - cy; return { minX: 6 - natL, maxX: L.width - W.width - 6 - natL, minY: 6 - natT }; }
  function startHold(d: Hold) {
    d.started = true; held = true; setLive(); lastAct = Date.now(); addHeart("throw"); hideInvite(true);
    hostBack?.kill(); hostBack = null; leanBack?.kill(); leanBack = null; G.killTweensOf(wrap); stopSleep(rig); busy = false; rig.hush();
    G.set(wrap, { xPercent: 0, yPercent: 0, rotation: 0, scale: 1 }); Object.assign(d, bounds());
    d.bx = clamp(Number(G.getProperty(wrap, "x")), d.minX, d.maxX); d.by = Math.min(Number(G.getProperty(wrap, "y")), 0); d.cx = d.bx; d.cy = d.by; d.vx = 0; d.vy = 0; d.lt = performance.now();
    G.set(wrap, { transformOrigin: "50% 6%" }); d.qr = G.quickTo(wrap, "rotation", { duration: 0.35, ease: "power2.out" });
    const s = rig.s; rig.run((t) => { t.call(() => { rig.setProp(null); rig.face("open", "open"); }); t.to(s, { ...REST, ...CLEAR, lx: 68, ly: 100, rx: 172, ry: 100, brow: 1.3, duration: 0.18 });
      const k = G.timeline({ repeat: -1 }); k.to(s, { lg: 16, rg: -4, ly: 94, ry: 106, duration: 0.16, ease: "sine.inOut" }).to(s, { lg: 4, rg: -16, ly: 106, ry: 94, duration: 0.16, ease: "sine.inOut" }); t.add(k); });
    rig.say(vary(LINES.whoa), 1800); SND.boing();
  }
  function moveHold(d: Hold, px: number, py: number) {
    const x = clamp(d.bx + (px - d.x0), d.minX, d.maxX), y = clamp(d.by + (py - d.y0), d.minY, 0), now = performance.now(), dt = Math.max(1, now - d.lt);
    d.vx = d.vx * 0.6 + ((x - d.cx) / dt) * 1000 * 0.4; d.vy = d.vy * 0.6 + ((y - d.cy) / dt) * 1000 * 0.4; d.cx = x; d.cy = y; d.lt = now;
    G.set(wrap, { x, y }); d.qr?.(clamp(-d.vx * 0.025, -35, 35));
  }
  function fall(b: Hold, vx: number, vy: number) {
    held = false; busy = true; setLive();
    let x = Number(G.getProperty(wrap, "x")), y = Number(G.getProperty(wrap, "y")), rot = Number(G.getProperty(wrap, "rotation")), w = clamp(vx * 0.18, -420, 420), last = performance.now(), bounces = 0;
    G.killTweensOf(wrap); rig.say(vary(LINES.wee), 1200);
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
      t.call(() => { rig.face("grin", "happy"); rig.say(vary(LINES.again2), 1800); }); t.to({}, { duration: 1.3 }); t.call(() => rig.face("grin", "open")); });
    t.eventCallback("onComplete", () => { busy = false; setLive(); if (Math.abs(Number(G.getProperty(wrap, "x"))) > 4) walkTo(0, () => { placeWrap(true); resume(); }); else { placeWrap(true); resume(); } });
  }
  /* ---------- the owner places him by hand, on the website itself (2026-11-21) ----------
     Only in the owner's browser (their dashboard leaves the lc_owner mark): press and hold him for a moment without moving and
     he's lifted; carry him anywhere on the screen and let go, and he stands there. A little bar then offers to save that spot
     for everyone on this kind of screen (saveMascotSpot checks the real login), or to put him back. A quick drag still throws
     him, as before, for everyone. */
  const ownerHere = () => !preview && /(?:^|;\s*)lc_owner=1/.test(document.cookie);
  const own = mk("div", "mz-own"); own.hidden = true; layer.appendChild(own);
  let holdT = 0, ownT = 0, ownFor: { dev: "desk" | "phone"; pos: MzPos; before: MzPos | null } | null = null;
  function startCarry(d: Hold) {
    d.started = true; d.carry = true; held = true; setLive(); lastAct = Date.now(); hideInvite(true); hideOwn();
    hostBack?.kill(); hostBack = null; leanBack?.kill(); leanBack = null; G.killTweensOf(wrap); stopSleep(rig); busy = false; rig.hush();
    G.set(wrap, { xPercent: 0, yPercent: 0, rotation: 0, scale: 1 });
    const L = layer.getBoundingClientRect(), W = wrap.getBoundingClientRect(), cx = Number(G.getProperty(wrap, "x")), cy = Number(G.getProperty(wrap, "y"));
    d.natL = W.left - L.left - cx; d.natT = W.top - L.top - cy;
    d.minX = 2 - d.natL; d.maxX = L.width - W.width - 2 - d.natL; d.minY = 2 - d.natT; d.maxY = L.height - W.height - 2 - d.natT;
    d.bx = cx; d.by = cy; d.cx = cx; d.cy = cy; d.vx = 0; d.lt = performance.now();
    wrap.classList.add("carried"); G.set(wrap, { transformOrigin: "50% 8%" }); d.qr = G.quickTo(wrap, "rotation", { duration: 0.4, ease: "power2.out" });
    G.fromTo(wrap, { scale: 1 }, { scale: 1.1, duration: 0.25, ease: "back.out(3)" });
    const s = rig.s; rig.run((t) => { t.call(() => { rig.setProp(null); rig.face("grin", "happy"); }); t.to(s, { ...REST, ...CLEAR, lx: 70, ly: 98, rx: 170, ry: 98, brow: 0.8, sy: 1.03, duration: 0.22, ease: "back.out(2)" });
      const k = G.timeline({ repeat: -1, yoyo: true }); k.to(s, { lg: 9, rg: -9, duration: 0.45, ease: "sine.inOut" }); t.add(k); });
    rig.say(vary(["Where to, boss? 😄", "Ooh, a new home? Take me anywhere!", "Carry me anywhere you like! 😄", "Wheee! Where shall I stand?"]), 1800); SND.pop();
  }
  function moveCarry(d: Hold, px: number, py: number) {
    const x = clamp(d.bx + (px - d.x0), d.minX, d.maxX), y = clamp(d.by + (py - d.y0), d.minY, d.maxY ?? 0), now = performance.now(), dt = Math.max(1, now - d.lt);
    d.vx = d.vx * 0.6 + ((x - d.cx) / dt) * 1000 * 0.4; d.cx = x; d.cy = y; d.lt = now;
    G.set(wrap, { x, y }); d.qr?.(clamp(-d.vx * 0.02, -22, 22));
  }
  function dropCarry(d: Hold) {
    const x = Number(G.getProperty(wrap, "x")), y = Number(G.getProperty(wrap, "y")), moved = Math.hypot(x - d.bx, y - d.by) > 6;
    wrap.classList.remove("carried"); G.killTweensOf(wrap); held = false;
    const W = layer.clientWidth, H = layer.clientHeight, w = wrap.offsetWidth, h = wrap.offsetHeight, left = (d.natL ?? 0) + x, top = (d.natT ?? 0) + y;
    const dev = phone() ? "phone" : "desk", before = cfg.pos[dev];
    const pos: MzPos = { x: Math.round(clamp(((left + w / 2) / W) * 100, 0, 100) * 10) / 10, y: Math.round(clamp(((H - (top + h)) / H) * 100, 0, 100) * 10) / 10 };
    if (moved) { cfg = { ...cfg, pos: { ...cfg.pos, [dev]: pos } }; rig.cfg = cfg; }
    G.set(wrap, { x: 0, y: 0, rotation: 0, transformOrigin: "50% 100%" }); placeBase(true);
    wrap.classList.toggle("left", !isRight); home.classList.toggle("left", !isRight); rig.setMirror(isRight); rig.wrapDir = isRight ? -1 : 1;
    G.fromTo(wrap, { scale: 1.1 }, { scale: 1, duration: 0.45, ease: "elastic.out(1,.5)" });
    const s = rig.s, t = rig.run((t) => { t.to(s, { sy: 0.86, sx: 1.1, lg: 0, rg: 0, lx: 70, ly: 214, rx: 170, ry: 214, duration: 0.08 }).to(s, { ...REST, ...CLEAR, duration: 0.5, ease: "elastic.out(1,.45)" });
      t.call(() => { rig.face("grin", "open"); if (moved) rig.burst(["✨", "📍"], 120, 40, 2, "", 60); SND.thud(); }); });
    busy = true; setLive(); t.eventCallback("onComplete", () => { busy = false; setLive(); resume(); });
    if (moved) showOwn({ dev, pos, before });
  }
  function hideOwn() { clearTimeout(ownT); own.hidden = true; ownFor = null; }
  function showOwn(o: NonNullable<typeof ownFor>) {
    ownFor = o; const where = o.dev === "phone" ? "phones" : "computers";
    own.innerHTML = `<span class="mz-own-t">📍 New spot on ${where}</span><button type="button" class="mz-own-save">📌 Save for everyone</button><button type="button" class="mz-own-undo" aria-label="Put him back where he was">↺</button>`;
    own.hidden = false; placeOwn(); if (!still) G.fromTo(own, { opacity: 0, y: 10, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "back.out(2.4)" });
    clearTimeout(ownT); ownT = window.setTimeout(hideOwn, 30000); // unsaved, the spot lasts for this page only
    (own.querySelector(".mz-own-save") as HTMLElement).onclick = async () => {
      const f = ownFor; if (!f) return; const t = own.querySelector(".mz-own-t") as HTMLElement; t.textContent = "Saving…"; clearTimeout(ownT);
      const r = await saveMascotSpot(f.dev, f.pos).catch(() => null);
      if (r && r.ok) { t.textContent = `✓ Saved for everyone on ${where}`; own.querySelectorAll("button").forEach((b) => b.remove()); rig.say(vary(["My new spot! I love it here. 😎", "Saved! This is home now. 🏠", "Perfect spot, boss! 😄"]), 2200); ownT = window.setTimeout(hideOwn, 2200); }
      else if (r && !r.ok && r.error === "login") { t.innerHTML = `Log in to your <a href="/admin">dashboard</a> first, then place me again`; own.querySelectorAll("button").forEach((b) => b.remove()); document.cookie = "lc_owner=; path=/; max-age=0"; ownT = window.setTimeout(hideOwn, 9000); }
      else { t.textContent = "That didn't save. Try again?"; ownT = window.setTimeout(hideOwn, 15000); }
    };
    (own.querySelector(".mz-own-undo") as HTMLElement).onclick = () => {
      const f = ownFor; if (!f) return; hideOwn(); cfg = { ...cfg, pos: { ...cfg.pos, [f.dev]: f.before } }; rig.cfg = cfg; placeBase(true);
      wrap.classList.toggle("left", !isRight); home.classList.toggle("left", !isRight); rig.setMirror(isRight); rig.wrapDir = isRight ? -1 : 1;
      if (!still) G.fromTo(wrap, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" });
    };
  }
  function placeOwn() {
    if (own.hidden) return; const [px, py] = rig.pt(120 + rig.s.x, 10 + rig.s.y), w = own.offsetWidth, h = own.offsetHeight, L = layer.getBoundingClientRect();
    let y = py - h - 14; if (y < 8) { const [, by] = rig.pt(120, 300); y = Math.min(L.height - h - 8, by + 10); }
    own.style.left = clamp(px - w / 2, 8, Math.max(8, L.width - w - 8)) + "px"; own.style.top = Math.max(8, y) + "px";
  }
  G.ticker.add(placeOwn); offs.push(() => G.ticker.remove(placeOwn));
  on(wrap, "contextmenu", (e: Event) => { if (ownerHere()) e.preventDefault(); }); // a long press on a phone shouldn't open the browser's menu
  on(wrap, "pointerdown", (e: PointerEvent) => {
    if ((e.pointerType === "mouse" && e.button !== 0) || away || CV.on) return; markGesture(); drag = newHold(e.clientX, e.clientY, e.pointerId); try { wrap.setPointerCapture(e.pointerId); } catch {}
    clearTimeout(holdT); if (ownerHere()) { const d = drag; holdT = window.setTimeout(() => { if (drag === d && !d.started) startCarry(d); }, 420); }
  });
  on(wrap, "pointermove", (e: PointerEvent) => {
    if (!drag || drag.id !== e.pointerId) return;
    if (drag.carry) { moveCarry(drag, e.clientX, e.clientY); return; }
    if (!drag.started) { if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 7) return; clearTimeout(holdT); if (!cfg.fun.throw || still) return; startHold(drag); }
    moveHold(drag, e.clientX, e.clientY);
  });
  on(wrap, "pointerup", (e: PointerEvent) => {
    clearTimeout(holdT); if (CV.on) { drag = null; return; } if (!drag || drag.id !== e.pointerId) return; const d = drag; drag = null;
    if (d.carry) dropCarry(d); else if (d.started) fall(d, clamp(d.vx, -2600, 2600), clamp(d.vy, -2600, 2600)); else onTap();
  });
  on(wrap, "pointercancel", () => { clearTimeout(holdT); if (drag?.carry) dropCarry(drag); else if (drag?.started) fall(drag, 0, 0); drag = null; });
  function throwDemo() {
    if (!visible() || away || held || still || CV.on) return; const d = newHold(); startHold(d);
    const L = layer.getBoundingClientRect(), dir = isRight ? -1 : 1, tx = clamp(dir * Math.min(220, L.width * 0.35), d.minX, d.maxX), ty = Math.max(d.minY, -L.height * 0.5);
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
    const staged = CV.on, byeLine = linesOf("bye")[0] || "Bye! 👋";
    if (!cfg.fun.rocket || still) { if (staged) { await talk([byeLine], ["open"]); closeScene(); } else act((r) => TALK.hello(r, byeLine)); return; }
    drawRocket();
    hostBack?.kill(); hostBack = null; leanBack?.kill(); leanBack = null; stopSleep(rig); away = true; busy = true; setLive();
    if (staged) { CV.token++; CV.performing = true; hideScene(); } // the conversation ends here; his last words still show in his bubble
    G.killTweensOf(wrap);
    if (!staged) G.set(wrap, { x: 0, y: 0, rotation: 0, xPercent: 0, yPercent: 0, scale: 1, opacity: 1, transformOrigin: "50% 100%" });
    const s = rig.s, L0 = layer.getBoundingClientRect(), W0 = wrap.getBoundingClientRect();
    // a smaller rocket than before (the owner's ask, 2026-11-21): about half his width and at most 40% of the screen's height, so it
    // has a long way to climb and the flight can be watched
    const floor = W0.top - L0.top + W0.height * FEET, rw = Math.round(Math.min(W0.width * (staged ? 0.55 : 0.62), (floor * 0.9) / ((260 / 120) * NOZZLE), (L0.height * 0.4 * 120) / 260)), rh = Math.round((rw * 260) / 120);
    const left = staged ? L0.width / 2 - rw / 2 : clamp(isRight ? W0.left - L0.left - rw * 0.9 : W0.right - L0.left - rw * 0.1, 6, L0.width - rw - 6), top = floor - rh * NOZZLE;
    // on the stage he steps aside so the rocket can land in the middle
    if (staged) {
      const roomR = L0.right - W0.right, dir = roomR > W0.left - L0.left ? 1 : -1, step = rw * 0.62 + W0.width * 0.32;
      rig.say(byeLine);
      await new Promise<void>((res) => walkTo(Number(G.getProperty(wrap, "x")) + dir * step, res));
      rig.run((t) => t.to(s, { ...REST, ...CLEAR, rx: 182, ry: 100, duration: 0.3 }));
    } else {
      const t = rig.begin(null, "grin"); t.to(s, { rx: 182, ry: 100, duration: 0.35, ease: "back.out(1.7)" }); const w = G.timeline({ repeat: 3, yoyo: true }); w.to(s, { rx: 195, ry: 113, duration: 0.18 }); t.add(w);
      t.call(() => rig.say(byeLine, 1700), undefined, 0.15);
    }
    if (!alive) return;
    Object.assign(rocket.style, { width: rw + "px", height: rh + "px", left: left + "px", top: top + "px", display: "block", zIndex: staged ? "4" : "1" });
    rkFace.setAttribute("opacity", "0"); rkFlame.style.opacity = "1";
    G.set(rocket, { x: 0, y: -(top + rh + 30), scaleY: 1, rotation: 0, transformOrigin: "50% 76%" });
    const W = wrap.getBoundingClientRect(), L = layer.getBoundingClientRect(), cx0 = Number(G.getProperty(wrap, "x")), cy0 = Number(G.getProperty(wrap, "y")), sc0 = Number(G.getProperty(wrap, "scale"));
    const px = left + rw * 0.5, py = top + rh * (96 / 260), bcx = W.left - L.left + W.width / 2, bby = W.bottom - L.top, base = floor;
    let lastPuff = 0; const R = G.timeline(); rocketTl = R;
    R.to(rocket, { y: 0, duration: 1.25, ease: "power3.out" }, staged ? 0.1 : 0.4).call(() => { SND.thud(); puffs(left + rw / 2, base, 9, 60); rkFlame.style.opacity = "0"; })
      .to(rocket, { scaleY: 0.93, duration: 0.08 }).to(rocket, { scaleY: 1, duration: 0.4, ease: "elastic.out(1,.4)" }).call(() => { const nm = cfg.fun.rocketName.trim(); rig.say(nm ? vary([`All aboard ${nm}! 🚀`, `${nm}, ready for launch! 🚀`, ...LINES.aboard]) : vary(LINES.aboard), 1500); rig.burst(["✨", "⭐"], 120, 40, 2, "", 80); }).to({}, { duration: 0.9 });
    R.addLabel("hop").call(() => { const tt = rig.begin(null, "grin", "happy"); tt.to(s, { lx: 70, ly: 96, rx: 170, ry: 96, duration: 0.25 }); }, undefined, "hop")
      .to(wrap, { x: cx0 + px - bcx, duration: 0.7, ease: "power1.inOut" }, "hop")
      .to(wrap, { keyframes: [{ y: cy0 + py - bby - 90, duration: 0.38, ease: "power2.out" }, { y: cy0 + py - bby + rw * 0.08, duration: 0.32, ease: "power2.in" }] }, "hop")
      .to(wrap, { scale: sc0 * clamp((rw / W.width) * 0.26, 0.06, 0.16), duration: 0.7, ease: "power2.in" }, "hop").to(wrap, { opacity: 0, duration: 0.12 }, "hop+=.6")
      .call(() => { rig.hush(); G.fromTo(rkFace, { attr: { opacity: 0 } }, { attr: { opacity: 1 }, duration: 0.3 }); SND.pop(); }).to({}, { duration: 0.5 });
    ["3", "2", "1"].forEach((n) => { R.call(() => { bigText(n, left + rw / 2, Math.max(70, top - 6)); SND.beep(); puffs(left + rw / 2, base, 2, 30); }).to(rocket, { x: 1.6, duration: 0.05, yoyo: true, repeat: 9, ease: "none" }); });
    R.call(() => { rkFlame.style.opacity = "1"; SND.whoosh(1.9); puffs(left + rw / 2, base, 12, 70); bigText("Lift-off! 🚀", left + rw / 2, Math.max(70, top - 6));
        if (staged) { CV.on = false; CV.token++; CV.performing = false; rig.sayHook = null; say.hidden = true; G.to(dim, { opacity: 0, duration: 1.6, delay: 0.4, onComplete: () => { dim.hidden = true; } }); } })
      .to(rocket, { x: 0, duration: 0.05 })
      // a slow, long climb with a little wobble, trailing smoke, so the whole flight can be seen
      .addLabel("up")
      .to(rocket, { y: -(top + rh + 80), duration: 3.4, ease: "power1.in", onUpdate() { const n = performance.now(); if (n - lastPuff > 85) { lastPuff = n; puffs(left + rw / 2 + Number(G.getProperty(rocket, "x")) + (Math.random() - 0.5) * 8, base + Number(G.getProperty(rocket, "y")) + 14, 1, 14); } } }, "up")
      .to(rocket, { keyframes: [{ x: -7, rotation: -3, duration: 0.55 }, { x: 7, rotation: 3, duration: 0.9 }, { x: -5, rotation: -2, duration: 0.9 }, { x: 3, rotation: 1, duration: 1.05 }], ease: "sine.inOut" }, "up")
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
    if (footer) { endIo = new IntersectionObserver((es) => { const e = es[0]; if (e.isIntersecting && !endDone && cfg.fun.notice.end && pageY() > 400) { endDone = true; window.setTimeout(() => { if (free() && !scrollingNow) act(FUN.endParty, { heart: "end" }); }, 400); } }, { threshold: 0.3 }); endIo.observe(footer); }
    let told = "";
    on(window, "scroll", () => {
      const now = performance.now(), y = pageY(), v = Math.abs(y - lastY) / Math.max(1, now - lastT); lastY = y; lastT = now;
      phoneScroll();
      // on phones scrolling never moves him: he isn't woken or blown about by it (a tap still wakes him)
      lastAct = Date.now(); if (rig.sleeping && visible() && !away && !planted()) act((r) => wakeRig(r));
      if (!planted() && v > 3.5 && now > windCool && cfg.fun.notice.fast && free() && !lite) { windCool = now + 7000; act(FUN.wind, { heart: "wind" }); }
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
      if (cfg.chat !== "quiet" && name) t.call(() => rig.say(vary([`Ooh, ${name}!`, `${name}? Good one.`, `That one! ${name}.`, `Ah, ${name}! Nice pick.`]), 1500));
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
    if (cfg.fun.bored && !lite && !scrollingNow && idle > cfg.fun.boredAfter * 1000 && Date.now() - lastBored > cfg.fun.boredAfter * 1000) { const list = IDLE_KEYS.filter((k) => cfg.fun.games[k]); if (list.length) { lastBored = Date.now(); act(FUN[pick(list)], { idle: true }); } }
  });
  every(17000, () => { if (!preview && cfg.chat === "chatty" && free() && !rig.sleeping && !rig.bubOn && Date.now() - lastAct < 60000 && !document.hidden) rig.say(pick(TIPS), 2600); });

  /* ---------- slow devices and screen changes ---------- */
  on(window, "lc-lite", () => { lite = true; rig.calm(true); rainEl.style.display = "none"; if (!busy && !away && !held && !CV.on) restNow(); });
  const onPhone = () => { if (CV.on) closeScene(); sizeWrap(); updateVis(); placeWrap(false); };
  phoneMq.addEventListener("change", onPhone); offs.push(() => phoneMq.removeEventListener("change", onPhone));
  on(window, "resize", () => {
    if (CV.on) { const T = target(); CV.S = T.S; G.to(wrap, { x: T.x, y: T.y, scale: T.S, duration: 0.3 }); return; }
    const was = baseW; placeBase(); if (was === baseW) anchor(); // only the height: a phone's bars moved, he's held steady
    else { rig.setMirror(isRight); rig.wrapDir = isRight ? -1 : 1; wrap.classList.toggle("left", !isRight); home.classList.toggle("left", !isRight); } // only when the width changed
  });

  /* ---------- start ---------- */
  sizeWrap(); updateVis(); placeWrap(false); setMoment(autoMoment(), false);
  const startT = window.setTimeout(() => { if (preview) { enterBit("hero", true); return; } const hero = document.getElementById("hero"); const r = hero?.getBoundingClientRect(); if (r && r.bottom > 0 && r.top < innerHeight) enterBit("hero", greetOnce()); else if (!still && !lite) act(TRICKS.wave); }, 900);

  return {
    update(m) {
      const before = cfg; cfg = m; rig.cfg = m; rig.setLook(m); paint(); setSound(m.fun.sounds); sizeWrap(); updateVis(); syncTop(); pickVoice();
      if (before.side !== m.side || before.place !== m.place || JSON.stringify(before.pos) !== JSON.stringify(m.pos)) { if (!CV.on) { hostBack?.kill(); G.set(wrap, { x: 0 }); placeBase(true); placeWrap(true); } }
      if (before.fun.rocketName !== m.fun.rocketName && !away) drawRocket();
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
      markGesture(); pickVoice(); const line = vary(cfg.convo.hello) || "Hi! I'm Mini Shourobh.";
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
