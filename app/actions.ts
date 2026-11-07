"use server";

import { cleanStudy } from "@/lib/studyItem";
import { cleanComic } from "@/lib/comicItem";
import { cleanBoxes } from "@/lib/boxes";
import { cleanPass } from "@/lib/tripPass";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { query, queryOne } from "@/lib/db";
import { getSettings } from "@/lib/data";
import {
  checkCurrentPassword, checkLogin, createSession, destroySession, hashPassword, requireAdmin,
} from "@/lib/auth";
import { cleanStyle } from "@/lib/contentStyle";
import { BANNER_KINDS, cleanRibbonSize, EFFECTS, FAN_THEME_KEYS, isSafeUrl, LAYOUTS, MOODS, parseLinks, parseMedia, SELECTABLE, type BannerKind, type Effects, type Skin, type SiteSettings, type Social } from "@/lib/settings";

// ---------- helpers ----------
const str = (fd: FormData, k: string, max = 20000) => String(fd.get(k) ?? "").trim().slice(0, max);
const bool = (fd: FormData, k: string) => fd.get(k) === "on";
const int = (fd: FormData, k: string, d = 0) => {
  const n = parseInt(String(fd.get(k) ?? ""), 10);
  return Number.isFinite(n) ? n : d;
};
const lines = (fd: FormData, k: string, max = 40) =>
  str(fd, k).split("\n").map((l) => l.trim()).filter(Boolean).slice(0, max).map((l) => l.slice(0, 120));
const safeUrl = (u: string) => (u && isSafeUrl(u) ? u : "");
const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 50) || "section";
const LAYOUT_VALUES = LAYOUTS.map((l) => l.value as string);
const refresh = () => revalidatePath("/", "layout");
// a new value each time, so the Saved message shows on every save, even the second in a row from the same page
const saved = () => `saved=${Date.now()}`;
/** A Save on an entry's or a section's page also remembers which of its boxes are open. */
const saveBoxes = async (table: "items" | "sections", id: number, fd: FormData) => {
  const boxes = str(fd, "boxes", 2000);
  if (boxes) await query(`UPDATE ${table} SET boxes=$1 WHERE id=$2`, [JSON.stringify(cleanBoxes(boxes)), id]);
};

// ---------- size and look controls: all content, a section, one entry ----------
export async function saveLook(fd: FormData) {
  await requireAdmin();
  const style = cleanStyle(str(fd, "style", 2000));
  const kind = str(fd, "kind"), id = int(fd, "id");
  if (kind === "item") await query("UPDATE items SET style=$1 WHERE id=$2", [JSON.stringify(style), id]);
  else if (kind === "section") await query("UPDATE sections SET style=$1 WHERE id=$2", [JSON.stringify(style), id]);
  else await saveSettingsData({ contentStyle: style });
  if (kind === "item") await saveBoxes("items", id, fd);
  else if (kind === "section") await saveBoxes("sections", id, fd);
  refresh();
  redirect(kind === "item" ? `/admin/items/${id}?${saved()}#look` : kind === "section" ? `/admin/s/${id}?${saved()}#look` : `/admin/content?${saved()}`);
}

/** Back to default: everything, or just the entries of one section. */
export async function resetAllLooks() {
  await requireAdmin();
  await query("UPDATE items SET style='{}'");
  await query("UPDATE sections SET style='{}'");
  await saveSettingsData({ contentStyle: {} });
  refresh();
  redirect(`/admin/content?${saved()}`);
}

export async function resetSectionLooks(fd: FormData) {
  await requireAdmin();
  const id = int(fd, "id");
  await query("UPDATE items SET style='{}' WHERE section_id=$1", [id]);
  refresh();
  redirect(`/admin/s/${id}?${saved()}#look`);
}

async function saveSettingsData(patch: Partial<SiteSettings>) {
  const current = await getSettings();
  await query("UPDATE settings SET data=$1 WHERE id=1", [JSON.stringify({ ...current, ...patch })]);
}

