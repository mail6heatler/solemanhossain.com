"use client";
import { useRef, useState, useTransition } from "react";
import { saveItemOrder } from "@/app/actions";

export type OrderRow = { id: number; title: string; kind: string; pinned: boolean; visible: boolean };

/**
 * Every entry of a section in one list, in the exact order visitors see. Drag with a mouse, or use the arrows
 * (phones and keyboards). It saves by itself after each move. Pinned entries always stay at the top, because pinning means that.
 */
export default function OrderList({ sectionId, initial }: { sectionId: number; initial: OrderRow[] }) {
  const [rows, setRows] = useState(initial);
  const [saved, setSaved] = useState("");
  const [pending, start] = useTransition();
  const drag = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const pinnedCount = rows.filter((r) => r.pinned).length;

  const commit = (next: OrderRow[]) => {
    setRows(next);
    setSaved("");
    start(async () => {
      await saveItemOrder(sectionId, next.map((r) => r.id));
      setSaved("Saved. Your site now shows this order.");
    });
  };
  // a pinned entry moves among the pinned ones, the rest among the rest
  const move = (from: number, to: number) => {
    const lo = rows[from].pinned ? 0 : pinnedCount, hi = rows[from].pinned ? pinnedCount - 1 : rows.length - 1;
    const target = Math.max(lo, Math.min(hi, to));
    if (target === from) return;
    const next = [...rows];
    const [r] = next.splice(from, 1);
    next.splice(target, 0, r);
    commit(next);
  };

  if (rows.length < 2) return <p className="c-desc" style={{ whiteSpace: "normal" }}>Add at least two entries to set their order.</p>;
  return (
    <div>
      <ol className="order-list">
        {rows.map((r, i) => (
          <li key={r.id} draggable className={`${over === i ? "over" : ""}${r.visible ? "" : " off"}`}
            onDragStart={(e) => { drag.current = i; e.dataTransfer.effectAllowed = "move"; }}
            onDragOver={(e) => { e.preventDefault(); setOver(i); }}
            onDragLeave={() => setOver((o) => (o === i ? null : o))}
            onDrop={(e) => { e.preventDefault(); setOver(null); if (drag.current !== null) move(drag.current, i); drag.current = null; }}
            onDragEnd={() => { drag.current = null; setOver(null); }}>
            <i className="ti ti-grip-vertical order-grip" aria-hidden />
            <span className="order-n">{i + 1}</span>
            <span className="order-t">{r.pinned ? "★ " : ""}{r.title}</span>
            <span className="order-k">{r.kind}{r.visible ? "" : " · hidden"}</span>
            <button type="button" className="adm-iconbtn" disabled={pending || i === (r.pinned ? 0 : pinnedCount)} aria-label={`Move ${r.title} up`} onClick={() => move(i, i - 1)}><i className="ti ti-arrow-up" /></button>
            <button type="button" className="adm-iconbtn" disabled={pending || i === (r.pinned ? pinnedCount - 1 : rows.length - 1)} aria-label={`Move ${r.title} down`} onClick={() => move(i, i + 1)}><i className="ti ti-arrow-down" /></button>
          </li>
        ))}
      </ol>
      <p className="hint order-hint" role="status">{pending ? "Saving…" : saved || (pinnedCount ? "★ Pinned entries always stay first. Unpin one to move it among the rest." : "Drag an entry, or use the arrows. It saves by itself.")}</p>
    </div>
  );
}
