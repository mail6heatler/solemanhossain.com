"use client";
import { useState } from "react";
import { TRIP_STATUSES } from "@/lib/settings";

/** Status on a Boarding passes or Study shelf entry: one click for the usual words, and it can still be typed. It shows on the frame. */
export default function TripStatus({ initial, options = TRIP_STATUSES, hint = "Shows as the stamp on this entry." }: { initial: string; options?: readonly string[]; hint?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <input className="inp" id="status" name="status" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Or type your own…" />
      <div className="status-btns">
        {options.map((s) => {
          const on = value.trim().toLowerCase() === s.toLowerCase();
          return <button key={s} type="button" className={`status-btn${on ? " on" : ""}`} aria-pressed={on} onClick={() => setValue(on ? "" : s)}>{s}</button>;
        })}
      </div>
      <div className="hint">{hint}</div>
    </>
  );
}
