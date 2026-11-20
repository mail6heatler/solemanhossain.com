/**
 * The visitor's own record of their visits, kept only in their browser (localStorage lc_visit) for the footer's receipt: how many visits and
 * since when, when the previous one started (for "new since your last visit"), and this visit's sections seen, entries opened, reactions,
 * votes, messages, comments and hearts. Nothing here is sent anywhere. A visit ends after 30 minutes away (the usual analytics rule), so
 * a second tab or a reload is the same visit; `total` keeps the seconds spent on earlier visits, so the receipt can show all-time time.
 */
export type Opened = { t: string; h: string };
export type Visit = {
  first: string; visits: number; prev: string; start: string; last: string; total: number;
  seen: string[]; opened: Opened[]; reactions: number; votes: number; messages: number; comments: number; hearts: number;
};
const KEY = "lc_visit";
const AWAY = 30 * 60 * 1000;
const blank = (now: string): Visit => ({ first: now, visits: 0, prev: "", start: now, last: "", total: 0, seen: [], opened: [], reactions: 0, votes: 0, messages: 0, comments: 0, hearts: 0 });

export function readVisit(): Visit | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    return v && typeof v === "object" ? { ...blank(new Date().toISOString()), ...v } : null;
  } catch { return null; }
}
function write(v: Visit) {
  v = { ...v, last: new Date().toISOString() };
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private window: the receipt shows this page only */ }
  window.dispatchEvent(new Event("lc-visit"));
}

/** Starts a new visit if there's none or the last one went quiet over 30 minutes ago; otherwise keeps this one going. */
export function beginVisit(): Visit {
  const now = new Date().toISOString();
  let v = readVisit() ?? blank(now);
  const gone = !v.visits || !v.last || Date.now() - new Date(v.last).getTime() > AWAY;
  if (gone) {
    const spent = v.visits && v.last ? Math.max(0, Math.round((new Date(v.last).getTime() - new Date(v.start).getTime()) / 1000)) : 0;
    v = { ...v, visits: v.visits + 1, prev: v.visits ? v.start : "", start: now, total: (v.total || 0) + spent, seen: [], opened: [], reactions: 0, votes: 0, messages: 0, comments: 0, hearts: 0 };
  }
  write(v);
  return v;
}
/** Keeps the visit alive while the page is open (called now and then), so time spent counts and the visit doesn't end under the visitor. */
export function touchVisit() { const v = readVisit(); if (v && v.visits) write(v); }
/** Seconds spent this visit and on every visit, as of `now`. */
export function visitTimes(v: Visit, now: number) {
  const here = Math.max(0, Math.round((now - new Date(v.start).getTime()) / 1000));
  return { here, all: (v.total || 0) + here };
}

type Count = "reactions" | "votes" | "messages" | "comments" | "hearts";
export function bump(kind: Count) { const v = readVisit(); if (v) write({ ...v, [kind]: v[kind] + 1 }); }
export function markSeen(slug: string) { const v = readVisit(); if (v && !v.seen.includes(slug)) write({ ...v, seen: [...v.seen, slug] }); }
export function addOpened(t: string, h: string) {
  const v = readVisit();
  if (v && t && !v.opened.some((o) => o.h === h)) write({ ...v, opened: [...v.opened, { t: t.slice(0, 80), h }].slice(-12) });
}
