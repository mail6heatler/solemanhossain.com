// Each theme's living background, drawn on one quiet canvas behind the content (see ThemeFx.tsx).
// No libraries. Every scene is a few dozen particles, so this stays light next to the 3D hero.

import { fanBurst, hasFanScene, makeFanScene } from "./themeScenes2";
import { sprite } from "./themeArt";

export type Palette = { a: string; b: string; c: string; deep: string; fg: string };
type C = CanvasRenderingContext2D;
export type Frame = { w: number; h: number; t: number; dt: number; speed: number; scrollY: number };
export type Scene = { trails?: boolean; draw(c: C, f: Frame): void };
type Bit = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; rot: number; col: string; kind: string; sp?: string };

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;
const count = (w: number, n: number) => Math.max(6, Math.round(n * Math.min(1, w / 1200)));
const pick = <T,>(l: T[]) => l[Math.floor(Math.random() * l.length)];

// ---------- click bursts, shared by every theme ----------
const bits: Bit[] = [];
function drawBits(c: C, dt: number) {
  for (let i = bits.length - 1; i >= 0; i--) {
    const b = bits[i];
    b.life += dt;
    if (b.life < 0) continue; // a ripple that starts a moment later
    if (b.life >= b.max) { bits.splice(i, 1); continue; }
    const p = b.life / b.max;
    b.x += b.vx * dt; b.y += b.vy * dt; b.rot += dt * 3;
    if (b.kind !== "ring" && b.kind !== "ink") b.vy += 120 * dt;
    c.globalAlpha = 1 - p;
    c.fillStyle = c.strokeStyle = b.col;
    if (b.sp) { c.save(); c.translate(b.x, b.y); c.rotate(b.rot); sprite(c, b.sp, b.r, b.col); c.restore(); }
    else if (b.kind === "ring") { c.lineWidth = 2 * (1 - p); c.beginPath(); c.ellipse(b.x, b.y, b.r + p * 110, (b.r + p * 110) * 0.42, 0, 0, TAU); c.stroke(); }
    else if (b.kind === "glyph") { c.font = "13px ui-monospace, Consolas, monospace"; c.fillText(b.r > 3 ? "1" : "0", b.x, b.y); }
    else if (b.kind === "pixel") c.fillRect(b.x, b.y, b.r + 1, b.r + 1);
    else if (b.kind === "ink") { c.globalAlpha = (1 - p) * 0.8; c.beginPath(); c.arc(b.x, b.y, b.r * Math.min(1, p * 8), 0, TAU); c.fill(); }
    else if (b.kind === "leaf") leaf(c, b.x, b.y, b.r * 1.6, b.rot);
    else if (b.kind === "strip") { c.save(); c.translate(b.x, b.y); c.rotate(b.rot); c.fillRect(-b.r, -1.5, b.r * 2, 3); c.restore(); }
    else { c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.fill(); }
  }
  c.globalAlpha = 1;
}
function spray(x: number, y: number, kind: string, cols: string[], n = 14, speed = 150) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU), s = rnd(speed * 0.3, speed);
    bits.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0, max: rnd(0.7, 1.3), r: rnd(1.5, 5), rot: rnd(0, TAU), col: pick(cols), kind });
  }
}

function leaf(c: C, x: number, y: number, s: number, rot: number) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.beginPath(); c.moveTo(0, -s); c.quadraticCurveTo(s * 0.8, 0, 0, s); c.quadraticCurveTo(-s * 0.8, 0, 0, -s); c.fill();
  c.restore();
}

