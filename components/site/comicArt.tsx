/**
 * The comic panels' drawings. Each is worked out from a seed, so the same entry always looks the same and the server and the browser agree.
 * Used by both the panels (ComicFrame.tsx) and their polls (ComicPoll.tsx), so nothing here needs the browser.
 */
const next = (s: number) => (s * 9301 + 49297) % 233280;

const rand = (seed: number) => { let s = seed; return () => { s = next(s); return s / 233280; }; };

export function Burst({ spikes, seed, className }: { spikes: number; seed: number; className: string }) {
  const r = rand(seed * 97 + 13), pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const d = i % 2 ? 36 + r() * 7 : 52 + r() * 8, a = (i * Math.PI) / spikes;
    pts.push(`${(60 + d * Math.cos(a)).toFixed(1)},${(60 + d * Math.sin(a)).toFixed(1)}`);
  }
  return <svg className={className} viewBox="0 0 120 120" aria-hidden><polygon points={pts.join(" ")} /></svg>;
}

/** A shout's jagged outline, stretched to whatever the words need. */
export function Spikes({ seed }: { seed: number }) {
  const r = rand(seed * 53 + 21), n = 15, pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i * Math.PI) / n, rx = i % 2 ? 40 : 50, ry = i % 2 ? 33 : 50 - r() * 4;
    pts.push(`${(50 + rx * Math.cos(a)).toFixed(1)},${(50 + ry * Math.sin(a)).toFixed(1)}`);
  }
  return <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden><polygon points={pts.join(" ")} /></svg>;
}

function flame(w: number, h: number, n: number, seed: number) {
  const r = rand(seed), s = w / n;
  let d = `M0 ${h}`;
  for (let i = 0; i < n; i++) {
    const x = i * s, t = 4 + r() * (h * 0.45);
    d += `C${(x + s * 0.2).toFixed(0)} ${(h * 0.7).toFixed(0)} ${(x + s * 0.34).toFixed(0)} ${(t + 12).toFixed(0)} ${(x + s * 0.5).toFixed(0)} ${t.toFixed(0)}C${(x + s * 0.62).toFixed(0)} ${(t + 14).toFixed(0)} ${(x + s * 0.85).toFixed(0)} ${(h * 0.68).toFixed(0)} ${(x + s).toFixed(0)} ${(h * 0.82).toFixed(0)}`;
  }
  return `${d}L${w} ${h}Z`;
}

/** One drawing holds both rows of flames, so one layer moves however many flames there are. */
export const Flames = ({ seed }: { seed: number }) => (
  <span className="cm-flames" aria-hidden>
    <svg viewBox="0 0 320 62" preserveAspectRatio="none"><path className="f1" d={flame(320, 62, 9, seed + 5)} /><path className="f2" d={flame(320, 62, 12, seed + 31)} transform="translate(0 20) scale(1 .68)" /></svg>
  </span>
);

export function Scribble({ seed }: { seed: number }) {
  const r = rand(seed * 51 + 7);
  let x = 60, y = 60, d = "M60 60";
  for (let i = 0; i < 22; i++) {
    const a = r(), b = r(), nx = 20 + a * 280, ny = 24 + b * 290;
    d += `Q${((x + nx) / 2 + 30 * (a - 0.5)).toFixed(0)} ${((y + ny) / 2 + 40 * (b - 0.5)).toFixed(0)} ${nx.toFixed(0)} ${ny.toFixed(0)}`;
    x = nx; y = ny;
  }
  return <svg className="cm-scribble" viewBox="0 0 320 340" preserveAspectRatio="none" aria-hidden><path d={d} /></svg>;
}

export function Splat({ seed, className }: { seed: number; className: string }) {
  const r = rand(seed * 37 + 3), n = 11, pts: number[][] = [];
  for (let i = 0; i < n; i++) { const a = (i * 2 * Math.PI) / n, d = 22 + r() * 26; pts.push([50 + d * Math.cos(a), 50 + d * Math.sin(a)]); }
  const mid = (a: number[], b: number[]) => `${((a[0] + b[0]) / 2).toFixed(1)} ${((a[1] + b[1]) / 2).toFixed(1)}`;
  let d = `M${mid(pts[n - 1], pts[0])}`;
  pts.forEach((q, i) => { d += `Q${q[0].toFixed(1)} ${q[1].toFixed(1)} ${mid(q, pts[(i + 1) % n])}`; });
  return <svg className={`cm-splat ${className}`} viewBox="0 0 100 100" aria-hidden><path d={`${d}Z`} /></svg>;
}

const WAVE_ROWS = [26, 62, 98, 134];
const wave = (y: number) => { let d = `M-20 ${y}`, up = true; for (let x = -20; x < 660; x += 40) { d += `q20 ${up ? -22 : 22} 40 0`; up = !up; } return d; };
const WAVE_PATHS = WAVE_ROWS.map(wave);

/** Twice the panel's width with a repeating shape, so sliding it along by half looks endless. One drawing, so one layer moves. */
export const Waves = () => <svg className="cm-waves" viewBox="0 0 640 170" preserveAspectRatio="none" aria-hidden>{WAVE_PATHS.map((d) => <path key={d} d={d} />)}</svg>;

/** Someone with headphones, floating on a cloud. */
export const Floaty = () => (
  <span className="cm-floaty" aria-hidden>
    <svg viewBox="0 0 118 104"><circle className="me" cx="59" cy="34" r="20" /><path className="me" d="M28 84c2-22 14-30 31-30s29 8 31 30Z" /><path className="cans" d="M35 36c0-32 48-32 48 0" /><rect className="can" x="30" y="30" width="10" height="17" rx="4" /><rect className="can" x="78" y="30" width="10" height="17" rx="4" /><path className="cloud" d="M14 96c-12 0-14-16-2-18 0-12 18-14 22-5 6-8 22-8 26 1 6-7 20-5 22 4 10-3 20 2 20 10s-6 8-12 8Z" /></svg>
  </span>
);

export const Head = () => <svg viewBox="0 0 120 120"><circle cx="60" cy="44" r="26" /><path d="M12 120c4-36 24-48 48-48s44 12 48 48Z" /></svg>;

export const BrainShape = () => (
  <>
    <path className="brain" d="M15 26c-3-8 3-14 7-13 1-6 11-7 14-1 6-1 10 6 6 13 1 6-6 10-11 7-4 3-13 1-16-6Z" />
    <path className="fold" d="M22 20c3-3 6 2 9-1s5 1 7 0M20 27c4-2 7 1 10-1s5 0 7-1" />
  </>
);

/** The brain that flies along the row. */
export const FlyingBrain = () => (
  <svg viewBox="0 0 56 44">
    <ellipse className="wing" cx="9" cy="22" rx="9" ry="5" /><ellipse className="wing" cx="47" cy="22" rx="9" ry="5" />
    <BrainShape />
  </svg>
);
