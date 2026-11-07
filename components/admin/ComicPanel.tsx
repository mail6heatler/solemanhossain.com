"use client";
import { useEffect, useState } from "react";
import { Box } from "./Box";
import { COMIC_LOOKS, SFX_MAX, comicLookOf, comicOptionsFromTitle, comicPollChoices, comicPollOf, comicReadyOptions, comicWantsPoll, sfxOf, voteWordOf, type ComicAnyLook, type ComicInfo } from "@/lib/comicItem";

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

/**
 * What an entry in a Comic strip section shows beyond its usual fields. It follows the Subsection and poll option boxes as the owner types,
 * because those pick the panel unless they choose one here. Saved with the entry through the hidden field.
 */
export default function ComicPanel({ open, initial, title: firstTitle, category, isPoll: wasPoll, options: firstOptions, hasPic }: { open: boolean; initial: ComicInfo; title: string; category: string; isPoll: boolean; options: string[]; hasPic: boolean }) {
  const [s, setS] = useState(initial);
  const [title, setTitle] = useState(firstTitle);
  const [sub, setSub] = useState(category);
  const [options, setOptions] = useState(firstOptions);
  // a plain entry can become a poll: this holds what's been typed until Save
  const [typed, setTyped] = useState<string | null>(null);
  const isPoll = wasPoll || typed !== null;
  useEffect(() => {
    const name = document.querySelector<HTMLInputElement>('#entry input[name="title"]');
    const box = document.querySelector<HTMLInputElement>('#entry input[name="category"]');
    const opts = document.querySelector<HTMLTextAreaElement>('#entry textarea[name="poll_options"]');
    const followTitle = () => name && setTitle(name.value);
    const followSub = () => box && setSub(box.value);
    const followOpts = () => opts && setOptions(lines(opts.value));
    name?.addEventListener("input", followTitle);
    box?.addEventListener("input", followSub);
    opts?.addEventListener("input", followOpts);
    return () => { name?.removeEventListener("input", followTitle); box?.removeEventListener("input", followSub); opts?.removeEventListener("input", followOpts); };
  }, []);

  const auto: ComicAnyLook = isPoll ? comicPollOf(sub, options, "", hasPic) : comicLookOf(sub);
  const choices: readonly (readonly [string, string])[] = isPoll ? comicPollChoices(options).map(([k, label]) => [k, label] as const) : COMIC_LOOKS;
  // a poll's quick fire is buzzers and a post's is a quiz question, so a poll looks among its own names first
  const autoName = [...(isPoll ? comicPollChoices(options).map(([k, label]) => [k, label] as const) : []), ...COMIC_LOOKS].find(([k]) => k === auto)?.[1] ?? "Speech bubble";
  const look: ComicAnyLook = isPoll ? comicPollOf(sub, options, s.look, hasPic) : comicLookOf(sub, s.look);
  const word = look === "stuck" ? "Stuck" : isPoll && look !== "buttons" ? voteWordOf(look, "") : sfxOf(look, "");
  const ready = isPoll ? comicReadyOptions(sub) : null;
  const useReady = () => {
    if (!ready) return;
    const opts = document.querySelector<HTMLTextAreaElement>('#entry textarea[name="poll_options"]');
    if (typed !== null) setTyped(ready.join("\n"));
    else if (opts) opts.value = ready.join("\n");
    setOptions(ready);
  };
  const fromTitle = comicOptionsFromTitle(title);
  const startPoll = () => {
    const first = fromTitle ?? comicReadyOptions(sub) ?? [];
    setTyped(first.join("\n"));
    setOptions(first);
    setS((p) => ({ ...p, look: "" })); // a post's panel isn't a poll's, so a new poll starts on its automatic one
  };
  const stopPoll = () => {
    setTyped(null);
    setOptions([]);
    setS((p) => ({ ...p, look: initial.look }));
  };

  return (
    <>
      <input type="hidden" name="comic" value={JSON.stringify(s)} />
      <Box name="panel" title="In the comic" icon="bolt" open={open}>
      <div className="f">
        <div className="f2">
          <div className="fl"><label htmlFor="comic-look">Panel</label>
            {isPoll && hasPic ? (
              <div className="hint">With a picture, it&apos;s the picture with big comic buttons under it. Remove the picture to use the other poll panels.</div>
            ) : (
              <select id="comic-look" value={s.look} onChange={(e) => setS((p) => ({ ...p, look: e.target.value as ComicAnyLook | "" }))}>
                <option value="">Automatic: {autoName}</option>
                {choices.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            )}
            {!isPoll && look === "dump" && <div className="hint">The first two short lines of the story get bubbles of their own. Put each on its own line.</div>}
            {!isPoll && look === "poem" && <div className="hint">Each line of the story gets its own caption. The Subtitle is who wrote it.</div>}
            {!isPoll && look === "stuck" && <div className="hint">The Title is the saying, and the Subtitle is who said it.</div>}
            {!isPoll && look === "vibe" && <div className="hint">The waves take the colour of the Mood you choose above.</div>}
            {!isPoll && look === "quick" && <div className="hint">The Title is the question and the story is the answer, which a buzzer reveals.</div>}
            {!isPoll && comicWantsPoll(sub) && <div className="hint">This subsection&apos;s panel is a poll, so turn this entry into one below.</div>}
          </div>
          <div className="fl"><label htmlFor="comic-sfx">Sound effect</label>
            <input className="inp" id="comic-sfx" value={s.sfx} maxLength={SFX_MAX} placeholder={word || "Pow!, Zap!, Boom!…"} onChange={(e) => setS((p) => ({ ...p, sfx: e.target.value }))} />
            <div className="hint">{look === "stuck" ? "The magnet letters spell it. Left empty, they spell STUCK." : isPoll && look !== "buttons" ? `It pops up when someone votes. Left empty, it says ${word}` : `It appears in a burst on the panel. ${word ? `Left empty, this one says ${word}` : "Left empty, there's no burst."}`}</div>
          </div>
        </div>
        {!wasPoll && (
          <div className="fl"><span className="lab">Let people vote</span>
            {typed === null ? (
              <>
                <div className="status-btns" style={{ marginTop: 0 }}>
                  <button type="button" className="status-btn" onClick={startPoll}>Turn it into a poll{fromTitle ? `: ${fromTitle.join(", ")}` : ""}</button>
                </div>
                <div className="hint">People then vote by tapping the panel itself. Nothing changes until you press Save.</div>
              </>
            ) : (
              <>
                <input type="hidden" name="make_poll" value="1" />
                <label htmlFor="comic-options">One option per line (2 to 8)</label>
                <textarea id="comic-options" name="poll_options" value={typed} style={{ minHeight: 90 }} onChange={(e) => { setTyped(e.target.value); setOptions(lines(e.target.value)); }} />
                <div className="status-btns">
                  <button type="button" className="status-btn" onClick={stopPoll}>Never mind, keep it a plain entry</button>
                </div>
                <div className="hint">{options.length < 2 ? "It needs at least 2 options." : "Press Save to make it a poll. You can then pick its look under Panel."}</div>
              </>
            )}
          </div>
        )}
        {ready && (
          <div className="fl"><span className="lab">Ready-made options</span>
            <div className="status-btns" style={{ marginTop: 0 }}>
              <button type="button" className="status-btn" onClick={useReady}>Use: {ready.join(", ")}</button>
            </div>
            <div className="hint">It fills in the Poll options box above. Press Save to keep it.</div>
          </div>
        )}
      </div>
      </Box>
    </>
  );
}
