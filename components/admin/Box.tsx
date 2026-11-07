/**
 * A titled box on an entry's or a section's dashboard page: its title opens and closes it, and any Save on the page remembers how it was
 * (see BoxMemory). The Save and Delete boxes are the only ones that aren't these, because they have nothing to close.
 */
export function Box({ name, title, icon, open, id, children }: { name: string; title: React.ReactNode; icon: string; open: boolean; id?: string; children: React.ReactNode }) {
  return (
    <details className="c box" data-box={name} id={id} open={open}>
      <summary><i className={`ti ti-${icon}`} aria-hidden="true" /><span>{title}</span><i className="ti ti-chevron-down" aria-hidden="true" /></summary>
      {children}
    </details>
  );
}
