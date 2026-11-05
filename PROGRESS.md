# Progress

The running log. Read this after `CLAUDE.md`, and update it at the end of every piece of work.

## Current state

- **Live:** https://solemanhossain.vercel.app, including the Lively Update (below), which the owner chose to keep on 2026-11-04.
- **Restore points:** git tags `before-hanging` (before the hanging photo and maintenance), `before-themes` (commit `16898bc`, before the 20 fan themes), `before-update-3` (commit `58fecd5`, before Update 3), `before-update-2` (commit `0d20e6a`) and `before-lively-update` (commit `1c9f3c7`).
- **Deploys:** pushing to `main` deploys to production automatically, in about 30 seconds.
- **Live settings:** the owner changes the default theme and the visitors' theme button often (Techy, then Paper, then Playful with the button on, as of 2026-11-05). Check the site's `<head>` script (`"d":`, `"sw":`) before relying on them. Techy and Paper have straight-edged chapters.

## Decision waiting on the owner

Keep or undo the hanging photo and paper buttons (below), after they've seen it live.

- **Keep:** nothing to do. Record it here.
- **Undo:** run `git revert --no-edit` on those commits on `main` and push; that redeploys by itself. That also brings the 20 fan themes back to visitors, so re-apply maintenance if the owner still wants it. No database change was made.

## Agreed for later

Improve the fan themes one at a time, when the owner brings it up. For each, first ask for that theme's whole package (pictures, GIFs, cut-outs, logos), then build with what they send. Not started.

## Log

### 2026-11-06: Hanging photo; 20 fan themes under maintenance

The owner wants the 20 fan themes improved one by one later, so visitors can't pick them for now: they show greyed out in the menu, aren't in Random or shuffle, can't be the default, and a visitor who had chosen one falls back to the site default. `?theme=<key>` still previews them.

The hero photo now hangs from the menu bar (`.hang` in `app/page.tsx`, under the `sticker` switch): taped, sways, swings on scroll, scrolls away with the page. Résumé and Say Hello sit beside it as paper cut-outs. The sculpture moved to the open space below. The owner has uploaded a transparent cut-out photo. The Résumé button still needs a résumé uploaded.

### 2026-11-06: Theme menu scrolling

The mouse wheel over the theme menu scrolled the page instead of the list, because Lenis took the wheel. Fixed with `data-lenis-prevent`, plus `overscroll-behavior: contain` so reaching the end of the list doesn't move the page.

### 2026-11-05: 20 fan themes (kept by the owner)

Messi, Batman, Spider-Man, Max Verstappen, Khabib, Arthur Morgan, Naruto, Jack Sparrow, Dabbe, Salman Khan, Palestine, Islamic, Travel, Power Rangers, Tom and Jerry, Ben 10, Bangladesh, Game of Thrones, Harry Potter, Interstellar. The owner gave a blanket go-ahead before going to sleep, so all 20 shipped as one release instead of the 4 batches first proposed.

Each theme has its own colours, fonts, drawn scenery and moving figure on the first screen, chapter pattern where it suits, sliding-headline style, living background, click burst and banner drop. All existing effects work with them. 30 themes in total; the menu is grouped.

**Pictures, as agreed with the owner:** official character art was not used, even though they offered blanket permission, because that permission isn't theirs to give. All scenery and figures are original drawings (`public/themes/art/`), so they suggest the subject rather than copy it. 7 themes use free pictures from Wikimedia Commons, licences read from each file's record and credited in the footer (`lib/themeCredits.ts`): Messi, Verstappen, Interstellar, Bangladesh, Palestine, Islamic, Travel. Salman Khan and Khabib have no photo: the free-labelled candidates looked like professional shots with doubtful licences, or included bystanders or a head of state. Dashboard → Theme pictures lets the owner add their own picture to any fan theme (`settings.themePics`), and that's their decision. Fan themes show an "unofficial fan theme" line in the footer.

**Scrolling:** all 20 measured about the same as Paper in the same session (39 to 52 fps, 0 to 5 frames over 50ms, with this PC capped near 48 fps at the time), so they didn't bring the lag back. Photos and fonts download only for the active theme.

