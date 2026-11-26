/**
 * Mini Shourobh's clothes, glasses and hats (the owner's picks of 2026-11-26 from the Wardrobe preview,
 * https://claude.ai/artifact/9TP9YUci5ckmKb1um2haFR). The rig (mascotRig.ts) has empty holders where clothes go
 * ([data-mzbody], [data-mzslv], [data-mzfore], [data-mzleg], [data-mzgl], .mzj-hat), and `wearSvg` fills them for one look.
 * Everything is drawn in the rig's own coordinates: the body in his upper body's, a sleeve from the shoulder, a forearm
 * from the elbow, a leg from the hip, so every move he already has works in every outfit.
 *
 * Hats sit on the hairline and are sized to the hair under them (`HAIR`); his hair is cut off above the hat's band
 * (`clipY`, a clip path on the hair) so curls only peek out at the sides instead of poking through the top.
 */
import { MZ_OUTFIT_COLORS, type MzWear } from "@/lib/mascot";

type Hair = "curly" | "swept" | "short";
export const HAIR: Record<Hair, { band: number; half: number; top: number }> = { curly: { band: 64, half: 52, top: 24 }, swept: { band: 66, half: 45, top: 35 }, short: { band: 67, half: 42, top: 43 } };
const BODY = "M84,156 C92,150 100,148 108,148 Q120,158 132,148 C140,148 148,150 156,156 C161,182 160,204 158,226 Q120,232 82,226 C80,204 79,182 84,156 Z";
const HIPS = "M88,212 H152 L155,236 Q120,242 85,236 Z";

type Sleeve = "none" | "short" | "elbow" | "long" | "rolled";
type Legs = { c?: string; dk?: string; bare?: boolean; shorts?: number; stripe?: string; socks?: string; sockBand?: string; slim?: boolean; cuff?: boolean; crease?: boolean };
type Dress = { body: string; sleeve: Sleeve; sc: string; cuff: string; puff?: boolean; legs: Legs; shoe: string };

