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

/**
 * Uploads one file and returns its public URL. Photos are resized in the browser first (max 1800px).
 * With Vercel Blob connected (useBlob), files go straight to Blob storage (videos up to 200 MB);
 * otherwise they are stored in the database through /api/upload.
 */
export async function uploadFile(f: File, useBlob: boolean, onProgress?: (pct: number) => void): Promise<string> {
  let body: Blob = f;
  let name = f.name || "file";
  if (f.type.startsWith("image/") && f.type !== "image/gif") {
    body = await shrink(f, 1800);
    name = name.replace(/\.\w+$/, "") + (body.type === "image/webp" ? ".webp" : body.type === "image/png" ? ".png" : ".jpg");
  }
  if (useBlob) {
    const { upload } = await import("@vercel/blob/client");
    const safe = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+/, "").slice(-80) || "file";
    const r = await upload(`media/${safe}`, body, {
      access: "public", handleUploadUrl: "/api/blob", contentType: body.type || f.type,
      multipart: body.size > 25 * 1024 * 1024, onUploadProgress: (p) => onProgress?.(Math.round(p.percentage)),
    });
    return r.url;
  }
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      try { const d = JSON.parse(xhr.responseText); if (xhr.status < 300 && d.url) resolve(d.url); else reject(new Error(d.error || "Upload failed")); }
      catch { reject(new Error(xhr.status === 413 ? "File is too large." : "Upload failed")); }
    };
    xhr.onerror = () => reject(new Error("Network error. Check your connection and try again."));
    const fd = new FormData();
    fd.append("file", body, name);
    xhr.send(fd);
  });
}

type MediaItem = { url: string; type: "image" | "video" };
type Job = { key: string; name: string; pct: number; err?: string };
const isVideoUrl = (u: string) => /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u);

/** Photos + videos for an entry: upload several at once, drag files in, reorder, choose the cover (first), remove. */
export function MediaField({ name, initial, useBlob, maxVideoMb }: { name: string; initial: MediaItem[]; useBlob: boolean; maxVideoMb: number }) {
  const [items, setItems] = useState<MediaItem[]>(initial);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [link, setLink] = useState("");
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const guard = useRef<HTMLInputElement>(null);
  const busy = jobs.some((j) => !j.err);

  // stop the form from saving while files are still uploading
  useEffect(() => { guard.current?.setCustomValidity(busy ? "Please wait until the uploads finish." : ""); }, [busy]);

  const onFiles = async (files: FileList | File[] | null) => {
    const list = Array.from(files ?? []).slice(0, Math.max(0, 30 - items.length));
    for (const f of list) {
      const key = Math.random().toString(36).slice(2);
      const video = f.type.startsWith("video/");
      setJobs((j) => [...j, { key, name: f.name, pct: 0 }]);
      try {
        if (!video && !f.type.startsWith("image/")) throw new Error(`${f.name}: only photos and videos`);
        if (video && f.size > maxVideoMb * 1024 * 1024) throw new Error(`${f.name}: videos can be up to ${maxVideoMb} MB here`);
        const url = await uploadFile(f, useBlob, (pct) => setJobs((j) => j.map((x) => (x.key === key ? { ...x, pct } : x))));
        setItems((m) => [...m, { url, type: video ? "video" : "image" }]);
        setJobs((j) => j.filter((x) => x.key !== key));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        setJobs((j) => j.map((x) => (x.key === key ? { ...x, err: msg.startsWith(f.name) ? msg : `${f.name}: ${msg}` } : x)));
      }
    }
    if (input.current) input.current.value = "";
  };
  const move = (i: number, d: number) => setItems((m) => { const j = i + d; if (j < 0 || j >= m.length) return m; const c = [...m]; [c[i], c[j]] = [c[j], c[i]]; return c; });
  const cover = (i: number) => setItems((m) => [m[i], ...m.filter((_, k) => k !== i)]);
  const addLink = () => {
    const u = link.trim();
    if (!/^(https?:\/\/|\/)/i.test(u)) return;
    setItems((m) => [...m, { url: u, type: isVideoUrl(u) ? "video" : "image" }]);
    setLink("");
  };

  return (
    <div className="media-ed">
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      <input ref={guard} className="media-guard" tabIndex={-1} aria-hidden value="" onChange={() => {}} required={busy} />
      <div className={`media-grid ${over ? "over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onFiles(e.dataTransfer.files); }}>
        {items.map((m, i) => (
          <div key={m.url + i} className="media-tile">
            {m.type === "video" ? <video src={`${m.url}#t=0.1`} muted playsInline preload="metadata" /> : <img src={m.url} alt="" />}
            {i === 0 && <span className="mt-badge cover">Cover</span>}
            {m.type === "video" && <span className="mt-badge vid"><i className="ti ti-player-play-filled" />Video</span>}
            <div className="mt-actions">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier" title="Move earlier"><i className="ti ti-arrow-left" /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move later" title="Move later"><i className="ti ti-arrow-right" /></button>
              {i > 0 && <button type="button" onClick={() => cover(i)} aria-label="Make this the cover" title="Make this the cover"><i className="ti ti-star" /></button>}
              <a href={m.url} target="_blank" aria-label="Open" title="Open"><i className="ti ti-eye" /></a>
              <button type="button" onClick={() => setItems((x) => x.filter((_, k) => k !== i))} aria-label="Remove" title="Remove"><i className="ti ti-x" /></button>
            </div>
          </div>
        ))}
        {jobs.map((j) => (
          <div key={j.key} className={`media-tile job ${j.err ? "failed" : ""}`}>
            {j.err ? <i className="ti ti-alert-triangle" /> : <i className="ti ti-loader-2 spin" />}
            <small>{j.err ?? `${j.name} · ${j.pct}%`}</small>
            {!j.err && <div className="mt-bar"><i style={{ width: `${j.pct}%` }} /></div>}
            {j.err && <button type="button" className="b-out b-sm" onClick={() => setJobs((x) => x.filter((y) => y.key !== j.key))}>Dismiss</button>}
          </div>
        ))}
        {items.length + jobs.length < 30 && (
          <button type="button" className="media-add" onClick={() => input.current?.click()}>
            <i className="ti ti-photo-plus" /><b>Add photos or videos</b><small>or drop files here</small>
          </button>
        )}
      </div>
      <div className="media-link">
        <input className="inp" value={link} onChange={(e) => setLink(e.target.value)} placeholder="…or paste a photo or video link (https://…)"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }} />
        <button type="button" className="b-out b-sm" onClick={addLink} disabled={!link.trim()}><i className="ti ti-link" />Add link</button>
      </div>
      <div className="hint">
        <b className="media-count">{items.length} of 30</b> · The first one is the cover. Photos are resized automatically. Videos (MP4, WebM, MOV) up to {maxVideoMb} MB
        {useBlob ? "." : " here. Bigger videos need Vercel Blob storage."}{busy && " · Uploading… wait before saving."}
      </div>
      <input ref={input} type="file" hidden multiple accept="image/*,video/mp4,video/webm,video/quicktime" onChange={(e) => onFiles(e.target.files)} />
    </div>
  );
}