**Sensitive themes:** Islamic has no figures and no scripture used as decoration. Palestine is kept dignified, with slow olive leaves only. Dabbe has no jump scares or harsh flashing.


### 2026-11-05: Update 3 (kept by the owner)

The owner kept Update 2 and asked for two things.

**Smooth scrolling.** Measured with the real graphics card on the live site, Paper theme, wheel-scrolling the whole page:

| | Before | After |
|---|---|---|
| Frames per second | 29.5 | 64.9 |
| Frames slower than 50ms (big stutters) | 57 | 3 |
| Worst single frame | 118ms | 83ms |
| Simulated weak device (4x CPU slowdown), frames per second | 6.2 | 12.8 full version, 19.2 lighter version |

On the weak device those are page frames; the lighter version uses native scrolling, which keeps moving even when page frames lag. No single effect caused it: with nearly everything off the page reached 90 fps, and each effect cost a little. What changed, keeping the same look:

- Ribbon lean: was writing a custom property read by 160+ text pieces, per frame, on all bands. Now skews one track, only on screen, only when the value changes. Marquee motion moved to the `translate` property so the two can't conflict.
- Off-screen sections and ribbons rest (`.sleep`): animations paused, decorations hidden.
- Paper grain: no more full-screen `mix-blend-mode`. Techy and Retro sweeps: one strip moving instead of repainting the screen.
- Menu bars, back-to-top button, tape, badges: `backdrop-filter` removed; the bars are slightly more opaque instead.
- Chapter motion: only chapters near the screen are measured, nothing runs when settled, and `will-change` is set only while moving.
- Progress bar scales rather than changing width. Timeline and sideways strip cache positions and skip when off screen.
- Theme canvas drops to 20 fps while scrolling. Retro's canvas shadows replaced with a cheap two-line glow.
- Floating emojis lost their drop shadow (barely visible at their opacity). The menu's pulsing dot is now a scaling ring.
- Lenis `lerp` 0.11 to 0.14, so the page responds to the wheel a little sooner.

**Lighter version** (`autolite`, `html.lite`): a device under about 25 fps for several seconds of scrolling loses the heaviest effects for that visit and gets native scrolling. Content, themes, ribbons and hover effects stay. Tested: a normal device never triggers it; at 6x slowdown it triggers and leaves nothing half-hidden.

**Things fall from the banner** (`bannerfall`, `bannerFall.ts`): when it's pulled, and while dragging. Ocean: water with splashes. Paper: sheets. Techy: code. Retro: pixels. Sunset: embers. Forest: leaves. Candy: sweets. Playful: shapes. Night: stars. Day: petals. Off for reduced motion.

An earlier note said the test machine had no graphics card. That was wrong: earlier tests ran in software mode, and this PC has one.

Limits: measured in Chrome on this PC only. Real phones, Safari and Firefox are unchecked, and the "weak device" figure is a simulated 4x CPU slowdown on this PC.


### 2026-11-05: Update 2 (kept by the owner)

What the owner asked for, and what was built:

- **Cursor only ever said "Open".** It now has 25+ labels (Explore, View, Read, React, Vote, Drag, Jump, Visit, Email, Send, Download, Surprise, Shuffle, Pull…). Small targets show a chip beside the ring. Floating emojis now sit above page text on computers, so they can actually be grabbed; before they were mostly unreachable.
- **Hero photo floating with a border** (`sticker`): white border, tape, tilt, floats over its own shadow, slaps on at arrival. A transparent PNG gets a border that follows its outline.
- **Uploads used to turn every photo into JPEG**, which wiped out transparency. Pictures with real transparency now stay transparent (WebP).
- **Sliding headline on every section**, hideable per section (Appearance page or Section settings). New column `sections.ribbon`. Each theme styles it differently.
- **Theme effects** (`themefx`): a canvas behind the content plus CSS touches. Ocean: waves, bubbles, light. Techy: falling code, a fake break-in, glitching titles. Retro: neon grid, scanlines, flicker. Paper: grain, scraps, plane, ink. Sunset: climbing sun, embers, birds. Forest: leaves, fireflies. Candy: bubbles, sprinkles. Playful: shapes. Night: stars. Day: warm light, dust. Clicking makes a burst in that theme's style.
- **Every chapter moves while scrolling** (`sectionfx`): rises in, then leaves by shrinking, tipping, sliding or swinging. Chapters at rest have no transform at all. The photo viewer moved out of the chapter (portal) because of this.
- **Hanging banner** (`/admin/banner`, `settings.banner`): pull-down tab, spring physics, swings with scrolling and the mouse. Types: emergency, coming up, news, celebrate. Optional countdown, button, auto take-down. Drops by itself once per announcement if set. **It's off until the owner writes one.** `/?demo=banner` previews it: the owner sees their saved text, anyone else a sample.
- **Reactions need a name** (`askName.ts`, `reactions.name`): asked once, remembered in the browser, enforced on the server, shown in the bell, inbox and overview. Only the owner sees names. Older reactions keep their Visitor tag. **Polls don't ask for a name:** they send no notification and weren't part of the request, so the owner may want to decide.

