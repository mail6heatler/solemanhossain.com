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

Next.js 16 (App Router, Turbopack) with React 19, plain CSS, Postgres (`postgres` in production, PGlite locally), `jose` for the login cookie, Vercel Blob for uploads, Lenis for smooth scrolling, three.js for the 3D hero, canvas-confetti.

Next.js here is newer than most training data. Read `node_modules/next/dist/docs/` before using a Next API you aren't certain of (see `AGENTS.md`).

## Map

```
app/
  page.tsx                 homepage: hero + one <section> per database section
  s/[slug]/page.tsx        "See all" page (a grid of same-size cards: SectionBody's `grid` prop)
  s/[slug]/[id]/page.tsx   entry page
  admin/(panel)/           dashboard (overview, hero, sections, entries, inbox, appearance, settings)
  admin/(panel)/content/   "Content sizes": size and look for all content (components/admin/LookControls.tsx is the panel)
  actions.ts               every dashboard change; all call requireAdmin
  api/                     upload, blob, vote, react, track, presence, export
  site.css                 public design: themes first, then components, then "THE LIVELY LAYER"
  admin.css                dashboard design
components/site/
  Chrome.tsx               SiteShell (wrapper for every public page), Nav, Rail, BottomBar, Footer
  SectionBody.tsx          the 8 section layouts, including the milestones map (`milemap`, a timeline as stops on a trail)
  Effects.tsx              core motion: progress, reveal, cards arriving, scroll-spy, Lenis, cursor, party, explorer
  Living.tsx               starts hoverFx immediately and loads scrollFx on demand
  hoverFx.ts               mouse effects, cursor labels, photo wipes, label decoding, footer-name fit (no libraries)
  scrollFx.ts              scroll effects + every chapter's in/out motion, one loop that sleeps when idle (separate download)
  PicZoom.tsx              the expand button on a card's picture; opens the full-screen viewer
  BackLink.tsx             Back on an entry page: returns to where the visitor was
  ThemeFx.tsx              one canvas behind the content: starts/sleeps it, follows the theme
  themeScenes.ts           the 10 classic themes' living backgrounds and click bursts (separate download)
  themeScenes2.ts          the 20 fan themes: one data table of what floats, bursts and falls, plus drawn "pieces"
  themeArt.ts              small drawn sprites shared by scenes, bursts and banner drops; each is stamped from a cache
  HangingBanner.tsx        the pull-down announcement and its physics (falls, jolts, swings, breeze); opens on every visit
  bannerFall.ts            what falls from the banner in each theme; its canvas exists only while something falls
  askName.ts               the "who's reacting?" box; the name is remembered in localStorage (lc_name)
  HeroScene.tsx            decides if/when the 3D runs, wires events and theme colours
  heroEngine.ts            three.js particle sculpture (separate download)
  Split.tsx                server-rendered split text: <Split> for letters, <Words> for words
  Intro.tsx                opening curtain (CSS only)
  HeroFx.tsx               decoding/kinetic headline, avatar tilt, greeting, live counter
  SideRow.tsx              the homepage's row of cards: never wraps; pins and slides sideways on computers, swiped on phones, plus curve, fly-in, lean, counter
  scrollBoxes.ts           cards that scroll inside themselves: the "more" hint and the wheel (text first, then page)
  ThemeSwitch.tsx          theme menu, shuffle, circular theme wipe
  Demo.tsx                 ?demo=<key> previews opened from dashboard pop-ups
lib/
  settings.ts              types, defaults, EFFECTS list, THEMES, MOODS, skinScript (runs in <head>)
  help.ts                  text for the dashboard's (i) pop-ups
  data.ts, db.ts, schema.ts   queries, connection, tables + starter content
  auth.ts                  login
  contentStyle.ts          size and look controls: types, limits, how the three levels merge, what goes on a card
app/admin/(panel)/banner/  dashboard page for the hanging banner (stored in settings.banner)
```

A new column goes in `SCHEMA` in `lib/schema.ts` as `ALTER TABLE … ADD COLUMN IF NOT EXISTS`; it runs by itself on the first request after a deploy. `sections.ribbon` controls the sliding headline per section; `reactions.name` is who reacted.

Tables: `settings` (one JSON document), `sections`, `items`, `files`, `messages`, `votes`, `reactions`, `stats_daily`, `section_views`, `presence`. Created automatically on first use. New settings fields need no migration because `mergeSettings` fills in defaults.

## How the look works

- Colours are CSS variables on `.site`. `html[data-skin]` swaps them for the 30 themes (10 in `site.css`, 20 fan themes in `themes.css`, where a few tokens set by each theme derive the rest), and `--m` / `--m-deep` (inline on `.site`) carry the mood colour. Use `var(--mint)`, `--fg`, `--bg`, `--card`, `--line`, `--hero-*`, `--pop2`, `--pop3`. Never hard-code a colour; it has to work on every theme, including the light heroes (`paper`, `candy`).
- `skinScript` runs before first paint: it sets the theme, adds the page-transition opt-in, and decides whether the curtain plays.
- Public pages navigate with plain `<a>` (full page loads), so page transitions are cross-document view transitions. Every effect starts fresh on each page.

