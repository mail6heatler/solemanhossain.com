# Progress

The running log. Read this after `CLAUDE.md`, and update it at the end of every piece of work.

## Current state

- **Live:** https://solemanhossain.vercel.app, with the Lively Update (below) waiting on the owner's decision.
- **Restore point:** git tag `before-lively-update` (commit `1c9f3c7`). The last production deployment before the update is `solemanhossain-n4e486bkd-muzan-vercel.vercel.app`.

## Decision waiting on the owner

Keep or undo the Lively Update, after they've seen it live.

- **Keep:** nothing to do. Individual effects can be turned off in `/admin/appearance`.
- **Undo:** revert the update's commits on `main`, push, and redeploy. See "Deploying" in `CLAUDE.md`. Settings and content are untouched either way, because the update only added effect switches.

## Log

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
- No console errors and no sideways scrolling.

Limits of that testing:

- The test machine has no GPU, so 3D smoothness on real hardware is untested. The sculpture lowers its own detail on slow machines.
- Local data has only 2 trips and no real photos, so the sideways strip was tested with temporary copies in the browser.

## Ideas not done yet

- Sound toggle (soft hover and click sounds).
- Using a section's own photos inside the 3D scene.
- A curved or wavy chapter edge instead of rounded corners.
