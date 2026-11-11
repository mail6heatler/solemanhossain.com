"use client";
import { useEffect, useState } from "react";
import { AWARD_LOOKS, AWARD_TEXT_MAX, awardLookOf, jobFromTitle, type AwardInfo, type AwardLook } from "@/lib/awardItem";

const HINTS: Record<AwardLook, string> = {
  trophy: "A star on the red carpet, for the very best ones. A picture goes with its story, under the star.",
  cert: "Add a picture under Photos and it fills the gold frame, whatever its shape. With no picture, a certificate with your name, Issued by and Issue date is drawn.",
  id: "Your hero photo goes on the card, or the entry's picture if it has one. Its Status is the stamp. With no Status, it says Now.",
  plate: "The same card faded, for a job you've moved on from. Tick I still work here to make it bright.",
  medal: "You make the front page of your own newspaper, and a picture becomes its photo. Set the Mood to heavy for a card mended in gold instead.",
  crack: "A hard season: it cracks apart, comes back together and the gold lines light up.",
};
type Text = "position" | "company" | "start" | "end" | "issuer" | "issued" | "expires" | "credential" | "by";

/**
 * The part of an Achievement wall entry's Details box that this layout adds. It follows the Title, Subsection, Mood and Date boxes as the owner types,
 * because those pick the object, and the object picks which boxes it asks for. Saved with the entry through the hidden field.
 */
export default function AwardDetails({ initial, title, category, mood, date }: { initial: AwardInfo; title: string; category: string; mood: string; date: string }) {
  const [s, setS] = useState(initial);
  const [now, setNow] = useState({ title, category, mood, date });
  useEffect(() => {
    const boxes: [string, keyof typeof now][] = [['input[name="title"]', "title"], ['input[name="category"]', "category"], ['select[name="mood"]', "mood"], ['input[name="date_label"]', "date"]];
    const off = boxes.map(([selector, key]) => {
      const box = document.querySelector<HTMLInputElement | HTMLSelectElement>(`#entry ${selector}`);
      const follow = () => { if (box) setNow((n) => ({ ...n, [key]: box.value })); };
      box?.addEventListener("input", follow);
      box?.addEventListener("change", follow);
      return () => { box?.removeEventListener("input", follow); box?.removeEventListener("change", follow); };
    });
    return () => off.forEach((f) => f());
  }, []);

  const auto = awardLookOf(now.category, now.mood, now.date, { look: "", still: s.still, end: s.end });
  const look = s.look || auto;
  const autoName = AWARD_LOOKS.find(([k]) => k === auto)?.[1] ?? "";
  const job = jobFromTitle(now.title);
  const box = (k: Text, label: string, placeholder: string, disabled = false) => (
    <div className="fl"><label htmlFor={`award-${k}`}>{label}</label>
      <input className="inp" id={`award-${k}`} value={disabled ? "" : s[k]} maxLength={AWARD_TEXT_MAX} placeholder={placeholder} disabled={disabled} onChange={(e) => setS((p) => ({ ...p, [k]: e.target.value }))} /></div>
  );

  return (
    <>
      <input type="hidden" name="award" value={JSON.stringify(s)} />
      <div className="fl"><label htmlFor="award-look">Looks like on the wall</label>
        <select id="award-look" value={s.look} onChange={(e) => setS((p) => ({ ...p, look: e.target.value as AwardLook | "" }))}>
          <option value="">Automatic, from its subsection: {autoName}</option>
          {AWARD_LOOKS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <div className="hint">{HINTS[look]}</div>
      </div>
      {(look === "id" || look === "plate") && (
        <>
          <div className="f2">
            {box("position", "Position", job.position || "Data Officer")}
            {box("company", "Company", job.company || "T.K. Group")}
          </div>
          <div className="f3">
            {box("start", "Start", "March 2024")}
            {box("end", "End", s.still ? "Still here" : "June 2025", s.still)}
            <div className="fl"><span className="lab">Now</span><label className="switch"><input type="checkbox" checked={s.still} onChange={(e) => setS((p) => ({ ...p, still: e.target.checked }))} />I still work here</label></div>
          </div>
          <div className="hint" style={{ marginTop: -6 }}>Leave Position and Company empty and they come from the Title. The grey words show what they&apos;d say.</div>
        </>
      )}
      {look === "cert" && (
        <>
          <div className="f2">
            {box("issuer", "Issued by", "Coursera, your university…")}
            {box("credential", "Credential ID", "ABC-12345")}
          </div>
          <div className="f2">
            {box("issued", "Issue date", "March 2024")}
            {box("expires", "Expiry date", "Leave empty if it doesn't expire")}
          </div>
        </>
      )}
      {(look === "trophy" || look === "medal") && <div className="f2">{box("by", "Awarded by", "Who gave it to you")}</div>}
    </>
  );
}