## Adding a theme

Each classic theme also has its own hanging banner in `app/banner.css`. A theme without a block there gets the plain cloth.

**The 20 fan themes are under maintenance:** not selectable by visitors (`LIVE_THEMES` and `SELECTABLE` in `lib/settings.ts`), still reachable with `?theme=<key>`. To bring one back, add it to `LIVE_THEMES`. Plan: improve them one at a time when the owner asks, starting by asking them for that theme's pictures, GIFs, cut-outs and logos.

Add the key to `FAN_THEME_KEYS`, `SKIN_LABELS`, `SKIN_INFO`, `SKIN_GROUPS` and `THEME_FONTS` in `lib/settings.ts`; add its block to `app/themes.css` (and to the two shared `:is()` lists at the top); add its entry to `CONFIGS` in `themeScenes2.ts`; put scenery and figure SVGs in `public/themes/art/`. Use only original art or free-licensed pictures, and record the licence in `lib/themeCredits.ts`. Measure scrolling afterwards.

**Picture rule:** no official character art and no photos with doubtful licences, whatever the source. Commons licences are only as reliable as the uploader, so skip professional-looking shots from social-media-sized uploads. The owner can add their own pictures under Dashboard → Theme pictures, which is their decision.

## What every card must do

Show everything the entry holds that fits a card: subtitle, date, place, mood, status, tags and its buttons (`LinkButtons`). Open its full page when clicked (`CardLink`, inside `Box`'s `.flow`), while reactions, polls, the expand button, video controls and links in the text stay above that link with `z-index`. Pass `to` to `Box` for the "Full view" button in the card's bar, or use `FullView` in a `.card-foot.plain` outside `Box`; every card has it. "Scroll for more" shows on every scrollable card whenever it's at its top. Anything hover reveals needs another way on phones (see the flip cards' first tap, and `.ph-info` under photos). The dashboard's order list (`OrderList`) shows entries in the exact order visitors see.

## Opening a card

All in `skinScript` (`lib/settings.ts`), under the `pagefx` switch, because a click can come before the page's own code has loaded; the look is under "opening a page" in `site.css`. A click gives the card `.opening` (press and glow) and adds `.nav-progress`. On `pageswap` the card is named `open-card`; on `pagereveal` a full-screen `.vt-panel` takes that name, so the card grows to fill the screen, turns into the panel, and the panel fades onto the page. Back adds `html.vt-back`: the page shrinks away and, if the card is still on screen, it lands. Pages start loading on hover through speculation rules (a `prefetch` link in browsers without them), and entry pages are cached after their first visit (`revalidate` and an empty `generateStaticParams`; dashboard changes clear them). Firefox gets only the press and the bar. To see it, film with `Page.startScreencast`: screenshots are too slow to catch it and can hang.

## The dashboard's Save box

`SaveBox` (`components/admin/SaveBox.tsx`): the same card as the Delete box, title on the left, one or two buttons then Save on the right, floating at the bottom of the screen within its own form. `LookControls` has its own copy with a Default button. `.adm-content` scrolls with 60px of bottom padding, so it needs `bottom: -46px` to sit just above the edge. The owner rejected two other versions: a strip across the screen, and a plain row that doesn't float.

## Size and look controls

Three levels, the most specific wins: all content (`settings.contentStyle`), a section (`sections.style`), one entry (`items.style`). `lookOf(mergeStyles(...))` in `lib/contentStyle.ts` gives a card its class, CSS variables (`--cw`, `--row-h`, `--pic`, `--fs`, `--fx`, `--fy`) and what to hide. They're set once when the page is made, so they cost nothing while scrolling. Limits live in `cleanStyle` and `LIMITS` and run on the server too: a card can't pass 72% of the window's height or, on phones, 82% of its width, because that would bring back cards outgrowing the screen. With nothing set, a card has no extra class or style. Don't add a "hide reactions" option: the owner wants the bar always visible.

## Adding or changing an effect

Every visual effect has a switch on the Appearance page. To add one:

1. Add `{ key, group, label }` to `EFFECTS` in `lib/settings.ts`. It defaults to on, and the Appearance page and save action pick it up automatically.
2. Add its pop-up text to `lib/help.ts` with `preview: "/?demo=<key>"`.
3. Add its preview to `components/site/Demo.tsx`.
4. Implement it. For CSS-only effects, add the key to `LOOKS` in `Chrome.tsx` and scope the CSS under `.site.fx-<key>`. For JS, pass the flag through `Living` in `Chrome.tsx` into `hoverFx.ts` or `scrollFx.ts`.

## Keeping scrolling smooth