// ---------- 🌙 Night: twinkling stars and the odd shooting star ----------
function night(p: Palette, w: number, h: number): Scene {
  const stars = Array.from({ length: count(w, 110) }, () => ({ x: rnd(0, w), y: rnd(0, h), r: rnd(0.4, 1.7), ph: rnd(0, TAU), sp: rnd(0.6, 2) }));
  let shoot = { x: 0, y: 0, vx: 0, vy: 0, life: 0 }, wait = 3;
  return {
    draw(c, f) {
      for (const s of stars) {
        const y = ((s.y - f.scrollY * 0.03 * s.r) % f.h + f.h) % f.h;
        c.globalAlpha = 0.25 + 0.55 * Math.abs(Math.sin(f.t * s.sp + s.ph));
        c.fillStyle = s.r > 1.3 ? p.a : "#ffffff";
        c.beginPath(); c.arc(s.x, y, s.r, 0, TAU); c.fill();
      }
      wait -= f.dt;
      if (wait <= 0 && shoot.life <= 0) { shoot = { x: rnd(0, f.w * 0.7), y: rnd(0, f.h * 0.4), vx: rnd(500, 800), vy: rnd(160, 300), life: 1 }; wait = rnd(5, 11); }
      if (shoot.life > 0) {
        shoot.life -= f.dt * 1.5; shoot.x += shoot.vx * f.dt; shoot.y += shoot.vy * f.dt;
        const g = c.createLinearGradient(shoot.x, shoot.y, shoot.x - shoot.vx * 0.16, shoot.y - shoot.vy * 0.16);
        g.addColorStop(0, p.a); g.addColorStop(1, "transparent");
        c.globalAlpha = Math.max(0, shoot.life); c.strokeStyle = g; c.lineWidth = 2;
        c.beginPath(); c.moveTo(shoot.x, shoot.y); c.lineTo(shoot.x - shoot.vx * 0.16, shoot.y - shoot.vy * 0.16); c.stroke();
      }
      c.globalAlpha = 1;
    },
  };
}

