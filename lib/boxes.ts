/**
 * Which boxes on an entry's or a section's dashboard page are open, as last saved (items.boxes, sections.boxes).
 * A box that isn't in here hasn't been saved yet, so it starts its own way.
 */
export type BoxState = Record<string, boolean>;

export function cleanBoxes(raw: unknown): BoxState {
  let parsed: unknown = raw;
  if (typeof raw === "string") { try { parsed = JSON.parse(raw); } catch { return {}; } }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const out: BoxState = {};
  for (const [name, open] of Object.entries(parsed).slice(0, 20)) if (/^[a-z]{1,20}$/.test(name) && typeof open === "boolean") out[name] = open;
  return out;
}

export const boxOpen = (saved: BoxState, name: string, first: boolean) => saved[name] ?? first;
