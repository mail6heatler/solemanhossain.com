"use client";
import { useEffect, useState } from "react";
import { REACTION_EMOJIS } from "@/lib/settings";
import type { TalkInfo } from "@/lib/talk";
import { ShareButton, TalkPanel, TalkRow } from "./Talk";
import type { PartAttrs } from "./cardParts";
import { burst } from "./fx";
import { askName, savedName } from "./askName";
import { loadReactions as load, type ReactState as State } from "./reactLoad";
import CardBar from "./CardBar";

/** Each emoji's own way of moving on hover (see `reactfx` in site.css). */
const MOVES: Record<string, string> = { "❤️": "heart", "🔥": "fire", "😂": "laugh", "🤯": "mind", "👏": "clap" };

/**
 * ❤️ 🔥 😂 🤯 👏 under an entry. Tap to add, tap again to take it back. `compact` = a card's: since 2026-11-27 that is the tab bar
 * (CardBar.tsx: React, Comment, Share, and the Open tab Box adds); `strip` keeps the small row of emojis (the photo viewer).
 * `talk` is what this entry has switched on beyond the emojis, in the dashboard: the total, the crown, Share and comments. `href` is its page.
 * `attrs` are the size and place the owner gave the bar and the comment box in the dashboard (lib/partSize.ts).
 */
export default function Reactions(props: { id: number; compact?: boolean; strip?: boolean; talk?: TalkInfo; href?: string; attrs?: { bar?: PartAttrs; talk?: PartAttrs } }) {
  if (props.compact && !props.strip) return <CardBar id={props.id} talk={props.talk} href={props.href} attrs={props.attrs} />;
  return <Strip {...props} />;
}

function Strip({ id, compact = false, talk, href, attrs }: { id: number; compact?: boolean; talk?: TalkInfo; href?: string; attrs?: { bar?: PartAttrs; talk?: PartAttrs } }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [popped, setPopped] = useState("");
  const [who, setWho] = useState("");
  const [comments, setComments] = useState(0);

  useEffect(() => {
    let live = true;
    load(id).then((s) => { if (live) { setCounts(s.counts); setMine(s.mine); setComments(s.comments ?? 0); } });
    // other bars for the same entry (e.g. grid + photo viewer) stay in sync
    const sync = (e: Event) => {
      const d = (e as CustomEvent<State & { id: number }>).detail;
      if (d.id === id) { setCounts(d.counts); setMine(d.mine); }
    };
    const talked = (e: Event) => {
      const d = (e as CustomEvent<{ id: number; count: number }>).detail;
      if (d.id === id) setComments(d.count);
    };
    const named = () => setWho(savedName());
    named();
    window.addEventListener("lc-react", sync);
    window.addEventListener("lc-talk", talked);
    window.addEventListener("lc-name", named);
    return () => { live = false; window.removeEventListener("lc-react", sync); window.removeEventListener("lc-talk", talked); window.removeEventListener("lc-name", named); };
  }, [id]);

  const react = async (emoji: string, el: HTMLButtonElement) => {
    if (busy) return;
    const adding = !mine.includes(emoji);
    let name = savedName();
    if (adding && !name) {
      name = await askName(emoji);
      if (!name) return; // they closed the box: no reaction
    }
    setBusy(true);
    const before = { counts, mine };
    // update right away; the server answer replaces it a moment later
    setMine((m) => (adding ? [...m, emoji] : m.filter((x) => x !== emoji)));
    setCounts((c) => ({ ...c, [emoji]: Math.max(0, (c[emoji] ?? 0) + (adding ? 1 : -1)) }));
    setPopped(emoji);
    if (adding) {
      const r = el.getBoundingClientRect(), lively = el.closest(".fx-reactfx");
      burst(r.left + r.width / 2, r.top, [emoji], lively ? 12 : 5, lively ? 95 : 50);
    }
    try {
      const r = await fetch("/api/react", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, emoji, name }) });
      const d = await r.json();
      if (!r.ok) { setCounts(before.counts); setMine(before.mine); }
      if (d.counts) window.dispatchEvent(new CustomEvent("lc-react", { detail: { id, counts: d.counts, mine: d.mine ?? [] } }));
      if (r.ok && adding) window.dispatchEvent(new Event("lc-reacted")); // the visit receipt counts reactions given, not taken back
    } catch {} finally { setBusy(false); }
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  // the crown only goes to an emoji that's ahead of all the others
  const ranked = REACTION_EMOJIS.map((e) => counts[e] ?? 0).sort((a, b) => b - a);
  const crowned = talk?.top && ranked[0] > (ranked[1] ?? 0) ? REACTION_EMOJIS.find((e) => (counts[e] ?? 0) === ranked[0]) : undefined;
  const bar = (
    <div className={`reacts${compact ? " mini" : ""}`} role="group" aria-label={`Reactions (${total})`} {...attrs?.bar}>
      {REACTION_EMOJIS.map((e) => {
        const n = counts[e] ?? 0;
        return (
          <button key={e} type="button" aria-pressed={mine.includes(e)} aria-label={`React ${e}, ${n} so far`}
            className={`${popped === e ? "pop" : ""}${n === 0 ? " zero" : ""}${e === crowned ? " top" : ""}`}
            onAnimationEnd={(ev) => { if (ev.target === ev.currentTarget) setPopped(""); }} onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); react(e, ev.currentTarget); }}>
            <span className={`e m-${MOVES[e] ?? "any"}`} aria-hidden>{e}</span><span className="n" aria-hidden>{n > 0 ? n : ""}</span>
          </button>
        );
      })}
      {talk?.total && total > 0 && <span className="r-total" title={`${total} reaction${total === 1 ? "" : "s"}`}>{compact ? `· ${total}` : `${total} reaction${total === 1 ? "" : "s"}`}</span>}
      {talk?.share && <ShareButton href={href} compact={compact} />}
      {!compact && who && (
        <button type="button" className="reacts-as" onClick={(ev) => { ev.preventDefault(); askName(); }} title="Change your name">
          as {who} <i className="ti ti-pencil" aria-hidden />
        </button>
      )}
    </div>
  );
  if (!talk?.comments) return bar;
  return (
    <>
      {bar}
      {compact ? <TalkRow id={id} count={comments} float={talk.float} attrs={attrs?.talk} /> : <TalkPanel id={id} float={talk.float} attrs={attrs?.talk} />}
    </>
  );
}