/** Upload a single image or PDF (profile photo, résumé). Images are resized in the browser first, so uploads stay small. */
export function UploadField({ name, initial, kind = "image", shape = "round", fallback, useBlob = false }:
  { name: string; initial: string; kind?: "image" | "pdf"; shape?: "round" | "wide" | "sq"; fallback?: string; useBlob?: boolean }) {
  const [url, setUrl] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setErr(""); setBusy(true);
    try {
      setUrl(await uploadFile(f, useBlob));
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

/** ⓘ button: a pop-up explaining a feature (what it does, how to use it) with a Preview link to the live site. */
export function InfoTip({ help, on }: { help: { title: string; what: string; how: string[]; preview?: string }; on?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();
  return (
    <>
      <button type="button" className="info-btn" aria-label={`About: ${help.title}`} title="What is this?" onClick={() => ref.current?.showModal()}>i</button>
      <dialog ref={ref} className="info-dlg" aria-label={help.title} onClick={(e) => { if (e.target === ref.current) close(); }}>
        <div className="info-in">
          <div className="info-h">
            <b>{help.title}</b>
            {on !== undefined && <span className={`tagx ${on ? "" : "amber"}`}>{on ? "on" : "off"}</span>}
            <button type="button" className="adm-iconbtn" aria-label="Close" onClick={close}><i className="ti ti-x" /></button>
          </div>
          <h4>What it does</h4>
          <p>{help.what}</p>
          <h4>How to use it</h4>
          <ol>{help.how.map((s, i) => <li key={i}>{s}</li>)}</ol>
          {on === false && <p className="info-warn"><i className="ti ti-alert-circle" /> It&apos;s switched off right now. Switch it on and press Save appearance, then preview.</p>}
          <div className="btns">
            {help.preview && (
              <a className="b-mint b-sm" href={help.preview} target="_blank" rel="noopener"><i className="ti ti-player-play" />Preview on your site</a>
            )}
            <button type="button" className="b-out b-sm" onClick={close}>Close</button>
          </div>
        </div>
      </dialog>
    </>
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
  if (!img) return file; // e.g. HEIC on Windows: the server will say if the type isn't supported
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  // cut-out pictures keep their transparency (JPEG can't); everything else becomes a small JPEG
  let clear = false;
  if (file.type !== "image/jpeg") {
    const px = ctx.getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < px.length; i += 16) if (px[i] < 250) { clear = true; break; }
  }
  return new Promise((res) => (clear ? c.toBlob((b) => res(b ?? file), "image/webp", 0.92) : c.toBlob((b) => res(b ?? file), "image/jpeg", 0.85)));
}
