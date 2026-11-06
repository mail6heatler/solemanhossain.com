"use client";
import { useRef, useState } from "react";
import type { Media } from "@/lib/settings";
import Reactions from "./Reactions";
import { Lightbox, type Slide } from "./MediaView";
import SideRow, { type RowFx } from "./SideRow";

type Item = { id: number; title: string; href: string; media: Media[] };

/** Photo grid (Life): each tile shows the entry's cover; the viewer steps through every photo and video of every entry. */
export default function PhotoGrid({ className, items, reactions = false, row }: { className: string; items: Item[]; reactions?: boolean; row?: RowFx }) {
  const slides: Slide[] = items.flatMap((it) => it.media.map((m, i) => ({ ...m, caption: `${it.title}${it.media.length > 1 ? ` (${i + 1}/${it.media.length})` : ""}`, href: it.href, itemId: it.id })));
  const firstSlide = (id: number) => slides.findIndex((s) => s.itemId === id);
  const [open, setOpen] = useState(-1);
  const lastTile = useRef<HTMLElement | null>(null);

  const tiles = items.map((it) => {
          const cover = it.media[0];
          return (
            <div key={it.id} className="ph-cell">
              {cover ? (
                <button type="button" className="ph-tile" aria-label={`Open: ${it.title}`}
                  onClick={(e) => { lastTile.current = e.currentTarget; setOpen(firstSlide(it.id)); }}>
                  {cover.type === "video"
                    ? <video className="hover-play" src={`${cover.url}#t=0.1`} muted playsInline loop preload="metadata" />
                    : <img src={cover.url} alt={it.title} loading="lazy" />}
                  <span className="cap">{it.title}</span>
                  {(cover.type === "video" || it.media.length > 1) && (
                    <span className="media-badges" aria-hidden>
                      {cover.type === "video" && <span className="mb play">▶</span>}
                      {it.media.length > 1 && <span className="mb">+{it.media.length - 1}</span>}
                    </span>
                  )}
                </button>
              ) : (
                <a href={it.href} className="ph-tile txt">{it.title}</a>
              )}
              {reactions && <Reactions id={it.id} compact />}
            </div>
          );
        });

  return (
    <>
      {row ? <SideRow className={className} fx={row}>{tiles}</SideRow> : <div className={className}>{tiles}</div>}
      {open >= 0 && (
        <Lightbox slides={slides} index={open} onIndex={setOpen} reactions={reactions}
          onClose={() => { setOpen(-1); lastTile.current?.focus(); }} />
      )}
    </>
  );
}
