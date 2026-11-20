import type { Section } from "@/lib/data";

/** App-style menu at the bottom of the screen on phones. */
export function BottomBar({ sections, onHome }: { sections: Section[]; onHome: boolean }) {
  return (
    <nav className="bbar" aria-label="Sections">
      <a href={onHome ? "#hero" : "/"} data-link="hero"><span className="e" aria-hidden>🏠</span>Home</a>
      {sections.map((s) => (
        <a key={s.id} href={onHome ? `#${s.slug}` : `/#${s.slug}`} data-link={s.slug}>
          <span className="e" aria-hidden>{s.nav_emoji || "✦"}</span>{s.nav_label || s.title}
        </a>
      ))}
    </nav>
  );
}
