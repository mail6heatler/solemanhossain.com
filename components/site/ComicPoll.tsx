"use client";
import { useEffect, useRef, useState } from "react";
import { Burst } from "./comicArt";
import { usePoll } from "./PollCard";

type PollLook = "scale" | "vs" | "quick" | "slash" | "quad";

const HINT: Record<PollLook, string> = {
  scale: "Tap a pan to vote and see results",
  vs: "Tap a side to vote and see results",
  quick: "Hit a buzzer to vote and see results",
  slash: "Tap a slash to vote and see results",
  quad: "Tap a panel to vote and see results",
};
const LETTERS = "ABCD";
const COLOURS: Record<string, React.CSSProperties[]> = {
  quick: [{ "--c": "var(--mint)", "--on-c": "var(--on-mint)" }, { "--c": "var(--pop2)", "--on-c": "var(--bg)", "--c3": "var(--fg)" }, { "--c": "var(--pop3)", "--on-c": "var(--bg)", "--c3": "var(--fg)" }, { "--c": "var(--inv-fg)", "--on-c": "var(--inv-bg)" }] as unknown as React.CSSProperties[],
  fill: [{ "--c": "var(--pop2)" }, { "--c": "var(--mint)" }, { "--c": "var(--pop3)" }, { "--c": "var(--inv-fg)" }] as unknown as React.CSSProperties[],
};
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
/** How many letters are in the longest word of any option, which is what sets how big the names can be. */
const longestWord = (options: string[]) => Math.max(1, ...options.flatMap((o) => o.split(/\s+/).map((w) => Array.from(w).length)));

function Pop({ at, word, seed, onDone }: { at: { x: number; y: number }; word: string; seed: number; onDone: () => void }) {
  return (
    <span className="cmp-pow" style={{ left: at.x, top: at.y }} aria-hidden onAnimationEnd={(e) => { if (e.target === e.currentTarget) onDone(); }}>
      <Burst spikes={12} seed={seed} className="cmp-pow-burst" /><b>{word}</b>
    </span>
  );
}

/**
 * A poll you vote on by tapping the art: a pan of a scale, a side of a face-off, a buzzer, a slash or a small panel. Everything that moves after a
 * vote moves by a transition on a transform, so it costs nothing until someone votes. The votes are the usual poll's. `still` is the dashboard's
 * preview, which only shows how it looks.
 */
