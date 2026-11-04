// Text split into animatable pieces, rendered on the server so nothing jumps when the page loads.
// Works without "use client": no state, just spans. Screen readers and search engines get the plain text.

/** Scripts whose letters join or combine (Bangla, Arabic…) must stay whole words, or they would render broken. */
export const isSplittable = (text: string) => /^[\u0000-ɏ -⁯←-⯿\s]*$/.test(text);

/** Word masks containing letters. Each letter gets --i, its position, for staggered CSS animation. */
export function Split({ text, on = true }: { text: string; on?: boolean }) {
  if (!on) return <>{text}</>;
  const letters = isSplittable(text);
  let i = 0;
  return (
    <>
      <span className="sr-only">{text}</span>
      <span className="split" aria-hidden>
        {text.split(/(\s+)/).filter(Boolean).map((word, w) =>
          /^\s+$/.test(word) ? " " : (
            <span className="w" key={w}>
              {(letters ? Array.from(word) : [word]).map((ch, c) => (
                <span className="ch" key={c} style={{ ["--i" as string]: i++ }}>{ch}</span>
              ))}
            </span>
          )
        )}
      </span>
    </>
  );
}

/** A sentence whose words light up one by one while scrolling (see scrollFx). */
export function Words({ text, on = true }: { text: string; on?: boolean }) {
  if (!on) return <>{text}</>;
  return (
    <>
      {text.split(/(\s+)/).filter(Boolean).map((w, i) => (/^\s+$/.test(w) ? " " : <span className="sw" key={i}>{w}</span>))}
    </>
  );
}
