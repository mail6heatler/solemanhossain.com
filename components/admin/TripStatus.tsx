"use client";
import { useState } from "react";
import { TRIP_STATUSES } from "@/lib/settings";

/** Status on a Boarding passes entry: one click for the usual words, and it can still be typed. It shows on the frame as the stamp. */
export default function TripStatus({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <input className="inp" id="status" name="status" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Or type your own…" />
      <div className="status-btns">
        {TRIP_STATUSES.map((s) => {
          const on = value.trim().toLowerCase() === s.toLowerCase();
          return <button key={s} type="button" className={`status-btn${on ? " on" : ""}`} aria-pressed={on} onClick={() => setValue(on ? "" : s)}>{s}</button>;
        })}
      </div>
      <div className="hint">Shows as the stamp on this entry.</div>
    </>
  );
}