Checked on the local copy in Chrome (desktop and phone sizes): cursor labels, all 10 themes, section motion, name box, banner (drag, tap, keyboard, auto-drop, scroll-away), hiding one headline, transparent upload, photo viewer mid-move, reduced motion, no JavaScript. The live site was checked read-only.

Limits: the test machine has no GPU, so smoothness on real hardware is unchecked; the theme canvas and 3D lower their own load on slow machines. Safari and Firefox are untested. A name is only what the visitor typed.

### 2026-11-04: Lively Update

The owner asked for a livelier site (transitions, text, scrolling, hover, 3D) with everything else kept the same. Added 22 effects, each with a switch, help pop-up and preview. All default to on, which makes 50 in total.

| Group | Effects (`key`) |
|---|---|
| Transitions | Opening curtain (`intro`), pages glide (`pagefx`), theme spreads from the click (`themewipe`) |
| 3D | Particle sculpture with six morphing shapes (`hero3d`), card tilt and glare (`cardtilt`), curved photo trail (`coverflow`) |
| Text | Headline letters react to the mouse (`kinetic`), titles rise letter by letter and labels decode (`splittext`), subtitles fill word by word (`wordscrub`), giant footer name (`footername`) |
| Scrolling | Hero sinks away (`heroexit`), stacked-sheet chapters (`sheets`), giant drifting chapter marks (`ghost`), ribbons (`ribbons`), ribbons react to scroll speed (`velocity`), photo wipes and drifting grids (`imgreveal`), progress ring (`totop`) |
| Hover | Cursor grows and labels clicks (`smartcursor`), lit borders (`spotlight`), background glow (`ambient`), colour pours into buttons (`liquid`), sliding menu highlight (`navpill`) |

Also changed:

- Magnetic buttons now work across the whole site.
- Cards now arrive one at a time as each scrolls into view, with a 3D entrance.
- The timeline gained a glowing comet, and the photo orbit rings were added around the avatar.
- Added a `<noscript>` safety rule, and moved the view-transition opt-in into `<head>`.

New dependencies: `three`, `gsap`. Both load on demand, so the first page load stays light.

Checked in a real browser (Chrome, desktop and phone sizes) on the local build:

- All 10 themes, hover and click behaviour, menu links, back to top, page transition and theme wipe (filmed frame by frame, no white flash).
- Reduced motion, no JavaScript, and the 3D and scroll libraries failing to download.
- The dashboard: all 50 switches, help pop-ups, previews, and switching effects off and back on (local copy only).
- The live site with real content: desktop and phone walk-through, no console errors and no sideways scrolling.

Limits of that testing:

- The test machine has no GPU, so 3D smoothness on real hardware is untested. The sculpture lowers its own detail on slow machines.
- Tested in Chrome only, so Safari and Firefox are unchecked.
- The pinned sideways strip needs about 4 or more trips. The local copy has 2 and the live site has 3, so it was tested with temporary copies in the browser.

## Ideas not done yet

- A one-click "remove background" button in the dashboard, so any photo becomes a cut-out.
- A name on poll votes, if the owner wants it.
- Sound toggle (soft hover and click sounds).
- Using a section's own photos inside the 3D scene.
- A curved or wavy chapter edge instead of rounded corners.
