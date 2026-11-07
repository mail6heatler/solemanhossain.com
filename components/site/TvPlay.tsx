"use client";
import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./fx";

// only one thing plays on the page at a time
let playing: (() => void) | null = null;

const clock = (s: number) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "");

/**
 * The Play button on a TV player. Sound the owner uploaded plays right here, and so does an uploaded video, with its sound on; a click on
 * the screen does the same. With neither, it opens the entry's first web link, such as Spotify or a station's page. Sound is only fetched
 * once it's asked for. While a video isn't playing for real, it runs silently when the lamp reaches it, but only while it's on screen:
 * nothing else stops a video, and one left running after the page scrolled away cost a slow phone a tenth of its frames.
 */
export default function TvPlay({ audio, video, href, title }: { audio?: string; video?: boolean; href?: string; title: string }) {
  const [on, setOn] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const btn = button.current, frame = btn?.closest<HTMLElement>(".trip");
    if (!btn || !frame) return;
    const clip = video ? frame.querySelector<HTMLVideoElement>("video.tv-video") : null;
    const fill = frame.querySelector<HTMLElement>(".tv-fill"), time = frame.querySelector<HTMLElement>(".tv-time");
    let sound: HTMLMediaElement | null = clip;
    let live = false;

    const show = () => {
      if (!sound) return;
      const d = sound.duration;
      if (fill) fill.style.transform = `scaleX(${d ? Math.min(1, sound.currentTime / d) : 0})`;
      if (time) time.textContent = d ? `${clock(sound.currentTime)} / ${clock(d)}` : clock(sound.currentTime);
    };
    const stop = () => {
      if (!live) return;
      live = false;
      sound?.pause();
      if (clip) { clip.muted = true; clip.loop = true; }
      frame.classList.remove("playing");
      if (playing === stop) playing = null;
      setOn(false);
    };
    const start = () => {
      if (!sound && audio) {
        sound = new Audio(audio);
        sound.preload = "metadata";
        sound.addEventListener("timeupdate", show);
        sound.addEventListener("ended", stop);
      }
      if (!sound) return;
      playing?.();
      playing = stop;
      live = true;
      if (clip) { clip.muted = false; clip.loop = false; }
      frame.classList.add("playing");
      setOn(true);
      sound.play().catch(stop);
    };
    const toggle = () => (live ? stop() : start());
    const pressed = (e: Event) => { e.preventDefault(); e.stopPropagation(); toggle(); };
    btn.addEventListener("click", pressed);

    // a click on the screen plays too, except on the expand button
    const bezel = frame.querySelector<HTMLElement>(".can-play .tv-bezel");
    const onScreen = (e: Event) => { if (!(e.target as Element).closest?.(".pic-zoom")) pressed(e); };
    bezel?.addEventListener("click", onScreen);

    if (clip) {
      clip.addEventListener("timeupdate", show);
      clip.addEventListener("ended", stop);
    }
    // the lamp arriving runs a video silently, unless it's a slow device or motion is turned down
    const cell = frame.closest(".tkt-cell");
    let inView = false;
    const quietly = () => {
      if (live || !clip || !cell) return;
      if (inView && cell.classList.contains("here") && !document.documentElement.classList.contains("lite")) { clip.muted = true; clip.play().catch(() => {}); }
      else clip.pause();
    };
    const watching = clip && cell && !prefersReducedMotion();
    const lamp = watching ? new MutationObserver(quietly) : null;
    const view = watching ? new IntersectionObserver(([e]) => { inView = e.isIntersecting; quietly(); }) : null;
    if (lamp && cell) lamp.observe(cell, { attributes: true, attributeFilter: ["class"] });
    if (view) view.observe(frame);

    return () => {
      stop();
      lamp?.disconnect();
      view?.disconnect();
      btn.removeEventListener("click", pressed);
      bezel?.removeEventListener("click", onScreen);
      clip?.removeEventListener("timeupdate", show);
      clip?.removeEventListener("ended", stop);
      if (sound && sound !== clip) { sound.removeEventListener("timeupdate", show); sound.removeEventListener("ended", stop); sound.src = ""; }
    };
  }, [audio, video]);

  const icon = on
    ? <svg viewBox="0 0 14 16" aria-hidden><path d="M2 1h3.500v14H2zM8.500 1H12v14H8.500z" /></svg>
    : <svg viewBox="0 0 14 16" aria-hidden><path d="M1 1 13 8 1 15Z" /></svg>;
  if (audio || video) return <button ref={button} type="button" className="tv-play" aria-pressed={on} aria-label={`${on ? "Pause" : "Play"} ${title}`}>{icon}</button>;
  if (href) return <a className="tv-play" href={href} target="_blank" rel="noopener noreferrer" aria-label={`Play ${title} (opens in a new tab)`}>{icon}</a>;
  return <span className="tv-play idle" aria-hidden>{icon}</span>;
}
