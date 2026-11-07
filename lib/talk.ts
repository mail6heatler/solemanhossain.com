/**
 * What an entry's reaction bar offers beyond its five emojis, per entry (items.talk). Each has its own switch in the dashboard's
 * Reactions & comments box. Comments start off, so nothing about comments changes on an entry until the owner turns them on.
 * [key, starts on, what the switch says, what it does]
 */
export const TALK_FEATURES = [
  ["comments", false, "Let people comment", "A comment box under the emojis, and a 💬 button with the count."],
  ["float", true, "Comments float up with a burst", "A new comment rises from the box when it's sent."],
  ["total", true, "Show the total number of reactions", "Beside the emojis, once there's at least one."],
  ["top", true, "Crown the most-used emoji", "Only when one emoji is ahead of all the others."],
  ["share", true, "Share button", "Opens the phone's share menu. On a computer it copies the link."],
  ["replies", true, "Show my replies and my pinned comment", "When this is off they stay saved, but visitors don't see them."],
  ["who", true, "List who reacted", "The list below, here in the dashboard. Only you ever see it."],
  ["notify", true, "Tell me about new comments", "In the bell and the Inbox count."],
] as const;

export type TalkKey = (typeof TALK_FEATURES)[number][0];
export type TalkInfo = Record<TalkKey, boolean>;

export const DEFAULT_TALK = Object.fromEntries(TALK_FEATURES.map(([k, on]) => [k, on])) as TalkInfo;

export function cleanTalk(raw: unknown): TalkInfo {
  let parsed: unknown = raw;
  if (typeof raw === "string") { try { parsed = JSON.parse(raw); } catch { parsed = {}; } }
  const given = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  const out = { ...DEFAULT_TALK };
  for (const [k] of TALK_FEATURES) { const v = given[k]; if (typeof v === "boolean") out[k] = v; }
  return out;
}

export const COMMENT_MAX = 500;
