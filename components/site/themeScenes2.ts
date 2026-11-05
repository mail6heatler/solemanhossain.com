// The living backgrounds, click bursts and banner drops of the 20 fan themes. Data-driven: each theme lists what floats,
// what bursts and what falls, plus an optional hand-drawn "piece" (a searchlight, a black hole, waves…).
import { sprite } from "./themeArt";
import type { Frame, Palette, Scene } from "./themeScenes";

type C = CanvasRenderingContext2D;
type Mode = "fall" | "rise" | "drift" | "float";
type Layer = { kinds: string[]; n: number; size: [number, number]; speed: [number, number]; mode: Mode; alpha: number; spin?: number; sway?: number; cols?: (p: Palette) => string[]; alt?: string };
export type FallSpec = { kinds: string[]; rate: number; g: number; terminal: number; speed: [number, number]; size: [number, number]; flutter: boolean; bounce?: boolean; spin: number; cols?: (p: Palette) => string[]; alt?: string };
type Config = { layers: Layer[]; piece?: (c: C, f: Frame, p: Palette, s: Record<string, number>) => void; burst: { kinds: string[]; n: number; size?: number; speed?: number; cols?: (p: Palette) => string[] }; fall: FallSpec };

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(l: T[]) => l[Math.floor(Math.random() * l.length)];
const TAU = Math.PI * 2;
const RANGERS = ["#ff2a3c", "#1e7bff", "#ffd91e", "#ff5ec4", "#18c24a"];

