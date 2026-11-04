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
        run: async () => { await sleep(700); const g = document.querySelector(".stagger") as HTMLElement | null; if (g) { const kids = Array.from(g.children); kids.forEach((k) => k.classList.remove("seen")); void g.offsetWidth; kids.forEach((k, i) => { (k as HTMLElement).style.setProperty("--si", String(i)); k.classList.add("seen"); }); } } },
      sideways: { on: fx.sideways, target: inLayout("strip"), tip: "Keep scrolling down: the trips slide sideways (on computers with enough trips)." },
      timeline: { on: fx.timeline, target: inLayout("timeline", ".tline"), tip: "Scroll slowly: the line draws itself and milestones light up." },
      morph: { on: fx.morph, target: inLayout("cards"), tip: "Click a card with a photo: the photo grows into the entry page (Chrome / Edge)." },
      intro: { on: fx.intro, tip: "That curtain plays once per visit, the first time someone opens your homepage." },
      pagefx: { on: fx.pagefx, target: "section.chap a", tip: "Click anything that opens another page: the old page sinks back while the new one rises (Chrome, Edge, Safari)." },
      themewipe: { on: fx.themewipe && extras.themeSwitch, target: ".nav-right", tip: "Watch the new theme spread out in a circle from the button.", run: async () => { for (let i = 0; i < 2; i++) { await sleep(1500); click(fx.shuffle ? ".shuffle-btn" : ".skin-pick .icon-btn"); } } },
      hero3d: { on: fx.hero3d, target: "#hero", tip: "Move your mouse over the particles: they part around it. Click an empty spot for a shock wave and a new shape.", run: async () => { await sleep(1800); window.dispatchEvent(new Event("lc-hero-next")); } },
      cardtilt: { on: fx.cardtilt, target: inLayout("cards", ".grid3"), tip: "Move your mouse across a card: it tilts toward you and catches the light." },
      coverflow: { on: fx.coverflow, target: inLayout("strip"), tip: "Keep scrolling: the trips curve around you as they pass the middle of the screen." },
      kinetic: { on: fx.kinetic, target: "#hero h1", tip: "Move your mouse along the headline: each letter rises and leans away from it." },
      splittext: { on: fx.splittext, target: ".split-host", tip: "Titles rise letter by letter. Hover one for a ripple.", run: async () => { await sleep(500); const t = document.querySelector(".split-host"); if (t) { t.classList.remove("in", "done"); void (t as HTMLElement).offsetWidth; t.classList.add("in"); setTimeout(() => t.classList.add("done"), 1500); } } },
      wordscrub: { on: fx.wordscrub, target: ".ssub", tip: "Scroll slowly: the words under each chapter title light up one by one." },
      footername: { on: fx.footername, target: ".foot-giant", tip: "Your name rises from the floor at the very end of the page. Hover its letters." },
      heroexit: { on: fx.heroexit, tip: "Scroll down slowly: the hero sinks and fades while the next chapter rises over it." },
      sheets: { on: fx.sheets, target: "section.chap", tip: "Each chapter has rounded top corners and slides over the one before it." },
      ghost: { on: fx.ghost, target: ".ghost", tip: "The giant outlined mark in the background drifts sideways as you scroll." },
      ribbons: { on: fx.ribbons, target: ".ribbon", tip: "A moving ribbon announces the next chapter." },
      velocity: { on: fx.velocity, target: ".marquee, .ribbon", tip: "Scroll fast, then scroll back up: the moving text speeds up, leans, and reverses." },
      imgreveal: { on: fx.imgreveal, target: inLayout("photos"), tip: "Photos wipe into view the first time they appear, and photo-grid columns drift at different speeds." },
      totop: { on: fx.totop, tip: "The ring at the bottom right fills up as you read. Click it to fly back to the top.", run: () => { window.scrollTo({ top: innerHeight }); } },
      smartcursor: { on: fx.smartcursor && fx.cursor, target: inLayout("cards", ".grid3"), tip: "Move your mouse over cards, photos and buttons: the ring grows and says what a click will do." },
      spotlight: { on: fx.spotlight, target: inLayout("cards", ".grid3"), tip: "Move your mouse between cards: their borders light up near it." },
      ambient: { on: fx.ambient, target: "section.chap", tip: "Move your mouse over the empty space in a chapter: a soft glow follows it." },
      liquid: { on: fx.liquid, target: ".connectrow, .see-all", tip: "Hover a button: the colour pours in from where your mouse came in." },
      navpill: { on: fx.navpill, target: ".navlinks", tip: "Move your mouse along the menu: the highlight slides and the labels roll." },
      banner: { tip: "Pull the tab under the menu bar, let go, then drag the banner back up." },
      themefx: { on: fx.themefx, tip: "Every theme has its own living effects. Watch them change, and click anywhere for that theme's burst.", run: async () => {
        const h = document.documentElement;
        for (const t of ["ocean", "techy", "retro", "paper", "sunset", "forest", "candy", "playful", "night", "day"]) {
          h.dataset.skin = t; window.dispatchEvent(new Event("skinchange"));
          toast(`${SKIN_LABELS[t as Skin]} (preview, not saved)`, 4800);
          await sleep(5000);
        }
      } },
      sticker: { on: fx.sticker, target: ".avatar-wrap", tip: "Your photo floats like a sticker someone just stuck on. Move your mouse over it: it tilts in 3D." },
      sectionfx: { on: fx.sectionfx, tip: "Scroll down slowly: each chapter rises in, then leaves its own way (shrink, tilt, slide, swing)." },
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
