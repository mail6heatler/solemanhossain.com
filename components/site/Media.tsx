import type { Media } from "@/lib/settings";

/**
 * An entry's cover: a photo, a PDF's first page, or a silent looping video preview (plays on hover with a mouse,
 * or while on screen on phones; see Effects). "#t=0.1" makes browsers show the first frame.
 */
export function Cover({ m, className, style, alt = "" }: { m?: Media; className?: string; style?: React.CSSProperties; alt?: string }) {
  if (!m) return null;
  if (m.type === "audio") return <span className={`${className ?? ""} pdf-tile`} style={style}><i className="ti ti-music" aria-hidden /><b>{m.name || alt || "Sound"}</b></span>;
  if (m.type === "pdf")
    return m.thumb
      ? <img className={className} src={m.thumb} alt={alt} loading="lazy" decoding="async" style={{ objectPosition: "var(--fx, 50%) var(--fy, 0%)", ...style }} /> // a page keeps its top when trimmed: that's where its title is
      : <span className={`${className ?? ""} pdf-tile`} style={style}><i className="ti ti-file-type-pdf" aria-hidden /><b>{m.name || alt || "PDF"}</b></span>;
  if (m.type === "video")
    return <video className={`${className ?? ""} hover-play`} src={`${m.url}#t=0.1`} muted playsInline loop preload="metadata" style={style} aria-label={alt || "Video"} />;
  return <img className={className} src={m.url} alt={alt} loading="lazy" decoding="async" style={style} />;
}

/** "▶" on a video cover, and "📷 5" when an entry has more than one photo or video. */
export function MediaBadges({ media }: { media: Media[] }) {
  if (!media.length) return null;
  const videos = media.filter((m) => m.type === "video").length;
  const pdfs = media.filter((m) => m.type === "pdf").length;
  const sounds = media.filter((m) => m.type === "audio").length;
  const photos = media.length - videos - pdfs - sounds;
  return (
    <span className="media-badges" aria-hidden>
      {media[0].type === "video" && <span className="mb play">▶</span>}
      {media[0].type === "pdf" && <span className="mb">PDF</span>}
      {media.length > 1 && <span className="mb">{[photos ? `📷 ${photos}` : "", videos ? `🎬 ${videos}` : "", pdfs ? `📄 ${pdfs}` : "", sounds ? `🎵 ${sounds}` : ""].filter(Boolean).join(" · ")}</span>}
    </span>
  );
}
