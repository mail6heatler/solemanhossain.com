import { Split } from "./Split";

/**
 * The opening curtain on someone's first visit of a session. Entirely CSS, so it can never get stuck: it plays and
 * removes itself without any JavaScript, and it never catches clicks. The script in lib/settings skinScript hides it
 * before the first paint on later page loads.
 */
export default function Intro({ name }: { name: string }) {
  return (
    <div className="intro" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => <i key={i} className="intro-col" style={{ ["--c" as string]: i }} />)}
      <div className="intro-name"><Split text={name} /></div>
      <div className="intro-line"><b /></div>
    </div>
  );
}
