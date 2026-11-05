// Small original drawings used by the fan themes: what floats in the background, bursts on a click and falls from the
// banner. Each is drawn once to a tiny hidden canvas and then just stamped, which is far cheaper than redrawing paths.
type C = CanvasRenderingContext2D;
type Draw = (c: C, s: number, col: string, alt: string) => void;
const TAU = Math.PI * 2;

const dot = (c: C, x: number, y: number, r: number) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
const poly = (c: C, pts: number[]) => { c.beginPath(); for (let i = 0; i < pts.length; i += 2) c[i ? "lineTo" : "moveTo"](pts[i], pts[i + 1]); c.closePath(); c.fill(); };
const star = (c: C, s: number, n: number, inner: number) => { c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * TAU - Math.PI / 2, q = i % 2 ? s * inner : s; c[i ? "lineTo" : "moveTo"](Math.cos(a) * q, Math.sin(a) * q); } c.closePath(); c.fill(); };
const leafPath = (c: C, s: number) => { c.beginPath(); c.moveTo(0, -s); c.quadraticCurveTo(s * 0.75, 0, 0, s); c.quadraticCurveTo(-s * 0.75, 0, 0, -s); c.fill(); };

export const SPRITES: Record<string, Draw> = {
  dot: (c, s, col) => { c.fillStyle = col; dot(c, 0, 0, s * 0.55); },
  bat: (c, s, col) => {
    c.fillStyle = col; c.beginPath(); c.moveTo(0, -s * 0.3); c.lineTo(s * 0.12, -s * 0.62); c.lineTo(s * 0.22, -s * 0.28);
    c.quadraticCurveTo(s * 0.6, -s * 0.6, s, -s * 0.34); c.quadraticCurveTo(s * 0.82, 0, s * 0.72, s * 0.3); c.quadraticCurveTo(s * 0.52, s * 0.04, s * 0.38, s * 0.26);
    c.quadraticCurveTo(s * 0.2, s * 0.08, 0, s * 0.56); c.quadraticCurveTo(-s * 0.2, s * 0.08, -s * 0.38, s * 0.26); c.quadraticCurveTo(-s * 0.52, s * 0.04, -s * 0.72, s * 0.3);
    c.quadraticCurveTo(-s * 0.82, 0, -s, -s * 0.34); c.quadraticCurveTo(-s * 0.6, -s * 0.6, -s * 0.22, -s * 0.28); c.lineTo(-s * 0.12, -s * 0.62); c.closePath(); c.fill();
  },
  web: (c, s, col) => {
    c.strokeStyle = col; c.lineWidth = Math.max(1, s * 0.07);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * s, Math.sin(a) * s); c.stroke(); }
    for (const q of [0.35, 0.65, 0.95]) { c.beginPath(); for (let i = 0; i <= 8; i++) { const a = (i / 8) * TAU, x = Math.cos(a) * s * q, y = Math.sin(a) * s * q; if (i) { const m = a - TAU / 16; c.quadraticCurveTo(Math.cos(m) * s * q * 0.82, Math.sin(m) * s * q * 0.82, x, y); } else c.moveTo(x, y); } c.stroke(); }
  },
  spider: (c, s, col) => {
    c.strokeStyle = col; c.fillStyle = col; c.lineWidth = Math.max(1, s * 0.09);
    for (const d of [-1, 1]) for (const [a, b] of [[-0.7, -1], [-0.3, -0.5], [0.1, 0.35], [0.4, 0.95]]) { c.beginPath(); c.moveTo(0, s * a * 0.3); c.quadraticCurveTo(d * s * 0.7, s * a * 0.9, d * s, s * b); c.stroke(); }
    dot(c, 0, -s * 0.28, s * 0.22); dot(c, 0, s * 0.12, s * 0.34);
  },
  ball: (c, s, col, alt) => {
    c.fillStyle = "#ffffff"; dot(c, 0, 0, s); c.fillStyle = alt || "#16202c"; star(c, s * 0.36, 5, 0.72);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU - Math.PI / 2; c.save(); c.translate(Math.cos(a) * s * 0.84, Math.sin(a) * s * 0.84); c.rotate(a); c.beginPath(); c.ellipse(0, 0, s * 0.15, s * 0.26, 0, 0, TAU); c.fill(); c.restore(); }
    c.strokeStyle = alt || "#16202c"; c.lineWidth = Math.max(0.8, s * 0.05); c.beginPath(); c.arc(0, 0, s - c.lineWidth / 2, 0, TAU); c.stroke();
  },
  ten: (c, s, col, alt) => {
    c.fillStyle = col; c.beginPath(); c.moveTo(-s * 0.42, -s); c.lineTo(-s, -s * 0.62); c.lineTo(-s * 0.72, -s * 0.2); c.lineTo(-s * 0.52, -s * 0.3); c.lineTo(-s * 0.52, s); c.lineTo(s * 0.52, s); c.lineTo(s * 0.52, -s * 0.3); c.lineTo(s * 0.72, -s * 0.2); c.lineTo(s, -s * 0.62); c.lineTo(s * 0.42, -s); c.quadraticCurveTo(0, -s * 0.66, -s * 0.42, -s); c.fill();
    c.fillStyle = alt || "#0c2340"; c.font = `800 ${s * 0.86}px system-ui, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("10", 0, s * 0.2);
  },
  check: (c, s, col, alt) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { c.fillStyle = (x + y) % 2 ? col : alt || "#111"; c.fillRect(-s + (x * s) / 2, -s * 0.72 + (y * s * 0.72) / 2, s / 2 + 0.5, (s * 0.72) / 2 + 0.5); } },
  tyre: (c, s, col) => { c.fillStyle = "#15171b"; dot(c, 0, 0, s); c.fillStyle = col; dot(c, 0, 0, s * 0.52); c.fillStyle = "#15171b"; dot(c, 0, 0, s * 0.2); },
  spark: (c, s, col) => { c.fillStyle = col; star(c, s, 4, 0.22); },
  glove: (c, s, col, alt) => {
    c.fillStyle = col; c.beginPath(); c.roundRect(-s * 0.7, -s * 0.8, s * 1.4, s * 1.15, s * 0.42); c.fill();
    c.beginPath(); c.roundRect(-s * 0.98, -s * 0.34, s * 0.5, s * 0.72, s * 0.22); c.fill();
    c.fillStyle = alt || "#fff"; c.fillRect(-s * 0.62, s * 0.38, s * 1.24, s * 0.44);
  },
  eagle: (c, s, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(-s, -s * 0.1); c.quadraticCurveTo(-s * 0.5, -s * 0.5, -s * 0.1, -s * 0.05); c.lineTo(s * 0.1, -s * 0.05); c.quadraticCurveTo(s * 0.5, -s * 0.5, s, -s * 0.1); c.quadraticCurveTo(s * 0.5, -s * 0.05, s * 0.18, s * 0.2); c.lineTo(0, s * 0.5); c.lineTo(-s * 0.18, s * 0.2); c.quadraticCurveTo(-s * 0.5, -s * 0.05, -s, -s * 0.1); c.fill(); },
  hat: (c, s, col, alt) => { c.fillStyle = col; c.beginPath(); c.ellipse(0, s * 0.28, s, s * 0.26, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(-s * 0.46, s * 0.2); c.quadraticCurveTo(-s * 0.52, -s * 0.5, -s * 0.16, -s * 0.48); c.quadraticCurveTo(0, -s * 0.28, s * 0.16, -s * 0.48); c.quadraticCurveTo(s * 0.52, -s * 0.5, s * 0.46, s * 0.2); c.fill(); c.fillStyle = alt || "#000"; c.fillRect(-s * 0.46, s * 0.04, s * 0.92, s * 0.13); },
  shoe: (c, s, col) => { c.strokeStyle = col; c.lineWidth = s * 0.3; c.lineCap = "round"; c.beginPath(); c.arc(0, -s * 0.05, s * 0.68, Math.PI * 0.82, Math.PI * 2.18); c.stroke(); },
  dust: (c, s, col) => { c.fillStyle = col; c.globalAlpha *= 0.6; dot(c, 0, 0, s * 0.6); dot(c, s * 0.5, s * 0.12, s * 0.4); dot(c, -s * 0.5, s * 0.15, s * 0.36); },
  kunai: (c, s, col, alt) => { c.fillStyle = col; poly(c, [0, -s, s * 0.34, -s * 0.2, s * 0.09, -s * 0.05, -s * 0.09, -s * 0.05, -s * 0.34, -s * 0.2]); c.fillStyle = alt || col; c.fillRect(-s * 0.08, -s * 0.05, s * 0.16, s * 0.72); c.strokeStyle = col; c.lineWidth = s * 0.08; c.beginPath(); c.arc(0, s * 0.8, s * 0.18, 0, TAU); c.stroke(); },
  shuriken: (c, s, col) => { c.fillStyle = col; star(c, s, 4, 0.3); c.globalCompositeOperation = "destination-out"; dot(c, 0, 0, s * 0.14); c.globalCompositeOperation = "source-over"; },
  swirl: (c, s, col) => { c.strokeStyle = col; c.lineWidth = Math.max(1.2, s * 0.14); c.lineCap = "round"; c.beginPath(); for (let i = 0; i <= 40; i++) { const a = (i / 40) * TAU * 2.2, q = (i / 40) * s; c[i ? "lineTo" : "moveTo"](Math.cos(a) * q, Math.sin(a) * q); } c.stroke(); },
  leaf: (c, s, col) => { c.fillStyle = col; leafPath(c, s); c.strokeStyle = "rgba(0,0,0,.24)"; c.lineWidth = Math.max(0.7, s * 0.06); c.beginPath(); c.moveTo(0, -s); c.lineTo(0, s); c.stroke(); },
  ramen: (c, s, col, alt) => { c.fillStyle = col; c.beginPath(); c.arc(0, -s * 0.05, s, 0, Math.PI); c.closePath(); c.fill(); c.strokeStyle = alt || "#f6c56b"; c.lineWidth = s * 0.1; for (const x of [-0.4, 0, 0.4]) { c.beginPath(); c.moveTo(s * x, -s * 0.1); c.quadraticCurveTo(s * (x + 0.12), -s * 0.45, s * (x + 0.05), -s * 0.68); c.stroke(); } },
  coin: (c, s, col, alt) => { c.fillStyle = col; dot(c, 0, 0, s); c.fillStyle = alt || "rgba(0,0,0,.24)"; star(c, s * 0.55, 5, 0.45); c.strokeStyle = "rgba(255,255,255,.45)"; c.lineWidth = s * 0.08; c.beginPath(); c.arc(0, 0, s * 0.82, 3.6, 5.2); c.stroke(); },
  skull: (c, s, col, alt) => { c.fillStyle = col; dot(c, 0, -s * 0.18, s * 0.72); c.fillRect(-s * 0.36, s * 0.2, s * 0.72, s * 0.42); c.fillStyle = alt || "#101010"; dot(c, -s * 0.28, -s * 0.2, s * 0.17); dot(c, s * 0.28, -s * 0.2, s * 0.17); poly(c, [0, s * 0.02, s * 0.1, s * 0.2, -s * 0.1, s * 0.2]); c.fillRect(-s * 0.03, s * 0.34, s * 0.06, s * 0.28); c.fillRect(-s * 0.2, s * 0.34, s * 0.05, s * 0.28); c.fillRect(s * 0.15, s * 0.34, s * 0.05, s * 0.28); },
  compass: (c, s, col, alt) => { c.strokeStyle = col; c.lineWidth = s * 0.1; c.beginPath(); c.arc(0, 0, s * 0.92, 0, TAU); c.stroke(); c.fillStyle = alt || "#c0392b"; poly(c, [0, -s * 0.76, s * 0.18, 0, -s * 0.18, 0]); c.fillStyle = col; poly(c, [0, s * 0.76, s * 0.18, 0, -s * 0.18, 0]); },
  hand: (c, s, col) => { c.fillStyle = col; c.beginPath(); c.roundRect(-s * 0.48, -s * 0.15, s * 0.96, s * 0.95, s * 0.28); c.fill(); for (const [x, h, w] of [[-0.42, 0.72, 0.17], [-0.15, 0.95, 0.17], [0.12, 0.9, 0.17], [0.36, 0.68, 0.16]]) { c.beginPath(); c.roundRect(s * x - (s * w) / 2, -s * 0.1 - s * h, s * w, s * h + s * 0.15, s * 0.08); c.fill(); } c.save(); c.rotate(-0.8); c.beginPath(); c.roundRect(-s * 0.72, s * 0.18, s * 0.2, s * 0.62, s * 0.08); c.fill(); c.restore(); },
  eye: (c, s, col, alt) => { c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, s, s * 0.42, 0, 0, TAU); c.fill(); c.fillStyle = alt || "#000"; dot(c, 0, 0, s * 0.26); },
  candle: (c, s, col, alt) => { c.fillStyle = col; c.beginPath(); c.roundRect(-s * 0.2, -s * 0.2, s * 0.4, s * 1.1, s * 0.05); c.fill(); c.fillStyle = alt || "#ffb347"; c.beginPath(); c.moveTo(0, -s * 0.85); c.quadraticCurveTo(s * 0.28, -s * 0.42, 0, -s * 0.22); c.quadraticCurveTo(-s * 0.28, -s * 0.42, 0, -s * 0.85); c.fill(); },
  reel: (c, s, col, alt) => { c.fillStyle = col; dot(c, 0, 0, s); c.globalCompositeOperation = "destination-out"; for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; dot(c, Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55, s * 0.2); } dot(c, 0, 0, s * 0.12); c.globalCompositeOperation = "source-over"; void alt; },
  clapper: (c, s, col, alt) => { c.fillStyle = col; c.fillRect(-s, -s * 0.28, s * 2, s * 1.1); c.save(); c.translate(-s, -s * 0.34); c.rotate(-0.2); c.fillRect(0, -s * 0.34, s * 2, s * 0.34); c.fillStyle = alt || "#fff"; for (let i = 0; i < 4; i++) { c.save(); c.transform(1, 0, -0.5, 1, s * 0.34 + i * s * 0.48, -s * 0.34); c.fillRect(0, 0, s * 0.22, s * 0.34); c.restore(); } c.restore(); },
  petal: (c, s, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, s * 0.56, s, 0, 0, TAU); c.fill(); },
  olive: (c, s, col, alt) => { c.strokeStyle = alt || col; c.lineWidth = Math.max(1, s * 0.08); c.beginPath(); c.moveTo(-s, s * 0.5); c.quadraticCurveTo(0, s * 0.1, s, -s * 0.5); c.stroke(); c.fillStyle = col; for (const [x, y, a] of [[-0.55, 0.2, -1.2], [-0.18, -0.12, -0.9], [0.22, -0.32, -0.9], [-0.25, 0.52, 2], [0.15, 0.25, 2.1], [0.55, -0.02, 2.2]]) { c.save(); c.translate(s * x, s * y); c.rotate(a); c.scale(0.28, 0.42); leafPath(c, s); c.restore(); } },
  star8: (c, s, col) => { c.fillStyle = col; c.save(); c.fillRect(-s * 0.68, -s * 0.68, s * 1.36, s * 1.36); c.rotate(Math.PI / 4); c.fillRect(-s * 0.68, -s * 0.68, s * 1.36, s * 1.36); c.restore(); },
  moon: (c, s, col) => { c.fillStyle = col; dot(c, 0, 0, s); c.globalCompositeOperation = "destination-out"; dot(c, s * 0.42, -s * 0.12, s * 0.82); c.globalCompositeOperation = "source-over"; },
  lantern: (c, s, col, alt) => { c.fillStyle = col; c.fillRect(-s * 0.06, -s, s * 0.12, s * 0.34); poly(c, [-s * 0.34, -s * 0.5, s * 0.34, -s * 0.5, s * 0.5, -s * 0.2, s * 0.42, s * 0.48, s * 0.16, s * 0.8, -s * 0.16, s * 0.8, -s * 0.42, s * 0.48, -s * 0.5, -s * 0.2]); c.fillStyle = alt || "#ffe9a8"; poly(c, [-s * 0.26, -s * 0.2, s * 0.26, -s * 0.2, s * 0.26, s * 0.42, -s * 0.26, s * 0.42]); },
  plane: (c, s, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(s, 0); c.quadraticCurveTo(s * 0.72, -s * 0.13, s * 0.3, -s * 0.13); c.lineTo(s * 0.02, -s * 0.74); c.lineTo(-s * 0.2, -s * 0.74); c.lineTo(-s * 0.06, -s * 0.13); c.lineTo(-s * 0.62, -s * 0.13); c.lineTo(-s * 0.84, -s * 0.42); c.lineTo(-s, -s * 0.42); c.lineTo(-s * 0.88, 0); c.lineTo(-s, s * 0.42); c.lineTo(-s * 0.84, s * 0.42); c.lineTo(-s * 0.62, s * 0.13); c.lineTo(-s * 0.06, s * 0.13); c.lineTo(-s * 0.2, s * 0.74); c.lineTo(s * 0.02, s * 0.74); c.lineTo(s * 0.3, s * 0.13); c.quadraticCurveTo(s * 0.72, s * 0.13, s, 0); c.fill(); },
  pin: (c, s, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, s); c.bezierCurveTo(-s, -s * 0.05, -s * 0.66, -s, 0, -s); c.bezierCurveTo(s * 0.66, -s, s, -s * 0.05, 0, s); c.fill(); c.fillStyle = "#fff"; dot(c, 0, -s * 0.34, s * 0.26); },
  cloud: (c, s, col) => { c.fillStyle = col; dot(c, -s * 0.46, s * 0.1, s * 0.36); dot(c, 0, -s * 0.1, s * 0.5); dot(c, s * 0.48, s * 0.12, s * 0.34); c.fillRect(-s * 0.46, s * 0.1, s * 0.94, s * 0.36); },
  stamp: (c, s, col) => { c.strokeStyle = col; c.lineWidth = s * 0.12; c.setLineDash([s * 0.18, s * 0.14]); c.strokeRect(-s * 0.8, -s * 0.62, s * 1.6, s * 1.24); c.setLineDash([]); c.fillStyle = col; star(c, s * 0.38, 5, 0.46); },
  bolt: (c, s, col) => { c.fillStyle = col; poly(c, [s * 0.2, -s, -s * 0.5, s * 0.14, -s * 0.06, s * 0.14, -s * 0.24, s, s * 0.52, -s * 0.22, s * 0.06, -s * 0.22]); },
  helmet: (c, s, col, alt) => { c.fillStyle = col; c.beginPath(); c.moveTo(-s * 0.76, s * 0.7); c.lineTo(-s * 0.82, -s * 0.05); c.quadraticCurveTo(-s * 0.76, -s, 0, -s); c.quadraticCurveTo(s * 0.76, -s, s * 0.82, -s * 0.05); c.lineTo(s * 0.76, s * 0.7); c.lineTo(s * 0.26, s); c.lineTo(-s * 0.26, s); c.closePath(); c.fill(); c.fillStyle = alt || "#101018"; poly(c, [-s * 0.56, -s * 0.28, s * 0.56, -s * 0.28, s * 0.42, s * 0.2, 0, s * 0.42, -s * 0.42, s * 0.2]); c.fillStyle = "#fff"; c.fillRect(-s * 0.09, -s * 0.92, s * 0.18, s * 0.58); },
  diamond: (c, s, col) => { c.fillStyle = col; poly(c, [0, -s, s * 0.7, 0, 0, s, -s * 0.7, 0]); },
  cheese: (c, s, col, alt) => { c.fillStyle = col; poly(c, [-s, s * 0.55, s, s * 0.55, s, -s * 0.15, -s * 0.5, -s * 0.55, -s, s * 0.05]); c.fillStyle = alt || "#c98a12"; dot(c, -s * 0.2, s * 0.15, s * 0.17); dot(c, s * 0.46, s * 0.12, s * 0.14); dot(c, s * 0.14, -s * 0.16, s * 0.1); },
  paw: (c, s, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(0, s * 0.3, s * 0.48, s * 0.4, 0, 0, TAU); c.fill(); for (const [x, y] of [[-0.62, -0.08], [-0.24, -0.52], [0.24, -0.52], [0.62, -0.08]]) dot(c, s * x, s * y, s * 0.2); },
  mallet: (c, s, col, alt) => { c.fillStyle = alt || "#a86a32"; c.fillRect(-s * 0.09, -s * 0.2, s * 0.18, s * 1.2); c.fillStyle = col; c.beginPath(); c.roundRect(-s * 0.72, -s * 0.8, s * 1.44, s * 0.68, s * 0.14); c.fill(); },
  star: (c, s, col) => { c.fillStyle = col; star(c, s, 5, 0.46); },
  watch: (c, s, col, alt) => { c.fillStyle = "#1a2a1a"; c.fillRect(-s * 0.46, -s, s * 0.92, s * 2); c.fillStyle = "#e9ffe6"; dot(c, 0, 0, s * 0.86); c.fillStyle = "#121a12"; dot(c, 0, 0, s * 0.72); c.fillStyle = col; poly(c, [-s * 0.46, -s * 0.52, s * 0.46, -s * 0.52, 0, 0]); poly(c, [-s * 0.46, s * 0.52, s * 0.46, s * 0.52, 0, 0]); void alt; },
  hexa: (c, s, col) => { c.strokeStyle = col; c.lineWidth = Math.max(1, s * 0.12); c.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; c[i ? "lineTo" : "moveTo"](Math.cos(a) * s * 0.9, Math.sin(a) * s * 0.9); } c.closePath(); c.stroke(); },
  shapla: (c, s, col, alt) => { c.fillStyle = col; for (let i = 0; i < 8; i++) { c.save(); c.rotate((i / 8) * TAU); c.translate(0, -s * 0.5); c.beginPath(); c.ellipse(0, 0, s * 0.2, s * 0.5, 0, 0, TAU); c.fill(); c.restore(); } c.fillStyle = alt || "#f4b400"; dot(c, 0, 0, s * 0.2); },
  kite: (c, s, col, alt) => { c.fillStyle = col; poly(c, [0, -s, s * 0.72, 0, 0, s * 0.86, -s * 0.72, 0]); c.fillStyle = alt || "#fff"; poly(c, [0, -s, s * 0.72, 0, 0, 0]); c.strokeStyle = col; c.lineWidth = s * 0.05; c.beginPath(); c.moveTo(0, s * 0.86); c.lineTo(s * 0.1, s * 1.05); c.stroke(); },
  fish: (c, s, col, alt) => { c.fillStyle = col; c.beginPath(); c.ellipse(s * 0.1, 0, s * 0.72, s * 0.34, 0, 0, TAU); c.fill(); poly(c, [-s * 0.52, 0, -s, -s * 0.38, -s, s * 0.38]); c.fillStyle = alt || "#123"; dot(c, s * 0.52, -s * 0.07, s * 0.06); },
  flake: (c, s, col) => { c.strokeStyle = col; c.lineWidth = Math.max(0.9, s * 0.09); c.lineCap = "round"; for (let i = 0; i < 6; i++) { c.save(); c.rotate((i / 6) * TAU); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -s); c.moveTo(0, -s * 0.6); c.lineTo(s * 0.24, -s * 0.84); c.moveTo(0, -s * 0.6); c.lineTo(-s * 0.24, -s * 0.84); c.stroke(); c.restore(); } },
  ember: (c, s, col) => { c.fillStyle = col; c.globalAlpha *= 0.32; dot(c, 0, 0, s); c.globalAlpha /= 0.32; dot(c, 0, 0, s * 0.4); },
  sword: (c, s, col, alt) => { c.fillStyle = col; poly(c, [0, -s, s * 0.11, -s * 0.8, s * 0.11, s * 0.4, -s * 0.11, s * 0.4, -s * 0.11, -s * 0.8]); c.fillStyle = alt || "#c7a45a"; c.fillRect(-s * 0.36, s * 0.4, s * 0.72, s * 0.09); c.fillRect(-s * 0.06, s * 0.49, s * 0.12, s * 0.36); dot(c, 0, s * 0.9, s * 0.1); },
  dragon: (c, s, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(s, -s * 0.14); c.lineTo(s * 0.58, -s * 0.16); c.quadraticCurveTo(s * 0.34, -s * 0.05, s * 0.16, -s * 0.06); c.lineTo(-s * 0.1, -s * 0.8); c.quadraticCurveTo(-s * 0.16, -s * 0.36, -s * 0.5, -s * 0.5); c.quadraticCurveTo(-s * 0.32, -s * 0.2, -s * 0.34, -s * 0.02); c.quadraticCurveTo(-s * 0.72, s * 0.06, -s, s * 0.42); c.quadraticCurveTo(-s * 0.66, s * 0.24, -s * 0.22, s * 0.2); c.quadraticCurveTo(s * 0.26, s * 0.22, s * 0.54, s * 0.02); c.closePath(); c.fill(); },
  wizhat: (c, s, col, alt) => { c.fillStyle = col; c.beginPath(); c.ellipse(0, s * 0.68, s, s * 0.22, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(-s * 0.56, s * 0.66); c.quadraticCurveTo(-s * 0.14, -s * 0.2, s * 0.32, -s); c.quadraticCurveTo(s * 0.26, -s * 0.2, s * 0.56, s * 0.66); c.closePath(); c.fill(); c.fillStyle = alt || "#e3b341"; c.fillRect(-s * 0.48, s * 0.42, s * 0.96, s * 0.12); },
  owl: (c, s, col, alt) => { c.fillStyle = col; c.beginPath(); c.ellipse(0, s * 0.08, s * 0.66, s * 0.88, 0, 0, TAU); c.fill(); poly(c, [-s * 0.56, -s * 0.46, -s * 0.46, -s, -s * 0.1, -s * 0.66]); poly(c, [s * 0.56, -s * 0.46, s * 0.46, -s, s * 0.1, -s * 0.66]); c.fillStyle = alt || "#f7efcf"; dot(c, -s * 0.25, -s * 0.28, s * 0.23); dot(c, s * 0.25, -s * 0.28, s * 0.23); c.fillStyle = "#111"; dot(c, -s * 0.25, -s * 0.28, s * 0.1); dot(c, s * 0.25, -s * 0.28, s * 0.1); },
  letter: (c, s, col, alt) => { c.fillStyle = col; c.fillRect(-s, -s * 0.66, s * 2, s * 1.32); c.strokeStyle = alt || "#7a1f26"; c.lineWidth = s * 0.07; c.beginPath(); c.moveTo(-s, -s * 0.66); c.lineTo(0, s * 0.1); c.lineTo(s, -s * 0.66); c.stroke(); c.fillStyle = alt || "#7a1f26"; dot(c, 0, s * 0.08, s * 0.17); },
  ring: (c, s, col) => { c.strokeStyle = col; c.lineWidth = Math.max(1, s * 0.12); c.beginPath(); c.arc(0, 0, s * 0.82, 0, TAU); c.stroke(); },
  ship: (c, s, col) => { c.strokeStyle = col; c.lineWidth = s * 0.14; c.beginPath(); c.arc(0, 0, s * 0.86, 0, TAU); c.stroke(); c.fillStyle = col; for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; c.fillRect(Math.cos(a) * s * 0.86 - s * 0.09, Math.sin(a) * s * 0.86 - s * 0.09, s * 0.18, s * 0.18); } },
  planet: (c, s, col, alt) => { c.fillStyle = col; dot(c, 0, 0, s * 0.62); c.strokeStyle = alt || "#fff"; c.lineWidth = s * 0.08; c.beginPath(); c.ellipse(0, 0, s, s * 0.3, -0.36, 0, TAU); c.stroke(); },
};

const cache = new Map<string, HTMLCanvasElement>();
/** Stamps a drawing centred on the current origin. Each size and colour is drawn only once. */
export function sprite(c: C, kind: string, size: number, col: string, alt = "") {
  const px = Math.max(4, Math.round(size / 2) * 2), key = `${kind}|${px}|${col}|${alt}`;
  let img = cache.get(key);
  if (!img) {
    if (cache.size > 400) cache.clear();
    img = document.createElement("canvas");
    const d = Math.ceil(px * 2.6);
    img.width = img.height = d;
    const x = img.getContext("2d");
    if (x) { x.translate(d / 2, d / 2); (SPRITES[kind] ?? SPRITES.dot)(x, px, col, alt); }
    cache.set(key, img);
  }
  c.drawImage(img, -img.width / 2, -img.height / 2);
}
