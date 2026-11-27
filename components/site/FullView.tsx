/** Opens an entry's full page. It's always in view, in the bar at the bottom of a card. On very narrow cards only the arrow shows. */
export default function FullView({ to, label, attrs }: { to: string; label: string; attrs?: { style?: React.CSSProperties; "data-sz"?: string } }) {
  return <a className="full-view" href={to} aria-label={`Full view: ${label}`} {...attrs}><span>Full view</span><i className="ti ti-arrow-right" aria-hidden /></a>;
}
