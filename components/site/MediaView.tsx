"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Media } from "@/lib/settings";
import Reactions from "./Reactions";
import { Cover } from "./Media";

export type Slide = Media & { caption: string; href?: string; itemId?: number };

/** Full-screen viewer for photos, videos and PDFs (a PDF shows its first page and a button to open it): arrows, swipe, Esc, optional link to the entry and reactions. */
export function Lightbox({ slides, index, onIndex, onClose, reactions = false }:
  { slides: Slide[]; index: number; onIndex: (i: number) => void; onClose: () => void; reactions?: boolean }) {
  const closeBtn = useRef<HTMLButtonElement>(null);
  const startX = useRef<number | null>(null);
  const n = slides.length;
  const go = useCallback((d: number) => onIndex((index + d + n) % n), [index, n, onIndex]);
  // latest handlers for the keyboard listener, which is set up once when the viewer opens
  const latest = useRef({ go, onClose });
  latest.current = { go, onClose };

  useEffect(() => {
    const w = window as unknown as { __lenis?: { stop(): void; start(): void } };
    w.__lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    closeBtn.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return; // the name box is on top: keys belong to it
      if (e.key === "Escape") latest.current.onClose();
      if (e.key === "ArrowLeft") latest.current.go(-1);
      if (e.key === "ArrowRight") latest.current.go(1);
    };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); document.documentElement.style.overflow = ""; w.__lenis?.start(); };
  }, []);

  const cur = slides[index];
  if (!cur) return null;
  // rendered at the top of the page, so a moving chapter can't shift this full-screen layer
  return createPortal(
    <div className="lb" role="dialog" aria-modal="true" aria-label={cur.caption}
      onPointerDown={(e) => { if ((e.target as Element).closest("video, .lb-bar")) return; startX.current = e.clientX; }}
      onPointerUp={(e) => { if (startX.current !== null && Math.abs(e.clientX - startX.current) > 50) go(e.clientX < startX.current ? 1 : -1); startX.current = null; }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="lb-stage" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        {cur.type === "video"
          ? <video key={cur.url} src={cur.url} controls autoPlay playsInline />
          : cur.type === "pdf"
            ? <a key={cur.url} className="lb-pdf" href={cur.url} target="_blank" rel="noopener" aria-label={`Open PDF: ${cur.caption}`}><Cover m={cur} alt={cur.caption} /></a>
            : <img key={cur.url} src={cur.url} alt={cur.caption} />}
      </div>
      <div className="lb-bar">
        {n > 1 && <button type="button" onClick={() => go(-1)} aria-label="Previous">←</button>}
        <span>{cur.caption}{n > 1 ? ` · ${index + 1}/${n}` : ""}</span>
        {n > 1 && <button type="button" onClick={() => go(1)} aria-label="Next">→</button>}
        {cur.type === "pdf" && <a href={cur.url} target="_blank" rel="noopener">Open PDF</a>}
        {cur.href && <a href={cur.href}>Open entry</a>}
        <button ref={closeBtn} type="button" onClick={onClose}>Close</button>
        {reactions && cur.itemId && <div className="lb-reacts"><Reactions key={cur.itemId} id={cur.itemId} compact /></div>}
      </div>
    </div>,
    document.querySelector(".site") ?? document.body
  );
}

/** Entry page: the cover shown big, the rest as a grid; tap any to view full screen. */
export function EntryGallery({ media, title, morphName }: { media: Media[]; title: string; morphName?: string }) {
  const [open, setOpen] = useState(-1);
  if (!media.length) return null;
  const slides: Slide[] = media.map((m, i) => ({ ...m, caption: `${title}${media.length > 1 ? ` (${i + 1})` : ""}` }));
  const [first, ...rest] = media;
  return (
    <>
      {first.type === "pdf" ? (
        <a className="pdf-hero" href={first.url} target="_blank" rel="noopener" aria-label={`Open PDF: ${title}`}>
          <Cover m={first} className="hero-img" style={morphName ? { viewTransitionName: morphName } : undefined} />
          <span className="pdf-open"><i className="ti ti-file-type-pdf" aria-hidden />Open PDF</span>
        </a>
      ) : first.type === "video" ? (
        <video className="hero-img" src={first.url} controls playsInline preload="metadata" style={morphName ? { viewTransitionName: morphName } : undefined} />
      ) : (
        <button type="button" className="hero-img-btn" onClick={() => setOpen(0)} aria-label={`View ${title} full screen`}>
          <img className="hero-img" src={first.url} alt="" style={morphName ? { viewTransitionName: morphName } : undefined} />
        </button>
      )}
      {rest.length > 0 && (
        <div className="gallery">
          {rest.map((m, i) => (
            <button key={m.url + i} type="button" className="g-tile" onClick={() => setOpen(i + 1)} aria-label={`View ${m.type === "image" ? "photo" : m.type === "video" ? "video" : "PDF"} ${i + 2} of ${media.length}`}>
              {m.type === "video" ? <video src={`${m.url}#t=0.1`} muted playsInline preload="metadata" /> : m.type === "pdf" ? <Cover m={m} /> : <img src={m.url} alt="" loading="lazy" />}
              {m.type === "video" && <span className="g-play" aria-hidden>▶</span>}
              {m.type === "pdf" && <span className="media-badges" aria-hidden><span className="mb">PDF</span></span>}
            </button>
          ))}
        </div>
      )}
      {open >= 0 && <Lightbox slides={slides} index={open} onIndex={setOpen} onClose={() => setOpen(-1)} />}
    </>
  );
}
