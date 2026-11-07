"use client";
import { useRef, useState } from "react";
import type { Media } from "@/lib/settings";
import Reactions from "./Reactions";
import type { TalkInfo } from "@/lib/talk";
import { Lightbox, type Slide } from "./MediaView";
import SideRow, { type RowFx } from "./SideRow";
import FullView from "./FullView";
import { Cover } from "./Media";

type Item = { id: number; talk?: TalkInfo; title: string; href: string; media: Media[]; className?: string; style?: React.CSSProperties;
  /** always shown under the photo: phones have no hover to reveal a caption */
  info?: { subtitle?: string; meta?: string; text?: string; tags?: string[] } };

/** Photo grid (Life): each tile shows the entry's cover; the viewer steps through every photo and video of every entry. */
export function PhotoInfo({ title, href, info }: { title: string; href: string; info?: Item["info"] }) {
  return (
    <div className="ph-info">
      <a href={href}>{title}</a>
      {info?.subtitle && <span className="ph-sub">{info.subtitle}</span>}
      {info?.meta && <span className="ph-meta">{info.meta}</span>}
      {info?.text && <span className="ph-text">{info.text}</span>}
      {info?.tags && info.tags.length > 0 && <span className="ph-meta">{info.tags.map((t) => `#${t}`).join(" ")}</span>}
    </div>
  );
}

export default function PhotoGrid({ className, items, reactions = false, row }: { className: string; items: Item[]; reactions?: boolean; row?: RowFx }) {
  const slides: Slide[] = items.flatMap((it) => it.media.map((m, i) => ({ ...m, caption: `${it.title}${it.media.length > 1 ? ` (${i + 1}/${it.media.length})` : ""}`, href: it.href, itemId: it.id })));
  const firstSlide = (id: number) => slides.findIndex((s) => s.itemId === id);
  const [open, setOpen] = useState(-1);
  const lastTile = useRef<HTMLElement | null>(null);

  const tiles = items.map((it) => {
          const cover = it.media[0];
          return (
            <div key={it.id} className={`ph-cell${it.className ?? ""}`} style={it.style}>
              {cover ? (
                <button type="button" className="ph-tile" aria-label={`Open: ${it.title}`}
                  onClick={(e) => { lastTile.current = e.currentTarget; setOpen(firstSlide(it.id)); }}>
                  <Cover m={cover} alt={it.title} />
                  <span className="cap">{it.title}</span>
                  {(cover.type !== "image" || it.media.length > 1) && (
                    <span className="media-badges" aria-hidden>
                      {cover.type === "video" && <span className="mb play">▶</span>}
                      {cover.type === "pdf" && <span className="mb">PDF</span>}
                      {it.media.length > 1 && <span className="mb">+{it.media.length - 1}</span>}
                    </span>
                  )}
                </button>
              ) : (
                <a href={it.href} className="ph-tile txt">{it.title}</a>
              )}
              <PhotoInfo title={it.title} href={it.href} info={it.info} />
              <div className="card-foot plain">{reactions && <Reactions id={it.id} compact talk={it.talk} href={it.href} />}<FullView to={it.href} label={it.title} /></div>
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
