"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { REACTION_EMOJIS } from "@/lib/settings";
import { DEFAULT_CARD_BAR, type CardBarSettings } from "@/lib/cardBar";
import { saveCardBar } from "@/app/actions";
import type { CardBarDraftMsg } from "@/components/site/BarCtx";
import { SaveBar, SiteScreens } from "./ChromeStudio";

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const NAMES: Record<string, string> = { "❤️": "Love", "🔥": "Fire", "😂": "Haha", "🤯": "Mind blown", "👏": "Clap" };

const Box = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <details className="c box" open><summary><span>{title}</span><i className="ti ti-chevron-down" /></summary><div className="f">{children}</div></details>
);
const Chips = <T extends string>({ list, value, onPick }: { list: readonly (readonly [T, string])[]; value: T; onPick: (v: T) => void }) => (
  <div className="hst-chips">{list.map(([k, label]) => <button key={k} type="button" className={`hst-chip${value === k ? " on" : ""}`} aria-pressed={value === k} onClick={() => onPick(k)}>{label}</button>)}</div>
);
const Sw = ({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) => (
  <label className="switch"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />{children}</label>
);

/**
 * The dashboard's Card buttons page (/admin/cardbar): the bar at the bottom of every card (lib/cardBar.ts). On the left your real homepage on a
 * computer and a phone screen (`/?bar=studio`), using this page's unsaved settings (BarCtx.tsx); ▶ makes the first card on screen show its
 * emojis coming up. One Save writes settings.cardBar (saveCardBar). It's the default for every card: each entry's own switches and the sizes
 * dragged in the live editors still apply on top.
 */
export default function CardBarStudio({ first, anchor }: { first: CardBarSettings; anchor: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(first);
  const [d, setD] = useState(first);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ t: string; bad?: boolean } | null>(null);
  const [play, setPlay] = useState(1);
  const dirty = !same(d, saved);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 4000); return () => clearTimeout(t); }, [note]);

  const set = (patch: Partial<CardBarSettings>) => setD((x) => ({ ...x, ...patch }));
  const draft: CardBarDraftMsg = { type: "lc-bar-draft", cfg: d, play };
  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    const r = await saveCardBar(d).catch(() => null);
    setSaving(false);
    if (!r || !r.ok) { setNote({ t: r && !r.ok ? r.error : "That didn't save. Check your connection and try again.", bad: true }); return; }
    setSaved(d); setNote({ t: "Saved. Every card on your site has it now." }); router.refresh();
  };
  const tabs = ["React", d.comments && "Comment", d.share && "Share", d.open === "tab" && "Open"].filter(Boolean).join(", ");

  return (
    <div className="stu cs">
      <header className="stu-top">
        <div className="stu-name"><h1 className="adm-h">Card buttons</h1><p className="adm-sub">The bar at the bottom of every card: {tabs}{dirty ? " · changes not saved" : ""}</p></div>
        <div className="btns stu-topbtns">
          <button type="button" className="b-out b-sm" onClick={() => setPlay((n) => n + 1)}><i className="ti ti-player-play" />Show the emojis coming up</button>
          <a href={`/#${anchor}`} target="_blank" className="b-out b-sm"><i className="ti ti-eye" />View on site</a>
        </div>
      </header>

      <div className="cs-work">
        <SiteScreens src={`/?bar=studio#${anchor}`} draft={draft} ready="lc-bar-ready" hint="Your real homepage, using your changes before saving. Point at React on the computer screen to see the emojis come up, or press ▶ Show the emojis coming up" />

        <div className="cs-grid">
          <div className="cs-panel">
            <p className="hint">This is the starting point for every card, now and for cards you add later. Each entry&apos;s own switches (under Reactions &amp; comments) and the sizes and places you drag in a section&apos;s live editor still win over it.</p>

            <Box title="Emojis">
              <span className="lab">Which emojis React offers</span>
              <div className="stu-switches">{REACTION_EMOJIS.map((e) => (
                <Sw key={e} checked={d.emojis.includes(e)} onChange={(v) => { const emojis = v ? REACTION_EMOJIS.filter((x) => x === e || d.emojis.includes(x)) : d.emojis.filter((x) => x !== e); if (emojis.length) set({ emojis: [...emojis] }); }}>{e} {NAMES[e]}</Sw>
              ))}</div>
              <div className="hint">At least one stays on. Reactions already given to a hidden emoji are kept, and come back if you turn it on again.</div>
              <Sw checked={d.total} onChange={(v) => set({ total: v })}>The total number on the React tab</Sw>
              <Sw checked={d.crown} onChange={(v) => set({ crown: v })}>A crown 👑 on the most-used emoji</Sw>
              <Sw checked={d.bursts} onChange={(v) => set({ bursts: v })}>Little emojis burst out when someone reacts</Sw>
            </Box>

            <Box title="Tabs">
              <Sw checked={d.comments} onChange={(v) => set({ comments: v })}>Comment tab (on cards whose comments are switched on)</Sw>
              <Sw checked={d.last} onChange={(v) => set({ last: v })}>The newest comment just above the tabs</Sw>
              <Sw checked={d.share} onChange={(v) => set({ share: v })}>Share tab</Sw>
              <span className="lab">Opening the full page</span>
              <Chips list={[["tab", "An Open tab"], ["card", "Only a click on the card"]] as const} value={d.open} onPick={(v) => set({ open: v })} />
              <span className="lab">On each tab</span>
              <Chips list={[["words", "Icon and word"], ["icons", "Icon only"]] as const} value={d.words ? "words" : "icons"} onPick={(v) => set({ words: v === "words" })} />
              <div className="hint">Very narrow cards always show icons only, so nothing is cut.</div>
            </Box>

            <Box title="Movement">
              <Chips list={[["lively", "Lively"], ["calm", "Calm"]] as const} value={d.motion} onPick={(v) => set({ motion: v })} />
              <div className="hint">Lively: the emojis come up one after another, each with its own move (a heart beats, fire flickers, laughter shakes, a mind blows, hands clap), a highlight slides under the mouse, and each tab comes alive. Calm: the same bar, standing still. Visitors who turn motion off on their device, and slow phones, always get Calm.</div>
            </Box>

            <div className="btns"><button type="button" className="b-out b-sm" onClick={() => setD(DEFAULT_CARD_BAR)}>Back to all the starting settings</button></div>
          </div>
        </div>
      </div>
      {note && <div className={`adm-toast stu-toast${note.bad ? " bad" : ""}`} role="status">{note.t}</div>}
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={() => setD(saved)} />
    </div>
  );
}