// ---------- ☀️ Day: warm light and drifting dust ----------
function day(p: Palette, w: number, h: number): Scene {
  const motes = Array.from({ length: count(w, 46) }, () => ({ x: rnd(0, w), y: rnd(0, h), r: rnd(1, 3.2), ph: rnd(0, TAU), v: rnd(6, 20) }));
  return {
    draw(c, f) {
      const g = c.createRadialGradient(f.w * 0.88, 0, 0, f.w * 0.88, 0, f.h * 0.75);
      g.addColorStop(0, "rgba(255,214,120,.16)"); g.addColorStop(1, "rgba(255,214,120,0)");
      c.fillStyle = g; c.fillRect(0, 0, f.w, f.h);
      c.fillStyle = p.deep;
      for (const m of motes) {
        m.y -= m.v * f.dt; m.x += Math.sin(f.t * 0.6 + m.ph) * 0.25;
        if (m.y < -6) { m.y = f.h + 6; m.x = rnd(0, f.w); }
        c.globalAlpha = 0.16 + 0.16 * Math.sin(f.t + m.ph);
        c.beginPath(); c.arc(m.x, m.y, m.r, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
    },
  };
}

// ---------- 🎈 Playful: shapes tumbling down ----------
function playful(p: Palette, w: number, h: number): Scene {
  const cols = [p.a, p.b, p.c];
  const list = Array.from({ length: count(w, 24) }, (_, i) => ({ x: rnd(0, w), y: rnd(0, h), s: rnd(5, 12), rot: rnd(0, TAU), v: rnd(14, 38), vr: rnd(-1.4, 1.4), col: pick(cols), k: i % 4, ph: rnd(0, TAU) }));
  return {
    draw(c, f) {
      for (const o of list) {
        o.y += o.v * f.dt * (1 + Math.min(3, Math.abs(f.speed) * 0.04)); o.rot += o.vr * f.dt; o.x += Math.sin(f.t + o.ph) * 0.35;
        if (o.y > f.h + 20) { o.y = -20; o.x = rnd(0, f.w); }
        c.save(); c.translate(o.x, o.y); c.rotate(o.rot); c.globalAlpha = 0.5; c.fillStyle = c.strokeStyle = o.col; c.lineWidth = 3;
        c.beginPath();
        if (o.k === 0) { c.arc(0, 0, o.s, 0, TAU); c.fill(); }
        else if (o.k === 1) { c.moveTo(0, -o.s); c.lineTo(o.s, o.s); c.lineTo(-o.s, o.s); c.closePath(); c.fill(); }
        else if (o.k === 2) { c.rect(-o.s * 0.8, -o.s * 0.8, o.s * 1.6, o.s * 1.6); c.fill(); }
        else { c.moveTo(-o.s * 1.3, 0); c.quadraticCurveTo(-o.s * 0.6, -o.s, 0, 0); c.quadraticCurveTo(o.s * 0.6, o.s, o.s * 1.3, 0); c.stroke(); }
        c.restore();
      }
      c.globalAlpha = 1;
    },
  };
}

// ---------- 💻 Techy: falling code, and a fake break-in running in the corner ----------
const HACK = [
  "$ ssh guest@chronicle.local", "connecting to 10.0.13.37 ...", "[ok] handshake complete", "$ nmap -sV life.chronicle",
  "22/tcp   open  memories", "443/tcp  open  adventures", "$ sudo decrypt --target=stories", "[#####.....] 52%", "[##########] 100%",
  "ACCESS GRANTED", "welcome, visitor. look around :)", "$ _",
];
function techy(p: Palette, w: number, h: number): Scene {
  const size = 15, cols = Math.ceil(w / size), glyphs = "01アカサタナハマヤラワ<>{}#$%&*+=/\\";
  const drops = Array.from({ length: cols }, () => ({ y: rnd(-h, 0), v: rnd(70, 190), on: Math.random() < 0.42 }));
  let line = 0, ch = 0, wait = 1.2;
  return {
    trails: true,
    draw(c, f) {
      c.font = `${size - 2}px ui-monospace, Consolas, monospace`;
      drops.forEach((d, i) => {
        if (!d.on) return;
        const before = Math.floor(d.y / size);
        d.y += d.v * f.dt * (1 + Math.min(4, Math.abs(f.speed) * 0.05));
        if (Math.floor(d.y / size) !== before && d.y > 0) {
          c.globalAlpha = 0.6; c.fillStyle = "#d9ffe9";
          c.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], i * size, d.y);
          c.globalAlpha = 0.3; c.fillStyle = p.a;
          c.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], i * size, d.y - size);
        }
        if (d.y > f.h + 40) { d.y = rnd(-200, 0); d.v = rnd(70, 190); d.on = Math.random() < 0.42; }
      });
      if (f.w > 980) {
        wait -= f.dt;
        if (wait <= 0) {
          ch += 2;
          if (ch >= HACK[line].length) { ch = 0; line++; wait = HACK[line - 1].startsWith("ACCESS") ? 2.4 : 0.55; if (line >= HACK.length) { line = 0; wait = 5; } }
          else wait = 0.03;
        }
        c.font = "12px ui-monospace, Consolas, monospace";
        const x = f.w - 310, top = 96, shown = [...HACK.slice(Math.max(0, line - 6), line), HACK[line].slice(0, ch)];
        shown.forEach((t, i) => {
          const hot = t.startsWith("ACCESS");
          c.globalAlpha = hot ? 0.95 : 0.6; c.fillStyle = hot ? "#ffffff" : p.a;
          c.fillText(t, x, top + i * 17);
        });
      }
      c.globalAlpha = 1;
    },
  };
}