/* ---------- shoes, drawn for the left foot (the right one is mirrored) ---------- */
function shoe(kind: string) {
  switch (kind) {
    case "sneakerdk": return `<path class="zo" fill="#26282e" d="M-17,60 Q-17,52 -8,52 H8 Q13,52 13,60 V63 Q13,67 8,67 H-13 Q-18,67 -17,60 Z"/><path d="M-17,63.5 H13" stroke="#fbfbf8" stroke-width="2.4"/><path d="M-6,55.5 h8 M-6,58.5 h8" stroke="#8a8f99" stroke-width="1.4"/>`;
    case "formal": return `<path class="zo" fill="#1d1a1a" d="M-19,62 Q-17,54 -6,54 H8 Q13,54 13,61 V64 Q13,67 8,67 H-14 Q-19,67 -19,62 Z"/><path d="M-14,58 Q-10,56 -5,57" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    case "loafer": return `<path class="zo" fill="#7a4524" d="M-19,62 Q-17,54 -6,54 H8 Q13,54 13,61 V64 Q13,67 8,67 H-14 Q-19,67 -19,62 Z"/><path d="M-12,57.5 H4" stroke="#4a2814" stroke-width="2.2"/><path d="M-19,65 H13" stroke="#3b2010" stroke-width="1.6"/>`;
    case "boot": return `<path class="zo" fill="#7b4a2a" d="M-12,42 H12 V59 Q13,60 13,62 V64 Q13,67 8,67 H-14 Q-18,67 -17,61 Q-16,57 -12,56 Z"/><path d="M-17,64.5 H13" stroke="#3b2414" stroke-width="2.4"/><circle cx="-4" cy="47" r="1.3" fill="#e9d2a8"/><circle cx="-4" cy="52" r="1.3" fill="#e9d2a8"/><circle cx="4" cy="47" r="1.3" fill="#e9d2a8"/><circle cx="4" cy="52" r="1.3" fill="#e9d2a8"/>`;
    case "nagra": return `<path class="zo" fill="#c9852c" d="M-21,62 Q-24,56 -19,57 Q-13,52 -4,52 H8 Q13,52 13,59 V64 Q13,67 8,67 H-15 Q-21,67 -21,62 Z"/><path d="M-12,57 Q-4,54 6,56" stroke="#ffe39a" stroke-width="1.8" stroke-dasharray="1 2.6" fill="none" stroke-linecap="round"/><circle cx="-21" cy="56.5" r="1.8" fill="#ffe39a"/>`;
    case "chappal": case "flip": {
      const sole = kind === "chappal" ? "#2f6fd1" : "#ff5a46", strap = kind === "chappal" ? "#2f6fd1" : "#ffc23a";
      return `<path class="zo zsk" d="M-15,61 Q-15,54 -7,54 H6 Q11,54 11,60 V63 Q11,65 7,65 H-12 Q-16,65 -15,61 Z"/><path class="zo" fill="${sole}" d="M-18,64 H14 Q14,68 10,68 H-14 Q-18,68 -18,64 Z"/><path d="M-9,64 Q-3,55 3,64" stroke="${strap}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
    }
    case "studs": return `<path class="zo" fill="#18191d" d="M-17,60 Q-17,52 -8,52 H8 Q13,52 13,60 V63 Q13,66 8,66 H-13 Q-18,66 -17,60 Z"/><path d="M-12,57 Q-2,54 8,57" stroke="#ffc23a" stroke-width="2.2" fill="none"/><path d="M-12,66 v3 M-4,66 v3 M4,66 v3 M10,66 v3" stroke="#9aa0ab" stroke-width="2.2" stroke-linecap="round"/>`;
    default: return `<path class="zo zshoe" d="M-17,60 Q-17,52 -8,52 H8 Q13,52 13,60 V63 Q13,67 8,67 H-13 Q-18,67 -17,60 Z"/><path d="M-17,63.5 H13" stroke="var(--mz-acc)" stroke-width="2"/><path d="M-6,55.5 h8 M-6,58.5 h8" stroke="#b9b9b2" stroke-width="1.4"/>`;
  }
}
/** one leg from the hip down (the rig's .mzj-legL / .mzj-legR hold it; the right one is the left mirrored) */
function leg(p: Legs, shoeKind: string, right: boolean) {
  let g = "";
  if (p.bare || p.shorts || p.socks) g += `<path class="zo zsk" d="M-9,-2 H9 L8,56 H-8 Z"/>`;
  if (p.socks) g += `<path class="zo" fill="${p.socks}" d="M-9.5,26 H9.5 L9,56 H-9 Z"/><path d="M-9.4,30 H9.4" stroke="${p.sockBand}" stroke-width="3"/>`;
  if (p.shorts) g += `<path class="zo" fill="${p.c}" d="M-13,-2 H13 L13.5,${p.shorts} H-13.5 Z"/>` + (p.stripe ? `<path d="M-12.5,0 L-13,${p.shorts - 1}" stroke="${p.stripe}" stroke-width="3"/>` : "");
  if (!p.bare && !p.shorts && !p.socks) {
    g += `<path class="zo" fill="${p.c}" d="${p.slim ? "M-11.5,-2 H11.5 L9.5,56 H-9.5 Z" : "M-12,-2 H12 L11,54 H-11 Z"}"/>`;
    if (p.cuff) g += `<path class="zo" fill="${p.dk}" d="M-12,47 H12 V56 H-12 Z"/>`;
    g += p.crease ? `<path d="M2,2 L1.5,52" stroke="rgba(0,0,0,.18)" stroke-width="1.4"/>` : `<path d="M4,4 L3,46" stroke="rgba(0,0,0,.16)" stroke-width="1.5"/>`;
  }
  g += shoe(shoeKind);
  return right ? `<g transform="scale(-1 1)">${g}</g>` : g;
}