export default function ComicPoll({ id, options, look, word, confetti = false, still = false }: { id: number; options: string[]; look: PollLook; word: string; confetti?: boolean; still?: boolean }) {
  const { counts, mine, busy, vote, show, total } = usePoll(id, confetti, still);
  const box = useRef<HTMLDivElement>(null);
  const [pow, setPow] = useState<{ x: number; y: number; n: number } | null>(null);
  const share = (i: number) => (show && total ? (counts?.[i] ?? 0) / total : 0);
  const pct = (i: number) => Math.round(share(i) * 100);
  const tap = (i: number, el: HTMLElement) => {
    if (still) return;
    vote(i, el);
    const b = box.current?.getBoundingClientRect(), r = el.getBoundingClientRect();
    if (b) setPow((p) => ({ x: r.left + r.width / 2 - b.left, y: r.top + r.height / 2 - b.top, n: (p?.n ?? 0) + 1 }));
  };
  const opt = (i: number, className: string, style?: React.CSSProperties) => ({
    type: "button" as const,
    className: `${className}${mine === i ? " mine" : ""}`,
    style,
    disabled: busy,
    "aria-pressed": mine === i,
    tabIndex: still ? -1 : undefined,
    onClick: (e: React.MouseEvent<HTMLElement>) => tap(i, e.currentTarget),
  });
  const label = (i: number) => <span className="n">{mine === i ? "✓ " : ""}{options[i]}</span>;
  const result = (i: number) => (show ? <em>{pct(i)}%</em> : null);

  let play: React.ReactNode = null;
  if (look === "scale") {
    const l = counts?.[0] ?? 0, r = counts?.[1] ?? 0;
    const tilt = show && l + r ? clamp(((r - l) / (l + r)) * 34, -15, 15) : 0;
    const strings = <svg viewBox="0 0 88 46" preserveAspectRatio="none" aria-hidden><path d="M44 0 3 46M44 0 85 46" /></svg>;
    play = (
      <>
        <span className="cmp-post" aria-hidden /><span className="cmp-base" aria-hidden />
        <div className="cmp-beam" style={{ rotate: `${tilt.toFixed(1)}deg` }}>
          {[0, 1].map((i) => (
            <div key={i} className={`cmp-arm ${i ? "r" : "l"}`} style={{ rotate: `${(-tilt).toFixed(1)}deg` }}>
              {strings}
              <button {...opt(i, "cmp-pan")}>{label(i)}{result(i)}</button>
            </div>
          ))}
        </div>
        {options[2] !== undefined && <button {...opt(2, "cmp-mid")}>{label(2)}{result(2)}</button>}
      </>
    );
  } else if (look === "vs") {
    const a = show && total ? clamp((counts?.[0] ?? 0) / total, 0.22, 0.78) : 0.5;
    play = (
      <>
        <span className="cmp-a" style={{ transform: `scaleX(${a.toFixed(3)})` }} aria-hidden /><span className="cmp-dots" aria-hidden />
        {[0, 1].map((i) => <button key={i} {...opt(i, `cmp-side ${i ? "r" : "l"}`)}>{label(i)}{result(i)}</button>)}
        <span className="cmp-move" style={{ translate: `${((a - 0.5) * 100).toFixed(1)}% 0` }} aria-hidden>
          <span className="cmp-line" /><Burst spikes={11} seed={id} className="cmp-vs-burst" /><b className="cmp-vs-word">VS</b>
        </span>
      </>
    );
  } else if (look === "quick") {
    play = (
      <>
        <Burst spikes={12} seed={id} className="cmp-q" /><b className="cmp-qm" aria-hidden>?</b>
        <div className={`cmp-row n${options.length}`}>
          {options.map((_, i) => <button key={i} {...opt(i, "cmp-bz", COLOURS.quick[i])}><i aria-hidden>{LETTERS[i]}</i>{label(i)}{result(i)}</button>)}
        </div>
      </>
    );
  } else if (look === "slash") {
    play = options.map((_, i) => (
      <button key={i} {...opt(i, "cmp-sl", COLOURS.fill[i])}><u style={{ transform: `scaleY(${share(i).toFixed(3)})` }} aria-hidden /><span className="in">{label(i)}{result(i)}</span></button>
    ));
  } else {
    play = options.map((_, i) => (
      <button key={i} {...opt(i, "cmp-qd", COLOURS.fill[i])}><u style={{ transform: `scaleY(${share(i).toFixed(3)})` }} aria-hidden />{label(i)}{result(i)}</button>
    ));
  }

  return (
    <div ref={box} className={`cmp cmp-${look}${options.some((o) => o.length > 22) ? " wordy" : ""}`} style={{ "--w": longestWord(options) } as React.CSSProperties}>
      <div className="cmp-play">{play}</div>
      <div className="poll-foot">{show ? `${total} vote${total === 1 ? "" : "s"} · tap another to change your vote` : HINT[look]}</div>
      {pow && <Pop key={pow.n} at={pow} word={word} seed={id + pow.n} onDone={() => setPow(null)} />}
    </div>
  );
}

/**
 * A quick fire question that isn't a poll: a buzzer reveals the answer, which is the entry's story. The answer is only hidden once this has
 * started, so without JavaScript it simply shows.
 */
export function ComicReveal({ hasAnswer, word, still }: { hasAnswer: boolean; word: string; still?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pow, setPow] = useState<{ x: number; y: number; n: number } | null>(null);
  useEffect(() => {
    if (still || !hasAnswer) return;
    ref.current?.closest(".cm")?.classList.toggle("cm-hide", !open);
  }, [open, hasAnswer, still]);
  return (
    <div ref={ref} className="cmp cmp-reveal">
      <div className="cmp-play">
        <Burst spikes={12} seed={7} className="cmp-q" /><b className="cmp-qm" aria-hidden>?</b>
        {hasAnswer && (
          <button type="button" className={`cmp-bz one${open ? " mine" : ""}`} aria-expanded={open} tabIndex={still ? -1 : undefined} style={COLOURS.quick[1]}
            onClick={(e) => {
              if (still) return;
              setOpen((o) => !o);
              const b = ref.current?.getBoundingClientRect(), r = e.currentTarget.getBoundingClientRect();
              if (b && !open) setPow((p) => ({ x: r.left + r.width / 2 - b.left, y: r.top + r.height / 2 - b.top, n: (p?.n ?? 0) + 1 }));
            }}>
            <i aria-hidden>!</i><span className="n">{open ? "Hide the answer" : "Hit me for the answer"}</span>
          </button>
        )}
      </div>
      {pow && <Pop key={pow.n} at={pow} word={word} seed={7 + pow.n} onDone={() => setPow(null)} />}
    </div>
  );
}
