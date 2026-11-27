"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DEFAULT_TALK, type TalkInfo } from "@/lib/talk";
import type { PartAttrs } from "./cardParts";
import { useCardBar } from "./BarCtx";
import { loadReactions, sendReaction, type LastComment } from "./reactLoad";
import { askName, savedName } from "./askName";
import { TalkDialog } from "./Talk";
import { burst, whenSettled } from "./fx";

type Fx = typeof import("./cardBarFx");
let fxP: Promise<Fx> | null = null;
/** The motion (cardBarFx.ts, with GSAP): fetched once the page has settled, or the first time a bar is pointed at. */
const loadFx = () => (fxP ??= import("./cardBarFx"));
let warmed = false;

const NAMES: Record<string, string> = { "❤️": "Love", "🔥": "Fire", "😂": "Haha", "🤯": "Mind blown", "👏": "Clap" };
const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** What the live editor shows: the bar standing still, with the entry's real numbers. */
export type StillBar = { counts: Record<string, number>; comments: number; last?: LastComment };

/**
 * The bar at the bottom of every card (2026-11-27, the owner's "Tab footer"): React, Comment and Share as equal tabs, with the Open tab that
 * Box adds after it (FullView.tsx) making four. Pointing at React (tapping it on a phone, or Enter) brings the emojis up out of it, each with
 * its own move (cardBarFx.ts); a highlight slides to the tab under the mouse and each tab comes alive in its own way. The newest comment sits
 * above the tabs. What shows follows the dashboard's Card buttons page (settings.cardBar, through BarCtx) and then the entry's own switches
 * (`talk`). `attrs` are the sizes the owner dragged in the live editor: `bar` for the tabs, `talk` for the comment line. `still` draws it for
 * the live editor: nothing to click, nothing fetched.
 */