/* ---------- what each outfit is ---------- */
function dress(w: MzWear, u: string): Dress {
  const id = (k: string) => `mzW${k}-${u}`;
  if (w.outfit === "everyday") {
    const P = `url(#mzPlaid-${u})`, T = `url(#mzTee-${u})`;
    return {
      sleeve: "elbow", sc: P, cuff: "var(--mz-shirt-dk)", legs: { c: "var(--mz-jeans)", dk: "var(--mz-jeans-dk)", cuff: true }, shoe: "sneaker",
      body: `<path class="zo zjn" d="${HIPS}"/><path class="zo" fill="${T}" d="${BODY}"/><path d="M110,196 Q120,200 130,196" fill="none" stroke="rgba(120,90,40,.25)" stroke-width="1.6"/>
        <path class="zo" fill="${P}" d="M84,156 C92,150 100,148 106,148 L100,168 L108,228 Q94,229 82,226 C80,204 79,182 84,156 Z"/>
        <path class="zo" fill="${P}" d="M156,156 C148,150 140,148 134,148 L140,168 L132,228 Q146,229 158,226 C160,204 161,182 156,156 Z"/>
        <path class="zo zsh2" d="M106,148 L99,168 L91,153 Q99,149 106,148 Z"/><path class="zo zsh2" d="M134,148 L141,168 L149,153 Q141,149 134,148 Z"/>
        <rect class="zo" fill="${P}" x="86" y="175" width="13" height="12" rx="2" stroke-width="1.6"/><circle cx="103" cy="190" r="1.7" fill="var(--mz-ink)"/><circle cx="104.5" cy="208" r="1.7" fill="var(--mz-ink)"/>`,
    };
  }
  const list = MZ_OUTFIT_COLORS[w.outfit], c = list[Math.min(Math.max(0, w.col), list.length - 1)], [name, a, b] = c;
  switch (w.outfit) {
    case "panjabi": {
      // the owner found the first one too long (2026-11-26): it ends at mid-thigh now
      const boi = name.startsWith("Boishakh"), E = b, K = a;
      return {
        sleeve: "long", sc: K, cuff: boi ? E : K, legs: { c: "#f6f3ea", dk: "#e2dccb", slim: true }, shoe: "nagra",
        body: `<path class="zo" fill="${K}" d="M84,156 C92,150 100,148 108,148 Q120,153 132,148 C140,148 148,150 156,156 C161,182 161,206 161,226 L163,250 Q142,254 120,254 Q98,254 77,250 L79,226 C79,206 79,182 84,156 Z"/>
          <path d="M156,158 C161,182 161,206 161,226 L163,250 Q156,252 150,252 L152,228 C153,206 152,182 148,160 Z" fill="rgba(0,0,0,.07)"/>
          <path d="M80,234 L78,249 M160,234 L162,249" stroke="rgba(0,0,0,.25)" stroke-width="1.6"/>
          ${boi ? `<path d="M77,241 Q120,248 163,241 L163,250 Q120,256 77,250 Z" fill="${E}"/>` : ""}
          <path d="M78,245 Q120,251 162,245" stroke="${boi ? "#fff" : E}" stroke-width="2.6" stroke-dasharray="1 4.5" fill="none" stroke-linecap="round"/>
          <path class="zo" fill="${K}" stroke-width="1.6" d="M116,153 H124 V204 H116 Z"/>
          <path d="M104,157 Q112,170 116,172 M136,157 Q128,170 124,172" stroke="${E}" stroke-width="2.4" stroke-dasharray="1 4" fill="none" stroke-linecap="round"/>
          <circle cx="120" cy="164" r="2.1" fill="${E}"/><circle cx="120" cy="177" r="2.1" fill="${E}"/><circle cx="120" cy="190" r="2.1" fill="${E}"/>
          <path class="zo" fill="${boi ? E : K}" stroke-width="1.8" d="M107,146 Q120,152 133,146 L134,153 Q120,160 106,153 Z"/>`,
      };
    }
    case "suit": return {
      sleeve: "long", sc: a, cuff: "#ffffff", legs: { c: a, dk: b, crease: true }, shoe: "formal",
      body: `<path class="zo" fill="${a}" d="${HIPS}"/><path class="zo" fill="#fbfbfb" d="${BODY}"/>
        <path class="zo" fill="${a}" d="M84,156 C92,150 100,148 109,147 L119,200 L118,240 Q99,242 80,238 C79,206 79,182 84,156 Z"/>
        <path class="zo" fill="${a}" d="M156,156 C148,150 140,148 131,147 L121,200 L122,240 Q141,242 160,238 C161,206 161,182 156,156 Z"/>
        <path class="zo" fill="${b}" stroke-width="1.6" d="M109,147 L119,200 L104,172 L97,160 L104,152 Z"/><path class="zo" fill="${b}" stroke-width="1.6" d="M131,147 L121,200 L136,172 L143,160 L136,152 Z"/>
        <path class="zo" fill="#fff" stroke-width="1.6" d="M109,147 L118,158 L112,163 L105,151 Z"/><path class="zo" fill="#fff" stroke-width="1.6" d="M131,147 L122,158 L128,163 L135,151 Z"/>
        <path class="zo" fill="var(--mz-acc)" stroke-width="1.6" d="M116,155 H124 L122,162 H118 Z"/><path class="zo" fill="var(--mz-acc)" stroke-width="1.6" d="M118,162 H122 L125,195 L120,203 L115,195 Z"/>
        <circle cx="120" cy="214" r="2.3" fill="var(--mz-ink)"/><circle cx="120" cy="228" r="2.3" fill="var(--mz-ink)"/>
        <path d="M137,176 H154" stroke="rgba(0,0,0,.35)" stroke-width="1.6"/><path class="zo" fill="#fff" stroke-width="1.4" d="M140,176 L152,176 L150,169 L146,172 L143,168 Z"/>`,
    };
    case "winter": return {
      sleeve: "long", sc: a, cuff: b, puff: true, legs: { c: "#3f5a86", dk: "#2b3f63" }, shoe: "boot",
      body: `<path class="zo" fill="#3f5a86" d="${HIPS}"/><path class="zo" fill="${a}" d="M80,156 C88,148 100,146 108,146 Q120,152 132,146 C140,146 152,148 160,156 C166,184 165,208 163,234 Q120,242 77,234 C75,208 74,184 80,156 Z"/>
        <path d="M78,180 Q120,188 163,180 M77,204 Q120,212 164,204 M77,226 Q120,234 164,226" stroke="rgba(0,0,0,.2)" stroke-width="2" fill="none"/>
        <path d="M120,156 V238" stroke="rgba(0,0,0,.4)" stroke-width="2"/><rect x="117" y="170" width="6" height="9" rx="2" fill="#d9dde6" stroke="var(--mz-ink)" stroke-width="1.2"/>
        <path class="zo" fill="${b}" d="M103,146 Q120,156 137,146 L139,159 Q120,169 101,159 Z"/>
        <path class="zo" fill="#d94a3a" d="M99,147 Q120,163 141,147 L143,160 Q120,176 97,160 Z"/>
        <path d="M104,154 Q120,166 136,154" stroke="#fff4e0" stroke-width="3" stroke-dasharray="5 5" fill="none"/>
        <path class="zo" fill="#d94a3a" d="M127,162 L137,208 L126,211 L119,166 Z"/><path d="M124,176 L133,174 M126,188 L135,186 M128,200 L136,198" stroke="#fff4e0" stroke-width="3"/>
        <path d="M128,211 l-1,6 M131,210 l0,6 M134,209 l1,6" stroke="#d94a3a" stroke-width="1.6" stroke-linecap="round"/>`,
    };
    case "beach": // the owner's change (2026-11-26): board shorts only, nothing on top
      return {
        sleeve: "none", sc: "", cuff: "", legs: { c: a, shorts: 24, stripe: b }, shoe: "flip",
        body: `<path class="zo zsk" d="${BODY}"/><path d="M98,172 Q108,178 118,174 M122,174 Q132,178 142,172" stroke="rgba(110,40,10,.32)" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M112,190 Q113,200 112,208 M128,190 Q127,200 128,208" stroke="rgba(110,40,10,.18)" stroke-width="1.8" fill="none" stroke-linecap="round"/><ellipse cx="120" cy="214" rx="1.8" ry="2.4" fill="rgba(110,40,10,.45)"/>
          <path class="zo" fill="${a}" d="${HIPS}"/><path d="M86,220 Q120,226 154,220" stroke="${b}" stroke-width="3" fill="none"/><path d="M116,220 l-3,10 M124,220 l3,10" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`,
      };
    case "sporty": {
      const stripes = name === "Sky stripes", cricket = name === "Cricket whites";
      const J = stripes ? `url(#${id("arg")})` : a, trim = stripes ? "#1d2a55" : b, shorts = stripes ? "#1d2a55" : "#15161a";
      return {
        sleeve: cricket ? "long" : "short", sc: J, cuff: trim, shoe: cricket ? "sneaker" : "studs",
        legs: cricket ? { c: "#f7f7f2", dk: "#e2e2da", crease: true } : { c: shorts, shorts: 22, stripe: trim, socks: stripes ? "#fff" : a, sockBand: trim },
        body: `${stripes ? `<defs><pattern id="${id("arg")}" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#fff"/><rect x="5" width="9" height="20" fill="${b}"/></pattern></defs>` : ""}
          <path class="zo" fill="${cricket ? "#f7f7f2" : shorts}" d="${HIPS}"/><path class="zo" fill="${J}" d="${BODY}"/>
          <path d="M84,158 C80,182 80,204 82,226 L90,227 C88,204 88,182 92,159 Z" fill="${trim}"/><path d="M156,158 C160,182 160,204 158,226 L150,227 C152,204 152,182 148,159 Z" fill="${trim}"/>
          <path d="M107,148 L120,166 L133,148" stroke="${trim}" stroke-width="4.5" fill="none" stroke-linejoin="round"/>
          <text x="120" y="212" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="25" fill="${cricket ? trim : stripes ? "#1d2a55" : "#fff"}" stroke="${cricket || stripes ? "#fff" : "none"}" stroke-width="1" paint-order="stroke">10</text>`,
      };
    }
    case "smart": return {
      sleeve: "rolled", sc: a, cuff: a, legs: { c: "#cdb88f", dk: "#b19c73", crease: true }, shoe: "loafer",
      body: `<path class="zo" fill="#cdb88f" d="M88,214 H152 L155,236 Q120,242 85,236 Z"/>
        <path class="zo" fill="${a}" d="M84,156 C92,150 100,148 108,148 Q120,158 132,148 C140,148 148,150 156,156 C161,182 160,202 156,218 Q120,224 84,218 C80,202 79,182 84,156 Z"/>
        <path d="M120,158 V218" stroke="${b}" stroke-width="1.8"/><circle cx="120" cy="172" r="1.7" fill="var(--mz-ink)"/><circle cx="120" cy="188" r="1.7" fill="var(--mz-ink)"/><circle cx="120" cy="204" r="1.7" fill="var(--mz-ink)"/>
        <path class="zo" fill="${a}" stroke-width="1.8" d="M108,148 L117,161 L106,159 L100,151 Z"/><path class="zo" fill="${a}" stroke-width="1.8" d="M132,148 L123,161 L134,159 L140,151 Z"/>
        <path class="zo" fill="#5b3a1e" stroke-width="1.6" d="M85,216 Q120,222 155,216 L155,224 Q120,230 85,224 Z"/><rect x="114" y="216" width="12" height="9" rx="1.5" fill="#e3c26a" stroke="var(--mz-ink)" stroke-width="1.4"/>`,
    };
    default: { // home: a checked lungi and a white genji
      const L = `url(#${id("lun")})`;
      return {
        sleeve: "none", sc: "", cuff: "", legs: { bare: true }, shoe: "chappal",
        body: `<defs><pattern id="${id("lun")}" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="${a}"/><rect y="5" width="16" height="4" fill="${b}" opacity=".6"/><rect x="5" width="4" height="16" fill="${b}" opacity=".6"/><rect y="12" width="16" height="1" fill="#fff" opacity=".35"/></pattern></defs>
          <path class="zo zsk" d="${BODY}"/>
          <path class="zo" fill="#fdfdfb" d="M94,150 Q120,176 146,150 L154,158 C160,184 160,206 158,224 Q120,230 82,224 C80,206 80,184 86,158 Z"/>
          <path class="zo" fill="${L}" d="M83,212 H157 L161,282 Q120,289 79,282 Z"/>
          <path class="zo" fill="${L}" d="M84,212 H156 V223 Q120,230 84,223 Z"/><path d="M128,214 L136,280" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
          <path d="M84,223 Q120,230 156,223" stroke="rgba(0,0,0,.3)" stroke-width="2.2" fill="none"/>`,
      };
    }
  }
}

