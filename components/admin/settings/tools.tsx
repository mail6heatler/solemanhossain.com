"use client";
import { useEffect, useMemo, useState } from "react";
import { dangerZone, refreshSite } from "@/app/opsActions";
import { bulkEntries, checkLinks, copySection, deleteUploads, findText, replaceText, unusedUploads, type LinkReport, type Match, type Upload } from "@/app/toolActions";
import { RESERVED_SLUGS, SLUG_RE } from "@/lib/ops";
import { Card, kb, Sure, Sw, useAct, useOps, When } from "./kit";

type Sec = { id: number; title: string };
type Entry = { id: number; title: string; section: number; visible: boolean };

/** Settings → Tools: every tool is one card, and anything that changes content shows what it will change first */
export function ToolsTab({ sections, entries, site }: { sections: Sec[]; entries: Entry[]; site: string }) {
  return (<>
    <Refresh />
    <FindReplace />
    <Links />
    <Unused />
    <ShortLinks site={site} />
    <Qr site={site} />
    <Sheets />
    <CopySection sections={sections} />
    <Bulk sections={sections} entries={entries} />
    <Danger />
  </>);
}

function Refresh() {
  const { busy, run, Msg } = useAct();
  return (
    <Card title="Refresh the whole site" icon="refresh">
      <div className="hint">Every page is made fresh at once. Saving already does this; use it if something on the site still looks old after a change.</div>
      <div className="btns"><button type="button" className="b-mint b-sm" disabled={!!busy} onClick={() => run("r", refreshSite)}><i className={`ti ti-${busy ? "loader-2 spin" : "refresh"}`} />Refresh now</button></div>
      <Msg />
    </Card>
  );
}

function FindReplace() {
  const { busy, run, Msg } = useAct();
  const [q, setQ] = useState(""), [w, setW] = useState(""), [cs, setCs] = useState(false);
  const [m, setM] = useState<Match[] | null>(null), [pick, setPick] = useState<Set<string>>(new Set()), [err, setErr] = useState("");
  const key = (x: Match) => `${x.id}:${x.field}`;
  const find = async () => { setErr(""); const r = await findText(q, cs); if (!r.ok) { setErr(r.error); setM(null); return; } setM(r.matches); setPick(new Set(r.matches.map(key))); };
  const total = m?.reduce((a, x) => a + x.count, 0) ?? 0;
  return (
    <Card title="Find and replace" icon="replace">
      <div className="hint">Changes words across every entry at once: titles, stories, subsections, tags, places, dates, statuses, buttons and poll options. You see every match first.</div>
      <div className="f2">
        <div className="fl"><label htmlFor="fr-q">Find</label><input id="fr-q" className="inp" value={q} onChange={(e) => { setQ(e.target.value); setM(null); }} onKeyDown={(e) => { if (e.key === "Enter") find(); }} /></div>
        <div className="fl"><label htmlFor="fr-w">Replace with</label><input id="fr-w" className="inp" value={w} onChange={(e) => setW(e.target.value)} /></div>
      </div>
      <div className="btns"><Sw checked={cs} onChange={(v) => { setCs(v); setM(null); }}>Match capitals exactly</Sw><button type="button" className="b-mint b-sm" disabled={q.trim().length < 2} onClick={find}><i className="ti ti-search" />Find</button></div>
      {err && <div className="err">{err}</div>}
      {m && (m.length ? (<>
        <div className="hint">{total} match{total === 1 ? "" : "es"} in {m.length} place{m.length === 1 ? "" : "s"}. Untick any you want to leave alone.</div>
        <ul className="ops-list">{m.map((x) => (
          <li key={key(x)}>
            <input type="checkbox" checked={pick.has(key(x))} onChange={(e) => { const n = new Set(pick); if (e.target.checked) n.add(key(x)); else n.delete(key(x)); setPick(n); }} aria-label={`Change ${x.fieldName} of ${x.title}`} />
            <div className="grow"><b>{x.section}: {x.title}</b><small>{x.fieldName}{x.count > 1 ? ` (${x.count} times)` : ""}: …{x.before}<mark>{x.hit}</mark>{x.after}…</small></div>
          </li>
        ))}</ul>
        <div className="btns"><Sure label={`Replace in ${pick.size} place${pick.size === 1 ? "" : "s"}`} yes="Yes, replace them" icon="replace" danger={false} disabled={!pick.size || !!busy} onYes={async () => { if (await run("rep", () => replaceText(q, w, cs, m.filter((x) => pick.has(key(x))).map((x) => ({ id: x.id, field: x.field }))))) setM(null); }} /></div>
      </>) : <div className="hint">Not found anywhere.</div>)}
      <Msg />
    </Card>
  );
}

