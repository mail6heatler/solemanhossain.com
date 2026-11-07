// Help text for every setting on the Appearance page (the ⓘ buttons), plus what each "Preview" shows.
// preview: a link on the public site; "?demo=key" scrolls to the feature and shows it in action (see components/site/Demo.tsx).

export type Help = { title: string; what: string; how: string[]; preview?: string };

export const HELP: Record<string, Help> = {
  // ----- themes & personality -----
  defaultTheme: {
    title: "Theme visitors see first",
    what: "Sets the look of the whole site for anyone who hasn't picked a theme themselves. There are 10 themes (20 more are under maintenance), plus Auto (Day calm by day, Night neon after 6 PM in your time zone) and Random (a different theme on every visit).",
    how: ["Pick a theme from the list.", "Press Save appearance.", "Visitors who already chose a theme in the menu keep their own choice."],
    preview: "/?demo=themes",
  },
  themeSwitch: {
    title: "Theme button for visitors",
    what: "Shows a theme button in the menu bar. Visitors open it to pick any theme, Auto, or Random. Their choice is remembered in their own browser. Switch it off and every visitor sees the theme you picked above (the 🔀 shuffle button is hidden too).",
    how: ["Switch it on and save.", "On the site, click the theme icon at the top right (it shows the current theme's emoji)."],
    preview: "/?demo=themes",
  },
  shuffle: {
    title: "🔀 Shuffle-theme button",
    what: "A 🔀 button in the menu bar that jumps to a random theme every time it's clicked. Fun for visitors who want to see all the looks. Only shows while the Theme button is on.",
    how: ["Switch it on and save.", "On the site, click 🔀 next to the theme button. Each click picks a different theme."],
    preview: "/?demo=shuffle",
  },
  themefx: {
    title: "Each theme's own effects",
    what: "Every theme gets its own living background and touches. Ocean: rolling waves, bubbles, light shafts. Techy: falling code, a fake break-in typing in the corner, glitching titles. Retro: neon grid, scanlines, flickering titles. Paper: paper grain, drifting scraps, a paper plane, ink splats. Sunset: a sun that climbs as you scroll, embers, birds. Forest: falling leaves, fireflies. Candy: bubbles, sprinkles. Playful: tumbling shapes. Night: stars, shooting stars. Day: warm light, dust. Clicking anywhere makes a burst in that theme's style.",
    how: ["Switch on and save.", "Preview shows all ten without saving anything.", "To see one theme, add ?theme=ocean to your site's address (or retro, paper, techy…)."],
    preview: "/?demo=themefx",
  },
  mood: {
    title: "Mood of the day",
    what: "Changes the accent colour (buttons, highlights, glows) on the Day calm, Night neon, Playful and Techy themes: bright = yellow, electric = mint, calm = blue, quiet = purple, heavy = grey-blue. The other themes keep their own colours.",
    how: ["Pick a mood (or “no mood” to keep mint).", "Press Save appearance. Change it whenever your mood changes."],
    preview: "/?demo=mood",
  },
  showMood: {
    title: "Mood pill",
    what: "Shows “Today I'm feeling ⚡ electric” (with your current mood) at the top of the homepage.",
    how: ["Pick a mood above, switch this on, and save."],
    preview: "/?demo=mood",
  },
  nowStatus: {
    title: "“Right now” status",
    what: "A short line under your role chips, like “📖 Reading: Atomic Habits · 🎧 Lo-fi beats”. Great for what you're reading, building or listening to this week.",
    how: ["Type a short line (emojis welcome).", "Save. Leave it empty to hide it."],
    preview: "/?demo=now",
  },
  partyWord: {
    title: "Secret party word",
    what: "If a visitor types this word anywhere on your site (not inside a text box), party mode starts: disco colours, raining emojis and confetti for 6 seconds. The Konami code (↑ ↑ ↓ ↓ ← → ← → B A) works too.",
    how: ["Type a word using letters only (for example: shou).", "Save, then share the secret with friends."],
    preview: "/?demo=party",
  },

  // ----- hero -----
  decode: {
    title: "Decoding headline",
    what: "When the homepage loads, the big headline scrambles like data, then settles into your real words. Search engines and screen readers always get the real text.",
    how: ["Switch on and save.", "Edit the headline itself on the G0 · Hero page."],
    preview: "/?demo=decode",
  },
  aurora: {
    title: "Aurora background",
    what: "Slow, soft colour waves drifting behind the hero section. Switched off, the hero uses three gently moving glows instead.",
    how: ["Switch on and save.", "Its colours follow the theme and mood."],
    preview: "/?demo=aurora",
  },
  tilt: {
    title: "3D photo (tilt, wave, confetti)",
    what: "Your profile photo tilts in 3D toward the mouse, a 👋 waves when hovered, and clicking it bursts confetti.",
    how: ["Switch on and save.", "Upload your photo on the G0 · Hero page.", "On the site, move your mouse over the photo, then click it."],
    preview: "/?demo=tilt",
  },
  sticker: {
    title: "Photo hanging from the menu bar",
    what: "Your hero photo hangs from the menu bar, taped on, with a white border. It drops in when the page loads, sways gently and swings as you scroll. Résumé and Say Hello sit beside it as paper cut-outs. With a transparent PNG, the border follows your outline like a real cut-out. Off, you get the round photo with the spinning ring beside your words.",
    how: ["Switch on and save.", "For the cut-out look, upload a PNG with a transparent background on the G0 · Hero page (remove.bg makes one for free)."],
    preview: "/?demo=sticker",
  },
  magnetic: {
    title: "Magnetic buttons",
    what: "Buttons all over the site (Résumé, Say hello, See all, your social links) lean toward the mouse when it gets close and spring back when it leaves (mouse only, not phones).",
    how: ["Switch on and save.", "On the site, slowly move your mouse toward the buttons next to your photo."],
    preview: "/?demo=magnetic",
  },
  greeting: {
    title: "Time greeting",
    what: "Under the clock: “Good evening! It's 9:41 PM here in Dhaka 🌙”, plus the visitor's own time if they're somewhere else.",
    how: ["Switch on and save.", "It uses your Location and Clock time zone from the G0 · Hero page."],
    preview: "/?demo=greeting",
  },
  typewriter: {
    title: "Typewriter text",
    what: "Your name phrases type themselves in the top-left corner, and the hero subtitle types out letter by letter.",
    how: ["Switch on and save.", "Edit the phrases and subtitle on the G0 · Hero page."],
    preview: "/?demo=typewriter",
  },
  emojis: {
    title: "Floating draggable emojis",
    what: "A few emojis float around each section. Visitors can drag them, and they spring back when let go.",
    how: ["Switch on and save.", "Pick the hero emojis on G0 · Hero, and each section's emojis in its Section settings."],
    preview: "/?demo=emojis",
  },
  cursor: {
    title: "Cursor + connecting dots",
    what: "On computers, the mouse pointer gets an accent-coloured dot and ring, with little dots that connect to it as it moves. Phones don't show it.",
    how: ["Switch on and save.", "On the site, move your mouse around."],
    preview: "/?demo=cursor",
  },

  // ----- motion -----
  smooth: {
    title: "Smooth scrolling",
    what: "Scrolling with a mouse wheel glides smoothly instead of jumping, and menu links slide to their section.",
    how: ["Switch on and save.", "On the site, scroll with your mouse wheel or click a menu link."],
    preview: "/?demo=smooth",
  },
  autolite: {
    title: "Lighter version on slow devices",
    what: "If someone's phone or computer stays under about 25 frames per second while scrolling, for several seconds, the site quietly switches off its heaviest effects for that visit: the 3D sculpture, theme backgrounds, chapter motion, giant marks, floating emojis and things falling from the banner. It also switches to the browser's own scrolling. Your content, themes, ribbons, hover effects and everything else stay. Fast devices never see this.",
    how: ["Leave it on so nobody gets a laggy site.", "Switched off, every visitor gets every effect, however slow their device.", "It resets on the next visit, so a device gets another chance."],
    preview: "/?demo=autolite",
  },
  countup: {
    title: "Count-up numbers",
    what: "The “by the numbers” tiles in the hero count up from 0 to the real numbers when they appear.",
    how: ["Switch on and save.", "The numbers are your real entry counts per section (and the reactions total)."],
    preview: "/?demo=countup",
  },
  stagger: {
    title: "Cards drop in one by one",
    what: "When a section scrolls into view, its cards drop in one after another instead of all at once.",
    how: ["Switch on and save.", "On the site, scroll down slowly to any section with cards."],
    preview: "/?demo=stagger",
  },
  sideways: {
    title: "Rows that don't fit slide by themselves",
    what: "On the homepage, cards never wrap onto a new line. When a row doesn't fit the screen it glides slowly by itself while it's on screen, and turns back at each end. It waits while the mouse moves over it, a finger is on it, or the page is scrolling. Arrows above the row send it either way, and phones can swipe too. The mouse wheel only moves the page. With this off, the row moves only with its arrows and swipes.",
    how: ["Switch on and save.", "Add enough entries to a section that they don't all fit across the screen.", "On the site, scroll to that section and watch it, or press its arrows."],
    preview: "/?demo=sideways",
  },
  timeline: {
    title: "Timeline draws itself",
    what: "In timeline sections (like Growth), the line grows as you scroll and each milestone lights up when the line reaches it.",
    how: ["Switch on and save.", "On the site, scroll slowly through the timeline section."],
    preview: "/?demo=timeline",
  },
  morph: {
    title: "Photo morph into entry pages",
    what: "Clicking a card with a photo makes that photo smoothly grow into the big photo on the entry page (in Chrome and Edge; other browsers simply open the page).",
    how: ["Switch on and save.", "On the site, click any card that has a photo."],
    preview: "/?demo=morph",
  },

  // ----- transitions -----
  intro: {
    title: "Opening curtain",
    what: "The first time someone opens your homepage in a visit, your name rises on a curtain that then sweeps up in columns to reveal the site. It takes under 2 seconds, plays once per visit, and never blocks clicks.",
    how: ["Switch on and save.", "To see it again, open your site in a new private window."],
    preview: "/?demo=intro",
  },
  pagefx: {
    title: "Opening a card: it grows into the page",
    what: "When someone clicks a card, it answers at once with a press and a glow, a thin bar shows the page is coming, then the card grows to fill the screen and becomes the page. Back reverses it. Other links: the old page sinks back while the new one rises over it, instead of flashing white. Works in Chrome, Edge and Safari; other browsers simply open the page.",
    how: ["Switch on and save.", "On the site, click any entry or a “See all” link."],
    preview: "/?demo=pagefx",
  },
  themewipe: {
    title: "New theme spreads from the click",
    what: "Changing the theme spreads the new look out in a growing circle from the button that was pressed.",
    how: ["Switch on and save.", "On the site, press 🔀 or pick a theme from the menu."],
    preview: "/?demo=themewipe",
  },

  // ----- 3D -----
  hero3d: {
    title: "3D particle sculpture",
    what: "Thousands of glowing particles behind your hero form a sphere, a knot, a DNA helix, a galaxy, a cube and a wave, melting from one to the next. They part around the mouse, explode outward as visitors scroll away, and take the colours of the theme. Clicking an empty spot sends a shock wave and changes the shape.",
    how: ["Switch on and save.", "On the site, move your mouse over the hero and click an empty spot.", "It turns itself off for data-saver mode, reduced-motion settings and very old devices (the aurora stays). Slow computers automatically get a lighter version."],
    preview: "/?demo=hero3d",
  },
  cardtilt: {
    title: "Cards tilt in 3D",
    what: "Cards, trips, notes and photos lean toward the mouse in 3D and catch a soft glare of light, then spring back when the mouse leaves. Mouse only.",
    how: ["Switch on and save.", "On the site, move your mouse slowly across a card."],
    preview: "/?demo=cardtilt",
  },
  milemap: {
    title: "Timeline sections become a lively map",
    what: "Sections laid out as a timeline, like your milestones, become a journey: each entry is a stop on a winding trail, with a medal chosen from its subsection's name and a colour per subsection. The trail lights up as the row travels, and a pin marks where it has got to. It stays one screen tall however many entries you add. Photos on an entry, like a certificate, show on its stop. With this off, you get the plain vertical timeline.",
    how: ["Switch on and save.", "Give entries subsections with words like Certifications, Career or Wins to choose their medals.", "Add a certificate as the entry's photo."],
    preview: "/?demo=milemap",
  },
  rowcount: {
    title: "Counter on sideways rows",
    what: "A small number such as 3 / 12, on the line above a sideways row, shows which card it has reached.",
    how: ["Switch on and save.", "On the site, go to a row that doesn't fit on screen."],
    preview: "/?demo=rowcount",
  },

  // ----- text -----
  kinetic: {
    title: "Headline letters react",
    what: "Each letter of the big headline rises, grows and leans away as the mouse passes near it. Letters also catch a slow wave of light from time to time.",
    how: ["Switch on and save.", "Edit the headline itself on the G0 · Hero page. Headlines in scripts with joined letters (like Bangla) keep their shape and skip this effect."],
    preview: "/?demo=kinetic",
  },
  splittext: {
    title: "Titles rise letter by letter",
    what: "Chapter titles rise out of a mask letter by letter as they scroll into view, and ripple when hovered. The small label above each title decodes like data. The first screen's pieces also arrive one after another.",
    how: ["Switch on and save.", "On the site, scroll to any chapter, then hover its title."],
    preview: "/?demo=splittext",
  },
  wordscrub: {
    title: "Subtitles light up word by word",
    what: "The sentence under each chapter title starts faint and fills in word by word as you scroll, as if it's being read to you.",
    how: ["Switch on and save.", "On the site, scroll slowly past a chapter title."],
    preview: "/?demo=wordscrub",
  },
  footername: {
    title: "Giant name at the end",
    what: "At the very end of every page, your nickname rises from the floor in huge letters that light up under the mouse.",
    how: ["Switch on and save.", "It uses your nickname (or your full name if there's no nickname)."],
    preview: "/?demo=footername",
  },

  // ----- scrolling -----
  heroexit: {
    title: "Hero sinks away",
    what: "As visitors scroll, your hero's contents sink, shrink and fade while the next chapter rises over them.",
    how: ["Switch on and save.", "On the site, scroll down slowly from the top."],
    preview: "/?demo=heroexit",
  },
  sheets: {
    title: "Chapters as stacked sheets",
    what: "Each chapter gets rounded top corners and a soft shadow, and slides over the previous one like a stack of sheets. Techy and Paper keep their straight edges.",
    how: ["Switch on and save.", "On the site, scroll between any two chapters."],
    preview: "/?demo=sheets",
  },
  sectionfx: {
    title: "Every chapter moves as you scroll",
    what: "Each chapter rises in tipped back, then leaves in its own way as you scroll past: the first shrinks, the next tips backward, the next slides away, the next swings like a door, and the pattern repeats. Gentler on phones.",
    how: ["Switch on and save.", "On the site, scroll slowly down the homepage."],
    preview: "/?demo=sectionfx",
  },
  ghost: {
    title: "Giant chapter marks",
    what: "A huge outlined chapter code (like G3) sits behind each chapter and drifts sideways as you scroll.",
    how: ["Switch on and save.", "It shows each section's code, set in its Section settings. Without a code it shows the chapter's number."],
    preview: "/?demo=ghost",
  },
  ribbons: {
    title: "Sliding headlines",
    what: "A slanted band runs across the page before each chapter, repeating that chapter's name. It takes on the look of your theme: wavy on Ocean, a terminal on Techy, neon on Retro, torn newsprint on Paper.",
    how: ["Switch on and save. This switch turns them all on or off.", "To hide one, untick that section under “Sliding headlines” lower on this page, or in that section's own settings. “Belt size” there makes all of them thicker or thinner.", "The text comes from each section's emoji and title."],
    preview: "/?demo=ribbons",
  },
  velocity: {
    title: "Ribbons react to scroll speed",
    what: "The skills strip and the ribbons speed up and lean while visitors scroll fast, and run backwards when they scroll up.",
    how: ["Switch on and save.", "On the site, scroll quickly past the bottom of the hero or a ribbon, then back up."],
    preview: "/?demo=velocity",
  },
  imgreveal: {
    title: "Photos wipe in, grids drift",
    what: "Photos further down the page wipe into view with a slow zoom the first time they appear, and photo-grid columns move at slightly different speeds on computers.",
    how: ["Switch on and save.", "On the site, scroll down to any section with photos."],
    preview: "/?demo=imgreveal",
  },
  totop: {
    title: "Progress ring",
    what: "A small round button at the bottom right fills up as visitors move down the page. Clicking it flies back to the top.",
    how: ["Switch on and save.", "It appears after scrolling down a little."],
    preview: "/?demo=totop",
  },

  // ----- hover -----
  smartcursor: {
    title: "Smart cursor",
    what: "The ring that follows the mouse grows and says what a click will do on everything: Open on a project, Explore on a trip, View on a photo, Read on a post, React on an emoji, Vote on a poll, Drag on a floating emoji, Jump in the menu, Visit on your links, Send, Download, and more. It stretches along its path when moving fast. Needs “Mint cursor + connecting dots” on.",
    how: ["Switch on and save.", "On the site, move your mouse over cards, photos and floating emojis."],
    preview: "/?demo=smartcursor",
  },
  spotlight: {
    title: "Lit-up borders",
    what: "The borders of cards near the mouse light up in your accent colour, including the neighbouring cards. The Say hello box also gets a slowly turning edge of light.",
    how: ["Switch on and save.", "On the site, move your mouse across a group of cards."],
    preview: "/?demo=spotlight",
  },
  ambient: {
    title: "Chapter background glow",
    what: "A soft glow follows the mouse over each chapter's background, and a dim patch of colour drifts behind it on every device.",
    how: ["Switch on and save.", "On the site, move your mouse over the empty space in a chapter."],
    preview: "/?demo=ambient",
  },
  liquid: {
    title: "Colour pours into buttons",
    what: "When the mouse enters a button, its colour spreads out from exactly where the mouse came in, and drains away when it leaves.",
    how: ["Switch on and save.", "On the site, hover “See all”, your social links or the role chips."],
    preview: "/?demo=liquid",
  },
  navpill: {
    title: "Sliding menu highlight",
    what: "A highlight slides between menu links as the mouse moves and rests on the current section; labels roll over on hover. The menu bar also gets slimmer once visitors scroll.",
    how: ["Switch on and save.", "On the site, move your mouse along the top menu."],
    preview: "/?demo=navpill",
  },

  // ----- fun -----
  bannerfall: {
    title: "Things fall from the banner",
    what: "When the hanging banner is pulled down, things pour out from under it in the style of your theme. Ocean: water drops that splash. Paper: sheets of paper fluttering down. Techy: falling code. Retro: neon pixels. Sunset: embers. Forest: leaves. Candy: sweets and sprinkles. Playful: bouncing shapes. Night: stars. Day: petals.",
    how: ["Switch on and save.", "Write a banner under Dashboard → Hanging banner, or use Preview to see a sample.", "To see another theme, add it to the address: /?demo=banner&theme=ocean"],
    preview: "/?demo=banner",
  },
  reactfx: {
    title: "Reaction emojis come alive",
    what: "A soft wave runs through the reaction bars on screen every few seconds. With a mouse, the emoji under it jumps up and grows while its neighbours lean away, and each one moves its own way: the heart beats, the fire flickers, the laughing face shakes, the mind-blown face pops and the hands clap. Clicking sends out a bigger burst of that emoji.",
    how: ["Switch on and save (“Emoji reactions on entries” must be on too).", "On the site, move your mouse along any reaction bar."],
    preview: "/?demo=reactfx",
  },
  reactions: {
    title: "Emoji reactions",
    what: "Every entry gets ❤️ 🔥 😂 🤯 👏 buttons. The first time someone reacts, they have to type their name (it's remembered in their browser after that). New reactions show up in your bell and Inbox → Reactions with that name. Only you can see names; visitors only see the counts.",
    how: ["Switch on and save.", "On the site, tap an emoji under any card or entry.", "See who reacted to what in Inbox → Reactions."],
    preview: "/?demo=reactions",
  },
  confetti: {
    title: "Confetti on poll votes",
    what: "A burst of confetti when a visitor votes in a poll.",
    how: ["Switch on and save.", "Add a poll: in a section, type a title, choose “Poll” and press Add.", "On the site, vote in it."],
    preview: "/?demo=confetti",
  },
  plane: {
    title: "Paper plane on “Say hello”",
    what: "After a visitor sends the Say hello form, their message flies away as a ✈️ paper plane.",
    how: ["Switch on and save.", "On the site, send a message from the Connect section (it arrives in your Inbox)."],
    preview: "/?demo=plane",
  },
  surprise: {
    title: "🎲 Surprise me",
    what: "A 🎲 button in the menu bar (and in the footer) that opens a random entry from your site.",
    how: ["Switch on and save.", "On the site, click 🎲."],
    preview: "/?demo=surprise",
  },
  explorer: {
    title: "Explorer badge",
    what: "When a visitor has scrolled through every section of the homepage, they get a “🏆 Achievement unlocked: Explorer!” message with confetti (once per browser).",
    how: ["Switch on and save.", "On the site, scroll all the way through the homepage."],
    preview: "/?demo=explorer",
  },
  party: {
    title: "Secret party mode",
    what: "Typing your secret party word (or the Konami code) starts 6 seconds of disco colours, raining emojis and confetti.",
    how: ["Switch on and save.", "Set the word above under “Secret party word”.", "On the site, type the word anywhere (not inside a text box)."],
    preview: "/?demo=party",
  },
  sparkles: {
    title: "Click sparkles",
    what: "Your hero emojis burst out wherever someone clicks on the site.",
    how: ["Switch on and save.", "On the site, click anywhere. The emojis come from “Floating emojis” on G0 · Hero."],
    preview: "/?demo=sparkles",
  },
  visitors: {
    title: "“People here now” counter",
    what: "Shows “3 people here right now 👀” at the top of the homepage. You also see the number on your dashboard Overview. No names or addresses are stored.",
    how: ["Switch on and save.", "Open your site on two devices to see it count."],
    preview: "/?demo=visitors",
  },
  game404: {
    title: "404 mini game",
    what: "When someone opens a page that doesn't exist, they can play “catch the runaway compass” (3 catches) before heading home.",
    how: ["Switch on and save.", "Visit any made-up address on your site, like /abc."],
    preview: "/oops-this-page-wandered-off",
  },

  // ----- layout -----
  tripfx: {
    title: "Boarding passes: a vehicle travels the route, stamps thump",
    what: "A section laid out as Boarding passes (like Adventures) shows each entry on a dashed route, in a frame chosen by its Subsection: a quest gets a camera, a bucket list a note with ticks, “Through my eyes” a polaroid, “Moments” a postcard, and anything else a boarding pass. With this on, a small vehicle travels along the route to the entry you're on, frames slide in as they arrive, stamps thump down, a pass's barcode gets scanned, a camera's shutter flashes, a note's tick pops on and its little bucket's handle swings. With it off, the frames and the route stay, without the movement. What a pass says, the vehicle and a note's tick lines are all on the entry's page in the dashboard, and the stamp comes from its Status.",
    how: ["Switch on and save.", "To use it on another section, choose “Boarding passes” as its layout, under Section settings."],
    preview: "/?demo=tripfx",
  },
  studyfx: {
    title: "Study shelf: a lamp travels along, TVs power on, pages turn",
    what: "A section laid out as Study shelf (like Influences) shows each entry as the object its Subsection names, standing on a shelf: a book, a TV player, a framed portrait, a phone or a note. With this on, a small lamp travels along the shelf. Whatever it reaches wakes up: a TV powers on and its screen comes alive, a book's pages turn, a phone buzzes, turns its page, pings and sends up hearts, and a portrait straightens. With it off, the objects and the shelf stay, without the lamp or the movement. Sound and video you add still play when you press Play. What each object shows is on the entry's page in the dashboard.",
    how: ["Switch on and save.", "To use it on another section, choose “Study shelf” as its layout, under Section settings."],
    preview: "/?demo=studyfx",
  },
  windowfx: {
    title: "App windows pop open, with a bouncing dock",
    what: "A section laid out as App windows (like Made) shows each project as a small app window on a desktop, with a dock of icons below. With this on, windows pop open as they arrive, their address bar fills like a page loading, and the dock's icons grow under the mouse and bounce when clicked. With it off they look the same but stay still.",
    how: ["Switch on and save.", "To use it on another section, choose “App windows” as its layout, under Section settings."],
    preview: "/?demo=windowfx",
  },
  bento: {
    title: "Bento grid for card sections",
    what: "Card sections (like Made) with 3 or more entries get mixed tile sizes: the first (featured) entry gets a big tile, every 4th a wide one.",
    how: ["Switch on and save.", "Pin an entry (“Pin / feature at the top”) to put it in the big tile."],
    preview: "/?demo=bento",
  },
  flip: {
    title: "Flip cards for list sections",
    what: "List sections (like Influences) become cards that flip over on hover: the front shows the title, the back shows why it matters (from the story text).",
    how: ["Switch on and save.", "Write a short story for each entry: that's what the back of the card shows."],
    preview: "/?demo=flip",
  },
  lightbox: {
    title: "Photo viewer for photo sections",
    what: "In photo-grid sections (like Life), clicking a photo opens it full screen. Arrows, swipe and Esc work, and videos play. It steps through every photo and video in the section.",
    how: ["Switch on and save.", "On the site, click any photo in the Life section."],
    preview: "/?demo=lightbox",
  },
  bottombar: {
    title: "App-style menu on phones",
    what: "On phones, a bar with each section's emoji sits at the bottom of the screen, like an app. The current section is highlighted.",
    how: ["Switch on and save.", "Open your site on a phone, or make your browser window very narrow."],
    preview: "/?demo=bottombar",
  },
};
