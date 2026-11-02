"use client";
import { useEffect } from "react";
import { SKIN_LABELS, type Skin } from "@/lib/settings";
import { burst, confettiFrom, toast } from "./fx";

type Demo = { tip: string; target?: string; run?: () => void; on?: boolean };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const click = (sel: string) => (document.querySelector(sel) as HTMLElement | null)?.click();
const inLayout = (layout: string, sel = "") => `section[data-layout="${layout}"] ${sel}`.trim();

/**
 * "Preview" links from the dashboard's ⓘ pop-ups open the site with ?demo=<feature>: scroll to the feature,
 * highlight it, say what to do, and (where possible) show it in action. ?theme=<theme> previews a theme without saving.
 */
export default function DemoMode({ fx, extras }: { fx: Record<string, boolean>; extras: { themeSwitch: boolean; showMood: boolean } }) {
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const theme = qs.get("theme");
    if (theme && document.documentElement.hasAttribute("data-skin-preview"))
      setTimeout(() => toast(`Previewing ${SKIN_LABELS[theme as Skin] ?? theme} (not saved)`, 4000), 600);
    const key = qs.get("demo");
    if (!key) return;

    const D: Record<string, Demo> = {
      themes: { on: extras.themeSwitch, target: ".skin-pick", tip: "This is the theme button. Pick any theme from the menu.", run: () => click(".skin-pick .icon-btn") },
      shuffle: { on: fx.shuffle && extras.themeSwitch, target: ".shuffle-btn", tip: "🔀 Each click jumps to a random theme. Watch:", run: async () => { for (let i = 0; i < 3; i++) { await sleep(1300); click(".shuffle-btn"); } } },
      mood: { on: extras.showMood, target: ".mood-pill", tip: "Your mood pill. The mood also sets the accent colour." },
      now: { target: ".now-pill", tip: "Your “right now” status." },
      party: { on: fx.party, target: "#hero h1", tip: "🕺 Party mode! Visitors start it by typing your secret word.", run: () => window.dispatchEvent(new Event("lc-party")) },
      decode: { on: fx.decode, target: "#hero h1", tip: "Watch the headline decode.", run: () => window.dispatchEvent(new Event("lc-decode")) },
      aurora: { on: fx.aurora, target: "#hero", tip: "The slow colour waves behind this section are the aurora." },
      tilt: { on: fx.tilt, target: ".avatar-wrap", tip: "Move your mouse over the photo (it tilts and waves), then click it for confetti." },
      magnetic: { on: fx.magnetic, target: ".ctas", tip: "Move your mouse slowly toward these buttons: they lean toward it." },
      greeting: { on: fx.greeting, target: ".greet", tip: "The time greeting, in your time zone (and the visitor's)." },
      typewriter: { on: fx.typewriter, target: ".brand", tip: "Your name phrases type themselves here, and the subtitle types out." },
      emojis: { on: fx.emojis, target: ".float-emo", tip: "Drag a floating emoji and let go: it springs back." },
      cursor: { on: fx.cursor, target: "#hero", tip: "Move your mouse around to see the cursor and connecting dots." },
      smooth: { on: fx.smooth, tip: "Smooth scrolling: scroll with your mouse wheel. Gliding to the first section now…",
        run: async () => { await sleep(1200); const el = document.querySelector("section.chap") as HTMLElement | null; if (el) scrollToEl(el); } },
      countup: { on: fx.countup, target: ".hero-stats", tip: "These numbers count up to your real totals.", run: () => window.dispatchEvent(new Event("lc-countup")) },
      stagger: { on: fx.stagger, target: inLayout("cards", ".stagger") || inLayout("cards"), tip: "Watch the cards drop in one by one.",
        run: async () => { await sleep(700); const g = document.querySelector(".stagger") as HTMLElement | null; if (g) { g.classList.remove("in"); void g.offsetWidth; g.classList.add("in"); } } },
      sideways: { on: fx.sideways, target: inLayout("strip"), tip: "Keep scrolling down: the trips slide sideways (on computers with enough trips)." },
      timeline: { on: fx.timeline, target: inLayout("timeline", ".tline"), tip: "Scroll slowly: the line draws itself and milestones light up." },
      morph: { on: fx.morph, target: inLayout("cards"), tip: "Click a card with a photo: the photo grows into the entry page (Chrome / Edge)." },
      reactions: { on: fx.reactions, target: ".reacts", tip: "Tap an emoji to react (tap again to take it back). Reactions arrive in your Inbox." },
      confetti: { on: fx.confetti, target: ".poll", tip: "Vote in this poll for a burst of confetti." },
      plane: { on: fx.plane, target: ".hello", tip: "Send a message here and it flies away as a paper plane." },
      surprise: { on: fx.surprise, target: ".dice-btn", tip: "🎲 Click this to open a random entry." },
      explorer: { on: fx.explorer, tip: "This is what visitors see after scrolling through every section:",
        run: async () => { await sleep(1800); toast("🏆 Achievement unlocked: Explorer! You've seen every chapter.", 4200); confettiFrom(null, { count: 120, spread: 90 }); } },
      sparkles: { on: fx.sparkles, tip: "Click anywhere: your emojis burst out.",
        run: async () => { const em = Array.from(document.querySelectorAll(".float-emo")).map((e) => e.textContent || "").filter(Boolean); for (let i = 0; i < 3; i++) { await sleep(900); burst(innerWidth * (0.3 + 0.2 * i), innerHeight * 0.45, em.length ? em : ["✨", "🚀", "💡"], 9, 110); } } },
      visitors: { on: fx.visitors, target: ".live-pill", tip: "How many people are on the site right now." },
      bento: { on: fx.bento, target: inLayout("cards", ".grid3"), tip: "Bento grid: mixed tile sizes (needs 3 or more entries)." },
      flip: { on: fx.flip, target: inLayout("list", ".flips"), tip: "Hover a card (or tap on a phone) to flip it." },
      lightbox: { on: fx.lightbox, target: inLayout("photos"), tip: "Click any photo to open the full-screen viewer.",
        run: async () => { await sleep(1600); click('section[data-layout="photos"] button.ph-tile'); } },
      bottombar: { on: fx.bottombar, tip: fx.bottombar ? "The app-style menu shows on phones. Make this window very narrow (or open the site on your phone) to see it at the bottom." : "" },
    };
    const d = D[key];
    if (!d) return;
    (async () => {
      await sleep(700); // let smooth scrolling start
      if (d.on === false) { toast("This feature is switched off. Turn it on in Appearance, press Save, then preview again.", 6000); return; }
      const el = d.target ? (document.querySelector(d.target) as HTMLElement | null) : null;
      if (d.target && !el) { toast("Nothing to show here yet (add content for this section first).", 6000); return; }
      if (el) {
        scrollToEl(el);
        el.classList.add("demo-glow");
        setTimeout(() => el.classList.remove("demo-glow"), 4500);
      }
      if (d.tip) toast(d.tip, 6500);
      await sleep(el ? 900 : 0);
      d.run?.();
    })();
  }, [fx, extras]);
  return null;
}

function scrollToEl(el: HTMLElement) {
  const lenis = (window as unknown as { __lenis?: { scrollTo(t: HTMLElement, o?: object): void } }).__lenis;
  if (lenis) lenis.scrollTo(el, { offset: -110 });
  else window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 110, behavior: "smooth" });
}
