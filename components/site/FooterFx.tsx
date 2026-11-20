"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FooterDesign } from "@/lib/chrome";
import { readVisit, type Visit } from "./visit";

export type FootSection = { slug: string; label: string; emoji: string; code: string; href: string };
export type FootLink = { label: string; url: string; icon: string; logo: string; color: string; ink: string };
export type FootData = { sections: FootSection[]; links: FootLink[]; owner: string; full: string; connectHref: string; design: FooterDesign; preview?: boolean };

const dhakaTime = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" });
const dhakaDate = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" });
const dateOf = (iso: string) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
const mmss = (s: number) => `${(s / 60) | 0}:${String(s % 60).padStart(2, "0")}`;
const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("lite");

/** The visitor's visit, kept current as they browse; the site's newest entry per section and the counts, asked once. */
function useVisit(preview?: boolean) {
  const [v, setV] = useState<Visit | null>(null);
  const [srv, setSrv] = useState<{ newest: Record<string, string>; counts: Record<string, number> }>({ newest: {}, counts: {} });
  const [now, setNow] = useState(0);
  // the clock and the site's address only once in the browser, so the first draw matches the server's
  const [clock, setClock] = useState({ date: "", time: "", site: "" });
  useEffect(() => {
    const read = () => setV(readVisit());
    read(); setNow(Date.now());
    const tick = () => setClock({ date: dhakaDate(), time: dhakaTime(), site: location.origin });
    tick();
    const ck = setInterval(tick, 30000);
    addEventListener("lc-visit", read);
    const iv = setInterval(() => setNow(Date.now()), 1000);
    if (!preview) fetch("/api/menu").then((r) => r.json()).then((d) => setSrv({ newest: d.newest ?? {}, counts: d.counts ?? {} })).catch(() => {});
    return () => { removeEventListener("lc-visit", read); clearInterval(iv); clearInterval(ck); };
  }, [preview]);
  return { v, srv, now, clock };
}

type Ln = { t: "title" | "c" | "sub" | "ln" | "hr" | "big" | "bar" | "btn"; a?: string; b?: string; href?: string };
/**
 * The receipt's lines, the same for the page, the full view and the PDF. Everything comes from this visitor's own visit (visit.ts) and the
 * owner's words (settings.footer): which sections they saw (each a line that takes them there), what's left to see, what's new since their
 * last visit, the entries they opened, how long they've stayed and what they did, then the total and the thanks.
 */
