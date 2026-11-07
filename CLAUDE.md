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

There is no test suite. On this PC (7.4 GB of memory, often under 2 free), one test browser opening many pages can crash or hang while the site is fine, so start a new browser per page in long runs and use `timeout`. Verify visually: drive the site with `playwright-core` from a scratch folder (never add it to this project) using the installed Chrome (`C:/Program Files/Google/Chrome/Application/chrome.exe`). Launch with `--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist --enable-gpu-rasterization` to use this PC's real graphics card; never judge smoothness in software mode. Stub `/api/track` and `/api/presence` when testing the live site so tests don't count as visitors.

**Pictures blank in a test browser?** After many automated runs, Vercel's Blob host can answer the browser with "Vercel Security Checkpoint" (403, `x-vercel-mitigated: challenge`, shown as `ERR_BLOCKED_BY_ORB` on an `<img>`), though curl and other networks still get the image. It isn't the site. Open the picture's URL directly in the test browser to check, and don't read blank cards as a bug until that passes. Seed test data with pictures the test serves itself (`page.route`, which can also delay them to test late loading), and go easy on repeat runs against the live site.

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
  SectionBody.tsx          the 10 section layouts, including the milestones map (`milemap`, a timeline as stops on a trail), app windows (`windows`) and boarding passes (`tickets`)
  Dock.tsx                 the icons under a desktop of app windows; a click sends "row-go" to its SideRow, which answers with "row-at"
  TicketRider.tsx          the vehicle travelling the route above boarding passes; it rides inside the row's track (`data-rider`, so SideRow doesn't count it)
  vehicles.tsx             the drawn vehicles, and which one an entry gets from its tags or words
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
  SideRow.tsx              the homepage's row of cards: never wraps; if it doesn't fit it glides by itself, with arrows and a small counter (see "Rows that don't fit")
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

`settings.ribbonSize` (Appearance page, `RibbonSize.tsx`) sets how thick the sliding belts are: a percentage that becomes `--rib` on each belt, multiplying its screen-based `--rib-fs` and `--rib-pad`. A theme changing the belt's size sets those two tokens, never `font-size` or `padding`, or the slider stops working there.

