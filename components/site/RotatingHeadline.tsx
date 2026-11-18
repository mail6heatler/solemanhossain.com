"use client";
import { useEffect, useRef, useState } from "react";
import { Accent } from "./Markdown";
import { prefersReducedMotion } from "./fx";

/**
 * Headlines that take turns: the main one first, then each of the owner's others, one every few seconds with a soft slide. It rests while the
 * hero is off screen or the tab is hidden, and with reduced motion it stays on the main one. Words in *stars* get the accent colour.
 */
export default function RotatingHeadline({ lines, every = 3600 }: { lines: string[]; every?: number }) {
  const [i, setI] = useState(0);
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (lines.length < 2 || prefersReducedMotion()) return;
    let seen = true;
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; });
    if (box.current) io.observe(box.current);
    const t = window.setInterval(() => { if (seen && !document.hidden) setI((n) => (n + 1) % lines.length); }, every);
    return () => { clearInterval(t); io.disconnect(); };
  }, [lines.length, every]);
  return (
    <span ref={box} className="rot-head" aria-live="polite">
      <span key={i} className="rot-line"><Accent text={lines[i % lines.length]} /></span>
    </span>
  );
}
