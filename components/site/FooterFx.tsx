"use client";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
function ReceiptPaper({ d, r, clock, whole }: { d: FootData; r: RcData; clock: { date: string; time: string; site: string }; whole?: boolean }) {
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
      <div className="rc-sub">🛍️ SEEN THIS VISIT</div>
      {r.seen.map((s) => <Row key={s.slug} a={`${s.emoji} ${s.label.toUpperCase()}`} b={r.seen.includes(s) ? <b className="ok">✓</b> : "·"} href={s.href} />)}
      {!r.seen.length && <div className="rc-c rc-soft">Nothing yet: scroll up and look around!</div>}
      {r.left.length > 0 && <><div className="rc-sub">👀 STILL TO SEE</div>{r.left.map((s) => <Row key={s.slug} a={`${s.emoji} ${s.label.toUpperCase()}`} b="→" href={s.href} />)}</>}
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

      <>
        <div className="rc-sub">💳 WAYS TO REACH ME</div>
        {d.links.map((l) => <Row key={l.url} a={l.label.toUpperCase()} b="↗" href={l.url} />)}
        <Row a="💬 SAY HELLO" b="↗" href={d.connectHref} />
        {clock.site && <><QR text={clock.site} /><div className="rc-c rc-soft">SCAN TO OPEN THIS SITE</div></>}
        <a className="rc-coupon" href={go(d.connectHref)}><b>✂ COUPON</b>{f.coupon}<span>Redeem →</span></a>
      </>

      <hr />
      <div className="rc-total">
        <Row a="TOTAL" b="1 HAPPY VISITOR" cls="big" />
        <span className="rc-paid" aria-hidden>PAID IN<br />SMILES</span>
      </div>
      <div className="rc-c rc-thanks">{f.thanks}</div>
      <div className="rc-sign"><span>{d.owner}</span><small>signed with love · keep this: proof you were here ✨</small></div>
      <div className="rc-bar" aria-hidden />
      <div className="rc-c rc-soft">{r.no} · {clock.site.replace(/^https?:\/\//, "")}</div>
    </div>
  );
}

/** The receipt's two fonts as embedded CSS for its picture (Space Grotesk and Caveat, Latin only), so the PDF uses exactly the screen's fonts. */
let fontsP: Promise<string> | null = null;
const receiptFonts = () => (fontsP ??= (async () => {
  const data = async (u: string) => {
    const b = await (await fetch(u)).blob();
    return await new Promise<string>((ok, bad) => { const f = new FileReader(); f.onload = () => ok(String(f.result)); f.onerror = bad; f.readAsDataURL(b); });
  };
  const css = await (await fetch("https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Space+Grotesk:wght@500;700&display=swap")).text();
  const faces = css.split("@font-face").slice(1).filter((f) => /unicode-range:[^;]*U\+0000-00FF/.test(f));
  const out = await Promise.all(faces.map(async (f) => {
    const m = /url\((https:[^)]+)\)/.exec(f);
    return m ? `@font-face${f.slice(0, f.lastIndexOf("}") + 1).replace(m[1], await data(m[1]))}` : "";
  }));
  return out.join("\n");
})().catch(() => ""));

/**
 * The receipt as a PDF: a picture of the printed receipt itself (html-to-image), in colour, 80mm wide like a real till roll. The picture is
 * taken of a copy outside the machine (no zoom, no movement, no torn edges), at the width it has on screen, with the receipt's own fonts.
 * It's heavy, so it runs only after the tear has finished.
 */
