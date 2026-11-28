/**
 * Whether a visitor sent Mini Shourobh away (bye and hi, settings.mascot.bye.stay), kept in their own browser. No imports, because
 * Mascot.tsx reads it on every page before deciding what to load: while he's away only the light peek (mascotPeek.ts) is fetched,
 * not his animation code. "visit" lasts for the browser session, "device" until the visitor says hi, "minutes" until a time.
 */
const KEY = "lc_mz_away";
/** set too when a visitor locked him in a tarot card: while he's away, the mini card shows (he's inside it) whatever the chosen style */
const CARD = "lc_mz_card";

export function awayNow(on: boolean): boolean {
  if (!on) return false; // the owner switched bye and hi off: he's back for everyone
  try {
    if (sessionStorage.getItem(KEY)) return true;
    const v = localStorage.getItem(KEY);
    if (!v) return false;
    if (v === "always" || Number(v) > Date.now()) return true;
    localStorage.removeItem(KEY); localStorage.removeItem(CARD);
  } catch {}
  return false;
}

export function markAway(stay: string, minutes: number, card = false) {
  try {
    const store = stay === "visit" ? sessionStorage : localStorage;
    store.setItem(KEY, stay === "device" ? "always" : stay === "minutes" ? String(Date.now() + minutes * 60000) : "1");
    if (card) store.setItem(CARD, "1"); else store.removeItem(CARD);
  } catch {}
}

/** whether he's away inside a tarot card */
export function awayCard(): boolean {
  try { return !!(sessionStorage.getItem(CARD) || localStorage.getItem(CARD)); } catch { return false; }
}

export function clearAway() {
  try { for (const st of [sessionStorage, localStorage]) { st.removeItem(KEY); st.removeItem(CARD); } } catch {}
}

/** milliseconds until a "back by himself" time runs out, or -1 when he isn't coming back by himself */
export function awayLeft(): number {
  try { const v = localStorage.getItem(KEY), n = Number(v); return v && v !== "always" && n > Date.now() ? n - Date.now() : -1; } catch { return -1; }
}
