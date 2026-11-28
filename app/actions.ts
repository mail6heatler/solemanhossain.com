"use server";

import { after } from "next/server";
import { alertOwner, binItems, binSection, binWhere, historyPush, ipHash, ipOf, loginBlocked, logLogin, spamVerdict, totpOk, useRecoveryCode, getSecret } from "@/lib/opsServer";
import { deviceName } from "@/lib/ops";
import { cleanLaunch } from "@/lib/launch";
import { cleanCardBar } from "@/lib/cardBar";
import { cleanStudy } from "@/lib/studyItem";
import { cleanComic } from "@/lib/comicItem";
import { cleanAward } from "@/lib/awardItem";
import { cleanScrap } from "@/lib/scrapItem";
import { cleanHeroDesign } from "@/lib/heroLook";
import { cleanConnect, cleanSocials, type ConnectDesign } from "@/lib/connectLook";
import { cleanFooter, cleanMenu, type FooterDesign, type MenuDesign } from "@/lib/chrome";
import { KEY_RE, chatThread, chatWhere, hashKey, isConvId, listChats, markChatSeen, ownerPing, type ChatMsg, type ChatSummary } from "@/lib/chat";
import { cleanCard } from "@/lib/cardLook";
import { cleanBoxes } from "@/lib/boxes";
import { COMMENT_MAX, TALK_FEATURES, cleanTalk } from "@/lib/talk";
import { cleanFv } from "@/lib/fullView";
import type { StudioData, StudioSave } from "@/lib/studio";
import { loadStudio } from "@/lib/studioData";
import { cleanPass } from "@/lib/tripPass";
import { cleanMascot } from "@/lib/mascot";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { query, queryOne } from "@/lib/db";
import { getComments, getPollCounts, getReactionCounts, getReactionPeople, getSettings, type Comment } from "@/lib/data";
import {
  checkCurrentPassword, checkLogin, checkTicket, createSession, currentSid, destroySession, hashPassword, isAdmin, makeTicket, requireAdmin,
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

/** how a deleted chat is named in the recycle bin */
const CHAT_LABEL = (rows: { name?: string; from_owner?: boolean }[]) => `Chat with ${rows.find((x: { from_owner?: boolean }) => !x.from_owner)?.name || "a visitor"} (${rows.length} message${rows.length === 1 ? "" : "s"})`;

async function saveSettingsData(patch: Partial<SiteSettings>, label = "Settings saved") {
  await historyPush(label).catch(() => {}); // a copy of how it was, for Settings → Settings history
  const current = await getSettings();
  await query("UPDATE settings SET data=$1 WHERE id=1", [JSON.stringify({ ...current, ...patch })]);
}

// ---------- auth ----------
type LoginState = { error?: string; username?: string; step?: "code"; ticket?: string };
/**
 * Signing in: a lockout after too many wrong tries from one place (Settings → Login protection), every try in the login
 * history, and, with two-step login on, a second step that asks for the code from the owner's authenticator app
 * (or a recovery code, once). The ticket proves the password was right for the next 5 minutes.
 */
export async function login(_prev: LoginState | undefined, fd: FormData): Promise<LoginState> {
  if (!process.env.ADMIN_PASSWORD) return { error: "ADMIN_PASSWORD is not set on the server." };
  if (process.env.NODE_ENV === "production" && (process.env.AUTH_SECRET ?? "").length < 16)
    return { error: "AUTH_SECRET is not set on the server (needs 16+ characters)." };
  const h = await headers();
  const ip = ipOf(h), device = deviceName(h.get("user-agent") ?? ""), username = str(fd, "username", 100);
  const wait = await loginBlocked(ipHash(ip));
  if (wait) return { error: `Too many wrong tries. Try again in ${wait} minute${wait === 1 ? "" : "s"}.`, username };
  const slow = () => new Promise((r) => setTimeout(r, 900)); // slows down guessing

  const ticket = str(fd, "ticket", 1000);
  if (ticket) {
    if (!(await checkTicket(ticket))) return { error: "That took a while, so sign in again from the start.", username };
    const code = str(fd, "code", 20).replace(/\s/g, "");
    const good = totpOk(await getSecret("2fa_secret"), code) || (code.length > 6 && (await useRecoveryCode(code)));
    if (!good) {
      await logLogin(false, ip, device, "wrong code");
      await slow();
      return { step: "code", ticket, username, error: "That code didn't work. Type the one showing now." };
    }
    await logLogin(true, ip, device, code.length > 6 ? "with a recovery code" : "with a code from the app");
    await createSession();
    redirect("/admin");
  }

  const ok = await checkLogin(username, String(fd.get("password") ?? ""));
  if (!ok) {
    await logLogin(false, ip, device, "wrong password");
    await slow();
    return { error: "Wrong username or password.", username };
  }
  const s = await getSettings();
  if (s.ops.twoStep.on && (await getSecret("2fa_secret"))) return { step: "code", ticket: await makeTicket(), username };
  await logLogin(true, ip, device);
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
  await query("UPDATE sessions SET revoked=true");
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

/** What the hero's live editor saves: every word on the hero, its photo and résumé, and its design (lib/heroLook.ts). */
export type HeroSave = {
  fullName: string; nickname: string; initials: string; brandPhrases: string[]; statusText: string; nowStatus: string;
  headline1: string; headline2: string; subtitle: string; roleChips: string[]; skills: string[];
  location: string; timezone: string; clockLabel: string; avatarUrl: string; resumeUrl: string;
  ctaPrimaryLabel: string; ctaSecondaryLabel: string; ctaSecondaryUrl: string; heroEmojis: string; scrollCue: string;
  heroDesign: unknown;
};

/** The hero's live editor's one Save. Everything is cleaned the same way as the older hero page did. */
export async function saveHeroStudio(raw: HeroSave): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  try {
    const t = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
    const many = (v: unknown, n: number, max = 120) => (Array.isArray(v) ? v : []).map((x) => t(x, max)).filter(Boolean).slice(0, n);
    const fullName = t(raw.fullName, 120);
    if (!fullName) return { ok: false, error: "Your full name can't be empty." };
    await saveSettingsData({
      fullName, nickname: t(raw.nickname, 80), initials: t(raw.initials, 3).toUpperCase(), brandPhrases: many(raw.brandPhrases, 8),
      statusText: t(raw.statusText, 160), nowStatus: t(raw.nowStatus, 120), headline1: t(raw.headline1, 80), headline2: t(raw.headline2, 80), subtitle: t(raw.subtitle, 400),
      roleChips: many(raw.roleChips, 8), skills: many(raw.skills, 30), location: t(raw.location, 120), timezone: t(raw.timezone, 60) || "UTC", clockLabel: t(raw.clockLabel, 12),
      avatarUrl: safeUrl(t(raw.avatarUrl, 500)), resumeUrl: safeUrl(t(raw.resumeUrl, 500)), ctaPrimaryLabel: t(raw.ctaPrimaryLabel, 40), ctaSecondaryLabel: t(raw.ctaSecondaryLabel, 40),
      ctaSecondaryUrl: safeUrl(t(raw.ctaSecondaryUrl, 300)) || "#connect", heroEmojis: t(raw.heroEmojis, 80), scrollCue: t(raw.scrollCue, 60),
      heroDesign: cleanHeroDesign(raw.heroDesign),
    });
    refresh();
    return { ok: true };
  } catch (e) {
    console.error("saveHeroStudio", e);
    return { ok: false, error: "That didn't save. Nothing was lost here: try Save again." };
  }
}

/** What Connect's live editor sends: the chat window's design, the links, the greeting heading, its two switches and the section's own header words. */
export type ConnectSave = {
  connect: ConnectDesign; socials: Social[]; connectFormTitle: string; chatfx: boolean; plane: boolean;
  section: { id: number; title: string; eyebrow: string; eyebrow_emoji: string; subtitle: string; nav_label: string; nav_emoji: string; code: string };
};

/** Connect's live editor's one Save (G8). Everything is cleaned the same way it's read (lib/connectLook.ts). */
export async function saveConnectStudio(raw: ConnectSave): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  try {
    const t = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
    const sec = raw.section ?? ({} as ConnectSave["section"]);
    const id = Number(sec.id);
    const title = t(sec.title, 160);
    if (!title) return { ok: false, error: "The section's big title can't be empty." };
    if (Number.isInteger(id) && id > 0) {
      await query("UPDATE sections SET title=$1, eyebrow=$2, eyebrow_emoji=$3, subtitle=$4, nav_label=$5, nav_emoji=$6, code=$7 WHERE id=$8",
        [title, t(sec.eyebrow, 80), t(sec.eyebrow_emoji, 16), t(sec.subtitle, 400), t(sec.nav_label, 40), t(sec.nav_emoji, 16), t(sec.code, 8), id]);
    }
    const now = await getSettings();
    await saveSettingsData({
      connect: cleanConnect(raw.connect),
      socials: cleanSocials(raw.socials),
      connectFormTitle: t(raw.connectFormTitle, 80),
      effects: { ...now.effects, chatfx: raw.chatfx !== false, plane: raw.plane !== false },
    });
    refresh();
    return { ok: true };
  } catch (e) {
    console.error("saveConnectStudio", e);
    return { ok: false, error: "That didn't save. Nothing was lost here: try Save again." };
  }
}

