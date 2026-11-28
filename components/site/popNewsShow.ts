/**
 * The news pop-up's looks and motion (lib/popnews.ts; PopNews.tsx decides when). Downloaded only when a pop-up is about to show, with GSAP.
 * Four looks, each building its card and playing its own arrival: Breaking news (a red bar slams in, a LIVE dot pulses, the headline types
 * itself, a ticker runs), Story card (a phone story with progress bars that move on by themselves), Gift box (a box drops in, its lid pops
 * with confetti and the card rises out) and Newspaper (a paper spins in like an old movie and EXTRA! stamps on). Several stories go by
 * with ‹ › (or tapping a story card's sides, or the arrow keys); ✕, Esc, a tap outside and "Don't show again today" close it.
 * Everything that moves is transform or opacity; with reduced motion it simply appears. Classes start with `pnw-`.
 * A picture is never cut, on any screen: it's shown whole (`contain`) over a soft, blurred copy of itself that fills the rest, and its box
 * takes the picture's own shape (`--ar`, measured before the pop-up opens) within limits that keep the card on the screen. A news site's
 * picture is asked for without saying where from (`no-referrer`, as some sites refuse pictures shown elsewhere), and one that doesn't load
 * gives way to the story's emoji on its colour.
 */
import type { PopItem } from "@/lib/popnews";

export type ShowOpts = {
  look: string; where: "middle" | "corner"; paperName: string; studio?: boolean;
  onView(id: string): void; onClick(id: string): void; onHush(): void; onClose(): void;
};
type Look = { build(it: PopItem, i: number, n: number, all: PopItem[]): string; enter(el: HTMLElement, it: PopItem, i: number, again: boolean): { progress(p: number): unknown } };

const LOOKS = ["breaking", "story", "gift", "paper"];
const esc = (t: string) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
const $ = (el: ParentNode, s: string) => el.querySelector(s) as HTMLElement;

/** each picture's shape (width ÷ height) once known, and the pictures that didn't load */
const shape = new Map<string, number>(), broken = new Set<string>();
const fitShape = (w: number, h: number) => (w > 0 && h > 0 ? Math.min(2.4, Math.max(0.56, w / h)) : 0);
/** loads a picture to learn its shape, giving up after `ms` (it then keeps loading, and the card adjusts when it arrives) */
function learn(url: string, ms: number) {
  return new Promise<void>((done) => {
    if (shape.has(url) || broken.has(url)) return done();
    const im = new Image(); im.referrerPolicy = "no-referrer"; im.decoding = "async";
    const t = window.setTimeout(done, ms);
    im.onload = () => { shape.set(url, fitShape(im.naturalWidth, im.naturalHeight)); clearTimeout(t); done(); };
    im.onerror = () => { broken.add(url); clearTimeout(t); done(); };
    im.src = url;
  });
}
const emo = (it: PopItem) => `<span class="pnw-emo">${esc(it.emoji)}</span>`;
function media(it: PopItem) {
  const m = it.media;
  if (!m || broken.has(m.url)) return emo(it);
  const bk = (u: string) => `<img class="pnw-bk" src="${esc(u)}" alt="" aria-hidden="true" referrerpolicy="no-referrer" decoding="async">`;
  if (m.type === "video") return `${m.thumb ? bk(m.thumb) : ""}<video class="pnw-m" src="${esc(m.url)}"${m.thumb ? ` poster="${esc(m.thumb)}"` : ""} muted autoplay loop playsinline preload="metadata"></video>`;
  return `${bk(m.url)}<img class="pnw-m" src="${esc(m.url)}" alt="" referrerpolicy="no-referrer" decoding="async">`;
}
function art(it: PopItem) {
  const m = it.media && !broken.has(it.media.url) ? it.media : null, ar = m ? shape.get(m.url) : 0;
  return `<div class="pnw-art${m ? " has-m" : ""}" style="background:${esc(it.art)}${ar ? `;--ar:${ar.toFixed(3)}` : ""}">${media(it)}</div>`;
}
/** "12 min ago", "3 hours ago": how fresh an automatic headline is */
function ago(t?: number) {
  if (!t) return "";
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  return m < 2 ? "just now" : m < 60 ? `${m} min ago` : m < 120 ? "1 hour ago" : m < 1440 ? `${Math.floor(m / 60)} hours ago` : m < 2880 ? "yesterday" : `${Math.floor(m / 1440)} days ago`;
}
const src = (it: PopItem) => `<span class="pnw-src">${esc(it.source)}${it.when ? `<small> · ${ago(it.when)}</small>` : ""}</span>`;
function go(it: PopItem) {
  if (!it.link) return "";
  const out = /^https?:\/\//i.test(it.link) && !it.link.startsWith(location.origin);
  return `<a class="pnw-go" href="${esc(it.link)}"${out ? ' target="_blank" rel="noopener noreferrer"' : ""}>${esc(it.button || "Read more")} ↗</a>`;
}
const nav = (n: number, i: number) => (n < 2 ? "" : `<div class="pnw-nav"><button type="button" class="pnw-pv" aria-label="Previous story">‹</button><span class="pnw-dots">${Array.from({ length: n }, (_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("")}</span><button type="button" class="pnw-nx" aria-label="Next story">›</button></div>`);
const x = `<button type="button" class="pnw-x" aria-label="Close">✕</button>`;

