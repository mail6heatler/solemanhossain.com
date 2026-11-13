# Progress

The running log. Read this after `CLAUDE.md`, and update it at the end of every piece of work.

## Current state

- **Live:** https://solemanhossain.vercel.app, including the Lively Update (below), which the owner chose to keep on 2026-11-04.
- **Restore points:** git tags `before-g1-studio` (before G1's dashboard became the live editor, G1 entries got the new full view and the dashboard's colours were softened), `before-g1g2-cards` (before G1's notes and G2's windows followed their subsections), `before-g7g8-looks` (before Life became scrapbook pages and Connect a chat window), `before-g6-photo` (before the cards hung level and the staff card's photo went on top), `before-g6-cards` (before the wall's objects became whole cards), `before-g6-wall` (before Growth became an achievement wall), `before-admin-boxes` (before the dashboard's boxes could be closed), `before-g5-panels` (before each subsection got its own comic panel and polls were voted on in the art), `before-g5-comic` (before Feed became a comic strip), `before-g4-book-cover` (before a cover became the whole book and the page turns went), `before-g4-shelf` (before Influences became the study shelf and sound could be uploaded), `before-g3-pass` (before the real boarding pass, the bucket-list note and the dashboard's pass details), `before-g3-frames` (before Adventures' frames followed each entry's subsection), `before-g3-tickets` (before Adventures became boarding passes on a route), `before-g2-windows` (before Made became app windows on a desktop), `before-pic-links` (before pictures held their place, rows loaded ahead and links kept aiming), `before-auto-rows` (before rows that glide by themselves with arrows, and before an entry's Save box moved above Delete), `before-fit-belt-pdf` (before the bigger menu, thicker belts, pictures filling cards and PDFs on entries), `before-row-feel` (before phone rows went flat, snapping eased and the wheel glide shortened), `before-hero-remove` (before the hero's Save box stopped floating and the Remove box arrived), `before-confirm-box` (before section Save moved above the Delete box and risky buttons got a confirmation box), `before-savebox` (before the floating Save box and moving Inbox in the menu), `before-plain-save` (before the dashboard's Save buttons went back to a plain row), `before-four` (before the side menu, card opening, Full view and action bar fixes), `before-final`, `before-g7-g8`, `before-g6`, `before-g5`, `before-g4`, `before-g3`, `before-g2`, `before-g1` (each section's work, G7 and G8 together), `before-controls` (before the size and look controls), `before-smooth` (before uncut pictures and the smoothness work), `before-reactbar` (before the always-visible, lively reaction bar), `before-rows` (before cards that fit and sideways rows), `before-banner-themes` (before each theme got its own hanging banner), `before-hanging` (before the hanging photo and maintenance), `before-themes` (commit `16898bc`, before the 20 fan themes), `before-update-3` (commit `58fecd5`, before Update 3), `before-update-2` (commit `0d20e6a`) and `before-lively-update` (commit `1c9f3c7`).
- **Deploys:** pushing to `main` deploys to production automatically, in about 30 seconds.
- **Live settings:** the owner changes the default theme and the visitors' theme button often (Techy, then Paper, then Playful with the button on, as of 2026-11-05). Check the site's `<head>` script (`"d":`, `"sw":`) before relying on them. Techy and Paper have straight-edged chapters.

## Decisions for the owner

- The Résumé button opens a PDF named `customer-wise-remaining-balance---24.1.2026.pdf`, which may not be meant for the public. Pointed out three times; it's the owner's to replace, and the old file's link keeps working until it's deleted.
- G7 is empty on the live site and says "Coming soon". Hide it from the menu until it has content?
- The lighter version on slow devices (offered 2026-11-07, not answered, so not made): a refresh brings the full version back; the big G marks stay on slow devices, standing still; it waits about 6 seconds of slow scrolling instead of about 3; the dots stay unless the device is slow while they're on screen. See the log entry of that date.
- The wall shows a test message, "fds", from mail6heatler. It's the owner's content, so it wasn't touched. The placeholder text in G2 and G3 had gone from the live homepage by 2026-11-07.

- Adventures on the live site went from 3 entries to 1 on 2026-11-07, between the tickets and the frames going live: Marathon and Somewhere next no longer show, entry pages 6 and 7 say "not found", and Cox's Bazar lost its date. That release changed no stored data and tests only use a throwaway copy, so it looks like a dashboard edit, and Made went from 2 projects to 4 in the same period. The logs available gave no answer. The owner was asked whether it was them and answered "all good", which was taken as yes and they were told so. By the next release they had added new entries, one for each frame.

## Section makeovers

Agreed with the owner on 2026-11-07: each section should look like what it holds, not cards everywhere, so the whole site feels versatile. **One section at a time.** For each: propose 2 or 3 concrete looks with a recommendation, wait for their "go", set a restore point, build, test, publish, then keep or undo. Record the result here before proposing the next. Never start the next section unasked.

