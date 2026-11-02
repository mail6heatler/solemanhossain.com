"use client";
import { useEffect, useState } from "react";

/** Loops through phrases: type, pause, delete, next. */
export function BrandTypewriter({ phrases, animate }: { phrases: string[]; animate: boolean }) {
  const list = phrases.length ? phrases : [""];
  const [text, setText] = useState(list[0]);
  useEffect(() => {
    if (!animate || list.length === 0) return;
    let seq = 0, i = 0, deleting = false, t: ReturnType<typeof setTimeout>;
    setText("");
    const tick = () => {
      const p = list[seq];
      if (!deleting) {
        i++; setText(p.slice(0, i));
        if (i >= p.length) { deleting = true; t = setTimeout(tick, 1800); return; }
      } else {
        i--; setText(p.slice(0, i));
        if (i <= 0) { deleting = false; seq = (seq + 1) % list.length; t = setTimeout(tick, 320); return; }
      }
      t = setTimeout(tick, deleting ? 32 : 60);
    };
    t = setTimeout(tick, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, list.join("|")]);
  return <>{text}<span className="blink-cursor" /></>;
}

/** Types the hero subtitle once. The full text is rendered for search engines and no-JS. */
export function TypeOnce({ text, animate }: { text: string; animate: boolean }) {
  const [n, setN] = useState(text.length);
  useEffect(() => {
    if (!animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setN(0);
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const step = () => { i++; setN(i); if (i < text.length) t = setTimeout(step, 26); };
    t = setTimeout(step, 900);
    return () => clearTimeout(t);
  }, [text, animate]);
  return (
    <>
      <span aria-hidden={n < text.length}>{text.slice(0, n)}</span>
      {n < text.length && <span className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{text}</span>}
      {animate && <span className="blink-cursor" style={{ width: 3 }} />}
    </>
  );
}

export function Clock({ timezone, label }: { timezone: string; label: string }) {
  const [now, setNow] = useState<string>("--:--:--");
  useEffect(() => {
    let fmt: Intl.DateTimeFormat;
    try { fmt = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); }
    catch { fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); }
    const tick = () => setNow(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timezone]);
  return <b suppressHydrationWarning>{now} {label}</b>;
}