function receiptLines(d: FootData, v: Visit | null, now: number, srv: { newest: Record<string, string>; counts: Record<string, number> }, map: boolean, clock: { date: string; time: string }): Ln[] {
  const f = d.design, seen = new Set(v?.seen ?? []);
  const secs = d.sections;
  const L: Ln[] = [{ t: "title", a: f.shop || d.owner.toUpperCase() }, { t: "c", a: clock.date ? `Dhaka, Bangladesh · ${clock.date} · ${clock.time}` : "Dhaka, Bangladesh" }];
  if (v) L.push({ t: "c", a: v.visits > 1 ? `VISIT #${v.visits} · FRIEND SINCE ${dateOf(v.first).toUpperCase()}` : "FIRST VISIT · WELCOME!" });
  L.push({ t: "hr" }, { t: "sub", a: map ? "QTY  YOUR MAP OF THIS SITE  SEEN" : "SEEN THIS VISIT" });
  for (const s of secs) {
    const n = srv.counts[s.slug];
    if (map) L.push({ t: "ln", a: `${String(n ?? "·").padStart(2, " ")} ${s.emoji} ${s.label.toUpperCase()}`, b: seen.has(s.slug) ? "✓" : "·", href: s.href });
    else if (seen.has(s.slug)) L.push({ t: "ln", a: `${s.emoji} ${s.label.toUpperCase()}`, b: "✓", href: s.href });
  }
  const left = secs.filter((s) => !seen.has(s.slug));
  if (!map && !seen.size) L.push({ t: "c", a: "Nothing yet: scroll up and look around!" });
  if (!map && left.length) { L.push({ t: "sub", a: "STILL TO SEE" }); for (const s of left) L.push({ t: "ln", a: `${s.emoji} ${s.label.toUpperCase()}`, b: "→", href: s.href }); }
  const fresh = v?.prev ? secs.filter((s) => (srv.newest[s.slug] ?? "") > v.prev) : [];
  if (fresh.length) { L.push({ t: "sub", a: "NEW SINCE YOUR LAST VISIT" }); for (const s of fresh) L.push({ t: "ln", a: `${s.emoji} ${s.label.toUpperCase()}`, b: "NEW", href: s.href }); }
  if (v?.opened.length) { L.push({ t: "sub", a: "YOU OPENED" }); for (const o of v.opened.slice(-6)) L.push({ t: "ln", a: `📄 ${o.t}`, b: "↗", href: o.h }); }
  L.push({ t: "hr" });
  const secsHere = v ? Math.max(0, Math.round((now - new Date(v.start).getTime()) / 1000)) : 0;
  L.push({ t: "ln", a: "TIME HERE", b: mmss(secsHere) });
  if (v) {
    L.push({ t: "ln", a: "SECTIONS SEEN", b: `${seen.size}/${secs.length}` }, { t: "ln", a: "REACTIONS GIVEN", b: String(v.reactions) });
    if (v.votes) L.push({ t: "ln", a: "POLLS VOTED", b: String(v.votes) });
    if (v.messages) L.push({ t: "ln", a: "MESSAGES SENT", b: String(v.messages) });
    if (v.comments) L.push({ t: "ln", a: "COMMENTS", b: String(v.comments) });
    if (v.hearts) L.push({ t: "ln", a: "WALL HEARTS", b: String(v.hearts) });
  }
  if (map) {
    L.push({ t: "hr" }, { t: "sub", a: "WAYS TO PAY (REACH ME)" });
    for (const l of d.links) L.push({ t: "ln", a: `💳 ${l.label.toUpperCase()}`, b: "↗", href: l.url });
    L.push({ t: "ln", a: "💬 SAY HELLO", b: "↗", href: d.connectHref });
  }
  L.push({ t: "hr" }, { t: "big", a: "TOTAL", b: map ? "PRICELESS" : "1 HAPPY VISITOR" }, { t: "c", a: f.thanks }, { t: "bar" });
  return L;
}

function Line({ l, edit }: { l: Ln; edit?: boolean }) {
  if (l.t === "title") return <h5 className="rc-title">{l.a}</h5>;
  if (l.t === "c") return <div className="rc-c">{l.a}</div>;
  if (l.t === "sub") return <div className="rc-sub">{l.a}</div>;
  if (l.t === "hr") return <hr />;
  if (l.t === "bar") return <div className="rc-bar" aria-hidden />;
  const inner = <><span>{l.a}</span><span className="rc-dots" /><span>{l.b}</span></>;
  return l.href && !edit ? <a className={`rc-ln${l.t === "big" ? " big" : ""}`} href={l.href}>{inner}</a> : <div className={`rc-ln${l.t === "big" ? " big" : ""}`}>{inner}</div>;
}

/** A real QR code (qrcode-generator, loaded only for this), as an SVG. */
function QR({ text }: { text: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let off = false;
    import("qrcode-generator").then((m) => { const q = (m.default as unknown as QRFactory)(0, "M"); q.addData(text); q.make(); if (!off) setSvg(q.createSvgTag({ cellSize: 3, margin: 0, scalable: true })); }).catch(() => {});
    return () => { off = true; };
  }, [text]);
  return <div className="rc-qr" aria-label="QR code that opens this site" dangerouslySetInnerHTML={{ __html: svg }} />;
}
type QRCode = { addData(s: string): void; make(): void; getModuleCount(): number; isDark(r: number, c: number): boolean; createSvgTag(o: { cellSize: number; margin: number; scalable: boolean }): string };
type QRFactory = (type: number, level: string) => QRCode;