function Links() {
  const [r, setR] = useState<{ checked: number; found: number; broken: LinkReport[]; blocked: LinkReport[] } | null>(null), [busy, setBusy] = useState(false);
  return (
    <Card title="Link checker" icon="link">
      <div className="hint">Finds links in your entries, buttons, Connect links and footer that no longer work, so visitors never land on a dead page.</div>
      <div className="btns"><button type="button" className="b-mint b-sm" disabled={busy} onClick={async () => { setBusy(true); setR(await checkLinks().catch(() => null)); setBusy(false); }}><i className={`ti ti-${busy ? "loader-2 spin" : "link"}`} />{busy ? "Checking… (up to a minute)" : "Check all links"}</button></div>
      {r && (<>
        <div className="hint">Checked {r.checked} of {r.found} links.</div>
        {r.broken.length ? (<>
          <div className="err"><b>{r.broken.length} don&apos;t work:</b></div>
          <ul className="ops-list">{r.broken.map((x) => <li key={x.url}><i className="ti ti-link-off ops-li bad" aria-hidden /><div className="grow"><b><a href={x.url} target="_blank" rel="noreferrer">{x.url}</a></b><small>{x.where} · {x.status}</small></div></li>)}</ul>
        </>) : <div className="ops-ok">✓ Every link works.</div>}
        {r.blocked.length > 0 && <div className="hint">{r.blocked.length} more (like Facebook or LinkedIn) don&apos;t let checkers in, but work for people: {r.blocked.slice(0, 6).map((x) => x.url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]).join(", ")}{r.blocked.length > 6 ? "…" : ""}</div>}
      </>)}
    </Card>
  );
}

function Unused() {
  const { busy, run, Msg } = useAct();
  const [r, setR] = useState<{ list: Upload[]; total: number } | null>(null), [err, setErr] = useState(""), [looking, setLooking] = useState(false);
  const [pick, setPick] = useState<Set<string>>(new Set());
  const look = async () => { setErr(""); setLooking(true); const x = await unusedUploads().catch(() => null); setLooking(false); if (!x || !x.ok) { setErr(x && !x.ok ? x.error : "That didn't work."); return; } setR(x); setPick(new Set(x.list.map((u) => u.url))); };
  const size = r?.list.filter((u) => pick.has(u.url)).reduce((a, u) => a + u.size, 0) ?? 0;
  return (
    <Card title="Unused uploads" icon="photo-off">
      <div className="hint">Pictures and files that no entry, section, hero or setting uses any more. Deleting them frees storage. Old backups don&apos;t hold pictures, so a picture deleted here won&apos;t come back with a backup.</div>
      <div className="btns"><button type="button" className="b-mint b-sm" disabled={looking} onClick={look}><i className={`ti ti-${looking ? "loader-2 spin" : "search"}`} />{looking ? "Looking…" : "Find unused uploads"}</button></div>
      {err && <div className="err">{err}</div>}
      {r && (r.list.length ? (<>
        <div className="hint">{r.list.length} of {r.total} uploads aren&apos;t used anywhere.</div>
        <ul className="ops-list ops-thumbs">{r.list.map((u) => (
          <li key={u.url}>
            <input type="checkbox" checked={pick.has(u.url)} onChange={(e) => { const n = new Set(pick); if (e.target.checked) n.add(u.url); else n.delete(u.url); setPick(n); }} aria-label="Delete this file" />
            <a href={u.url} target="_blank" rel="noreferrer" className="ops-thumb"><img src={u.url} alt="" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} /></a>
            <div className="grow"><b>{decodeURIComponent(u.url.split("/").pop() ?? "file").slice(0, 60)}</b><small>{kb(u.size)} · uploaded <When at={u.at} /></small></div>
          </li>
        ))}</ul>
        <div className="btns"><Sure label={`Delete ${pick.size} (${kb(size)})`} yes="Yes, delete them for good" icon="trash-x" disabled={!pick.size || !!busy} onYes={async () => { if (await run("del", () => deleteUploads([...pick]))) setR(null); }} /></div>
      </>) : <div className="ops-ok">✓ Every upload is in use.</div>)}
      <Msg />
    </Card>
  );
}