// ---------- 🕹️ Retro: an endless neon grid under the page ----------
function retro(p: Palette, w: number, h: number): Scene {
  const stars = Array.from({ length: count(w, 70) }, () => ({ x: rnd(0, w), y: rnd(0, h * 0.68), r: rnd(0.5, 1.5), ph: rnd(0, TAU) }));
  let off = 0;
  return {
    draw(c, f) {
      for (const s of stars) { c.globalAlpha = 0.2 + 0.5 * Math.abs(Math.sin(f.t * 1.4 + s.ph)); c.fillStyle = "#fff"; c.fillRect(s.x, s.y, s.r * 1.4, s.r * 1.4); }
      const hz = f.h * 0.7, floor = f.h - hz, cx = f.w / 2;
      off = (off + f.dt * (0.28 + Math.min(2.4, Math.abs(f.speed) * 0.03))) % 1;
      // the sun appears once you've left the hero, which has its own
      const away = Math.min(1, Math.max(0, (f.scrollY - f.h * 0.7) / (f.h * 0.5)));
      if (away > 0) {
        const r = Math.min(f.w, f.h) * 0.17, x = f.w * 0.8;
        const g = c.createLinearGradient(0, hz - r, 0, hz);
        g.addColorStop(0, p.c); g.addColorStop(1, p.a);
        c.globalAlpha = 0.34 * away; c.fillStyle = g;
        c.beginPath(); c.arc(x, hz, r, Math.PI, 0); c.fill();
      }
      // a wide faint line under a thin bright one gives the neon glow at a fraction of the cost of a canvas shadow
      c.strokeStyle = p.a;
      for (let i = 0; i < 11; i++) {
        const z = (i + off) / 11, y = hz + floor * z * z;
        c.lineWidth = 5; c.globalAlpha = 0.11 * z; c.beginPath(); c.moveTo(0, y); c.lineTo(f.w, y); c.stroke();
        c.lineWidth = 1.2; c.globalAlpha = 0.5 * z; c.stroke();
      }
      c.strokeStyle = p.b; c.lineWidth = 1.2;
      for (let i = -14; i <= 14; i++) {
        c.globalAlpha = 0.24; c.beginPath(); c.moveTo(cx + i * 22, hz); c.lineTo(cx + i * (f.w / 7), f.h); c.stroke();
      }
      c.globalAlpha = 1;
    },
  };
}

// ---------- 🌊 Ocean: real rolling waves, bubbles and light from above ----------
function ocean(p: Palette, w: number, h: number): Scene {
  const bubbles = Array.from({ length: count(w, 34) }, () => ({ x: rnd(0, w), y: rnd(0, h), r: rnd(1.5, 7), v: rnd(16, 52), ph: rnd(0, TAU) }));
  const wave = (c: C, f: Frame, base: number, amp: number, k: number, sp: number, col: string, a: number, foam: boolean) => {
    const amp2 = amp * (1 + Math.min(1.3, Math.abs(f.speed) * 0.025));
    const y = (x: number) => f.h - base + Math.sin(x * k + f.t * sp) * amp2 + Math.sin(x * k * 2.3 - f.t * sp * 0.7) * amp2 * 0.32;
    c.beginPath(); c.moveTo(0, f.h);
    for (let x = 0; x <= f.w + 14; x += 14) c.lineTo(x, y(x));
    c.lineTo(f.w, f.h); c.closePath();
    c.globalAlpha = a; c.fillStyle = col; c.fill();
    if (foam) {
      c.beginPath();
      for (let x = 0; x <= f.w + 14; x += 14) x === 0 ? c.moveTo(x, y(x)) : c.lineTo(x, y(x));
      c.globalAlpha = 0.55; c.strokeStyle = "#dffcff"; c.lineWidth = 1.6; c.stroke();
    }
  };
  return {
    draw(c, f) {
      for (let i = 0; i < 5; i++) { // light shafts
        const x = (i + 0.5) * (f.w / 5) + Math.sin(f.t * 0.2 + i) * 60, sway = 90 + 40 * Math.sin(f.t * 0.17 + i * 2);
        const g = c.createLinearGradient(0, 0, 0, f.h * 0.75);
        g.addColorStop(0, p.a); g.addColorStop(1, "transparent");
        c.globalAlpha = 0.05 + 0.03 * Math.sin(f.t * 0.5 + i * 1.7); c.fillStyle = g;
        c.beginPath(); c.moveTo(x - 30, 0); c.lineTo(x + 30, 0); c.lineTo(x + sway + 70, f.h * 0.75); c.lineTo(x + sway - 70, f.h * 0.75); c.closePath(); c.fill();
      }
      c.strokeStyle = "#dffcff"; c.lineWidth = 1;
      for (const b of bubbles) {
        b.y -= b.v * f.dt; b.x += Math.sin(f.t * 1.5 + b.ph) * 0.4;
        if (b.y < -10) { b.y = f.h + 10; b.x = rnd(0, f.w); }
        c.globalAlpha = 0.34; c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.stroke();
        c.globalAlpha = 0.5; c.fillStyle = "#fff"; c.beginPath(); c.arc(b.x - b.r * 0.32, b.y - b.r * 0.32, b.r * 0.2, 0, TAU); c.fill();
      }
      wave(c, f, 118, 15, 0.0075, 0.8, p.b, 0.16, false);
      wave(c, f, 84, 18, 0.0105, -1.1, p.a, 0.2, false);
      wave(c, f, 48, 13, 0.0145, 1.45, p.a, 0.32, true);
      c.globalAlpha = 1;
    },
  };
}

