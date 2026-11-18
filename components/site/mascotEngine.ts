/**
 * The mascot's show (downloaded separately, after the page has loaded). He never walks around: he peeks in from
 * the side, hangs from the menu bar, drops in upside down, bungees on a rope, pops up from the bottom, sits on a
 * card or hides behind a heading, or mixes them. Screen-edge acts live in a fixed layer; sitting and hiding live in
 * a layer that scrolls with the page. Only `transform` and `opacity` move. He rests while the page scrolls, while
 * the tab is hidden and when he falls asleep, and every timer stops when the page leaves.
 */
import type { MascotAct, MascotView } from "@/lib/mascot";
import { CHAR_GEOMETRY, MINI_MOVES, OTHER_MOVES, THEME_COSTUME, mascotSvg, type Move } from "./mascotArt";

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const sleepMs = (ms: number) => new Promise((r) => setTimeout(r, ms));
const HELLO_KEY = "lc_masc_hi";

export function startMascot(host: HTMLElement, v: MascotView): () => void {
  const html = document.documentElement;
  const geo = CHAR_GEOMETRY[v.character];
  const phone = () => window.innerWidth < 700;
  const fix = document.createElement("div"); fix.className = "masc-fix";
  const doc = document.createElement("div"); doc.className = "masc-doc";
  host.append(fix, doc);

  const M = document.createElement("div");
  M.className = "masc gone";
  M.tabIndex = 0;
  M.setAttribute("role", "button");
  const name = v.character === "mini" ? "Mini Shourobh" : v.character[0].toUpperCase() + v.character.slice(1);
  M.setAttribute("aria-label", `${name}, the site's mascot: press for a move`);
  M.dataset.pose = "cross"; M.dataset.legs = "stand";
  M.innerHTML = `<div class="masc-say" aria-live="polite"></div><span class="zz">Z</span><span class="zz">z</span><span class="zz">z</span><div class="masc-svg">${mascotSvg({ character: v.character, outfit: v.outfit, beard: v.beard, glasses: v.glasses, hair: v.hair, skin: v.skin, uid: "site" })}</div>`;
  const say = M.querySelector(".masc-say") as HTMLElement;
  const art = M.querySelector("svg") as SVGSVGElement;
  fix.appendChild(M);
  const sizeUp = () => M.style.setProperty("--mw", `${Math.round((v.character === "mini" ? 92 : 86) * (v.size / 100) * (phone() ? 0.78 : 1))}px`);
  sizeUp();
  const H = () => M.offsetHeight || 180;
  const W = () => M.offsetWidth || 96;

  let alive = true, tok = 0, act: MascotAct = "peek", phase = "", sleeping = false, moving = false, last = Date.now(), sayT = 0, mixT = 0, clickI = 0;
  const timers = new Set<number>();
  const later = (fn: () => void, ms: number) => { const t = window.setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  const setPose = (p: string) => { M.dataset.pose = p; };

  /* how much of him is on screen, 0 to 1 */
  function shown() {
    if (M.classList.contains("gone")) return 0;
    const r = M.getBoundingClientRect(), w = Math.max(0, Math.min(r.right, window.innerWidth) - Math.max(r.left, 0)), h = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
    return r.width && r.height ? (w * h) / (r.width * r.height) : 0;
  }
  /* the bubble stays between the menu bar, the bottom bar and the screen's sides (a `translate`, checked a few times a
     second while it shows, never per frame); with him gone off screen it goes too, so it never talks to nobody */
  let sx = 0, sy = 0, fitT = 0;
  function fitSay(first = false) {
    clearTimeout(fitT);
    if (!alive || !say.classList.contains("on")) return;
    if (!first && shown() < 0.15) { say.classList.remove("on"); M.classList.remove("is-talk"); return; }
    const r = say.getBoundingClientRect(), pad = 8;
    const l = r.left - sx, rt = r.right - sx, tp = r.top - sy, bt = r.bottom - sy;
    const top = navBottom() + pad, bottom = Math.min(window.innerHeight, barTop()) - pad, right = window.innerWidth - pad;
    const nx = l < pad ? pad - l : rt > right ? Math.max(pad - l, right - rt) : 0;
    const ny = tp < top ? top - tp : bt > bottom ? Math.max(top - tp, bottom - bt) : 0;
    if (Math.abs(nx - sx) > 0.5 || Math.abs(ny - sy) > 0.5) { sx = nx; sy = ny; say.style.translate = `${Math.round(sx)}px ${Math.round(sy)}px`; }
    fitT = window.setTimeout(fitSay, 280);
  }
  function speak(text: string, ms = 2600) {
    if (!v.talk || !text) return;
    say.textContent = text; say.classList.add("on"); M.classList.add("is-talk");
    clearTimeout(sayT);
    sayT = window.setTimeout(() => { say.classList.remove("on"); M.classList.remove("is-talk"); clearTimeout(fitT); }, ms);
    fitT = window.setTimeout(() => fitSay(true), 300);
  }
  /* a section's line or the hello that came while he was away is said when he next appears */
  let pending = "";
  const line = (list: string[]) => { if (pending) { const l = pending; pending = ""; return l; } return pick(list); };
  const tell = (text: string, ms: number) => { if (shown() > 0.3) speak(text, ms); else pending = text; };
  let bursts = 0;
  function burst(list: string[], n = 7) {
    if (html.classList.contains("lite") || bursts > 24) return; // a cap, so fast clicking can't pile them up
    const r = M.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      s.className = "masc-burst"; s.textContent = list[i % list.length];
      s.style.left = Math.min(window.innerWidth - 30, Math.max(6, r.left + r.width / 2 - 10)) + "px";
      s.style.top = Math.min(window.innerHeight - 30, Math.max(6, r.top + 30)) + "px";
      s.style.setProperty("--dx", rnd(-65, 65) + "px"); s.style.setProperty("--r", rnd(-30, 30) + "deg");
      s.style.animationDelay = i * 70 + "ms";
      fix.appendChild(s); bursts++;
      later(() => { s.remove(); bursts--; }, 1700);
    }
  }
  function wake() {
    last = Date.now();
    if (sleeping) { sleeping = false; M.classList.remove("is-sleep"); speak("Oh! I'm up, I'm up 😳", 1800); }
  }

  /* waits that stop when the act changes, and hold while he sleeps or the tab is hidden */
  async function wait(ms: number, t: number) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      await sleepMs(120); if (t !== tok || !alive) throw 0;
      while (sleeping || document.hidden) { await sleepMs(300); if (t !== tok || !alive) throw 0; }
    }
  }
  const gapMs = () => v.gap * 1000 * rnd(0.8, 1.25);
  const navBottom = () => { const n = document.querySelector(".site .nav"); return n ? Math.max(0, n.getBoundingClientRect().bottom) : 0; };
  const barTop = () => { const b = document.querySelector(".site .bbar") as HTMLElement | null; return b && b.offsetParent !== null ? b.getBoundingClientRect().top : window.innerHeight; };
  const move = (transform: string, ms = 0, ease = "cubic-bezier(.3,1.4,.5,1)") => {
    M.style.transition = ms ? `transform ${ms}ms ${ease}` : "none";
    if (!ms) { M.style.transform = transform; void M.offsetWidth; } else M.style.transform = transform;
  };
  function clean() {
    fix.appendChild(M);
    doc.querySelectorAll(".masc-clip").forEach((b) => b.remove());
    M.removeAttribute("style"); sizeUp();
    [...M.classList].forEach((k) => { if (k.startsWith("act-") || ["flip", "big", "pull", "hop", "say-r", "say-low", "say-under", "gone"].includes(k)) M.classList.remove(k); });
    M.dataset.legs = "stand"; phase = "";
  }
  const place = (x: number, y: number) => { M.style.left = `${Math.round(x)}px`; M.style.top = `${Math.round(y)}px`; };
  const vw = () => fix.clientWidth || window.innerWidth;
  const sideRight = () => (v.side === "both" ? Math.random() < 0.6 : v.side === "right");

  /* things on the page to sit on or hide behind: in view, not under the menu bar */
  function inView(sel: string) {
    const top = navBottom() + 40, bottom = Math.min(window.innerHeight, barTop()) - 60;
    return [...document.querySelectorAll<HTMLElement>(sel)].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 60 && r.top > top + H() * 0.5 && r.top < bottom && r.left > 8 && r.right < window.innerWidth - 8;
    });
  }

  /* nothing to sit on or hide behind in view: peek once, then look again */
  const peekThen = async (t: number, again: (t: number) => Promise<void>) => { clean(); M.classList.add("gone"); await ACTS.peek(t, true); clean(); M.classList.add("gone"); return again(t); };
  const ACTS: Record<MascotAct, (t: number, once?: boolean) => Promise<void>> = {
    async peek(t, once) {
      M.classList.add("act-peek", "say-low"); setPose("down");
      for (;;) {
        const right = sideRight(), y = rnd(navBottom() + 30, Math.max(navBottom() + 40, barTop() - H() - 30));
        M.classList.toggle("flip", !right); M.classList.toggle("say-r", !right);
        place(right ? vw() - W() : 0, y);
        const away = right ? "translateX(110%)" : "translateX(-110%)";
        move(away); M.classList.remove("gone");
        await wait(400, t);
        move(right ? "translateX(48%) rotate(-15deg)" : "translateX(-48%) rotate(15deg)", 550); phase = "out";
        speak(line(v.lines), 2200);
        await wait(900, t);
        if (phase === "out" && Math.random() < 0.55) { setPose("wave"); await wait(1600, t); setPose("down"); }
        await wait(1800, t);
        phase = "in"; move(away, 380, "ease-in");
        await wait(gapMs(), t);
        if (once) return;
      }
    },
    async hang(t) {
      M.classList.add("act-hang", "say-low"); setPose("up");
      const top = navBottom() - 4 - H() * geo.hand;
      let x = rnd(0.12, 0.7) * (vw() - W());
      place(x, top); M.classList.toggle("say-r", x < vw() / 2);
      move(`translateY(${-H() - top - 20}px)`); M.classList.remove("gone");
      move("none", 700);
      await wait(700, t); speak(line(["Just hanging out 😎", "Nice menu bar you've got", "Don't mind me 🙃", ...v.lines]), 2400);
      for (let i = 0; i < 4; i++) {
        await wait(rnd(3500, 5000), t);
        const r = Math.random();
        if (r < 0.35) { M.classList.add("pull"); speak("Pull-ups! One… two… 💪", 1800); await wait(1700, t); M.classList.remove("pull"); }
        else if (r < 0.65) { M.classList.add("big"); speak("Wheee!", 1500); await wait(2400, t); M.classList.remove("big"); }
        else {
          const nx = rnd(0.12, 0.7) * (vw() - W());
          move(`translateX(${nx - x}px)`, 1800, "ease-in-out"); speak("Coming through!", 1600);
          await wait(1900, t); x = nx; place(x, top); move("none"); M.classList.toggle("say-r", x < vw() / 2);
        }
      }
      move(`translateY(${-H() - top - 20}px)`, 600, "ease-in");
      await wait(gapMs() + 600, t);
      return ACTS.hang(t);
    },
    async spider(t) {
      M.classList.add("act-spider", "say-under"); setPose("wave");
      for (;;) {
        const top = navBottom();
        place(rnd(0.1, 0.78) * (vw() - W()), top);
        move(`translateY(${-H() - top - 30}px)`); M.classList.remove("gone");
        await wait(400, t);
        move(`translateY(${rnd(-H() * 0.2, 60)}px)`, 1500, "cubic-bezier(.3,1.25,.5,1)");
        await wait(1100, t); speak(line(["Hello, upside down! 🙃", "Just dropping in 😄", ...v.lines]), 2400);
        await wait(3200, t);
        move(`translateY(${-H() - top - 30}px)`, 1100, "ease-in");
        await wait(gapMs() + 1100, t);
      }
    },
    async rope(t) {
      M.classList.add("act-rope", "say-low"); setPose("up");
      for (;;) {
        const top = navBottom(), x = rnd(0.1, 0.78) * (vw() - W());
        place(x, top); M.classList.toggle("say-r", x < vw() / 2);
        move(`translateY(${-H() - top - 30}px)`); M.classList.remove("gone");
        await wait(400, t);
        move(`translateY(${rnd(20, 110)}px)`, 1100, "cubic-bezier(.3,1.7,.45,1)");
        await wait(900, t); speak(line(["Coming down! 🪢", "Bungee time! 😆", ...v.lines]), 2200);
        await wait(3400, t);
        move(`translateY(${-H() - top - 30}px)`, 900, "ease-in");
        await wait(gapMs() + 900, t);
      }
    },
    async pop(t) {
      M.classList.add("act-pop"); setPose("cross");
      for (;;) {
        const x = rnd(0.06, 0.8) * (vw() - W()), bottom = barTop();
        place(x, bottom - H()); M.classList.toggle("say-r", x < vw() / 2);
        move("translateY(105%)"); M.classList.remove("gone");
        await wait(500, t);
        move("translateY(50%)", 420, "cubic-bezier(.3,1.7,.5,1)"); phase = "out";
        speak(line(["Peekaboo! 😄", "Up here!", "Found me?", ...v.lines]), 2000);
        await wait(2600, t);
        phase = "in"; move("translateY(105%)", 260, "ease-in");
        await wait(gapMs(), t);
      }
    },
    async sit(t) {
      M.classList.add("act-sit", "say-low"); setPose("down"); M.dataset.legs = "sit";
      let seat: HTMLElement | null = null, at = { x: 0, y: 0 };
      const choose = (hop: boolean) => {
        const cards = inView(".chap :is(.card, .tkt-cell, .cw-pin)");
        if (!cards.length) return false;
        const c = pick(cards.filter((x) => x !== seat).length ? cards.filter((x) => x !== seat) : cards), r = c.getBoundingClientRect();
        const x = r.left + scrollX + r.width / 2 - W() / 2 + rnd(-20, 20), y = r.top + scrollY - H() * geo.seat + 6;
        if (M.parentElement !== doc) doc.appendChild(M);
        if (hop) { place(x, y); move(`translate(${at.x - x}px, ${at.y - y}px)`); move("none", 700, "ease-in-out"); M.classList.remove("hop"); void M.offsetWidth; M.classList.add("hop"); }
        else { place(x, y); move("scale(.2)"); move("none", 500); }
        seat = c; at = { x, y };
        M.classList.toggle("say-r", r.left < window.innerWidth / 2);
        return true;
      };
      if (!choose(false)) return peekThen(t, ACTS.sit);
      M.classList.remove("gone");
      speak(line(["Comfy seat 😌", "I'll sit here and wait for you", ...v.lines]), 2400);
      for (let n = 0; ; n++) {
        await wait(1000, t);
        if (html.classList.contains("scrolling")) continue;
        const r = seat!.getBoundingClientRect(), ex = r.left + scrollX + r.width / 2 - W() / 2, ey = r.top + scrollY - H() * geo.seat + 6;
        const off = r.bottom < navBottom() || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth;
        // the card glided away, or the page moved on: hop to another one in view (or start again elsewhere)
        if (off || Math.abs(ex - at.x) > 60 || Math.abs(ey - at.y) > 30 || n % 8 === 7) {
          if (!choose(true)) { move("scale(0)", 300, "ease-in"); await wait(400, t); return peekThen(t, ACTS.sit); }
          speak(off ? "Wait for me! 🏃" : pick(["Next seat! 😄", "This one's better", "Hop!"]), 1500);
        }
      }
    },
    async hide(t) {
      const heads = inView(".chap .stitle");
      if (!heads.length) return peekThen(t, ACTS.hide);
      const h = pick(heads), r = h.getBoundingClientRect();
      const box = document.createElement("div"); box.className = "masc-clip";
      const bh = Math.round(H() * 0.5), x = r.left + scrollX + rnd(0, Math.max(0, Math.min(r.width, 420) - W()));
      Object.assign(box.style, { left: `${x}px`, top: `${r.top + scrollY - bh + 4}px`, width: `${W() + 24}px`, height: `${bh}px` });
      doc.appendChild(box); box.appendChild(M);
      M.classList.add("act-hide"); setPose("cross");
      place(12, 0); move(`translateY(${bh + 4}px)`); M.classList.remove("gone");
      await wait(400, t);
      move(`translateY(${bh - H() * geo.show}px)`, 600, "ease-out"); phase = "out";
      await wait(2600, t);
      move(`translateY(${bh + 4}px)`, 260, "ease-in"); phase = "in";
      await wait(700, t);
      doc.appendChild(M); box.remove();
      M.classList.add("say-low");
      const r2 = h.getBoundingClientRect();
      place(Math.min(r2.right, window.innerWidth - W()) + scrollX - W() * 0.6, r2.top + scrollY - H() + 8);
      M.classList.toggle("say-r", r2.right < window.innerWidth / 2);
      move("scale(.2)"); setPose("wave"); move("none", 520);
      speak(line(["Ta-da! Found me 😄", "Over here! 👋", "Surprise!"]), 2200);
      await wait(2600, t);
      move("scale(0)", 300, "ease-in");
      await wait(gapMs() + 300, t);
      clean(); M.classList.add("gone");
      return ACTS.hide(t);
    },
  };

  function runAct(a: MascotAct) {
    const t = ++tok; clean(); M.classList.add("gone"); act = a;
    ACTS[a](t).catch(() => {});
  }
  const ACT_MS = 14000;
  function startShow() {
    if (v.act !== "mix") return runAct(v.act);
    const list = v.mixActs;
    const go = () => {
      if (!alive) return;
      if (!sleeping && !moving) runAct(list.length > 1 ? pick(list.filter((k) => k !== act)) : list[0]);
      mixT = window.setTimeout(go, ACT_MS + v.gap * 1000);
    };
    go();
  }

  /* moves: a click, Enter or Space plays the next allowed one */
  const moves: Move[] = v.character === "mini" ? v.moves.map((k) => MINI_MOVES[k]) : OTHER_MOVES[v.character];
  function doMove(m: Move) {
    wake(); if (moving) return; moving = true;
    const before = M.dataset.pose!;
    if (m.pose) setPose(m.pose);
    M.classList.add("do-" + m.id); speak(m.line, Math.max(1400, m.ms)); burst(m.burst);
    later(() => { M.classList.remove("do-" + m.id); if (m.pose) setPose(before); moving = false; }, m.ms);
  }
  const onPress = () => {
    if (act === "pop" && phase === "out") { speak("You got me! 🎉", 1500); burst(["🎉", "⭐"], 8); phase = "in"; move("translateY(105%)", 260, "ease-in"); return; }
    if (moves.length) doMove(moves[clickI++ % moves.length]);
    else { wake(); speak(pick(v.lines), 1800); }
  };
  M.addEventListener("click", onPress);
  M.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPress(); } });

  /* eyes follow the mouse; he ducks when it comes close while he's peeking */
  let mx = 0, my = 0, eyeRaf = 0;
  const DUCKS: MascotAct[] = ["peek", "pop", "hide"];
  const eyes = () => {
    eyeRaf = 0;
    if (sleeping || M.classList.contains("gone") || html.classList.contains("scrolling")) return;
    const r = M.getBoundingClientRect();
    if (v.duck && phase === "out" && DUCKS.includes(act) && Math.hypot(mx - (r.left + r.width / 2), my - (r.top + r.height * 0.3)) < 95) {
      phase = "ducked"; speak(pick(["Eep! 🙈", "Too close! 😳", "Can't catch me!"]), 1200);
      move(act === "pop" ? "translateY(105%)" : act === "hide" ? `translateY(${Math.round(H())}px)` : M.classList.contains("flip") ? "translateX(-110%)" : "translateX(110%)", 200, "ease-in");
      return;
    }
    if (!v.eyes) return;
    const ctm = art.getScreenCTM(); if (!ctm) return;
    const p = new DOMPoint(mx, my).matrixTransform(ctm.inverse());
    art.querySelectorAll<SVGGElement>(".m-pup").forEach((g) => {
      const dx = p.x - +g.dataset.cx!, dy = p.y - +g.dataset.cy!, d = Math.hypot(dx, dy) || 1, k = (Math.min(1, d / 50) * 1.8) / d;
      g.setAttribute("transform", `translate(${(dx * k).toFixed(2)} ${(dy * k).toFixed(2)})`);
    });
  };
  const onPointer = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && (e.movementX || e.movementY)) wake();
    mx = e.clientX; my = e.clientY;
    if (!eyeRaf && e.pointerType === "mouse") eyeRaf = requestAnimationFrame(eyes);
  };
  window.addEventListener("pointermove", onPointer, { passive: true });
  const onActive = () => wake();
  window.addEventListener("keydown", onActive);
  window.addEventListener("pointerdown", onActive, { passive: true });

  /* the section guide: says the section's line once scrolling rests there */
  const lines = new Map(v.guide.map((g) => [g.slug, g.line]));
  let current = "", told = "", restT = 0;
  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) current = (e.target as HTMLElement).id;
  }, { rootMargin: "-45% 0px -50% 0px" });
  if (v.guideOn) document.querySelectorAll<HTMLElement>("section[data-spy][id]").forEach((s) => io.observe(s));
  const onScroll = () => {
    wake();
    clearTimeout(restT);
    restT = window.setTimeout(() => {
      if (!v.guideOn || !current || current === told) return;
      told = current;
      const line = lines.get(current);
      if (line) tell(line, 2800);
    }, 450);
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  /* he cheers when someone reacts */
  const onClick = (e: MouseEvent) => {
    if (!v.cheer || !(e.target instanceof Element)) return;
    const b = e.target.closest(".reacts button:not(.reacts-as)");
    if (b && !M.contains(b)) doMove({ id: "cheer", pose: "up", ms: 1500, line: "Yay, thank you! 💖", burst: ["❤️", "💖", "✨", "💕"] });
  };
  document.addEventListener("click", onClick);

  /* a theme outfit for the theme on screen */
  const dress = () => { M.dataset.cos = v.costumes ? THEME_COSTUME[html.dataset.skin || ""] || "" : ""; };
  dress();
  const mo = new MutationObserver(dress);
  mo.observe(html, { attributes: true, attributeFilter: ["data-skin"] });

  /* he dozes off when nobody's around */
  const napT = window.setInterval(() => {
    if (!v.sleepAfter || sleeping || moving || document.hidden) return;
    if (Date.now() - last > v.sleepAfter * 1000) { sleeping = true; M.classList.add("is-sleep"); say.classList.remove("on"); M.classList.remove("is-talk"); }
  }, 1000);

  let lastW = window.innerWidth;
  const onResize = () => { if (window.innerWidth === lastW) return; lastW = window.innerWidth; sizeUp(); if (v.act === "mix") return; runAct(act); };
  window.addEventListener("resize", onResize);

  /* the opening: hello once per visit, then the show */
  startShow();
  let hi = false;
  try { hi = sessionStorage.getItem(HELLO_KEY) === "1"; sessionStorage.setItem(HELLO_KEY, "1"); } catch {}
  if (!hi && v.hello) later(() => tell(v.hello, 3200), 1300);

  return () => {
    alive = false; tok++;
    clearTimeout(mixT); clearTimeout(sayT); clearTimeout(restT); clearInterval(napT); clearTimeout(fitT); cancelAnimationFrame(eyeRaf);
    timers.forEach((t) => clearTimeout(t));
    io.disconnect(); mo.disconnect();
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("keydown", onActive);
    window.removeEventListener("pointerdown", onActive);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("click", onClick);
    fix.remove(); doc.remove();
  };
}
