"use client";
import { useEffect, useState } from "react";
import { REACTION_EMOJIS } from "@/lib/settings";
import { burst } from "./fx";

type State = { counts: Record<string, number>; mine: string[] };

// All reaction bars on a page ask at once: one request for every entry instead of one each.
const waiting = new Map<number, ((s: State) => void)[]>();
let timer: ReturnType<typeof setTimeout> | undefined;
function load(id: number) {
  return new Promise<State>((resolve) => {
    waiting.set(id, [...(waiting.get(id) ?? []), resolve]);
    clearTimeout(timer);
    timer = setTimeout(flush, 40);
  });
}
async function flush() {
  const batch = new Map(waiting);
  waiting.clear();
  const ids = [...batch.keys()];
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    let items: Record<string, State> = {};
    try { items = (await (await fetch(`/api/react?ids=${chunk.join(",")}`)).json()).items ?? {}; } catch {}
    for (const id of chunk) batch.get(id)?.forEach((cb) => cb(items[id] ?? { counts: {}, mine: [] }));
  }
}

/** ❤️ 🔥 😂 🤯 👏 under an entry. Tap to add, tap again to take it back. `compact` = the small version for cards. */
export default function Reactions({ id, compact = false }: { id: number; compact?: boolean }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [popped, setPopped] = useState("");

  useEffect(() => {
    let live = true;
    load(id).then((s) => { if (live) { setCounts(s.counts); setMine(s.mine); } });
    // other bars for the same entry (e.g. grid + photo viewer) stay in sync
    const sync = (e: Event) => {
      const d = (e as CustomEvent<State & { id: number }>).detail;
      if (d.id === id) { setCounts(d.counts); setMine(d.mine); }
    };
    window.addEventListener("lc-react", sync);
    return () => { live = false; window.removeEventListener("lc-react", sync); };
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
      if (d.counts) window.dispatchEvent(new CustomEvent("lc-react", { detail: { id, counts: d.counts, mine: d.mine ?? [] } }));
    } catch {} finally { setBusy(false); }
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <div className={`reacts${compact ? " mini" : ""}`} role="group" aria-label={`Reactions (${total})`}>
      {REACTION_EMOJIS.map((e) => {
        const n = counts[e] ?? 0;
        return (
          <button key={e} type="button" aria-pressed={mine.includes(e)} aria-label={`React ${e}, ${n} so far`}
            className={`${popped === e ? "pop" : ""}${n === 0 ? " zero" : ""}`}
            onAnimationEnd={() => setPopped("")} onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); react(e, ev.currentTarget); }}>
            <span aria-hidden>{e}</span><span className="n" aria-hidden>{n > 0 ? n : ""}</span>
          </button>
        );
      })}
    </div>
  );
}
