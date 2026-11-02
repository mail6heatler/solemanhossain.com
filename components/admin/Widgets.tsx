"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

/** Shows a short toast when the URL has ?saved=1 or ?deleted=1. */
export function Toast() {
  const sp = useSearchParams();
  const msg = sp.get("saved") ? "✅ Saved — it's live on your site" : sp.get("deleted") ? "🗑️ Deleted" : null;
  const [key, setKey] = useState(0);
  useEffect(() => { setKey((k) => k + 1); }, [msg]);
  if (!msg) return null;
  return <div key={key} className="adm-toast">{msg}</div>;
}

export function ConfirmSubmit({ message, children, className = "b-danger" }: { message: string; children: React.ReactNode; className?: string }) {
  return (
    <button type="submit" className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>{children}</button>
  );
}

/** Chips with add / remove / reorder (by dragging). Saved as one item per line in a hidden input. */
export function ChipsEditor({ name, initial, placeholder }: { name: string; initial: string[]; placeholder?: string }) {
  const [chips, setChips] = useState(initial);
  const [val, setVal] = useState("");
  const drag = useRef<number | null>(null);
  const add = () => { const v = val.trim(); if (v) { setChips((c) => [...c, v]); setVal(""); } };
  return (
    <div>
      <input type="hidden" name={name} value={chips.join("\n")} />
      <div className="chips">
        {chips.map((c, i) => (
          <span key={i + c} className="ch" draggable style={{ cursor: "grab" }}
            onDragStart={() => (drag.current = i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              const from = drag.current; drag.current = null;
              if (from === null || from === i) return;
              setChips((cs) => { const n = [...cs]; const [m] = n.splice(from, 1); n.splice(i, 0, m); return n; });
            }}>
            {c}
            <button type="button" aria-label={`Remove ${c}`} onClick={() => setChips((cs) => cs.filter((_, j) => j !== i))}><i className="ti ti-x" /></button>
          </span>
        ))}
        {chips.length === 0 && <span style={{ fontSize: 12, color: "var(--text-faint)" }}>None yet</span>}
      </div>
      <div className="chip-add">
        <input className="inp" value={val} placeholder={placeholder ?? "Add…"} onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <button type="button" className="b-dark b-sm" onClick={add}><i className="ti ti-plus" />Add</button>
      </div>
    </div>
  );
}

type Row = { label: string; url: string; icon?: string };

/** Button / link rows (label + URL, optional icon). Saved as JSON in a hidden input. */
export function LinksEditor({ name, initial, withIcon, addLabel = "Add button" }: { name: string; initial: Row[]; withIcon?: boolean; addLabel?: string }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const set = (i: number, k: keyof Row, v: string) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const move = (i: number, d: number) => setRows((rs) => {
    const j = i + d; if (j < 0 || j >= rs.length) return rs;
    const c = [...rs]; [c[i], c[j]] = [c[j], c[i]]; return c;
  });
  return (
    <div className="rows-ed">
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      {rows.map((r, i) => (
        <div key={i} className={`r ${withIcon ? "social" : ""}`}>
          {withIcon && (
            <select value={r.icon ?? "link"} onChange={(e) => set(i, "icon", e.target.value)} aria-label="Icon">
              {SOCIAL_ICONS.map((s) => <option key={s} value={s}>{s.replace("brand-", "")}</option>)}
            </select>
          )}
          <input className="inp" placeholder="Label" value={r.label} onChange={(e) => set(i, "label", e.target.value)} />
          <input className="inp" placeholder="https://… or mailto:…" value={r.url} onChange={(e) => set(i, "url", e.target.value)} />
          <button type="button" className="adm-iconbtn" onClick={() => move(i, -1)} aria-label="Move up"><i className="ti ti-arrow-up" /></button>
          <button type="button" className="adm-iconbtn" onClick={() => move(i, 1)} aria-label="Move down"><i className="ti ti-arrow-down" /></button>
          <button type="button" className="adm-iconbtn" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} aria-label="Remove"><i className="ti ti-trash" /></button>
        </div>
      ))}
      <div><button type="button" className="b-out b-sm" onClick={() => setRows((rs) => [...rs, { label: "", url: "", icon: withIcon ? "link" : undefined }])}><i className="ti ti-plus" />{addLabel}</button></div>
    </div>
  );
}

const SOCIAL_ICONS = ["mail", "brand-github", "brand-linkedin", "brand-x", "brand-instagram", "brand-facebook", "brand-youtube", "brand-tiktok",
  "brand-discord", "brand-telegram", "brand-whatsapp", "brand-medium", "brand-spotify", "brand-kaggle", "brand-leetcode", "world", "link", "phone", "file-cv"];

/** Upload an image or PDF. Images are resized in the browser first, so uploads stay small. */
export function UploadField({ name, initial, kind = "image", shape = "round", fallback }:
  { name: string; initial: string; kind?: "image" | "pdf"; shape?: "round" | "wide" | "sq"; fallback?: string }) {
  const [url, setUrl] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setErr(""); setBusy(true);
    try {
      let file: Blob = f;
      let fname = f.name;
      if (kind === "image" && f.type !== "image/gif") { file = await shrink(f, 1800); fname = f.name.replace(/\.\w+$/, "") + ".jpg"; }
      const fd = new FormData();
      fd.append("file", file, fname);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Upload failed");
      setUrl(d.url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally { setBusy(false); if (input.current) input.current.value = ""; }
  };

  return (
    <div>
      <input type="hidden" name={name} value={url} />
      <div className="upl">
        <div className={`thumb ${shape === "wide" ? "wide" : ""} ${kind === "pdf" || shape === "sq" ? "sq" : ""}`}>
          {kind === "pdf" ? <i className="ti ti-file-cv" /> : url ? <img src={url} alt="" /> : (fallback ?? <i className="ti ti-photo" style={{ fontSize: 20 }} />)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="btns">
            <button type="button" className="b-dark b-sm" onClick={() => input.current?.click()} disabled={busy}>
              <i className={`ti ${busy ? "ti-loader-2" : "ti-upload"}`} />{busy ? "Uploading…" : url ? "Replace" : "Upload"}
            </button>
            {url && <a href={url} target="_blank" className="b-out b-sm"><i className="ti ti-eye" />Preview</a>}
            {url && <button type="button" className="b-out b-sm" onClick={() => setUrl("")}><i className="ti ti-x" />Remove</button>}
          </div>
          <input className="inp" style={{ marginTop: 8, fontSize: 11.5 }} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="…or paste a link (https://…)" />
          {err && <div className="err" style={{ marginTop: 4 }}>{err}</div>}
        </div>
      </div>
      <input ref={input} type="file" hidden accept={kind === "pdf" ? "application/pdf" : "image/*"} onChange={(e) => onFile(e.target.files?.[0])} />
    </div>
  );
}

/** Copies text (e.g. an email address) and briefly shows "Copied". */
export function CopyButton({ text, label = "Copy", className = "b-out b-sm" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch { window.prompt("Copy this:", text); return; }
    setDone(true); setTimeout(() => setDone(false), 1500);
  };
  return (
    <button type="button" className={className} onClick={copy}>
      <i className={`ti ${done ? "ti-check" : "ti-copy"}`} />{done ? "Copied" : label}
    </button>
  );
}

async function shrink(file: File, max: number): Promise<Blob> {
  const img = await createImageBitmap(file).catch(() => null);
  if (!img) return file;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b ?? file), "image/jpeg", 0.85));
}