| Section | Holds today | Status | Ideas to offer (not approved) |
|---|---|---|---|
| G1 Me | 5 notes | Good as it is, per the owner | none |
| G2 Made | 4 projects as of 2026-11-07 (2 when it was built) | **Done, kept** (they answered "go" when asked keep or undo, and were told it was taken as keep) | Chosen: app windows on a desktop, with a dock. Not chosen: blueprints, game cartridges |
| G3 Adventures | 5 entries as of 2026-11-07, one in each frame (the owner keeps changing them) | **Done, kept** (they answered "good job, let's go for G4" when asked keep or undo, and were told it was taken as keep) | Chosen: boarding passes on a route with a vehicle travelling along it, then (their requests) a frame for each subsection, Status buttons, a real boarding pass with its details entered in the dashboard, and a bucket-list note with ticks instead of a full bucket (option A: one note per entry). Not chosen: a road-trip map, a passport with stamps, one note listing every bucket entry |
| G4 Influences | 4 entries as of 2026-11-07: a phone, a player, a book with no cover yet, a portrait | **Done, kept** (they answered "everything is fine, we will start G5" when asked keep or undo, and were told it was taken as keep) | Chosen: a study shelf, with a travelling lamp, books, a TV player for songs, music, podcasts, radio and video (their change to my record), framed portraits and phones. Not chosen: a corkboard with a red thread, a nerve line with thought bubbles |
| G5 Feed | 2 entries as of 2026-11-08: a question that isn't a poll yet, and a hot take | **Done, kept** (they answered "after solving this we will get back to our next section" when asked keep or undo, and were told it was taken as keep) | Chosen: a comic strip with a flying brain, then (their request) a different panel for every subsection and polls voted on in the art, both drawn on a private preview first (https://claude.ai/artifact/5fFvbLX1SC2nHktbKoApdh). Not chosen: a chat with their brain, a corkboard |
| G6 Growth | 6 entries as of 2026-11-08, in 3 of its 4 subsections; two look like tests (ABCD, EFGH), with test pictures | **Done, kept** (they went on to G7 and G8 after the level hanging and the staff card's photo on top, and were told it was taken as keep) | Chosen: B, an achievement wall that slides sideways like the other rows, with a travelling spotlight, then (their request) whole cards: an RFID staff card, a certificate, a front page, mended in gold, a star, drawn on a private preview first (https://claude.ai/artifact/Tbrxyt2PsLNuMEWGeKLMJB). Not chosen: a career tree running down the page, a level-up game, a mountain climb; a plaster wall behind the row, which they tried and undid |
| G7 Life | Empty, "Coming soon", as of 2026-11-11 | **Built and live, not tested, waiting for keep or undo** | Chosen: A, scrapbook pages with a pencil travelling along, drawn on a private preview first (https://claude.ai/artifact/QNXFTU8mekyteVLiZhjh1r). Not chosen: a washing line with a bird (too close to Growth's hanging wall), a film roll on a light table |
| G8 Connect | Links (Email, LinkedIn, GitHub), the Say hello form, one note on the wall ("fds"), no testimonials, as of 2026-11-11 | **Built and live, not tested, waiting for keep or undo** | Chosen: D, a chat with them all in one window, which is their B (a step-by-step chat) redone after they found its sending odd and its space empty. Not chosen: a postcard and mailbox, a front door and guestbook, a feed of posts, paper planes |

**Every new look must keep:**
- Everything in "What every card must do" in `CLAUDE.md`: all an entry holds, its page opening on click, reactions always visible, Full view, the expand button, "Scroll for more", nothing that only hover can reach.
- Rows that don't fit keep gliding with arrows, or the look has its own equal way of moving. The plain wheel moves the page only.
- Size & look controls, the dashboard's order list, the "See all" page, and the empty state.
- All 10 classic themes plus Auto, using theme colours, never hard-coded ones. Check `paper`, `candy` and `techy`, which differ most.
- Phones, reduced motion, `html.lite`, and no JavaScript.
- A picture holds its place before it loads, and links to the section still land exactly.
- **No extra testing** (the owner's rule since 2026-11-08): build, push, say plainly that it was built but not tested, and they look at it and say what's wrong. No comparisons, test scripts or screenshot rounds unless they ask, and that includes the comparison once planned after G8. Before designing, read what the live section really holds, because they keep changing it: G5's worst problems only showed with their own "Messi or Ronaldo?".
- Use original art only.
- **The look follows the dashboard's own words.** Say what in the dashboard drives each part, and add a control when one is needed (the owner's rule, from G3).

## Agreed for later

Improve the fan themes one at a time, when the owner brings it up. For each, first ask for that theme's whole package (pictures, GIFs, cut-outs, logos), then build with what they send. Not started.

## Log

### 2026-11-13: G1's dashboard becomes the live editor, with a new full view (waiting for the owner's keep or undo)

They didn't like the first G1 preview: they couldn't tell whether everything they asked for was in it, and it wasn't interactive enough. A second preview had five working options and a checklist of their 17 requests that ticked itself as they tried things (https://claude.ai/artifact/GvNRnu95XxbFDbDPMvBExP). They asked for Workbench and Spotlight together, got that as a sixth option, and said "go for g1. don't forget a single thing belt size etc etc use eye soothing color shade in the admin panel". A live tracker page ran during the build, as they asked (https://claude.ai/artifact/NvUMpxjiKZVuuBazknPqqd).

Built, as explained under "The live editor (G1)" in `CLAUDE.md`:
- **G1's dashboard page is one editor** with two views, Workbench and Spotlight. Labels are drawn over the real card; short parts are typed straight onto it; everything else opens a small editor beside it. The cards are a list with drag, arrows, hide, duplicate, pin, move to a subsection or another section, and delete to a bin. One save bar with Undo, Redo, Discard and Save. Every control from the old section and entry pages is in it, plus belt size and the two movement switches. A ? button lists where each old box went.
- **G1 entries have a new full view** on the site: picture, title, details as stamped cards, pull quote, story, more pictures, tags, buttons, reactions, in a layout (spread, poster, story) or wherever they drag each part. New per-card choices: layout, background, opening, pull quote, hidden parts. New Appearance switch `fullfx`. New column `items.fv`.
- **The dashboard's colours are softer everywhere**: sage page, off-white cards, green-charcoal instead of black, a gentler mint.

Tried once on the local copy before publishing, because it saves their content: typing onto the card, the floating editors, corner resize, reorder, belt size, moving a full view part, save and reload, the homepage and entry page showing it, delete to the bin, and an old entry address landing on its card. No errors. Found and fixed there: the full view preview sat 22px off (a class name clash) and a manual's step numbers were white on white in the full view. Not tried: comments (the local copy has none), uploads, phones, other themes, Firefox and Safari.

Next, when they say: G2's editor the same way, then G3 to G7, then G0 and G8.


### 2026-11-12: Dashboard editors: the G1 preview (waiting for the owner's go)

After G1 and G2's cards were kept, back to the editor. A working preview of the new G1 dashboard (https://claude.ai/artifact/Rg1HEyLNMD5GX54vHSd5YU): the section as on the homepage with labels; every entry as its real card (manual, story, collectible card, sign, plain) with Edit, hide, a ⋯ menu (duplicate, draft, pin, move, open, reset votes, delete) and floating drag-to-reorder (drop on a subsection chip to move it there); ＋ Add card in the section's own design, also from a dropped photo; a labelled editor per card (labels named as the card shows them: Version, Made in, Runs on, Rarity, Paint colour, Sticker) with Card look, resizing by the corner and Size & text; Edit details view, the new "card unfolds" page with its own labels; one save bar with Undo, Redo, Discard, Save; a phone/computer and theme switch, a section health line, subsection chips, select several. Nothing on the site changed.

### 2026-11-12: G1 and G2 cards follow their subsections (waiting for the owner's keep or undo)

Before the new editor, the owner wanted G1 and G2's cards to differ by subsection as G3 to G7 do, since the editor's labels depend on each card. Drawn on a private preview first (https://claude.ai/artifact/AMa4cr5BBLBrspxrNwe2XE); their picks: the unfiltered manual A (instruction manual), beliefs A (protest sign), currently obsessed B (story), random facts A (collectible card), data storytelling B (spreadsheet), code A (editor with a terminal), brain dumps A (notes app), side quests B (pocket console). Built and published without tests, as they asked. Explained under "G1 and G2 cards by subsection" in `CLAUDE.md`. Next: the labelled editor preview built on every section's own cards.

### 2026-11-11: Dashboard editors, step 1: three options for the G1 editor (waiting for the owner's choice)

They asked for live, labelled, full-width editors for every section, starting with G1, with a new design for an entry's full view, and listed what to remove or rework (the Order box, Size & look, Section settings, Reactions & comments, the Save and Delete boxes). Drew three working options on a private preview with placeholder entries (https://claude.ai/artifact/RrLSwQoKn4KkLgpEKjyLYA): A Studio (three columns, a list of parts; full view as a magazine page), B Labelled diagram (entries in a strip, card and full view side by side, labels with lines; full view where the card unfolds), recommended, and C Edit on the page (the homepage row itself, edit in place, a dock; full view as a story). All three share one save bar that appears only when something changed (Undo, Discard, Save, Ctrl+S), delete and reset in each entry's ⋯ menu with the usual confirmation, and drag-to-reorder in the Entries box. The page lists every control on today's G1 pages and where it goes. Nothing on the site changed. G0 and G8 ideas come after G1 to G7, as they asked.

### 2026-11-08: The dashboard's boxes can be closed, and the Saved message always shows

They asked for this before going on to G6, and for no extra checking from now on: do the task, push, and they check it themselves. Built and published without tests, as they asked. Explained under "The dashboard's boxes" in `CLAUDE.md`.

Every box on an entry's page and a section's page now has a title and an arrow, and any Save remembers which are open, per entry and per section (they were offered one arrangement for all entries instead, and said go without choosing it). All of a section's entries are in an Entries box. Save and Delete have no arrow. The first box on an entry's page had no title and is now "Title & subsection". G8's note is now "About this section". The row about entries with their own size and look moved into the section's Size & look box.

The Saved message was only showing the first time, because a second save in a row didn't change the address. It now shows on every save, at the top of the screen.

### 2026-11-11: Connect made to match the preview exactly, after the owner's check

They said it wasn't finished, that Connect had black space, and that it should look exactly like the preview, and asked for checking. Checked on the live site and on a local copy with sample notes, a testimonial and four Life entries, on a computer and a phone, in Playful and Night. Found and fixed: the side panel and the names over the bubbles shared a class (`.cw-who`), which broke every bubble; the dark side was empty below the links when there are no testimonials (now a note on how the wall works); sizes, borders, colours and the greeting now follow the preview; a pinned testimonial's emoji bar was cut off; the heart doodle sat on a photo's expand button. Their Email, LinkedIn and GitHub links are still the starter placeholders (you@example.com, linkedin.com/in, github.com), which the old Connect hid; told them. A message sent on the local copy showed its bubble, ✓✓, the wall tag and the automatic reply, and kept the name.

### 2026-11-11: G7 Life becomes scrapbook pages, G8 Connect a chat window (waiting for the owner's keep or undo)

Both drawn on a private preview first (https://claude.ai/artifact/QNXFTU8mekyteVLiZhjh1r). For Life they picked A at once. For Connect they leaned to B, a chat, but found its sending odd and its space empty, and asked for other options built around posting; of D (B redone in one window), E (a feed) and F (paper planes) they picked D. Both switch over by themselves (`done_once`), and the photo grid and the old Connect stay choices under Section settings. Life is still empty, so it says Coming soon until they add entries. Built and published without tests, as they asked. Explained under "Scrapbook pages" and "Chat window" in `CLAUDE.md`. The chat's reply after sending is automatic and says so; the wall tick stays off by default, as on the old form.

### 2026-11-11: G6's cards hang level, and the staff card's photo goes on top (waiting for the owner's keep or undo)

The cards had been published, but the changes had never been pushed; that was done first. They then said the cards weren't hung equally and the RFID card's picture didn't fit, and asked for a new layout for it. The deliberate drop of every second and third card is gone. They chose the big photo on top over keeping it beside the words: the photo now runs across the card, shown whole over a blurred copy of itself, with the position, dates, chip, ID number and a hologram sticker below. They also asked whether the row glides by itself: it does, like the other rows, whenever the cards don't all fit across the screen. Built and published without tests, as they asked.

### 2026-11-08: G6's cards: an RFID card, a certificate, a front page, mended in gold, a star (waiting for the owner's keep or undo)

They asked for an RFID card for career and a real certificate for certificates, "for all 4 cards that are fun, dynamic, lively and relevant". Drew them with their movement on the private preview (https://claude.ai/artifact/Tbrxyt2PsLNuMEWGeKLMJB, Version 2), and they said go. Wins became a newspaper front page, a heavy Mood a card mended in gold, and the Hall of fame a star on the red carpet, which were my ideas. Built and published without tests, as they asked. Explained under "Achievement wall" in `CLAUDE.md`.

### 2026-11-08: The plaster wall was undone

They saw it live and said to undo the wall and keep the rest, so the Details boxes stay and the row is back to the rail and floor that move with it. They also asked for new cards next: an RFID card for career, a certificate for certificates, and the same for all four subsections, fun, dynamic and lively. Those are being drawn first.

### 2026-11-08: The wall became a real wall, and Details asks for a job's dates

They asked for a wall that looks like a wall, with the milestones hanging and sliding, and for career start, end and position in the Details box. I offered brick or plaster and they chose plaster. The wall now stays still behind the row, and each object hangs from a hook that runs along a rail. Details also asks for a certificate's Issued by, dates and Credential ID and a medal's or trophy's Awarded by, which I added because they said "like", and told them. Built and published without tests, as they asked.

### 2026-11-08: G6 Growth becomes an achievement wall (waiting for the owner's keep or undo)

They said Growth is about their career, certificates and everything else they've done, and suggested a career tree or a certificate wall. Drew four ideas on a private preview, with an object per subsection, and they chose B, the wall, sliding sideways like the other sections. Explained under "Achievement wall" in `CLAUDE.md`. The old timeline stays a choice under Section settings. Built and published without tests, as they asked. Their section's subtitle still says "A running timeline", which is their text.

### 2026-11-08: Comments and more on the reaction bar, each with its own switch

They asked for a comment box under the emojis, turned on per entry, with animation, and for me to fill the reaction box with more features. I listed them, they chose comments that appear straight away (with hide and delete) over approving them first, and asked for a toggle for each feature. Built and published without tests, as they asked. Explained under "Reactions and comments" in `CLAUDE.md`. Polls now have the Reactions & comments box too, which they didn't before. Not given a switch: the spam limits, and the emojis themselves, which they'd earlier asked to always be visible. Because Share, the total and the crown start on, every card's bar changes as soon as this is live. The first real comment will be theirs or a visitor's, and nothing has run this code yet.

### 2026-11-08: The hero's boxes too, and the white part when scrolling

They said good job and asked for the same boxes on the hero's page, for the Section settings button at the top of a section's page to go, and for the white part below an entry's page to be fixed. That was the dashboard's entry page: the whole document scrolled 358px past its end, because something absolutely placed had no positioned parent and stuck out of `.adm-shell`, which now clips it. Built and published without tests, as they asked.

### 2026-11-08: G5: a comic panel for every subsection, and voting in the art (kept)

They answered the first version with "not good": the drawing had lots of variation and the live section didn't. They asked for the dashboard's subsections to decide the comic panels, for voting to happen in the strip, and for more creative ideas like the face-off, and said the dashboard could change. Drew twelve panels at real size on the private preview with working votes (https://claude.ai/artifact/5fFvbLX1SC2nHktbKoApdh), and they said go. Explained under "Comic strip" and the paragraphs after it in `CLAUDE.md`.

Just before pushing, the live Feed turned out to hold something other than the starter entries: "Messi or Ronaldo?" under Quick fire questions, with the story "Who do you prefer?" and the Brain dump panel chosen by hand, and a hot take. It isn't a poll, so nobody can vote on it yet, which is probably what they were picturing when they mentioned the face-off. Testing with those exact words found the two worst problems of this round: "Ronaldo" split as "Ronald / o" in a face-off, and the first vote slid the burst onto the other name. All the earlier checks passed because they looked for things overflowing. That led to sizing lettering by the longest word, diagonal names, and the Turn it into a poll button, which offers Messi and Ronaldo from the title. Their entry wasn't changed; that's theirs to press.

Voting in the homepage row was tested before this and already worked, with a mouse and a finger.

Tested on throwaway copies: 820 checks with 69 entries of every kind at computer and phone size, in See all and the homepage's row, covering how each panel fits, real votes by mouse, finger and keyboard, changing a vote, votes being remembered, what a click opens, the movement, slow devices and reduced motion, and the dashboard's panel and preview. 30 more on turning an entry into a poll, on a copy holding their two real entries. 2,100 panels looked at for split words, with long real words in every panel, in all 10 themes at three widths: 180 split words in 5 themes before, 0 after. The study shelf's 67 checks and the boarding passes' 13 vehicle checks ran again too, because the wake delay is shared. One other real problem found: the quiz buzzer moved when its answer appeared, so a second tap could open the entry. Not tested on the live site, because tests there must not write, so the first real vote and the first saved poll will be theirs.

Against the build before the first comic, with two entries like the live site, three rounds each, taking turns:

| What | Before (the list) | After (the panels) |
|---|---|---|
| Phone 4x slower, scrolling the page past Feed | 34.8 fps, 11 stutters | 32.5 fps, 14 stutters |
| Computer 4x slower, the same | 43.0 fps, 8 stutters | 38.1 fps, 11 stutters |

A little lower. Three rounds on this PC can't separate that from noise, and the first comic measured the same as the list on this test, so look again in the full comparison after G8. This was before the last fit changes, which add no movement.

The row itself, with the same entries shown as each look:

| What | Comic strip (68 panels) | Boarding passes (60) | Study shelf (60) |
|---|---|---|---|
| Phone 4x slower, swiping the row | 34.7 fps, 19 stutters | 21.2 fps, 65 stutters | 5.9 fps, 42 stutters |
| Phone, swiping the row | 99.5 fps, 9 stutters | 82.5 fps, 2 stutters | 48.6 fps, 13 stutters |
| Laptop, the row gliding | 120.1 fps, 0 stutters | 97.8 fps, 0 stutters | 55.6 fps, 2 stutters |

Before the wake delay, a weak phone swiping the comic measured 30.9 fps. Turning off the size containers, the drawn pieces, the patterned backgrounds, the tilt and shadow, or cutting to 12 panels made no difference; only stopping all movement in the row did (40.4). A shelf of 60 giving a weak phone 5.9 fps is worth remembering if theirs ever grows that long. It has 4 entries today.

### 2026-11-07: G5 Feed becomes a comic strip (replaced the next day by the panels above)

They saw three looks drawn on a private preview, and answered "go with a". Each entry is now a comic panel, explained under "Comic strip" in `CLAUDE.md`. The Subsection picks the panel, and the entry's page has a Panel choice and a Sound effect box, following their rule that the dashboard's words decide the look. The old list stays a choice under Section settings. One thing beyond the drawing: on computers a row of one or two entries ends in a "To be continued…" panel, because with their two entries the right of the row looked empty. It isn't counted as an entry.

The section's subtitle still says "Newest at the top", which is the owner's text, now that entries run left to right. Mentioned to them, not changed.

Tested on throwaway copies, with 31 panels of every kind at computer and phone size: picture shapes, a video, PDFs, long titles and long writing, Bangla, long sound effect words, polls of 2, 3 and 7 options, voting, sizes, Picture fit and height, hidden parts, clicks, the expand button, the wheel, the dashboard's panel and preview: 328 checks, plus the switch, the Appearance page's preview, the old list, a restart keeping a choice of the old list, and a fresh install. Text contrast measured in all 10 themes (lowest 5.3). Not tested with real uploads on the live site, because tests there must not write.

Against the build before this change, on 31 panels, which the real section doesn't have:

| What | Before (the list) | After (the comic) |
|---|---|---|
| Phone 4x slower, scrolling the page past Feed, with 2 entries like the live site | 21.5 fps, 44 stutters | 20.7 fps, 45 stutters |
| Computer 4x slower, the same | 19.1 fps, 59 stutters | 19.0 fps, 58 stutters |

Three rounds each. On the comic alone, with 31 panels: a phone swiping the row 125.1 fps and 4 stutters; a phone 4x slower swiping it 56.9 fps and 6 stutters; a laptop with the row gliding 143.7 fps and 0 stutters, at 542ms of work per second; a phone 4x slower with panels popping 109.4 fps and 3 stutters.

The first comparison looked much worse (a slow phone 51 to 28 fps, a slow computer 72 to 25) and was misleading. A list of 31 entries is so long that the test never left plain text, while a row is passed in a moment and the test carried on into heavier sections. With the row removed altogether the page still measured 22 fps. Around the Feed on a slow computer, the same 31 entries as each row layout gave: comic 16 to 21 fps, boarding passes 14, study shelf 21 to 22, app windows 19, and all of them went lighter. Removing the comic's dots, speed lines, tilt, hard shadow or pictures made no measurable difference. So a long row costs a slow device about the same whatever it looks like.

### 2026-11-07: "You removed the dots and the G marks": nothing was removed

The owner thought the top's dotted animation and the G0 and G1 text had gone. Checked on the live site at computer and phone size: the 3D dots, the big outlined G1 to G8 and the small tags are all there, and G0 has only ever been the dashboard's name for the hero page. The code for the dots and the big marks hadn't changed since 5 and 6 November.

The likely cause is the lighter version on slow devices, because `html.lite` hides exactly those (`.hero-3d`, `.ghost`). It can't be seen from here, so it's the best explanation, not proof. It stays for that tab, even through a refresh, so it looks permanent, and only a new tab resets it. This PC had 1.2 GB of memory free out of 7.4, and tests had been running on it. Simulated on the live site: at normal speed the full version stayed; at 4x slower it went lighter after about 8 seconds at computer size and 7 at phone size. They were told to open a new tab, and then said everything is fine. Keep this in mind when the owner reports effects missing.

### 2026-11-07: G4 changes after the owner saw it: a whole-book cover, and new movement instead of page turns

The owner said the phone's page animation looked weird, and asked for something that goes with phones and the internet. They said the book was good, but an uploaded front cover should become the whole book with the writing kept on it, fitted automatically whatever its size. They saw both on the private preview, said go, and asked for the page turn to go from the book as well, with some other animation, which they left to me. So a book now lifts off the shelf, the light crosses it, its ribbon swings and letters drift up, and a phone wakes, connects, loads, refreshes, pings and gets a double-tap. It's explained under "A book with a cover" in `CLAUDE.md`. The fit changed slightly from the preview: a normal cover now loses nothing instead of a sliver at its sides, because the writing hides what's below it anyway.

Tested on throwaway copies: 149 new checks on 19 kinds of book at computer and phone width (covers of every shape, a video, PDFs, a long title, Bangla, a poll, sizes, Picture fit, clicks, the wheel, the dashboard's preview), and the shelf's older 67. Text contrast measured in all 10 themes. Measured with covers first on the shelf, the worst case for the blur, against the build before this change:

| What | Before | After |
|---|---|---|
| Phone, swiping a row of covers | 120.2 fps, 3 stutters | 113.9 fps, 2 stutters |
| Phone 4x slower, swiping the covers | 48.8 fps, 5 stutters | 44.0 fps, 9 stutters |
| Laptop, the row gliding | 143.7 fps, 0 stutters, 564ms of work per second | 143.4 fps, 0 stutters, 639ms |
| Phone 4x slower, scrolling the page | 26.7 fps, 25 stutters | 24.8 fps, 26 stutters |
| Phone 4x slower, a phone's show | 91.7 fps, 0 stutters | 87.0 fps, 1 stutter |
| Phone 4x slower, a book's show | 43.0 fps, 12 stutters | 69.9 fps, 0 stutters |

Two rounds each, on 19 covers in a row, which the real shelf doesn't have. A slow phone swiping them loses a little. The blur isn't the cause: hiding it gave 22.8 fps against 24.3 with it, in three runs each while the PC was busier, and those runs ranged from 20.6 to 26.2. What's left is probably the picture now covering the whole book instead of 42% of it, which is what was asked for; that wasn't measured separately.

### 2026-11-07: G4 Influences becomes a study shelf, with sound (kept)

The owner saw drawings on a private preview page, chose the shelf, asked for the record to become something that fits songs, podcasts, radio, music and video, and said "go with sound". They also asked for multimedia animation on the TV and page turning on books and phones, then, through another session of mine working in the same folder, for "good and fun and interesting relevant animation in the phones card". That session stopped and left this one to build. How it's built is in "Section looks" in `CLAUDE.md`. The live section switches by itself on deploy through `done_once` (`influences-study`), and the flip cards stay a choice under Layout. There's one new column, `items.study`, which old code ignores. Older code reads sound as a picture, though, so undoing after the owner has added sound means taking those files off their entries first, or they show as broken pictures.

**On the live site (`f3b6ab9`), nothing written:** it holds one entry, so it shows the Tesla portrait under the lamp, with drawn books and a plant on computers. No errors, no sideways scroll. The book, player, phone and note haven't been seen on the live site, and uploading sound there goes through Vercel Blob, which the test copy doesn't use (it stores files in its database), so that path is untested. The owner was asked to try one.

**Tested on throwaway copies with 11 entries across all 5 objects, 67 checks:** every dashboard box saved and shown on the card; the panel following the Subsection box; a real sound file uploaded through the dashboard, then playing on the card with its time and progress; a video playing on its screen with sound; one thing at a time; Play opening a web link when there's nothing to play; every part of every object opening its page; expand, reactions and Full view reachable; entry pages with their sound player and the line that stuck; book, phone and TV movement firing when the lamp arrives; a silent video stopping when the page scrolls away; another section having no panel, refusing sound, and keeping its stored value after a save. Also reduced motion, a slow device, no JavaScript, size controls on each object, a shelf of one entry with its drawn books and plant, all 10 classic themes, and phone sizes.

**Quick comparison, old flip cards against the shelf, same 11 entries.** A phone swiping the row: 102.9 and 100.8 fps, 2 and 3 stutters, then on the final version 95.6 and 93.4 fps, 3 stutters both. A laptop's row gliding: 143.8 and 141.7 fps, then 130.7 and 130.4. A phone at 4x slower scrolling the page dropped at first (24.3 and 19.9 fps, 3 rounds; 28.2 and 26.4). Hiding the video brought it back to 28.0, which found a real fault: a silent video kept running after the page scrolled away. With that fixed, two runs read 10.3 and 10.2 fps with 95 and 103 stutters, then 17.4 and 23.2 fps with 54 and 51 stutters. This PC was busy, so those numbers swing a lot, but there's no longer a loss in one direction. It wasn't a full run.

### 2026-11-07: G3 Adventures: a real boarding pass, and the bucket list as a note (kept by the owner)

The owner disliked the full bucket and said the pass didn't look like a real one. They saw drawings on a private preview page and chose my pick, one note per entry, then asked that From, To, reporting time, departure time, the time and the seat all be entered from the dashboard, and for two punched cuts on the sides. "The time" could mean the journey's length, so it became Journey time, and they were told. Beyond what they named, the panel also holds both codes, the passenger, the flight number, the pass's name and a Vehicle box. Tick lines moved from "lines starting with a dash", as drawn, to a small editor with a box per line, because they asked for everything to be in the dashboard. How it's built is in "Section looks" in `CLAUDE.md`. There's one new column, `items.pass`; old code ignores it, so undoing needs only the code.

**Tested on a throwaway copy with 10 entries across all 5 frames, with and without pictures, 61 checks:** each field shown, saved and still there after a reload, on the card, the stub and the entry's page; cleared boxes going back to automatic; the panel following the Subsection box; the Vehicle box changing the drawing, the pass's name and the Flight or Trip label; tick lines added, ticked, removed, Enter adding a line without saving; Done ticking a note's title; the preview's real frames; every part of every frame opening the entry; expand, reactions and Full view reachable; both cuts centred on the pass's edges; one height for all. An entry in another section has no panel, and saving it left its stored value alone. Scanner, plane, tick and handle fire, and leaving doesn't start them again. Reduced motion, a slow device and no JavaScript. All five button words fit the stamp in all 10 themes, on computer and phone. Size controls on the new frames, Bangla names and very long values. All 10 classic themes photographed, and phone sizes. Two older faults were found and fixed along the way: a frame's picture size had been beating the owner's own setting since the frames arrived, and on "See all" a large entry spread under the card beside it since the tickets arrived.

**Quick comparison, old against new, same 10 entries.** A phone swiping the row: 98.8 and 102.9 fps, 3 stutters both, following the finger 249 and 248 of 264px. A laptop's row gliding: 115.4 and 107.8 fps, 2 and 1 stutters (2 rounds each, within this PC's swing). A phone at 4x slower scrolling the page: 22.0 and 16.7 fps in the 2 rounds, so it was run 5 more times: **23.4 and 21.8 fps, 43 and 53 stutters, with all 5 new runs below all 5 old ones, so this loss is real.** Style and layout time didn't grow (about 205 and 43ms per second both), and removing the ruled lines, the bucket, the tilts or the barcode gained nothing (within the swing). The new version has 148 more elements on the page with these 10 entries (2375 against 2227), so the cost looks like the amount of content on a weak phone rather than any one decoration. The owner was told. The live section holds 5 entries, which should cost less, but that wasn't measured.

**On the live site (`fc122a4`), one look at each size, nothing written:** all 5 frames show with the owner's own entries and real photos, the pass with both cuts and its barcode, no errors, no sideways scroll, and the pass on Cox's Bazar's own page. Its details are all automatic there so far, so the owner hasn't entered any yet.

### 2026-11-07: G3 Adventures: each entry's frame follows its subsection (kept by the owner, except the full bucket, replaced above)

The owner asked for the look to follow the dashboard's words, and for buttons for Visited, Next destination, Dream place and so on. How it's built is in "Section looks" in `CLAUDE.md`. No database change, so undoing needs only the code.

**Tested on a throwaway copy with 7 entries across all 5 frames, with and without pictures:** the buttons (fill in, clear, own words, saved after a reload, none on other sections), the preview's frame and stamp, each frame's top, picture and text opening the entry, expand, reactions and Full view reachable on every frame, the bucket's expand opening the viewer, one height for all, no sideways scroll, no page errors. Flash, shutter and swing fire, the REC light blinks only on the camera the vehicle is at (64 of 64 samples at a camera, 0 of 45 elsewhere), and leaving a frame doesn't start them again. Reduced motion and a slow device: all frames show, none of this moves; no JavaScript: frames show. Size controls (large, small, show whole, hidden picture), long titles, a long typed status and a Bangla title. All 10 classic themes photographed, and phone sizes.

**Quick comparison, old against new, same 7 entries, 2 rounds each.** A phone swiping the row: 96.7 and 98.0 fps, 2 and 3 stutters, following the finger 249 of 264px in both. A laptop's row gliding: 112.4 and 118.8 fps, 0 and 1 stutters. A phone at 4x slower scrolling the page: 20.2 and 20.5 fps, 54 and 49 stutters. No real difference; this PC's numbers swing more than these gaps. It wasn't a full run, and it came before the last adjustments to the stamp's width and the room under it, which don't move anything.

**On the live site (`12c66a6`), one look at each size, nothing written:** Adventures holds only Cox's Bazar now, so it shows the ticket with its real photo and no stamp, as it has no date or status. No errors, no sideways scroll. The camera, bucket, polaroid and postcard haven't been seen on the live site, because no live entry uses those subsections yet. Check them when the owner adds one.

### 2026-11-07: G3 Adventures becomes boarding passes on a route (kept by the owner)

The owner chose option A. How it's built is in "Section looks" in `CLAUDE.md`. The live section switched by itself on deploy through `done_once`, and a later switch back to Photo trail stays, including after a restart (tested). Tickets read From Dhaka (`settings.location`), since entries have no "from" field; adding one was offered.

**Tested on throwaway copies, with 3 entries like the live site and with 6:** the ticket's top, destination, picture, big drawing and Full view open its page; the expand button and reactions don't leave the page. Plane, shoe and balloon were picked correctly for Cox's Bazar, Marathon and Somewhere next, and all 8 drawings were checked by eye. The vehicle waits off screen, arrives, tours there and back when everything fits, comes to a ticket the mouse is on, stops off screen, and follows a sliding row. Phones, reduced motion, slow devices, no JavaScript, "See all", a direct link, Size & look, the preview and the `tripfx` switch all work. The 10 classic themes plus Dark were checked by eye.

**Photo trail against tickets, same build, same content with 6 entries, taking turns.** The first version cut its notches with a mask, and phone swiping read 68.2 and 50.7 fps, 4 and 7 stutters (2 rounds), with gliding 122.9 and 108.5 on a laptop. The notches were redrawn without a mask. The next run: phone swipe 126.7 and 120.2, 0 stutters both, following the finger 246 and 249 of 264px (4 rounds); laptop gliding 111.8 and 143.5, 1 and 0 (3 rounds); laptop gliding 4x slower 44.6 and 45.6, 1 and 0; phone gliding 4x slower 42.4 and 38.8, 1 both (2 rounds each). Page scroll 4x slower: laptop 24.7 and 22.2, 51 and 49 (2 rounds); phone 25.3 and 23.2, 33 and 38 (3 rounds). Taken with the mask, so not repeated: laptop page scroll 110.0 and 109.0, 2 and 3; phone 80.6 and 78.1, 0 and 1. This PC was busier during the first run, since the trail's own numbers moved too, so how much of the change came from the mask isn't known.

### 2026-11-07: G2 Made becomes app windows on a desktop (kept by the owner)

The first section makeover; the owner chose option A. How it's built is in "Section looks" in `CLAUDE.md`. The live section switched by itself on deploy through `done_once`, and a later switch back to Cards under Section settings stays, including after a restart (tested).

**Tested on throwaway copies, with 2 projects and with 6:** the title bar, picture, title, code panel and Full view open the project's page; the address bar and View project open its link in a new tab; the expand button, reactions and dock don't leave the page. The window pointed at comes in front of the next. The dock brings a window forward, slides the row to it, waits about 4 seconds, then the row carries on. Phones, reduced motion, slow devices, no JavaScript, "See all", Size & look, the dashboard preview and the `windowfx` switch all work. All 10 classic themes plus Dark were checked by eye.

**Cards against windows, same build, same content with 6 projects, taking turns:** laptop page scroll 114.7 and 108.7 fps, 1 and 2 stutters (3 rounds); laptop 4x slower 29.4 and 27.4, 42 and 46 (2 rounds); phone 80.1 and 82.3, 1 and 0 (3 rounds); phone 4x slower 27.5 and 25.5, 27 and 34 (3 rounds); phone swipe 129.6 and 127.8, 0 stutters, following the finger 249 of 264px both (2 rounds). A row gliding by itself, 2 rounds: laptop 143.9 and 143.8, 0 stutters; laptop 4x slower 51.6 and 55.8; phone 143.9 and 144.0. Phone 4x slower gave 44.7 and 107.8, 1 stutter both, too far apart to trust. So there's a small cost while scrolling on slow devices; `html.lite` now drops the wallpaper, which wasn't measured.

**On the live site after release:** both real projects show as windows, EyeHealth AI's screenshot loaded, Life Chronicle shows its code panel. The dock works, the title bar opens the project's page, the menu link lands at 0, and on a phone the windows fit and the row glides. No page errors, no sideways scroll. Not tried on a real phone.

### 2026-11-07: Late pictures: menu links land, cards don't jump (kept by the owner)

The owner said go to both offers. They had one cause: a late picture makes its row taller after a link has already worked out where to stop. Adventures went from 669 to 822 tall (the 153px), Growth from 813 to 964. An earlier note said pictures weren't the cause, because the page still grew while pictures were blocked. That was wrong: tracing the live page named the Adventures picture. The earlier measurement was probably taken while only some pictures were blocked, though that wasn't checked.

- **A picture holds its place** before it loads, as a soft grey box. Card text starts at 261 and ends at 240 where it used to go from 41 to 240.
- **A row loads ahead:** on arrival, pictures just past the screen edge are loaded and those far along the row aren't, so phones don't download a whole row at once.
- **A link keeps aiming** until the page settles, and any click, wheel, touch or key ends that.

**Local stress test, a page with every section overflowing and pictures delayed 0.9s, old and new:** laptop link to Growth stopped 1566px early, Life and Connect 1834px; now 0. Phone Growth and Connect 1279px early; now 0. All five links tested land at 0 on both. The page grows by 0 to 60 on a laptop where it grew 1834, and at most 392 on a phone where it grew 1302 (one row of mixed tall pictures). Also lands at 0 with reduced motion and on slow devices, from the side menu's dots and the phone's bottom bar. Scrolling during the glide isn't pulled back.

**Smoothness, the previous release against this, taking turns, same content:** laptop 103.4 and 104.5 fps, 2 and 3 stutters; 4x slower 15.5 and 16.1, 64 and 61. Phone 82.5 and 81.5, 0 both; 4x slower 23.8 and 23.9, 47 both. Phone swipe 118.7 and 126.1, 0 both. The laptop and swipe numbers were taken before the phone's start was moved later.

### 2026-11-07: Rows that glide by themselves, with arrows (kept by the owner)

The owner reported a huge blank space between a section's title and its cards, and asked for rows that don't fit to slide automatically on computers and phones, with direction arrows and no mouse wheel for rows on computers, and for an entry's Save box to sit above its Delete box. How it works is in "Rows that don't fit" in `CLAUDE.md`.

- **Gap, title to first card, before:** laptop 275 to 354, big monitor 446 to 513, phone 118 to 190. **After, with every section overflowing on the test copy:** 87 to 90 on all three. The holding effect and the big counter caused it.
- **Removed:** the row holding the page still, and with it the curve, fly-in and lean, including their three switches. The `sideways` switch now means "slide by themselves". The counter is small.
- **Picked without asking, and told the owner:** a row turns back at each end instead of looping, because a loop needs duplicate cards and would make the counter meaningless. Wheel over a long card still scrolls its text first, as proposed.
- **The entry page:** Save now comes after Size & look and Reactions, directly above Delete, and floats over all of them.

**Old against new, taking turns, same content with every section overflowing.** A straight comparison isn't fair on computers: the old row spent much of the test holding the page still, which is cheap (108.6 and 95.1 fps look like a drop, but aren't). With the old holding effect switched off, so both scroll the same kind of page, 4 rounds: laptop 120.0 and 119.0 fps, 1 and 2 stutters; laptop 4x slower 29.8 and 28.8, 32 and 35. Slower phone 15.5 and 15.1, 90 and 89 (5 rounds, after phones stopped watching for something only computers use; this PC was busy, hence the low numbers). Phone 61.1 and 57.8, 3 and 4 (2 rounds). Swiping a row on a phone, old and new: 130.7 and 129.2 fps, 0 stutters, following the finger 249 of 264px both; 4x slower 58.9 and 60.7, 1 and 2.

**A row gliding by itself, new build only:** laptop 131.1 fps, phone 132.0, 0 stutters. 4x slower: 66.8 and 44.2, 0 stutters.

**On the live site after release:** gap 86 and 66 on the laptop rows that move (Me, Growth), and 87 to 90 and 68 on a phone. Page height on a laptop 7301. All 16 cards in rows open. Rows glide, arrows go both ways, hovering pauses, the wheel doesn't move a row, a finger moves it on a phone. Back returns to the same place on the page and about the same place in the row. Direct links to Me, Made, Adventures, Growth and Connect land right. No page errors, no sideways scroll. A tap during a swipe's momentum only stops the momentum, as in any browser, so arrows need the swipe to have settled.

**Vercel's checkpoint:** after many runs, the picture host began answering this PC's automated Chrome with "Vercel Security Checkpoint", so live pictures were blank in the test browser. From another network and with curl the same picture comes back as a normal image. The project shows no attack alerts and has no firewall config. It cleared by itself in about 9 minutes, after which the real pictures showed correctly on this release at laptop and phone sizes. See the note in `CLAUDE.md`.

**Noticed, not changed:** on a phone a row is the browser's own scroller, and the next card's picture hadn't started loading even 100px past the screen edge. So it should load only as the card arrives, and the card's text should shift down when it does. Swiped rows already worked this way, but gliding may make it more noticeable. Offered to the owner: load a row's pictures once the row is near the screen.

**Menu links:** Me, Made, Adventures and Connect land right. Feed, Growth and Life still land 153px early; fixed in the entry above.

**Not tested:** a real phone, and how a slow glide looks on a real 1x laptop screen, which is the reason for moving computers' rows by transform.

### 2026-11-07: Bigger menu, thicker belts, uploads that fit (kept by the owner)

The owner asked for all three, plus control of the belt from the dashboard, and said "do the best" when offered a choice on pictures, so option A (fill) was used.

- **Menu text** follows the screen: links 11 to about 13px on a 1366 laptop and 16px on a 1920 monitor, name 14 to 17 and 21px. It first overflowed in the wide-font themes below 1366, so small laptops drop the link emojis and the name shortens before anything runs off. 132 of 132 theme and width combinations fit with the longest name.
- **Belts:** 47 to 67px tall on a laptop, 33 to 46px on a phone. Appearance has a Belt size slider (60 to 180%) with a live belt beside it. A bigger belt loops more slowly, so its pace stays the same.
- **Pictures** fill the card's width and only what doesn't fit is trimmed, reversing the earlier "never cut" rule. Wide pictures stay whole. On the live Me cards the empty space was 16 to 25%.
- **PDFs** can now be added to entries, in the same box as photos. See "PDFs on entries" in `CLAUDE.md`.

**Old against new, alternating, same local content:** laptop page scroll 71.0 to 66.9 fps over 6 rounds, 3 stutters both. Laptop 4x slower 12.9 to 14.6, 75 to 81. Phone 60.4 to 59.7, 5 to 6. Phone 4x slower 23.3 to 22.2, 42 to 44 (2 rounds each). The new build with an old-size belt gave the same as with the new belt (77.6 and 77.5 fps), so the belt isn't the cost; the laptop gap may be noise, as this PC swung from 66 to 96 fps between runs of one build.

**On the live site after release:** menu 13.4px and name 17.2px at 1366, belt 67px (46px on a phone), no sideways overflow, no page errors, the PDF library absent from visitors' scripts, 16 of 16 cards open.

**Not tested:** opening a PDF in a real browser (see the 204 note in `CLAUDE.md`), a real upload to the live site, and a real phone.

**Found, not changed:**
- "Reading this book" has its own saved "Show whole", so it keeps its grey sides until the owner sets it to Default.
- Menu links to Growth, Life and Connect landed 153px early, with the old-size belt too; Feed also did with the new belt in one run. Offered to the owner as a separate fix; see the newer entry above for where it stands.
- `behave2.mjs` still expects the Made row to slide; it has two cards now, so three of its checks no longer apply.

### 2026-11-06: Rows dragging (waiting for the owner's keep or undo)

The owner said sliding felt like dragging on computer and phone, and asked for normal sliding if it couldn't be fixed.

- **Phone, a real cause:** a swiped row reshaped every card on every frame, so the phone kept redrawing them. Swiped rows now stay flat and straight. Curve, fly-in and lean are for pinned rows only.
- **Phone, snapping removed:** `proximity` still pulled a 108px swipe back to its card, so rows now have no snap and stop where the finger leaves them. Numbers can't show how this feels, so it needs a real phone.
- **Computer, a likely cause, not proven:** frames were already fine, and removing the curve gained nothing (132 to 134 fps). What remained was the wheel glide, so Lenis `lerp` went from 0.14 to 0.3. This affects all wheel scrolling on computers. Picked by measuring, not by feel.
- **Agreed fallback:** if a computer still drags, drop pinning there. The wheel then simply goes down the page, and cards move by trackpad, Shift + wheel or the scrollbar.
- **Left alone:** a swipe up that starts on a long card scrolls its text first. One card took two swipes before the page moved. The owner asked for cards that scroll inside.

**Old against new, alternating, same local content, 3 rounds:** phone swipe 47.0 to 117.2 fps, 7.7 to 4.4ms work per frame, 3 to 0 frames over 50ms. Phone swipe 4x slower 20.1 to 38.9 fps, 37.9 to 23.5ms, 66 to 5. Page past rows on a phone 66.1 to 69.4 fps. Laptop slide 123.9 to 116.3 fps, 7.2 to 8.1ms, 0 to 0, which is about the same and may be this PC's variation. Laptop 4x slower 29.9 to 30.0 fps. One wheel click on the test page finishes in 292ms, was 626ms.

**On the live site, one run each, so a rough guide:** phone swipe 49.7 to 72.8 fps, settling 332 to 151ms after the finger lifts. Slower phone 19.4 to 26.3 fps, 90 to 16 frames over 50ms, settling 620 to 279ms. Laptop, Growth row 34.8 to 51.6 fps, 4 to 1 frames over 50ms. All 16 homepage cards open when clicked. Not tried on a real phone.

**Test browsers crashing:** while checking this, test pages crashed several times, even on Vercel's own login page, always after several pages in one browser, on a PC with about 1.5 GB of memory free. With a new browser for each page there were none in 24 loads (old, new and live) or 16 card clicks. So it looks like the test setup, not the site, though the exact cause wasn't found.

### 2026-11-06: Four general fixes

- **Side menu pushed left:** my G6 bug. The map's stops used the class `.stop`, which is also the menu's, so the menu went 300px wide. Renamed to `.mstop`, and the menu is now a slim column on a backing at the right edge. This was also the real cause of "the menu's invisible labels block cards" in the G1 to G8 entry below.
- **No visible transition:** it did run (about 0.65s), but after 1.3 to 2.1s of nothing, and only as a soft fade. Now the click answers at once, pages load on hover and are cached, and the card grows to fill the screen. See "Opening a card" in `CLAUDE.md`.
- **Scroll for more** shows whenever a scrollable card is at its top, not just until the first scroll. **Full view** replaces "Read the full story": it's in every card's bar, always visible, arrow only on very narrow cards.
- **Dashboard:** one action bar stuck to the bottom of every page. The owner disliked it, then a plain row in the page, which wasn't it either. What they meant: a floating `SaveBox`, styled like the Delete box, with one or two buttons beside Save. Inbox also moved from the website sections to the tools group in the left menu. Section settings' Save box then moved out of the card, above the Delete box, and every risky button now asks in a proper box (`ConfirmSubmit`). The hero page's Save box stays put at the end of the page, above a Remove box that takes the hero off the homepage and can bring it back (`settings.heroHidden`). See `CLAUDE.md`.

**Scrolling, old build (`before-g1`) against new, alternating, heavy local content:** laptop 102.9 to 96.7 fps, 9.3 to 10.2ms work per frame, 1 to 1 frames over 50ms. Laptop 4x slower 29.1 to 24.1 fps, 34.1 to 41.2ms, 26 to 35. Phone size 76.9 to 73.0 fps, 6.1 to 7.2ms, 0 to 0. So today's work costs a little, most on a weak laptop. The previous run of this same comparison showed laptop 62.7 to 85.2 fps, which was this PC's variation and not a gain: treat one comparison as a rough guide, and repeat it before believing a difference. Not tracked down yet.

### 2026-11-06: G1 to G8, section by section (kept by the owner)

The owner asked for every section's flaws to be found and fixed together, with a live tracker page (https://claude.ai/artifact/VfNivVwBVgFP4yrJisQbT6) showing a timer and the current task. Each section went live with its own restore point.

- **G1 notes:** subtitle, date, place, mood, status and tags on the card; the whole card opens its page (it did nothing before); pictures take about half the card when there's text.
- **Shared, from G1:** "Scroll for more" keeps moving until a card has been scrolled, with a progress line on the card's edge; "Read the full story" at the end of a long card; a drag-and-drop order list per section, with arrows for phones; Back returns to where the visitor was. The old subsection arrows numbered one subsection alone, which collided with the others and made the site's order drift; they now renumber the whole section.
- **G2 cards:** date, place and mood; buttons on the card; polls vote on the card.
- **G3 trips:** subtitle, story, mood, status, tags and buttons; a small pin when there's no photo but there is text.
- **G4 lists:** on phones the first tap flips a card and the second opens it (phones could never read the back); no filler text; date, place and tags. Empty sections say "Coming soon" when their saved message mentions the dashboard.
- **G5 posts:** the whole post opens; subtitle, status, tags and buttons.
- **G6 milestones:** a map (`milemap`, on by default; off gives the old timeline). Stops on a winding trail with a medal chosen from the subsection's name and a colour per subsection. The trail lights up by a class change as each stop reaches the middle, and a pin marks the latest. One screen tall however many entries; See all uses it too. Certificates are the entry's photos.
- **G7 photos:** title, subtitle, date, place, a line of story and tags always under the photo, because the hover caption never showed on phones.
- **G8 connect:** quotes open their page; the links sit beside the form on wide screens.
- **Found by the final tests:** the side menu's invisible labels, about 300px wide, blocked cards passing under them (`hitscan` with real mouse events: 30 of 143 positions missed, now 1, and that one is a menu dot). Card scrolling stalled just short of the end on fast screens and left a loop running.

**Old build (`before-g1`) against new, alternating, identical heavy local content:** laptop 62.7 to 85.2 fps, 17.9 to 11.6ms work per frame, 19 to 4 frames over 50ms. Laptop 4x slower 27.9 to 27.4 fps, 35.6 to 35.5ms, but 28 to 45 frames over 50ms, so a weak laptop stutters more; not tracked down. Phone size 76.4 to 73.3 fps, 6.1 to 7.2ms, 1 to 0.

G4 and G7 were tested only with sample entries, because they're empty on the live site. The map and dashboard order list ran on a throwaway local copy, never against live content.

### 2026-11-06: Size and look controls (kept by the owner)

The owner asked for controls per entry, plus one place to control everything, each with a default button. Dashboard → Content sizes covers all content; each section and entry has a "Size & look" panel. The most specific level wins. Controls: card size (Small, Medium, Large, Custom sliders), picture (whole or fill, focus point, height in the card), text size, and show or hide picture, subtitle, tags, date and place. Each panel has a live preview and a Default button; "Default everywhere" clears all three levels. Nothing changes for visitors until something is set. Tested through the real dashboard on a throwaway local database, never on the live site, so the owner's first real use is the first time it runs against the live database. The new columns are added by themselves on the first request after the deploy.

### 2026-11-06: Pictures never cut; smoother scrolling (kept by the owner)

**Pictures:** an earlier change of mine limited note pictures to 190px with cropping, cutting about 35% off square photos, and normal cards cropped to a fixed shape. Now every card, post and photo tile shows the whole picture, at full width in its own shape, up to 66% of the card's height. An expand button opens the full-screen viewer. Tiny thumbnails still crop.

**Lag:** the owner sensed it, and measuring by section on the live site found the hero at 37 fps and Me and Made at 51. What was wrong, in order of what helped:

- The old scroll library read the scroll position on every scroll event, forcing a style pass. It drove only five simple effects, so it's gone (`scrollFx.ts` is now one loop on kept positions, and GSAP is uninstalled, about 118KB less).
- `.site:has(.hang)`: anything changing anywhere made the browser recheck 800+ elements. 30 big style passes in 5 seconds became 5.
- Decorative loops now rest while the page scrolls (`html.scrolling`).
- Off-screen title letters were 162 layers; they now stay flat while waiting.
- The cursor moved with left and top, redoing layout every frame; it uses transform now.
- The banner kept swinging, invisibly, after rolling up, and its flags kept animating; both stop now.
- Pictures decode off the main thread (`decoding="async"`), and address-bar resizes no longer rebuild rows or the theme canvas.

A first attempt that only moved scroll reads out of scroll events changed nothing, and the idea that `:is()` selectors were the cost was wrong (only about 50 exist). Measure before believing a cause.

**Old build against new, alternating, heavy local test content:**

| | Old | New |
|---|---|---|
| Laptop | 71.6 fps, 13.5ms work per frame, 3 frames over 50ms | 83.9 fps, 11.5ms, 1 |
| Laptop, 4x slower | 23.0 fps, 42.0ms, 72 | 24.8 fps, 39.5ms, 67 |
| Phone size | 53.1 fps, 11.1ms, 5 | 53.8 fps, 10.7ms, 6 |
| Phone size, 4x slower | 10.6 fps, 94.9ms, 115 | 9.5 fps, 105.7ms, 115 |

A final run with the controls included, in a quieter session: laptop 80.0 fps, 12.8ms and 3 frames over 50ms became 107.0 fps, 8.8ms and 1; 4x slower 26.2 fps, 37.5ms and 54 became 28.2 fps, 34.7ms and 31.

On the live site with real content (laptop, one run each, so a rough guide): hero 37 to 52 fps, Me 51 to 56, Made 51 to 53, Adventures 57 to 60; style passes 3,604 to 1,327 over the run.

Laptop improved; phones did not measurably in simulation. On phones the biggest cost is `Layerize` (the browser organising layers, 5.5ms per frame on the heavy test page), and it hasn't been tackled. Phones scroll natively, so these numbers are page updates rather than the scroll itself. Not yet checked on a real phone.

### 2026-11-06: Reaction bar always visible and lively (kept by the owner)

The owner wanted the reaction bar always visible under every card and poll, with lively emojis. The bar now sits under the scrolling part of a card (`foot` on `Box`), and untouched emojis are no longer greyed out. New effect `reactfx`: a soft wave on a few on-screen bars at a time, hover makes an emoji jump and grow while its neighbours lean, each emoji moves its own way, and a click sends a bigger burst. Reacting still takes a click, not a hover: the owner agreed, because hovering would cause accidental reactions and name boxes. Visitors' wall messages still have no reactions, because only the owner's entries do.

**Scrolling,** alternating on and off in one session (production build, heavy local test): 65.2 fps on, 67.0 off, which is within this PC's variation; on the 4x slower device 19.8 on, 18.1 off. The first version waved bars as they came on screen and measured 58.7 against 66.1 (15.4 against 19.6 on the slower device), so bars now wave only while scrolling is at rest.

**Also fixed:** the card's 3D tilt lifted a card about 6px as the mouse neared it, sliding the small buttons out from under the mouse, so a card now settles flat while the mouse is on its bar. Direct links (`/#section`) sometimes landed wrong after the rows update; `keepPlace` now keeps correcting while the page grows, for up to 4 seconds or until the visitor moves. 23 of 24 test loads landed exactly and one was 132px low, still on the right section.

**Testing note:** compare smoothness by alternating on and off in one session (see how this entry was measured). One run before and one after is misleading on this PC.

### 2026-11-06: Cards that fit, rows that slide (kept by the owner)

The owner reported cards growing with their content, and rows wrapping downwards. Now:

- **Cards keep their size** (at most 440px, or 62% of the screen height on short windows). Extra content scrolls inside the card, with a bouncing arrow while there is more. Normal cards show their full text instead of the first 150 characters; a click still opens the entry.
- **The homepage never wraps** (`SideRow.tsx`): cards, notes, flip cards, photos, trips and wall notes sit in one row reaching both screen edges. If they don't fit, computers pin the section and slide the row while scrolling down; phones swipe. If they fit, nothing moves. Timeline, journal, plain list and the Say Hello form stay vertical; the wall moved under the form.
- **"See all" pages stay a grid of same-size cards** (the owner's choice, on my recommendation).
- **Effects, each with a switch:** curve (`coverflow`, now on every row), fly-in (`rowfly`), lean with speed (`rowlean`), big counter (`rowcount`). `sideways` now covers every row; off gives a plain row with a scrollbar.
- Also: a sideways trackpad swipe moves the row, and keyboard focus brings its card into view.

**Scrolling** (real graphics card, 1366x768, wheel-scrolling for up to 14 seconds): live site before this change 65.5 fps, 0 to 2 frames over 50ms, and 16.1 fps on the 4x slower simulated device. New version on a heavy local test (up to 11 cards in each of 6 rows, production build) 65.8 fps, 3 frames over 50ms, and 23.5 fps on the slower device. Both slower-device runs went to the lighter version.

**Testing notes:** `next build` caches the homepage, so `next start` shows the database that was used at build time; use `next dev` to compare data. Test with `PGLITE_DIR` pointing at a copy of `.data/pglite`, never the real one.

### 2026-11-07: A real hanging thing for each theme (kept by the owner)

**Each classic theme has its own banner** (`app/banner.css`): Techy a terminal on steel cables with patch cables and a USB stick to pull; Playful a comic sign with balloons and flags; Paper a front page on wooden pegs, torn at the bottom; Retro a flickering neon sign on chains with a ball-chain pull; Ocean a sail on rope with sea charms and an anchor; Forest a plank sign on vines with moss and leaves; Sunset silk on a gold rod with fringe and tassels; Night a velvet sky with stars on threads; Day a striped awning with flowers; Candy frosting with icing drips and sweets. Everything is chosen by `html[data-skin]` in CSS, so switching theme needs no reload; `.hb-top`, `.hb-light` and `.hb-dangles` are the empty parts each theme fills in. The 20 fan themes still use the plain cloth; give them their own when each is improved.

**It moves like a hanging thing** (`HangingBanner.tsx`): it falls freely, the ropes go taut, it bounces and starts swinging. The ropes lean because their tops stay at the menu bar. While down, a breeze and the odd gust keep it moving. A tap on it makes it jump. The physics now runs at a fixed rate, which also fixes double speed on 120Hz screens.

**Opens on every visit, not once per announcement.** `justArrived()` is true for a link, a typed address or a reload, and false when moving between the site's own pages or using Back. `lc_banner_seen` is no longer used.

**Other fixes:** on phones and tablets Résumé and Say Hello moved below the pull tab (checked at 11 widths on all 10 themes). The photo hangs from one strip of tape in the middle, the point it swings from. The owner wrote "one tap not two", read as one tape. In case it meant tapping too, the hover wave is now off on touch screens, because an iPhone can spend the first tap on a hover that reveals something. That part has not been tried on a real iPhone.

**Smoothness**, on a production build with the same content, banner present versus removed. This PC varies a lot between runs, so compare within a row:

| | Banner removed | With banner |
|---|---|---|
| Scrolling, rolled up (Playful) | 48.6 fps | 49.7 fps |
| Scrolling, rolled up (Techy) | 34.5 fps | 34.0 fps |
| Idle, banner down (Playful) | 57.4 fps | 52.9 fps |
| Idle, banner down (Techy) | 57.2 fps | 56.8 fps |
| Idle, banner down, 4x slower CPU (Playful, 3 runs) | 16-26 fps | 12-21 fps |

Those were measured before calm mode. Every visitor now gets the banner while the page is still busy, so a device that shows 15 slow frames while it's down gets `.hb-calm`: no breeze, nothing dangling. The drop and swing still play. Freezes of several seconds on the 4x test also happened with the banner removed, so they aren't from the banner.

**Testing trap:** `npm run build` while `next start` is still running leaves pages pointing at a deleted stylesheet, and the numbers look plausible while the page is unstyled. Stop the server first, delete `.next`, and check the new CSS is really served before measuring. Stopping a background `npm run` can leave the node process alive on its port.

### 2026-11-06: Banner rolls itself up

On a first visit the banner dropped but never went up unless the visitor scrolled far. Now it stays about 6 seconds plus reading time when it dropped by itself, and about 10 seconds plus reading time when pulled by hand, then rolls up. It waits during a drag, while keyboard focus is inside it, or while the mouse is moving over it (a parked mouse doesn't hold it open). The first-visit drop is once per announcement in each browser, so a changed announcement drops again.

### 2026-11-06: Hanging photo; 20 fan themes under maintenance (kept by the owner)

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
