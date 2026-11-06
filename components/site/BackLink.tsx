"use client";

/**
 * "Back" on an entry page: returns to the place the visitor came from on this site, scrolled where they were.
 * Someone who arrived from outside goes to the section's page instead.
 */
export default function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <a className="back" href={href} onClick={(e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      let sameSite = false;
      try { sameSite = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch {}
      if (sameSite && history.length > 1) { e.preventDefault(); history.back(); }
    }}><i className="ti ti-arrow-left" />{label}</a>
  );
}