/* ---------- sleeves: from the shoulder; forearms: from the elbow ---------- */
function sleeveSvg(d: Dress) {
  const sx = d.puff ? 1.28 : 1;
  let s = `<path class="zo zsk" d="M-9,-6 Q0,-11 9,-6 L8.5,38 Q0,41 -8.5,38 Z"/>`;
  if (d.sleeve === "short") s += `<path class="zo" fill="${d.sc}" d="M-11,-7 Q0,-13 11,-7 L11.5,16 Q0,20 -11.5,16 Z"/>`;
  if (d.sleeve === "elbow" || d.sleeve === "rolled" || d.sleeve === "long") s += `<path class="zo" fill="${d.sc}"${sx !== 1 ? ` transform="scale(${sx} 1)"` : ""} d="M-11,-7 Q0,-13 11,-7 L10,38 Q0,42 -10,38 Z"/>`;
  return s;
}
function foreSvg(d: Dress) {
  const sx = d.puff ? 1.28 : 1;
  let f = d.sleeve === "long" ? `<path class="zo" fill="${d.sc}"${sx !== 1 ? ` transform="scale(${sx} 1)"` : ""} d="M-7.5,-2 H7.5 L7,30 Q0,33 -7,30 Z"/>` : `<path class="zo zsk" d="M-7,-2 H7 L6.5,30 Q0,33 -6.5,30 Z"/>`;
  if (d.sleeve === "elbow") f += `<path class="zo" fill="${d.cuff}" d="M-9.5,-3 H9.5 L9,7 H-9 Z"/>`;
  if (d.sleeve === "rolled") f += `<path class="zo" fill="${d.cuff}" d="M-10,-4 H10 L9.5,9 H-9.5 Z"/><path d="M-9,2.5 H9" stroke="rgba(0,0,0,.18)" stroke-width="1.4"/>`;
  if (d.sleeve === "long") f += `<path class="zo" fill="${d.cuff}" d="M-8,21 H8 L7.6,30 H-7.6 Z"/>`;
  return f;
}

