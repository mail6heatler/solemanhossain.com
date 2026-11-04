@AGENTS.md

# Life Chronicle (solemanhossain)

A personal site with a private dashboard for its owner, Soleman Hossain ("Shourobh"). Everything visitors see is editable at `/admin`. Read this file and `PROGRESS.md` before exploring; they exist so nobody has to re-read the whole codebase.

**Working with the owner:** they aren't a developer. Explain in plain language, show results rather than code, and handle deployment yourself. They like bold, lively design, and for risky visual changes they want to see it live, then choose keep or undo.

## Commands

```bash
npm run dev      # http://localhost:3000. Needs ADMIN_PASSWORD in .env.local; uses a local database in .data/
npm run build    # also type-checks; run before every push
npx tsc --noEmit # type-check only
```

There is no test suite. Verify visually: drive the site with `playwright-core` from a scratch folder (never add it to this project) using the installed Chrome (`C:/Program Files/Google/Chrome/Application/chrome.exe`). Launch with `--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist --enable-gpu-rasterization` to use this PC's real graphics card; never judge smoothness in software mode. Stub `/api/track` and `/api/presence` when testing the live site so tests don't count as visitors.

**To measure scrolling:** record `requestAnimationFrame` gaps and CDP `Performance.getMetrics` during `page.mouse.wheel` steps, and turn effects off one at a time to attribute cost. Add `Emulation.setCPUThrottlingRate` (4x) for a weaker device. Re-measure after any change to motion; `PROGRESS.md` has the numbers to beat.

## Deploying

- Live site: https://solemanhossain.vercel.app (Vercel project `solemanhossain`, team `muzan-vercel`).
- GitHub: `mail6heatler/solemanhossain.com`, branch `main`.
- Pushing to `main` deploys to production automatically, in about 30 seconds. Check with `npx vercel@latest ls solemanhossain --yes`, which uses the owner's Vercel CLI login.
- Undo a release: `git revert` and push (keeps history), or `npx vercel@latest rollback <deployment-url> --yes` for an instant switch back.
- Production reads the real database through `DATABASE_URL` (Neon). Locally `DATABASE_URL` is empty, so local testing never touches live content. Local data is starter content, so check real photos and text on the live site.

## Stack

Next.js 16 (App Router, Turbopack) with React 19, plain CSS, Postgres (`postgres` in production, PGlite locally), `jose` for the login cookie, Vercel Blob for uploads, Lenis for smooth scrolling, GSAP ScrollTrigger for scroll effects, three.js for the 3D hero, canvas-confetti.

Next.js here is newer than most training data. Read `node_modules/next/dist/docs/` before using a Next API you aren't certain of (see `AGENTS.md`).

## Map

```
app/
  page.tsx                 homepage: hero + one <section> per database section
  s/[slug]/page.tsx        "See all" page
  s/[slug]/[id]/page.tsx   entry page
  admin/(panel)/           dashboard (overview, hero, sections, entries, inbox, appearance, settings)
  actions.ts               every dashboard change; all call requireAdmin
  api/                     upload, blob, vote, react, track, presence, export
  site.css                 public design: themes first, then components, then "THE LIVELY LAYER"
  admin.css                dashboard design
components/site/
  Chrome.tsx               SiteShell (wrapper for every public page), Nav, Rail, BottomBar, Footer
  SectionBody.tsx          the 8 section layouts
  Effects.tsx              core motion: progress, reveal, cards arriving, scroll-spy, Lenis, cursor, party, explorer
  Living.tsx               starts hoverFx immediately and loads scrollFx on demand
  hoverFx.ts               mouse effects, cursor labels, photo wipes, label decoding, footer-name fit (no libraries)
  scrollFx.ts              GSAP scroll effects + every chapter's in/out motion (separate download)
  ThemeFx.tsx              one canvas behind the content: starts/sleeps it, follows the theme
  themeScenes.ts           each theme's living background and click burst (separate download)
  HangingBanner.tsx        the pull-down announcement and its spring physics
  bannerFall.ts            what falls from the banner in each theme; its canvas exists only while something falls
  askName.ts               the "who's reacting?" box; the name is remembered in localStorage (lc_name)
  HeroScene.tsx            decides if/when the 3D runs, wires events and theme colours
  heroEngine.ts            three.js particle sculpture (separate download)
  Split.tsx                server-rendered split text: <Split> for letters, <Words> for words
  Intro.tsx                opening curtain (CSS only)
  HeroFx.tsx               decoding/kinetic headline, avatar tilt, greeting, live counter
  StripScroller.tsx        sideways pinned photo trail and its 3D curve
  ThemeSwitch.tsx          theme menu, shuffle, circular theme wipe
  Demo.tsx                 ?demo=<key> previews opened from dashboard pop-ups
lib/
  settings.ts              types, defaults, EFFECTS list, THEMES, MOODS, skinScript (runs in <head>)
  help.ts                  text for the dashboard's (i) pop-ups
  data.ts, db.ts, schema.ts   queries, connection, tables + starter content
  auth.ts                  login
app/admin/(panel)/banner/  dashboard page for the hanging banner (stored in settings.banner)
```

A new column goes in `SCHEMA` in `lib/schema.ts` as `ALTER TABLE … ADD COLUMN IF NOT EXISTS`; it runs by itself on the first request after a deploy. `sections.ribbon` controls the sliding headline per section; `reactions.name` is who reacted.

Tables: `settings` (one JSON document), `sections`, `items`, `files`, `messages`, `votes`, `reactions`, `stats_daily`, `section_views`, `presence`. Created automatically on first use. New settings fields need no migration because `mergeSettings` fills in defaults.

## How the look works

