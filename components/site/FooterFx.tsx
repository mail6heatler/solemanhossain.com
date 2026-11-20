"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FooterDesign } from "@/lib/chrome";
import { readVisit, visitTimes, type Visit } from "./visit";

export type FootSection = { slug: string; label: string; emoji: string; code: string; href: string };
export type FootLink = { label: string; url: string; icon: string; logo: string; color: string; ink: string };
export type FootData = { sections: FootSection[]; links: FootLink[]; owner: string; full: string; photo?: string; connectHref: string; design: FooterDesign; preview?: boolean };

const dhakaTime = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" });
const dhakaDate = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" });
const dateOf = (iso: string) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
const mmss = (s: number) => `${(s / 60) | 0}:${String(s % 60).padStart(2, "0")}`;
/** Time as the receipt says it: 4:05, or 1H 12M once it's over an hour. */
const dur = (s: number) => (s >= 3600 ? `${(s / 3600) | 0}H ${String(((s % 3600) / 60) | 0).padStart(2, "0")}M` : mmss(s));
/** A small steady number from a text, so a visit's receipt number, fortune and lucky number stay the same all visit. */
const seedOf = (t: string) => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619); return h >>> 0; };
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

const FORTUNES = [
  "A message you send today gets a smile back.", "Something good is loading. Please wait.", "You will scroll back here. Everyone does.",
  "Your next adventure starts with a small yes.", "The best plans are made over tea.", "Someone is proud of you today.",
  "Luck favours the curious. You qualify.", "A new friend is one hello away.", "Today's mood: main character.",
  "Good things come to those who scroll.", "You have excellent taste in websites.", "Drink water. Then do the brave thing.",
  "An old idea will feel new again soon.", "You are someone's favourite notification.", "The view is better from where you're going.",
  "Keep this receipt. Future you will smile.", "Your playlist is about to slap.", "A plan made at midnight will actually work.",
];
/** Ranks by how much of the site this visit saw: [from share seen, name, badge emoji, colour] */
const RANKS: [number, string, string, string][] = [
  [0, "Window shopper", "🪟", "#8a8597"], [.01, "Tourist", "📸", "#1f9e95"], [.34, "Explorer", "🧭", "#3d6fd8"],
  [.67, "Adventurer", "🗺️", "#e07a1f"], [1, "Legend", "🏆", "#d4a017"],
];

type RcData = {
  seed: number; no: string; first: boolean; visits: number; since: string;
  seen: FootSection[]; left: FootSection[]; fresh: FootSection[]; opened: { t: string; h: string }[];
  here: number; all: number; share: number; nSeen: number;
  reactions: number; votes: number; messages: number; comments: number; hearts: number;
  rank: (typeof RANKS)[number]; stamps: number; fortune: string; lucky: number; badges: [string, string][];
};

/**
 * Everything on the receipt, worked out from this visitor's own visit (visit.ts): what they saw, what's left and new, what they opened,
 * their time and what they did; and the fun, steady for the whole visit (seeded by its start): a rank, a loyalty card stamped once per visit,
 * badges they earned, a fortune and a lucky number.
 */