// ---------- 🌅 Sunset: the sun climbs with your scroll, embers rise, birds pass ----------
function sunset(p: Palette, w: number, h: number): Scene {
  const embers = Array.from({ length: count(w, 42) }, () => ({ x: rnd(0, w), y: rnd(0, h), r: rnd(0.8, 2.4), v: rnd(14, 46), ph: rnd(0, TAU), col: Math.random() < 0.5 ? p.a : p.b }));
  let bird = rnd(-300, -60), wait = 2;
  return {
    draw(c, f) {
      const r = Math.min(f.w, f.h) * 0.3, sy = f.h + r * 0.15 - Math.min(0.42, (f.scrollY / Math.max(1, f.h * 7)) * 0.9) * f.h;
      const g = c.createRadialGradient(f.w * 0.5, sy, r * 0.5, f.w * 0.5, sy, r * 2.5);
      g.addColorStop(0, "rgba(255,170,95,.36)"); g.addColorStop(1, "rgba(255,120,90,0)");
      c.fillStyle = g; c.fillRect(0, 0, f.w, f.h);
      c.globalAlpha = 0.34; c.fillStyle = p.b;
      c.beginPath(); c.arc(f.w * 0.5, sy, r, 0, TAU); c.fill();
      for (const e of embers) {
        e.y -= e.v * f.dt; e.x += Math.sin(f.t + e.ph) * 0.4;
        if (e.y < -6) { e.y = f.h + 6; e.x = rnd(0, f.w); }
        c.globalAlpha = 0.3 + 0.45 * Math.abs(Math.sin(f.t * 2 + e.ph)); c.fillStyle = e.col;
        c.beginPath(); c.arc(e.x, e.y, e.r, 0, TAU); c.fill();
      }
      wait -= f.dt;
      if (wait <= 0) {
        bird += f.dt * 70;
        c.globalAlpha = 0.6; c.strokeStyle = "#1d0d22"; c.lineWidth = 1.8;
        for (let i = 0; i < 6; i++) {
          const x = bird - i * 26 - (i % 2) * 8, y = f.h * 0.27 + i * 11 + Math.sin(f.t + i) * 3, fl = 5 + Math.sin(f.t * 7 + i) * 3.5;
          c.beginPath(); c.moveTo(x - 8, y - fl); c.quadraticCurveTo(x - 3, y - 1, x, y); c.quadraticCurveTo(x + 3, y - 1, x + 8, y - fl); c.stroke();
        }
        if (bird > f.w + 220) { bird = rnd(-300, -60); wait = rnd(6, 14); }
      }
      c.globalAlpha = 1;
    },
  };
}

