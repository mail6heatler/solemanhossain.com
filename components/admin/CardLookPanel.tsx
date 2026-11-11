"use client";
import { useEffect, useState } from "react";
import { Box } from "./Box";
import { NOTE_LOOKS, WIN_LOOKS, noteLookOf, winLookOf, type CardInfo } from "@/lib/cardLook";

const NOTE_HINTS: Record<string, string> = {
  manual: "Your photo is on the cover. Date is the version, Place is “made in”, tags are what it runs on, and each paragraph or line of the text is a numbered step.",
  sign: "The title is painted on the sign, in the colour of its Mood. The rest sits under it.",
  story: "The first picture fills the card, with a bar at the top for each picture. The subsection is the sticker.",
  fact: "Its number is its place among the facts. Status is the rarity (Rare when empty), and the first picture is the art.",
  plain: "The plain note.",
};
const WIN_HINTS: Record<string, string> = {
  sheet: "A spreadsheet of its details: status, when, where, tools (tags) and link. The first picture sits in it like a chart.",
  code: "Its details written as code, with a terminal under it that says its Status.",
  notes: "The first three lines of the text become sticky notes; tags are the folders.",
  console: "A pocket games console. Status is the quest: done fills the bar, anything else is under way.",
  browser: "The browser window, as before.",
};

/**
 * The Card look box on a G1 note's or a G2 window's page. It follows the Subsection box as the owner types, because that picks the card unless they
 * choose one here. Saved with the entry through the hidden field.
 */
export default function CardLookPanel({ open, initial, category, kind }: { open: boolean; initial: CardInfo; category: string; kind: "notes" | "windows" }) {
  const [c, setC] = useState(initial);
  const [sub, setSub] = useState(category);
  useEffect(() => {
    const box = document.querySelector<HTMLInputElement>('#entry input[name="category"]');
    if (!box) return;
    const follow = () => setSub(box.value);
    box.addEventListener("input", follow);
    return () => box.removeEventListener("input", follow);
  }, []);
  const list = kind === "notes" ? NOTE_LOOKS : WIN_LOOKS;
  const auto = kind === "notes" ? noteLookOf(sub) : winLookOf(sub);
  const look = (kind === "notes" ? noteLookOf(sub, c.look) : winLookOf(sub, c.look)) as string;
  const autoName = list.find(([k]) => k === auto)?.[1] ?? "";
  return (
    <>
      <input type="hidden" name="card" value={JSON.stringify(c)} />
      <Box name="panel" title="Card look" icon="cards" open={open}>
        <div className="f">
          <div className="fl"><label htmlFor="card-look">Looks like</label>
            <select id="card-look" value={c.look} onChange={(e) => setC({ look: e.target.value as CardInfo["look"] })}>
              <option value="">Automatic, from its subsection: {autoName}</option>
              {list.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
            <div className="hint">{(kind === "notes" ? NOTE_HINTS : WIN_HINTS)[look]}</div>
          </div>
        </div>
      </Box>
    </>
  );
}