// ---------- hand-drawn pieces ----------
const searchlight = (c: C, f: Frame, p: Palette) => { // a beam sweeps the night sky and puts a bat on the clouds
  const a = Math.sin(f.t * 0.22) * 0.5 - Math.PI / 2, bx = f.w * 0.82, by = f.h, len = f.h * 0.92;
  const tx = bx + Math.cos(a) * len, ty = by + Math.sin(a) * len;
  const g = c.createLinearGradient(bx, by, tx, ty);
  g.addColorStop(0, "rgba(245,197,24,.2)"); g.addColorStop(1, "rgba(245,197,24,.04)");
  c.fillStyle = g; c.beginPath(); c.moveTo(bx - 12, by); c.lineTo(tx - 76, ty); c.lineTo(tx + 76, ty); c.lineTo(bx + 12, by); c.closePath(); c.fill();
  c.save(); c.translate(tx, ty); c.globalAlpha = 0.34; c.fillStyle = "#f5c518"; c.beginPath(); c.ellipse(0, 0, 84, 50, 0, 0, TAU); c.fill(); c.globalAlpha = 0.72; sprite(c, "bat", 46, "#07090e"); c.restore(); c.globalAlpha = 1;
  void p;
};
const rain = (c: C, f: Frame, _p: Palette, s: Record<string, number>) => { // thin slanted rain, redrawn from one moving offset
  s.r = ((s.r || 0) + f.dt * 900) % 200;
  c.strokeStyle = "rgba(190,205,225,.14)"; c.lineWidth = 1; c.beginPath();
  for (let i = 0; i < 46; i++) { const x = (i * 149) % (f.w + 100), y = (((i * 89) % f.h) + s.r * (1 + (i % 3) * 0.5)) % f.h; c.moveTo(x, y); c.lineTo(x - 7, y + 20); }
  c.stroke();
};
const webCorners = (c: C, f: Frame, p: Palette, s: Record<string, number>) => { // webs in the corners, and a line that shoots out when scrolling fast
  c.globalAlpha = 0.26; c.save(); c.translate(0, 70); sprite(c, "web", 150, p.c); c.restore(); c.save(); c.translate(f.w, f.h); sprite(c, "web", 170, p.c); c.restore();
  if (Math.abs(f.speed) > 12 && (s.w || 0) <= 0) { s.w = 0.55; s.y = rnd(f.h * 0.2, f.h * 0.8); s.x = rnd(f.w * 0.2, f.w * 0.8); }
  if ((s.w || 0) > 0) { s.w -= f.dt; const q = 1 - s.w / 0.55; c.globalAlpha = Math.min(1, s.w * 3) * 0.75; c.strokeStyle = "#ffffff"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, f.h); c.lineTo(s.x * q, f.h - (f.h - s.y) * q); c.stroke(); }
  c.globalAlpha = 1;
};
const stadium = (c: C, f: Frame) => { // floodlights sweep slowly over the pitch
  for (let i = 0; i < 2; i++) { const x = f.w * (i ? 0.84 : 0.16) + Math.sin(f.t * 0.3 + i) * 90, g = c.createRadialGradient(x, -40, 10, x, -40, f.h * 0.7); g.addColorStop(0, "rgba(255,255,255,.14)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, f.w, f.h); }
};
const speedLines = (c: C, f: Frame, p: Palette, s: Record<string, number>) => { // racing streaks that stretch as you scroll
  s.o = ((s.o || 0) + f.dt * (640 + Math.abs(f.speed) * 80)) % (f.w + 400);
  const boost = 1 + Math.min(3, Math.abs(f.speed) * 0.05);
  for (let i = 0; i < 12; i++) { const y = ((i * 137) % f.h) + 4, x = (s.o * (1 + (i % 4) * 0.35) + i * 410) % (f.w + 400) - 200, l = (60 + (i % 5) * 44) * boost; c.globalAlpha = 0.1 + (i % 3) * 0.07; c.fillStyle = i % 3 === 0 ? p.b : i % 3 === 1 ? p.a : "#fff"; c.fillRect(f.w - x, y, l, 1.6); }
  c.globalAlpha = 1;
};
const octagon = (c: C, f: Frame, p: Palette) => { // the cage outline, with spotlights breathing on it
  const cx = f.w * 0.7, cy = f.h * 0.56, r = Math.min(f.w, f.h) * 0.46;
  c.strokeStyle = p.a; c.lineWidth = 2; c.globalAlpha = 0.11 + 0.03 * Math.sin(f.t); c.beginPath();
  for (let i = 0; i <= 8; i++) { const a = (i / 8) * TAU + Math.PI / 8, y = cy + Math.sin(a) * r * 0.62; c[i ? "lineTo" : "moveTo"](cx + Math.cos(a) * r, y); } c.stroke();
  c.globalAlpha = 1;
};
const sunsetDust = (c: C, f: Frame) => { const g = c.createLinearGradient(0, f.h * 0.5, 0, f.h); g.addColorStop(0, "rgba(200,120,50,0)"); g.addColorStop(1, "rgba(200,120,50,.18)"); c.fillStyle = g; c.fillRect(0, f.h * 0.5, f.w, f.h * 0.5); };
const chakra = (c: C, f: Frame, p: Palette, s: Record<string, number>) => { // a slowly spinning swirl of energy
  s.a = (s.a || 0) + f.dt * (0.8 + Math.abs(f.speed) * 0.05);
  c.save(); c.translate(f.w * 0.86, f.h * 0.76); c.rotate(s.a); c.globalAlpha = 0.28; sprite(c, "swirl", 100, p.c); c.rotate(-s.a * 2); c.globalAlpha = 0.14; sprite(c, "swirl", 138, p.a); c.restore(); c.globalAlpha = 1;
};
const seaWaves = (c: C, f: Frame, p: Palette, s: Record<string, number>) => { // a rolling sea with a ship riding it
  const wave = (b: number, amp: number, k: number, sp: number, col: string, a: number) => { c.beginPath(); c.moveTo(0, f.h); for (let x = 0; x <= f.w + 16; x += 16) c.lineTo(x, f.h - b + Math.sin(x * k + f.t * sp) * amp); c.lineTo(f.w, f.h); c.closePath(); c.globalAlpha = a; c.fillStyle = col; c.fill(); };
  wave(80, 12, 0.009, 0.7, p.b, 0.22);
  s.x = ((s.x || 0) + f.dt * 18) % (f.w + 300);
  const x = s.x - 150, y = f.h - 92 + Math.sin(x * 0.009 + f.t * 0.7) * 12;
  c.save(); c.translate(x, y); c.rotate(Math.cos(x * 0.009 + f.t * 0.7) * 0.11); c.globalAlpha = 0.65; c.fillStyle = "#05090d";
  c.beginPath(); c.moveTo(-58, 0); c.lineTo(62, 0); c.lineTo(44, 24); c.lineTo(-46, 24); c.closePath(); c.fill(); c.fillRect(-2, -68, 3, 68); c.fillRect(-32, -46, 2.4, 46);
  c.beginPath(); c.moveTo(3, -64); c.quadraticCurveTo(44, -40, 3, -10); c.fill(); c.beginPath(); c.moveTo(-30, -42); c.quadraticCurveTo(-4, -26, -30, -8); c.fill(); c.restore();
  wave(46, 9, 0.013, -1, p.b, 0.36); c.globalAlpha = 1;
};
const fog = (c: C, f: Frame, p: Palette, s: Record<string, number>) => { // cold fog, a guttering dim light, handprints that slowly appear and fade
  for (let i = 0; i < 5; i++) { const x = ((f.t * (8 + i * 3) + i * 300) % (f.w + 500)) - 250, y = f.h * (0.54 + i * 0.1), g = c.createRadialGradient(x, y, 10, x, y, 300); g.addColorStop(0, "rgba(170,160,150,.09)"); g.addColorStop(1, "rgba(170,160,150,0)"); c.fillStyle = g; c.fillRect(x - 300, y - 300, 600, 600); }
  s.h = (s.h || 0) + f.dt;
  if (s.h > 9) { s.h = 0; s.hx = rnd(f.w * 0.58, f.w * 0.92); s.hy = rnd(f.h * 0.14, f.h * 0.82); s.hr = rnd(-0.5, 0.5); }
  if (s.hx) { c.save(); c.translate(s.hx, s.hy); c.rotate(s.hr); c.globalAlpha = Math.min(1, Math.sin((s.h / 9) * Math.PI) * 1.2) * 0.34; sprite(c, "hand", 38, p.a); c.restore(); }
  c.globalAlpha = 1;
};
const stageLights = (c: C, f: Frame, p: Palette) => { // Bollywood stage beams
  [p.a, p.b, p.c].forEach((col, i) => { const x = f.w * (0.2 + i * 0.3), a = Math.sin(f.t * 0.5 + i * 2) * 0.42, tx = x + Math.tan(a) * f.h; const g = c.createLinearGradient(x, 0, tx, f.h); g.addColorStop(0, col); g.addColorStop(1, "transparent"); c.globalAlpha = 0.13; c.fillStyle = g; c.beginPath(); c.moveTo(x - 7, 0); c.lineTo(x + 7, 0); c.lineTo(tx + 120, f.h); c.lineTo(tx - 120, f.h); c.closePath(); c.fill(); });
  c.globalAlpha = 1;
};
const starPattern = (c: C, f: Frame, p: Palette, s: Record<string, number>) => { // a large geometric star turning very slowly
  s.a = (s.a || 0) + f.dt * 0.03;
  c.save(); c.translate(f.w * 0.84, f.h * 0.3); c.rotate(s.a); c.strokeStyle = p.a; c.lineWidth = 1.2; c.globalAlpha = 0.17;
  for (const r of [70, 130, 190]) for (let k = 0; k < 2; k++) { c.save(); c.rotate((k * Math.PI) / 4 + r * 0.002); c.strokeRect(-r, -r, r * 2, r * 2); c.restore(); }
  c.restore(); c.globalAlpha = 1;
};
const flightPath = (c: C, f: Frame, p: Palette, s: Record<string, number>) => { // a plane on a dashed route across the screen
  s.x = ((s.x || 0) + f.dt * 72) % (f.w + 500);
  const x = s.x - 100, y = f.h * 0.3 + Math.sin(x * 0.004) * 74, slope = Math.atan(Math.cos(x * 0.004) * 74 * 0.004);
  c.strokeStyle = p.a; c.setLineDash([4, 10]); c.lineWidth = 1.6; c.globalAlpha = 0.7; c.beginPath();
  for (let i = 0; i < 40; i++) { const xx = x - i * 14; const yy = f.h * 0.3 + Math.sin(xx * 0.004) * 74; i ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke(); c.setLineDash([]);
  c.save(); c.translate(x + 14, y); c.rotate(slope); c.globalAlpha = 0.95; sprite(c, "plane", 24, p.a); c.restore(); c.globalAlpha = 1;
};
const morph = (c: C, f: Frame, _p: Palette, s: Record<string, number>) => { // a burst of power in one ranger colour after another
  s.t = (s.t || 0) + f.dt;
  if (s.t > 2.6) { s.t = 0; s.c = ((s.c || 0) + 1) % RANGERS.length; s.x = rnd(f.w * 0.1, f.w * 0.9); s.y = rnd(f.h * 0.15, f.h * 0.85); }
  if (s.x) { const q = s.t / 0.9; if (q < 1) { const g = c.createRadialGradient(s.x, s.y, 2, s.x, s.y, 80 + q * 260); g.addColorStop(0, RANGERS[s.c]); g.addColorStop(1, "transparent"); c.globalAlpha = (1 - q) * 0.34; c.fillStyle = g; c.fillRect(0, 0, f.w, f.h); c.save(); c.translate(s.x, s.y); c.globalAlpha = (1 - q) * 0.9; sprite(c, "bolt", 34, RANGERS[s.c]); c.restore(); } }
  c.globalAlpha = 1;
};
const circuit = (c: C, f: Frame, p: Palette, s: Record<string, number>) => { // alien circuit pulses running along straight lines
  s.t = (s.t || 0) + f.dt * 170;
  c.fillStyle = p.a; c.globalAlpha = 0.15;
  for (let i = 0; i < 10; i++) { const y = ((i * 97) % (f.h - 60)) + 40, x = (s.t + i * 240) % (f.w + 200) - 100; c.fillRect(x - 90, y, 90, 1.5); c.globalAlpha = 0.55; c.fillRect(x, y - 1, 5, 3.5); c.globalAlpha = 0.15; }
  c.globalAlpha = 1;
};
const river = (c: C, f: Frame, p: Palette, s: Record<string, number>) => { // a river with a little country boat
  const wave = (b: number, amp: number, k: number, sp: number, col: string, a: number) => { c.beginPath(); c.moveTo(0, f.h); for (let x = 0; x <= f.w + 18; x += 18) c.lineTo(x, f.h - b + Math.sin(x * k + f.t * sp) * amp); c.lineTo(f.w, f.h); c.closePath(); c.globalAlpha = a; c.fillStyle = col; c.fill(); };
  wave(62, 7, 0.009, 0.7, p.a, 0.2);
  s.x = ((s.x || 0) + f.dt * 15) % (f.w + 240);
  const x = s.x - 120, y = f.h - 68 + Math.sin(x * 0.009 + f.t * 0.7) * 6;
  c.save(); c.translate(x, y); c.globalAlpha = 0.85; c.fillStyle = "#402614"; c.beginPath(); c.moveTo(-56, -6); c.quadraticCurveTo(0, 22, 58, -8); c.quadraticCurveTo(0, 8, -56, -6); c.fill(); c.fillRect(-1, -46, 2.4, 44);
  c.fillStyle = p.b; c.beginPath(); c.moveTo(2, -44); c.lineTo(32, -12); c.lineTo(2, -12); c.closePath(); c.fill(); c.restore();
  wave(36, 5, 0.014, -1, p.a, 0.3); c.globalAlpha = 1;
};
const iceAndFire = (c: C, f: Frame, p: Palette, s: Record<string, number>) => { // a dragon's shadow crosses now and then, cold on one side and fire on the other
  const g = c.createLinearGradient(0, 0, f.w, 0); g.addColorStop(0, "rgba(168,216,234,.08)"); g.addColorStop(0.5, "transparent"); g.addColorStop(1, "rgba(217,72,28,.1)"); c.fillStyle = g; c.fillRect(0, 0, f.w, f.h);
  s.d = (s.d || 0) + f.dt;
  if (s.d > 14) { s.d = 0; s.y = rnd(f.h * 0.08, f.h * 0.42); }
  if (s.d < 7) { const x = (s.d / 7) * (f.w + 520) - 260; c.save(); c.translate(f.w - x, (s.y || f.h * 0.2) + Math.sin(s.d * 2) * 12); c.scale(-1, 1); c.globalAlpha = 0.5; sprite(c, "dragon", 90, "#05070a"); c.restore(); }
  c.globalAlpha = 1; void p;
};
const floatingCandles = (c: C, f: Frame, p: Palette, s: Record<string, number>) => { // a hall of candles, and an owl flying past
  for (let i = 0; i < 12; i++) { const x = ((i * 233) % f.w) + 14, y = 40 + ((i * 113) % (f.h * 0.42)) + Math.sin(f.t * 0.7 + i) * 9; c.globalAlpha = 0.28 + 0.2 * Math.abs(Math.sin(f.t * 2.3 + i * 1.7)); const g = c.createRadialGradient(x, y - 10, 1, x, y - 10, 20); g.addColorStop(0, "rgba(255,200,110,.9)"); g.addColorStop(1, "rgba(255,200,110,0)"); c.fillStyle = g; c.fillRect(x - 20, y - 30, 40, 40); c.globalAlpha = 0.72; c.save(); c.translate(x, y); sprite(c, "candle", 11, "#f1e7cf"); c.restore(); }
  s.o = (s.o || 0) + f.dt;
  if (s.o > 11) s.o = 0;
  if (s.o < 6) { const x = (s.o / 6) * (f.w + 200) - 100; c.save(); c.translate(x, f.h * 0.5 + Math.sin(s.o * 3) * 30); c.globalAlpha = 0.68; sprite(c, "owl", 19, "#b9a58a"); c.restore(); }
  c.globalAlpha = 1; void p;
};
// a black hole bending a bright ring of gas around itself: drawn once, then stamped, with only the sparks moving
let holeImg: HTMLCanvasElement | null = null, holeR = 0;
const blackHole = (c: C, f: Frame, _p: Palette, s: Record<string, number>) => {
  s.a = (s.a || 0) + f.dt * (0.32 + Math.abs(f.speed) * 0.02);
  const narrow = f.w < 761, cx = f.w * (narrow ? 0.82 : 0.8), cy = f.h * (narrow ? 0.17 : 0.3), r = Math.min(f.w, f.h) * (narrow ? 0.09 : 0.125);
  if (!holeImg || holeR !== r) {
    holeR = r;
    holeImg = document.createElement("canvas");
    const size = Math.ceil(r * 6);
    holeImg.width = holeImg.height = size;
    const x = holeImg.getContext("2d");
    if (x) {
      const m = size / 2;
      const glow = x.createRadialGradient(m, m, r * 0.7, m, m, r * 3); glow.addColorStop(0, "rgba(255,170,90,.22)"); glow.addColorStop(1, "rgba(255,150,70,0)"); x.fillStyle = glow; x.fillRect(0, 0, size, size);
      const ring = (ry: number, w: number, col: string, a: number, from: number, to: number) => { x.beginPath(); x.ellipse(m, m, r * 2.2, ry, 0, from, to); x.strokeStyle = col; x.lineWidth = w; x.globalAlpha = a; x.stroke(); };
      ring(r * 0.46, 13, "#ffb066", 0.5, Math.PI, TAU); // behind
      x.globalAlpha = 1; x.fillStyle = "#000"; x.beginPath(); x.arc(m, m, r, 0, TAU); x.fill();
      x.beginPath(); x.arc(m, m, r * 1.06, 0, TAU); x.strokeStyle = "#ffe0b8"; x.lineWidth = 3; x.globalAlpha = 0.8; x.stroke();
      ring(r * 0.46, 15, "#ffc98c", 0.8, 0, Math.PI); // in front
    }
  }
  c.globalAlpha = 1;
  c.drawImage(holeImg, cx - holeImg.width / 2, cy - holeImg.height / 2);
  c.globalAlpha = 0.9; c.fillStyle = "#fff5e6";
  for (let i = 0; i < 12; i++) { const a = s.a + i * 0.52, x = cx + Math.cos(a) * r * 2.2, y = cy + Math.sin(a) * r * 0.46; if (Math.sin(a) > -0.05 || Math.abs(x - cx) > r) c.fillRect(x, y, 2.4, 2.4); }
  c.globalAlpha = 1;
};

const T = (a: (p: Palette) => string[]) => a;
const CONFIGS: Record<string, Config> = {
  messi: { piece: stadium, layers: [{ kinds: ["ball"], n: 5, size: [11, 17], speed: [18, 34], mode: "float", alpha: 0.75, spin: 1.2 }, { kinds: ["spark", "dot"], n: 24, size: [2, 5], speed: [10, 26], mode: "fall", alpha: 0.65, sway: 0.5, cols: T((p) => ["#75c3f0", "#ffffff", p.b]) }], burst: { kinds: ["ball", "ten"], n: 9, size: 10 }, fall: { kinds: ["ball", "ball", "ten"], rate: 12, g: 880, terminal: 640, speed: [40, 180], size: [11, 18], flutter: false, bounce: true, spin: 3, cols: T(() => ["#75c3f0"]), alt: "" } },
  batman: { piece: (c, f, p, s) => { searchlight(c, f, p); rain(c, f, p, s); }, layers: [{ kinds: ["bat"], n: 12, size: [8, 19], speed: [24, 70], mode: "drift", alpha: 0.72, sway: 1.4, cols: T(() => ["#1c2029", "#30343f"]) }], burst: { kinds: ["bat"], n: 9, size: 12, cols: T((p) => [p.a, "#2d323c"]) }, fall: { kinds: ["bat"], rate: 22, g: 240, terminal: 210, speed: [30, 120], size: [8, 19], flutter: true, spin: 0.4, cols: T((p) => ["#10131a", "#2f3540", p.a]) } },
  spiderman: { piece: webCorners, layers: [{ kinds: ["spider"], n: 4, size: [7, 11], speed: [10, 26], mode: "fall", alpha: 0.7, sway: 0.2, cols: T(() => ["#ffffff"]) }, { kinds: ["web"], n: 5, size: [17, 32], speed: [4, 12], mode: "float", alpha: 0.2, spin: 0.08, cols: T((p) => [p.a, p.b, "#ffffff"]) }], burst: { kinds: ["web"], n: 4, size: 26, speed: 170, cols: T(() => ["#ffffff"]) }, fall: { kinds: ["web", "spider", "web"], rate: 15, g: 300, terminal: 240, speed: [20, 110], size: [12, 28], flutter: true, spin: 0.7, cols: T((p) => ["#ffffff", p.a, p.b]) } },
  verstappen: { piece: speedLines, layers: [{ kinds: ["check", "tyre"], n: 7, size: [11, 21], speed: [50, 130], mode: "drift", alpha: 0.55, spin: 0.9, cols: T(() => ["#f6f6f6", "#ffcc00"]) }], burst: { kinds: ["check", "tyre", "spark"], n: 12, size: 9, speed: 240, cols: T((p) => ["#fff", p.b, p.a]) }, fall: { kinds: ["check", "tyre", "check"], rate: 22, g: 700, terminal: 620, speed: [80, 220], size: [10, 19], flutter: false, bounce: true, spin: 4, cols: T(() => ["#f6f6f6"]) } },
  khabib: { piece: octagon, layers: [{ kinds: ["eagle"], n: 3, size: [17, 28], speed: [16, 38], mode: "drift", alpha: 0.5, sway: 1.3, cols: T((p) => [p.a]) }, { kinds: ["spark"], n: 15, size: [2, 4], speed: [6, 20], mode: "rise", alpha: 0.45, cols: T((p) => [p.a]) }], burst: { kinds: ["glove"], n: 5, size: 15, speed: 200, cols: T((p) => [p.c, p.a]) }, fall: { kinds: ["glove", "eagle"], rate: 12, g: 520, terminal: 400, speed: [40, 150], size: [11, 20], flutter: false, bounce: true, spin: 2, cols: T((p) => [p.c, p.a]) } },
  arthur: { piece: sunsetDust, layers: [{ kinds: ["dust"], n: 14, size: [6, 16], speed: [16, 44], mode: "drift", alpha: 0.32, cols: T((p) => [p.b]) }, { kinds: ["eagle"], n: 2, size: [13, 19], speed: [12, 22], mode: "drift", alpha: 0.5, sway: 1, cols: T(() => ["#2d1b0e"]) }], burst: { kinds: ["hat", "shoe", "coin"], n: 8, size: 11, cols: T((p) => [p.a, p.b, "#6d4522"]) }, fall: { kinds: ["hat", "shoe", "coin", "coin"], rate: 15, g: 600, terminal: 470, speed: [30, 160], size: [9, 18], flutter: false, bounce: true, spin: 3, cols: T((p) => ["#6d4522", p.a, p.b]) } },
  naruto: { piece: chakra, layers: [{ kinds: ["leaf"], n: 18, size: [6, 11], speed: [28, 62], mode: "drift", alpha: 0.72, spin: 1.5, sway: 1.1, cols: T((p) => ["#6bb04a", "#8fc95a", p.a]) }, { kinds: ["shuriken"], n: 3, size: [9, 13], speed: [150, 260], mode: "drift", alpha: 0.7, spin: 9, cols: T(() => ["#3b4149"]) }], burst: { kinds: ["shuriken", "swirl", "kunai"], n: 8, size: 11, speed: 230, cols: T((p) => [p.a, p.c, "#3b4149"]) }, fall: { kinds: ["leaf", "kunai", "shuriken", "ramen"], rate: 22, g: 480, terminal: 400, speed: [30, 130], size: [9, 15], flutter: true, spin: 3, cols: T((p) => ["#6bb04a", p.a, "#3b4149", p.b]) } },
  sparrow: { piece: seaWaves, layers: [{ kinds: ["spark"], n: 26, size: [2, 4], speed: [3, 9], mode: "float", alpha: 0.6, cols: T(() => ["#fff4d6"]) }, { kinds: ["coin"], n: 5, size: [6, 9], speed: [20, 48], mode: "fall", alpha: 0.7, spin: 2.5, cols: T((p) => [p.a]) }], burst: { kinds: ["coin", "skull"], n: 11, size: 9, cols: T((p) => [p.a, "#f2e8cf"]) }, fall: { kinds: ["coin", "coin", "coin", "skull", "compass"], rate: 28, g: 780, terminal: 640, speed: [30, 180], size: [7, 14], flutter: false, bounce: true, spin: 5, cols: T((p) => [p.a, "#f2e8cf"]) } },
  dabbe: { piece: fog, layers: [{ kinds: ["ember"], n: 12, size: [2, 5], speed: [4, 13], mode: "rise", alpha: 0.5, cols: T((p) => [p.a]) }, { kinds: ["eye"], n: 3, size: [5, 8], speed: [1, 3], mode: "float", alpha: 0.32, cols: T(() => ["#c7bfb2"]) }], burst: { kinds: ["hand"], n: 3, size: 15, speed: 60, cols: T((p) => [p.a]) }, fall: { kinds: ["hand", "candle", "ember"], rate: 8, g: 170, terminal: 150, speed: [15, 60], size: [11, 18], flutter: true, spin: 0.3, cols: T((p) => [p.a, "#c7bfb2"]) } },
  salman: { piece: stageLights, layers: [{ kinds: ["petal"], n: 22, size: [4, 8], speed: [18, 46], mode: "fall", alpha: 0.7, spin: 1.8, sway: 1.2, cols: T((p) => [p.a, "#ff7a1a", p.b]) }, { kinds: ["reel"], n: 3, size: [15, 22], speed: [6, 16], mode: "float", alpha: 0.2, spin: 0.6, cols: T((p) => [p.a]) }], burst: { kinds: ["petal", "spark", "reel"], n: 13, size: 9, cols: T((p) => [p.a, p.b, p.c]) }, fall: { kinds: ["petal", "petal", "clapper", "reel"], rate: 26, g: 290, terminal: 220, speed: [20, 90], size: [7, 15], flutter: true, spin: 2, cols: T((p) => [p.a, "#ff7a1a", p.b]) } },
  palestine: { layers: [{ kinds: ["olive"], n: 10, size: [11, 19], speed: [9, 22], mode: "fall", alpha: 0.65, spin: 0.35, sway: 0.8, cols: T((p) => [p.a]) }], burst: { kinds: ["leaf"], n: 7, size: 6, speed: 90, cols: T((p) => [p.a]) }, fall: { kinds: ["olive", "leaf"], rate: 13, g: 150, terminal: 95, speed: [15, 55], size: [9, 17], flutter: true, spin: 0.5, cols: T((p) => [p.a, "#3f6e2e"]) } },
  islamic: { piece: starPattern, layers: [{ kinds: ["star8"], n: 16, size: [3, 6], speed: [2, 7], mode: "float", alpha: 0.5, spin: 0.14, cols: T((p) => [p.a]) }, { kinds: ["lantern"], n: 4, size: [13, 18], speed: [3, 8], mode: "float", alpha: 0.5, sway: 0.5, cols: T((p) => [p.a]) }], burst: { kinds: ["star8"], n: 8, size: 6, speed: 90, cols: T((p) => [p.a, p.c]) }, fall: { kinds: ["star8", "star8", "lantern"], rate: 11, g: 120, terminal: 85, speed: [10, 45], size: [6, 13], flutter: true, spin: 0.3, cols: T((p) => [p.a, p.c]) } },
  travel: { piece: flightPath, layers: [{ kinds: ["cloud"], n: 6, size: [20, 38], speed: [8, 20], mode: "drift", alpha: 0.62, cols: T(() => ["#ffffff"]) }, { kinds: ["pin", "stamp", "compass"], n: 5, size: [9, 14], speed: [5, 12], mode: "float", alpha: 0.5, sway: 0.4, cols: T((p) => [p.a, p.b]) }], burst: { kinds: ["pin", "stamp", "plane"], n: 8, size: 11, cols: T((p) => [p.a, p.b, p.c]) }, fall: { kinds: ["pin", "stamp", "plane", "compass"], rate: 15, g: 300, terminal: 230, speed: [20, 100], size: [9, 15], flutter: true, spin: 1.3, cols: T((p) => [p.a, p.b, "#e23b3b"]) } },
  rangers: { piece: morph, layers: [{ kinds: ["bolt", "diamond"], n: 14, size: [7, 13], speed: [12, 34], mode: "float", alpha: 0.5, spin: 0.5, cols: T(() => RANGERS) }], burst: { kinds: ["helmet", "bolt", "diamond"], n: 10, size: 11, speed: 250, cols: T(() => RANGERS) }, fall: { kinds: ["helmet", "bolt", "diamond"], rate: 19, g: 620, terminal: 500, speed: [40, 170], size: [9, 17], flutter: false, bounce: true, spin: 3.5, cols: T(() => RANGERS) } },
  tomjerry: { layers: [{ kinds: ["cheese", "paw", "paw"], n: 10, size: [7, 13], speed: [8, 20], mode: "float", alpha: 0.42, spin: 0.25, cols: T((p) => [p.a, p.b, p.c]) }], burst: { kinds: ["cheese", "mallet", "star"], n: 11, size: 11, speed: 240, cols: T((p) => [p.a, "#ef5350", p.b]) }, fall: { kinds: ["cheese", "cheese", "mallet", "paw", "star"], rate: 19, g: 860, terminal: 660, speed: [30, 170], size: [9, 17], flutter: false, bounce: true, spin: 4, cols: T((p) => [p.a, "#ef5350", p.b]) } },
  ben10: { piece: circuit, layers: [{ kinds: ["hexa"], n: 13, size: [7, 18], speed: [6, 16], mode: "float", alpha: 0.32, spin: 0.2, cols: T((p) => [p.a, p.b]) }, { kinds: ["watch"], n: 2, size: [14, 19], speed: [4, 9], mode: "float", alpha: 0.5, spin: 0.2, cols: T((p) => [p.a]) }], burst: { kinds: ["hexa", "spark", "watch"], n: 10, size: 11, speed: 230, cols: T((p) => [p.a, p.c]) }, fall: { kinds: ["watch", "hexa", "spark", "spark"], rate: 20, g: 520, terminal: 440, speed: [40, 170], size: [8, 16], flutter: false, spin: 2, cols: T((p) => [p.a, p.c]) } },
  bangladesh: { piece: river, layers: [{ kinds: ["kite"], n: 4, size: [10, 15], speed: [8, 18], mode: "float", alpha: 0.72, sway: 1, cols: T((p) => [p.b, p.c, p.a]) }, { kinds: ["shapla"], n: 7, size: [8, 13], speed: [9, 20], mode: "fall", alpha: 0.5, spin: 0.5, sway: 0.8, cols: T(() => ["#f4a0b5", "#ffffff"]) }], burst: { kinds: ["shapla", "kite", "fish"], n: 8, size: 11, cols: T((p) => ["#f4a0b5", p.b, p.a]) }, fall: { kinds: ["shapla", "shapla", "fish", "kite"], rate: 17, g: 270, terminal: 210, speed: [20, 90], size: [9, 16], flutter: true, spin: 1.3, cols: T((p) => ["#f4a0b5", "#b9c6cd", p.b, p.a]) } },
  got: { piece: iceAndFire, layers: [{ kinds: ["flake"], n: 24, size: [3, 7], speed: [14, 40], mode: "fall", alpha: 0.75, spin: 0.5, sway: 0.8, cols: T((p) => [p.c, "#ffffff"]) }, { kinds: ["ember"], n: 17, size: [2, 5], speed: [16, 44], mode: "rise", alpha: 0.8, cols: T((p) => [p.b, "#ffb066"]) }], burst: { kinds: ["sword", "flake", "ember"], n: 10, size: 11, cols: T((p) => [p.b, p.c, "#d7dade"]) }, fall: { kinds: ["flake", "ember", "sword", "dragon"], rate: 23, g: 310, terminal: 250, speed: [20, 100], size: [7, 17], flutter: true, spin: 1, cols: T((p) => [p.b, p.c, "#d7dade", "#2a2f36"]) } },
  potter: { piece: floatingCandles, layers: [{ kinds: ["spark"], n: 30, size: [2, 5], speed: [5, 16], mode: "rise", alpha: 0.72, sway: 0.5, cols: T((p) => [p.a, "#ffffff", p.c]) }], burst: { kinds: ["spark", "star", "letter"], n: 14, size: 9, cols: T((p) => [p.a, "#ffffff"]) }, fall: { kinds: ["letter", "wizhat", "spark", "star"], rate: 19, g: 240, terminal: 175, speed: [15, 80], size: [8, 15], flutter: true, spin: 1.2, cols: T((p) => ["#efe0bd", p.a, p.c]) } },
  interstellar: { piece: blackHole, layers: [{ kinds: ["dot"], n: 60, size: [1, 3], speed: [1, 5], mode: "float", alpha: 0.72, cols: T(() => ["#ffffff", "#ffd7a1", "#a9c4ff"]) }, { kinds: ["ship"], n: 1, size: [15, 17], speed: [8, 10], mode: "drift", alpha: 0.6, spin: 0.3, cols: T(() => ["#c6d1df"]) }], burst: { kinds: ["spark", "planet"], n: 11, size: 9, cols: T((p) => [p.a, p.b, "#ffffff"]) }, fall: { kinds: ["spark", "planet", "dot", "ship"], rate: 20, g: 90, terminal: 110, speed: [15, 80], size: [6, 14], flutter: false, spin: 0.8, cols: T((p) => [p.a, p.b, "#ffffff"]) } },
};

export const hasFanScene = (skin: string) => skin in CONFIGS;
export const fallSpec = (skin: string): FallSpec | null => CONFIGS[skin]?.fall ?? null;

type Part = { x: number; y: number; r: number; v: number; ph: number; rot: number; vr: number; kind: string; col: string; alpha: number; mode: Mode; sway: number; alt: string };

export function makeFanScene(skin: string, p: Palette, w: number, h: number): Scene {
  const cfg = CONFIGS[skin];
  const parts: Part[] = cfg.layers.flatMap((l) => Array.from({ length: Math.max(1, Math.round(l.n * Math.min(1, w / 1200))) }, () => {
    const cols = l.cols ? l.cols(p) : [p.a, p.b, p.c];
    return { x: rnd(0, w), y: rnd(0, h), r: rnd(l.size[0], l.size[1]), v: rnd(l.speed[0], l.speed[1]), ph: rnd(0, TAU), rot: rnd(0, TAU), vr: (l.spin ?? 0) * rnd(-1, 1), kind: pick(l.kinds), col: pick(cols), alpha: l.alpha, mode: l.mode, sway: l.sway ?? 0, alt: l.alt ?? "" };
  }));
  const state: Record<string, number> = {};
  return {
    draw(c, f) {
      cfg.piece?.(c, f, p, state);
      const fast = 1 + Math.min(3, Math.abs(f.speed) * 0.035);
      for (const o of parts) {
        const d = o.v * f.dt;
        if (o.mode === "fall") { o.y += d * fast; if (o.y > f.h + 30) { o.y = -30; o.x = rnd(0, f.w); } }
        else if (o.mode === "rise") { o.y -= d * fast; if (o.y < -30) { o.y = f.h + 30; o.x = rnd(0, f.w); } }
        else if (o.mode === "drift") { o.x += d * fast; if (o.x > f.w + 80) { o.x = -80; o.y = rnd(0, f.h * 0.86); } }
        else { o.x += Math.sin(f.t * 0.3 + o.ph) * d * 0.5; o.y += Math.cos(f.t * 0.25 + o.ph) * d * 0.5; }
        o.rot += o.vr * f.dt;
        const y = o.sway ? o.y + Math.sin(f.t * 1.1 + o.ph) * 13 * o.sway : o.y;
        c.save(); c.translate(o.x, y); if (o.rot) c.rotate(o.rot); c.globalAlpha = o.alpha; sprite(c, o.kind, o.r, o.col, o.alt); c.restore();
      }
      c.globalAlpha = 1;
    },
  };
}

/** A click's burst: returned as plain particles for the shared burst system in themeScenes.ts. */
export function fanBurst(skin: string, p: Palette): { kinds: string[]; n: number; size: number; speed: number; cols: string[] } | null {
  const b = CONFIGS[skin]?.burst;
  if (!b) return null;
  return { kinds: b.kinds, n: b.n, size: b.size ?? 9, speed: b.speed ?? 170, cols: b.cols ? b.cols(p) : [p.a, p.b, p.c] };
}
