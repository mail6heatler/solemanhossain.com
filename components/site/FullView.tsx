"use client";
import { useCardBar } from "./BarCtx";

/**
 * Opens an entry's full page: the Open tab, the last of a card's tabs (CardBar.tsx draws the others), always in view at the bottom of the card.
 * Without `to` it's the live editor's still copy. The dashboard's Card buttons page can leave it out, so only a click on the card opens it.
 */
export default function FullView({ to, label, attrs }: { to?: string; label: string; attrs?: { style?: React.CSSProperties; "data-sz"?: string; "data-part"?: string } }) {
  const cfg = useCardBar();
  if (cfg.open === "card") return null;
  const cls = `full-view ctab ctab-open${cfg.words ? "" : " no-words"}`;
  const inner = (
    <>
      <span className="ct-ic"><i className="ti ti-arrows-maximize" aria-hidden /></span>
      <span className="ct-lb">{cfg.words && <span className="ct-w">Open</span>}</span>
    </>
  );
  return to
    ? <a className={cls} href={to} aria-label={`Open: ${label}`} {...attrs}>{inner}</a>
    : <span className={cls} role="button" {...attrs}>{inner}</span>;
}
