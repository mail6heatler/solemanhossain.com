"use client";
import { useEffect, useRef } from "react";

const CLOSE = 0.87; // how much narrower than the book a cover can be and still fill it, losing a sliver off its top and bottom

/**
 * How an uploaded cover sits in its book. By default (in the CSS) it keeps its shape, from the top, over a blurred copy of itself. A cover as wide
 * as the book or wider needs nothing more: the writing hides whatever's left below it, so it looks full and loses nothing. One a little narrower
 * would leave thin bars at its sides, which look like a mistake, so it fills the book instead ("snug"). Only the browser knows both shapes.
 */
export default function CoverFit() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const box = ref.current?.parentElement;
    const pic = box?.querySelector<HTMLImageElement | HTMLVideoElement>(".bk-pic");
    if (!box || !pic) return;
    const fit = () => {
      const w = "naturalWidth" in pic ? pic.naturalWidth : pic.videoWidth;
      const h = "naturalHeight" in pic ? pic.naturalHeight : pic.videoHeight;
      if (!w || !h || !box.clientWidth || !box.clientHeight) return;
      const shape = w / h / (box.clientWidth / box.clientHeight);
      box.classList.toggle("snug", shape >= CLOSE && shape < 1);
    };
    const resized = new ResizeObserver(fit);
    resized.observe(box);
    pic.addEventListener("load", fit);
    pic.addEventListener("loadedmetadata", fit);
    return () => {
      resized.disconnect();
      pic.removeEventListener("load", fit);
      pic.removeEventListener("loadedmetadata", fit);
    };
  }, []);
  return <i ref={ref} hidden />;
}
