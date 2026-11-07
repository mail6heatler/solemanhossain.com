"use client";
import { useEffect, useState } from "react";
import { COMIC_LOOKS, SFX_MAX, comicLookOf, sfxOf, type ComicInfo, type ComicLook } from "@/lib/comicItem";

/**
 * What an entry in a Comic strip section shows beyond its usual fields. It follows the Subsection box as the owner types, because that
 * picks the panel unless they choose one here. Saved with the entry through the hidden field.
 */
export default function ComicPanel({ initial, category, isPoll }: { initial: ComicInfo; category: string; isPoll: boolean }) {
  const [s, setS] = useState(initial);
  const [sub, setSub] = useState(category);
  useEffect(() => {
    const box = document.querySelector<HTMLInputElement>('#entry input[name="category"]');
    if (!box) return;
    const follow = () => setSub(box.value);
    box.addEventListener("input", follow);
    return () => box.removeEventListener("input", follow);
  }, []);

  const auto = comicLookOf(sub);
  const look = s.look || auto;
  const autoName = COMIC_LOOKS.find(([k]) => k === auto)?.[1] ?? "Speech bubble";
  const word = sfxOf(isPoll ? "poll" : look, "");

  return (
    <>
      <input type="hidden" name="comic" value={JSON.stringify(s)} />
      <div className="adm-label">In the comic</div>
      <div className="c f">
        <div className="f2">
          {isPoll ? (
            <div className="fl"><span className="lab">Panel</span>
              <div className="hint">A poll gets big comic buttons. With exactly two options and no picture, it becomes a face-off.</div>
            </div>
          ) : (
            <div className="fl"><label htmlFor="comic-look">Panel</label>
              <select id="comic-look" value={s.look} onChange={(e) => setS((p) => ({ ...p, look: e.target.value as ComicLook | "" }))}>
                <option value="">Automatic, from its subsection: {autoName}</option>
                {COMIC_LOOKS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
              {look === "dump" && <div className="hint">The first two short lines of the story get bubbles of their own. Put each on its own line.</div>}
            </div>
          )}
          <div className="fl"><label htmlFor="comic-sfx">Sound effect</label>
            <input className="inp" id="comic-sfx" value={s.sfx} maxLength={SFX_MAX} placeholder={word || "Pow!, Zap!, Boom!…"} onChange={(e) => setS((p) => ({ ...p, sfx: e.target.value }))} />
            <div className="hint">It appears in a burst on the panel. {word ? `Left empty, this one says ${word}` : "Left empty, there's no burst."}</div>
          </div>
        </div>
      </div>
    </>
  );
}
