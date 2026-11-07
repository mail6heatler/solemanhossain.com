"use client";
import { useEffect, useState } from "react";
import { confettiFrom } from "./fx";

/** A poll's votes and how to cast one, for a card's buttons and for the comic strip's panels. `still` is a preview: it fetches nothing. */
export function usePoll(id: number, confetti = false, still = false) {
  const [counts, setCounts] = useState<number[] | null>(null);
  const [mine, setMine] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (still) return;
    fetch(`/api/vote?id=${id}`).then((r) => r.json()).then((d) => {
      if (Array.isArray(d.counts)) { setCounts(d.counts); setMine(d.mine); }
    }).catch(() => {});
  }, [id, still]);

  const vote = async (option: number, el: HTMLElement) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, option }) });
      const d = await r.json();
      if (Array.isArray(d.counts)) { setCounts(d.counts); setMine(d.mine); if (confetti) confettiFrom(el, { count: 60, spread: 60 }); }
    } finally { setBusy(false); }
  };

  const total = counts?.reduce((a, b) => a + b, 0) ?? 0;
  return { counts, mine, busy, vote, total, show: mine !== null };
}

export default function PollCard({ id, options, confetti = false }: { id: number; options: string[]; confetti?: boolean }) {
  const { counts, mine, busy, vote, total, show } = usePoll(id, confetti);
  return (
    <div className="poll">
      {options.map((o, i) => {
        const pct = show && total ? Math.round(((counts?.[i] ?? 0) / total) * 100) : 0;
        return (
          <button key={i} className={`poll-opt ${mine === i ? "mine" : ""}`} onClick={(e) => vote(i, e.currentTarget)} disabled={busy}>
            <span className="bar" style={{ width: show ? pct + "%" : 0 }} />
            <span className="lbl"><span>{mine === i ? "✓ " : ""}{o}</span>{show && <b>{pct}%</b>}</span>
          </button>
        );
      })}
      <div className="poll-foot">
        {show ? `${total} vote${total === 1 ? "" : "s"} · tap another option to change your vote` : "Tap an option to vote and see results"}
      </div>
    </div>
  );
}