async function cutPdf(el: HTMLElement, name: string, width: number) {
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${Math.max(200, Math.round(width))}px;pointer-events:none;--rcd:"Space Grotesk",system-ui,sans-serif`;
  const copy = el.cloneNode(true) as HTMLElement;
  copy.style.transform = "none"; copy.style.clipPath = "none";
  host.appendChild(copy);
  document.body.appendChild(host);
  try {
    const [{ toPng }, { jsPDF }, fonts] = await Promise.all([import("html-to-image"), import("jspdf"), receiptFonts()]);
    const opts = { pixelRatio: 3, backgroundColor: "#fffdf8", cacheBust: true, ...(fonts ? { fontEmbedCSS: fonts } : { skipFonts: true }) };
    let png = "";
    try { png = await toPng(copy, opts); } catch { png = await toPng(copy, { ...opts, skipFonts: true, imagePlaceholder: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" }); }
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = png; });
    const W = 80, H = (W * img.height) / img.width;
    const doc = new jsPDF({ unit: "mm", format: [W, H] });
    doc.addImage(png, "PNG", 0, 0, W, H);
    doc.save(`receipt-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "visit"}-${new Date().toISOString().slice(0, 10)}.pdf`);
  } finally { host.remove(); }
}

type Gsap = typeof import("gsap").gsap;
let gsapP: Promise<Gsap> | null = null;
/** GSAP, the animation library the receipt's printing and tearing run on; downloaded only when a receipt is on the page. */
const loadGsap = () => (gsapP ??= import("gsap").then((m) => m.gsap));

/** Torn edges: small teeth along the receipt's top and bottom (both ends were torn off a roll), and along the bottom of the bit left in the slot. */
const teeth = (n: number, y: (i: number) => string) => Array.from({ length: n + 1 }, (_, i) => `${((i / n) * 100).toFixed(2)}% ${y(i)}`);
const ZIG_BOTH = `polygon(${teeth(40, (i) => (i % 2 ? "0px" : "5px")).join(", ")}, ${teeth(40, (i) => (i % 2 ? "100%" : "calc(100% - 5px)")).reverse().join(", ")})`;
const ZIG_BOTTOM = `polygon(0% 0%, 100% 0%, ${teeth(40, (i) => (i % 2 ? "100%" : "calc(100% - 5px)")).reverse().join(", ")})`;

/**
 * The hand that tears the receipt off, an original drawing in two layers: the palm, fingers and a maroon sleeve go behind the paper, the
 * thumb in front of it, so it really pinches. Both share one box (drawn 96 × 112, shown at HAND × that); the thumb's tip is at (14, 34),
 * the paper's edge at x = 44.
 */
const HAND = 1.36;
const HandBack = () => (
  <svg viewBox="0 0 96 112" aria-hidden>
    <path d="M42 74 L66 68 L96 98 L96 112 L56 112 Z" fill="#8b1e3f" />
    <path d="M40 72 L66 66 L70 77 L45 84 Z" fill="#6e1631" />
    <path d="M30 34 C29 21 44 13 57 16 C70 19 77 33 75 49 C73 61 67 69 60 73 L45 76 C36 66 31 50 30 34 Z" fill="#f1c6a0" stroke="#3a2a26" strokeWidth="2" strokeLinejoin="round" />
    <path d="M37 27 C41 23 47 22 51 24 M58 30 C62 34 64 40 63 46" fill="none" stroke="#d9a37e" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const HandThumb = () => (
  <svg viewBox="0 0 96 112" aria-hidden>
    <path d="M48 41 C40 44 26 45 18 43 C11 41 10 34 15 31 C21 27 35 27 44 30 Z" fill="#f1c6a0" stroke="#3a2a26" strokeWidth="2" strokeLinejoin="round" />
    <path d="M15 32 C12 35 13 40 17 41 C19 38 19 34 15 32 Z" fill="#ffd9d0" />
  </svg>
);

/** The receipt, drawn again only when what it says changes (it holds still while the machine works). */
const Paper = memo(ReceiptPaper);

/**
 * The footer's receipt (settings.footer.look "receipt"), chosen by the owner from the Receipt Machine Picker on 2026-11-20: machine A, the
 * handheld POS, in the middle of the footer, with the receipt hanging from its slot underneath and fading into the footer's bottom edge
 * (click it, or View, for the whole receipt). The owner's rules: the machine stays in the middle and never moves; only its screen, progress
 * bar, light and keys do. The paper is inside the machine's box (`.rc-win`, under the slot), so it scales with it.
 * Printing is a real thermal printer (GSAP): the whole receipt comes out of the slot in line-feed bursts, the text moving with the paper,
 * end first as a downward printer does, so every line passes by; slower over the photo, the QR code and the barcode; the screen counts the
 * percent. Cut is a tear by hand: the fade steps aside, a hand in a maroon sleeve reaches up, pinches (thumb in front, fingers behind),
 * tugs, the receipt turns about one corner while fibres fly along the tear bar, it rips (a torn bit stays in the slot), and the hand takes
 * it away; only then is the PDF made (a picture of this very receipt), so the tear never stutters. While the machine works, the receipt
 * isn't redrawn (its clock would otherwise redraw it every second), and the moving parts keep one layer each (force3D, will-change).
 * The machine fits any screen by itself (`fit`), its screen's words shrink to fit (`fitLcd`), its keys' words follow their width (cqi).
 * The first time a visit reaches the footer it prints by itself; on the visit's later pages only the machine shows. The number pad types
 * a pretend PIN (the visit's lucky number is a jackpot). Without JavaScript, with reduced motion or on html.lite, the receipt just hangs.
 */
export function ReceiptFooter({ d }: { d: FootData }) {
  const { v, srv, now, clock } = useVisit(d.preview);
  const [hour, setHour] = useState(-1);
  useEffect(() => setHour(new Date().getHours()), [clock.time]);
  const [out, setOut] = useState(true); // the paper is out (true until JS decides, so without it the receipt shows)
  const [waiting, setWaiting] = useState(false); // inside the machine until it prints
  const [busy, setBusy] = useState(false);
  const [lcd, setLcd] = useState("READY ●");
  const [pin, setPin] = useState("");
  const dlg = useRef<HTMLDialogElement>(null);
  const box = useRef<HTMLDivElement>(null), dev = useRef<HTMLDivElement>(null), win = useRef<HTMLDivElement>(null), feed = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLSpanElement>(null), prog = useRef<HTMLElement>(null), stub = useRef<HTMLElement>(null);
  const fade = useRef<HTMLDivElement>(null), more = useRef<HTMLButtonElement>(null), bits = useRef<HTMLSpanElement>(null), dl = useRef<HTMLSpanElement>(null);
  const tl = useRef<{ kill(): unknown } | null>(null);
  const live = useMemo(() => receiptData(d, v, now, srv, hour), [d, v, now, srv, hour]);
  const held = useRef(live);
  if (!busy) held.current = live; // while the machine works, the receipt holds still
  const r = held.current;
  const still = () => typeof window === "undefined" || calm();
  const frame = () => new Promise<void>((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok())));
  const zoom = () => parseFloat(dev.current?.style.zoom || "") || 1;
  const machine = d.design.size?.machine ?? 100;
  const hands = () => Array.from(feed.current?.querySelectorAll<HTMLElement>(".rc-hand") ?? []);
  const paperOf = () => feed.current?.querySelector<HTMLElement>(".rc-paper") ?? null;

  // both ends of the receipt are torn edges; they hide under the slot and far below, and show when it moves
  useEffect(() => { const p = paperOf(); if (p) p.style.clipPath = ZIG_BOTH; }, []);

  // the machine fits the footer at any screen size: no bigger than the owner's size, 62% of the height, 40% of the width (92% on phones)
  useEffect(() => {
    const el = dev.current, col = box.current, row = col?.parentElement;
    if (!el || !col || !row) return;
    let raf = 0;
    const fit = () => {
      el.style.zoom = "1";
      const n = el.getBoundingClientRect();
      const narrow = matchMedia("(max-width: 760px)").matches;
      const z = Math.max(.5, Math.min(machine / 100, (col.clientHeight * .62) / n.height, (row.clientWidth * (narrow ? .92 : .4)) / n.width));
      el.style.zoom = String(Math.round(z * 1000) / 1000);
    };
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); });
    ro.observe(row);
    fit();
    document.fonts?.ready.then(fit).catch(() => {});
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, [machine]);

  // the screen's words shrink to fit it, whatever they say
  useLayoutEffect(() => {
    const el = screen.current;
    if (!el) return;
    const fitLcd = () => {
      el.style.fontSize = "";
      if (el.scrollWidth > el.clientWidth + 1) el.style.fontSize = `${Math.max(7, parseFloat(getComputedStyle(el).fontSize) * (el.clientWidth / el.scrollWidth) * .96)}px`;
    };
    fitLcd();
    document.fonts?.ready.then(fitLcd).catch(() => {});
  }, [lcd]);

  /** The number pad: a pretend PIN; the visit's lucky number is the jackpot. */
  const press = (k: string) => {
    if (busy) return;
    const p = k === "*" || k === "#" ? "" : (pin + k).slice(-4);
    setPin(p);
    if (!p) { setLcd(k === "#" ? "THANK YOU ✓" : "CLEARED"); return; }
    if (+p === r.lucky) { setLcd(`🎉 JACKPOT! ${r.lucky}`); setPin(""); return; }
    if (p.length === 4) { setLcd("WRONG PIN · RIGHT VIBES"); setPin(""); return; }
    setLcd(`PIN ${"•".repeat(p.length)}${"_".repeat(4 - p.length)}`);
  };

  /** How much of the receipt shows under the slot before the footer's edge, in the machine's own pixels. */
  const visible = () => {
    const w = win.current, b = box.current;
    if (!w || !b) return 200;
    return Math.max(40, b.getBoundingClientRect().bottom - w.getBoundingClientRect().top) / zoom();
  };

  /** Prints the whole receipt: line-feed bursts out of the slot, slower over pictures, the screen counting. Resolves when done. */
  const print = async (fast = false) => {
    const clip = feed.current, paper = paperOf();
    if (!clip || !paper) return;
    tl.current?.kill();
    hands().forEach((h) => (h.style.cssText = ""));
    if (stub.current) stub.current.style.opacity = "0";
    const anim = !still();
    if (anim) { clip.style.cssText = "transform: translateY(-100%)"; setWaiting(true); } // inside the machine, so it never flashes
    setBusy(true); setOut(true); await frame();
    const gsap = anim ? await loadGsap().catch(() => null) : null;
    if (!gsap) { clip.style.cssText = ""; setWaiting(false); setBusy(false); return; }
    const z = zoom(), pr = paper.getBoundingClientRect(), H = pr.height / z;
    // pictures print slower, as on a real thermal printer
    const zones = Array.from(paper.querySelectorAll<HTMLElement>(".rc-photo, .rc-qr, .rc-bar")).map((e) => {
      const b = e.getBoundingClientRect();
      return [(b.top - pr.top) / z - 4, (b.bottom - pr.top) / z + 4] as const;
    });
    const slow = (o: number) => zones.some(([a, b]) => o >= a && o <= b);
    setLcd("PRINTING… 0%");
    await new Promise<void>((done) => {
      const keys = Array.from(dev.current?.querySelectorAll<HTMLElement>(".rc-pad button") ?? []);
      const t = gsap.timeline({ onComplete: () => { gsap.set(clip, { clearProps: "all" }); clip.style.cssText = ""; gsap.set(keys, { clearProps: "filter" }); done(); } });
      t.set(clip, { y: -H, x: 0, rotation: 0, opacity: 1, force3D: true }).to({}, { duration: fast ? .1 : .35 }); // the head warms up
      // line feeds: a quick push and a short pause, a little irregular; the receipt's end comes out first, as from a downward printer
      let y = -H, n = 0;
      const k0 = fast ? .5 : 1;
      while (y < -.5) {
        const s = slow(-y), step = Math.min(s ? 8 : 16, -y);
        y += step;
        const k = k0 * (.85 + ((n * 37) % 10) / 33);
        t.to(clip, { y, duration: (s ? .06 : .04) * k, ease: "power2.out", force3D: true }).to({}, { duration: (s ? .045 : .02) * k });
        n++;
      }
      const feedTime = t.duration();
      t.fromTo(prog.current, { scaleX: 0 }, { scaleX: 1, duration: feedTime, ease: "none" }, 0)
        .to(keys, { filter: "brightness(1.9) hue-rotate(200deg)", duration: .12, stagger: { each: .05, repeat: 1, yoyo: true }, repeat: Math.max(0, Math.floor(feedTime / 1.6) - 1), repeatDelay: .4 }, 0);
      let last = -1;
      t.eventCallback("onUpdate", () => { const p = Math.min(100, Math.floor(t.progress() * 10) * 10); if (p !== last) { last = p; setLcd(`PRINTING… ${p}%`); } });
      tl.current = t;
    });
    setBusy(false); setWaiting(false); setLcd("DONE ✓ ENJOY");
  };

  // the first time this visit reaches the footer, it prints by itself; later pages of the visit show just the machine, ready
  useEffect(() => {
    const clip = feed.current, b = box.current;
    if (!clip || !b || still()) return;
    const id = readVisit()?.start ?? "";
    let done = false;
    try { done = !!id && localStorage.getItem("lc_rc_printed") === id; } catch { /* */ }
    if (done) { setOut(false); return; }
    clip.style.cssText = "transform: translateY(-100%)"; // waiting inside the machine
    setWaiting(true);
    const io = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      io.disconnect();
      try { const s = readVisit()?.start ?? id; if (s) localStorage.setItem("lc_rc_printed", s); } catch { /* */ }
      print();
    }, { threshold: .3 });
    io.observe(b);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => { tl.current?.kill(); }, []);

  /** Cut: prints first if nothing is out; a hand tears the receipt off and takes it away; then the PDF is made and downloads. */
  const cut = async () => {
    if (busy) return;
    dlg.current?.close();
    if (!out) await print(true);
    const clip = feed.current, paper = paperOf();
    if (!clip || !paper) return;
    setBusy(true); setLcd("TEARING… ✋");
    const width = paper.getBoundingClientRect().width / zoom();
    let gsap: Gsap | null = null;
    try {
      gsap = still() ? null : await loadGsap().catch(() => null);
      const hs = hands();
      if (gsap && hs.length) {
        tl.current?.kill();
        const V = visible(), gy = Math.max(34, Math.min(V * .42, V - 30)); // where the thumb holds the receipt
        hs.forEach((h) => { h.style.left = `${width - 44 * HAND}px`; h.style.top = `${gy - 34 * HAND}px`; h.style.display = "block"; });
        const pieces = Array.from(bits.current?.children ?? []) as HTMLElement[];
        const g = gsap;
        await new Promise<void>((done) => {
          const t = g.timeline({ onComplete: done });
          t.set(hs, { x: 90, y: V + 90, rotation: 24, scale: 1, transformOrigin: `${14 * HAND}px ${34 * HAND}px`, opacity: 1, force3D: true })
            .set(clip, { transformOrigin: "0% 0%", x: 0, y: 0, rotation: 0, force3D: true })
            .set(pieces, { x: 0, y: 0, opacity: 0, rotation: 0 })
            .to([fade.current, more.current], { opacity: 0, duration: .25 }, 0) // the fade steps aside so the hand shows
            // the hand reaches up and pinches the receipt
            .to(hs, { x: 0, y: 0, rotation: 0, duration: .7, ease: "power3.out" }, .05)
            .to(hs, { scale: .92, duration: .12, ease: "power2.out" })
            .to(clip, { y: 4, duration: .16, ease: "power2.out" }, "<") // a little tug: the paper tightens
            .addLabel("tear", "+=.08")
            // pulled against the tear bar: the receipt turns about its far corner while the tear runs across
            .add(() => { if (stub.current) stub.current.style.opacity = "1"; setLcd("RRRIP! ✋"); }, "tear")
            .to(clip, { rotation: 7, y: 9, duration: .55, ease: "power1.in" }, "tear")
            .to(hs, { rotation: -7, duration: .55, ease: "power1.in" }, "tear");
          pieces.forEach((p, i) => {
            const at = `tear+=${((i / pieces.length) * .45).toFixed(3)}`;
            t.set(p, { x: width * (1 - i / pieces.length), y: 0, opacity: 1 }, at)
              .to(p, { y: 26 + (i % 3) * 16, x: `+=${(i % 2 ? 1 : -1) * (5 + (i % 4) * 4)}`, rotation: (i % 2 ? 1 : -1) * 200, opacity: 0, duration: .7, ease: "power1.in" }, at);
          });
          // the last fibres give: it snaps free, then the hand takes it away
          t.to(clip, { rotation: 10, y: 15, duration: .1, ease: "power3.out" })
            .to(hs, { scale: 1, duration: .12 }, "<")
            .to(clip, { y: V + 260, x: 90, rotation: 22, duration: .85, ease: "power2.in" }, "+=.12");
          tl.current = t;
        });
      }
      setOut(false);
      clip.style.cssText = "";
      hands().forEach((h) => (h.style.cssText = ""));
      if (fade.current) fade.current.style.opacity = "";
      if (more.current) more.current.style.opacity = "";
      // only now the heavy part, so the tear never stutters
      setLcd("SAVING PDF…");
      await frame();
      await cutPdf(paper, d.design.shop || d.owner, width);
      setLcd("SAVED ✓ IN DOWNLOADS");
      if (gsap && dl.current) gsap.timeline()
        .fromTo(dl.current, { y: -8, opacity: 0, scale: .6 }, { y: 0, opacity: 1, scale: 1, duration: .45, ease: "back.out(3)" })
        .to(dl.current, { y: 6, duration: .25, yoyo: true, repeat: 3, ease: "sine.inOut" })
        .to(dl.current, { opacity: 0, duration: .3 });
    } catch {
      setLcd("PAPER JAM, TRY AGAIN");
    } finally { setBusy(false); }
  };

  return (
    <div className={`rc${out ? " out" : ""}${waiting ? " waiting" : ""}${busy ? " busy" : ""}`} ref={box}>
      <div className={`rc-printer${busy ? " printing" : ""}`} ref={dev}>
        <div className="rc-screen">
          <div className="rc-sbar"><span>{`${d.owner.toUpperCase()} · POS`}</span><span>{clock.time || "--:--"} ▂▄▆ ▮▮▮</span></div>
          <span className="rc-lcd" ref={screen} aria-live="polite">{lcd}</span>
          <span className="rc-prog"><i ref={prog} /></span>
        </div>
        <div className="rc-pad">{["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((k) => <button key={k} type="button" tabIndex={-1} aria-hidden onClick={() => press(k)}>{k}</button>)}</div>
        <div className="rc-keys">
          <button type="button" className="go" onClick={() => print()} disabled={busy}><i>🖨</i><b>Print</b></button>
          <button type="button" className="see" onClick={() => dlg.current?.showModal()}><i>👁</i><b>View</b></button>
          <button type="button" className="cut" onClick={cut} disabled={busy}><i>✂</i><b>Cut PDF</b></button>
        </div>
        <div className="rc-base"><i className="rc-led" /><span>TAP · INSERT · SMILE</span></div>
        <div className="rc-win" ref={win}>
          <div className="rc-feed" ref={feed} onClick={() => !busy && dlg.current?.showModal()}>
            <span className="rc-hand b" aria-hidden><HandBack /></span>
            <Paper d={d} r={r} clock={clock} />
            <span className="rc-hand t" aria-hidden><HandThumb /></span>
          </div>
          <span className="rc-bits" ref={bits} aria-hidden>{Array.from({ length: 10 }, (_, i) => <i key={i} />)}</span>
        </div>
        <i className="rc-stub" ref={stub} aria-hidden style={{ clipPath: ZIG_BOTTOM }} />
        <i className="rc-slot" aria-hidden />
        <span className="rc-dl" ref={dl} aria-hidden>⬇</span>
      </div>
      <div className="rc-fade" ref={fade} aria-hidden />
      <button type="button" className="rc-more" ref={more} onClick={() => dlg.current?.showModal()}>▼ View the whole receipt</button>
      <dialog ref={dlg} className="rc-view" aria-label="Your receipt" data-lenis-prevent onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}>
        <div className="rc-view-in" data-lenis-prevent>
          <Paper d={d} r={r} clock={clock} whole />
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
