/**
 * The mascots' drawings, as SVG text. The site's show and the dashboard's preview both draw with this.
 * Poses (data-pose), legs (data-legs), theme outfits (data-cos), sleep and talking are switched by CSS in
 * app/mascot.css, so changing them never redraws the picture. Everything here is original art.
 */
import type { MascotCharacter, MascotMove } from "@/lib/mascot";

export type ArtOptions = { character: MascotCharacter; outfit: string; beard: string; glasses: boolean; hair: string; skin: string; uid: string };

const INK = "#1d2420";
type Cfg = {
  vb: number; eyes: [number, number][]; er?: number; ew2?: number; pc?: string; pr?: number; lid?: string; lc?: string;
  mouth?: [number, number]; mc?: string; cheeks?: boolean; arms?: [number, number][]; ac?: string; hand?: string; legs?: [number, number][];
  head: [number, number]; headT?: string; drawn?: boolean;
};

/** How far his hands are from his top (for hanging), where he sits, and how much shows over a heading, as shares of his height. */
export const CHAR_GEOMETRY: Record<MascotCharacter, { vb: number; hand: number; seat: number; show: number }> = {
  mini: { vb: 232, hand: 0, seat: 150 / 232, show: 0.3 },
  inky: { vb: 150, hand: 0.45, seat: 0.8, show: 0.6 },
  bagh: { vb: 150, hand: 0.45, seat: 0.82, show: 0.55 },
  cha: { vb: 150, hand: 0.55, seat: 0.84, show: 0.62 },
  megh: { vb: 150, hand: 0.55, seat: 0.8, show: 0.6 },
};

/** A move: its pose, how long it lasts, what he says and what bursts out. Other characters have their own two. */
export type Move = { id: string; pose: string | null; ms: number; line: string; burst: string[] };
export const MINI_MOVES: Record<MascotMove, Move> = {
  wave: { id: "wave", pose: "wave", ms: 2200, line: "Hey there! 👋", burst: ["👋"] },
  heart: { id: "heart", pose: "heart", ms: 2000, line: "This one's for you 💚", burst: ["💚", "💛", "❤️"] },
  think: { id: "think", pose: "think", ms: 2200, line: "Hmm, what's this? 🤔", burst: ["❓", "💡"] },
  flex: { id: "flex", pose: "flex", ms: 1800, line: "Strong and steady 💪", burst: ["💪", "⚡"] },
  fire: { id: "fire", pose: "up", ms: 1500, line: "Let's gooo! 🔥", burst: ["🔥", "✨"] },
  wink: { id: "wink", pose: null, ms: 1400, line: "Looking good 😉", burst: ["😎", "✨"] },
  laugh: { id: "laugh", pose: null, ms: 1400, line: "Hahaha 😂", burst: ["😂"] },
};
export const OTHER_MOVES: Record<Exclude<MascotCharacter, "mini">, Move[]> = {
  inky: [{ id: "splat", pose: null, ms: 900, line: "Splat! Hehe 💦", burst: ["💧", "💦"] }, { id: "wave", pose: "wave", ms: 2000, line: "Hiii 👋", burst: ["💧"] }],
  bagh: [{ id: "roar", pose: null, ms: 1000, line: "RAWR! 🐯 (that's hello)", burst: ["⚡", "🐾"] }, { id: "wave", pose: "wave", ms: 2000, line: "Paw wave! 🐾", burst: ["🐾"] }],
  cha: [{ id: "wave", pose: "wave", ms: 2000, line: "Cha time! ☕", burst: ["☕", "♨️"] }, { id: "cheer", pose: "up", ms: 1500, line: "Have a sip! ☕", burst: ["♨️", "✨"] }],
  megh: [{ id: "rainbow", pose: null, ms: 1800, line: "Ta-da, a rainbow! 🌈", burst: ["🌈", "✨"] }, { id: "rain", pose: null, ms: 1800, line: "Pitter patter… 🌧️", burst: ["💧"] }],
};

