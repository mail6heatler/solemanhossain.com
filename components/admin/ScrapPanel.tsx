"use client";
import { useEffect, useState } from "react";
import { Box } from "./Box";
import { SCRAP_DAYS, SCRAP_LOOKS, scrapLookOf, type ScrapInfo, type ScrapLook } from "@/lib/scrapItem";

const HINTS: Record<ScrapLook, string> = {
  diary: "The Date box is written in the page's corner, and the first picture is taped in.",
  lived: "The Place box goes on the red label on the map, the Date box (like “2014 – 2021”) is written under it, and the first picture is taped onto the map.",
  ritual: "The Date box says when, like “Every morning, 6:30”. Tick the days below and they're ticked on the tracker. The first picture is a round sticker.",
  snaps: "Up to three pictures go in the pile, so add them under Photos. Its tags are stickers, as on every page.",
};

/**
 * What a Scrapbook pages entry shows beyond its usual fields. It follows the Subsection box as the owner types, because that picks the page
 * unless they choose one here. Saved with the entry through the hidden field.
 */
export default function ScrapPanel({ open, initial, category }: { open: boolean; initial: ScrapInfo; category: string }) {
  const [s, setS] = useState(initial);
  const [sub, setSub] = useState(category);
  useEffect(() => {
    const box = document.querySelector<HTMLInputElement>('#entry input[name="category"]');
    if (!box) return;
    const follow = () => setSub(box.value);
    box.addEventListener("input", follow);
    return () => box.removeEventListener("input", follow);
  }, []);

  const auto = scrapLookOf(sub);
  const look = s.look || auto;
  const autoName = SCRAP_LOOKS.find(([k]) => k === auto)?.[1] ?? "Diary page";
  const toggle = (d: number) => setS((p) => ({ ...p, days: p.days.includes(d) ? p.days.filter((x) => x !== d) : [...p.days, d].sort((a, b) => a - b) }));

  return (
    <>
      <input type="hidden" name="scrap" value={JSON.stringify(s)} />
      <Box name="panel" title="On the page" icon="notebook" open={open}>
        <div className="f">
          <div className="fl"><label htmlFor="scrap-look">Looks like</label>
            <select id="scrap-look" value={s.look} onChange={(e) => setS((p) => ({ ...p, look: e.target.value as ScrapLook | "" }))}>
              <option value="">Automatic, from its subsection: {autoName}</option>
              {SCRAP_LOOKS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
            <div className="hint">{HINTS[look]}</div>
          </div>
          {look === "ritual" && (
            <div className="fl"><span className="lab">Days done</span>
              <div className="status-btns" style={{ marginTop: 0 }}>
                {SCRAP_DAYS.map((d, i) => {
                  const on = s.days.includes(i);
                  return <button key={d} type="button" className={`status-btn${on ? " on" : ""}`} aria-pressed={on} onClick={() => toggle(i)}>{on ? "✓ " : ""}{d}</button>;
                })}
              </div>
              <div className="hint">Ticked days get a tick on the tracker, and it counts the longest run of them.</div>
            </div>
          )}
        </div>
      </Box>
    </>
  );
}
