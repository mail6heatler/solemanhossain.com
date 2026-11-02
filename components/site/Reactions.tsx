"use client";
import { useEffect, useState } from "react";
import { REACTION_EMOJIS } from "@/lib/settings";
import { burst } from "./fx";

/** ❤️ 🔥 😂 🤯 👏 under an entry. Tap to add, tap again to take it back. */
export default function Reactions({ id }: { id: number }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [popped, setPopped] = useState("");

  useEffect(() => {
    fetch(`/api/react?id=${id}`).then((r) => r.json()).then((d) => {
      if (d.counts) { setCounts(d.counts); setMine(d.mine ?? []); }
    }).catch(() => {});
  }, [id]);

  const react = async (emoji: string, el: HTMLButtonElement) => {
    if (busy) return;
    setBusy(true);
    const adding = !mine.includes(emoji);
    // update right away; the server answer replaces it a moment later
    setMine((m) => (adding ? [...m, emoji] : m.filter((x) => x !== emoji)));
    setCounts((c) => ({ ...c, [emoji]: Math.max(0, (c[emoji] ?? 0) + (adding ? 1 : -1)) }));
    setPopped(emoji);
    if (adding) { const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top, [emoji], 5, 50); }
    try {
      const r = await fetch("/api/react", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, emoji }) });
      const d = await r.json();
      if (d.counts) { setCounts(d.counts); setMine(d.mine ?? []); }
    } catch {} finally { setBusy(false); }
  };

  return (
    <div className="reacts" role="group" aria-label="Reactions">
      {REACTION_EMOJIS.map((e) => {
        const n = counts[e] ?? 0;
        return (
          <button key={e} type="button" aria-pressed={mine.includes(e)} aria-label={`${e} ${n}`} className={popped === e ? "pop" : ""}
            onAnimationEnd={() => setPopped("")} onClick={(ev) => react(e, ev.currentTarget)}>
            <span aria-hidden>{e}</span><span className="n" aria-hidden>{n > 0 ? n : ""}</span>
          </button>
        );
      })}
    </div>
  );
}