/* ---------- glasses ---------- */
export function glassesSvg(k: string, u: string) {
  switch (k) {
    case "classic": return `<rect class="zo" x="90" y="89" width="26" height="22" rx="8" fill="rgba(255,255,255,.14)"/><rect class="zo" x="124" y="89" width="26" height="22" rx="8" fill="rgba(255,255,255,.14)"/><path class="zln" d="M116,97 Q120,94 124,97"/>`;
    case "round": return `<circle class="zo" cx="103" cy="100" r="12.5" fill="rgba(255,255,255,.14)" stroke="#a5762c"/><circle class="zo" cx="137" cy="100" r="12.5" fill="rgba(255,255,255,.14)" stroke="#a5762c"/><path d="M115.5,98 Q120,95 124.5,98" stroke="#a5762c" stroke-width="2.4" fill="none"/>`;
    case "thin": return `<rect x="89" y="92" width="28" height="16" rx="3" fill="rgba(255,255,255,.12)" stroke="var(--mz-ink)" stroke-width="1.8"/><rect x="123" y="92" width="28" height="16" rx="3" fill="rgba(255,255,255,.12)" stroke="var(--mz-ink)" stroke-width="1.8"/><path d="M117,96 H123" stroke="var(--mz-ink)" stroke-width="1.8"/>`;
    case "bold": return `<rect x="88" y="88" width="29" height="23" rx="5" fill="rgba(255,255,255,.12)" stroke="#111" stroke-width="4.4"/><rect x="123" y="88" width="29" height="23" rx="5" fill="rgba(255,255,255,.12)" stroke="#111" stroke-width="4.4"/><path d="M117,95 H123" stroke="#111" stroke-width="4"/>`;
    case "aviator": return `<defs><linearGradient id="mzAv-${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b4a63"/><stop offset="1" stop-color="#8fa9c9"/></linearGradient></defs><path d="M89,92 Q103,88 116,92 Q117,108 106,112 Q91,113 89,92 Z" fill="url(#mzAv-${u})" stroke="#c9a14a" stroke-width="2"/><path d="M151,92 Q137,88 124,92 Q123,108 134,112 Q149,113 151,92 Z" fill="url(#mzAv-${u})" stroke="#c9a14a" stroke-width="2"/><path d="M116,93 Q120,90 124,93 M112,89.5 Q120,86 128,89.5" stroke="#c9a14a" stroke-width="1.8" fill="none"/><path d="M93,95 L100,95" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"/>`;
    case "shades": return `<path class="zo" d="M88,90 H116 Q117,109 103,111 Q89,110 88,90 Z" fill="#14161c"/><path class="zo" d="M124,90 H152 Q151,110 137,111 Q123,109 124,90 Z" fill="#14161c"/><path class="zln" d="M116,93 Q120,90 124,93"/><path d="M92,94 L101,94 M128,94 L137,94" stroke="#fff" stroke-opacity=".45" stroke-width="2.4" stroke-linecap="round"/>`;
    default: return "";
  }
}

