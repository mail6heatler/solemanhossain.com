// The WebGL particle sculpture behind the hero. Loaded on demand (three.js is never in the first page load).
// One Points cloud whose particles morph between six shapes in the vertex shader, so moving ~20k particles costs
// the CPU almost nothing. Colours come from the current theme; see HeroScene.tsx for when this runs at all.
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group, NormalBlending,
  PerspectiveCamera, Points, Scene, ShaderMaterial, Vector3, WebGLRenderer,
} from "three";

export type SceneColors = { a: string; b: string; c: string; light: boolean };
export type HeroSceneHandle = {
  setColors(c: SceneColors): void;
  next(): void;
  pointer(ndcX: number, ndcY: number, on: boolean): void;
  pulse(ndcX: number, ndcY: number): void;
  scroll(p: number): void;
  resize(): void;
  play(): void;
  pause(): void;
  destroy(): void;
};

const TAU = Math.PI * 2;

// ---------- shapes: each fills a Float32Array of n xyz points, roughly within radius 1.8 ----------
function sphere(n: number) {
  const o = new Float32Array(n * 3);
  const g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), t = g * i;
    const R = 1.62 + (Math.random() - 0.5) * 0.08;
    o[i * 3] = Math.cos(t) * r * R; o[i * 3 + 1] = y * R; o[i * 3 + 2] = Math.sin(t) * r * R;
  }
  return o;
}
function knot(n: number) {
  const o = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU * 3, a = Math.random() * TAU, tube = 0.2 + Math.random() * 0.08;
    const r = 2 + Math.cos(1.5 * t);
    const x = r * Math.cos(t), y = r * Math.sin(t), z = Math.sin(1.5 * t) * 1.15;
    o[i * 3] = x * 0.56 + Math.cos(a) * tube; o[i * 3 + 1] = y * 0.56 + Math.sin(a) * tube; o[i * 3 + 2] = z * 0.56 + Math.sin(a * 2) * tube;
  }
  return o;
}
function helix(n: number) {
  const o = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random(), t = u * TAU * 2.6, y = (u - 0.5) * 3.8, k = i % 5;
    if (k === 0) { // rungs between the two strands
      const f = Math.random() * 2 - 1;
      o[i * 3] = Math.cos(t) * 0.95 * f; o[i * 3 + 1] = y; o[i * 3 + 2] = Math.sin(t) * 0.95 * f;
    } else {
      const s = k % 2 ? 0 : Math.PI, j = 0.05;
      o[i * 3] = Math.cos(t + s) * 0.95 + (Math.random() - 0.5) * j; o[i * 3 + 1] = y + (Math.random() - 0.5) * j; o[i * 3 + 2] = Math.sin(t + s) * 0.95 + (Math.random() - 0.5) * j;
    }
  }
  return o;
}
function galaxy(n: number) {
  const o = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = Math.pow(Math.random(), 0.65) * 2.25, arm = (i % 4) * (TAU / 4), a = arm + r * 1.9 + (Math.random() - 0.5) * (0.65 - r * 0.15);
    const x = Math.cos(a) * r, z = Math.sin(a) * r, y = (Math.random() - 0.5) * 0.22 * (2.4 - r);
    o[i * 3] = x; o[i * 3 + 1] = y * 0.9 + z * 0.42; o[i * 3 + 2] = z * 0.9 - y * 0.42;
  }
  return o;
}
function wave(n: number) {
  const o = new Float32Array(n * 3);
  const side = Math.ceil(Math.sqrt(n));
  for (let i = 0; i < n; i++) {
    const x = ((i % side) / (side - 1) - 0.5) * 4.2, z = (Math.floor(i / side) / (side - 1) - 0.5) * 4.2;
    const y = Math.sin(x * 1.7) * 0.32 + Math.cos(z * 2.1 + x) * 0.3;
    o[i * 3] = x; o[i * 3 + 1] = y * 0.9 + z * 0.4; o[i * 3 + 2] = z * 0.8 - y * 0.3;
  }
  return o;
}
function cube(n: number) {
  const o = new Float32Array(n * 3);
  const S = 1.22;
  for (let i = 0; i < n; i++) {
    const axis = i % 3, f = Math.random() < 0.5 ? -S : S;
    const p = [(Math.round(Math.random() * 6) / 6) * 2 * S - S, (Math.random() * 2 - 1) * S];
    if (Math.random() < 0.5) p.reverse();
    const v = axis === 0 ? [f, p[0], p[1]] : axis === 1 ? [p[0], f, p[1]] : [p[0], p[1], f];
    o[i * 3] = v[0]; o[i * 3 + 1] = v[1]; o[i * 3 + 2] = v[2];
  }
  return o;
}
const SHAPES = [sphere, knot, helix, galaxy, cube, wave];