/** Mixes two #rrggbb colours: t = 0 gives a, 1 gives b. */
function mix(a: string, b: string, t: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

function eye(x: number, y: number, c: Cfg, side: string) {
  const r = c.er || 7, pr = c.pr || r * 0.58;
  const pupil = `<circle cx="${x}" cy="${y + 0.6}" r="${pr}" fill="${c.pc || INK}"/><circle cx="${x}" cy="${y + 0.6}" r="${pr * 0.45}" fill="#140c08" opacity=".7"/><circle cx="${x + 1.3}" cy="${y - 0.8}" r="1.3" fill="#fff"/>`;
  const lid = c.lid ? `<path d="M${x - r - 1} ${y - 1.5}q${r + 1} -${r + 0.5} ${2 * r + 2} 0" stroke="${c.lid}" stroke-width="1.9" fill="none" stroke-linecap="round"/>` : "";
  return `<g class="m-eye ${side}"><ellipse cx="${x}" cy="${y}" rx="${r + (c.ew2 || 0)}" ry="${r}" fill="#fff"/><g class="m-pup" data-cx="${x}" data-cy="${y}">${pupil}</g>${lid}</g><path class="m-closed ${side}" d="M${x - 5.5} ${y + 0.5}q5.5 4.5 11 0" stroke="${c.lc || INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
}
function mouth([x, y]: [number, number], mc: string) {
  return `<path class="m-happy" d="M${x - 6} ${y}q6 6.5 12 0" stroke="${mc}" stroke-width="2.6" fill="none" stroke-linecap="round"/><ellipse class="m-o" cx="${x}" cy="${y + 2}" rx="3.6" ry="4.4" fill="${mc}"/><path class="m-flat" d="M${x - 4} ${y + 2}h8" stroke="${mc}" stroke-width="2.4" stroke-linecap="round"/>`;
}
const arm = (side: "l" | "r", [x, y]: [number, number], c: Cfg) => {
  const dx = side === "l" ? -15 : 15;
  return `<g class="m-arm m-arm-${side}" style="transform-origin:${x}px ${y}px"><path d="M${x} ${y}l${dx} 11" stroke="${c.ac}" stroke-width="6" stroke-linecap="round"/><circle cx="${x + dx}" cy="${y + 11}" r="4.4" fill="${c.hand || c.ac}"/></g>`;
};
const leg = (side: "l" | "r", [x, y]: [number, number], c: Cfg) =>
  `<g class="m-leg-${side}" style="transform-origin:${x}px ${y}px"><path d="M${x} ${y}v11" stroke="${c.ac}" stroke-width="6" stroke-linecap="round"/><ellipse cx="${x + (side === "l" ? -2 : 2)}" cy="${y + 13}" rx="7" ry="3.8" fill="${c.ac}"/></g>`;

function costumes(c: Cfg) {
  const [[x1, ey], [x2]] = c.eyes, [hx, hy] = c.head;
  return `<g class="cos cos-day"><rect x="${x1 - 10}" y="${ey - 6.5}" width="20" height="13" rx="5" fill="${INK}"/><rect x="${x2 - 10}" y="${ey - 6.5}" width="20" height="13" rx="5" fill="${INK}"/><path d="M${x1 + 10} ${ey - 2}H${x2 - 10}" stroke="${INK}" stroke-width="3"/><path d="M${x1 - 6} ${ey - 3}l5 0M${x2 - 6} ${ey - 3}l5 0" stroke="#fff" stroke-width="2" opacity=".6" stroke-linecap="round"/></g>`
    + `<g class="cos cos-night"><path d="M${hx - 22} ${hy + 8}Q${hx - 6} ${hy - 26} ${hx + 28} ${hy - 4}Q${hx + 12} ${hy + 2} ${hx + 22} ${hy + 10}Z" fill="#5b4bb7"/><path d="M${hx - 24} ${hy + 8}Q${hx} ${hy + 2} ${hx + 24} ${hy + 10}" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none"/><circle cx="${hx + 30}" cy="${hy - 4}" r="6" fill="#fff"/></g>`
    + `<g class="cos cos-ocean"><path d="M${hx - 20} ${hy + 6}Q${hx} ${hy - 16} ${hx + 20} ${hy + 6}Z" fill="#fff" stroke="#c9d6e6"/><rect x="${hx - 22}" y="${hy + 2}" width="44" height="7" rx="3" fill="#2f6fd0"/><circle cx="${hx}" cy="${hy - 9}" r="3" fill="#ff6f59"/></g>`
    + `<g class="cos cos-party"><path d="M${hx - 13} ${hy + 6}L${hx} ${hy - 26}L${hx + 13} ${hy + 6}Z" fill="#ff6f59"/><path d="M${hx - 8} ${hy - 6}L${hx + 6} ${hy - 3}M${hx - 11} ${hy + 1}L${hx + 10} ${hy + 4}" stroke="#ffc94d" stroke-width="3"/><circle cx="${hx}" cy="${hy - 27}" r="4.5" fill="#ffc94d"/></g>`;
}

const SLEEVES: Record<string, string> = { hoodie: "#2b2f36", jersey: "#006a4e", denim: "#4a74b8", sharp: "#1f2a44" };

function miniBody(o: ArtOptions) {
  const u = o.uid, SK = o.skin, SKD = mix(o.skin, "#7a3d1c", 0.18), SKL = mix(o.skin, "#ffffff", 0.35), SKS = mix(o.skin, "#7a3d1c", 0.12);
  const hair = o.hair, curl = mix(o.hair, "#ffffff", 0.18);
  const sleeve = o.outfit === "plaid" ? `url(#mPlaid${u})` : SLEEVES[o.outfit] || SLEEVES.hoodie;
  const SL = `stroke="${sleeve}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  const hand = (x: number, y: number) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="5.4" fill="${SK}"/>`;
  const shoeL = (y: number) => `<path d="M41 ${y}q0-7 9-7h7q3 0 3 5v2z" fill="#2a2d31"/><path d="M40 ${y}h21v3.5q0 1.5-1.5 1.5h-18q-1.5 0-1.5-1.5z" fill="#f2f2f2"/>`;
  const shoeR = (y: number) => `<path d="M79 ${y}q0-7-9-7h-7q-3 0-3 5v2z" fill="#2a2d31"/><path d="M59 ${y}h21v3.5q0 1.5-1.5 1.5h-18q-1.5 0-1.5-1.5z" fill="#f2f2f2"/>`;
  const outfits: Record<string, string> = {
    plaid: `<path d="M50 84h20l2 66H48z" fill="#f6e5c0"/><path d="M35 96Q36 85 50 82L55 86L54 151H38Q34 126 35 96Z" fill="url(#mPlaid${u})"/><path d="M85 96Q84 85 70 82L65 86L66 151H82Q86 126 85 96Z" fill="url(#mPlaid${u})"/><path d="M54.5 87V151M65.5 87V151" stroke="#163338" stroke-width="1.3"/><path d="M50 82L55.5 86.5L51 95ZM70 82L64.5 86.5L69 95Z" fill="#245a62"/><path d="M40 106h10v3.5H40zM70 106h10v3.5H70z" fill="#1c2326" opacity=".45"/>`,
    hoodie: `<path d="M35 96Q36 85 50 82H70Q84 85 85 96Q86 126 82 151H38Q34 126 35 96Z" fill="#2b2f36"/><path d="M46 84Q60 96 74 84" stroke="#3d434d" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M56 92v14M64 92v14" stroke="#d9dde3" stroke-width="1.6" stroke-linecap="round"/><path d="M46 126h28l-3 15H49z" fill="#24282e"/>`,
    denim: `<path d="M50 84h20l2 66H48z" fill="#ffffff"/><path d="M35 96Q36 85 50 82L55 86L54 151H38Q34 126 35 96Z" fill="#4a74b8"/><path d="M85 96Q84 85 70 82L65 86L66 151H82Q86 126 85 96Z" fill="#4a74b8"/><path d="M54.5 87V151M65.5 87V151M39 112h12M69 112h12" stroke="#2f548f" stroke-width="1.6"/><path d="M50 82L55.5 86.5L51 95ZM70 82L64.5 86.5L69 95Z" fill="#3a63a3"/><circle cx="45" cy="120" r="1.4" fill="#c9d6ea"/><circle cx="75" cy="120" r="1.4" fill="#c9d6ea"/>`,
    sharp: `<path d="M50 84h20l2 66H48z" fill="#ffffff"/><path d="M35 96Q36 85 50 82L58 116L54 151H38Q34 126 35 96Z" fill="#1f2a44"/><path d="M85 96Q84 85 70 82L62 116L66 151H82Q86 126 85 96Z" fill="#1f2a44"/><path d="M50 82L57 112L46 100ZM70 82L63 112L74 100Z" fill="#2d3c62"/><path d="M75 106l5-1l-1 4z" fill="#ff6f59"/><circle cx="60" cy="128" r="1.8" fill="#c9a24a"/>`,
    jersey: `<path d="M35 96Q36 85 50 82Q60 91 70 82Q84 85 85 96Q86 126 82 151H38Q34 126 35 96Z" fill="#006a4e"/><path d="M50 82Q60 92 70 82" stroke="#f42a41" stroke-width="3.2" fill="none"/><circle cx="60" cy="114" r="11" fill="#f42a41"/><text x="60" y="118.5" text-anchor="middle" font-size="12" font-weight="800" fill="#fff" font-family="Inter, sans-serif">10</text>`,
  };
  const beard = o.beard === "clean" ? "" : `<g opacity="${o.beard === "stubble" ? 0.3 : 1}"><path d="M40 52C40.5 64 48 73.5 60 75.2C72 73.5 79.5 64 80 52C78.5 58 76 61 72.5 62C69 59.6 51 59.6 47.5 62C44 61 41.5 58 40 52Z" fill="#8a5a3c" opacity=".82"/><path d="M51 58.6Q60 54.6 69 58.6Q60 60.4 51 58.6Z" fill="#7a4e34"/></g>`;
  return `<defs>
    <radialGradient id="mSkin${u}" cx=".45" cy=".38" r=".75"><stop offset="0" stop-color="${SKL}"/><stop offset="1" stop-color="${SKS}"/></radialGradient>
    <pattern id="mPlaid${u}" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#2f6f78"/><rect width="7" height="16" fill="#1c2326" opacity=".75"/><rect width="16" height="7" fill="#1c2326" opacity=".6"/><rect x="10" width="2" height="16" fill="#e6e9eb" opacity=".85"/><rect y="10" width="16" height="2" fill="#e6e9eb" opacity=".75"/><rect x="7" width="3" height="16" fill="#9fb3b8" opacity=".35"/></pattern>
    <linearGradient id="mJean${u}" x1="0" x2="1"><stop offset="0" stop-color="#5b7da6"/><stop offset=".5" stop-color="#7a98be"/><stop offset="1" stop-color="#587aa1"/></linearGradient>
  </defs>
  <g class="lg-stand">
    <g class="m-leg-l" style="transform-origin:52px 150px"><path d="M45 146H59L58 211H46Z" fill="url(#mJean${u})"/>${shoeL(212)}</g>
    <g class="m-leg-r" style="transform-origin:68px 150px"><path d="M61 146H75L74 211H62Z" fill="url(#mJean${u})"/>${shoeR(212)}</g>
    <rect x="45" y="143" width="30" height="15" rx="3" fill="#6686ae"/>
  </g>
  <g class="lg-sit">
    <rect x="44" y="143" width="32" height="20" rx="6" fill="#6686ae"/>
    <g class="m-leg-l" style="transform-origin:51px 165px"><ellipse cx="51" cy="164" rx="8.5" ry="6" fill="#6b8bb3"/><path d="M44.5 165H57.5L56.5 196H45.5Z" fill="url(#mJean${u})"/>${shoeL(198)}</g>
    <g class="m-leg-r" style="transform-origin:69px 165px"><ellipse cx="69" cy="164" rx="8.5" ry="6" fill="#6b8bb3"/><path d="M62.5 165H75.5L74.5 196H63.5Z" fill="url(#mJean${u})"/>${shoeR(198)}</g>
  </g>
  <path d="M54 70h12v16q-6 4-12 0z" fill="${SKD}"/>
  <g>${outfits[o.outfit] || outfits.plaid}</g>
  <g class="pz pz-cross"><path d="M37 90L34 112" ${SL}/><path d="M83 90L86 112" ${SL}/><path d="M35 113L75 106" ${SL}/>${hand(78, 105)}<path d="M85 113L45 106" ${SL}/>${hand(42, 105)}<path d="M46 110.5L84 113.5" stroke="#163338" stroke-width="1" opacity=".5"/></g>
  <g class="pz pz-down"><path d="M37 90L33 140" ${SL}/>${hand(32.5, 145)}<path d="M83 90L87 140" ${SL}/>${hand(87.5, 145)}</g>
  <g class="pz pz-up"><path d="M38 90L35 50L38 6" ${SL}/>${hand(38, 1)}<path d="M82 90L85 50L82 6" ${SL}/>${hand(82, 1)}</g>
  <g class="pz pz-wave"><path d="M37 90L33 140" ${SL}/>${hand(32.5, 145)}<path d="M83 90L96 70" ${SL}/><g class="m-wave" style="transform-origin:96px 70px"><path d="M96 70L99 46" ${SL}/>${hand(99.5, 41)}</g></g>
  <g class="pz pz-heart"><path d="M37 90L36 114L53 102" ${SL}/><path d="M83 90L84 114L67 102" ${SL}/>${hand(56.5, 100)}${hand(63.5, 100)}<path d="M60 97c-3-5-10-3-8 2c1 3 8 7 8 7s7-4 8-7c2-5-5-7-8-2z" fill="#ff4d6d"/></g>
  <g class="pz pz-think"><path d="M37 90L33 140" ${SL}/>${hand(32.5, 145)}<path d="M83 90L85 113L67 82" ${SL}/>${hand(65, 78)}</g>
  <g class="pz pz-flex"><path d="M37 90L21 86L23 64" ${SL}/>${hand(23, 59)}<path d="M83 90L99 86L97 64" ${SL}/>${hand(97, 59)}</g>
  <g class="m-head"><g transform="translate(60 74) scale(1.32) translate(-60 -74)">
    <ellipse cx="38.5" cy="48" rx="4.6" ry="7" fill="${SKD}"/><ellipse cx="81.5" cy="48" rx="4.6" ry="7" fill="${SKD}"/>
    <path d="M39 44C39 29 48 21 60 21C72 21 81 29 81 44C81 60 74 72 60 75C46 72 39 60 39 44Z" fill="url(#mSkin${u})"/>
    ${beard}
    <path d="M59 48.5q-2.6 6.4 0 7.8q2 .8 4-.5" stroke="${mix(o.skin, "#7a3d1c", 0.35)}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M45 38.6Q50.5 35.2 56 37.6" stroke="#2f211b" stroke-width="2.7" fill="none" stroke-linecap="round"/>
    <path class="m-brow-r" d="M64 37.6Q69.5 35.2 75 38.6" stroke="#2f211b" stroke-width="2.7" fill="none" stroke-linecap="round"/>
    <g fill="${hair}"><circle cx="44" cy="30" r="8"/><circle cx="51" cy="22" r="9"/><circle cx="61" cy="19" r="9.5"/><circle cx="71" cy="22" r="9"/><circle cx="78" cy="30" r="8"/><circle cx="40" cy="37" r="5"/><circle cx="81" cy="37.5" r="5"/><circle cx="56.5" cy="26" r="6.5"/><circle cx="66" cy="26" r="6.5"/><circle cx="47" cy="15" r="5"/><circle cx="74" cy="14.5" r="5"/><circle cx="60.5" cy="11" r="5.5"/><circle cx="83" cy="25" r="4.5"/><circle cx="38" cy="25" r="4.5"/></g>
    <g stroke="${curl}" stroke-width="1.5" fill="none" stroke-linecap="round"><path d="M45 27q3-3 6 0"/><path d="M57 16q3-3 6 0"/><path d="M68 20q3-3 6 0"/><path d="M75 28q3-2 5 1"/><path d="M49 19q2-3 5-1"/><path d="M60 24q2.5-2.5 5 0"/></g>
  </g></g>`;
}
const MINI_GLASSES = `<g class="m-glasses"><rect x="43.5" y="40.5" width="15" height="12" rx="4.5" fill="rgba(255,255,255,.12)" stroke="#2a1d16" stroke-width="1.8"/><rect x="61.5" y="40.5" width="15" height="12" rx="4.5" fill="rgba(255,255,255,.12)" stroke="#2a1d16" stroke-width="1.8"/><path d="M58.5 46h3" stroke="#2a1d16" stroke-width="1.8"/></g>`;
const MINI_MOUTH = `<path class="m-happy" d="M51.5 62Q60 70.5 68.5 62Q60 64.4 51.5 62Z" fill="#fff" stroke="#7a3226" stroke-width="1.3" stroke-linejoin="round"/><ellipse class="m-o" cx="60" cy="64.5" rx="4" ry="4.6" fill="#7a3226"/><path class="m-flat" d="M55 63.5h10" stroke="#7a3226" stroke-width="2" stroke-linecap="round"/>`;
const MINI_HEAD_T = "translate(60 74) scale(1.32) translate(-60 -74)";

const OTHERS: Record<Exclude<MascotCharacter, "mini">, Cfg & { body: (u: string) => string }> = {
  inky: { vb: 150, eyes: [[47, 78], [73, 78]], mouth: [60, 96], mc: "#14402c", cheeks: true, arms: [[21, 92], [99, 92]], ac: "#2f9d6e", legs: [[50, 124], [70, 124]], head: [62, 33],
    body: (u) => `<defs><linearGradient id="blobG${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8be6b9"/><stop offset="1" stop-color="#2f9d6e"/></linearGradient></defs><path d="M60 30C66 18 80 18 76 32C94 40 102 60 100 84C98 110 82 126 60 126C38 126 20 112 20 86C20 60 34 40 52 34C54 28 56 26 60 30Z" fill="url(#blobG${u})"/><ellipse cx="42" cy="58" rx="7" ry="12" fill="#fff" opacity=".35" transform="rotate(25 42 58)"/>` },
  bagh: { vb: 150, eyes: [[47, 57], [73, 57]], er: 6, mouth: [60, 76], mc: "#3a2215", arms: [[38, 106], [82, 106]], ac: "#f59a3c", hand: "#fff7ec", legs: [[50, 130], [70, 130]], head: [60, 29],
    body: () => `<path class="m-tail" d="M80 120C100 124 106 104 97 95" stroke="#f59a3c" stroke-width="7" fill="none" stroke-linecap="round"/><ellipse cx="60" cy="114" rx="25" ry="21" fill="#f59a3c"/><ellipse cx="60" cy="118" rx="14" ry="14" fill="#fff7ec"/><path d="M38 108l6 2M38 116l6 1M82 108l-6 2M82 116l-6 1" stroke="#3a2215" stroke-width="2.6" stroke-linecap="round"/><circle cx="33" cy="36" r="10" fill="#f59a3c"/><circle cx="33" cy="36" r="5" fill="#ffb8a8"/><circle cx="87" cy="36" r="10" fill="#f59a3c"/><circle cx="87" cy="36" r="5" fill="#ffb8a8"/><ellipse cx="60" cy="60" rx="34" ry="30" fill="#f59a3c"/><path d="M60 31v9M51 33l2.4 7M69 33l-2.4 7M27 56h8M28 64h7M93 56h-8M92 64h-7" stroke="#3a2215" stroke-width="3" stroke-linecap="round"/><ellipse cx="52" cy="74" rx="10" ry="8" fill="#fff7ec"/><ellipse cx="68" cy="74" rx="10" ry="8" fill="#fff7ec"/><path d="M55 67h10l-5 5z" fill="#e2626e"/>` },
  cha: { vb: 150, eyes: [[48, 93], [72, 93]], er: 5.5, mouth: [60, 106], mc: "#5a3a22", cheeks: true, arms: [[31, 92], [88, 102]], ac: "#d8c6ad", head: [60, 58],
    body: () => `<g class="m-steam" stroke="#b9b9b9" stroke-width="3" fill="none" stroke-linecap="round"><path d="M48 54q-5-8 0-16q5-8 0-16"/><path d="M60 52q-5-8 0-16q5-8 0-16"/><path d="M72 54q-5-8 0-16q5-8 0-16"/></g><ellipse cx="60" cy="129" rx="43" ry="7.5" fill="#efe3d1" stroke="#d8c6ad" stroke-width="2"/><path d="M92 74C107 74 107 99 88 99" stroke="#e7d8c2" stroke-width="7" fill="none"/><path d="M28 64H92L87 112Q85 124 72 124H48Q35 124 33 112Z" fill="#fffaf2" stroke="#d8c6ad" stroke-width="2"/><path d="M30.5 78H89.5" stroke="#3f9b72" stroke-width="6"/><g fill="#ff6f59"><circle cx="38" cy="78" r="1.8"/><circle cx="48" cy="78" r="1.8"/><circle cx="72" cy="78" r="1.8"/><circle cx="82" cy="78" r="1.8"/></g><ellipse cx="60" cy="64" rx="32" ry="7" fill="#b5703a" stroke="#d8c6ad" stroke-width="2"/>` },
  megh: { vb: 150, eyes: [[50, 82], [72, 82]], er: 5, mouth: [61, 94], mc: "#3a5a80", cheeks: true, arms: [[24, 90], [100, 90]], ac: "#cfe0f0", head: [62, 40],
    body: () => `<g class="m-rainbow" fill="none" stroke-width="5" stroke-linecap="round"><path d="M14 104A46 46 0 0 1 106 104" stroke="#ff6f59"/><path d="M20 104A40 40 0 0 1 100 104" stroke="#ffc94d"/><path d="M26 104A34 34 0 0 1 94 104" stroke="#5b8def"/></g><g class="m-rain" stroke="#7ab8f5" stroke-width="3" stroke-linecap="round"><path d="M42 112l-3 8"/><path d="M60 116l-3 8"/><path d="M78 112l-3 8"/></g><g fill="#cfe0f0"><circle cx="40" cy="80" r="22.5"/><circle cx="62" cy="66" r="29.5"/><circle cx="84" cy="80" r="21.5"/><rect x="22" y="76" width="82" height="30.5" rx="15"/></g><g fill="#fdfeff"><circle cx="40" cy="80" r="20"/><circle cx="62" cy="66" r="27"/><circle cx="84" cy="80" r="19"/><rect x="24.5" y="78" width="77" height="26" rx="13"/></g>` },
};
const MINI_CFG: Cfg = { vb: 232, eyes: [[51.5, 46.5], [68.5, 46.5]], er: 5, ew2: 0.8, pc: "#5a3a26", pr: 3, lid: "#2a1d16", head: [60, 10], headT: MINI_HEAD_T, drawn: true };

/** The whole drawing. `label` names it for screen readers; without one it's decoration. */
export function mascotSvg(o: ArtOptions, label?: string) {
  const mini = o.character === "mini";
  const c: Cfg = mini ? MINI_CFG : OTHERS[o.character as Exclude<MascotCharacter, "mini">];
  const H = c.vb;
  const body = mini ? miniBody(o) : OTHERS[o.character as Exclude<MascotCharacter, "mini">].body(o.uid);
  const limbs = mini ? "" : `${c.legs ? leg("l", c.legs[0], c) + leg("r", c.legs[1], c) : ""}`;
  const arms = mini || !c.arms ? "" : arm("l", c.arms[0], c) + arm("r", c.arms[1], c);
  const cheeks = c.cheeks && c.mouth ? `<circle cx="${c.mouth[0] - 15}" cy="${c.mouth[1] - 3}" r="4.2" fill="#ff8fa3" opacity=".55"/><circle cx="${c.mouth[0] + 15}" cy="${c.mouth[1] - 3}" r="4.2" fill="#ff8fa3" opacity=".55"/>` : "";
  const face = `${eye(c.eyes[0][0], c.eyes[0][1], c, "l")}${eye(c.eyes[1][0], c.eyes[1][1], c, "r")}${mini && o.glasses ? MINI_GLASSES : ""}${mini ? MINI_MOUTH : mouth(c.mouth!, c.mc!)}`;
  const aria = label ? `role="img" aria-label="${label.replace(/[<>"&]/g, "")}"` : 'aria-hidden="true"';
  return `<svg class="masc-art k-${o.character}" viewBox="0 0 120 ${H}" ${aria}><g class="m-all">${limbs}${body}${arms}${cheeks}<g class="m-face"${c.headT ? ` transform="${c.headT}"` : ""}>${face}</g>${c.headT ? `<g transform="${c.headT}">${costumes(c)}</g>` : costumes(c)}</g></svg>`;
}

/** Which theme outfit he wears on each theme; themes not listed get none. */
export const THEME_COSTUME: Record<string, string> = { day: "day", sunset: "day", retro: "day", night: "night", ocean: "ocean", playful: "party", candy: "party" };
