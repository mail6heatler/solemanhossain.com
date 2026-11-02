"use client";
import { useEffect, useRef, useState } from "react";
import { burst, confettiFrom } from "./fx";

/** On the "page not found" screen: catch the runaway compass 3 times to find the way home. */
export default function Game404() {
  const arena = useRef<HTMLDivElement>(null);
  const runner = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ x: 30, y: 30 });
  const [caught, setCaught] = useState(0);
  const lastMove = useRef(0);
  const won = caught >= 3;

  const moveAway = () => {
    const a = arena.current;
    if (!a) return;
    setPos({ x: Math.random() * Math.max(0, a.clientWidth - 56), y: Math.random() * Math.max(0, a.clientHeight - 56) });
    lastMove.current = performance.now();
  };

  useEffect(() => {
    if (won || !window.matchMedia("(pointer: coarse)").matches) return;
    const t = setInterval(moveAway, 1100); // on phones it hops around on its own
    return () => clearInterval(t);
  }, [won]);

  const near = (e: React.PointerEvent) => {
    if (won || e.pointerType !== "mouse" || !runner.current) return;
    const r = runner.current.getBoundingClientRect();
    const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    if (d < 64 && performance.now() - lastMove.current > 420 && Math.random() < 0.55) moveAway();
  };

  const catchIt = () => {
    const r = runner.current?.getBoundingClientRect();
    if (r) burst(r.left + r.width / 2, r.top + r.height / 2, ["⭐", "✨"], 6, 50);
    const n = caught + 1;
    setCaught(n);
    if (n >= 3) confettiFrom(arena.current, { count: 90 });
    else moveAway();
  };

  return (
    <>
      <div className="game404" ref={arena} onPointerMove={near}>
        {!won && (
          <button ref={runner} type="button" className="runner" style={{ left: pos.x, top: pos.y }} onClick={catchIt} aria-label="Catch the compass">🧭</button>
        )}
        {won && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 54 }} aria-hidden>🏠</div>}
        <span className="score" aria-live="polite">{won ? "You found your way home!" : `Caught ${caught} of 3`}</span>
      </div>
      <p className="ssub" style={{ margin: "14px auto 0", textAlign: "center" }}>
        {won ? "Nice catch. The door is right here:" : "Catch the runaway compass 3 times, or just take the shortcut."}
      </p>
    </>
  );
}
