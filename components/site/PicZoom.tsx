"use client";
import { useState } from "react";
import type { Media } from "@/lib/settings";
import { Lightbox } from "./MediaView";

/** The small expand button on a card's picture: opens that entry's photos and videos in the full-screen viewer. */
export default function PicZoom({ media: all, title }: { media: Media[]; title: string }) {
  const [open, setOpen] = useState(-1);
  const media = all.filter((m) => m.type !== "audio"); // sound plays on the card and the entry's page
  if (!media.length) return null;
  const slides = media.map((m, i) => ({ ...m, caption: `${title}${media.length > 1 ? ` (${i + 1}/${media.length})` : ""}` }));
  return (
    <>
      <button type="button" className="pic-zoom" aria-label={`Open full screen: ${title}`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(0); }}>
        <i className="ti ti-arrows-maximize" aria-hidden />
      </button>
      {open >= 0 && <Lightbox slides={slides} index={open} onIndex={setOpen} onClose={() => setOpen(-1)} />}
    </>
  );
}