export async function showPop(layer: HTMLElement, items: PopItem[], o: ShowOpts): Promise<() => void> {
  const g = (await import("gsap")).gsap;
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches, lite = document.documentElement.classList.contains("lite");
  const look = o.look === "random" || !LOOKS.includes(o.look) ? LOOKS[Math.floor(Math.random() * LOOKS.length)] : o.look;
  layer.innerHTML = `<div class="pnw-dim"></div><div class="pnw-hold"></div><div class="pnw-after"><button type="button" class="pnw-hush">Don't show again today</button></div>`;
  layer.className = `pnw-layer on ${o.where}`;
  const dim = $(layer, ".pnw-dim"), hold = $(layer, ".pnw-hold"), hush = $(layer, ".pnw-hush");
  let cur: HTMLElement | null = null, idx = 0, closed = false;
  const seen = new Set<string>();

  /** a typed headline: one text node grows letter by letter, a caret blinks after it */
  function typeInto(el: HTMLElement, text: string) {
    if (calm) { el.textContent = text; return; }
    el.innerHTML = '<span></span><i class="pnw-caret"></i>';
    const sp = el.firstChild as HTMLElement, chars = Array.from(text), t = { n: 0 };
    g.to(t, { n: chars.length, duration: Math.min(2.2, chars.length / 38), ease: "none", onUpdate: () => { sp.textContent = chars.slice(0, Math.round(t.n)).join(""); }, onComplete: () => { window.setTimeout(() => el.querySelector(".pnw-caret")?.remove(), 900); } });
  }
  function confetti(px: number, py: number, n = 30) {
    if (calm || lite) return;
    const cols = ["#ffcf4a", "#ff5f8f", "#7ee8a2", "#60a5fa", "#ffffff", "#f97316"];
    for (let i = 0; i < n; i++) {
      if (layer.querySelectorAll(".pnw-conf").length > 60) return;
      const c = document.createElement("i"); c.className = "pnw-conf"; c.style.background = cols[i % cols.length]; c.style.left = px + "px"; c.style.top = py + "px"; layer.appendChild(c);
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = 110 + Math.random() * 170;
      g.timeline({ onComplete: () => c.remove() })
        .to(c, { x: Math.cos(a) * v, y: Math.sin(a) * v, rotation: Math.random() * 540, duration: 0.6, ease: "power2.out" })
        .to(c, { y: `+=${150 + Math.random() * 100}`, x: `+=${(Math.random() - 0.5) * 70}`, rotation: "+=300", opacity: 0, duration: 0.9, ease: "power1.in" });
    }
  }

  const L: Record<string, Look> = {
    breaking: {
      build: (it, i, n, all) => `<div class="pnw-pp pnw-breaking" role="dialog" aria-modal="${o.where === "middle"}" aria-label="${esc(it.title)}">${x}${art(it)}
        <div class="pnw-bar"><span class="pnw-word">BREAKING</span><span class="pnw-live"><i></i>LIVE</span></div>
        <div class="pnw-body">${it.tag ? `<span class="pnw-tag">${esc(it.tag)}</span>` : ""}<h3 class="pnw-h"></h3>${it.text ? `<p class="pnw-p">${esc(it.text)}</p>` : ""}
        <div class="pnw-foot">${src(it)}${go(it)}</div>${nav(n, i)}</div>
        <div class="pnw-ticker"><span>${all.map((a) => "● " + esc(a.title)).join("    ")}</span></div></div>`,
      enter(el, it) {
        const tl = g.timeline();
        tl.fromTo(el, { y: 40, scale: 0.85, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" })
          .fromTo($(el, ".pnw-bar"), { xPercent: -110, skewX: -20 }, { xPercent: 0, skewX: 0, duration: 0.45, ease: "back.out(2.2)" }, "-=0.2")
          .fromTo($(el, ".pnw-word"), { letterSpacing: "0.6em", opacity: 0 }, { letterSpacing: "0.12em", opacity: 1, duration: 0.4 }, "<0.1")
          .call(() => typeInto($(el, ".pnw-h"), it.title))
          .fromTo(el.querySelectorAll(".pnw-tag, .pnw-p, .pnw-foot"), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.08 }, "<0.15");
        g.to($(el, ".pnw-live i"), { scale: 1.6, opacity: 0.3, duration: 0.6, yoyo: true, repeat: -1, ease: "sine.inOut" });
        return tl;
      },
    },
    story: {
      build: (it, i, n) => `<div class="pnw-pp pnw-story" role="dialog" aria-modal="${o.where === "middle"}" aria-label="${esc(it.title)}">${art(it)}
        <div class="pnw-bars">${Array.from({ length: n }, (_, k) => `<b><i style="transform:scaleX(${k < i ? 1 : 0})"></i></b>`).join("")}</div>
        <div class="pnw-head"><span class="pnw-av">LC</span><span>${esc(it.source || "Trending now")}<small>${it.when ? ago(it.when) : "now"}</small></span></div>${x}<span class="pnw-fire">🔥 Hot</span>
        <button type="button" class="pnw-tap l pnw-pv" aria-label="Previous story"></button><button type="button" class="pnw-tap r pnw-nx" aria-label="Next story"></button>
        <div class="pnw-sb">${it.tag ? `<span class="pnw-tag">${esc(it.tag)}</span>` : ""}<h3 class="pnw-h">${esc(it.title)}</h3>${it.text ? `<p class="pnw-p">${esc(it.text)}</p>` : ""}${go(it)}</div></div>`,
      enter(el, it, i, again) {
        const tl = g.timeline();
        if (!again) tl.fromTo(el, { y: 60, scale: 0.85, rotation: -5, opacity: 0 }, { y: 0, scale: 1, rotation: 0, opacity: 1, duration: 0.6, ease: "back.out(1.6)" });
        else tl.fromTo($(el, ".pnw-art"), { scale: 1.15, opacity: 0.4 }, { scale: 1, opacity: 1, duration: 0.5 });
        tl.fromTo(el.querySelectorAll(".pnw-sb > *"), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.07 }, "-=0.3");
        g.to($(el, ".pnw-fire"), { scale: 1.12, rotation: 4, duration: 0.45, yoyo: true, repeat: -1, ease: "sine.inOut" });
        // this story's bar fills, then the next story comes by itself (the last one stays)
        const bar = el.querySelectorAll<HTMLElement>(".pnw-bars b i")[i];
        if (bar && !calm && items.length > 1) g.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 6.5, ease: "none", onComplete: () => { if (idx < items.length - 1) step(1); } });
        return tl;
      },
    },
    gift: {
      build: (it, i, n) => `<div class="pnw-giftw"><div class="pnw-pp pnw-gift" role="dialog" aria-modal="${o.where === "middle"}" aria-label="${esc(it.title)}">${x}${art(it)}
        <div class="pnw-body">${it.tag ? `<span class="pnw-tag">${esc(it.tag)}</span>` : ""}<h3 class="pnw-h">${esc(it.title)}</h3>${it.text ? `<p class="pnw-p">${esc(it.text)}</p>` : ""}
        <div class="pnw-foot">${src(it)}${go(it)}</div>${nav(n, i)}</div></div></div>`,
      enter(el, _it, _i, again) {
        const card = $(el, ".pnw-pp"), tl = g.timeline();
        if (again) { tl.fromTo(card, { rotationY: 90 }, { rotationY: 0, duration: 0.45, ease: "back.out(1.6)" }); return tl; }
        const box = document.createElement("div"); box.className = "pnw-box"; box.innerHTML = '<i class="pnw-box-b"></i><i class="pnw-box-l"></i>'; hold.appendChild(box);
        const lid = $(box, ".pnw-box-l"), H = innerHeight;
        g.set(card, { opacity: 0 });
        tl.fromTo(box, { y: -H }, { y: 0, duration: 0.7, ease: "bounce.out" })
          .to(box, { rotation: -8, duration: 0.08, yoyo: true, repeat: 5, ease: "sine.inOut", transformOrigin: "50% 100%" })
          .to(box, { scaleY: 0.85, scaleX: 1.1, duration: 0.12, transformOrigin: "50% 100%" })
          .to(box, { scaleY: 1, scaleX: 1, duration: 0.3, ease: "elastic.out(1, .4)" })
          .to(lid, { y: -H * 0.35, x: 40, rotation: 70, opacity: 0, duration: 0.7, ease: "power2.out" }, "<")
          .call(() => { const r = box.getBoundingClientRect(), Lr = layer.getBoundingClientRect(); confetti(r.left - Lr.left + r.width / 2, r.top - Lr.top + r.height * 0.3); }, undefined, "<")
          .fromTo(card, { y: H * 0.25, scale: 0.25, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.7, ease: "back.out(1.5)" }, "<0.1")
          .to(box, { y: 40, opacity: 0, duration: 0.4, onComplete: () => box.remove() }, "<0.3");
        return tl;
      },
    },
    paper: {
      build: (it, i, n) => {
        const d = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        return `<div class="pnw-pp pnw-paper" role="dialog" aria-modal="${o.where === "middle"}" aria-label="${esc(it.title)}">${x}
          <div class="pnw-mast"><b>${esc(o.paperName)}</b><small>${esc(d)}<br>LATE EDITION</small></div>
          <div class="pnw-line"><span>${esc(it.tag || "News")}</span><span>No. ${i + 1}</span></div>
          <h3 class="pnw-h">${esc(it.title)}</h3>
          <div class="pnw-grid">${art(it)}<div>${it.text ? `<p class="pnw-p">${esc(it.text)}</p>` : ""}${n > 1 ? `<div class="pnw-more">More on the next page…</div>` : ""}</div></div>
          <div class="pnw-foot">${src(it)}${go(it)}</div>${nav(n, i)}<div class="pnw-extra">EXTRA!</div></div>`;
      },
      enter(el, _it, _i, again) {
        const tl = g.timeline();
        if (again) tl.fromTo(el, { rotationY: -90, transformOrigin: "0% 50%" }, { rotationY: 0, duration: 0.55, ease: "power2.out" });
        else tl.fromTo(el, { scale: 0.04, rotation: -1080, opacity: 0 }, { scale: 1, rotation: -2, opacity: 1, duration: 1.1, ease: "power3.out" }).to(el, { rotation: 0, duration: 0.3 });
        tl.fromTo($(el, ".pnw-extra"), { scale: 3, opacity: 0, rotation: -30 }, { scale: 1, opacity: 1, rotation: -12, duration: 0.35, ease: "back.out(3)" })
          .to(el, { x: 4, duration: 0.05, yoyo: true, repeat: 5 }, "<0.2");
        return tl;
      },
    },
  };

  function draw(i: number, again: boolean) {
    idx = (i + items.length) % items.length;
    const it = items[idx], lk = L[look];
    hold.innerHTML = lk.build(it, idx, items.length, items);
    cur = hold.firstElementChild as HTMLElement;
    wirePics(cur, it);
    const tl = lk.enter(cur, it, idx, again);
    if (calm) tl.progress(1);
    if (!seen.has(it.id + idx)) { seen.add(it.id + idx); o.onView(it.id); }
    cur.querySelectorAll(".pnw-x").forEach((b) => b.addEventListener("click", close));
    cur.querySelectorAll(".pnw-pv").forEach((b) => b.addEventListener("click", () => step(-1)));
    cur.querySelectorAll(".pnw-nx").forEach((b) => b.addEventListener("click", () => step(1)));
    cur.querySelectorAll(".pnw-go").forEach((b) => b.addEventListener("click", () => o.onClick(it.id)));
    if (!again) window.setTimeout(() => (cur?.querySelector(".pnw-x") as HTMLElement | null)?.focus({ preventScroll: true }), 400);
  }
  /** a picture takes its own shape when it arrives (if it wasn't known yet); one that fails gives way to the emoji; the story card keeps its
   *  picture above its writing (`--sbh`, the writing's height) */
  function wirePics(el: HTMLElement, it: PopItem) {
    const box = el.querySelector<HTMLElement>(".pnw-art.has-m"), m = box?.querySelector<HTMLImageElement | HTMLVideoElement>(".pnw-m");
    const sb = el.querySelector<HTMLElement>(".pnw-sb");
    const fitSb = () => { if (sb && box) box.style.setProperty("--sbh", `${sb.offsetHeight}px`); };
    fitSb();
    if (!box || !m || !it.media) return;
    const url = it.media.url;
    const ok = (w: number, h: number) => { const ar = fitShape(w, h); if (!ar) return; shape.set(url, ar); box.style.setProperty("--ar", ar.toFixed(3)); if (w < 360) m.classList.add("tiny"); fitSb(); };
    const bad = () => { broken.add(url); box.classList.remove("has-m"); box.innerHTML = emo(it); };
    if (m instanceof HTMLImageElement) {
      if (m.complete && m.naturalWidth) ok(m.naturalWidth, m.naturalHeight);
      else { m.addEventListener("load", () => ok(m.naturalWidth, m.naturalHeight), { once: true }); m.addEventListener("error", bad, { once: true }); }
      box.querySelector<HTMLImageElement>(".pnw-bk")?.addEventListener("error", (e) => (e.target as HTMLElement).remove(), { once: true });
    } else {
      if (m.readyState >= 1) ok(m.videoWidth, m.videoHeight);
      else { m.addEventListener("loadedmetadata", () => ok(m.videoWidth, m.videoHeight), { once: true }); m.addEventListener("error", bad, { once: true }); }
    }
  }
  function step(d: number) {
    if (!cur || items.length < 2 || closed) return;
    g.killTweensOf(cur.querySelectorAll("*"));
    if (look === "gift" || look === "paper" || calm) { draw(idx + d, true); return; }
    g.to(cur, { x: d > 0 ? -30 : 30, opacity: 0, duration: 0.18, onComplete: () => draw(idx + d, true) });
  }
  function close() {
    if (closed) return; closed = true;
    removeEventListener("keydown", key);
    const el = cur; cur = null;
    if (el) g.killTweensOf(el.querySelectorAll("*"));
    g.to([dim, $(layer, ".pnw-after")], { opacity: 0, duration: 0.3 });
    const done = () => { layer.innerHTML = ""; layer.className = "pnw-layer"; o.onClose(); };
    if (el) g.to(el, { y: 30, scale: 0.85, opacity: 0, duration: calm ? 0.01 : 0.3, ease: "power2.in", onComplete: done }); else done();
  }
  function key(e: KeyboardEvent) {
    if (document.querySelector("dialog[open]")) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowLeft") step(-1);
  }
  addEventListener("keydown", key);
  dim.addEventListener("click", close);
  hush.addEventListener("click", () => { o.onHush(); close(); });

  if (o.where === "middle") g.fromTo(dim, { opacity: 0 }, { opacity: 1, duration: calm ? 0.01 : 0.4 });
  g.fromTo($(layer, ".pnw-after"), { opacity: 0 }, { opacity: 1, duration: 0.3, delay: calm ? 0 : 0.9 });
  // the first picture's shape is learnt before the card arrives (at most 1.5 s), so it doesn't change size on screen; the rest load meanwhile
  items.slice(1).forEach((it) => { if (it.media?.type === "image") void learn(it.media.url, 0); });
  if (items[0]?.media?.type === "image") await learn(items[0].media.url, 1500);
  if (closed) return close;
  draw(0, false);
  return close;
}