// ---------- auth ----------
export async function login(_prev: { error?: string; username?: string } | undefined, fd: FormData) {
  if (!process.env.ADMIN_PASSWORD) return { error: "ADMIN_PASSWORD is not set on the server." };
  if (process.env.NODE_ENV === "production" && (process.env.AUTH_SECRET ?? "").length < 16)
    return { error: "AUTH_SECRET is not set on the server (needs 16+ characters)." };
  const ok = await checkLogin(str(fd, "username", 100), String(fd.get("password") ?? ""));
  if (!ok) {
    await new Promise((r) => setTimeout(r, 900)); // slow down guessing
    return { error: "Wrong username or password.", username: str(fd, "username", 100) };
  }
  await createSession();
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

export async function logoutEverywhere() {
  await requireAdmin();
  await query("UPDATE settings SET session_version = session_version + 1 WHERE id=1");
  await destroySession();
  redirect("/admin/login");
}

export async function changePassword(_prev: { error?: string; ok?: string } | undefined, fd: FormData) {
  await requireAdmin();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (!(await checkCurrentPassword(current))) return { error: "Current password is wrong." };
  if (next.length < 8) return { error: "New password needs at least 8 characters." };
  if (next !== confirm) return { error: "The two new passwords don't match." };
  await query("UPDATE settings SET password_hash=$1, session_version = session_version + 1 WHERE id=1", [hashPassword(next)]);
  await createSession(); // keep this device logged in, log out every other one
  return { ok: "Password changed. Other devices were logged out." };
}

// ---------- hero (G0) ----------
export async function saveHero(fd: FormData) {
  await requireAdmin();
  await saveSettingsData({
    fullName: str(fd, "fullName", 120),
    nickname: str(fd, "nickname", 80),
    initials: str(fd, "initials", 3).toUpperCase(),
    brandPhrases: lines(fd, "brandPhrases", 8),
    statusText: str(fd, "statusText", 160),
    headline1: str(fd, "headline1", 80),
    headline2: str(fd, "headline2", 80),
    subtitle: str(fd, "subtitle", 400),
    roleChips: lines(fd, "roleChips", 8),
    skills: lines(fd, "skills", 30),
    location: str(fd, "location", 120),
    timezone: str(fd, "timezone", 60) || "UTC",
    clockLabel: str(fd, "clockLabel", 12),
    avatarUrl: safeUrl(str(fd, "avatarUrl", 500)),
    resumeUrl: safeUrl(str(fd, "resumeUrl", 500)),
    ctaPrimaryLabel: str(fd, "ctaPrimaryLabel", 40),
    ctaSecondaryLabel: str(fd, "ctaSecondaryLabel", 40),
    ctaSecondaryUrl: safeUrl(str(fd, "ctaSecondaryUrl", 300)) || "#connect",
    heroEmojis: str(fd, "heroEmojis", 80),
    scrollCue: str(fd, "scrollCue", 60),
    heroBoxes: cleanBoxes(str(fd, "boxes", 2000)),
  });
  refresh();
  redirect(`/admin/hero?${saved()}`);
}

/** Takes the hero off the homepage or brings it back. Everything in it stays saved, because the name and photo are used elsewhere too. */
export async function setHeroHidden(fd: FormData) {
  await requireAdmin();
  await saveSettingsData({ heroHidden: str(fd, "hidden", 1) === "1" });
  refresh();
  redirect(`/admin/hero?${saved()}`);
}

// ---------- site settings ----------
export async function saveSite(fd: FormData) {
  await requireAdmin();
  let socials: Social[] = [];
  try {
    const arr = JSON.parse(str(fd, "socials", 20000));
    socials = (Array.isArray(arr) ? arr : []).flatMap((r) => {
      const [l] = parseLinks([r]);
      return l ? [{ ...l, icon: String(r.icon ?? "link").replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "link" }] : [];
    });
  } catch {}
  await saveSettingsData({
    siteTitle: str(fd, "siteTitle", 120),
    siteDescription: str(fd, "siteDescription", 300),
    footerLeft: str(fd, "footerLeft", 200),
    footerRight: str(fd, "footerRight", 200),
    connectFormTitle: str(fd, "connectFormTitle", 80),
    adminUsername: str(fd, "adminUsername", 60) || "admin",
    socials,
  });
  refresh();
  redirect(`/admin/settings?${saved()}`);
}

// ---------- appearance: themes, mood, effects ----------
export async function saveAppearance(fd: FormData) {
  await requireAdmin();
  const theme = str(fd, "defaultTheme") as Skin;
  const mood = str(fd, "mood");
  const effects = Object.fromEntries(EFFECTS.map((e) => [e.key, bool(fd, `fx_${e.key}`)])) as Effects;
  await saveSettingsData({
    defaultTheme: SELECTABLE.includes(theme) ? theme : "night",
    themeSwitch: bool(fd, "themeSwitch"),
    mood: MOODS[mood] ? mood : "",
    showMood: bool(fd, "showMood"),
    ribbonSize: cleanRibbonSize(str(fd, "ribbonSize")),
    nowStatus: str(fd, "nowStatus", 120),
    partyWord: str(fd, "partyWord", 12).toLowerCase().replace(/[^a-z]/g, ""),
    effects,
  });
  // the sliding headline can be hidden for each section
  for (const raw of str(fd, "ribbon_ids", 2000).split(",")) {
    const id = Number(raw);
    if (Number.isInteger(id) && id > 0) await query("UPDATE sections SET ribbon=$1 WHERE id=$2", [bool(fd, `ribbon_${id}`), id]);
  }
  refresh();
  redirect(`/admin/appearance?${saved()}`);
}

// ---------- pictures for the fan themes ----------
export async function saveThemePics(fd: FormData) {
  await requireAdmin();
  const themePics: Record<string, string> = {};
  for (const k of FAN_THEME_KEYS) {
    const url = safeUrl(str(fd, `pic_${k}`, 600)).replace(/[^\w\-./:%?=&~+#,]/g, "");
    if (/^(https?:\/\/|\/)/.test(url)) themePics[k] = url;
  }
  await saveSettingsData({ themePics });
  refresh();
  redirect(`/admin/themes?${saved()}`);
}

// ---------- the hanging banner ----------
export async function saveBanner(fd: FormData) {
  await requireAdmin();
  const kind = str(fd, "kind") as BannerKind;
  const when = (k: string) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str(fd, k, 30)) ? str(fd, k, 16) : "");
  await saveSettingsData({
    banner: {
      on: bool(fd, "on") && !!str(fd, "title"), // nothing to show without a headline
      autoDrop: bool(fd, "autoDrop"),
      kind: kind in BANNER_KINDS ? kind : "urgent",
      title: str(fd, "title", 90),
      text: str(fd, "text", 320),
      tab: str(fd, "tab", 24),
      linkLabel: str(fd, "linkLabel", 40),
      linkUrl: safeUrl(str(fd, "linkUrl", 500)),
      countdownTo: when("countdownTo"),
      hideAfter: when("hideAfter"),
    },
  });
  refresh();
  redirect(`/admin/banner?${saved()}`);
}

// ---------- sections ----------
async function uniqueSlug(base: string, exceptId?: number) {
  const b = slugify(base);
  let slug = b;
  for (let i = 2; ; i++) {
    const hit = await queryOne("SELECT id FROM sections WHERE slug=$1", [slug]);
    if (!hit || Number(hit.id) === exceptId) return slug;
    slug = `${b}-${i}`;
  }
}

export async function createSection(fd: FormData) {
  await requireAdmin();
  const title = str(fd, "title", 120) || "New section";
  const layout = LAYOUT_VALUES.includes(str(fd, "layout")) ? str(fd, "layout") : "cards";
  const slug = await uniqueSlug(title);
  const n = await queryOne("SELECT COUNT(*)::int AS n FROM sections");
  const row = await queryOne(
    `INSERT INTO sections (slug, code, nav_label, nav_emoji, eyebrow, eyebrow_emoji, title, layout, sort)
     VALUES ($1,$2,$3,'✨',$3,'✨',$3,$4,(SELECT COALESCE(MAX(sort),0)+1 FROM sections)) RETURNING id`,
    [slug, `G${Number(n?.n ?? 0) + 1}`, title, layout]
  );
  refresh();
  redirect(`/admin/s/${row!.id}`);
}

export async function updateSection(fd: FormData) {
  await requireAdmin();
  const id = int(fd, "id");
  const layout = LAYOUT_VALUES.includes(str(fd, "layout")) ? str(fd, "layout") : "cards";
  const slug = await uniqueSlug(str(fd, "slug", 60) || str(fd, "title"), id);
  const cats = str(fd, "categories", 2000).split(/[\n,]/).map((c) => c.trim()).filter(Boolean).join(", ");
  await query(
    `UPDATE sections SET title=$1, slug=$2, code=$3, nav_label=$4, nav_emoji=$5, eyebrow=$6, eyebrow_emoji=$7,
       subtitle=$8, layout=$9, emojis=$10, categories=$11, empty_text=$12, home_limit=$13, visible=$14, ribbon=$15 WHERE id=$16`,
    [str(fd, "title", 160), slug, str(fd, "code", 8), str(fd, "nav_label", 40), str(fd, "nav_emoji", 16),
     str(fd, "eyebrow", 80), str(fd, "eyebrow_emoji", 16), str(fd, "subtitle", 400), layout, str(fd, "emojis", 80),
     cats, str(fd, "empty_text", 300), Math.max(1, Math.min(60, int(fd, "home_limit", 6))), bool(fd, "visible"), bool(fd, "ribbon"), id]
  );
  await saveBoxes("sections", id, fd);
  refresh();
  redirect(`/admin/s/${id}?${saved()}#settings`);
}

export async function deleteSection(fd: FormData) {
  await requireAdmin();
  await query("DELETE FROM sections WHERE id=$1", [int(fd, "id")]);
  refresh();
  redirect("/admin?deleted=1");
}

export async function toggleSection(fd: FormData) {
  await requireAdmin();
  await query("UPDATE sections SET visible = NOT visible WHERE id=$1", [int(fd, "id")]);
  refresh();
}

async function reorder(table: "sections" | "items", id: number, dir: "up" | "down", sectionId?: number) {
  // an entry swaps with its neighbour in the same subsection, but the whole section is renumbered:
  // numbering one subsection alone made it collide with the others, so the site's order drifted from the dashboard's
  const all = await query(
    table === "items"
      ? "SELECT id, category FROM items WHERE section_id=$1 ORDER BY pinned DESC, sort, id"
      : "SELECT id, '' AS category FROM sections ORDER BY sort, id",
    table === "items" ? [sectionId] : []
  );
  const ids = all.map((r) => Number(r.id));
  const i = ids.indexOf(id);
  let j = dir === "up" ? i - 1 : i + 1;
  while (i >= 0 && j >= 0 && j < ids.length && all[j].category !== all[i].category) j += dir === "up" ? -1 : 1;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  for (const [k, rid] of ids.entries()) await query(`UPDATE ${table} SET sort=$1 WHERE id=$2`, [k + 1, rid]);
}

export async function moveSection(fd: FormData) {
  await requireAdmin();
  await reorder("sections", int(fd, "id"), str(fd, "dir") === "up" ? "up" : "down");
  refresh();
}

// ---------- items ----------
export async function createItem(fd: FormData) {
  await requireAdmin();
  const sectionId = int(fd, "section_id");
  const type = str(fd, "type") === "poll" ? "poll" : "post";
  const row = await queryOne(
    `INSERT INTO items (section_id, category, type, title, poll_options, sort)
     VALUES ($1,$2,$3,$4,$5,(SELECT COALESCE(MIN(sort),1)-1 FROM items WHERE section_id=$1)) RETURNING id`,
    [sectionId, str(fd, "category", 100), type, str(fd, "title", 300) || "Untitled",
     JSON.stringify(type === "poll" ? ["Option A", "Option B"] : [])]
  );
  refresh();
  redirect(`/admin/items/${row!.id}`);
}

export async function updateItem(fd: FormData) {
  await requireAdmin();
  const id = int(fd, "id");
  const tags = str(fd, "tags", 500).split(",").map((t) => t.trim()).filter(Boolean).join(", ");
  const mood = MOODS[str(fd, "mood")] ? str(fd, "mood") : "";
  const poll = lines(fd, "poll_options", 8);
  // photos + videos (first = cover); image_url keeps the first photo for link previews (and older code paths)
  // (a form from before multi-photo support only sends image_url; keep that photo instead of wiping it)
  const media = fd.has("media") ? parseMedia(str(fd, "media", 40000)) : parseMedia([], safeUrl(str(fd, "image_url", 500)));
  const firstPhoto = media.find((m) => m.type === "image")?.url ?? media.find((m) => m.thumb)?.thumb ?? "";
  await query(
    `UPDATE items SET title=$1, subtitle=$2, body=$3, image_url=$4, tags=$5, links=$6, date_label=$7, status=$8,
       mood=$9, location=$10, category=$11, poll_options=$12, pinned=$13, visible=$14, section_id=$15, media=$16 WHERE id=$17`,
    [str(fd, "title", 300), str(fd, "subtitle", 300), str(fd, "body", 100000), firstPhoto,
     tags, JSON.stringify(parseLinks(str(fd, "links", 20000))), str(fd, "date_label", 80), str(fd, "status", 60),
     mood, str(fd, "location", 160), str(fd, "category", 100), JSON.stringify(poll), bool(fd, "pinned"),
     bool(fd, "visible"), int(fd, "section_id"), JSON.stringify(media), id]
  );
  // only a Boarding passes entry's form sends this; any other form leaves what's stored alone
  if (fd.has("pass")) await query("UPDATE items SET pass=$1 WHERE id=$2", [JSON.stringify(cleanPass(String(fd.get("pass")))), id]);
  if (fd.has("study")) await query("UPDATE items SET study=$1 WHERE id=$2", [JSON.stringify(cleanStudy(String(fd.get("study")))), id]);
  if (fd.has("comic")) await query("UPDATE items SET comic=$1 WHERE id=$2", [JSON.stringify(cleanComic(String(fd.get("comic")))), id]);
  // a Comic strip's plain entry can become a poll; without at least two options it stays plain
  if (str(fd, "make_poll") === "1" && poll.length >= 2) await query("UPDATE items SET type='poll' WHERE id=$1", [id]);
  await saveBoxes("items", id, fd);
  refresh();
  redirect(`/admin/items/${id}?${saved()}`);
}

export async function deleteItem(fd: FormData) {
  await requireAdmin();
  const row = await queryOne("DELETE FROM items WHERE id=$1 RETURNING section_id", [int(fd, "id")]);
  refresh();
  redirect(row ? `/admin/s/${row.section_id}?deleted=1` : "/admin");
}

export async function toggleItem(fd: FormData) {
  await requireAdmin();
  await query("UPDATE items SET visible = NOT visible WHERE id=$1", [int(fd, "id")]);
  refresh();
}

export async function moveItem(fd: FormData) {
  await requireAdmin();
  await reorder("items", int(fd, "id"), str(fd, "dir") === "up" ? "up" : "down", int(fd, "section_id"));
  refresh();
}

/** Sets a section's whole order from the dashboard's drag-and-drop list. Pinned entries still come first on the site. */
export async function saveItemOrder(sectionId: number, ids: number[]) {
  await requireAdmin();
  const own = new Set((await query("SELECT id FROM items WHERE section_id=$1", [sectionId])).map((r) => Number(r.id)));
  const clean = ids.filter((id) => own.has(Number(id)));
  for (const [k, id] of clean.entries()) await query("UPDATE items SET sort=$1 WHERE id=$2 AND section_id=$3", [k + 1, id, sectionId]);
  refresh();
}

export async function resetPoll(fd: FormData) {
  await requireAdmin();
  await query("DELETE FROM votes WHERE item_id=$1", [int(fd, "id")]);
  redirect(`/admin/items/${int(fd, "id")}?${saved()}`);
}

export async function resetReactions(fd: FormData) {
  await requireAdmin();
  await query("DELETE FROM reactions WHERE item_id=$1", [int(fd, "id")]);
  redirect(`/admin/items/${int(fd, "id")}?${saved()}`);
}

// ---------- messages (admin) ----------
export async function messageAction(fd: FormData) {
  await requireAdmin();
  const id = int(fd, "id");
  const op = str(fd, "op");
  if (op === "read") await query("UPDATE messages SET read = NOT read WHERE id=$1", [id]);
  if (op === "approve") await query("UPDATE messages SET approved = NOT approved, read = TRUE WHERE id=$1", [id]);
  if (op === "delete") await query("DELETE FROM messages WHERE id=$1", [id]);
  if (op === "allread") await query("UPDATE messages SET read = TRUE");
  if (op === "reactions-seen") await query("UPDATE reactions SET seen = TRUE WHERE NOT seen");
  refresh();
}

// ---------- visitor: say hello ----------
const recent = new Map<string, number>();

type HelloState = { ok?: boolean; error?: string; values?: { name: string; email: string; message: string } };

export async function sendHello(_prev: HelloState | undefined, fd: FormData): Promise<HelloState> {
  if (str(fd, "website")) return { ok: true }; // honeypot: bots fill hidden fields
  const name = str(fd, "name", 80);
  const body = str(fd, "message", 2000);
  const email = str(fd, "email", 160);
  const values = { name, email, message: body };
  if (name.length < 1 || body.length < 2) return { error: "Please add your name and a message.", values };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email doesn't look right.", values };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const now = Date.now();
  if (now - (recent.get(ip) ?? 0) < 30_000) return { error: "Easy there, try again in a few seconds.", values };
  recent.set(ip, now);

  await query("INSERT INTO messages (name, email, body, wants_public) VALUES ($1,$2,$3,$4)",
    [name, email, body, bool(fd, "public")]);
  return { ok: true };
}
