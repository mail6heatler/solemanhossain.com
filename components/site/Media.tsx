import type { Media } from "@/lib/settings";

/**
 * An entry's cover: a photo, or a silent looping video preview (plays on hover with a mouse,
 * or while on screen on phones; see Effects). "#t=0.1" makes browsers show the first frame.
 */
export function Cover({ m, className, style, alt = "" }: { m?: Media; className?: string; style?: React.CSSProperties; alt?: string }) {
  if (!m) return null;
  if (m.type === "video")
    return <video className={`${className ?? ""} hover-play`} src={`${m.url}#t=0.1`} muted playsInline loop preload="metadata" style={style} aria-label={alt || "Video"} />;
  return <img className={className} src={m.url} alt={alt} loading="lazy" style={style} />;
}

/** "▶" on a video cover, and "📷 5" when an entry has more than one photo or video. */
export function MediaBadges({ media }: { media: Media[] }) {
  if (!media.length) return null;
  const videos = media.filter((m) => m.type === "video").length;
  const photos = media.length - videos;
  return (
    <span className="media-badges" aria-hidden>
      {media[0].type === "video" && <span className="mb play">▶</span>}
      {media.length > 1 && <span className="mb">{[photos ? `📷 ${photos}` : "", videos ? `🎬 ${videos}` : ""].filter(Boolean).join(" · ")}</span>}
    </span>
  );
}