// ---------- 🌲 Forest: falling leaves and fireflies ----------
function forest(p: Palette, w: number, h: number): Scene {
  const cols = [p.a, p.deep, p.c];
  const leaves = Array.from({ length: count(w, 24) }, () => ({ x: rnd(0, w), y: rnd(0, h), s: rnd(5, 11), rot: rnd(0, TAU), v: rnd(20, 48), ph: rnd(0, TAU), col: pick(cols) }));
  const flies = Array.from({ length: count(w, 16) }, () => ({ x: rnd(0, w), y: rnd(h * 0.3, h), ph: rnd(0, TAU) }));
  return {
    draw(c, f) {
      for (const l of leaves) {
        l.y += l.v * f.dt * (1 + Math.min(3, Math.abs(f.speed) * 0.04)); l.x += Math.sin(f.t * 0.9 + l.ph) * 0.7; l.rot += Math.sin(f.t * 0.8 + l.ph) * f.dt * 1.6;
        if (l.y > f.h + 14) { l.y = -14; l.x = rnd(0, f.w); }
        c.globalAlpha = 0.5; c.fillStyle = l.col; leaf(c, l.x, l.y, l.s, l.rot);
      }
      for (const fl of flies) {
        fl.x += Math.sin(f.t * 0.5 + fl.ph) * 0.45; fl.y += Math.cos(f.t * 0.4 + fl.ph * 2) * 0.35;
        const a = 0.5 * Math.max(0, Math.sin(f.t * 1.4 + fl.ph));
        const g = c.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, 11);
        g.addColorStop(0, "rgba(232,244,120,.95)"); g.addColorStop(1, "rgba(232,244,120,0)");
        c.globalAlpha = a; c.fillStyle = g; c.fillRect(fl.x - 11, fl.y - 11, 22, 22);
      }
      c.globalAlpha = 1;
    },
  };
}

// ---------- 📰 Paper: scraps drifting, and a paper plane crossing now and then ----------
function paper(p: Palette, w: number, h: number): Scene {
  const scraps = Array.from({ length: count(w, 14) }, () => {
    const s = rnd(7, 17);
    return { x: rnd(0, w), y: rnd(0, h), s, rot: rnd(0, TAU), vr: rnd(-0.7, 0.7), v: rnd(10, 26), ph: rnd(0, TAU), pts: Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * TAU; return [Math.cos(a) * s * rnd(0.6, 1.1), Math.sin(a) * s * rnd(0.6, 1.1)]; }) };
  });
  let px = -200, wait = 1.5, py = 0;
  return {
    draw(c, f) {
      c.lineWidth = 1;
      for (const s of scraps) {
        s.y += s.v * f.dt; s.x += Math.sin(f.t * 0.7 + s.ph) * 0.5; s.rot += s.vr * f.dt;
        if (s.y > f.h + 24) { s.y = -24; s.x = rnd(0, f.w); }
        c.save(); c.translate(s.x, s.y); c.rotate(s.rot); c.globalAlpha = 0.65;
        c.fillStyle = "#fffdf6"; c.strokeStyle = "rgba(20,20,20,.38)";
        c.beginPath(); s.pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(-s.s * 0.45, -s.s * 0.15); c.lineTo(s.s * 0.45, -s.s * 0.15); c.moveTo(-s.s * 0.45, s.s * 0.2); c.lineTo(s.s * 0.3, s.s * 0.2); c.stroke();
        c.restore();
      }
      wait -= f.dt;
      if (wait <= 0) {
        if (px < -100) py = rnd(f.h * 0.15, f.h * 0.5);
        px += f.dt * 190;
        const y = py + Math.sin(px * 0.009) * 46, slope = Math.cos(px * 0.009) * 0.4;
        c.globalAlpha = 0.5; c.strokeStyle = p.fg; c.setLineDash([3, 7]); c.lineWidth = 1.2;
        c.beginPath();
        for (let i = 0; i < 26; i++) { const x = px - i * 12; const yy = py + Math.sin(x * 0.009) * 46; i ? c.lineTo(x, yy) : c.moveTo(x, yy); }
        c.stroke(); c.setLineDash([]);
        c.save(); c.translate(px, y); c.rotate(slope); c.globalAlpha = 0.95; c.fillStyle = "#fffdf6"; c.strokeStyle = p.fg;
        c.beginPath(); c.moveTo(24, 0); c.lineTo(-18, -14); c.lineTo(-8, 0); c.lineTo(-18, 12); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(24, 0); c.lineTo(-8, 0); c.stroke();
        c.restore();
        if (px > f.w + 330) { px = -200; wait = rnd(5, 11); }
      }
      c.globalAlpha = 1;
    },
  };
}

