import { DEFAULT_SETTINGS } from "./settings";

type Q = (text: string, params?: unknown[]) => Promise<Record<string, any>[]>;

export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS settings (
    id INT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}',
    password_hash TEXT NOT NULL DEFAULT '',
    session_version INT NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS sections (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    code TEXT NOT NULL DEFAULT '',
    nav_label TEXT NOT NULL DEFAULT '',
    nav_emoji TEXT NOT NULL DEFAULT '',
    eyebrow TEXT NOT NULL DEFAULT '',
    eyebrow_emoji TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL DEFAULT '',
    layout TEXT NOT NULL DEFAULT 'cards',
    emojis TEXT NOT NULL DEFAULT '',
    categories TEXT NOT NULL DEFAULT '',
    empty_text TEXT NOT NULL DEFAULT '',
    home_limit INT NOT NULL DEFAULT 6,
    sort INT NOT NULL DEFAULT 0,
    visible BOOLEAN NOT NULL DEFAULT TRUE
  )`,
  `CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    section_id INT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    category TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT 'post',
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '',
    links TEXT NOT NULL DEFAULT '[]',
    date_label TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT '',
    mood TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    poll_options TEXT NOT NULL DEFAULT '[]',
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    visible BOOLEAN NOT NULL DEFAULT TRUE,
    sort INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS items_section_idx ON items(section_id, sort)`,
  // photos + videos per entry (JSON list; the first one is the cover). image_url stays as the first photo for link previews.
  `ALTER TABLE items ADD COLUMN IF NOT EXISTS media TEXT NOT NULL DEFAULT '[]'`,
  // size and look controls (lib/contentStyle.ts); empty means it follows the level above
  `ALTER TABLE items ADD COLUMN IF NOT EXISTS style TEXT NOT NULL DEFAULT '{}'`,
  // what a Boarding passes entry's pass says, and its note's tick lines (lib/tripPass.ts); empty means it's worked out
  `ALTER TABLE items ADD COLUMN IF NOT EXISTS pass TEXT NOT NULL DEFAULT '{}'`,
  // what a Study shelf entry looks like and shows beyond its usual fields (lib/studyItem.ts)
  `ALTER TABLE items ADD COLUMN IF NOT EXISTS study TEXT NOT NULL DEFAULT '{}'`,
  // which comic panel an entry gets and the word in its burst (lib/comicItem.ts)
  `ALTER TABLE items ADD COLUMN IF NOT EXISTS comic TEXT NOT NULL DEFAULT '{}'`,
  // which object an entry gets on an Achievement wall, if the owner chose one (lib/awardItem.ts)
  `ALTER TABLE items ADD COLUMN IF NOT EXISTS award TEXT NOT NULL DEFAULT '{}'`,
  // which page an entry is in a Scrapbook, if the owner chose one, and a ritual's ticked days (lib/scrapItem.ts)
  `ALTER TABLE items ADD COLUMN IF NOT EXISTS scrap TEXT NOT NULL DEFAULT '{}'`,
  // which card a G1 note or a G2 window is, if the owner chose one (lib/cardLook.ts)
  `ALTER TABLE items ADD COLUMN IF NOT EXISTS card TEXT NOT NULL DEFAULT '{}'`,
  // a G1 entry's full view: its layout, background, opening, pull quote and where its parts sit (lib/fullView.ts)
  `ALTER TABLE items ADD COLUMN IF NOT EXISTS fv TEXT NOT NULL DEFAULT '{}'`,
  // which of the reaction bar's extra features this entry has switched on (lib/talk.ts)
  `ALTER TABLE items ADD COLUMN IF NOT EXISTS talk TEXT NOT NULL DEFAULT '{}'`,
  // which boxes on its dashboard page are open, as last saved (lib/boxes.ts)
  `ALTER TABLE items ADD COLUMN IF NOT EXISTS boxes TEXT NOT NULL DEFAULT '{}'`,
  `ALTER TABLE sections ADD COLUMN IF NOT EXISTS boxes TEXT NOT NULL DEFAULT '{}'`,
  `ALTER TABLE sections ADD COLUMN IF NOT EXISTS style TEXT NOT NULL DEFAULT '{}'`,
  `CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INT NOT NULL,
    data BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    wants_public BOOLEAN NOT NULL DEFAULT FALSE,
    approved BOOLEAN NOT NULL DEFAULT FALSE,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS votes (
    item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    voter TEXT NOT NULL,
    option INT NOT NULL,
    PRIMARY KEY (item_id, voter)
  )`,
  `CREATE TABLE IF NOT EXISTS stats_daily (
    day DATE PRIMARY KEY,
    visitors INT NOT NULL DEFAULT 0,
    views INT NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS section_views (
    day DATE NOT NULL,
    slug TEXT NOT NULL,
    n INT NOT NULL DEFAULT 0,
    PRIMARY KEY (day, slug)
  )`,
  // emoji reactions: one row per visitor per emoji per entry (random visitor id, like poll votes)
  // comments visitors leave on entries; voter and ip are only for slowing down spam, and are never sent back
  `CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    voter TEXT NOT NULL,
    ip TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL,
    body TEXT NOT NULL,
    reply TEXT NOT NULL DEFAULT '',
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    hidden BOOLEAN NOT NULL DEFAULT FALSE,
    seen BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS comments_item_idx ON comments(item_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS comments_recent_idx ON comments(created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS reactions (
    item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    voter TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (item_id, voter, emoji)
  )`,
  // reactions show up in the admin inbox until marked as seen
  // shares from a card's Share button: no names, only when, for the card's LIVE strip ("Someone shared this")
  `CREATE TABLE IF NOT EXISTS shares (id SERIAL PRIMARY KEY, item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE, voter TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS shares_item_idx ON shares(item_id, created_at DESC)`,
  // the news pop-up's numbers (lib/popnews.ts): how many saw each story and tapped its button, per day; no names, nothing about who
  `CREATE TABLE IF NOT EXISTS popnews_stats (story TEXT NOT NULL, day DATE NOT NULL DEFAULT CURRENT_DATE, views INT NOT NULL DEFAULT 0, clicks INT NOT NULL DEFAULT 0, PRIMARY KEY (story, day))`,
  `ALTER TABLE reactions ADD COLUMN IF NOT EXISTS seen BOOLEAN NOT NULL DEFAULT FALSE`,
  `CREATE INDEX IF NOT EXISTS reactions_recent_idx ON reactions(created_at DESC)`,
  // who reacted, as they typed it (older reactions have no name)
  `ALTER TABLE reactions ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT ''`,
  // the sliding headline before a section can be hidden per section
  `ALTER TABLE sections ADD COLUMN IF NOT EXISTS ribbon BOOLEAN NOT NULL DEFAULT TRUE`,
  // "people here now": a random id per browser and when it last checked in (no names, no IPs)
  `CREATE TABLE IF NOT EXISTS presence (
    visitor TEXT PRIMARY KEY,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  // Connect's chat as a real conversation (2026-11-19): each visitor's private key (stored as a hash), the owner's replies as rows of their own,
  // when the other side saw a message, the owner's emoji on a visitor's message, the owner's public reply on a wall note, and its hearts
  `ALTER TABLE messages ADD COLUMN IF NOT EXISTS conv TEXT`,
  `ALTER TABLE messages ADD COLUMN IF NOT EXISTS from_owner BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE messages ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ`,
  `ALTER TABLE messages ADD COLUMN IF NOT EXISTS react TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE messages ADD COLUMN IF NOT EXISTS wall_reply TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE messages ADD COLUMN IF NOT EXISTS hearts INT NOT NULL DEFAULT 0`,
  `CREATE INDEX IF NOT EXISTS messages_conv ON messages (conv)`,
  // when the owner last had the Inbox open, and which chat they're typing in (one row)
  `CREATE TABLE IF NOT EXISTS owner_live (
    id INT PRIMARY KEY,
    seen_at TIMESTAMPTZ,
    typing_conv TEXT NOT NULL DEFAULT '',
    typing_at TIMESTAMPTZ
  )`,
  // Changes to live content that must happen only once, however many times this list runs, so a later choice in the dashboard stands.
  `CREATE TABLE IF NOT EXISTS done_once (key TEXT PRIMARY KEY)`,
  // Settings → safety and security (lib/opsServer.ts, 2026-11-27): private values (Telegram, two-step login, the private-mode password,
  // spam words, blocked visitors) never go in the settings document, which pages can show; backups, the recycle bin, settings history,
  // the login history and signed-in devices each have a table.
  `CREATE TABLE IF NOT EXISTS secrets (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS backups (id SERIAL PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), kind TEXT NOT NULL DEFAULT 'auto', size INT NOT NULL DEFAULT 0, summary TEXT NOT NULL DEFAULT '', data TEXT NOT NULL DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS bin (id SERIAL PRIMARY KEY, kind TEXT NOT NULL, label TEXT NOT NULL DEFAULT '', data TEXT NOT NULL DEFAULT '', deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS settings_history (id SERIAL PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), label TEXT NOT NULL DEFAULT '', data TEXT NOT NULL DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS login_log (id SERIAL PRIMARY KEY, at TIMESTAMPTZ NOT NULL DEFAULT NOW(), ok BOOLEAN NOT NULL DEFAULT false, ip_hash TEXT NOT NULL DEFAULT '', ip_hint TEXT NOT NULL DEFAULT '', device TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(), device TEXT NOT NULL DEFAULT '', ip_hint TEXT NOT NULL DEFAULT '', revoked BOOLEAN NOT NULL DEFAULT false)`,
  `ALTER TABLE messages ADD COLUMN IF NOT EXISTS ip_hash TEXT NOT NULL DEFAULT ''`,
  // G2's new look, agreed with the owner on 2026-11-07. The old cards stay a choice under Section settings.
  `WITH first AS (INSERT INTO done_once (key) VALUES ('made-windows') ON CONFLICT DO NOTHING RETURNING key)
   UPDATE sections SET layout = 'windows' WHERE slug = 'made' AND layout = 'cards' AND EXISTS (SELECT 1 FROM first)`,
  // G3's new look, agreed on 2026-11-07. The old photo trail stays a choice under Section settings.
  `WITH first AS (INSERT INTO done_once (key) VALUES ('adventures-tickets') ON CONFLICT DO NOTHING RETURNING key)
   UPDATE sections SET layout = 'tickets' WHERE slug = 'adventures' AND layout = 'strip' AND EXISTS (SELECT 1 FROM first)`,
  // G4's new look, agreed on 2026-11-07. The old flip cards stay a choice under Section settings.
  `WITH first AS (INSERT INTO done_once (key) VALUES ('influences-study') ON CONFLICT DO NOTHING RETURNING key)
   UPDATE sections SET layout = 'study' WHERE slug = 'influences' AND layout = 'list' AND EXISTS (SELECT 1 FROM first)`,
  // G5's new look, agreed on 2026-11-07. The old feed stream stays a choice under Section settings.
  `WITH first AS (INSERT INTO done_once (key) VALUES ('feed-comic') ON CONFLICT DO NOTHING RETURNING key)
   UPDATE sections SET layout = 'comic' WHERE slug = 'feed' AND layout = 'stream' AND EXISTS (SELECT 1 FROM first)`,
  `WITH first AS (INSERT INTO done_once (key) VALUES ('growth-awards') ON CONFLICT DO NOTHING RETURNING key)
   UPDATE sections SET layout = 'awards' WHERE slug = 'growth' AND layout = 'timeline' AND EXISTS (SELECT 1 FROM first)`,
  // G7 and G8's new looks, agreed on 2026-11-11. The photo grid and the old Connect stay choices under Section settings.
  `WITH first AS (INSERT INTO done_once (key) VALUES ('life-scrapbook') ON CONFLICT DO NOTHING RETURNING key)
   UPDATE sections SET layout = 'scrapbook' WHERE slug = 'life' AND layout = 'photos' AND EXISTS (SELECT 1 FROM first)`,
  `WITH first AS (INSERT INTO done_once (key) VALUES ('connect-chat') ON CONFLICT DO NOTHING RETURNING key)
   UPDATE sections SET layout = 'chat' WHERE slug = 'connect' AND layout = 'connect' AND EXISTS (SELECT 1 FROM first)`,
  // 2026-11-28: with G1's new sticker buttons the owner chose the Comment button on all of G1's cards, so their comments are switched on once
  `WITH first AS (INSERT INTO done_once (key) VALUES ('g1-comments-on') ON CONFLICT DO NOTHING RETURNING key)
   UPDATE items SET talk = ((CASE WHEN talk LIKE '{%' THEN talk::jsonb ELSE '{}'::jsonb END) || '{"comments": true}'::jsonb)::text
   WHERE section_id IN (SELECT id FROM sections WHERE slug = 'me') AND EXISTS (SELECT 1 FROM first)`,
  // 2026-11-28: the same for G2's windows, the owner's choice when G2 got the sticker buttons
  `WITH first AS (INSERT INTO done_once (key) VALUES ('g2-comments-on') ON CONFLICT DO NOTHING RETURNING key)
   UPDATE items SET talk = ((CASE WHEN talk LIKE '{%' THEN talk::jsonb ELSE '{}'::jsonb END) || '{"comments": true}'::jsonb)::text
   WHERE section_id IN (SELECT id FROM sections WHERE slug = 'made') AND EXISTS (SELECT 1 FROM first)`,
  // and for G3's boarding passes, following the owner's choice for G1 and G2
  `WITH first AS (INSERT INTO done_once (key) VALUES ('g3-comments-on') ON CONFLICT DO NOTHING RETURNING key)
   UPDATE items SET talk = ((CASE WHEN talk LIKE '{%' THEN talk::jsonb ELSE '{}'::jsonb END) || '{"comments": true}'::jsonb)::text
   WHERE section_id IN (SELECT id FROM sections WHERE slug = 'adventures') AND EXISTS (SELECT 1 FROM first)`,
  `WITH first AS (INSERT INTO done_once (key) VALUES ('g4-comments-on') ON CONFLICT DO NOTHING RETURNING key)
   UPDATE items SET talk = ((CASE WHEN talk LIKE '{%' THEN talk::jsonb ELSE '{}'::jsonb END) || '{"comments": true}'::jsonb)::text
   WHERE section_id IN (SELECT id FROM sections WHERE slug = 'influences') AND EXISTS (SELECT 1 FROM first)`,
  `WITH first AS (INSERT INTO done_once (key) VALUES ('g5-comments-on') ON CONFLICT DO NOTHING RETURNING key)
   UPDATE items SET talk = ((CASE WHEN talk LIKE '{%' THEN talk::jsonb ELSE '{}'::jsonb END) || '{"comments": true}'::jsonb)::text
   WHERE section_id IN (SELECT id FROM sections WHERE slug = 'feed') AND EXISTS (SELECT 1 FROM first)`,
  `WITH first AS (INSERT INTO done_once (key) VALUES ('g6-comments-on') ON CONFLICT DO NOTHING RETURNING key)
   UPDATE items SET talk = ((CASE WHEN talk LIKE '{%' THEN talk::jsonb ELSE '{}'::jsonb END) || '{"comments": true}'::jsonb)::text
   WHERE section_id IN (SELECT id FROM sections WHERE slug = 'growth') AND EXISTS (SELECT 1 FROM first)`,
  `WITH first AS (INSERT INTO done_once (key) VALUES ('g7-comments-on') ON CONFLICT DO NOTHING RETURNING key)
   UPDATE items SET talk = ((CASE WHEN talk LIKE '{%' THEN talk::jsonb ELSE '{}'::jsonb END) || '{"comments": true}'::jsonb)::text
   WHERE section_id IN (SELECT id FROM sections WHERE slug = 'life') AND EXISTS (SELECT 1 FROM first)`,
  // 2026-11-19: the owner asked for the hero photo back where it hung (it had been dragged up past the top edge in the editor).
  `WITH first AS (INSERT INTO done_once (key) VALUES ('hero-photo-reset') ON CONFLICT DO NOTHING RETURNING key)
   UPDATE settings SET data = (data::jsonb #- '{heroDesign,parts,photo}')::text WHERE data LIKE '{%' AND EXISTS (SELECT 1 FROM first)`,
  // 2026-11-19: the role chips had been dragged to 2x and the Résumé buttons narrowed; the owner asked for the hero's sizes to be redone, so its saved sizes go
  `WITH first AS (INSERT INTO done_once (key) VALUES ('hero-parts-reset-2') ON CONFLICT DO NOTHING RETURNING key)
  UPDATE settings SET data = (data::jsonb #- '{heroDesign,parts}')::text WHERE data LIKE '{%' AND EXISTS (SELECT 1 FROM first)`,
];

type SeedItem = {
  title: string; category?: string; type?: "post" | "poll"; subtitle?: string; body?: string;
  tags?: string; date_label?: string; status?: string; mood?: string; location?: string;
  links?: { label: string; url: string }[]; poll?: string[]; pinned?: boolean;
};
type SeedSection = {
  slug: string; code: string; nav_label: string; nav_emoji: string; eyebrow: string; eyebrow_emoji: string;
  title: string; subtitle: string; layout: string; emojis: string; categories: string; empty_text: string;
  items: SeedItem[];
};

const SECTIONS: SeedSection[] = [
  {
    slug: "me", code: "G1", nav_label: "Me", nav_emoji: "🙋‍♂️", eyebrow: "Hello, it's me", eyebrow_emoji: "🙋‍♂️",
    title: "Who's behind the chronicle",
    subtitle: "A short bio, the facts worth knowing, and the things I care about.",
    layout: "notes", emojis: "👋 🧬 💫",
    categories: "The unfiltered manual, Beliefs I'd die on, Currently obsessed with, Random facts that define me",
    empty_text: "Bio not added yet. This section fills in the moment it's written in the dashboard.",
    items: [
      { title: "The unfiltered manual", category: "The unfiltered manual",
        body: "I love exploring and trying new things, building projects, and figuring out how stuff works. " +
          "I enjoy my own company, a quiet room and a problem to chew on, but I care deeply about the people I love.\n\n" +
          "_Rewrite this from the dashboard in your own words._" },
      { title: "Currently obsessed with", category: "Currently obsessed with",
        body: "- Building this website\n- AI tinkering\n- A book I can't put down" },
    ],
  },
  {
    slug: "made", code: "G2", nav_label: "Made", nav_emoji: "⚡", eyebrow: "Things I made", eyebrow_emoji: "⚡",
    title: "Projects, builds, experiments",
    subtitle: "Each one with a title, a short note, and a link.",
    layout: "windows", emojis: "🛠️ 🔧 💻",
    categories: "Data storytelling, Code & problem solving, Brain dumps, Side quests",
    empty_text: "No projects yet. Add your first build from the dashboard.",
    items: [
      { title: "EyeHealth AI", category: "Code & problem solving", subtitle: "Featured project", status: "Featured",
        tags: "ai, health", pinned: true, body: "Describe what it does, why you built it, and what you learned.",
        links: [{ label: "View project", url: "https://github.com/" }] },
      { title: "Life Chronicle", category: "Side quests", subtitle: "This website", status: "In progress",
        tags: "nextjs, postgres", body: "The site you're looking at, with its own admin dashboard." },
    ],
  },
  {
    slug: "adventures", code: "G3", nav_label: "Adventures", nav_emoji: "✈️", eyebrow: "Adventures", eyebrow_emoji: "✈️",
    title: "Places I've been",
    subtitle: "A trail of trips: photo, place name and date.",
    layout: "tickets", emojis: "🗺️ 🧭 🌏",
    categories: "Expeditions, Quest chronicles, Through my eyes, Bucket list, Moments that made me wander",
    empty_text: "No trips logged yet.",
    items: [
      { title: "Cox's Bazar", category: "Expeditions", location: "Cox's Bazar, Bangladesh", date_label: "2025", mood: "calm",
        body: "The longest beach I've ever walked. Write the story here." },
      { title: "Somewhere next", category: "Bucket list", location: "To be decided", mood: "excited",
        body: "A place I want to go." },
    ],
  },
  {
    slug: "influences", code: "G4", nav_label: "Influences", nav_emoji: "🧠", eyebrow: "Influences", eyebrow_emoji: "🧠",
    title: "What shaped the way I think",
    subtitle: "Books, songs, people, ideas: short notes on what stuck with me and why.",
    layout: "study", emojis: "📚 🎯 🧠",
    categories: "Books that broke me open, Songs that get it, People who made me think, The internet thinks I should know",
    empty_text: "No influences logged yet. Add a few from the dashboard to fill this shelf.",
    items: [],
  },
  {
    slug: "feed", code: "G5", nav_label: "Feed", nav_emoji: "🔥", eyebrow: "Brain chaos feed", eyebrow_emoji: "🔥",
    title: "Unfiltered, as it happens",
    subtitle: "Short thoughts, hot takes and polls. Newest at the top.",
    layout: "comic", emojis: "💭 🔥 💬",
    categories: "Poems I'm obsessed with, On repeat, Hot takes, This week's brain dump, Sayings that stuck, Creative chaos, Currently vibing with, Quick fire questions, Overrated or underrated, Would you rather",
    empty_text: "Nothing posted yet.",
    items: [
      { title: "Overrated or underrated: dark mode?", category: "Overrated or underrated", type: "poll",
        poll: ["Overrated", "Underrated", "Perfectly rated"] },
      { title: "Recursion is just trusting your future self", category: "Hot takes", date_label: "Today", mood: "excited",
        body: "And honestly that's the scariest part of programming." },
    ],
  },
  {
    slug: "growth", code: "G6", nav_label: "Growth", nav_emoji: "📈", eyebrow: "Achievements", eyebrow_emoji: "📈",
    title: "Milestones along the way",
    subtitle: "A running timeline of wins, certificates, lessons, and the hard seasons too.",
    layout: "awards", emojis: "🏆 📈 🎖️",
    categories: "Career milestones, Skills & certifications, Wins & lessons, Hall of fame",
    empty_text: "No milestones yet.",
    items: [
      { title: "Data Officer at T.K. Group", category: "Career milestones", date_label: "Now", mood: "happy" },
      { title: "A hard season", category: "Wins & lessons", date_label: "Some time ago", mood: "sad",
        body: "Not every chapter is a happy one. This is a place to write about those honestly too." },
    ],
  },
  {
    slug: "life", code: "G7", nav_label: "Life", nav_emoji: "📸", eyebrow: "Unfiltered life", eyebrow_emoji: "🌟",
    title: "Life outside the work",
    subtitle: "A photo grid, updated whenever something's worth keeping.",
    layout: "scrapbook", emojis: "📸 🌟 🎨",
    categories: "Photo diary, Where I've lived, My rituals, Random snapshots",
    empty_text: "No photos yet. Upload your first one from the dashboard.",
    items: [],
  },
  {
    slug: "connect", code: "G8", nav_label: "Connect", nav_emoji: "💬", eyebrow: "Let's connect", eyebrow_emoji: "💬",
    title: "Find me elsewhere",
    subtitle: "Say hello, leave a note on the wall, or find me on the links below.",
    layout: "chat", emojis: "🤝 ✉️ 🌐",
    categories: "Testimonials",
    empty_text: "",
    items: [],
  },
];

export async function seed(q: Q) {
  const inserted = await q(
    `INSERT INTO settings (id, data) VALUES (1, $1) ON CONFLICT (id) DO NOTHING RETURNING id`,
    [JSON.stringify(DEFAULT_SETTINGS)]
  );
  if (inserted.length === 0) return; // already seeded

  for (const [si, s] of SECTIONS.entries()) {
    const [sec] = await q(
      `INSERT INTO sections (slug, code, nav_label, nav_emoji, eyebrow, eyebrow_emoji, title, subtitle, layout, emojis, categories, empty_text, sort)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (slug) DO NOTHING RETURNING id`,
      [s.slug, s.code, s.nav_label, s.nav_emoji, s.eyebrow, s.eyebrow_emoji, s.title, s.subtitle, s.layout,
       s.emojis, s.categories, s.empty_text, si + 1]
    );
    if (!sec) continue;
    for (const [ii, it] of s.items.entries()) {
      await q(
        `INSERT INTO items (section_id, category, type, title, subtitle, body, tags, links, date_label, status, mood, location, poll_options, pinned, sort)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [sec.id, it.category ?? "", it.type ?? "post", it.title, it.subtitle ?? "", it.body ?? "", it.tags ?? "",
         JSON.stringify(it.links ?? []), it.date_label ?? "", it.status ?? "", it.mood ?? "", it.location ?? "",
         JSON.stringify(it.poll ?? []), it.pinned ?? false, ii + 1]
      );
    }
  }
}
