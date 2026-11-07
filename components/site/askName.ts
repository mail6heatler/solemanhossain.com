"use client";
// Reactions need a name, so the owner knows who they're from. Asked once, then remembered in this browser.

import { cleanName, NAME_MAX } from "@/lib/names";

const KEY = "lc_name";

export function savedName() {
  try { return cleanName(localStorage.getItem(KEY) || ""); } catch { return ""; }
}

/** Opens the "who's reacting?" box. Resolves with the name, or "" if they closed it. */
export function askName(emoji?: string, words?: { title: string; why: string; ok: string }): Promise<string> {
  return new Promise((resolve) => {
    const d = document.createElement("dialog");
    d.className = "name-dlg";
    const form = document.createElement("form");
    const big = document.createElement("div");
    big.className = "name-emo";
    big.textContent = emoji || "👋";
    const title = document.createElement("h3");
    title.textContent = words?.title ?? "Who's reacting?";
    const why = document.createElement("p");
    why.textContent = words?.why ?? "Tell me your name so I know who this is from. Only I can see it, and you only have to type it once.";
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Your name";
    input.required = true;
    input.maxLength = NAME_MAX;
    input.autocomplete = "name";
    input.value = savedName();
    input.setAttribute("aria-label", "Your name");
    const row = document.createElement("div");
    row.className = "name-row";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "name-cancel";
    cancel.textContent = "Not now";
    const ok = document.createElement("button");
    ok.type = "submit";
    ok.className = "name-ok";
    ok.textContent = words?.ok ?? (emoji ? `Send ${emoji}` : "Save");
    row.append(cancel, ok);
    form.append(big, title, why, input, row);
    d.append(form);
    (document.querySelector(".site") ?? document.body).append(d);

    let done = false;
    const finish = (name: string) => {
      if (done) return;
      done = true;
      if (d.open) d.close();
      d.remove();
      resolve(name);
    };
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = cleanName(input.value);
      if (!name) { input.value = ""; input.focus(); return; }
      try { localStorage.setItem(KEY, name); } catch {}
      window.dispatchEvent(new Event("lc-name"));
      finish(name);
    });
    cancel.addEventListener("click", () => finish(""));
    d.addEventListener("cancel", (e) => { e.preventDefault(); finish(""); });
    d.addEventListener("click", (e) => { if (e.target === d) finish(""); });
    d.showModal();
    input.focus();
    input.select();
  });
}
