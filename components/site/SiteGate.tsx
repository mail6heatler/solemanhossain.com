import type { OpsSettings } from "@/lib/ops";
import UnlockForm from "./UnlockForm";

/**
 * Maintenance mode and private mode (Settings → Site status, lib/ops.ts). skinScript decides before the first paint which one a
 * visitor gets (html.gate-m, html.gate-p), so the site behind never flashes; the owner (html.gate-own) sees the site with a note.
 * Private mode is a curtain, not a safe: the pages are still sent, so it keeps visitors out of a site that isn't ready, not secrets.
 */
export default function SiteGate({ ops, name }: { ops: OpsSettings; name: string }) {
  const m = ops.maintenance, p = ops.private;
  return (
    <>
      {m.on && (
        <div className="gate gate-mt">
          <div className="gate-card">
            <span className="gate-emo" aria-hidden>{m.emoji || "🛠️"}</span>
            <h1>{m.title}</h1>
            {m.text && <p>{m.text}</p>}
            <small>{name}</small>
          </div>
        </div>
      )}
      {p.on && !m.on && (
        <div className="gate gate-pv">
          <div className="gate-card">
            <span className="gate-emo" aria-hidden>🔒</span>
            <h1>{p.title}</h1>
            {p.text && <p>{p.text}</p>}
            <UnlockForm />
            <small>{name}</small>
          </div>
        </div>
      )}
      {(m.on || p.on) && (
        <div className="gate-note" role="status">
          <i className="ti ti-eye" aria-hidden />
          <span className="gn-m">Maintenance mode is on: visitors see the “{m.title}” page. You see the site because you&apos;re signed in.</span>
          <span className="gn-p">Private mode is on: visitors need the password. You see the site because you&apos;re signed in.</span>
          <a href="/admin/settings?tab=status">Change</a>
        </div>
      )}
    </>
  );
}
