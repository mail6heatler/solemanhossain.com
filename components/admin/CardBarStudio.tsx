"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_CARD_BAR, type CardBarSettings } from "@/lib/cardBar";
import { saveCardBar } from "@/app/actions";
import type { CardBarDraftMsg } from "@/components/site/BarCtx";
import { SaveBar, SiteScreens } from "./ChromeStudio";

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const Box = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <details className="c box" open><summary><span>{title}</span><i className="ti ti-chevron-down" /></summary><div className="f">{children}</div></details>
);
const Sw = ({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) => (
  <label className="switch"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />{children}</label>
);

/**
 * The dashboard's Card buttons page (/admin/cardbar): the defaults for the sticker buttons at the bottom of cards (lib/cardBar.ts). On the left
 * your real homepage on a computer and a phone screen (`/?bar=studio`), using this page's unsaved settings (BarCtx.tsx); ▶ makes the first card
 * on screen show its emojis coming up. One Save writes settings.cardBar (saveCardBar). Each card's own switches and the sizes dragged in the
 * live editors still apply on top. Sections get the sticker buttons one at a time (STICKER_LAYOUTS): G1 first.
 */
export default function CardBarStudio({ first, panel: firstPanel, anchor, has }: { first: CardBarSettings; panel: boolean; anchor: string; has: string[] }) {
  const router = useRouter();
  const [saved, setSaved] = useState(first);
  const [d, setD] = useState(first);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ t: string; bad?: boolean } | null>(null);
  const [play, setPlay] = useState(1);
  // the Buttons panel on every card (all content's hide `bar`): saved with the rest
  const [panel, setPanel] = useState(firstPanel);
  const [savedPanel, setSavedPanel] = useState(firstPanel);
  const dirty = !same(d, saved) || panel !== savedPanel;
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 4000); return () => clearTimeout(t); }, [note]);

  const set = (patch: Partial<CardBarSettings>) => setD((x) => ({ ...x, ...patch }));
  const draft: CardBarDraftMsg = { type: "lc-bar-draft", cfg: d, play, panel };
  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    const r = await saveCardBar(d, panel === savedPanel ? undefined : panel).catch(() => null);
    setSaving(false);
    if (!r || !r.ok) { setNote({ t: r && !r.ok ? r.error : "That didn't save. Check your connection and try again.", bad: true }); return; }
    setSaved(d); setSavedPanel(panel); setNote({ t: "Saved. It's live on your cards." }); router.refresh();
  };
  const on = [d.react && "React", d.talk && "Comment", d.share && "Share", d.open && "Open"].filter(Boolean);

  return (
    <div className="stu cs">
      <header className="stu-top">
        <div className="stu-name"><h1 className="adm-h">Card buttons</h1><p className="adm-sub">{panel ? <>The sticker buttons at the bottom of a card: {on.join(", ") || "none"}{d.strip ? ", and the LIVE strip" : ""}</> : "The Buttons panel is hidden on every card"}{dirty ? " · changes not saved" : ""}</p></div>
        <div className="btns stu-topbtns">
          <button type="button" className="b-out b-sm" onClick={() => setPlay((n) => n + 1)}><i className="ti ti-player-play" />Show the emojis coming up</button>
          <a href={`/#${anchor}`} target="_blank" className="b-out b-sm"><i className="ti ti-eye" />View on site</a>
        </div>
      </header>

      <div className="cs-work">
        <SiteScreens src={`/?bar=studio#${anchor}`} draft={draft} ready="lc-bar-ready" hint="Your real homepage, using your changes before saving. Point at React on the computer screen to see the emojis come up, or press ▶ Show the emojis coming up" />

        <div className="cs-grid">
          <div className="cs-panel">
            <p className="hint">These are the starting point for every card in every section ({has.join(", ") || "none yet"}), and for cards you add later. Each card&apos;s own switches (its Reactions &amp; comments box) and the sizes and places you drag in a section&apos;s live editor still win.</p>
            <Box title="The Buttons panel">
              <Sw checked={panel} onChange={setPanel}>Show the Buttons panel on every card: React, Comment, Share, Open and the LIVE strip</Sw>
              <div className="hint">Off, every card shows its writing and pictures in the panel&apos;s room instead, and a click on a card still opens its full page, which keeps its reactions and comments. Nothing is deleted. A section (its Panels button in the live editor) or a single card (its Buttons panel button) can still choose for itself. The same switch is on the <a href="/admin/content">Content sizes</a> page.</div>
            </Box>
            <Box title="The four buttons">
              <Sw checked={d.react} onChange={(v) => set({ react: v })}>React: the emojis come up when someone points at it</Sw>
              <Sw checked={d.talk} onChange={(v) => set({ talk: v })}>Comment: the buttons flip into a comment box (on cards whose comments are on)</Sw>
              <Sw checked={d.share} onChange={(v) => set({ share: v })}>Share: a paper plane, and the link copied (a phone opens its share menu)</Sw>
              <Sw checked={d.open} onChange={(v) => set({ open: v })}>Open: the full page (a click on the card opens it too)</Sw>
            </Box>
            <Box title="The LIVE strip">
              <Sw checked={d.strip} onChange={(v) => set({ strip: v })}>The thin strip under the buttons</Sw>
              <div className="hint">It types the card&apos;s recent reactions, comments and shares one after another. Who reacted is private, so a reaction says &ldquo;Someone&rdquo;; a comment shows its name and words, which are public anyway.</div>
            </Box>
            <Box title="Movement">
              <div className="hst-chips">{([["lively", "Lively"], ["calm", "Calm"]] as const).map(([k, l]) => <button key={k} type="button" className={`hst-chip${d.motion === k ? " on" : ""}`} aria-pressed={d.motion === k} onClick={() => set({ motion: k })}>{l}</button>)}</div>
              <div className="hint">Lively: the emojis come up with their own moves, the buttons lift like stickers, a reaction flies into its button, a comment flies into the strip, a paper plane takes off. Calm: the same buttons, standing still. Visitors who turn motion off, and slow phones, always get Calm.</div>
            </Box>
            <div className="btns"><button type="button" className="b-out b-sm" onClick={() => { setD(DEFAULT_CARD_BAR); setPanel(true); }}>Back to all the starting settings</button></div>
          </div>
        </div>
      </div>
      {note && <div className={`adm-toast stu-toast${note.bad ? " bad" : ""}`} role="status">{note.t}</div>}
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={() => { setD(saved); setPanel(savedPanel); }} />
    </div>
  );
}