// ---------- 🍬 Candy: soap bubbles and sprinkles ----------
function candy(p: Palette, w: number, h: number): Scene {
  const cols = [p.a, p.b, p.c];
  const bubs = Array.from({ length: count(w, 18) }, () => ({ x: rnd(0, w), y: rnd(0, h), r: rnd(7, 24), v: rnd(12, 34), ph: rnd(0, TAU), col: pick(cols) }));
  const spr = Array.from({ length: count(w, 30) }, () => ({ x: rnd(0, w), y: rnd(0, h), rot: rnd(0, TAU), vr: rnd(-1.5, 1.5), v: rnd(16, 40), col: pick(cols) }));
  return {
    draw(c, f) {
      for (const b of bubs) {
        b.y -= b.v * f.dt; b.x += Math.sin(f.t * 0.8 + b.ph) * 0.5;
        if (b.y < -30) { b.y = f.h + 30; b.x = rnd(0, f.w); }
        c.globalAlpha = 0.5; c.strokeStyle = b.col; c.lineWidth = 1.5;
        c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.stroke();
        c.globalAlpha = 0.14; c.fillStyle = b.col; c.fill();
        c.globalAlpha = 0.85; c.fillStyle = "#fff"; c.beginPath(); c.arc(b.x - b.r * 0.34, b.y - b.r * 0.36, b.r * 0.17, 0, TAU); c.fill();
      }
      for (const s of spr) {
        s.y += s.v * f.dt; s.rot += s.vr * f.dt;
        if (s.y > f.h + 8) { s.y = -8; s.x = rnd(0, f.w); }
        c.save(); c.translate(s.x, s.y); c.rotate(s.rot); c.globalAlpha = 0.72; c.fillStyle = s.col;
        c.beginPath(); c.roundRect(-6, -1.75, 12, 3.5, 2); c.fill(); c.restore();
      }
      c.globalAlpha = 1;
    },
  };
}

const SCENES: Record<string, (p: Palette, w: number, h: number) => Scene> = { night, day, playful, techy, retro, ocean, sunset, forest, paper, candy };
export const makeScene = (skin: string, p: Palette, w: number, h: number) => (hasFanScene(skin) ? makeFanScene(skin, p, w, h) : (SCENES[skin] ?? night)(p, w, h));
export const drawBursts = drawBits;

/** What a click does on each theme. */
export function clickBurst(skin: string, p: Palette, x: number, y: number) {
  const fan = fanBurst(skin, p);
  if (fan) {
    for (let i = 0; i < fan.n && bits.length < 120; i++) {
      const a = rnd(0, TAU), s = rnd(fan.speed * 0.3, fan.speed);
      bits.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0, max: rnd(0.7, 1.3), r: rnd(fan.size * 0.7, fan.size * 1.2), rot: rnd(0, TAU), col: pick(fan.cols), kind: "fan", sp: pick(fan.kinds) });
    }
    return;
  }
  const cols = [p.a, p.b, p.c];
  if (skin === "ocean") { for (let i = 0; i < 3; i++) bits.push({ x, y, vx: 0, vy: 0, life: -i * 0.16, max: 1.1, r: 6, rot: 0, col: "#dffcff", kind: "ring" }); spray(x, y, "dot", ["#dffcff"], 5, 70); }
  else if (skin === "techy") spray(x, y, "glyph", [p.a, "#d9ffe9"], 18, 190);
  else if (skin === "retro") spray(x, y, "pixel", cols, 20, 230);
  else if (skin === "paper") spray(x, y, "ink", [p.fg, p.a], 11, 70);
  else if (skin === "forest") spray(x, y, "leaf", [p.a, p.deep, p.c], 12, 150);
  else if (skin === "candy" || skin === "playful") spray(x, y, "strip", cols, 18, 210);
  else spray(x, y, "dot", cols, 12, 150);
}
