// What every reaction bar on a page needs from the server, asked for all of them at once: one request for every entry instead of
// one each. Used by the entry page's bar (Reactions.tsx) and by every card's tab bar (CardBar.tsx).

export type LastComment = { name: string; body: string } | null;
export type ReactState = { counts: Record<string, number>; mine: string[]; comments?: number; last?: LastComment };

const waiting = new Map<number, ((s: ReactState) => void)[]>();
let timer: ReturnType<typeof setTimeout> | undefined;

export function loadReactions(id: number) {
  return new Promise<ReactState>((resolve) => {
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
    let items: Record<string, ReactState> = {};
    try { items = (await (await fetch(`/api/react?ids=${chunk.join(",")}`)).json()).items ?? {}; } catch {}
    for (const id of chunk) batch.get(id)?.forEach((cb) => cb(items[id] ?? { counts: {}, mine: [] }));
  }
}

/** Gives or takes back one reaction. Asks nothing: the caller has the name already. The answer's counts reach every bar for this entry (lc-react). */
export async function sendReaction(id: number, emoji: string, name: string, adding: boolean) {
  const r = await fetch("/api/react", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, emoji, name }) });
  const d = await r.json().catch(() => ({}));
  if (d.counts) window.dispatchEvent(new CustomEvent("lc-react", { detail: { id, counts: d.counts, mine: d.mine ?? [] } }));
  if (r.ok && adding) window.dispatchEvent(new Event("lc-reacted")); // the visit receipt counts reactions given, not taken back
  return r.ok;
}