function ShortLinks({ site }: { site: string }) {
  const { ops, set } = useOps();
  const [slug, setSlug] = useState(""), [url, setUrl] = useState(""), [err, setErr] = useState("");
  const add = () => {
    const sl = slug.trim().toLowerCase().replace(/^\/+/, "");
    if (!SLUG_RE.test(sl)) { setErr("Use small letters, numbers and dashes, like cv or my-shop."); return; }
    if (RESERVED_SLUGS.includes(sl)) { setErr(`“${sl}” is used by the site itself. Pick another.`); return; }
    if (ops.links.some((l) => l.slug === sl)) { setErr("That one exists already."); return; }
    let u = url.trim();
    if (u && !/^(https?:\/\/|mailto:|tel:|\/)/i.test(u)) u = `https://${u}`;
    if (!/^(https?:\/\/|mailto:|tel:|\/)[^\s"'<>]+$/i.test(u)) { setErr("Paste the address it should open."); return; }
    setErr(""); set("links", [...ops.links, { slug: sl, url: u }]); setSlug(""); setUrl("");
  };
  return (
    <Card title="Short links" icon="link-plus" k="links" state={<span className="ops-count">{ops.links.length}</span>}>
      <div className="hint">An easy address that opens any page, file or profile. Handy on a business card or in a bio: <b>{site}/cv</b> could open your résumé.</div>
      <div className="btns ops-short"><span className="ops-pre">{site}/</span><input className="inp" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="cv" aria-label="Short name" style={{ width: 120 }} /><span>opens</span><input className="inp" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… or /s/made" aria-label="Address it opens" style={{ flex: "1 1 220px" }} /><button type="button" className="b-mint b-sm" disabled={!slug || !url} onClick={add}>Add</button></div>
      {err && <div className="err">{err}</div>}
      {ops.links.length > 0 && (
        <ul className="ops-list">{ops.links.map((l) => (
          <li key={l.slug}>
            <i className="ti ti-link ops-li" aria-hidden />
            <div className="grow"><b><a href={`/${l.slug}`} target="_blank" rel="noreferrer">{site}/{l.slug}</a></b><small>opens {l.url}</small></div>
            <button type="button" className="b-out b-sm" onClick={() => navigator.clipboard?.writeText(`https://${site}/${l.slug}`).catch(() => {})}><i className="ti ti-copy" />Copy</button>
            <Sure label="" yes="Remove" icon="trash" onYes={() => set("links", ops.links.filter((x) => x.slug !== l.slug))} />
          </li>
        ))}</ul>
      )}
    </Card>
  );
}

function Qr({ site }: { site: string }) {
  const [url, setUrl] = useState(`https://${site}`), [dark, setDark] = useState("#0b1a12"), [light, setLight] = useState("#ffffff"), [svg, setSvg] = useState("");
  useEffect(() => {
    let off = false;
    import("qrcode-generator").then((m) => {
      if (off || !url.trim()) { setSvg(""); return; }
      const q = (m.default as unknown as (t: number, l: string) => { addData: (s: string) => void; make: () => void; createSvgTag: (o: object) => string })(0, "M");
      q.addData(url.trim()); q.make();
      setSvg(q.createSvgTag({ cellSize: 8, margin: 3, scalable: true }).replace(/fill="black"/g, `fill="${dark}"`).replace(/fill="white"/g, `fill="${light}"`).replace(/<rect([^>]*?)fill="#ffffff"/, `<rect$1fill="${light}"`));
    }).catch(() => setSvg(""));
    return () => { off = true; };
  }, [url, dark, light]);
  const name = `qr-${url.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}`;
  const savePng = () => {
    const img = new Image();
    img.onload = () => { const c = document.createElement("canvas"); c.width = c.height = 1200; const g = c.getContext("2d")!; g.fillStyle = light; g.fillRect(0, 0, 1200, 1200); g.drawImage(img, 0, 0, 1200, 1200); c.toBlob((b) => { if (!b) return; const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `${name}.png`; a.click(); }); };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace("<svg", '<svg width="1200" height="1200"'))}`;
  };
  const saveSvg = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })); a.download = `${name}.svg`; a.click(); };
  return (
    <Card title="QR code maker" icon="qrcode">
      <div className="hint">A code phones can scan to open your site or any page, for business cards, posters and stickers.</div>
      <div className="ops-qrmaker">
        <div className="ops-qr big" style={{ background: light }} dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="f">
          <div className="fl"><label htmlFor="qr-url">What it opens</label><input id="qr-url" className="inp" value={url} onChange={(e) => setUrl(e.target.value)} /></div>
          <div className="btns"><label className="ops-color">Dots <input type="color" value={dark} onChange={(e) => setDark(e.target.value)} /></label><label className="ops-color">Background <input type="color" value={light} onChange={(e) => setLight(e.target.value)} /></label></div>
          <div className="hint">Keep the dots much darker than the background, or some phones can&apos;t read it.</div>
          <div className="btns"><button type="button" className="b-mint b-sm" disabled={!svg} onClick={savePng}><i className="ti ti-download" />Download picture (PNG)</button><button type="button" className="b-out b-sm" disabled={!svg} onClick={saveSvg}>For printing (SVG)</button></div>
        </div>
      </div>
    </Card>
  );
}

function Sheets() {
  return (
    <Card title="Spreadsheet export" icon="table-export">
      <div className="hint">A file that opens in Excel or Google Sheets, with Bangla and emoji intact.</div>
      <div className="btns">
        <a className="b-out b-sm" href="/api/export-csv?what=entries"><i className="ti ti-file-spreadsheet" />All entries</a>
        <a className="b-out b-sm" href="/api/export-csv?what=messages"><i className="ti ti-file-spreadsheet" />Chat messages</a>
        <a className="b-out b-sm" href="/api/export-csv?what=comments"><i className="ti ti-file-spreadsheet" />Comments</a>
      </div>
    </Card>
  );
}

function CopySection({ sections }: { sections: Sec[] }) {
  const { busy, run, Msg } = useAct();
  const [id, setId] = useState(sections[0]?.id ?? 0);
  return (
    <Card title="Copy a section" icon="copy">
      <div className="hint">A copy of a section with all its entries, as a starting point for a new one. It starts hidden.</div>
      <div className="btns"><select className="inp" value={id} onChange={(e) => setId(Number(e.target.value))} aria-label="Section to copy" style={{ maxWidth: 280 }}>{sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select><button type="button" className="b-mint b-sm" disabled={!id || !!busy} onClick={() => run("copy", () => copySection(id))}><i className="ti ti-copy" />Make a copy</button></div>
      <Msg />
    </Card>
  );
}

function Bulk({ sections, entries }: { sections: Sec[]; entries: Entry[] }) {
  const { busy, run, Msg } = useAct();
  const [pick, setPick] = useState<Set<number>>(new Set()), [to, setTo] = useState(sections[0]?.id ?? 0), [filter, setFilter] = useState("");
  const shown = useMemo(() => entries.filter((e) => !filter || e.title.toLowerCase().includes(filter.toLowerCase())), [entries, filter]);
  const toggle = (id: number, on: boolean) => { const n = new Set(pick); if (on) n.add(id); else n.delete(id); setPick(n); };
  const go = async (op: "hide" | "show" | "move" | "delete") => { if (await run(op, () => bulkEntries([...pick], op, to))) setPick(new Set()); };
  return (
    <Card title="Many entries at once" icon="checkbox" state={<span className="ops-count">{pick.size} ticked</span>}>
      <div className="hint">Tick entries, then hide, show, move or delete them together.</div>
      <input className="inp" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by title" aria-label="Filter entries by title" />
      <div className="ops-bulk">{sections.map((s) => {
        const list = shown.filter((e) => e.section === s.id);
        if (!list.length) return null;
        const all = list.every((e) => pick.has(e.id));
        return (
          <div key={s.id} className="ops-bulk-sec">
            <label className="ops-bulk-h"><input type="checkbox" checked={all} onChange={(e) => { const n = new Set(pick); list.forEach((x) => (e.target.checked ? n.add(x.id) : n.delete(x.id))); setPick(n); }} /><b>{s.title}</b><small>{list.length}</small></label>
            {list.map((e) => <label key={e.id} className={`ops-bulk-i${e.visible ? "" : " hid"}`}><input type="checkbox" checked={pick.has(e.id)} onChange={(ev) => toggle(e.id, ev.target.checked)} />{e.title || "Untitled"}{!e.visible && <small>hidden</small>}</label>)}
          </div>
        );
      })}</div>
      <div className="btns">
        <button type="button" className="b-out b-sm" disabled={!pick.size || !!busy} onClick={() => go("hide")}><i className="ti ti-eye-off" />Hide</button>
        <button type="button" className="b-out b-sm" disabled={!pick.size || !!busy} onClick={() => go("show")}><i className="ti ti-eye" />Show</button>
        <select className="inp" value={to} onChange={(e) => setTo(Number(e.target.value))} aria-label="Move to section" style={{ maxWidth: 220 }}>{sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select>
        <button type="button" className="b-out b-sm" disabled={!pick.size || !!busy} onClick={() => go("move")}><i className="ti ti-arrows-exchange" />Move there</button>
        <Sure label="Delete" yes={`Yes, delete ${pick.size}`} icon="trash" disabled={!pick.size || !!busy} onYes={() => go("delete")} />
      </div>
      <Msg />
    </Card>
  );
}

function Danger() {
  const { busy, run, Msg } = useAct();
  const [typed, setTyped] = useState<Record<string, string>>({});
  const DZ: [string, string, string][] = [
    ["reactions", "Clear every reaction", "All emoji reactions on every entry go back to zero."],
    ["votes", "Clear every poll vote", "Every poll starts again from no votes."],
    ["comments", "Delete every comment", "Every comment on every entry, and your replies to them."],
    ["messages", "Delete every chat and message", "The whole Inbox, and the notes on your Wall."],
    ["stats", "Reset visitor numbers", "Visitor counts, section views and people here now start from zero. These aren't in backups."],
  ];
  return (
    <Card title="Danger zone" icon="alert-triangle" danger>
      <div className="hint">Each needs the word DELETE typed first. A backup is made just before (except for visitor numbers).</div>
      <ul className="ops-list">{DZ.map(([k, t, desc]) => (
        <li key={k}>
          <div className="grow"><b>{t}</b><small>{desc}</small></div>
          <div className="btns"><input className="inp" value={typed[k] ?? ""} onChange={(e) => setTyped({ ...typed, [k]: e.target.value })} placeholder="Type DELETE" aria-label={`Type DELETE to ${t.toLowerCase()}`} style={{ width: 120 }} /><button type="button" className="b-yes b-sm" disabled={(typed[k] ?? "").trim().toUpperCase() !== "DELETE" || !!busy} onClick={async () => { if (await run(k, () => dangerZone(k, typed[k] ?? ""))) setTyped({ ...typed, [k]: "" }); }}>{t.split(" ")[0]}</button></div>
        </li>
      ))}</ul>
      <Msg />
    </Card>
  );
}
