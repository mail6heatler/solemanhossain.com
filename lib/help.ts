// Help text for every setting on the Appearance page (the ⓘ buttons), plus what each "Preview" shows.
// preview: a link on the public site; "?demo=key" scrolls to the feature and shows it in action (see components/site/Demo.tsx).

export type Help = { title: string; what: string; how: string[]; preview?: string };

export const HELP: Record<string, Help> = {
  // ----- themes & personality -----
  defaultTheme: {
    title: "Theme visitors see first",
    what: "Sets the look of the whole site for anyone who hasn't picked a theme themselves. There are 10 themes, plus Auto (Day calm by day, Night neon after 6 PM in your time zone) and Random (a different theme on every visit).",
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
  magnetic: {
    title: "Magnetic buttons",
    what: "The Résumé and Say hello buttons in the hero gently lean toward the mouse when it gets close (mouse only, not phones).",
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
    title: "Photo-trail sections slide sideways",
    what: "On computers, sections laid out as a photo trail (like Adventures) stay in place while scrolling down moves the trips sideways, like a film strip. On phones visitors swipe instead.",
    how: ["Switch on and save.", "Add 4 or more entries with photos to the section so there's something to slide.", "On the site, scroll down through that section."],
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

  // ----- fun -----
  reactions: {
    title: "Emoji reactions",
    what: "Every entry gets ❤️ 🔥 😂 🤯 👏 buttons. Visitors tap to react (and tap again to take it back). New reactions show up in your Inbox → Reactions.",
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
