/**
 * His curls, shared by the full drawing (mascotRig.ts) and the light head that peeks while he's away (mascotPeek.ts), so the two always match.
 */
export type C3 = readonly (readonly [number, number, number])[];
export const circles = (list: C3, cls: string) => list.map(([x, y, r]) => `<circle class="${cls}" cx="${x}" cy="${y}" r="${r}"/>`).join("");
export const curlHi = (list: C3) => list.filter((_, i) => i % 2 === 0).map(([x, y, r]) => `<path class="zhi" d="M${x - r * 0.55},${y - r * 0.1} a${r * 0.6},${r * 0.6} 0 0 1 ${r * 0.75},${-r * 0.5}"/>`).join("");
export const CURL_BACK: C3 = [[80, 86, 14], [82, 66, 16], [96, 50, 17], [118, 42, 19], [140, 48, 17], [156, 64, 16], [160, 86, 14], [79, 104, 10], [161, 104, 10]];
export const CURL_FRONT: C3 = [[86, 74, 10], [96, 63, 12], [109, 57, 12.5], [123, 55, 12.5], [137, 59, 12], [149, 67, 11], [156, 78, 8.5], [100, 72, 8], [116, 69, 8.5], [131, 70, 8], [84, 83, 6.5], [157, 85, 6]];
