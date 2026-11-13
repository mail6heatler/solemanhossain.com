"use client";
import { useState } from "react";
import type { Media } from "@/lib/settings";
import { Cover } from "./Media";
import { Lightbox, type Slide } from "./MediaView";

/**
 * A full view's pictures (see EntryFull): `hero` is the first one, shown whole over a soft copy of itself so nothing is cut and no bars are left;
 * `rest` is every other one as tiles, and any sound. A tap opens the full-screen viewer. `still` (the dashboard) opens nothing.
 */
export function FvShots({ media: all, title, mode, morphName, still }: { media: Media[]; title: string; mode: "hero" | "rest"; morphName?: string; still?: boolean }) {
  const [open, setOpen] = useState(-1);
  const sounds = all.filter((m) => m.type === "audio");
  const media = all.filter((m) => m.type !== "audio");
  const slides: Slide[] = media.map((m, i) => ({ ...m, caption: `${title}${media.length > 1 ? ` (${i + 1})` : ""}` }));
  const viewer = open >= 0 && !still && <Lightbox slides={slides} index={open} onIndex={setOpen} onClose={() => setOpen(-1)} />;
  const vt = morphName ? { viewTransitionName: morphName } : undefined;

  if (mode === "hero") {
    const first = media[0];
    if (!first) return null;
    const src = first.type === "image" ? first.url : first.type === "pdf" ? first.thumb : "";
    return (
      <>
        {first.type === "video" ? (
          <div className="fv-shot"><video className="fv-img" src={first.url} controls playsInline preload="metadata" style={vt} /></div>
        ) : first.type === "pdf" ? (
          <a className="fv-shot" href={first.url} target="_blank" rel="noopener" aria-label={`Open PDF: ${title}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {src && <img className="fv-fill" src={src} alt="" aria-hidden />}
            <Cover m={first} className="fv-img" style={vt} />
            <span className="pdf-open"><i className="ti ti-file-type-pdf" aria-hidden />Open PDF</span>
          </a>
        ) : (
          <button type="button" className="fv-shot" onClick={() => setOpen(0)} aria-label={`View ${title} full screen`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="fv-fill" src={first.url} alt="" aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="fv-img" src={first.url} alt="" style={vt} />
            {media.length > 1 && <span className="fv-count" aria-hidden><i className="ti ti-photo" /> 1 / {media.length}</span>}
          </button>
        )}
        {viewer}
      </>
    );
  }

  const rest = media.slice(1);
  if (!rest.length && !sounds.length) return null;
  return (
    <>
      {sounds.length > 0 && (
        <div className="entry-sounds">
          {sounds.map((m) => (
            <div key={m.url} className="entry-sound"><i className="ti ti-music" aria-hidden />{m.name && <span>{m.name}</span>}<audio src={m.url} controls preload="metadata" aria-label={m.name || title} /></div>
          ))}
        </div>
      )}
      {rest.length > 0 && (
        <div className="gallery fv-more">
          {rest.map((m, i) => (
            <button key={m.url + i} type="button" className="g-tile" onClick={() => setOpen(i + 1)} aria-label={`View ${m.type === "image" ? "photo" : m.type === "video" ? "video" : "PDF"} ${i + 2} of ${media.length}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {m.type === "video" ? <video src={`${m.url}#t=0.1`} muted playsInline preload="metadata" /> : m.type === "pdf" ? <Cover m={m} /> : <img src={m.url} alt="" loading="lazy" />}
              {m.type === "video" && <span className="g-play" aria-hidden>▶</span>}
              {m.type === "pdf" && <span className="media-badges" aria-hidden><span className="mb">PDF</span></span>}
            </button>
          ))}
        </div>
      )}
      {viewer}
    </>
  );
}
