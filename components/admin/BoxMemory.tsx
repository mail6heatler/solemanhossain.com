"use client";
import { useEffect } from "react";

/**
 * Remembers which boxes on the page are open: as any form with a `boxes` field is saved, it writes in all of them, including those outside
 * that form. A closed box can also hide a required field, which would stop a Save with nothing to see, so that box opens.
 */
export default function BoxMemory() {
  useEffect(() => {
    const saving = (e: Event) => {
      const field = (e.target as HTMLElement).querySelector<HTMLInputElement>('input[name="boxes"]');
      if (!field) return;
      const boxes = Array.from(document.querySelectorAll<HTMLDetailsElement>("details[data-box]"));
      field.value = JSON.stringify(Object.fromEntries(boxes.map((b) => [b.dataset.box, b.open])));
    };
    const invalid = (e: Event) => { (e.target as HTMLElement).closest?.<HTMLDetailsElement>("details[data-box]")?.setAttribute("open", ""); };
    // on the way down, so it's written before React reads the form
    document.addEventListener("submit", saving, true);
    document.addEventListener("invalid", invalid, true);
    return () => {
      document.removeEventListener("submit", saving, true);
      document.removeEventListener("invalid", invalid, true);
    };
  }, []);
  return null;
}
