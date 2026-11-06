/** Opens an entry's full page. It's always in view, in the bar at the bottom of a card. On very narrow cards only the arrow shows. */
export default function FullView({ to, label }: { to: string; label: string }) {
  return <a className="full-view" href={to} aria-label={`Full view: ${label}`}><span>Full view</span><i className="ti ti-arrow-right" aria-hidden /></a>;
}
