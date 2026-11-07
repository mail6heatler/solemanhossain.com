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
  `CREATE TABLE IF NOT EXISTS reactions (
    item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    voter TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (item_id, voter, emoji)
  )`,
  // reactions show up in the admin inbox until marked as seen
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
  // Changes to live content that must happen only once, however many times this list runs, so a later choice in the dashboard stands.
  `CREATE TABLE IF NOT EXISTS done_once (key TEXT PRIMARY KEY)`,
  // G2's new look, agreed with the owner on 2026-11-07. The old cards stay a choice under Section settings.
  `WITH first AS (INSERT INTO done_once (key) VALUES ('made-windows') ON CONFLICT DO NOTHING RETURNING key)
   UPDATE sections SET layout = 'windows' WHERE slug = 'made' AND layout = 'cards' AND EXISTS (SELECT 1 FROM first)`,
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
    layout: "strip", emojis: "🗺️ 🧭 🌏",
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
    layout: "list", emojis: "📚 🎯 🧠",
    categories: "Books that broke me open, Songs that get it, People who made me think, The internet thinks I should know",
    empty_text: "No influences logged yet. Add a few from the dashboard to fill this shelf.",
    items: [],
  },
  {
    slug: "feed", code: "G5", nav_label: "Feed", nav_emoji: "🔥", eyebrow: "Brain chaos feed", eyebrow_emoji: "🔥",
    title: "Unfiltered, as it happens",
    subtitle: "Short thoughts, hot takes and polls. Newest at the top.",
    layout: "stream", emojis: "💭 🔥 💬",
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
    layout: "timeline", emojis: "🏆 📈 🎖️",
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
    layout: "photos", emojis: "📸 🌟 🎨",
    categories: "Photo diary, Where I've lived, My rituals, Random snapshots",
    empty_text: "No photos yet. Upload your first one from the dashboard.",
    items: [],
  },
  {
    slug: "connect", code: "G8", nav_label: "Connect", nav_emoji: "💬", eyebrow: "Let's connect", eyebrow_emoji: "💬",
    title: "Find me elsewhere",
    subtitle: "Say hello, leave a note on the wall, or find me on the links below.",
    layout: "connect", emojis: "🤝 ✉️ 🌐",
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
