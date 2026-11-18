const SAFE = /^(https?:\/\/|\/)[\w\-./:%?=&~+#,]+$/;

/**
 * The status's Messenger border: a line around the hero photo in the status colour (`--status-c`, grey once stale),
 * in the photo's own shape (styles in app/mascot.css: the photo is its own mask). `round` draws a circle instead.
 */
export default function HeroRing({ width, photo, round, color }: { width: number; photo: string; round: boolean; color?: string }) {
  const shaped = !round && SAFE.test(photo);
  const style = {
    "--rw": `${width}px`,
    "--rc": color || "var(--status-c, var(--mint))",
    ...(shaped ? { "--ring-img": `url("${photo}")` } : {}),
  } as React.CSSProperties;
  return <i className={`hring r-solid${shaped ? "" : " round"}`} style={style} aria-hidden><i /></i>;
}