/* ---------- hats: drawn round the middle of their band (0,0), then placed on the hairline and sized to the hair ---------- */
const HAT_ART: Record<string, string> = {
  tupi: `<path class="zo" fill="#fdfcf7" d="M-40,4 L-38,-20 Q0,-31 38,-20 L40,4 Q0,-4 -40,4 Z"/><path d="M-37,-7 Q0,-15 37,-7 M-38,-15 Q0,-23 38,-15" stroke="#d9c98f" stroke-width="2" stroke-dasharray="2.5 3" fill="none"/><path d="M-36,-22 Q0,-30 36,-22" stroke="rgba(0,0,0,.08)" stroke-width="3" fill="none"/>`,
  cap: `<path class="zo" fill="var(--mz-acc)" d="M-40,4 Q-42,-34 0,-37 Q42,-34 40,4 Q0,-3 -40,4 Z"/><path d="M0,-36 Q-3,-16 0,0 M-22,-30 Q-26,-12 -24,2 M22,-30 Q26,-12 24,2" stroke="rgba(0,0,0,.22)" stroke-width="1.6" fill="none"/><circle class="zo" cx="0" cy="-37" r="3.2" fill="var(--mz-acc)"/><circle cx="0" cy="-16" r="8" fill="#fff"/><text x="0" y="-12" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="11" fill="var(--mz-acc)">S</text><path class="zo" fill="#c9412f" d="M-44,2 Q0,-7 44,2 Q46,12 0,17 Q-46,12 -44,2 Z"/>`,
  capback: `<path class="zo" fill="var(--mz-acc)" d="M-40,4 Q-42,-34 0,-37 Q42,-34 40,4 Q0,-3 -40,4 Z"/><path d="M0,-36 Q-3,-16 0,0" stroke="rgba(0,0,0,.22)" stroke-width="1.6" fill="none"/><circle class="zo" cx="0" cy="-37" r="3.2" fill="var(--mz-acc)"/><path class="zo" fill="var(--mz-ink)" d="M-12,1 Q0,-10 12,1 Q0,-2 -12,1 Z"/><path d="M-9,-1 H9" stroke="#e9e3d6" stroke-width="2" stroke-dasharray="2 2"/><path class="zo" fill="#c9412f" d="M-30,-30 Q0,-52 30,-30 Q22,-38 0,-40 Q-22,-38 -30,-30 Z"/>`,
  beanie: `<path class="zo" fill="#3a6fb5" d="M-40,0 Q-42,-38 0,-41 Q42,-38 40,0 Z"/><path d="M-26,-30 Q-28,-14 -26,-2 M-13,-37 Q-14,-18 -13,-2 M0,-40 V-2 M13,-37 Q14,-18 13,-2 M26,-30 Q28,-14 26,-2" stroke="rgba(255,255,255,.18)" stroke-width="2.2" fill="none"/><path class="zo" fill="#2c5590" d="M-43,-8 Q0,-15 43,-8 L43,5 Q0,-2 -43,5 Z"/><path d="M-36,-9 V3 M-26,-11 V1 M-16,-12 V0 M-6,-12.5 V-0.5 M4,-12.5 V-0.5 M14,-12 V0 M24,-11 V1 M34,-9.5 V2.5" stroke="rgba(255,255,255,.2)" stroke-width="2"/><circle class="zo" cx="0" cy="-46" r="9" fill="#f2ede0"/>`,
  straw: `<path class="zo" fill="#e2bd6b" d="M-74,5 Q-70,-8 0,-10 Q70,-8 74,5 Q70,15 0,16 Q-70,15 -74,5 Z"/><path class="zo" fill="#edd08a" d="M-36,-1 Q-38,-36 0,-38 Q38,-36 36,-1 Q0,-6 -36,-1 Z"/><path class="zo" fill="var(--mz-acc)" stroke-width="1.6" d="M-37,-11 Q0,-17 37,-11 L36,-2 Q0,-7 -36,-2 Z"/><path d="M-60,6 Q0,0 60,6 M-30,-22 Q0,-27 30,-22" stroke="rgba(120,80,20,.3)" stroke-width="1.6" fill="none" stroke-dasharray="3 3"/>`,
  night: `<path class="zo" fill="#4b5bd6" d="M-40,-4 Q-36,-46 4,-50 Q40,-48 56,-14 Q72,4 82,30 Q66,18 46,-2 Q28,-12 0,-12 Q-26,-12 -40,-4 Z"/><circle cx="-10" cy="-34" r="2.5" fill="#ffd34d"/><circle cx="20" cy="-30" r="2" fill="#ffd34d"/><circle cx="44" cy="-10" r="1.8" fill="#ffd34d"/><path class="zo" fill="#fff" d="M-44,-4 Q0,-16 44,-4 L45,6 Q0,-6 -45,6 Z"/><circle class="zo" cx="84" cy="33" r="8" fill="#fff"/>`,
  party: `<path class="zo" fill="#ffc23a" d="M-24,0 L0,-62 L24,0 Q0,7 -24,0 Z"/><path d="M-16,-18 L16,-18 M-10,-34 L10,-34" stroke="var(--mz-acc)" stroke-width="4"/><circle class="zo" cx="0" cy="-65" r="6.5" fill="var(--mz-acc)"/>`,
};
/** a hat on this hair, and where his hair is cut off under it (null: nothing tucked, the party hat sits on top) */
export function hatSvg(hat: string | null, hair: Hair): { svg: string; clipY: number | null } {
  if (!hat || hat === "none" || !HAT_ART[hat]) return { svg: "", clipY: null };
  const H = HAIR[hair] || HAIR.curly;
  if (hat === "party") return { svg: `<g transform="translate(120 ${H.top + 5}) scale(.95)">${HAT_ART.party}</g>`, clipY: null };
  const s = H.half / 40, sy = s * (hair === "curly" ? 0.9 : 0.95);
  return { svg: `<g transform="translate(120 ${H.band}) scale(${Math.round(s * 1000) / 1000} ${Math.round(sy * 1000) / 1000})">${HAT_ART[hat]}</g>`, clipY: H.band - 3 };
}

export type WearParts = { body: string; slv: string; fore: string; legL: string; legR: string };
/** the clothes of one look, for the rig's holders (glasses and hats are drawn separately: they change on their own) */
export function wearSvg(w: MzWear, u: string): WearParts {
  const d = dress(w, u), sk = w.shoes === "own" ? d.shoe : w.shoes;
  return { body: d.body, slv: sleeveSvg(d), fore: foreSvg(d), legL: leg(d.legs, sk, false), legR: leg(d.legs, sk, true) };
}
