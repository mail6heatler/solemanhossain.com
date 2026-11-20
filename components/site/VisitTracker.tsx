"use client";
import { useEffect } from "react";
import { addOpened, beginVisit, bump, markSeen, touchVisit } from "./visit";

/**
 * Keeps the visitor's own visit record (visit.ts) for the footer's receipt: a section counts as seen after it has filled a good part of the
 * screen for a moment, an entry's page counts as opened, and reactions, votes, chat messages, comments and Wall hearts are counted from the
 * events those parts already send. Only in this browser.
 */
export default function VisitTracker() {
  useEffect(() => {
    beginVisit();
    const m = /^\/s\/[^/]+\/\d+/.exec(location.pathname);
    if (m) addOpened(document.title.split(/\s[—|·-]\s/)[0].trim(), m[0]);
    const timers = new Map<Element, number>();
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      const id = (e.target as HTMLElement).id;
      if (e.isIntersecting && e.intersectionRatio > 0.3) { if (!timers.has(e.target)) timers.set(e.target, window.setTimeout(() => markSeen(id), 1200)); }
      else { clearTimeout(timers.get(e.target)); timers.delete(e.target); }
    }), { threshold: [0, 0.3, 0.6] });
    document.querySelectorAll("section.chap[id]").forEach((s) => io.observe(s));
    const on = (name: string, fn: () => void) => { window.addEventListener(name, fn); return () => window.removeEventListener(name, fn); };
    const offs = [on("lc-reacted", () => bump("reactions")), on("lc-vote", () => bump("votes")), on("lc-chat-sent", () => bump("messages")), on("lc-talk", () => bump("comments")), on("lc-heart", () => bump("hearts"))];
    const alive = setInterval(() => { if (document.visibilityState === "visible") touchVisit(); }, 30000);
    return () => { clearInterval(alive); io.disconnect(); timers.forEach((t) => clearTimeout(t)); offs.forEach((f) => f()); };
  }, []);
  return null;
}