const VERT = /* glsl */ `
  attribute vec3 aA;
  attribute vec3 aB;
  attribute vec4 aR;
  uniform float uT, uMorph, uScatter, uPulse, uPx, uSize, uHover;
  uniform vec3 uMouse, uPulseAt;
  varying float vH;
  varying float vGlow;
  void main() {
    // every particle starts and ends its trip at a slightly different time, so shapes dissolve instead of sliding
    float m = smoothstep(aR.x * 0.4, 0.6 + aR.x * 0.4, uMorph);
    m = m * m * (3.0 - 2.0 * m);
    vec3 dir = normalize(aR.yzw - 0.5 + 0.001);
    vec3 p = mix(aA, aB, m) + dir * sin(m * 3.14159) * 0.75;
    p += 0.045 * vec3(sin(uT * 0.7 + p.y * 2.2 + aR.x * 6.28), cos(uT * 0.6 + p.z * 2.2 + aR.y * 6.28), sin(uT * 0.5 + p.x * 2.2 + aR.z * 6.28));
    p += dir * uScatter * (2.0 + aR.w * 6.0);

    vec4 world = modelMatrix * vec4(p, 1.0);
    // particles part around the mouse
    vec2 toM = world.xy - uMouse.xy;
    float near = smoothstep(1.35, 0.0, length(toM)) * uHover;
    world.xy += normalize(toM + 0.0001) * near * 0.62;
    world.z += near * 0.75;
    // a shock wave rolls out from a click
    float r = length(world.xy - uPulseAt.xy);
    float ring = uPulse > 0.0 ? exp(-pow((r - uPulse * 5.2) * 2.3, 2.0)) * (1.0 - uPulse) : 0.0;
    world.xyz += vec3(normalize(world.xy - uPulseAt.xy + 0.0001), 0.5) * ring * 0.9;

    vec4 mv = viewMatrix * world;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPx * (0.55 + aR.z * 1.05) * (1.0 + near * 1.3 + ring * 2.4) / -mv.z;
    vH = clamp(0.5 + (mix(aA, aB, m).y + mix(aA, aB, m).x * 0.5) * 0.24 + (aR.w - 0.5) * 0.2, 0.0, 1.0);
    vGlow = near + ring;
  }`;

const FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uC1, uC2, uC3;
  uniform float uAlpha;
  varying float vH;
  varying float vGlow;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float s = smoothstep(0.5, 0.08, d);
    vec3 c = mix(mix(uC1, uC2, smoothstep(0.0, 0.6, vH)), uC3, smoothstep(0.6, 1.0, vH));
    gl_FragColor = vec4(c + vGlow * 0.35, s * uAlpha * (0.7 + vGlow));
  }`;

export function createHeroScene(canvas: HTMLCanvasElement, opts: { count: number; colors: SceneColors; align: () => { x: number; y: number } | null; delay?: number }): HeroSceneHandle {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "low-power" });
  renderer.setClearColor(0x000000, 0);
  let dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(dpr);

  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 40);
  camera.position.z = 6.5;

  const n = opts.count;
  const attrs = SHAPES.map((s) => new BufferAttribute(s(n), 3));
  const rand = new Float32Array(n * 4);
  for (let i = 0; i < rand.length; i++) rand[i] = Math.random();
  const geo = new BufferGeometry();
  geo.setAttribute("position", attrs[0]); // three needs one, the shader uses aA / aB
  geo.setAttribute("aA", attrs[0]);
  geo.setAttribute("aB", attrs[1]);
  geo.setAttribute("aR", new BufferAttribute(rand, 4));
  geo.boundingSphere = null;

  const u = {
    uT: { value: 0 }, uMorph: { value: 0 }, uScatter: { value: 1 }, uPulse: { value: 0 }, uPx: { value: 1 }, uSize: { value: 17 }, uHover: { value: 0 }, uAlpha: { value: 0.8 },
    uMouse: { value: new Vector3() }, uPulseAt: { value: new Vector3() },
    uC1: { value: new Color() }, uC2: { value: new Color() }, uC3: { value: new Color() },
  };
  const mat = new ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: u, transparent: true, depthWrite: false, depthTest: false });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  const group = new Group();
  group.add(points);
  scene.add(group);

  let baseAlpha = 0.8, wide = true, vW = 8, vH = 5;
  const applyColors = (c: SceneColors) => {
    u.uC1.value.set(c.a); u.uC2.value.set(c.b); u.uC3.value.set(c.c);
    mat.blending = c.light ? NormalBlending : AdditiveBlending;
    baseAlpha = c.light ? 0.85 : 0.72;
    mat.needsUpdate = true;
  };
  applyColors(opts.colors);

  // where the sculpture sits: around the photo on wide screens, up and to the side on phones
  let baseX = 0, baseY = 0, baseScale = 1;
  const resize = () => {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    vH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    vW = vH * camera.aspect;
    wide = w >= 761;
    u.uPx.value = dpr * Math.min(1.2, Math.max(0.75, h / 800));
    const spot = wide ? opts.align() : null;
    if (spot) { baseX = (spot.x - 0.5) * vW; baseY = -(spot.y - 0.5) * vH; baseScale = Math.min(0.8, (vH / 5) * 0.74); }
    else { baseX = wide ? vW * 0.24 : vW * 0.2; baseY = wide ? 0 : vH * 0.27; baseScale = wide ? 0.74 : 0.56; }
  };
  resize();

  // ---------- animation state ----------
  let raf = 0, running = false, last = 0, time = 0;
  let cur = 0, morphing = false, morphT = 0, sinceMorph = 0;
  let intro = 1, introWait = (opts.delay ?? 0) / 1000;
  let mx = 0, my = 0, tmx = 0, tmy = 0, hover = 0, thover = 0, scroll = 0, smooth = 0, pulse = -1, spin = 0;
  const MORPH_TIME = 2.6, HOLD = 7.5;

  const next = () => {
    if (morphing) return;
    morphing = true; morphT = 0; sinceMorph = 0;
  };
  const toWorld = (x: number, y: number) => ({ x: (x * vW) / 2, y: (y * vH) / 2 });

  // slow machines: give up detail rather than smoothness
  let frames = 0, slow = 0, downgraded = 0;
  const watch = (dt: number) => {
    frames++;
    if (dt > 1 / 30) slow++;
    if (frames < 90) return;
    if (slow > 45 && downgraded < 2) {
      downgraded++;
      if (downgraded === 1) { dpr = 1; renderer.setPixelRatio(1); resize(); }
      else geo.setDrawRange(0, Math.floor(n * 0.5));
    }
    frames = 0; slow = 0;
  };

  const frame = (t: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016);
    last = t;
    watch(dt);
    time += dt;
    sinceMorph += dt;
    if (introWait > 0) introWait -= dt;
    else intro = Math.max(0, intro - dt * 0.62);
    if (!morphing && sinceMorph > HOLD) next();
    if (morphing) {
      morphT += dt / MORPH_TIME;
      if (morphT >= 1) {
        morphing = false; morphT = 0; cur = (cur + 1) % SHAPES.length;
        geo.setAttribute("aA", attrs[cur]);
        geo.setAttribute("aB", attrs[(cur + 1) % SHAPES.length]);
      }
    }
    mx += (tmx - mx) * 0.09; my += (tmy - my) * 0.09;
    hover += (thover - hover) * 0.07;
    smooth += (scroll - smooth) * 0.12;
    if (pulse >= 0) { pulse += dt / 1.5; if (pulse >= 1) pulse = -1; }

    // intro: particles fly in from far away and assemble on arrival
    u.uT.value = time;
    u.uMorph.value = morphT;
    u.uScatter.value = Math.pow(intro, 2) * 1.2 + smooth * smooth * 1.25;
    u.uPulse.value = Math.max(0, pulse);
    u.uHover.value = hover;
    u.uMouse.value.set((mx * vW) / 2, (my * vH) / 2, 0);
    u.uAlpha.value = baseAlpha * (wide ? 1 : 0.7) * (1 - intro * 0.9) * (1 - smooth * 0.85);

    spin += dt * (0.14 + smooth * 1.4);
    group.rotation.y = spin + mx * 0.45;
    group.rotation.x = -my * 0.32 + Math.sin(time * 0.2) * 0.06 + smooth * 0.5;
    group.position.set(baseX + mx * 0.12, baseY + my * 0.1 + smooth * 1.1, 0);
    const s = baseScale * (1 + smooth * 0.35);
    group.scale.set(s, s, s);
    renderer.render(scene, camera);
  };
  const play = () => { if (!running) { running = true; last = 0; raf = requestAnimationFrame(frame); } };
  const pause = () => { running = false; cancelAnimationFrame(raf); };

  return {
    setColors: applyColors,
    next,
    pointer(x, y, on) { tmx = x; tmy = y; thover = on ? 1 : 0; },
    pulse(x, y) { const w = toWorld(x, y); u.uPulseAt.value.set(w.x, w.y, 0); pulse = 0; next(); },
    scroll(p) { scroll = p; },
    resize,
    play,
    pause,
    destroy() {
      pause();
      geo.dispose();
      mat.dispose();
      renderer.dispose();
    },
  };
}
