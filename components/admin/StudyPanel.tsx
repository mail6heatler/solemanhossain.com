"use client";
import { useEffect, useState } from "react";
import { Box } from "./Box";
import { STUDY_LOOKS, STUDY_MEDIA, studyLookOf, type StudyInfo, type StudyLook, type StudyMedia } from "@/lib/studyItem";

/**
 * What an entry in a Study shelf section shows beyond its usual fields. It follows the Subsection box as the owner types, because that
 * picks the object unless they choose one here. Saved with the entry through the hidden field.
 */
export default function StudyPanel({ open, initial, category }: { open: boolean; initial: StudyInfo; category: string }) {
  const [s, setS] = useState(initial);
  const [sub, setSub] = useState(category);
  useEffect(() => {
    const box = document.querySelector<HTMLInputElement>('#entry input[name="category"]');
    if (!box) return;
    const follow = () => setSub(box.value);
    box.addEventListener("input", follow);
    return () => box.removeEventListener("input", follow);
  }, []);

  const auto = studyLookOf(sub);
  const look = s.look || auto;
  const autoName = STUDY_LOOKS.find(([k]) => k === auto)?.[1] ?? "Note";

  return (
    <>
      <input type="hidden" name="study" value={JSON.stringify(s)} />
      <Box name="panel" title="On the shelf" icon="books" open={open}>
      <div className="f">
        <div className="f2">
          <div className="fl"><label htmlFor="study-look">Looks like</label>
            <select id="study-look" value={s.look} onChange={(e) => setS((p) => ({ ...p, look: e.target.value as StudyLook | "" }))}>
              <option value="">Automatic, from its subsection: {autoName}</option>
              {STUDY_LOOKS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
            {look === "book" && <div className="hint">Add a picture under Photos and it becomes the whole book, whatever its shape, with the writing on it.</div>}
          </div>
          {look === "player" && (
            <div className="fl"><label htmlFor="study-screen">On the screen</label>
              <input className="inp" id="study-screen" value={s.screen} maxLength={24} placeholder="FM 98.4, EP 12, CH 04…" onChange={(e) => setS((p) => ({ ...p, screen: e.target.value }))} /></div>
          )}
        </div>
        {look === "player" && (
          <div className="fl"><span className="lab">What is it?</span>
            <div className="status-btns" style={{ marginTop: 0 }}>
              {STUDY_MEDIA.map(([k, label]) => {
                const pressed = s.media === k;
                return <button key={k} type="button" className={`status-btn${pressed ? " on" : ""}`} aria-pressed={pressed} onClick={() => setS((p) => ({ ...p, media: pressed ? "" : (k as StudyMedia) }))}>{label}</button>;
              })}
            </div>
            <div className="hint">It picks what the screen shows. With none pressed, it goes by the entry&apos;s words. A sound file you add under Photos plays on the Play button, and so does a video. Without either, Play opens the first web link under Buttons.</div>
          </div>
        )}
        <div className="fl"><label htmlFor="study-line">The line that stuck</label>
          <input className="inp" id="study-line" value={s.line} maxLength={300} placeholder="A quote or lyric, shown highlighted at the top of the text" onChange={(e) => setS((p) => ({ ...p, line: e.target.value }))} /></div>
      </div>
      </Box>
    </>
  );
}
