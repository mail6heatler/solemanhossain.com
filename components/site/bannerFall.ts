// What falls from the hanging banner when it's pulled: water on Ocean, sheets of paper on Paper, code on Techy…
// A canvas that exists only while something is falling, then removes itself. No libraries.
import { toHex } from "./fx";
import { sprite } from "./themeArt";
import { fallSpec, type FallSpec } from "./themeScenes2";
import type { Palette } from "./themeScenes";

export type Hem = { x: number; y: number; w: number };
type P = {
  x: number; y: number; vx: number; vy: number; r: number; rot: number; vr: number; ph: number; col: string; k: number;
  born: number; life: number; bounced?: boolean; ch?: string; ring?: boolean; spray?: boolean; sp?: string;
};
type Spec = { rate: number; g: number; terminal: number; speed: [number, number]; life: number };

const SPECS: Record<string, Spec> = {
  ocean: { rate: 95, g: 760, terminal: 620, speed: [30, 150], life: 3 },
  paper: { rate: 16, g: 260, terminal: 120, speed: [20, 70], life: 9 },
  techy: { rate: 55, g: 500, terminal: 520, speed: [60, 240], life: 3 },
  retro: { rate: 44, g: 620, terminal: 460, speed: [20, 160], life: 3 },
  sunset: { rate: 46, g: 240, terminal: 170, speed: [10, 90], life: 4 },
  forest: { rate: 20, g: 220, terminal: 105, speed: [15, 60], life: 9 },
  candy: { rate: 30, g: 800, terminal: 620, speed: [30, 170], life: 4 },
  playful: { rate: 32, g: 800, terminal: 620, speed: [30, 170], life: 4 },
  night: { rate: 26, g: 170, terminal: 130, speed: [10, 70], life: 6 },
  day: { rate: 22, g: 180, terminal: 85, speed: [10, 50], life: 9 },
};
const GLYPHS = "01{}<>/#$%&*=+アカサタナ";
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(l: T[]) => l[Math.floor(Math.random() * l.length)];
const TAU = Math.PI * 2;
const limit = () => (innerWidth < 761 ? 130 : 240);

let canvas: HTMLCanvasElement | null = null, ctx: CanvasRenderingContext2D | null = null, raf = 0, last = 0;
let parts: P[] = [], skin = "night", spec = SPECS.night, cols: string[] = ["#fff"], ink = "#111", pourUntil = 0, debt = 0, getHem: (() => Hem) | null = null, fan: FallSpec | null = null, fanCols: string[] = [];

function palette() {
  skin = document.documentElement.dataset.skin || "night";
  spec = SPECS[skin] ?? SPECS.night;
  const cs = getComputedStyle(document.querySelector(".site") ?? document.documentElement);
  const get = (k: string, f: string) => toHex(cs.getPropertyValue(k).trim(), f);
  cols = [get("--mint", "#7ee8a2"), get("--pop2", "#f2a5c0"), get("--pop3", "#9fd8e6")];
  ink = get("--fg", "#111111");
  fan = fallSpec(skin);
  if (fan) {
    const pal: Palette = { a: cols[0], b: cols[2], c: cols[1], deep: get("--mint-deep", cols[0]), fg: ink };
    fanCols = fan.cols ? fan.cols(pal) : cols;
    spec = { rate: fan.rate, g: fan.g, terminal: fan.terminal, speed: fan.speed, life: 9 };
  }
}

function spawn(h: Hem) {
  if (parts.length >= limit()) return;
  const x = h.x + Math.random() * h.w, sp = rnd(spec.speed[0], spec.speed[1]);
  const p: P = { x, y: h.y + rnd(0, 6), vx: rnd(-24, 24), vy: sp, r: rnd(3, 7), rot: rnd(0, TAU), vr: rnd(-2.4, 2.4), ph: rnd(0, TAU), col: pick(cols), k: Math.floor(rnd(0, 4)), born: 0, life: spec.life };
  if (fan) { p.sp = pick(fan.kinds); p.r = rnd(fan.size[0], fan.size[1]); p.col = pick(fanCols); p.vr = rnd(-fan.spin, fan.spin); p.vx = rnd(-46, 46); }
  else if (skin === "paper") { p.r = rnd(13, 26); p.vr = rnd(-1, 1); p.vx = rnd(-40, 40); }
  else if (skin === "ocean") { p.r = rnd(3.2, 7.5); p.vx = rnd(-10, 10); p.col = Math.random() < 0.6 ? "#d8fbff" : cols[0]; }
  else if (skin === "techy") { p.ch = pick(Array.from(GLYPHS)); p.vx = 0; p.col = Math.random() < 0.18 ? "#eafff3" : cols[0]; }
  else if (skin === "retro") { p.r = pick([4, 6, 8]); p.vx = rnd(-14, 14); }
  else if (skin === "sunset") { p.r = rnd(1.4, 3.6); p.col = pick(["#ffc15e", "#ff8a5b", "#ffe2a8", "#d64580"]); }
  else if (skin === "forest") { p.r = rnd(6, 12); p.col = pick([cols[0], "#3f6e22", "#c9a227", "#7d9c3a"]); }
  else if (skin === "night") { p.r = rnd(2.5, 6); p.col = Math.random() < 0.5 ? "#ffffff" : cols[0]; }
  else if (skin === "day") { p.r = rnd(4, 8); p.col = pick(["#ffd98a", "#ffb7c5", "#fff0c9", cols[0]]); }
  parts.push(p);
}

