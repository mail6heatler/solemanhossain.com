"use client";
import { useEffect, useState } from "react";
import { Box } from "./Box";
import { codeFor, frameFor, type FrameKind } from "@/components/site/TripFrame";
import { MAX_TICKS, TRIP_VEHICLES, type TickLine, type TripPass } from "@/lib/tripPass";

/**
 * What an entry in a Boarding passes section shows beyond its usual fields. It follows the Subsection box as the owner types, because that
 * picks the frame: a pass's details for a ticket, tick lines for a bucket list's note. Saved with the entry through the hidden field.
 */
export default function TripPanel({ open, initial, category, title, place, home, passenger }:
  { open: boolean; initial: TripPass; category: string; title: string; place: string; home: string; passenger: string }) {
  const [pass, setPass] = useState(initial);
  const [frame, setFrame] = useState<FrameKind>(frameFor(category));
  useEffect(() => {
    const box = document.querySelector<HTMLInputElement>('#entry input[name="category"]');
    if (!box) return;
    const follow = () => setFrame(frameFor(box.value));
    box.addEventListener("input", follow);
    return () => box.removeEventListener("input", follow);
  }, []);

  const field = (k: "from" | "fromCode" | "to" | "toCode" | "report" | "depart" | "journey" | "seat" | "flight" | "passenger" | "name") => ({
    id: `pass-${k}`,
    className: "inp",
    value: pass[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPass((p) => ({ ...p, [k]: e.target.value })),
  });
  const setTick = (i: number, patch: Partial<TickLine>) => setPass((p) => ({ ...p, ticks: p.ticks.map((t, n) => (n === i ? { ...t, ...patch } : t)) }));
  const addTick = () => setPass((p) => (p.ticks.length < MAX_TICKS ? { ...p, ticks: [...p.ticks, { text: "", done: false }] } : p));
  const vehicleName = TRIP_VEHICLES.find(([v]) => v === pass.vehicle)?.[2] ?? "Boarding pass";

  return (
    <>
      <input type="hidden" name="pass" value={JSON.stringify(pass)} />
      <Box name="panel" title={frame === "ticket" ? "On the boarding pass" : frame === "bucket" ? "On the bucket list note" : "On this frame"} icon="ticket" open={open}>
      <div className="f">
        {frame === "ticket" && (
          <>
            <div className="c-desc" style={{ whiteSpace: "normal", margin: 0 }}>Leave a box empty and it&apos;s worked out for you. The grey words show what it would say.</div>
            <div className="f2">
              <div className="fl"><label htmlFor="pass-from">From, and its code</label>
                <div className="trip-pair"><input {...field("from")} maxLength={60} placeholder={home} /><input {...field("fromCode")} aria-label="From code" maxLength={4} placeholder={codeFor(pass.from || home)} /></div></div>
              <div className="fl"><label htmlFor="pass-to">To, and its code</label>
                <div className="trip-pair"><input {...field("to")} maxLength={60} placeholder={title} /><input {...field("toCode")} aria-label="To code" maxLength={4} placeholder={codeFor(pass.to || place || title)} /></div></div>
            </div>
            <div className="f3">
              <div className="fl"><label htmlFor="pass-report">Reporting time</label><input {...field("report")} maxLength={30} placeholder="9:30 AM" /></div>
              <div className="fl"><label htmlFor="pass-depart">Departure time</label><input {...field("depart")} maxLength={30} placeholder="10:15 AM" /></div>
              <div className="fl"><label htmlFor="pass-journey">Journey time</label><input {...field("journey")} maxLength={30} placeholder="8 hours" /></div>
            </div>
            <div className="f3">
              <div className="fl"><label htmlFor="pass-seat">Seat</label><input {...field("seat")} maxLength={12} placeholder="Automatic" /></div>
              <div className="fl"><label htmlFor="pass-flight">Flight or trip number</label><input {...field("flight")} maxLength={16} placeholder="Automatic" /></div>
              <div className="fl"><label htmlFor="pass-passenger">Passenger</label><input {...field("passenger")} maxLength={60} placeholder={passenger} /></div>
            </div>
          </>
        )}
        {frame === "bucket" && (
          <div className="fl"><span className="lab">Tick list</span>
            {pass.ticks.map((t, i) => (
              <div className="trip-tick" key={i}>
                <input type="checkbox" checked={t.done} aria-label={`Line ${i + 1} is done`} onChange={(e) => setTick(i, { done: e.target.checked })} />
                <input className="inp" value={t.text} maxLength={120} aria-label={`Line ${i + 1}`} placeholder="Save the money"
                  onChange={(e) => setTick(i, { text: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTick(); } }} autoFocus={!t.text && i === pass.ticks.length - 1 && i > 0} />
                <button type="button" className="b-out b-sm" aria-label={`Remove line ${i + 1}`} onClick={() => setPass((p) => ({ ...p, ticks: p.ticks.filter((_, n) => n !== i) }))}><i className="ti ti-x" /></button>
              </div>
            ))}
            <button type="button" className="b-out b-sm" disabled={pass.ticks.length >= MAX_TICKS} onClick={addTick}><i className="ti ti-plus" />Add a line</button>
            <div className="hint">Each line gets its own box on the note. The box beside the title ticks itself when Status is Visited or Done.</div>
          </div>
        )}
        <div className="f2">
          <div className="fl"><label htmlFor="pass-vehicle">Vehicle</label>
            <select id="pass-vehicle" value={pass.vehicle} onChange={(e) => setPass((p) => ({ ...p, vehicle: e.target.value as TripPass["vehicle"] }))}>
              <option value="">Automatic, from its words and tags</option>
              {TRIP_VEHICLES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
            <div className="hint">Travels the route, and is drawn on the frame.</div>
          </div>
          {frame === "ticket" && <div className="fl"><label htmlFor="pass-name">Name on the pass</label><input {...field("name")} maxLength={30} placeholder={vehicleName} /></div>}
        </div>
      </div>
      </Box>
    </>
  );
}