A new column goes in `SCHEMA` in `lib/schema.ts` as `ALTER TABLE … ADD COLUMN IF NOT EXISTS`; it runs by itself on the first request after a deploy. That list runs again on every deploy, so a change to live content that must happen once (a section's new look) goes through `done_once`: copy the `made-windows` statement, or it will undo the owner's later choice in the dashboard. `sections.ribbon` controls the sliding headline per section; `reactions.name` is who reacted.

`settings.heroHidden` takes the hero off the homepage. Nothing is deleted, because the name and photo are also used on other pages. Effects must cope with `#hero` being missing, and the first chapter's ribbon is skipped because it would hide under the menu bar. `LivePill` still runs, hidden, because the dashboard's "people here now" number depends on it.

Tables: `settings` (one JSON document), `sections`, `items`, `files`, `messages`, `votes`, `reactions`, `stats_daily`, `section_views`, `presence`. Created automatically on first use. New settings fields need no migration because `mergeSettings` fills in defaults.

## PDFs on entries

`Media.type` can be `"pdf"`, with `thumb` (a picture of the first page) and `name`. `components/admin/pdfThumb.ts` makes the picture in the dashboard's browser when the PDF is added and uploads it next to the file, so `pdfjs-dist` is only ever downloaded there; check visitors' scripts don't contain `getDocument`. Everything public goes through `Cover`, which shows the picture, kept to its top because that's where a page's title is, or a drawn `.pdf-tile` for a file that couldn't be read. Clicks end at "Open PDF", a new tab; nothing embeds the file, because phones can't show PDFs inside a page and Blob storage's security headers are strict. Headless Chrome answers a PDF with an empty 204 even from a plain file server, so test the file with `ctx.request`, not `fetch` or a click.

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

## Section looks

The owner wants each section to look like what it holds, one section at a time (see "Section makeovers" in `PROGRESS.md`, which has the checklist). A new look is a new value in `LAYOUTS`, so the old look stays a choice under Section settings; `lookOf`, `Box` and `SideRow` still do the work.

**App windows (`windows`, G2):** each project is a `.card.win`, so it keeps everything a card does. Its title bar and address bar (`.win-head`) sit above `Box`, so they don't scroll. A window `isolation: isolate`s itself, or a window behind would paint its scroll line over the one in front. A project with no picture gets `CodeView`, its own details written as code; its subtitle, tags, date and place are then in the code, not repeated below. The `windowfx` switch only controls motion: the pop on arrival (the `.stagger` machinery), the address bar filling, the dock's swell and bounce. New classes here are prefixed (`cd-`, `win-`, `dock-`), because `.c`, `.f` and `.k` are already taken.

**Boarding passes (`tickets`, G3):** each entry is a `.trip.tkt` inside a `.tkt-cell`, which also holds its stretch of the dashed route (`.tkt-stop`), so the route moves with the row. The notches are two circles in the page's colour on the tear line (`--bg`, or `--bg-2` on `.chap.alt`), not a mask, which would also cut off the ticket's shadow. The top part has a fixed height (`--tear`), because the tear line has to line up with it, and the route names are in the body font, because the wide display fonts split words at that size. The vehicle moves only by a CSS transition on `transform`. When the row is sliding it follows "row-at"; when everything fits it tours the tickets, there and back. It goes to a ticket the mouse is really on (the same `movementX` rule as the row). Its stamp comes from Status, otherwise Visited if there's a date, or Next stop for bucket-list words, otherwise none, so nothing claims a trip was made without a date.

## Rows that don't fit

All in `SideRow.tsx`; the owner asked for this on 2026-11-07, replacing the row that held the page still while the wheel moved it (that left a huge gap above the cards). If the cards fit, nothing moves. If not, the row glides by itself at about one card every 8 seconds while it's on screen, waits 1.6s at each end and turns back. Arrows go to the next card at once and keep going that way. **The plain mouse wheel only moves the page; don't make it move a row.** Rows are flat: no curve, fly-in or lean.

- **Two ways of moving (`byHand`).** Computers use `transform` on the track, because a slow glide needs fractions of a pixel and the browser's scrolling snaps to whole ones on most laptop screens. Anything with a touch screen (`any-pointer: coarse`) and reduced motion use the browser's scrolling, because only that follows a finger. It rests on a whole pixel, or text stays soft.
- **What makes it wait:** a mouse really moving over it, a finger, keyboard focus inside it, a wheel over it, the page scrolling (`html.scrolling`), the full-screen viewer or a `<dialog>`. It doesn't run at all with reduced motion, on `html.lite`, or with the `sideways` switch off; arrows then move one card and stop.
- **The mouse pause needs real movement** (`movementX`/`movementY`). Chrome sends a pointer event when the page brings a row under a resting mouse, and without this check a mouse left mid-screen would stop every row as it arrives.
- **Check "on screen" on `.side`, never the track.** The track moves and travels off the side of the screen, and the observer then calls the row off screen.
- **Back and reload** restore the row's place from sessionStorage (`lc_row:<path>:<index>`).
- **To test it:** keep the mouse on the menu bar when it should be away. A spot beside the cards is still inside the track, so the row correctly waits. `next start` serves a homepage made at build time, so after seeding a throwaway database, save any dashboard page to rebuild it. The live site has few cards, so seed enough to overflow every layout.

## Opening a card

All in `skinScript` (`lib/settings.ts`), under the `pagefx` switch, because a click can come before the page's own code has loaded; the look is under "opening a page" in `site.css`. A click gives the card `.opening` (press and glow) and adds `.nav-progress`. On `pageswap` the card is named `open-card`; on `pagereveal` a full-screen `.vt-panel` takes that name, so the card grows to fill the screen, turns into the panel, and the panel fades onto the page. Back adds `html.vt-back`: the page shrinks away and, if the card is still on screen, it lands. Pages start loading on hover through speculation rules (a `prefetch` link in browsers without them), and entry pages are cached after their first visit (`revalidate` and an empty `generateStaticParams`; dashboard changes clear them). Firefox gets only the press and the bar. To see it, film with `Page.startScreencast`: screenshots are too slow to catch it and can hang.

## The dashboard's Save box

`SaveBox` (`components/admin/SaveBox.tsx`): the same card as the Delete box, title on the left, one or two buttons then Save on the right, floating at the bottom of the screen within its own form. `LookControls` has its own copy with a Default button. `.adm-content` scrolls with 60px of bottom padding, so it needs `bottom: -46px` to sit just above the edge. The owner rejected two other versions: a strip across the screen, and a plain row that doesn't float. In section settings it sits outside the settings card, directly above the Delete box. On an entry's page it's outside the form altogether (`form="entry"` on the button), directly above the Delete box and after Size & look and Reactions, and it floats over all of them. While Size & look is open, that panel's own box (`.look-actions`) covers it at the same width. The Size & look panels keep theirs inside, because it saves only that panel. The hero page's box doesn't float (`still`): the owner wants it resting at the end of the page, above the Remove box.

## Asking before anything risky

Use `ConfirmSubmit` (`components/admin/Widgets.tsx`), never the browser's `confirm()`: a box in the middle of the screen with a title, what will happen, Cancel and a red "yes" button. Cancel takes the focus, so an accidental Enter is safe; Esc and a click outside also cancel.

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
- **Rows stay flat.** Reshaping cards every frame made phones redraw them: removing it took a swipe from 42 to 118 fps, and from 65 stutters to 3 on a slower device. Measure a swipe on its own (see `Input.dispatchTouchEvent` above), because scrolling past rows doesn't show this. Rows have no scroll snap: even `proximity` pulled a short swipe back to the card it left.
- **Set `playbackRate` only when the value changes**, and only on what's on screen. Each write resynchronises the animation.
- **Slow devices get `html.lite`.** `Effects.tsx` watches frame times while scrolling; under about 25 fps for several seconds it sets the class, stores `lc_lite` in sessionStorage and fires `lc-lite`. Anything heavy must check the class at start and stop on that event. To add to it, see `ThemeFx`, `HeroScene`, `Living` and the `html.lite` CSS.
- **Anything that spawns things must have a cap.** `bannerFall.ts` once had splashes that made more splashes, and it froze the page.

## Rules learned the hard way

- **The menu bar must fit at every width from 961px, in every theme, with the longest name.** Fonts differ a lot between themes. Below 1300px the links drop their emojis, and the name shortens (`.brand-text` clips) before the links would run off the edge. Don't test the name by changing its text: React crashes. Set it with CSS (`::after`).
- **Check a new CSS class name isn't already used.** The map's stops were `.stop`, the side menu's class, which stretched the menu to 300px and pushed its dots left. It looked like a different bug until someone looked. The map's stops are now `.mstop`.
- **Nothing may be added inside `.site` before React has started,** or its start-up fails (error 418). Scripts in `<head>` add to `<body>` directly (see `.vt-panel`, `.nav-progress`), and copy the theme's colours over because those are set on `.site`.
- **A view transition's new image covers its old one at once** unless the new one fades in. That blanked the clicked card as soon as it started growing.
- **Anything fixed over the page must not catch the mouse with invisible parts** (see `#rail`).
- **Don't read `scrollTop` back to animate it.** The browser rounds it, so small steps stall on fast screens and the loop never ends. Keep the exact position yourself (`gliding` in `scrollBoxes.ts`).
- **Pictures fit the card.** Full width in their real shape, and only what's taller than 66% of the card's height is trimmed (`object-fit: cover`), so there are no empty bars. This was the owner's choice on 2026-11-07, replacing "never cut". "Show whole" (`.fit-whole`) never trims, and the expand viewer and entry page always show all of it.
- **A picture holds its place before it loads** (`aspect-ratio: auto 4 / 3`: 4:3 until then, its real shape after). Without this, a late picture made its row and everything below it jump, and links stopped short. New picture styles on cards need it too.
- **The browser's lazy loading only looks up and down the page,** so a card coming in from the side starts its picture on arrival. `loadAhead` in `SideRow.tsx` sets `loading="eager"` on cards up to one screen past the edge, once the row is within half a screen below the view, a few at a time, to spare phones' data. Starting a whole screen away in both directions cost phones 64 to 56 fps while scrolling; this start doesn't (82.5 and 81.5, 0 stutters both).
- **A link to a section keeps aiming** until the page settles (`aimAtLink` in `Effects.tsx`), because anything changing the page's height during the glide moves the target. Any click, wheel, touch or key ends it, so it never pulls a visitor back.
- **A photo wipe makes the picture its own layer,** so anything inside it sits under the card's link and can't be clicked. Put buttons beside it, in `.pic-box`.
- **A card never grows.** Its contents go in `Box` (`SectionBody.tsx`): the shell keeps its size (`--row-h`), `.scrolly` scrolls, and `.card-link` sits inside `.flow` so a finger can still scroll a card that is clickable everywhere. The reaction bar goes in `Box`'s `foot`, outside the scrolling part, so it's always visible.
- **Don't run an animation forever on things there are many of.** Each animated emoji is its own layer. The reaction wave is a short class added to a few on-screen bars at a time (`reactfx` in `hoverFx.ts`).
- **Don't start animations while the page is scrolling.** Waving reaction bars as they came on screen cost about 10% of the frames; they now wait until scrolling rests.
- **A card's 3D tilt moves what's on it.** Small buttons near a card's edge slide out from under the mouse, so `hoverFx.ts` skips tilt over `.card-foot` and `.reacts`. Anything small and clickable near a card's edge needs the same.
- **`onAnimationEnd` hears animations from children too.** Check `ev.target === ev.currentTarget`, or an emoji's move ends the button's pop.
- **`.scrolly` is the exception to the rule below:** no `data-lenis-prevent` and no `overscroll-behavior: contain`, because the page must carry on once a card's text ends. A wheel already moving the page keeps moving it, so a row passing under the mouse doesn't catch on every long card.
- **Rows add a little page height after loading (counter and arrows), and late pictures add more,** which strands `/#section` links and Back. `keepPlace` in `SideRow.tsx` puts the visitor back, re-checking for 4 seconds. A row's `reveal` is on its stage, because a moved element may never reach the reveal threshold and would stay invisible.

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
- **Keep sections `overflow: clip`, not `hidden`.** A `hidden` box can still be scrolled by the browser, so keyboard focus on a card past the edge of the screen would push the whole section sideways.
- **Don't make `#hero` sticky.** Scroll-spy and `#hero` anchors break; the sink-away effect is a transform on `.hero-inner`.
- **Letters must not be split in scripts that join them.** Bangla and emoji sequences stay whole words: use `isSplittable` from `Split.tsx`.
- **View-transition opt-in must be in `<head>`.** In the body it arrives too late and the browser aborts the transition.
- **File names differ only by case at your peril.** `heroScene.ts` beside `HeroScene.tsx` breaks on Windows, which is why the engine is `heroEngine.ts`.
- **Keep heavy libraries out of the first load.** three.js is behind dynamic `import()`, and the site must stay complete if it fails to download.
- **Respect `prefers-reduced-motion`.** `Living` doesn't start at all, the 3D never loads, and the curtain is hidden.
- **Don't mutate React-managed text.** DOM effects may only touch server-rendered static nodes, or use `style`/`classList` on client ones.
