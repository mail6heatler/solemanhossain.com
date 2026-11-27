"use client";
import { useState } from "react";

/** private mode's password box: the right password gives this browser a token (lc_unlock) and the site appears */
export default function UnlockForm() {
  const [pw, setPw] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false), [show, setShow] = useState(false);
  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw || busy) return;
    setBusy(true); setErr("");
    const r = await fetch("/api/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (!r || !r.ok || !d.ok) { setErr(d.error || "That didn't work. Try again."); return; }
    try { localStorage.setItem("lc_unlock", d.token); } catch {}
    document.documentElement.classList.remove("gate-p");
  };
  return (
    <form className="gate-form" onSubmit={go}>
      <span className="gate-pw">
        <input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" aria-label="Password" autoComplete="current-password" autoFocus />
        <button type="button" className="gate-eye" aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} onClick={() => setShow((v) => !v)}>{show ? "🙈" : "👁"}</button>
      </span>
      <button type="submit" disabled={busy}>{busy ? "Checking…" : "Come in"}</button>
      {err && <p className="gate-err" role="alert">{err}</p>}
    </form>
  );
}