function receiptData(d: FootData, v: Visit | null, now: number, srv: { newest: Record<string, string> }, hour: number): RcData {
  const seenSet = new Set(v?.seen ?? []);
  const secs = d.sections;
  const seen = secs.filter((s) => seenSet.has(s.slug)), left = secs.filter((s) => !seenSet.has(s.slug));
  const fresh = v?.prev ? secs.filter((s) => (srv.newest[s.slug] ?? "") > v.prev) : [];
  const seed = seedOf(v?.start || "visit");
  const tm = v ? visitTimes(v, now) : { here: 0, all: 0 };
  const share = secs.length ? seen.length / secs.length : 0;
  const rank = RANKS.reduce((r, x) => (share >= x[0] ? x : r), RANKS[0]);
  const visits = v?.visits || 1;
  const x = { reactions: v?.reactions ?? 0, votes: v?.votes ?? 0, messages: v?.messages ?? 0, comments: v?.comments ?? 0, hearts: v?.hearts ?? 0 };
  const opened = v?.opened ?? [];
  const badges: [string, string][] = [];
  if (hour >= 22 || (hour >= 0 && hour < 5)) badges.push(["🦉", "Night owl"]);
  else if (hour >= 5 && hour < 9) badges.push(["🌅", "Early bird"]);
  if (share === 1 && secs.length) badges.push(["🗝️", "Saw it all"]);
  else if (share >= .5) badges.push(["🧭", "Halfway hero"]);
  if (opened.length >= 3) badges.push(["📖", "Deep reader"]);
  if (x.reactions >= 3) badges.push(["💖", "Big reactor"]); else if (x.reactions) badges.push(["❤️", "Left a reaction"]);
  if (x.votes) badges.push(["🗳️", "Voter"]);
  if (x.messages) badges.push(["💬", "Said hello"]);
  if (x.comments) badges.push(["✍️", "Commenter"]);
  if (x.hearts) badges.push(["📌", "Wall lover"]);
  if (visits >= 3) badges.push(["🔁", "Regular"]);
  if (share === 1 && tm.here < 180) badges.push(["⚡", "Speedrunner"]);
  if (!badges.length) badges.push(["🌱", "Fresh face"]);
  return {
    seed, no: `${String(visits).padStart(4, "0")}-${(seed % 0xffff).toString(16).toUpperCase().padStart(4, "0")}`, first: visits <= 1, visits,
    since: dateOf(v?.first ?? ""), seen, left, fresh, opened: opened.slice(-6), here: tm.here, all: tm.all, share, nSeen: seen.length, ...x,
    rank, stamps: ((visits - 1) % 10) + 1, fortune: FORTUNES[seed % FORTUNES.length], lucky: (seed % 99) + 1, badges: badges.slice(0, 6),
  };
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

/**
 * The receipt itself: a colour print with the owner's photo, the visit's story, number tiles, a rank medal, explored bar, earned badges,
 * a loyalty card, a fortune cookie, a lucky ticket, a PAID IN SMILES stamp, the owner's signature and a barcode. The PDF is a picture of
 * this very element (html-to-image), so what downloads is exactly what printed.
 */
function ReceiptPaper({ d, r, map, clock, whole }: { d: FootData; r: RcData; map: boolean; clock: { date: string; time: string; site: string }; whole?: boolean }) {
  const f = d.design;
  const go = (href: string) => (d.preview ? undefined : href);
  const Row = ({ a, b, href, cls = "" }: { a: React.ReactNode; b: React.ReactNode; href?: string; cls?: string }) =>
    href ? <a className={`rc-ln ${cls}`} href={go(href)}><span>{a}</span><span className="rc-dots" /><span>{b}</span></a>
      : <div className={`rc-ln ${cls}`}><span>{a}</span><span className="rc-dots" /><span>{b}</span></div>;
  return (
    <div className={`rc-paper${whole ? " whole" : ""}`}>
      <div className="rc-top">
        {d.photo ? <div className="rc-photo" style={{ backgroundImage: `url("${d.photo.replace(/["\\]/g, "")}")` }} role="img" aria-label={d.full} /> : <div className="rc-photo none">🧾</div>}
        <h5 className="rc-title">{f.shop || d.owner.toUpperCase()}</h5>
        <div className="rc-c">Dhaka, Bangladesh{clock.date ? ` · ${clock.date} · ${clock.time}` : ""}</div>
        <div className="rc-meta"><span>RECEIPT Nº {r.no}</span><span>CASHIER: {d.owner.toUpperCase()}</span></div>
        <div className={`rc-visit${r.first ? " first" : ""}`}>{r.first ? "✨ FIRST VISIT · WELCOME! ✨" : `🎉 VISIT #${r.visits} · FRIEND SINCE ${r.since.toUpperCase()}`}</div>
      </div>
      <hr />
      <div className="rc-sub">{map ? "🗺️ YOUR MAP OF THIS SITE" : "🛍️ SEEN THIS VISIT"}</div>
      {(map ? d.sections : r.seen).map((s) => <Row key={s.slug} a={`${s.emoji} ${s.label.toUpperCase()}`} b={r.seen.includes(s) ? <b className="ok">✓</b> : "·"} href={s.href} />)}
      {!map && !r.seen.length && <div className="rc-c rc-soft">Nothing yet: scroll up and look around!</div>}
      {!map && r.left.length > 0 && <><div className="rc-sub">👀 STILL TO SEE</div>{r.left.map((s) => <Row key={s.slug} a={`${s.emoji} ${s.label.toUpperCase()}`} b="→" href={s.href} />)}</>}
      {r.fresh.length > 0 && <><div className="rc-sub">🆕 NEW SINCE YOUR LAST VISIT</div>{r.fresh.map((s) => <Row key={s.slug} a={`${s.emoji} ${s.label.toUpperCase()}`} b={<b className="rc-new">NEW</b>} href={s.href} />)}</>}
      {r.opened.length > 0 && <><div className="rc-sub">📄 YOU OPENED</div>{r.opened.map((o) => <Row key={o.h} a={o.t} b="↗" href={o.h} />)}</>}

      <div className="rc-tiles">
        <div style={{ ["--t" as string]: "#1f9e95" }}><b>{dur(r.here)}</b><span>this visit</span></div>
        <div style={{ ["--t" as string]: "#6b4fd8" }}><b>{r.visits}</b><span>{r.visits === 1 ? "visit" : "visits"}</span></div>
        <div style={{ ["--t" as string]: "#e8457a" }}><b>{r.nSeen}/{d.sections.length}</b><span>sections</span></div>
        <div style={{ ["--t" as string]: "#e07a1f" }}><b>{dur(r.all)}</b><span>all visits</span></div>
        <div style={{ ["--t" as string]: "#3d6fd8" }}><b>{r.opened.length}</b><span>opened</span></div>
        <div style={{ ["--t" as string]: "#d4a017" }}><b>{r.reactions}</b><span>reactions</span></div>
      </div>
      {(r.votes > 0 || r.messages > 0 || r.comments > 0 || r.hearts > 0) && (
        <div className="rc-chips">{r.votes > 0 && <span>🗳️ {r.votes} vote{r.votes > 1 ? "s" : ""}</span>}{r.messages > 0 && <span>💬 {r.messages} message{r.messages > 1 ? "s" : ""}</span>}{r.comments > 0 && <span>✍️ {r.comments} comment{r.comments > 1 ? "s" : ""}</span>}{r.hearts > 0 && <span>📌 {r.hearts} heart{r.hearts > 1 ? "s" : ""}</span>}</div>
      )}

      <div className="rc-rank" style={{ ["--rk" as string]: r.rank[3] }}>
        <div className="rc-medal"><span>{r.rank[2]}</span></div>
        <div><small>YOUR RANK</small><b>{r.rank[1]}</b>
          <div className="rc-bar2"><i style={{ width: `${Math.round(r.share * 100)}%` }} /></div><small>{Math.round(r.share * 100)}% of the site explored</small></div>
      </div>

      <div className="rc-sub">🏅 BADGES EARNED</div>
      <div className="rc-badges">{r.badges.map(([e, t]) => <span key={t}><i>{e}</i>{t}</span>)}</div>

      <div className="rc-loyal">
        <div className="rc-loyal-h"><b>☕ LOYALTY CARD</b><span>{r.stamps}/10</span></div>
        <div className="rc-stamps">{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < r.stamps ? "on" : ""} style={{ rotate: `${((r.seed >> i) % 7) * 6 - 18}deg` }}>{i < r.stamps ? (i === 9 ? "👑" : "★") : i + 1}</i>)}</div>
        <small>{r.stamps === 10 ? "CARD FULL! YOU'RE OFFICIALLY A REGULAR 👑" : "One stamp per visit. Ten makes you a regular."}</small>
      </div>

      <div className="rc-cookie"><span className="rc-cookie-i">🥠</span><div><small>TODAY&apos;S FORTUNE</small><p>&ldquo;{r.fortune}&rdquo;</p></div></div>

      <div className="rc-ticket"><div><small>LUCKY NUMBER</small><b>{r.lucky}</b></div><div><small>TIP</small><b>😊</b><small>a smile, included</small></div></div>

      {map && <>
        <div className="rc-sub">📍 WHERE YOU&apos;VE BEEN</div>
        <div className="rc-grid">{d.sections.map((s) => <a key={s.slug} href={go(s.href)} className={r.seen.includes(s) ? "seen" : ""} title={s.label}>{s.emoji || "✦"}</a>)}</div>
        <div className="rc-sub">💳 WAYS TO PAY (REACH ME)</div>
        {d.links.map((l) => <Row key={l.url} a={l.label.toUpperCase()} b="↗" href={l.url} />)}
        <Row a="💬 SAY HELLO" b="↗" href={d.connectHref} />
        {clock.site && <><QR text={clock.site} /><div className="rc-c rc-soft">SCAN TO OPEN THIS SITE</div></>}
        <a className="rc-coupon" href={go(d.connectHref)}><b>✂ COUPON</b>{f.coupon}<span>Redeem →</span></a>
      </>}

      <hr />
      <div className="rc-total">
        <Row a="TOTAL" b={map ? "PRICELESS" : "1 HAPPY VISITOR"} cls="big" />
        <span className="rc-paid" aria-hidden>PAID IN<br />SMILES</span>
      </div>
      <div className="rc-c rc-thanks">{f.thanks}</div>
      <div className="rc-sign"><span>{d.owner}</span><small>signed with love · keep this: proof you were here ✨</small></div>
      <div className="rc-bar" aria-hidden />
      <div className="rc-c rc-soft">{r.no} · {clock.site.replace(/^https?:\/\//, "")}</div>
    </div>
  );
}

/** The receipt as a PDF: a picture of the printed receipt itself (html-to-image), in colour, 80mm wide like a real till roll. */
async function cutPdf(el: HTMLElement, name: string) {
  const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  const opts = { pixelRatio: 3, backgroundColor: "#fffdf8", cacheBust: true, style: { transform: "none", margin: "0" } };
  let png = "";
  try { png = await toPng(el, opts); } catch { png = await toPng(el, { ...opts, skipFonts: true, imagePlaceholder: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" }); }
  const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = png; });
  const W = 80, H = (W * img.height) / img.width;
  const doc = new jsPDF({ unit: "mm", format: [W, H] });
  doc.addImage(png, "PNG", 0, 0, W, H);
  doc.save(`receipt-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "visit"}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

type Gsap = typeof import("gsap").gsap;
let gsapP: Promise<Gsap> | null = null;
/** GSAP, the animation library the receipt's printing and cutting run on; downloaded only when a receipt is on the page. */
const loadGsap = () => (gsapP ??= import("gsap").then((m) => m.gsap));

const Scissors = () => (
  <svg viewBox="0 0 48 32" aria-hidden>
    <g className="sc-a"><path d="M22 16 46 4c1-.5 2 .8 1 1.6L24 18z" fill="#cfd3dc" stroke="#6b7180" strokeWidth="1" /><circle cx="9" cy="9" r="6.5" fill="none" stroke="#e8457a" strokeWidth="3.4" /><path d="M14 12l9 4" stroke="#e8457a" strokeWidth="3.4" strokeLinecap="round" /></g>
    <g className="sc-b"><path d="M22 16 46 28c1 .5 2-.8 1-1.6L24 14z" fill="#e3e6ec" stroke="#6b7180" strokeWidth="1" /><circle cx="9" cy="23" r="6.5" fill="none" stroke="#e8457a" strokeWidth="3.4" /><path d="M14 20l9-4" stroke="#e8457a" strokeWidth="3.4" strokeLinecap="round" /></g>
    <circle cx="23" cy="16" r="1.8" fill="#4a4f5c" />
  </svg>
);

/**
 * The footer's receipts (settings.footer.look): the visit receipt and the receipt that is also the site's map and your contact card.
 * A handheld POS machine (the owner's word, 2026-11-20): a colour screen, a number pad and three big keys (green Print, yellow View, red
 * Cut). The paper comes out of the slot on top. The first time a visit reaches the footer it prints by itself (GSAP): the machine shakes,
 * the screen says PRINTING, the paper rises out line by line, and a receipt taller than the window winds onto the roll above. On the
 * visit's later pages only the machine shows, ready. Cut: the scissors snip across at the slot (blades opening and closing, paper bits
 * flying), the receipt flutters up and away, the screen says SAVED, and the PDF (a picture of this very receipt) downloads. The number
 * pad types a PIN for fun (the visit's lucky number wins). View shows the receipt whole.
 * Without JavaScript, with reduced motion or on html.lite, the receipt is simply there.
 */
export function ReceiptFooter({ d, map }: { d: FootData; map: boolean }) {
  const { v, srv, now, clock } = useVisit(d.preview);
  const [hour, setHour] = useState(-1);
  useEffect(() => setHour(new Date().getHours()), [clock.time]);
  const [out, setOut] = useState(true); // the paper is out of the printer (true until JS decides, so without it the receipt shows)
  const [busy, setBusy] = useState(false);
  const [lcd, setLcd] = useState("READY ●");
  const [pin, setPin] = useState("");
  const [tick, setTick] = useState("");
  useEffect(() => { setTick(clock.time); }, [clock.time]);
  /** The number pad: a pretend PIN; the visit's lucky number is the jackpot. */
  const press = (k: string) => {
    if (busy) return;
    const p = (k === "*" || k === "#") ? "" : (pin + k).slice(-4);
    setPin(p);
    if (!p) { setLcd(k === "#" ? "THANK YOU ✓" : "CLEARED"); return; }
    if (+p === r.lucky) { setLcd(`🎉 JACKPOT! ${r.lucky} IS LUCKY`); setPin(""); return; }
    if (p.length === 4) { setLcd("WRONG PIN · RIGHT VIBES ✓"); setPin(""); return; }
    setLcd(`PIN ${"•".repeat(p.length)}${"_".repeat(4 - p.length)}`);
  };
  const dlg = useRef<HTMLDialogElement>(null);
  const box = useRef<HTMLDivElement>(null), head = useRef<HTMLDivElement>(null), win = useRef<HTMLDivElement>(null), scroller = useRef<HTMLDivElement>(null);
  const feed = useRef<HTMLDivElement>(null), roll = useRef<HTMLElement>(null), turn = useRef<HTMLElement>(null);
  const scis = useRef<HTMLSpanElement>(null), line = useRef<HTMLElement>(null), bits = useRef<HTMLSpanElement>(null), dl = useRef<HTMLSpanElement>(null);
  const tl = useRef<{ kill(): unknown } | null>(null);
  const r = useMemo(() => receiptData(d, v, now, srv, hour), [d, v, now, srv, hour]);
  const still = () => typeof window === "undefined" || calm();
  const frame = () => new Promise<void>((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok())));

  /** Prints: the paper feeds out of the printer in line-sized steps; what doesn't fit winds onto the roll. Resolves when done. */
  const print = async (fast = false) => {
    setOut(true); await frame();
    const el = feed.current, w = win.current, sc = scroller.current;
    if (!el || !w || !sc) return;
    tl.current?.kill();
    const gsap = still() ? null : await loadGsap().catch(() => null);
    if (!gsap) { el.style.transform = ""; return; }
    sc.scrollTop = sc.scrollHeight; // the receipt's end sits at the slot
    const H = el.offsetHeight, W = w.clientHeight, rest = Math.max(0, H - W);
    const dur = fast ? 1 : Math.min(5, Math.max(1.8, H / 300)), steps = Math.max(8, Math.round(H / 21));
    setBusy(true); setLcd("PRINTING…");
    await new Promise<void>((done) => {
      const t = gsap.timeline({ onComplete: () => { gsap.set(el, { clearProps: "transform,opacity,rotation,x" }); done(); } });
      t.set(el, { y: H, x: 0, rotation: 0, opacity: 1 }).set(line.current, { scaleX: 0, opacity: 0 }).set(scis.current, { opacity: 0 }).set(roll.current, { scaleY: 1 })
        .to(head.current, { rotation: .5, duration: .045, repeat: Math.round(dur / .045), yoyo: true, ease: "none" }, 0)
        .to(el, { y: 0, duration: dur, ease: `steps(${steps})` }, .15)
        .to(head.current, { rotation: 0, duration: .1 });
      if (rest > 0 && roll.current && turn.current) {
        const start = .15 + dur * (W / H), spin = dur - dur * (W / H);
        t.fromTo(turn.current, { y: -24 }, { y: 0, duration: .35, repeat: Math.max(1, Math.round(spin / .35)), ease: "none" }, start)
          .to(roll.current, { scaleY: 1 + Math.min(.55, rest / 1400), duration: spin, ease: "none" }, start);
      }
      tl.current = t;
    });
    setBusy(false); setLcd("DONE ✓ ENJOY");
  };

  // the first time this visit reaches the footer, it prints by itself; later pages of the visit show just the printer, ready
  useEffect(() => {
    const el = feed.current, b = box.current;
    if (!el || !b || still()) return;
    const id = readVisit()?.start ?? "";
    let done = false;
    try { done = !!id && localStorage.getItem("lc_rc_printed") === id; } catch { /* */ }
    if (done) { setOut(false); return; }
    el.style.transform = "translateY(110%)"; // waiting inside the machine to be printed
    const io = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      io.disconnect();
      try { const now = readVisit()?.start ?? id; if (now) localStorage.setItem("lc_rc_printed", now); } catch { /* */ }
      print();
    }, { threshold: .3 });
    io.observe(b);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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

  /** Cut: prints first if nothing is out, takes the picture for the PDF, snips across, the receipt flutters away, then it downloads. */
  const cut = async () => {
    if (busy) return;
    dlg.current?.close();
    if (!out) await print(true);
    setBusy(true); setLcd("CUTTING… ✂");
    const paperEl = feed.current?.querySelector<HTMLElement>(".rc-paper");
    try {
      const pdf = paperEl ? cutPdf(paperEl, d.design.shop || d.owner) : Promise.resolve();
      const gsap = still() ? null : await loadGsap().catch(() => null);
      const el = feed.current, s = scis.current, ln = line.current, w = win.current;
      if (gsap && el && s && ln && w) {
        tl.current?.kill();
        if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
        const width = w.clientWidth, H = w.clientHeight;
        const pieces = Array.from(bits.current?.children ?? []) as HTMLElement[];
        await new Promise<void>((done) => {
          const t = gsap.timeline({ onComplete: done });
          t.set(s, { x: -44, opacity: 1, rotation: 0 }).set(ln, { scaleX: 0, opacity: 1 }).set(pieces, { x: 0, y: 0, opacity: 0, rotation: 0 })
            .to(head.current, { y: 3, duration: .12, yoyo: true, repeat: 1 }, 0)
            .to(s, { x: width + 10, duration: 1.4, ease: "none" }, .15)
            .to(s.querySelector(".sc-a"), { rotation: -16, svgOrigin: "23 16", duration: .1, repeat: 13, yoyo: true, ease: "sine.inOut" }, .15)
            .to(s.querySelector(".sc-b"), { rotation: 16, svgOrigin: "23 16", duration: .1, repeat: 13, yoyo: true, ease: "sine.inOut" }, .15)
            .to(ln, { scaleX: 1, duration: 1.4, ease: "none" }, .15)
            .to(el, { x: 1.5, duration: .05, repeat: 27, yoyo: true, ease: "none" }, .15);
          pieces.forEach((p, i) => {
            const at = .25 + (i / pieces.length) * 1.2;
            t.set(p, { x: (i / pieces.length) * width, y: 0, opacity: 1 }, at)
              .to(p, { y: -(50 + (i % 3) * 30), x: `+=${(i % 2 ? 1 : -1) * (10 + (i % 4) * 8)}`, rotation: (i % 2 ? 1 : -1) * 260, opacity: 0, duration: .9, ease: "power1.in" }, at);
          });
          t.to(s, { opacity: 0, scale: .6, duration: .2 }, 1.55)
            .to(ln, { opacity: 0, duration: .2 }, 1.6)
            // the torn-off receipt flutters up and away, swaying like paper
            .to(el, { y: -(H + el.offsetHeight + 60), duration: 1.6, ease: "power1.in" }, 1.65)
            .to(el, { x: 26, rotation: 9, duration: .38, yoyo: true, repeat: 3, ease: "sine.inOut" }, 1.65)
            .to(el, { opacity: 0, duration: .4 }, 2.75)
            .fromTo(dl.current, { y: -8, opacity: 0, scale: .6 }, { y: 0, opacity: 1, scale: 1, duration: .45, ease: "back.out(3)" }, 2.6)
            .to(dl.current, { y: 6, duration: .25, yoyo: true, repeat: 3, ease: "sine.inOut" }, 3.05)
            .to(dl.current, { opacity: 0, duration: .3 }, 4.1);
          tl.current = t;
        });
      }
      await pdf;
      setLcd("SAVED ✓ IN DOWNLOADS");
      setOut(false);
      if (feed.current) feed.current.style.cssText = "";
    } catch {
      setLcd("PAPER JAM, TRY AGAIN");
    } finally { setBusy(false); }
  };

  return (
    <div className={`rc${out ? " out" : ""}`} ref={box}>
      <div className="rc-win" ref={win}>
        <div className={`rc-scroll${busy ? " busy" : ""}`} ref={scroller} data-lenis-prevent>
          <div className="rc-feed" ref={feed}><ReceiptPaper d={d} r={r} map={map} clock={clock} /></div>
        </div>
        <i className="rc-cut" ref={line} aria-hidden />
        <span className="rc-scis" ref={scis} aria-hidden><Scissors /></span>
        <span className="rc-bits" ref={bits} aria-hidden>{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</span>
        <i className="rc-roll" ref={roll} aria-hidden><i className="rc-turn" ref={turn} /></i>
      </div>
      <div ref={head} className={`rc-printer${busy ? " printing" : ""}`}>
        <i className="rc-slot" aria-hidden />
        <div className="rc-screen">
          <div className="rc-sbar"><span>{map ? "MAP · LINKS · HELLO" : `${d.owner.toUpperCase()} · POS`}</span><span>{tick || "--:--"} ▂▄▆ ▮▮▮</span></div>
          <span className="rc-lcd" aria-live="polite">{lcd}</span>
        </div>
        <div className="rc-pad">{["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((k) => <button key={k} type="button" tabIndex={-1} aria-hidden onClick={() => press(k)}>{k}</button>)}</div>
        <div className="rc-keys">
          <button type="button" className="go" onClick={() => print()} disabled={busy}><i>🖨</i>Print</button>
          <button type="button" className="see" onClick={() => dlg.current?.showModal()}><i>👁</i>View</button>
          <button type="button" className="cut" onClick={cut} disabled={busy}><i>✂</i>Cut PDF</button>
        </div>
        <div className="rc-base"><i className="rc-led" /><span>TAP · INSERT · SMILE</span><i className="rc-nfc">)))</i></div>
        <span className="rc-dl" ref={dl} aria-hidden>⬇</span>
      </div>
      <dialog ref={dlg} className="rc-view" aria-label="Your receipt" onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}>
        <div className="rc-view-in">
          <ReceiptPaper d={d} r={r} map={map} clock={clock} whole />
          <div className="rc-btns">
            <button type="button" onClick={cut} disabled={busy}>✂ Cut PDF</button>
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
      const base = H - 48, blds: { x: number; w: number; h: number }[] = [];
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

const Beam = ({ x, y }: { x: number; y: number }) => <path d={`M${x} ${y - 1.5}L${x + 30} ${y - 8}V${y + 8}L${x} ${y + 1.5}z`} fill="url(#sk-beam)" />;
const Wheel = ({ x, y, r = 4.6 }: { x: number; y: number; r?: number }) => <><circle cx={x} cy={y} r={r} fill="#111015" /><circle cx={x} cy={y} r={r * .42} fill="#8d8a96" /></>;
/** Dhaka's traffic at night, original drawings facing right (the way they drive): a green CNG, a yellow taxi, a red double-decker, a rickshaw. */
const RIDES = {
  cng: <><path d="M6 27V14c0-5 4-9 10-9h20c8 0 13 5 15 12l2 5v5z" fill="#2f9e4f" /><path d="M12 5h24c6 0 10 3 12 8H12z" fill="#1c2620" />
    <path d="M14 14h9v8h-9zM26 14h8v8h-8z" fill="#ffe08a" /><path d="M38 14h6c2 0 3 2 4 4l1 4H38z" fill="#9fd3ff" opacity=".75" />
    <rect x="2" y="19" width="4" height="4" rx="1" fill="#ff4d4d" /><circle cx="52" cy="21" r="2" fill="#fff6c2" /><Beam x={53} y={21} /><Wheel x={15} y={28} /><Wheel x={45} y={28} /></>,
  taxi: <><rect x="22" y="2" width="12" height="5" rx="1.5" fill="#fff3b0" /><path d="M3 27v-6c0-2 1-3 3-3.5l9-2 7-7c1-1 2-1.5 4-1.5h12c2 0 3 .5 4.5 2l7 7c4 .5 6 2.5 6 5v6z" fill="#ffc927" />
    <path d="M20 15.5l5-5.5h7v5.5zM35 10h4c1 0 2 .5 2.6 1.2l4 4.3H35z" fill="#2b2d42" /><path d="M5 22h50" stroke="#2a2633" strokeWidth="1.4" strokeDasharray="3 3" />
    <rect x="1" y="19" width="3" height="4" rx="1" fill="#ff4d4d" /><circle cx="54" cy="21" r="2" fill="#fff6c2" /><Beam x={55} y={21} /><Wheel x={15} y={27.5} /><Wheel x={45} y={27.5} /></>,
  bus: <><rect x="2" y="0" width="64" height="28" rx="4" fill="#d8342c" /><rect x="2" y="13" width="64" height="2" fill="#f6efe2" />
    {[6, 16, 26, 36, 46].map((x) => <rect key={`u${x}`} x={x} y="3.5" width="8" height="7" rx="1" fill="#ffe08a" />)}
    {[6, 16, 26, 36].map((x) => <rect key={`d${x}`} x={x} y="17" width="8" height="6.5" rx="1" fill="#ffe08a" />)}
    <path d="M56 3.5h7v20h-7z" fill="#9fd3ff" opacity=".75" /><rect x="0" y="20" width="3" height="4" fill="#ff4d4d" /><circle cx="65" cy="24" r="2" fill="#fff6c2" /><Beam x={66} y={24} />
    <Wheel x={14} y={29} r={5} /><Wheel x={54} y={29} r={5} /></>,
  rick: <><circle cx="12" cy="24" r="8" fill="none" stroke="#e3dde9" strokeWidth="1.4" /><circle cx="44" cy="27" r="5" fill="none" stroke="#e3dde9" strokeWidth="1.4" />
    <path d="M4 16c0-8 6-13 14-13h4v13z" fill="#e8457a" /><path d="M6 10h14M5 13h16" stroke="#ffd23f" strokeWidth="1.2" /><rect x="4" y="15" width="20" height="4" rx="1.5" fill="#6b4fd8" />
    <path d="M12 24l14-6 18 9M26 18l6-6M32 12h5" stroke="#cfc8da" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <circle cx="34" cy="3.5" r="2.6" fill="#f2c8a0" /><path d="M34 6l-1 8 4 6M33 9l5 3" stroke="#f6efe2" strokeWidth="2" fill="none" strokeLinecap="round" /><circle cx="50" cy="22" r="1.4" fill="#fff6c2" /></>,
};
const BOX = { cng: "0 0 84 34", taxi: "0 0 86 33", bus: "0 0 98 35", rick: "0 0 54 33" } as const;
const TRAFFIC: [keyof typeof RIDES, "r" | "l", number, number][] = [
  ["cng", "r", 15, 0], ["taxi", "r", 11, -6], ["rick", "r", 26, -14], ["bus", "r", 21, -3], ["cng", "r", 15, -9],
  ["taxi", "l", 13, -2], ["cng", "l", 17, -8], ["bus", "l", 24, -15], ["rick", "l", 30, -4], ["taxi", "l", 13, -9],
];
export function DhakaStreet() {
  return (
    <div className="sk-street" aria-hidden>
      <svg width="0" height="0" style={{ position: "absolute" }}><defs><linearGradient id="sk-beam"><stop offset="0" stopColor="#fff6c2" stopOpacity=".55" /><stop offset="1" stopColor="#fff6c2" stopOpacity="0" /></linearGradient></defs></svg>
      {TRAFFIC.map(([k, dir, d, delay], i) => (
        <span key={i} className={`sk-v ${dir} k-${k}`} style={{ ["--d" as string]: `${d}s`, ["--dl" as string]: `${delay}s` }}>
          <svg viewBox={BOX[k]}>{RIDES[k]}</svg>
        </span>
      ))}
    </div>
  );
}
