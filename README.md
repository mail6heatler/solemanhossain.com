# Life Chronicle: personal website + admin dashboard

A personal site that's more than a résumé: what you're building, reading, exploring and feeling, the bright days
and the heavy ones. Everything on it is editable from a private dashboard that only you can sign into.

**Stack:** Next.js 16 · PostgreSQL · plain CSS · GSAP + three.js (loaded on demand) · Syne + Space Grotesk · Tabler icons

Working on the code? Start with [CLAUDE.md](CLAUDE.md) (how it all fits together) and [PROGRESS.md](PROGRESS.md) (what's been done).

---

## The public site

- **Hero (G0):** typewriter name in the nav, big headline (wrap words in `*stars*` to make them mint), typed-out subtitle,
  role chips, live local clock, photo with spinning ring, Résumé + Say Hello buttons, and a scrolling skills strip.
- **Sections G1–G8,** each with its own layout:

  | Section | Layout | What it shows |
  |---|---|---|
  | G1 Me | notes | Bio, beliefs, obsessions, facts, written out in full |
  | G2 Made | cards | Projects with tags, status, a "featured" pin |
  | G3 Adventures | photo trail | Trips with photo, place and date (scrolls sideways) |
  | G4 Influences | shelf list | Books, songs, people, links |
  | G5 Feed | stream | Short thoughts, hot takes, and **polls visitors can vote on** |
  | G6 Growth | timeline | Milestones, colored by mood (bright → heavy) |
  | G7 Life | photo grid | Snapshots |
  | G8 Connect | connect | Social links, a **Say hello form**, and a **guest wall** |

- Every entry has its own page; every section has a "See all" page with subsection filters.
- Effects: 53 of them, from a 3D particle sculpture and an opening curtain to letters that react to the mouse, cards
  that tilt in 3D, ribbons that react to scroll speed and pages that glide into each other. Each one can be switched
  off under Appearance, where an (i) button explains and previews it. Visitors who ask for reduced motion get a calm site.

## The dashboard (`/admin`)

| Page | What you can do |
|---|---|
| **Overview** | Visitors today, most-viewed section, unread messages, active polls, a 14-day visitor chart, recent activity; reorder / hide / add sections |
| **G0 · Hero** | Upload photo and résumé PDF, edit every line of hero text, add / remove / drag chips |
| **G1–G8** | Entries grouped by subsection (Feed → Poems, Hot takes, Polls…). Add, edit, hide, pin, reorder, delete. Change titles, layout, subsections and emojis in "Section settings" |
| **Entry editor** | Title, subtitle, story (Markdown), photo upload, date, place, status, mood, tags, buttons, poll options and live results |
| **Inbox** | Messages from the Say hello form (reply by email, put a note on the public wall, delete), and reactions with the name of whoever left them |
| **Hanging banner** | An emergency notice or upcoming event that drops from the top of the site, with a countdown and a button |
| **Settings** | Social links, footer, effects, login username, change password, log out everywhere, export everything as JSON |

Also: search with **⌘K / Ctrl+K**, dark mode toggle, notification bell for new messages.

---

## 1. Run it on your computer

Needs [Node.js 20+](https://nodejs.org).

```bash
npm install
cp .env.example .env.local      # Windows: copy .env.example .env.local
# open .env.local and set ADMIN_PASSWORD
npm run dev
```

- Site: http://localhost:3000
- Dashboard: http://localhost:3000/admin, username **admin** and your `ADMIN_PASSWORD`

Locally, data is stored in the `.data/` folder automatically. Delete that folder to start fresh.

## 2. Put it online (free: GitHub + Vercel + Neon)

1. **GitHub:** create a private repository and upload this folder (without `node_modules`, `.data`, `.next`, `.env.local`).
2. **Vercel:** sign in at [vercel.com](https://vercel.com) with GitHub → **Add New → Project** → import the repository.
3. **Database:** in the Vercel project, **Storage → Create Database → Neon**, and connect it. This sets `DATABASE_URL`.
4. **Environment variables** (Settings → Environment Variables): `ADMIN_PASSWORD` and `AUTH_SECRET` (see `.env.example`).
5. **Deploy / Redeploy.** Tables and starter content are created automatically on the first run.
6. **Domain (optional):** Settings → Domains → add yours and follow the DNS instructions.

## Security

- One admin account. Every dashboard page, every change, and every upload checks your login.
- Passwords set in the dashboard are stored hashed (scrypt). `ADMIN_PASSWORD` always works as a recovery key.
- Login cookie: signed, http-only, 30 days. "Log out everywhere" and changing your password sign out all other devices.
- Wrong logins are slowed down. The hello form has a spam trap and a rate limit. Notes only appear on the wall after you approve them.
- Visitor stats are anonymous daily counts: no IP addresses, no cookies for tracking (polls and reactions use one random cookie so each browser counts once).
- Reacting asks for a name, which only you can see in the dashboard. It's whatever the visitor typed, not a verified identity.

## Uploads

Photos are resized in your browser before upload (max 1800px) and stored in the database, served from `/media/…`. Pictures with a transparent background keep it.
Files up to 4 MB: JPG, PNG, WebP, GIF, PDF. Neon's free plan has 0.5 GB, enough for a few hundred photos.

## Project map

```
app/
  page.tsx                  homepage (hero + all sections)
  site.css                  the public design (themes, components, then the lively layer)
  s/[slug]/                 section page and entry pages
  admin/login/              sign-in screen
  admin/(panel)/            overview, hero, sections, entry editor, inbox, settings
  api/                      upload, vote, track, export
  media/[id]/               serves uploaded files
  actions.ts                every change (all check your login)
  admin.css                 the dashboard design
components/site/            hero pieces, effects (3D, scroll, hover), section layouts, poll, hello form
components/admin/           sidebar shell, upload field, chips and link editors
lib/                        database, schema + starter content, settings, auth
```
