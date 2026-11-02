"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Photo = { id: number; title: string; image_url: string; href: string };

/** Photo grid with a full-screen viewer: arrows, swipe, Esc, and a link to the entry. */
export default function PhotoGrid({ className, items }: { className: string; items: Photo[] }) {
  const pics = items.filter((p) => p.image_url);
  const [open, setOpen] = useState(-1);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const lastTile = useRef<HTMLElement | null>(null);
  const startX = useRef<number | null>(null);

  const show = useCallback((i: number) => setOpen((i + pics.length) % pics.length), [pics.length]);
  const close = useCallback(() => { setOpen(-1); lastTile.current?.focus(); }, []);

  useEffect(() => {
    if (open < 0) return;
    const w = window as unknown as { __lenis?: { stop(): void; start(): void } };
    w.__lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    closeBtn.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(open - 1);
      if (e.key === "ArrowRight") show(open + 1);
    };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); document.documentElement.style.overflow = ""; w.__lenis?.start(); };
  }, [open, show, close]);

  const cur = open >= 0 ? pics[open] : null;
  return (
    <>
      <div className={className}>
        {items.map((it) =>
          it.image_url ? (
            <button key={it.id} type="button" className="ph-tile" aria-label={`Open photo: ${it.title}`}
              onClick={(e) => { lastTile.current = e.currentTarget; setOpen(pics.indexOf(it)); }}>
              <img src={it.image_url} alt={it.title} loading="lazy" />
              <span className="cap">{it.title}</span>
            </button>
          ) : (
            <a key={it.id} href={it.href} className="ph-tile txt">{it.title}</a>
          )
        )}
      </div>
      {cur && (
        <div className="lb" role="dialog" aria-modal="true" aria-label={`Photo: ${cur.title}`}
          onPointerDown={(e) => (startX.current = e.clientX)}
          onPointerUp={(e) => { if (startX.current !== null && Math.abs(e.clientX - startX.current) > 50) show(open + (e.clientX < startX.current ? 1 : -1)); startX.current = null; }}
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="lb-stage" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
            <img key={cur.id} src={cur.image_url} alt={cur.title} />
          </div>
          <div className="lb-bar">
            {pics.length > 1 && <button type="button" onClick={() => show(open - 1)} aria-label="Previous photo">←</button>}
            <span>{cur.title} · {open + 1}/{pics.length}</span>
            {pics.length > 1 && <button type="button" onClick={() => show(open + 1)} aria-label="Next photo">→</button>}
            <a href={cur.href}>Open entry</a>
            <button ref={closeBtn} type="button" onClick={close}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