- **Never ask the browser for a position during a frame.** `window.scrollY` and `getBoundingClientRect` make it finish its styles on the spot, so each one after a change is an extra style pass. Read with `pageY()` from `fx.ts`, keep element positions with `docTop()` (refreshed by a `ResizeObserver` on `body`), and write in `requestAnimationFrame`, never in a scroll event.
- **No `:has()` on a large or always-changing element.** `.site:has(.hang)` restyled 800+ elements whenever anything on the page changed. Use a plain class.
- **Each running animation is restyled every frame the page draws,** even one the graphics card moves. Decorative loops rest while scrolling (`html.scrolling` in `site.css`); add long-running decoration to that list.
- **A 3D transform makes an element its own layer, even when invisible.** Off-screen title letters were 162 layers. Keep waiting states flat (`.sleep .split-host`).
- **A phone's address bar sliding away fires `resize`.** Don't rebuild on it: check the width changed (see `SideRow`, `ThemeFx`, `scrollFx`).
- **Compare old and new builds side by side.** Copy `.next`, `package.json`, `next.config.mjs` and `public` to a scratch folder, link `node_modules`, run `next start -p 3001` there, and alternate between the two. Headless Chrome isn't limited to the screen's refresh rate, so "busy %" misleads: compare frames per second, milliseconds of work per frame and frames over 50ms. Scroll a phone test with `Input.dispatchTouchEvent`; `Input.synthesizeScrollGesture` doesn't move this page. Turbopack refuses a linked `node_modules`, so to build an older version, commit everything, `git checkout` the tag, build, copy `.next` out, and check out `main` again.

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

- **Check a new CSS class name isn't already used.** The map's stops were `.stop`, the side menu's class, which stretched the menu to 300px and pushed its dots left. It looked like a different bug until someone looked. The map's stops are now `.mstop`.
- **Nothing may be added inside `.site` before React has started,** or its start-up fails (error 418). Scripts in `<head>` add to `<body>` directly (see `.vt-panel`, `.nav-progress`), and copy the theme's colours over because those are set on `.site`.
- **A view transition's new image covers its old one at once** unless the new one fades in. That blanked the clicked card as soon as it started growing.
- **In a 3D row, a card's parent box can catch the mouse before the card,** and `elementsFromPoint` won't show it: only real mouse events do. Check with events, and give wrappers `pointer-events: none` (see `.mstop`). Anything fixed over the page must not catch the mouse with invisible parts either (see `#rail`).
- **Don't read `scrollTop` back to animate it.** The browser rounds it, so small steps stall on fast screens and the loop never ends. Keep the exact position yourself (`gliding` in `scrollBoxes.ts`).
- **Pictures are never cut.** Cards use `object-fit: contain` and their real shape, up to 66% of the card's height. Only the tiny thumbnails (flip cards, plain lists, entry-page gallery) still crop.
- **A photo wipe makes the picture its own layer,** so anything inside it sits under the card's link and can't be clicked. Put buttons beside it, in `.pic-box`.
- **A card never grows.** Its contents go in `Box` (`SectionBody.tsx`): the shell keeps its size (`--row-h`), `.scrolly` scrolls, and `.card-link` sits inside `.flow` so a finger can still scroll a card that is clickable everywhere. The reaction bar goes in `Box`'s `foot`, outside the scrolling part, so it's always visible.
- **Don't run an animation forever on things there are many of.** Each animated emoji is its own layer. The reaction wave is a short class added to a few on-screen bars at a time (`reactfx` in `hoverFx.ts`).
- **Don't start animations while the page is scrolling.** Waving reaction bars as they came on screen cost about 10% of the frames; they now wait until scrolling rests.
- **A card's 3D tilt moves what's on it.** Small buttons near a card's edge slide out from under the mouse, so `hoverFx.ts` skips tilt over `.card-foot` and `.reacts`. Anything small and clickable near a card's edge needs the same.
- **`onAnimationEnd` hears animations from children too.** Check `ev.target === ev.currentTarget`, or an emoji's move ends the button's pop.
- **Inside a 3D row, the browser's own scrolling and hit-testing can't be trusted.** Part of a turned card sits behind the row's flat surface, so the row caught clicks (hence `pointer-events` in the `pin` CSS) and the browser sent the wheel to the page (hence the hand-driven glide in `scrollBoxes.ts`).
- **`.scrolly` is the exception to the rule below:** no `data-lenis-prevent` and no `overscroll-behavior: contain`, because the page must carry on once a card's text ends. A wheel already moving the page keeps moving it, so a row passing under the mouse doesn't catch on every long card.
- **Rows add page height after loading,** which strands `/#section` links and Back. `keepPlace` in `SideRow.tsx` puts the visitor back, re-checking for 4 seconds. A row's `reveal` is on its sticky stage, because a tall or moved element may never reach the reveal threshold and would stay invisible.

- **Anything that scrolls inside the page needs `data-lenis-prevent` and `overscroll-behavior: contain`.** Otherwise smooth scrolling takes the wheel and the page moves instead (see the theme menu).

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
- **Keep heavy libraries out of the first load.** three.js is behind dynamic `import()`, and the site must stay complete if it fails to download.
- **Respect `prefers-reduced-motion`.** `Living` doesn't start at all, the 3D never loads, and the curtain is hidden.
- **Don't mutate React-managed text.** DOM effects may only touch server-rendered static nodes, or use `style`/`classList` on client ones.
