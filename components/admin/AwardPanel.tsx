"use client";
import { useEffect, useState } from "react";
import { AWARD_LOOKS, awardLookOf, type AwardInfo, type AwardLook } from "@/lib/awardItem";
import { Box } from "./Box";

const HINTS: Record<AwardLook, string> = {
  trophy: "A gold trophy on a shelf, for the very best ones. Its story goes under the shelf.",
  cert: "Add a picture under Photos and it becomes the certificate, whatever its shape. With no picture, one with your name is drawn.",
  id: "Your hero photo goes on the card, or the entry's picture if it has one. Its Status is the stamp. With no Status, a Date saying Now stamps it Now.",
  plate: "A brass plate from an office door, for a job you've moved on from. Put Now in the Date to make it a staff ID.",
  medal: "A medal on a ribbon. Set the Mood to heavy for a cracked frame instead.",
  crack: "A hard season, in a cracked frame mended with tape. It stays on the wall, because you made it through.",
};

/**
 * What an entry in an Achievement wall section shows beyond its usual fields. It follows the Subsection, Mood and Date boxes as the owner types,
 * because those pick the object unless they choose one here. Saved with the entry through the hidden field.
 */
export default function AwardPanel({ open, initial, category, mood, date }: { open: boolean; initial: AwardInfo; category: string; mood: string; date: string }) {
  const [s, setS] = useState(initial);
  const [now, setNow] = useState({ category, mood, date });
  useEffect(() => {
    const boxes: [string, keyof typeof now][] = [['input[name="category"]', "category"], ['select[name="mood"]', "mood"], ['input[name="date_label"]', "date"]];
    const off = boxes.map(([selector, key]) => {
      const box = document.querySelector<HTMLInputElement | HTMLSelectElement>(`#entry ${selector}`);
      const follow = () => { if (box) setNow((n) => ({ ...n, [key]: box.value })); };
      box?.addEventListener("input", follow);
      box?.addEventListener("change", follow);
      return () => { box?.removeEventListener("input", follow); box?.removeEventListener("change", follow); };
    });
    return () => off.forEach((f) => f());
  }, []);

  const auto = awardLookOf(now.category, now.mood, now.date);
  const look = s.look || auto;
  const autoName = AWARD_LOOKS.find(([k]) => k === auto)?.[1] ?? "";

  return (
    <>
      <input type="hidden" name="award" value={JSON.stringify(s)} />
      <Box name="panel" title="On the wall" icon="trophy" open={open}>
        <div className="f">
          <div className="fl"><label htmlFor="award-look">Looks like</label>
            <select id="award-look" value={s.look} onChange={(e) => setS({ look: e.target.value as AwardLook | "" })}>
              <option value="">Automatic, from its subsection: {autoName}</option>
              {AWARD_LOOKS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
            <div className="hint">{HINTS[look]}</div>
          </div>
        </div>
      </Box>
    </>
  );
}
