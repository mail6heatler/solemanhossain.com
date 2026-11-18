import type { Ring } from "@/lib/mascot";

const SAFE = /^(https?:\/\/|\/)[\w\-./:%?=&~+#,]+$/;

/** The ring around the hero photo (styles in app/mascot.css). It takes the photo's own shape; `round` draws a circle. */
export default function HeroRing({ ring, photo, round }: { ring: Ring; photo: string; round: boolean }) {
  const shaped = !round && SAFE.test(photo);
  const style = {
    "--rw": `${ring.width}px`,
    "--rg": `${ring.gap}px`,
    "--rk": (100 / ring.speed).toFixed(3),
    ...(shaped ? { "--ring-img": `url("${photo}")` } : {}),
    ...(ring.color === "custom" ? { "--rc": ring.custom } : ring.color === "mood" ? { "--rc": "var(--m, var(--mint))" } : ring.color === "status" ? { "--rc": "var(--status-c, var(--mint))" } : {}),
  } as React.CSSProperties;
  return (
    <i className={`hring r-${ring.style}${shaped ? "" : " round"}${ring.gap ? " gap" : ""}`} style={style} aria-hidden>
      <i />{ring.gap > 0 && shaped && <b className="hring-gap" />}
    </i>
  );
}
