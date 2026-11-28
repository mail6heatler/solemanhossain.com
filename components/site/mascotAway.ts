/**
 * Whether a visitor sent Mini Shourobh away (bye and hi, settings.mascot.bye.stay), kept in their own browser. No imports, because
 * Mascot.tsx reads it on every page before deciding what to load: while he's away only the light peek (mascotPeek.ts) is fetched,
 * not his animation code. "visit" lasts for the browser session, "device" until the visitor says hi, "minutes" until a time.
 */
const KEY = "lc_mz_away";

export function awayNow(on: boolean): boolean {
  if (!on) return false; // the owner switched bye and hi off: he's back for everyone
  try {
    if (sessionStorage.getItem(KEY)) return true;
    const v = localStorage.getItem(KEY);
    if (!v) return false;
    if (v === "always" || Number(v) > Date.now()) return true;
    localStorage.removeItem(KEY);
  } catch {}
  return false;
}

export function markAway(stay: string, minutes: number) {
  try {
    if (stay === "device") localStorage.setItem(KEY, "always");
    else if (stay === "minutes") localStorage.setItem(KEY, String(Date.now() + minutes * 60000));
    else sessionStorage.setItem(KEY, "1");
  } catch {}
}

export function clearAway() {
  try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch {}
}

/** milliseconds until a "back by himself" time runs out, or -1 when he isn't coming back by himself */
export function awayLeft(): number {
  try { const v = localStorage.getItem(KEY), n = Number(v); return v && v !== "always" && n > Date.now() ? n - Date.now() : -1; } catch { return -1; }
}