/** The menu bar's dashboard page (/admin/menu): its look, background, phone menu, extras, ticker lines and which sections it lists. */
export async function saveMenu(raw: MenuDesign): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  try { await saveSettingsData({ menu: cleanMenu(raw) }); refresh(); return { ok: true }; }
  catch (e) { console.error("saveMenu", e); return { ok: false, error: "That didn't save. Nothing was lost here: try Save again." }; }
}

/** The footer's dashboard page (/admin/footer): its look, its words and extras, and the two footer lines (which moved here from Settings). */
export async function saveFooter(raw: { footer: FooterDesign; footerLeft: string; footerRight: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  try {
    const t = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
    await saveSettingsData({ footer: cleanFooter(raw.footer), footerLeft: t(raw.footerLeft, 200), footerRight: t(raw.footerRight, 200) });
    refresh();
    return { ok: true };
  } catch (e) { console.error("saveFooter", e); return { ok: false, error: "That didn't save. Nothing was lost here: try Save again." }; }
}

/** The mascot's dashboard page (components/admin/MascotStudio.tsx) saves everything about him at once. */
export async function saveMascot(raw: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  try {
    await saveSettingsData({ mascot: cleanMascot(raw) });
    refresh();
    return { ok: true };
  } catch (e) { console.error("saveMascot", e); return { ok: false, error: "That didn't save. Nothing was lost here: try Save again." }; }
}

/** The launch screen's dashboard page (components/admin/LaunchStudio.tsx): everything in settings.launch, cleaned (lib/launch.ts). */
export async function saveLaunch(raw: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  try {
    await saveSettingsData({ launch: cleanLaunch(raw) });
    refresh();
    return { ok: true };
  } catch (e) { console.error("saveLaunch", e); return { ok: false, error: "That didn't save. Nothing was lost here: try Save again." }; }
}

/**
 * The sticker buttons on cards (lib/cardBar.ts): the dashboard's Card buttons page saves them in one go. `panel` is its switch for the whole
 * Buttons panel on every card, which is all content's hide `bar` (lib/contentStyle.ts), the same as the Content sizes page's.
 */
export async function saveCardBar(raw: unknown, panel?: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  try {
    const patch: Parameters<typeof saveSettingsData>[0] = { cardBar: cleanCardBar(raw) };
    if (typeof panel === "boolean") {
      const cs = (await getSettings()).contentStyle, hide = { ...cs.hide };
      if (panel) delete hide.bar; else hide.bar = true;
      patch.contentStyle = cleanStyle({ ...cs, hide });
    }
    await saveSettingsData(patch);
    refresh();
    return { ok: true };
  } catch (e) { console.error("saveCardBar", e); return { ok: false, error: "That didn't save. Nothing was lost here: try Save again." }; }
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
  // the links moved to Connect's live editor: only change them if this form still sends them
  let socials: Social[] | undefined;
  if (fd.has("socials")) try {
    const arr = JSON.parse(str(fd, "socials", 20000));
    socials = (Array.isArray(arr) ? arr : []).flatMap((r) => {
      const [l] = parseLinks([r]);
      return l ? [{ ...l, icon: String(r.icon ?? "link").replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "link" }] : [];
    });
  } catch {}
  await saveSettingsData({
    siteTitle: str(fd, "siteTitle", 120),
    siteDescription: str(fd, "siteDescription", 300),
    // the footer's lines moved to the Footer page; only change them if this form still sends them
    ...(fd.has("footerLeft") ? { footerLeft: str(fd, "footerLeft", 200), footerRight: str(fd, "footerRight", 200) } : {}),
    ...(fd.has("connectFormTitle") ? { connectFormTitle: str(fd, "connectFormTitle", 80) } : {}),
    adminUsername: str(fd, "adminUsername", 60) || "admin",
    ...(socials ? { socials } : {}),
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
  await binSection(int(fd, "id"));
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
  if (fd.has("award")) await query("UPDATE items SET award=$1 WHERE id=$2", [JSON.stringify(cleanAward(String(fd.get("award")))), id]);
  if (fd.has("scrap")) await query("UPDATE items SET scrap=$1 WHERE id=$2", [JSON.stringify(cleanScrap(String(fd.get("scrap")))), id]);
  if (fd.has("card")) await query("UPDATE items SET card=$1 WHERE id=$2", [JSON.stringify(cleanCard(String(fd.get("card")))), id]);
  // a Comic strip's plain entry can become a poll; without at least two options it stays plain
  if (str(fd, "make_poll") === "1" && poll.length >= 2) await query("UPDATE items SET type='poll' WHERE id=$1", [id]);
  // each feature's switch in the Reactions & comments box
  if (fd.has("talk_sent")) {
    const on = new Set(fd.getAll("talk").map(String));
    await query("UPDATE items SET talk=$1 WHERE id=$2", [JSON.stringify(Object.fromEntries(TALK_FEATURES.map(([k]) => [k, on.has(k)]))), id]);
  }
  await saveBoxes("items", id, fd);
  refresh();
  redirect(`/admin/items/${id}?${saved()}`);
}

export async function deleteItem(fd: FormData) {
  await requireAdmin();
  await binItems([int(fd, "id")]);
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
  if (op === "delete") { await binWhere("message", "messages", "id=$1", [id], (rows) => `Message from ${rows[0].name}`); await query("DELETE FROM messages WHERE id=$1", [id]); }
  // "Mark all read" clears everything the Inbox's number counts: messages, new reactions and new comments
  if (op === "allread") {
    await query("UPDATE messages SET read = TRUE WHERE NOT read");
    await query("UPDATE reactions SET seen = TRUE WHERE NOT seen");
    await query("UPDATE comments SET seen = TRUE WHERE NOT seen");
  }
  if (op === "reactions-seen") await query("UPDATE reactions SET seen = TRUE WHERE NOT seen");
  if (op === "comments-seen") await query("UPDATE comments SET seen = TRUE WHERE NOT seen");
  refresh();
  // back to the tab it was pressed on, with a message saying it worked
  const f = str(fd, "f", 20);
  const tab = ["unread", "public", "reactions", "comments"].includes(f) ? `f=${f}&` : "";
  redirect(`/admin/inbox?${tab}done=${encodeURIComponent(op)}&t=${Date.now()}`);
}

// ---------- comments (admin) ----------
export async function commentAction(fd: FormData) {
  await requireAdmin();
  const id = int(fd, "id"), op = str(fd, "op");
  const row = await queryOne("SELECT item_id, pinned FROM comments WHERE id=$1", [id]);
  if (!row) return;
  const itemId = Number(row.item_id);
  if (op === "reply") await query("UPDATE comments SET reply=$1, seen=TRUE WHERE id=$2", [str(fd, "reply", COMMENT_MAX), id]);
  if (op === "hide") await query("UPDATE comments SET hidden = NOT hidden, seen=TRUE WHERE id=$1", [id]);
  if (op === "delete") { await binWhere("comment", "comments", "id=$1", [id], (rows) => `Comment by ${rows[0].name}`); await query("DELETE FROM comments WHERE id=$1", [id]); }
  if (op === "pin") { // one at a time: pinning another replaces it
    await query("UPDATE comments SET pinned=FALSE WHERE item_id=$1", [itemId]);
    if (!row.pinned) await query("UPDATE comments SET pinned=TRUE, seen=TRUE WHERE id=$1", [id]);
  }
  redirect(`/admin/items/${itemId}?${saved()}#comments`);
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
  // a chat goes back and forth, so a visitor in a conversation may send more often than a one-off form
  const key = str(fd, "conv", 80);
  const conv = KEY_RE.test(key) ? hashKey(key) : null;
  if (now - (recent.get(ip) ?? 0) < (conv ? 4_000 : 20_000)) return { error: "Easy there, try again in a few seconds.", values };
  recent.set(ip, now);

  // Settings → Spam control: a blocked visitor is told it was sent (so they don't try another way), blocked words and too many
  // messages in an hour get a plain no
  const ipH = ipHash(ip);
  const verdict = await spamVerdict(`${name}
${body}`, ipH, conv);
  if (verdict === "blocked") return { ok: true };
  if (verdict === "words") return { error: "This message couldn't be sent.", values };
  if (verdict === "busy") return { error: "That's a lot of messages for one hour. Please try again later.", values };

  await query("INSERT INTO messages (name, email, body, wants_public, conv, ip_hash) VALUES ($1,$2,$3,$4,$5,$6)",
    [name, email, body, bool(fd, "public"), conv, ipH]);
  after(() => alertOwner("chat", `💬 New message from ${name}${email ? ` (${email})` : ""}:

${body}`));
  return { ok: true };
}

// ---------- the live editor (components/admin/studio): a whole section saves at once ----------
/**
 * One Save for a section's page: its header and settings, every card in the order shown, each card's size, look, reactions switches and full view,
 * new cards (an id below zero) and the ones in the bin. Everything is cleaned here as the older forms do, and what's now stored is handed back.
 */
export async function saveStudio(raw: StudioSave): Promise<{ ok: true; data: StudioData } | { ok: false; error: string }> {
  await requireAdmin();
  try {
    const sectionId = Number(raw?.sectionId);
    if (!Number.isInteger(sectionId) || !(await queryOne("SELECT id FROM sections WHERE id=$1", [sectionId]))) return { ok: false, error: "That section no longer exists. Reload the page." };
    const t = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
    const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
    const sec = raw.section ?? ({} as StudioSave["section"]);
    const layout = LAYOUT_VALUES.includes(String(sec.layout)) ? String(sec.layout) : "notes";
    const title = t(sec.title, 160) || "Untitled";
    const slug = await uniqueSlug(t(sec.slug, 60) || title, sectionId);
    // subsections are stored with commas between them, so a name can't hold one
    const cats = list(sec.categories).map((c) => t(c, 100).replace(/,/g, " ")).filter(Boolean).slice(0, 40).join(", ");
    await query(
      `UPDATE sections SET title=$1, slug=$2, code=$3, nav_label=$4, nav_emoji=$5, eyebrow=$6, eyebrow_emoji=$7,
         subtitle=$8, layout=$9, emojis=$10, categories=$11, empty_text=$12, home_limit=$13, visible=$14, ribbon=$15, style=$16 WHERE id=$17`,
      [title, slug, t(sec.code, 8), t(sec.nav_label, 40), t(sec.nav_emoji, 16), t(sec.eyebrow, 80), t(sec.eyebrow_emoji, 16), t(sec.subtitle, 400), layout, t(sec.emojis, 80),
       cats, t(sec.empty_text, 300), Math.max(1, Math.min(60, Math.round(Number(sec.home_limit)) || 6)), sec.visible !== false, sec.ribbon !== false, JSON.stringify(cleanStyle(sec.style)), sectionId]
    );
    const now = await getSettings();
    await saveSettingsData({
      ribbonSize: cleanRibbonSize(raw.ribbonSize),
      effects: { ...now.effects, notefx: typeof raw.notefx === "boolean" ? raw.notefx : now.effects.notefx, windowfx: typeof raw.windowfx === "boolean" ? raw.windowfx : now.effects.windowfx, tripfx: typeof raw.tripfx === "boolean" ? raw.tripfx : now.effects.tripfx, studyfx: typeof raw.studyfx === "boolean" ? raw.studyfx : now.effects.studyfx, comicfx: typeof raw.comicfx === "boolean" ? raw.comicfx : now.effects.comicfx, awardfx: typeof raw.awardfx === "boolean" ? raw.awardfx : now.effects.awardfx, scrapfx: typeof raw.scrapfx === "boolean" ? raw.scrapfx : now.effects.scrapfx, fullfx: typeof raw.fullfx === "boolean" ? raw.fullfx : now.effects.fullfx },
    });

    const own = new Map((await query("SELECT id, type FROM items WHERE section_id=$1", [sectionId])).map((r) => [Number(r.id), String(r.type)]));
    const sectionIds = new Set((await query("SELECT id FROM sections")).map((r) => Number(r.id)));
    const gone = new Set(list(raw.deleted).map(Number).filter((id) => own.has(id)));
    if (gone.size) await binItems([...gone]);
    for (const id of gone) await query("DELETE FROM items WHERE id=$1", [id]);

    let sort = 0;
    for (const item of list(raw.items).slice(0, 500)) {
      const it = (item ?? {}) as StudioSave["items"][number];
      const given = Number(it.id), isNew = !(given > 0);
      if (!isNew && (!own.has(given) || gone.has(given))) continue; // another section's, or deleted in this same save
      // a post can become a poll here (a comic's "Let people vote"), never the other way, which would leave its votes behind
      const type = isNew || own.get(given) === "post" ? (it.type === "poll" ? "poll" : "post") : own.get(given)!;
      const tags = list(it.tags).map((x) => t(x, 60).replace(/,/g, " ")).filter(Boolean).slice(0, 30).join(", ");
      const mood = MOODS[String(it.mood)] ? String(it.mood) : "";
      let poll = list(it.poll_options).map((x) => t(x, 120)).filter(Boolean).slice(0, 8);
      if (type === "poll" && poll.length < 2) poll = ["Option A", "Option B"];
      // photos + videos (first = cover); image_url keeps the first photo for link previews
      const media = parseMedia(list(it.media));
      const firstPhoto = media.find((m) => m.type === "image")?.url ?? media.find((m) => m.thumb)?.thumb ?? "";
      sort += 1;
      const vals = [t(it.title, 300) || "Untitled", t(it.subtitle, 300), t(it.body, 100000), firstPhoto, tags, JSON.stringify(parseLinks(list(it.links))), t(it.date_label, 80),
        t(it.status, 60), mood, t(it.location, 160), t(it.category, 100).replace(/,/g, " "), JSON.stringify(poll), it.pinned === true, it.visible !== false, JSON.stringify(media),
        JSON.stringify(cleanStyle(it.style)), JSON.stringify(cleanCard(it.card)), JSON.stringify(cleanTalk(it.talk)), JSON.stringify(cleanFv(it.fv)), sort];
      let id = given;
      if (isNew) {
        const row = await queryOne(
          `INSERT INTO items (title, subtitle, body, image_url, tags, links, date_label, status, mood, location, category, poll_options, pinned, visible, media, style, card, talk, fv, sort, section_id, type)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) RETURNING id`, [...vals, sectionId, type]);
        id = Number(row!.id);
      } else {
        await query(
          `UPDATE items SET title=$1, subtitle=$2, body=$3, image_url=$4, tags=$5, links=$6, date_label=$7, status=$8, mood=$9, location=$10, category=$11, poll_options=$12,
             pinned=$13, visible=$14, media=$15, style=$16, card=$17, talk=$18, fv=$19, sort=$20 WHERE id=$21`, [...vals, id]);
      }
      // a trip's pass (its details, tick lines and vehicle)
      if (it.pass) await query("UPDATE items SET pass=$1 WHERE id=$2", [JSON.stringify(cleanPass(it.pass)), id]);
      if (!isNew && type !== own.get(given)) await query("UPDATE items SET type=$1 WHERE id=$2", [type, id]);
      if (it.comic) await query("UPDATE items SET comic=$1 WHERE id=$2", [JSON.stringify(cleanComic(it.comic)), id]);
      if (it.award) await query("UPDATE items SET award=$1 WHERE id=$2", [JSON.stringify(cleanAward(it.award)), id]);
      if (it.scrap) await query("UPDATE items SET scrap=$1 WHERE id=$2", [JSON.stringify(cleanScrap(it.scrap)), id]);
      // a shelf entry's object, screen, kind and the line that stuck
      if (it.study) await query("UPDATE items SET study=$1 WHERE id=$2", [JSON.stringify(cleanStudy(it.study)), id]);
      // moved to another section: it goes to the front there, as a new entry would
      const target = Number(it.section_id);
      if (target !== sectionId && sectionIds.has(target)) await query("UPDATE items SET section_id=$1, sort=(SELECT COALESCE(MIN(sort),1)-1 FROM items WHERE section_id=$1) WHERE id=$2", [target, id]);
    }
    refresh();
    const data = await loadStudio(sectionId);
    return data ? { ok: true, data } : { ok: false, error: "Saved, but the page couldn't be read back. Reload it." };
  } catch (e) {
    console.error("saveStudio", e);
    return { ok: false, error: "That didn't save. Nothing was lost here: try Save again." };
  }
}

/** A comment's reply, pin, hide or delete from the live editor. It happens right away, and the entry's comments come back. */
export async function studioComment(id: number, op: "reply" | "pin" | "hide" | "delete", reply = ""): Promise<Comment[] | null> {
  await requireAdmin();
  const row = await queryOne("SELECT item_id, pinned FROM comments WHERE id=$1", [Number(id)]);
  if (!row) return null;
  const itemId = Number(row.item_id);
  if (op === "reply") await query("UPDATE comments SET reply=$1, seen=TRUE WHERE id=$2", [String(reply ?? "").trim().slice(0, COMMENT_MAX), id]);
  if (op === "hide") await query("UPDATE comments SET hidden = NOT hidden, seen=TRUE WHERE id=$1", [id]);
  if (op === "delete") { await binWhere("comment", "comments", "id=$1", [id], (rows) => `Comment by ${rows[0].name}`); await query("DELETE FROM comments WHERE id=$1", [id]); }
  if (op === "pin") { // one at a time: pinning another replaces it
    await query("UPDATE comments SET pinned=FALSE WHERE item_id=$1", [itemId]);
    if (!row.pinned) await query("UPDATE comments SET pinned=TRUE, seen=TRUE WHERE id=$1", [id]);
  }
  return getComments(itemId, true);
}

/** Clears an entry's reactions or a poll's votes from the live editor, right away, and says what's left. */
export async function studioReset(kind: "reactions" | "votes", itemId: number, options = 0) {
  await requireAdmin();
  const id = Number(itemId);
  await query(kind === "votes" ? "DELETE FROM votes WHERE item_id=$1" : "DELETE FROM reactions WHERE item_id=$1", [id]);
  return { reactions: await getReactionCounts(id), people: await getReactionPeople(id), votes: await getPollCounts(id, Math.max(0, Math.min(8, Number(options) || 0))) };
}

// ---------- the Inbox as chats (components/admin/ChatInbox.tsx) ----------
const REACTS = ["❤️", "😂", "👍", "🙏", "😮", "🔥"];
const chatKey = (k: unknown) => { const s = String(k ?? ""); return isConvId(s) || /^m\d{1,10}$/.test(s) ? s : ""; };

/**
 * The Inbox checks in every few seconds: the owner is around (and typing in `typing`, if given), the open chat is read and seen,
 * and it gets every chat's summary and the open chat's messages back. It changes no page, so nothing is revalidated.
 */
export async function inboxPoll(open: string, typing = false): Promise<{ chats: ChatSummary[]; thread: ChatMsg[] | null }> {
  await requireAdmin();
  const key = chatKey(open);
  await ownerPing(typing && isConvId(key) ? key : "");
  if (key) await markChatSeen(key);
  const [chats, thread] = await Promise.all([listChats(), key ? chatThread(key) : Promise.resolve(null)]);
  return { chats, thread };
}

/** The owner's reply in a chat. It reaches the visitor in their chat on the site, so only chats with a private key can take one. */
export async function inboxReply(open: string, body: string): Promise<{ ok: true; thread: ChatMsg[] } | { ok: false; error: string }> {
  await requireAdmin();
  const key = chatKey(open), text = String(body ?? "").trim().slice(0, 2000);
  if (!text) return { ok: false, error: "Write something first." };
  if (!isConvId(key)) return { ok: false, error: "This person wrote before replies existed, so a reply can't reach them on the site. Use Reply in Gmail if they left an email." };
  const s = await getSettings();
  await query("INSERT INTO messages (name, email, body, conv, from_owner, read) VALUES ($1, '', $2, $3, TRUE, TRUE)", [s.connect.name || s.nickname || s.fullName || "Me", text, key]);
  await ownerPing("");
  return { ok: true, thread: await chatThread(key) };
}

/** The owner's emoji on one of a visitor's messages; the same one again takes it off. */
export async function inboxReact(id: number, emoji: string) {
  await requireAdmin();
  const e = REACTS.includes(emoji) ? emoji : "";
  await query("UPDATE messages SET react = CASE WHEN react = $2 THEN '' ELSE $2 END WHERE id=$1 AND NOT from_owner", [Number(id), e]);
}

/** Puts a message on the Wall or hides it from there, with the owner's public reply under it. The owner decides; a visitor's 📌 is only a request. */
export async function inboxWall(id: number, on: boolean, reply: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const row = await queryOne("SELECT id FROM messages WHERE id=$1 AND NOT from_owner", [Number(id)]);
  if (!row) return { ok: false, error: "That message is gone. Reload the page." };
  await query("UPDATE messages SET approved=$2, wall_reply=$3, read=TRUE WHERE id=$1", [Number(id), !!on, String(reply ?? "").trim().slice(0, 300)]);
  refresh();
  return { ok: true };
}

/** Deletes a whole chat, or one message of it. */
export async function inboxDelete(open: string, id?: number) {
  await requireAdmin();
  const key = chatKey(open);
  if (id) await binWhere("message", "messages", "id=$1", [Number(id)], (rows) => `Message from ${rows[0].name}`);
  else if (isConvId(key)) await binWhere("chat", "messages", "conv=$1", [key], CHAT_LABEL);
  else if (key) await binWhere("chat", "messages", "id=$1 AND conv IS NULL", [Number(key.slice(1))], CHAT_LABEL);
  if (id) await query("DELETE FROM messages WHERE id=$1", [Number(id)]);
  else if (isConvId(key)) await query("DELETE FROM messages WHERE conv=$1", [key]);
  else if (key) await query("DELETE FROM messages WHERE id=$1 AND conv IS NULL", [Number(key.slice(1))]);
  refresh();
}

/** The saved replies the Inbox offers under the box. */
export async function inboxSaved(list: string[]) {
  await requireAdmin();
  const now = await getSettings();
  await saveSettingsData({ connect: cleanConnect({ ...now.connect, saved: list }) });
}

export type BulkOp = "read" | "unread" | "pin" | "unpin" | "delete" | "reply";
/**
 * Something done to several chats at once (the Inbox's Select, and the quick buttons on a chat): mark read or unread, put on the Wall (the
 * messages that asked to go there, or else the newest message) or hide from it, delete, or send the same reply to each (only chats that can
 * take one). Says how many it changed and skipped.
 */
export async function inboxBulk(op: BulkOp, keys: string[], body = ""): Promise<{ ok: true; done: number; skipped: number } | { ok: false; error: string }> {
  await requireAdmin();
  const list = (Array.isArray(keys) ? keys : []).map(chatKey).filter(Boolean).slice(0, 500);
  if (!list.length) return { ok: false, error: "Pick at least one chat first." };
  const text = String(body ?? "").trim().slice(0, 2000);
  if (op === "reply" && !text) return { ok: false, error: "Write the reply first." };
  const s = op === "reply" ? await getSettings() : null;
  let done = 0, skipped = 0;
  for (const key of list) {
    const w = chatWhere(key);
    if (!w) { skipped++; continue; }
    const [cond, arg] = w;
    if (op === "read") await query(`UPDATE messages SET read=TRUE, seen_at=COALESCE(seen_at, NOW()) WHERE ${cond} AND NOT from_owner`, [arg]);
    else if (op === "unread") await query(`UPDATE messages SET read=FALSE WHERE ${cond} AND NOT from_owner`, [arg]);
    else if (op === "pin") {
      const asked = await query(`UPDATE messages SET approved=TRUE, read=TRUE WHERE ${cond} AND NOT from_owner AND wants_public RETURNING id`, [arg]);
      if (!asked.length) {
        const newest = await queryOne(`SELECT id FROM messages WHERE ${cond} AND NOT from_owner ORDER BY created_at DESC, id DESC LIMIT 1`, [arg]);
        if (!newest) { skipped++; continue; }
        await query("UPDATE messages SET approved=TRUE, read=TRUE WHERE id=$1", [newest.id]);
      }
    }
    else if (op === "unpin") await query(`UPDATE messages SET approved=FALSE WHERE ${cond} AND NOT from_owner`, [arg]);
    else if (op === "delete") { await binWhere("chat", "messages", cond, [arg], CHAT_LABEL); await query(`DELETE FROM messages WHERE ${cond}`, [arg]); }
    else if (op === "reply") {
      if (!isConvId(key)) { skipped++; continue; }
      await query("INSERT INTO messages (name, email, body, conv, from_owner, read) VALUES ($1, '', $2, $3, TRUE, TRUE)", [s!.connect.name || s!.nickname || s!.fullName || "Me", text, key]);
      await query("UPDATE messages SET read=TRUE WHERE conv=$1 AND NOT from_owner", [key]);
    } else return { ok: false, error: "Unknown action." };
    done++;
  }
  if (op === "pin" || op === "unpin" || op === "delete") refresh();
  return { ok: true, done, skipped };
}

/** Deletes every chat and message, after the Inbox's confirmation. */
export async function inboxDeleteAll(): Promise<{ ok: true }> {
  await requireAdmin();
  await binWhere("chat", "messages", "TRUE", [], (rows) => `Every chat and message (${rows.length})`);
  await query("DELETE FROM messages");
  refresh();
  return { ok: true };
}
