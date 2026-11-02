"use client";
import { useEffect, useState } from "react";

export default function PollCard({ id, options }: { id: number; options: string[] }) {
  const [counts, setCounts] = useState<number[] | null>(null);
  const [mine, setMine] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/vote?id=${id}`).then((r) => r.json()).then((d) => {
      if (Array.isArray(d.counts)) { setCounts(d.counts); setMine(d.mine); }
    }).catch(() => {});
  }, [id]);

  const vote = async (option: number) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, option }) });
      const d = await r.json();
      if (Array.isArray(d.counts)) { setCounts(d.counts); setMine(d.mine); }
    } finally { setBusy(false); }
  };

  const total = counts?.reduce((a, b) => a + b, 0) ?? 0;
  const show = mine !== null;
  return (
    <div className="poll">
      {options.map((o, i) => {
        const pct = show && total ? Math.round(((counts?.[i] ?? 0) / total) * 100) : 0;
        return (
          <button key={i} className={`poll-opt ${mine === i ? "mine" : ""}`} onClick={() => vote(i)} disabled={busy}>
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
