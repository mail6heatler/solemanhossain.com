"use client";
import { useEffect, useState } from "react";

/** A number that counts up from zero when the page opens (the Overview's tiles). The page is drawn with the final number, so
 *  it's right without JavaScript; with reduced motion it just stays there. */
export default function CountUp({ to, ms = 1100 }: { to: number; ms?: number }) {
  const [n, setN] = useState(to);
  useEffect(() => {
    if (!to || matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(to); return; }
    let raf = 0; const t0 = performance.now();
    const step = (t: number) => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); setN(Math.round(to * e)); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return <>{n.toLocaleString("en-US")}</>;
}
