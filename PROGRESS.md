# Progress

The running log. Read this after `CLAUDE.md`, and update it at the end of every piece of work.

## Current state

- **Live:** https://solemanhossain.vercel.app, including the Lively Update (below), which the owner chose to keep on 2026-11-04.
- **Restore points:** git tag `before-update-2` (commit `0d20e6a`, before Update 2) and `before-lively-update` (commit `1c9f3c7`).
- **Deploys:** pushing to `main` deploys to production automatically, in about 30 seconds.
- **Live settings (from the database, as of 2026-11-05):** the site shows the Paper theme with the visitors' theme button off, so the theme wipe has no button to trigger it and stacked-sheet chapters look straight-edged (Techy and Paper have no rounded corners). The owner changes the theme themselves, so check before relying on this.

## Decision waiting on the owner

Keep or undo Update 2 (below), after they've seen it live.

- **Keep:** nothing to do. Record it here.
- **Undo:** run `git revert --no-edit` on Update 2's commits on `main` and push; that redeploys by itself. Content and settings stay. The two new database columns (`reactions.name`, `sections.ribbon`) and the `banner` setting stay too; the old code ignores them, so they do no harm. Names already collected stay in the database, and would show again if the update is restored.

## Log

### 2026-11-05: Update 2

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