- Colours are CSS variables on `.site`. `html[data-skin]` swaps them for the 10 themes, and `--m` / `--m-deep` (inline on `.site`) carry the mood colour. Use `var(--mint)`, `--fg`, `--bg`, `--card`, `--line`, `--hero-*`, `--pop2`, `--pop3`. Never hard-code a colour; it has to work on every theme, including the light heroes (`paper`, `candy`).
- `skinScript` runs before first paint: it sets the theme, adds the page-transition opt-in, and decides whether the curtain plays.
- Public pages navigate with plain `<a>` (full page loads), so page transitions are cross-document view transitions. Every effect starts fresh on each page.

## Adding or changing an effect

Every visual effect has a switch on the Appearance page. To add one:

1. Add `{ key, group, label }` to `EFFECTS` in `lib/settings.ts`. It defaults to on, and the Appearance page and save action pick it up automatically.
2. Add its pop-up text to `lib/help.ts` with `preview: "/?demo=<key>"`.
3. Add its preview to `components/site/Demo.tsx`.
4. Implement it. For CSS-only effects, add the key to `LOOKS` in `Chrome.tsx` and scope the CSS under `.site.fx-<key>`. For JS, pass the flag through `Living` in `Chrome.tsx` into `hoverFx.ts` or `scrollFx.ts`.

## Keeping scrolling smooth

Scrolling was once 29 frames per second (6 on a weak device), from many small costs rather than one big one. Before adding motion:

- **Animate only `transform`, `translate`, `rotate`, `scale` and `opacity`.** Anything else (box-shadow, background-position, mask-position, text-shadow, filter, custom properties) runs on the main thread every frame.
- **Never write an inherited custom property or a style on many elements per frame.** One `--skew` on a band recalculated over a hundred text pieces. Transform the one parent instead.
- **Off-screen work must stop.** `Effects.tsx` puts `.sleep` on off-screen sections and ribbons, which pauses every animation inside and hides decorations. Scroll handlers should skip off-screen targets and read cached positions instead of measuring per frame.
- **No `backdrop-filter` or `mix-blend-mode` on anything large or fixed.** Both force the browser to redraw what's behind on every scrolled frame.
- **Scaling an element without `will-change: transform` re-draws its text at each size.** Set it only while moving, and clear it at rest (see chapter motion in `scrollFx.ts`).
- **Set `playbackRate` only when the value changes**, and only on what's on screen. Each write resynchronises the animation.
- **Slow devices get `html.lite`.** `Effects.tsx` watches frame times while scrolling; under about 25 fps for several seconds it sets the class, stores `lc_lite` in sessionStorage and fires `lc-lite`. Anything heavy must check the class at start and stop on that event. To add to it, see `ThemeFx`, `HeroScene`, `Living` and the `html.lite` CSS.
- **Anything that spawns things must have a cap.** `bannerFall.ts` once had splashes that made more splashes, and it froze the page.

## Rules learned the hard way

- **Nothing `position: fixed` may live inside a chapter.** `.chap-inner` gets a transform while scrolling, which would pin fixed children to it instead of the screen. Portal into `.site` (see `Lightbox`) or use a native `<dialog>`.
- **Page-wide key handlers must stand down while a `<dialog>` is open** (`document.querySelector("dialog[open]")`), or typing and Esc also reach what's underneath.
- **Physics and smoothing must run on real time, not per frame.** Slow devices otherwise get slow motion. See the sub-steps in `HangingBanner` and the `blend` in `scrollFx`.
- **Don't let pointer capture and `click` both handle a tap.** A captured pointer's click goes to the capturing element. `HangingBanner` handles taps in `pointerup` and keeps `click` for the keyboard (`e.detail === 0`).
- **Reactions, banners and other writes are tested on the local copy only.** Never post test reactions or change settings on the live site.
- **Things that always sway (the banner) never count as "stable" to Playwright.** Use `click({ force: true })`.

- **Nothing may depend on JavaScript to become visible unless it has a way back.** Animate from a visible default, or add the hidden state from JS. CSS-hidden content needs entries in the `<noscript>` rule in `app/layout.tsx` and the reduced-motion block at the end of `site.css`.
- **`IntersectionObserver` treats a fully `clip-path`-clipped element as off screen.** It never fires, so the element stays invisible. Watch the parent (see the photo wipe in `hoverFx.ts`).
- **Mouse effects must set `transform` only through one owner.** Tilt and magnets write inline `transform`, which beats CSS `:hover` transforms. For entrances or 3D that must combine with those, use the separate `rotate` / `scale` / `translate` properties.
- **Don't transform a section (`.chap`).** The sideways strip relies on `position: sticky` inside it. Keep sections `overflow: clip`, not `hidden`, for the same reason.
- **Don't make `#hero` sticky.** Scroll-spy and `#hero` anchors break; the sink-away effect is a transform on `.hero-inner`.
- **Letters must not be split in scripts that join them.** Bangla and emoji sequences stay whole words: use `isSplittable` from `Split.tsx`.
- **View-transition opt-in must be in `<head>`.** In the body it arrives too late and the browser aborts the transition.
- **File names differ only by case at your peril.** `heroScene.ts` beside `HeroScene.tsx` breaks on Windows, which is why the engine is `heroEngine.ts`.
- **Keep heavy libraries out of the first load.** three.js and GSAP are behind dynamic `import()`, and the site must stay complete if either fails to download.
- **Respect `prefers-reduced-motion`.** `Living` doesn't start at all, the 3D never loads, and the curtain is hidden.
- **Don't mutate React-managed text.** DOM effects may only touch server-rendered static nodes, or use `style`/`classList` on client ones.