function star(c: CanvasRenderingContext2D, r: number) {
  c.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, q = i % 2 ? r * 0.4 : r; c[i ? "lineTo" : "moveTo"](Math.cos(a) * q, Math.sin(a) * q); }
  c.closePath(); c.fill();
}

function drawOne(c: CanvasRenderingContext2D, p: P, age: number) {
  c.save();
  c.translate(p.x, p.y);
  c.globalAlpha = Math.min(1, (p.life - age) * 1.6);
  c.fillStyle = c.strokeStyle = p.col;
  if (p.sp) { c.rotate(p.rot); sprite(c, p.sp, p.r, p.col); c.restore(); return; }
  if (p.ring) { // a splash on the water
    const q = age / p.life;
    c.globalAlpha = (1 - q) * 0.75; c.lineWidth = 1.6;
    c.beginPath(); c.ellipse(0, 0, 4 + q * 34, 1.5 + q * 9, 0, 0, TAU); c.stroke();
  } else if (skin === "ocean") { // a teardrop that stretches as it speeds up
    const len = p.r * (1.3 + Math.min(2.4, p.vy / 340));
    c.beginPath(); c.moveTo(0, -len); c.quadraticCurveTo(p.r, 0, 0, p.r); c.quadraticCurveTo(-p.r, 0, 0, -len); c.fill();
    c.globalAlpha *= 0.85; c.fillStyle = "#ffffff"; c.beginPath(); c.arc(-p.r * 0.28, p.r * 0.1, p.r * 0.22, 0, TAU); c.fill();
  } else if (skin === "paper") { // a sheet that flips over as it flutters
    c.rotate(p.rot); c.scale(1, Math.max(0.16, Math.abs(Math.cos(p.ph + age * 2.4))));
    const w = p.r, h = p.r * 1.3;
    c.fillStyle = "#fffdf6"; c.strokeStyle = "rgba(20,20,20,.55)"; c.lineWidth = 1;
    c.fillRect(-w / 2, -h / 2, w, h); c.strokeRect(-w / 2, -h / 2, w, h);
    c.strokeStyle = "rgba(20,20,20,.32)"; c.beginPath();
    for (let i = 1; i < 5; i++) { const y = -h / 2 + (i * h) / 5; c.moveTo(-w * 0.34, y); c.lineTo(i === 4 ? 0 : w * 0.34, y); }
    c.stroke();
  } else if (skin === "techy") {
    c.font = "14px ui-monospace, Consolas, monospace"; c.textAlign = "center"; c.fillText(p.ch ?? "0", 0, 0);
    c.globalAlpha *= 0.35; c.fillText(p.ch ?? "0", 0, -15);
  } else if (skin === "retro") { // chunky pixels that move on a grid
    c.setTransform(1, 0, 0, 1, Math.round(p.x / 4) * 4 * scale, Math.round(p.y / 4) * 4 * scale);
    c.scale(scale, scale); c.fillRect(0, 0, p.r, p.r);
    c.globalAlpha *= 0.25; c.fillRect(-2, -2, p.r + 4, p.r + 4);
  } else if (skin === "sunset") {
    c.globalAlpha *= 0.35; c.beginPath(); c.arc(0, 0, p.r * 2.6, 0, TAU); c.fill();
    c.globalAlpha = Math.min(1, (p.life - age) * 1.6); c.beginPath(); c.arc(0, 0, p.r, 0, TAU); c.fill();
  } else if (skin === "forest") {
    c.rotate(p.rot); c.beginPath(); c.moveTo(0, -p.r); c.quadraticCurveTo(p.r * 0.8, 0, 0, p.r); c.quadraticCurveTo(-p.r * 0.8, 0, 0, -p.r); c.fill();
    c.strokeStyle = "rgba(0,0,0,.25)"; c.lineWidth = 0.8; c.beginPath(); c.moveTo(0, -p.r); c.lineTo(0, p.r); c.stroke();
  } else if (skin === "candy") {
    c.rotate(p.rot);
    if (p.k === 0) { // a wrapped sweet
      c.beginPath(); c.arc(0, 0, p.r, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(-p.r, 0); c.lineTo(-p.r * 2, -p.r * 0.8); c.lineTo(-p.r * 2, p.r * 0.8); c.closePath(); c.moveTo(p.r, 0); c.lineTo(p.r * 2, -p.r * 0.8); c.lineTo(p.r * 2, p.r * 0.8); c.closePath(); c.fill();
      c.fillStyle = "rgba(255,255,255,.75)"; c.beginPath(); c.arc(-p.r * 0.3, -p.r * 0.3, p.r * 0.28, 0, TAU); c.fill();
    } else { c.beginPath(); c.roundRect(-p.r * 1.1, -2, p.r * 2.2, 4, 2); c.fill(); }
  } else if (skin === "playful") {
    c.rotate(p.rot); c.beginPath();
    if (p.k === 0) c.arc(0, 0, p.r, 0, TAU);
    else if (p.k === 1) { c.moveTo(0, -p.r); c.lineTo(p.r, p.r); c.lineTo(-p.r, p.r); c.closePath(); }
    else c.rect(-p.r * 0.8, -p.r * 0.8, p.r * 1.6, p.r * 1.6);
    c.fill();
  } else if (skin === "night") {
    c.rotate(p.rot); c.globalAlpha *= 0.55 + 0.45 * Math.abs(Math.sin(age * 5 + p.ph)); star(c, p.r);
  } else { // day: soft petals
    c.rotate(p.rot); c.scale(1, Math.max(0.3, Math.abs(Math.cos(p.ph + age * 1.8))));
    c.beginPath(); c.ellipse(0, 0, p.r, p.r * 0.6, 0, 0, TAU); c.fill();
  }
  c.restore();
}

let scale = 1;
function size() {
  if (!canvas) return;
  scale = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(innerWidth * scale);
  canvas.height = Math.round(innerHeight * scale);
}

function frame(now: number) {
  raf = 0;
  if (!canvas || !ctx) return;
  const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
  last = now;
  if (now < pourUntil && getHem) {
    debt += spec.rate * dt * (innerWidth < 761 ? 0.6 : 1);
    const hem = getHem();
    while (debt >= 1) { spawn(hem); debt -= 1; }
  }
  const c = ctx, H = innerHeight;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.setTransform(scale, 0, 0, scale, 0, 0);
  const extra: P[] = [];
  parts = parts.filter((p) => {
    p.born += dt;
    if (p.born >= p.life) return false;
    if (p.ring) { drawOne(c, p, p.born); return true; }
    p.vy = Math.min(spec.terminal, p.vy + spec.g * dt);
    const flutter = fan ? fan.flutter : skin === "paper" || skin === "forest" || skin === "day";
    p.x += (p.vx + (flutter ? Math.sin(p.ph + p.born * 1.9) * 62 : 0)) * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    if (skin === "ocean" && !p.spray && p.y > H - p.ph * 6) { // water splashes where it lands; the spray itself doesn't splash again
      extra.push({ ...p, y: H - p.ph * 6, vx: 0, vy: 0, ring: true, born: 0, life: 0.55, col: "#d8fbff" });
      for (let i = 0; i < 2; i++) extra.push({ ...p, y: H - p.ph * 6 - 2, r: rnd(1, 2), vx: rnd(-90, 90), vy: rnd(-260, -120), born: 0, life: 0.7, spray: true });
      return false;
    }
    if ((fan ? fan.bounce : skin === "candy" || skin === "playful") && !p.bounced && p.y > H - 10) { p.bounced = true; p.y = H - 10; p.vy = -p.vy * 0.42; p.vx *= 1.6; }
    if (p.y > H + 50) return false;
    drawOne(c, p, p.born);
    return true;
  });
  if (extra.length) parts.push(...extra.slice(0, Math.max(0, limit() + 60 - parts.length)));
  if (parts.length || now < pourUntil) raf = requestAnimationFrame(frame);
  else stop();
}

function stop() {
  cancelAnimationFrame(raf); raf = 0; last = 0;
  window.removeEventListener("resize", size);
  canvas?.remove();
  canvas = null; ctx = null; getHem = null;
}

function ensure() {
  if (canvas) return;
  canvas = document.createElement("canvas");
  canvas.className = "hb-fall";
  canvas.setAttribute("aria-hidden", "true");
  ctx = canvas.getContext("2d");
  (document.querySelector(".site") ?? document.body).append(canvas);
  size();
  window.addEventListener("resize", size);
  palette();
}

/** Pours for a moment from under the banner, following it as it moves. */
export function pour(hem: () => Hem, seconds = 1.5) {
  ensure();
  palette();
  getHem = hem;
  pourUntil = performance.now() + seconds * 1000;
  if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
}

/** A few pieces at once, while someone is pulling. */
export function sprinkle(hem: Hem, n = 1) {
  ensure();
  for (let i = 0; i < n; i++) spawn(hem);
  if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
}