export default function CardBar({ id, talk, href, attrs, still }: { id: number; talk?: TalkInfo; href?: string; attrs?: { bar?: PartAttrs; talk?: PartAttrs }; still?: StillBar }) {
  const cfg = useCardBar();
  const t = talk ?? DEFAULT_TALK;
  const [counts, setCounts] = useState<Record<string, number>>(still?.counts ?? {});
  const [mine, setMine] = useState<string[]>([]);
  const [comments, setComments] = useState(still?.comments ?? 0);
  const [last, setLast] = useState<LastComment>(still?.last ?? null);
  const [tray, setTray] = useState(false);
  const [talkOpen, setTalkOpen] = useState(false);
  const [said, setSaid] = useState("");
  const bar = useRef<HTMLDivElement>(null);
  const trayEl = useRef<HTMLDivElement>(null);
  const hi = useRef<HTMLElement>(null);
  const totalEl = useRef<HTMLElement>(null);
  const talkEl = useRef<HTMLElement>(null);
  const meEl = useRef<HTMLSpanElement>(null);
  // kept across draws, so a timer set before a re-draw still knows the truth: whether the emojis are up, the tab under the mouse
  const st = useRef({ by: "" as "" | "hover" | "click", openT: 0 as ReturnType<typeof setTimeout> | 0, closeT: 0 as ReturnType<typeof setTimeout> | 0, busy: false, total: -1, comments: -1, closing: false, up: false, cur: null as HTMLElement | null });
  st.current.up = tray;

  const emojis = cfg.emojis;
  const showTotal = cfg.total && t.total;
  const showCrown = cfg.crown && t.top;
  const showTalk = cfg.comments && t.comments;
  const showShare = cfg.share && t.share;
  const showLast = showTalk && cfg.last;
  const n = 1 + (showTalk ? 1 : 0) + (showShare ? 1 : 0);
  const total = emojis.reduce((a, e) => a + (counts[e] ?? 0), 0);
  const ranked = emojis.map((e) => counts[e] ?? 0).sort((a, b) => b - a);
  const crowned = showCrown && ranked[0] > (ranked[1] ?? 0) ? emojis.find((e) => (counts[e] ?? 0) === ranked[0]) : undefined;
  const myEmoji = mine.find((e) => emojis.includes(e));

  /** The motion only runs when the dashboard says Lively, the visitor hasn't turned motion off, and the device isn't a slow one. */
  const lively = () => cfg.motion === "lively" && !still && !matchMedia("(prefers-reduced-motion: reduce)").matches && !document.documentElement.classList.contains("lite");

  useEffect(() => {
    if (still) return;
    let live = true;
    loadReactions(id).then((s) => { if (live) { setCounts(s.counts); setMine(s.mine); setComments(s.comments ?? 0); setLast(s.last ?? null); } });
    const sync = (e: Event) => { const d = (e as CustomEvent<{ id: number; counts: Record<string, number>; mine: string[] }>).detail; if (d.id === id) { setCounts(d.counts); setMine(d.mine); } };
    const talked = (e: Event) => { const d = (e as CustomEvent<{ id: number; count: number; last?: LastComment }>).detail; if (d.id === id) { setComments(d.count); if (d.last !== undefined) setLast(d.last); } };
    addEventListener("lc-react", sync);
    addEventListener("lc-talk", talked);
    // the motion is fetched while the browser is idle, so the first time someone points at a bar it's already here
    if (!warmed && cfg.motion === "lively") { warmed = true; whenSettled(() => { loadFx().catch(() => {}); }, 6); }
    return () => { live = false; removeEventListener("lc-react", sync); removeEventListener("lc-talk", talked); };
  }, [id, still, cfg.motion]);

  // a number that changed rolls in
  useEffect(() => {
    const s = st.current;
    if (s.total >= 0 && s.total !== total && totalEl.current && lively()) { const el = totalEl.current, up = total > s.total; loadFx().then((f) => f.rollIn(el, up)).catch(() => {}); }
    s.total = total;
  }, [total]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const s = st.current;
    if (s.comments >= 0 && s.comments !== comments && talkEl.current && lively()) { const el = talkEl.current, up = comments > s.comments; loadFx().then((f) => f.rollIn(el, up)).catch(() => {}); }
    s.comments = comments;
  }, [comments]); // eslint-disable-line react-hooks/exhaustive-deps

  // the emojis come up when the tray opens (it starts invisible, `pre`, until the motion takes it over)
  useIso(() => {
    const el = trayEl.current;
    if (!tray || !el) return;
    if (!lively()) { el.classList.remove("cbar-pre"); return; }
    loadFx().then((f) => { if (trayEl.current === el && !st.current.closing) f.openTray(el); }).catch(() => el.classList.remove("cbar-pre"));
  }, [tray]);

  const openTray = (by: "hover" | "click") => {
    const s = st.current;
    clearTimeout(s.closeT); clearTimeout(s.openT);
    s.closing = false;
    if (s.up) { if (by === "click") s.by = "click"; return; }
    s.by = by;
    s.up = true;
    setTray(true);
  };
  const closeTray = () => {
    const s = st.current;
    clearTimeout(s.openT); clearTimeout(s.closeT);
    if (!s.up || s.closing) return;
    s.by = "";
    const el = trayEl.current;
    const shut = () => { s.closing = false; s.up = false; setTray(false); };
    if (el && lively() && fxP) { s.closing = true; loadFx().then((f) => f.closeTray(el)).then(() => { if (s.closing) shut(); }).catch(shut); }
    else shut();
  };

  // pointing, leaving, pressing, Escape and a tap elsewhere; nothing of this in the live editor
  useEffect(() => {
    const b = bar.current, foot = b?.parentElement, root = document.documentElement;
    if (still || !b || !foot) return;
    const s = st.current;
    const kindOf = (el: Element) => (el.classList.contains("ctab-react") ? "react" : el.classList.contains("ctab-talk") ? "talk" : el.classList.contains("ctab-share") ? "share" : el.classList.contains("full-view") ? "open" : "");
    const tabOf = (x: EventTarget | null) => { const el = (x as Element | null)?.closest?.(".ctab, .full-view") as HTMLElement | null; return el && foot.contains(el) ? el : null; };
    const enter = (tab: HTMLElement | null) => {
      const was = s.cur;
      if (tab === was) return;
      s.cur = tab;
      const go = lively();
      if (go || fxP) loadFx().then((f) => {
        if (was && go) f.tabLeave(was, kindOf(was));
        if (!go) return;
        if (hi.current) f.slideHi(hi.current, foot, tab);
        if (tab) f.tabEnter(tab, kindOf(tab));
      }).catch(() => {});
      if (tab && kindOf(tab) === "react") { clearTimeout(s.closeT); clearTimeout(s.openT); s.openT = setTimeout(() => openTray("hover"), 110); }
      else if (tab && s.by === "hover") { clearTimeout(s.closeT); s.closeT = setTimeout(closeTray, 220); }
    };
    // only a mouse really moving counts: Chrome also says "pointer over" when scrolling brings a card under a mouse that's resting
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || (!e.movementX && !e.movementY) || root.classList.contains("scrolling")) return;
      if ((e.target as Element).closest?.(".cbar-tray")) { clearTimeout(s.closeT); return; }
      enter(tabOf(e.target));
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      enter(null);
      clearTimeout(s.openT);
      if (s.by === "hover") { clearTimeout(s.closeT); s.closeT = setTimeout(closeTray, 300); }
    };
    const onDown = (e: PointerEvent) => { const tab = tabOf(e.target); if (tab && lively()) loadFx().then((f) => f.press(tab)).catch(() => {}); };
    const onUp = (e: PointerEvent) => { const tab = tabOf(e.target); if (tab && fxP) loadFx().then((f) => f.release(tab)).catch(() => {}); };
    const warm = () => { if (cfg.motion === "lively") loadFx().catch(() => {}); };
    foot.addEventListener("pointermove", onMove);
    foot.addEventListener("pointerleave", onLeave);
    foot.addEventListener("pointerdown", onDown);
    foot.addEventListener("pointerup", onUp);
    foot.addEventListener("pointercancel", onUp);
    foot.addEventListener("pointerenter", warm, { once: true });
    return () => {
      clearTimeout(s.openT); clearTimeout(s.closeT);
      foot.removeEventListener("pointermove", onMove);
      foot.removeEventListener("pointerleave", onLeave);
      foot.removeEventListener("pointerdown", onDown);
      foot.removeEventListener("pointerup", onUp);
      foot.removeEventListener("pointercancel", onUp);
      foot.removeEventListener("pointerenter", warm);
    };
  });

  // while the emojis are up: a tap anywhere else or Escape puts them away
  useEffect(() => {
    if (!tray || still) return;
    const away = (e: PointerEvent) => { if (!bar.current?.contains(e.target as Node)) closeTray(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { closeTray(); bar.current?.querySelector<HTMLElement>(".ctab-react")?.focus(); } };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", away, true); document.removeEventListener("keydown", key); };
  });

  // the dashboard's preview: ▶ makes the first card on screen show its emojis coming up
  useEffect(() => {
    if (still) return;
    const play = () => {
      const all = Array.from(document.querySelectorAll(".cbar")).filter((el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; });
      if (all[0] !== bar.current) return;
      openTray("click");
      setTimeout(closeTray, 2600);
    };
    addEventListener("lc-bar-play", play);
    return () => removeEventListener("lc-bar-play", play);
  });

  const pick = async (emoji: string, btn: HTMLButtonElement) => {
    const s = st.current;
    if (s.busy || still) return;
    const adding = !mine.includes(emoji);
    let name = savedName();
    if (adding && !name) {
      name = await askName(emoji);
      if (!name) return; // they closed the box: no reaction
    }
    s.busy = true;
    const before = { counts, mine };
    setMine((m) => (adding ? [...m, emoji] : m.filter((x) => x !== emoji)));
    setCounts((c) => ({ ...c, [emoji]: Math.max(0, (c[emoji] ?? 0) + (adding ? 1 : -1)) }));
    const go = lively();
    if (adding && cfg.bursts) { const r = btn.getBoundingClientRect(); burst(r.left + r.width / 2, r.top, [emoji], go ? 12 : 5, go ? 95 : 50); }
    if (go) loadFx().then((f) => f.picked(btn, emoji, meEl.current?.parentElement ?? null, adding)).catch(() => {});
    setTimeout(closeTray, go ? 420 : 150);
    try {
      if (!(await sendReaction(id, emoji, name, adding))) { setCounts(before.counts); setMine(before.mine); }
    } catch { setCounts(before.counts); setMine(before.mine); } finally { s.busy = false; }
  };

  const share = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const tab = e.currentTarget;
    if (lively()) loadFx().then((f) => f.shared(tab)).catch(() => {});
    const url = new URL(href ?? location.pathname, location.href).href;
    if (navigator.share && matchMedia("(any-pointer: coarse)").matches) { try { await navigator.share({ url }); } catch {} return; }
    try { await navigator.clipboard.writeText(url); setSaid("Link copied!"); } catch { setSaid("Couldn't copy it"); }
    setTimeout(() => setSaid(""), 1500);
  };

  const stop = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); };
  const tab = still ? { tabIndex: -1 } : {};
  const word = (w: string) => (cfg.words ? <span className="ct-w">{w}</span> : null);

  return (
    <>
      {showLast && (
        <button type="button" className="cbar-last" {...tab} {...attrs?.talk} data-part={still ? "comments" : attrs?.talk?.["data-part"]}
          onClick={(e) => { stop(e); if (!still) setTalkOpen(true); }} aria-label={last ? `Newest comment, from ${last.name}. Open the comments` : "Be the first to comment"}>
          <i className="ti ti-message-circle" aria-hidden />
          {last ? <span className="cl-t"><b>{last.name}</b> {last.body}</span> : <span className="cl-t cl-none">Be the first to say something</span>}
        </button>
      )}
      <div ref={bar} className={`cbar${tray ? " cbar-up" : ""}${cfg.words ? "" : " no-words"}`} role="group" aria-label="React, comment or share" {...attrs?.bar}
        data-part={still ? "reacts" : attrs?.bar?.["data-part"]} style={{ ...attrs?.bar?.style, "--n": n } as React.CSSProperties}>
        {tray && (
          <div ref={trayEl} className={`cbar-tray${lively() ? " cbar-pre" : ""}`} role="group" aria-label="Pick a reaction">
            {emojis.map((e) => {
              const c = counts[e] ?? 0;
              return (
                <button key={e} type="button" className={`ce${mine.includes(e) ? " mine" : ""}${e === crowned ? " top" : ""}`} data-e={e} data-name={NAMES[e] ?? ""} aria-pressed={mine.includes(e)}
                  aria-label={`${NAMES[e] ?? "React"} ${e}, ${c} so far`} onClick={(ev) => { stop(ev); pick(e, ev.currentTarget); }}
                  onPointerEnter={(ev) => { if (ev.pointerType === "mouse" && lively()) { const b = ev.currentTarget; loadFx().then((f) => f.emojiEnter(b)).catch(() => {}); } }}
                  onPointerLeave={(ev) => { if (ev.pointerType === "mouse" && fxP) { const b = ev.currentTarget; loadFx().then((f) => f.emojiLeave(b)).catch(() => {}); } }}>
                  <span className="ce-e" aria-hidden>{e}</span><span className="ce-n" aria-hidden>{c > 0 ? c : ""}</span>
                </button>
              );
            })}
          </div>
        )}
        <button type="button" className={`ctab ctab-react${myEmoji ? " mine" : ""}`} {...tab} aria-expanded={tray} aria-label={`React${showTotal ? ` (${total} so far)` : ""}${myEmoji ? `, you gave ${myEmoji}` : ""}`}
          onClick={(e) => {
            stop(e);
            if (still) return;
            if (!tray) { openTray("click"); if (e.detail === 0) setTimeout(() => trayEl.current?.querySelector<HTMLElement>(".ce")?.focus(), 30); }
            else if (st.current.by === "hover") st.current.by = "click";
            else closeTray();
          }}>
          <span className="ct-ic">{myEmoji ? <span ref={meEl} className="ce-me">{myEmoji}</span> : <i ref={meEl as React.Ref<HTMLElement>} className="ti ti-mood-smile" aria-hidden />}</span>
          <span className="ct-lb">{word("React")}{showTotal && total > 0 && <b ref={totalEl} className="ct-n" key={total}>{total}</b>}</span>
        </button>
        {showTalk && (
          <button type="button" className="ctab ctab-talk" {...tab} aria-label={`Comments (${comments})`} onClick={(e) => { stop(e); if (!still) setTalkOpen(true); }}>
            <span className="ct-ic"><i className="ti ti-message-circle" aria-hidden /><span className="ct-dots" aria-hidden><i /><i /><i /></span></span>
            <span className="ct-lb">{word("Comment")}{comments > 0 && <b ref={talkEl} className="ct-n" key={comments}>{comments}</b>}</span>
          </button>
        )}
        {showShare && (
          <button type="button" className="ctab ctab-share" {...tab} aria-label="Share this" onClick={(e) => { stop(e); if (!still) share(e); }}>
            <span className="ct-ic"><i className="ti ti-share" aria-hidden /></span>
            <span className="ct-lb">{word("Share")}</span>
            {said && <span className="r-said" role="status">{said}</span>}
          </button>
        )}
      </div>
      {!still && <i ref={hi} className="cbar-hi" aria-hidden />}
      {talkOpen && <TalkDialog id={id} float={t.float} onClose={() => setTalkOpen(false)} />}
    </>
  );
}