/** The receipt as a PDF, 80mm wide like a real till roll, in Courier; letters a PDF's built-in font can't draw are left out. */
async function cutPdf(lines: Ln[], qrText: string, name: string) {
  const { jsPDF } = await import("jspdf");
  const clean = (s = "") => s.normalize("NFKD").replace(/[^\x20-\x7E]/g, "").replace(/\s+/g, " ").trim();
  const W = 80, L = 6, R = W - 6, lh = 4.6;
  const h = 16 + lines.length * lh + (qrText ? 42 : 0) + 18;
  const doc = new jsPDF({ unit: "mm", format: [W, Math.max(110, h)] });
  doc.setFont("courier", "normal"); doc.setFontSize(8.6);
  let y = 10;
  for (const l of lines) {
    if (l.t === "title") { doc.setFont("courier", "bold"); doc.setFontSize(11); doc.text(clean(l.a), W / 2, y, { align: "center" }); doc.setFont("courier", "normal"); doc.setFontSize(8.6); y += lh + 1; continue; }
    if (l.t === "c" || l.t === "sub") { doc.setFontSize(l.t === "sub" ? 7.4 : 8.6); doc.text(clean(l.a), l.t === "c" ? W / 2 : L, y, { align: l.t === "c" ? "center" : "left" }); doc.setFontSize(8.6); y += lh; continue; }
    if (l.t === "hr") { doc.setLineDashPattern([0.8, 0.8], 0); doc.line(L, y - 2, R, y - 2); doc.setLineDashPattern([], 0); y += 2.2; continue; }
    if (l.t === "bar") { let x = L + 4; for (let i = 0; x < R - 4; i++) { const w = [0.4, 0.8, 0.3, 1.1, 0.5][i % 5]; doc.rect(x, y - 2, w, 10, "F"); x += w + [0.5, 0.9, 0.4, 0.7][i % 4]; } y += 12; continue; }
    if (l.t === "big") doc.setFont("courier", "bold");
    const a = clean(l.a), b = clean(l.b);
    doc.text(a, L, y); doc.text(b, R, y, { align: "right" });
    const gap = R - L - doc.getTextWidth(a) - doc.getTextWidth(b) - 2;
    if (gap > 2 && l.t === "ln") doc.text(".".repeat(Math.floor(gap / doc.getTextWidth("."))), L + doc.getTextWidth(a) + 1, y);
    doc.setFont("courier", "normal");
    y += lh;
  }
  if (qrText) {
    try {
      const m = await import("qrcode-generator");
      const q = (m.default as unknown as QRFactory)(0, "M"); q.addData(qrText); q.make();
      const n = q.getModuleCount(), size = 30, cell = size / n, x0 = W / 2 - size / 2;
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) doc.rect(x0 + c * cell, y + r * cell, cell, cell, "F");
      y += size + 4; doc.setFontSize(7.4); doc.text("SCAN TO OPEN THIS SITE", W / 2, y, { align: "center" });
    } catch { /* no QR in the PDF */ }
  }
  doc.save(`receipt-${clean(name).toLowerCase().replace(/[^a-z0-9]+/g, "-") || "visit"}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

type Gsap = typeof import("gsap").gsap;
let gsapP: Promise<Gsap> | null = null;
/** GSAP, the animation library the receipt's printing and cutting run on; downloaded only when a receipt is on the page. */
const loadGsap = () => (gsapP ??= import("gsap").then((m) => m.gsap));

/**
 * The footer's receipts (settings.footer.look): the visit receipt and the receipt that is also the site's map and your contact card.
 * When the footer comes into view the printer prints it (GSAP): the head shakes, the light blinks, the paper feeds out line by line, and
 * a receipt longer than the window winds onto the roll at the bottom, which turns and grows fatter. Afterwards the window scrolls, and the
 * roll turns with it. Print again prints a fresh one. Cut runs the scissors along the paper at the printer, the receipt drops away, then the
 * PDF downloads and a new one prints. View shows it whole in a box in the middle of the screen. Lines lead to their section or entry.
 * Only JavaScript hides the paper before it prints, so without it (or with reduced motion, or html.lite) the receipt is simply there.
 */
export function ReceiptFooter({ d, map }: { d: FootData; map: boolean }) {
  const { v, srv, now, clock } = useVisit(d.preview);
  const [run, setRun] = useState(0);
  const [busy, setBusy] = useState(false);
  const [printing, setPrinting] = useState(false);
  const dlg = useRef<HTMLDialogElement>(null);
  const box = useRef<HTMLDivElement>(null), head = useRef<HTMLDivElement>(null), win = useRef<HTMLDivElement>(null), scroller = useRef<HTMLDivElement>(null);
  const feed = useRef<HTMLDivElement>(null), roll = useRef<HTMLElement>(null), turn = useRef<HTMLElement>(null), scis = useRef<HTMLSpanElement>(null), line = useRef<HTMLElement>(null);
  const viewPaper = useRef<HTMLDivElement>(null), viewScis = useRef<HTMLSpanElement>(null), viewLine = useRef<HTMLElement>(null);
  const tl = useRef<{ kill(): unknown } | null>(null);
  const seenOnce = useRef(false);
  const lines = useMemo(() => receiptLines(d, v, now, srv, map, clock), [d, v, now, srv, map, clock]);
  const site = clock.site;
  const seen = new Set(v?.seen ?? []);
  const still = () => typeof window === "undefined" || calm();

  /** Prints the receipt: the paper feeds out of the printer in line-sized steps; what doesn't fit winds onto the roll. */
  const print = async () => {
    const el = feed.current, w = win.current, sc = scroller.current;
    if (!el || !w || !sc) return;
    tl.current?.kill();
    if (still()) { el.style.transform = ""; return; }
    const gsap = await loadGsap().catch(() => null);
    if (!gsap) { el.style.transform = ""; return; }
    sc.scrollTop = 0;
    const H = el.offsetHeight, W = w.clientHeight, rest = Math.max(0, H - W);
    const dur = Math.min(4.6, Math.max(1.6, H / 260)), steps = Math.max(8, Math.round(H / 21));
    setPrinting(true);
    const t = gsap.timeline({ onComplete: () => { setPrinting(false); gsap.set(el, { clearProps: "transform,opacity" }); } });
    t.set(el, { y: -H, rotation: 0, opacity: 1 }).set(line.current, { scaleX: 0, opacity: 0 }).set(scis.current, { opacity: 0 })
      .set(roll.current, { scaleY: 1 })
      .to(head.current, { x: 1.2, duration: .045, repeat: Math.round(dur / .045), yoyo: true, ease: "none" }, 0)
      .to(el, { y: 0, duration: dur, ease: `steps(${steps})` }, .15)
      .to(head.current, { x: 0, duration: .1 });
    if (rest > 0 && roll.current && turn.current) {
      const start = .15 + dur * (W / H), spin = dur - dur * (W / H);
      t.fromTo(turn.current, { y: 0 }, { y: -24, duration: .35, repeat: Math.max(1, Math.round(spin / .35)), ease: "none" }, start)
        .to(roll.current, { scaleY: 1 + Math.min(.55, rest / 1400), duration: spin, ease: "none" }, start);
    }
    tl.current = t;
  };

  // print when the footer comes into view (once per page), and again on Print again
  useEffect(() => {
    const el = feed.current, b = box.current;
    if (!el || !b || still()) return;
    if (!seenOnce.current) {
      el.style.transform = "translateY(-110%)"; // waiting to be printed
      const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); seenOnce.current = true; print(); } }, { threshold: .3 });
      io.observe(b);
      return () => io.disconnect();
    }
    print();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);
  useEffect(() => () => { tl.current?.kill(); }, []);

  // the roll turns as the visitor scrolls the receipt in its window
  useEffect(() => {
    const sc = scroller.current, tn = turn.current;
    if (!sc || !tn) return;
    let raf = 0;
    const on = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; tn.style.transform = `translateY(${-(sc.scrollTop % 24)}px)`; }); };
    sc.addEventListener("scroll", on, { passive: true });
    return () => { sc.removeEventListener("scroll", on); cancelAnimationFrame(raf); };
  }, []);

  /** Cut: the scissors snip along the paper at the printer, the receipt drops away, then the PDF downloads and a fresh one prints. */
  const cut = async (inView: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      const paperEl = inView ? viewPaper.current : feed.current, s = inView ? viewScis.current : scis.current, ln = inView ? viewLine.current : line.current;
      const gsap = still() ? null : await loadGsap().catch(() => null);
      if (gsap && paperEl && s && ln) {
        tl.current?.kill();
        if (!inView && scroller.current) scroller.current.scrollTop = 0;
        const width = s.parentElement?.clientWidth ?? 300;
        const drop = inView ? innerHeight : (win.current?.clientHeight ?? 400) + 60;
        await new Promise<void>((done) => {
          const t = gsap.timeline({ onComplete: done });
          t.set(s, { x: -30, opacity: 1, rotation: 0 }).set(ln, { scaleX: 0, opacity: 1 })
            .to(s, { x: width + 6, duration: 1, ease: "power1.inOut" }, 0)
            .to(s, { rotation: -22, duration: .09, repeat: 11, yoyo: true, ease: "sine.inOut" }, 0)
            .to(ln, { scaleX: 1, duration: 1, ease: "power1.inOut" }, 0)
            .to(s, { opacity: 0, duration: .15 })
            .to(paperEl, { y: `+=${drop}`, rotation: inView ? 6 : 9, opacity: 0, duration: .75, ease: "power2.in" }, ">-0.05")
            .to(ln, { opacity: 0, duration: .2 }, "<");
          tl.current = t;
        });
      }
      await cutPdf(lines, map ? site : "", d.design.shop || d.owner);
      if (inView) { dlg.current?.close(); if (gsap && viewPaper.current) gsap.set(viewPaper.current, { clearProps: "all" }); }
      setRun((r) => r + 1); // a fresh receipt prints
    } finally { setBusy(false); }
  };

  const extras = map ? (
    <>
      <div className="rc-sub">WHERE YOU&apos;VE BEEN</div>
      <div className="rc-grid">{d.sections.map((s) => <a key={s.slug} href={d.preview ? undefined : s.href} className={seen.has(s.slug) ? "seen" : ""} title={s.label}>{s.emoji || "✦"}</a>)}</div>
      {site && <><QR text={site} /><div className="rc-c">SCAN TO OPEN THIS SITE</div></>}
      <a className="rc-coupon" href={d.preview ? undefined : d.connectHref}><b>✂ COUPON</b>{d.design.coupon}<span>Redeem →</span></a>
    </>
  ) : null;
  const paper = (full: boolean) => (
    <div className={`rc-paper${full ? " whole" : ""}`}>
      {lines.slice(0, lines.length - 4).map((l, i) => <Line key={i} l={l} edit={d.preview} />)}
      {extras}
      {lines.slice(lines.length - 4).map((l, i) => <Line key={`e${i}`} l={l} edit={d.preview} />)}
    </div>
  );
  return (
    <div className="rc" ref={box}>
      <div ref={head} className={`rc-printer${printing ? " printing" : ""}`}><span>{map ? "MAP · LINKS · HELLO" : `${d.owner.toUpperCase()} · RECEIPTS`}</span><i className="rc-led" /></div>
      <div className="rc-win" ref={win}>
        <div className={`rc-scroll${printing ? " busy" : ""}`} ref={scroller} data-lenis-prevent>
          <div className="rc-feed" ref={feed}>{paper(false)}</div>
        </div>
        <i className="rc-cut" ref={line} aria-hidden /><span className="rc-scis" ref={scis} aria-hidden>✂</span>
        <i className="rc-roll" ref={roll} aria-hidden><i className="rc-turn" ref={turn} /></i>
      </div>
      <div className="rc-btns">
        <button type="button" onClick={() => dlg.current?.showModal()}>👁 View</button>
        <button type="button" onClick={() => cut(false)} disabled={busy}>✂ {busy ? "Cutting…" : "Cut (PDF)"}</button>
        <button type="button" onClick={() => setRun((r) => r + 1)} disabled={busy}>🖨 Print again</button>
      </div>
      <dialog ref={dlg} className="rc-view" aria-label="Your receipt" onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}>
        <div className="rc-view-in">
          <div className="rc-view-paper">
            <div ref={viewPaper}>{paper(true)}</div>
            <i className="rc-cut" ref={viewLine} aria-hidden /><span className="rc-scis" ref={viewScis} aria-hidden>✂</span>
          </div>
          <div className="rc-btns">
            <button type="button" onClick={() => cut(true)} disabled={busy}>✂ {busy ? "Cutting…" : "Cut (PDF)"}</button>
            <button type="button" onClick={() => dlg.current?.close()}>Close</button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

/** The boarding pass: this visit as a flight from Home to Connect, the sections as stops, the links on the stub. */
export function PassFooter({ d }: { d: FootData }) {
  const { v, now } = useVisit(d.preview);
  const seen = new Set(v?.seen ?? []);
  const n = d.sections.length;
  const far = d.sections.reduce((m, s, i) => (seen.has(s.slug) ? i + 1 : m), 0);
  const [who, setWho] = useState("You");
  useEffect(() => { try { setWho((localStorage.getItem("lc_chat_name") || localStorage.getItem("lc_name") || "You").slice(0, 18)); } catch { /* */ } }, []);
  const t = v ? Math.max(0, Math.round((now - new Date(v.start).getTime()) / 1000)) : 0;
  return (
    <div className="bp">
      <div className="bp-main">
        <div className="bp-band"><span>✈ {d.design.airline}</span><span>BOARDING PASS</span></div>
        <div className="bp-route">
          <div><b>HOM</b><small>HOME · DHAKA</small></div>
          <div className="bp-line"><span className="bp-plane" style={{ transform: `translateX(${n ? (far / n) * 100 : 0}%)` }}>✈️</span></div>
          <div><b>CON</b><small>CONNECT · SAY HELLO</small></div>
        </div>
        <div className="bp-stops">{d.sections.map((s) => <a key={s.slug} href={d.preview ? undefined : s.href} className={seen.has(s.slug) ? "seen" : ""}>{s.emoji} {s.label}</a>)}</div>
        <div className="bp-facts"><span>PASSENGER<b>{who}</b></span><span>SEAT<b>{(v?.visits ?? 1)}A</b></span><span>GATE<b>{d.sections[Math.max(0, far - 1)]?.code || "G1"}</b></span><span>FLIGHT TIME<b>{mmss(t)}</b></span></div>
      </div>
      <div className="bp-stub">
        <span>STUB · KEEP IN TOUCH</span>
        {d.links.map((l) => <a key={l.url} href={d.preview ? undefined : l.url} target="_blank" rel="noopener noreferrer">↗ {l.label}</a>)}
        <a href={d.preview ? undefined : d.connectHref}>💬 Say hello</a>
        <div className="rc-bar" aria-hidden />
      </div>
    </div>
  );
}

/** The treasure map: sections as islands, this visit's trail between the ones seen, X on Connect, the links on the compass. */
export function MapFooter({ d }: { d: FootData }) {
  const { v } = useVisit(d.preview);
  const seen = new Set(v?.seen ?? []);
  const n = d.sections.length;
  const pts = d.sections.map((_, i) => [8 + (n > 1 ? (i / (n - 1)) * 84 : 42), i % 2 ? 34 : 68] as const);
  const trail = d.sections.map((s, i) => [s, pts[i]] as const).filter(([s]) => seen.has(s.slug)).map(([, p], i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");
  const all = pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");
  const L = d.links;
  return (
    <div className="tm">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden><path className="tm-all" d={all} /><path className="tm-trail" d={trail || "M0 0"} /></svg>
      <div className="tm-title">{d.design.mapTitle}<small>where you&apos;ve sailed today · <DhakaClock /> in Dhaka</small></div>
      {d.sections.map((s, i) => (
        <a key={s.slug} className={`tm-isle${i === n - 1 ? " x" : ""}${seen.has(s.slug) ? " seen" : ""}`} href={d.preview ? undefined : s.href} style={{ left: `${pts[i][0]}%`, top: `${pts[i][1]}%` }}>
          <i>{s.emoji || "✦"}</i>{s.label}{seen.has(s.slug) ? " ✓" : ""}
        </a>
      ))}
      <span className="tm-boat" aria-hidden>⛵</span>
      <div className="tm-compass">
        {L[0] && <a className="n" href={d.preview ? undefined : L[0].url}>{L[0].label}</a>}
        <a className="w" href={d.preview ? undefined : d.connectHref}>Say hello</a>
        <i className="c" aria-hidden />
        {L[1] && <a className="e" href={d.preview ? undefined : L[1].url}>{L[1].label}</a>}
        {L[2] && <a className="s" href={d.preview ? undefined : L[2].url}>{L[2].label}</a>}
      </div>
    </div>
  );
}

/** Dhaka at night: a skyline drawn once, whose windows twinkle while it's on screen; each tall building is a section. */
export function Skyline({ sections, preview }: { sections: FootSection[]; preview?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const [tags, setTags] = useState<{ s: FootSection; x: number; y: number }[]>([]);
  useEffect(() => {
    const el = box.current, c = cv.current;
    if (!el || !c) return;
    let iv = 0;
    const draw = () => {
      const W = el.clientWidth, H = el.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
      c.width = W * dpr; c.height = H * dpr;
      const g = c.getContext("2d"); if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
      const base = H - 30, blds: { x: number; w: number; h: number }[] = [];
      for (let x = 0; x < W;) { const w = 34 + rnd() * 52, h = 50 + rnd() * (H * .48); blds.push({ x, w, h }); x += w + 2; }
      const wins = new Map<string, boolean>();
      const paint = () => {
        g.clearRect(0, 0, W, H);
        for (const b of blds) {
          g.fillStyle = "#151129"; g.fillRect(b.x, base - b.h, b.w, b.h);
          for (let wy = base - b.h + 9; wy < base - 7; wy += 13) for (let wx = b.x + 6; wx < b.x + b.w - 8; wx += 11) {
            const k = `${wx}|${wy}`; if (!wins.has(k)) wins.set(k, rnd() < .35);
            g.fillStyle = wins.get(k) ? "#f6d77a" : "#2a2347"; g.fillRect(wx, wy, 5, 7);
          }
        }
      };
      paint();
      const tall = blds.map((b, i) => ({ b, i })).sort((a, z) => z.b.h - a.b.h).slice(0, sections.length).sort((a, z) => a.i - z.i);
      setTags(tall.map(({ b }, j) => ({ s: sections[j], x: b.x + b.w / 2, y: base - b.h - 24 })));
      clearInterval(iv);
      if (!calm()) iv = window.setInterval(() => { if (!el.closest(".ft-on")) return; const ks = [...wins.keys()]; for (let i = 0; i < 6; i++) { const k = ks[(Math.random() * ks.length) | 0]; wins.set(k, !wins.get(k)); } paint(); }, 700);
    };
    draw();
    const ro = new ResizeObserver(draw); ro.observe(el);
    return () => { ro.disconnect(); clearInterval(iv); };
  }, [sections]);
  return (
    <div className="sky-scene" ref={box}>
      <canvas ref={cv} aria-hidden />
      {tags.map((t) => t.s && <a key={t.s.slug} className="sky-tag" href={preview ? undefined : t.s.href} style={{ left: t.x, top: t.y }}>{t.s.emoji} {t.s.label}</a>)}
    </div>
  );
}

/** The time in Dhaka, kept current. */
export function DhakaClock() {
  const [t, setT] = useState("");
  useEffect(() => { const set = () => setT(dhakaTime()); set(); const iv = setInterval(set, 30000); return () => clearInterval(iv); }, []);
  return <span className="dk-time">{t || "--:--"}</span>;
}

/** The owner's name; five quick taps on it set off confetti. */
export function EggName({ children, on }: { children: React.ReactNode; on: boolean }) {
  const taps = useRef<number[]>([]);
  const tap = (e: React.MouseEvent) => {
    if (!on) return;
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 2500), now];
    if (taps.current.length < 5) return;
    taps.current = [];
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    import("canvas-confetti").then((m) => m.default({ particleCount: 90, spread: 80, origin: { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight }, disableForReducedMotion: true })).catch(() => {});
  };
  return <span className="egg" onClick={tap}>{children}</span>;
}

/** Back to the top, gliding with the site's smooth scrolling when it's on. */
export function TopButton() {
  const up = () => {
    const lenis = (window as unknown as { __lenis?: { scrollTo(t: number, o?: object): void } }).__lenis;
    if (lenis) lenis.scrollTo(0, { duration: 1.6 }); else scrollTo({ top: 0, behavior: calm() ? "auto" : "smooth" });
  };
  return <button type="button" className="ft-top" onClick={up}>⬆️ Ride back to the top</button>;
}

/** Marks the footer `.ft-on` while it's on screen, so its loops (credits, twinkling, the boat) only run then. */
export function FooterOn() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const f = ref.current?.closest("footer");
    if (!f) return;
    const io = new IntersectionObserver(([e]) => f.classList.toggle("ft-on", e.isIntersecting));
    io.observe(f);
    return () => io.disconnect();
  }, []);
  return <span ref={ref} hidden />;
}
