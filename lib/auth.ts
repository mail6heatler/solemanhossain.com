import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getAuthRow, getSettings } from "./data";
import { query, queryOne } from "./db";
import { deviceName } from "./ops";
import { ipHint, ipOf } from "./opsServer";

const COOKIE = "lc_admin";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  let s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV !== "production") s = "dev-only-secret-change-me-please";
  if (!s || s.length < 16) throw new Error("AUTH_SECRET must be set (at least 16 characters).");
  return new TextEncoder().encode(s);
}

const sha = (s: string) => createHash("sha256").update(s).digest();
const sameText = (a: string, b: string) => timingSafeEqual(sha(a), sha(b));

export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

function verifyHash(pw: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = scryptSync(pw, salt, 64);
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * The password set in the dashboard works, and the ADMIN_PASSWORD environment
 * variable always works too, as a recovery key if you forget the dashboard one.
 */
export async function checkLogin(username: string, password: string) {
  const [settings, auth] = await Promise.all([getSettings(), getAuthRow()]);
  const userOk = sameText(username.trim().toLowerCase(), settings.adminUsername.trim().toLowerCase());
  const envPw = process.env.ADMIN_PASSWORD ?? "";
  const envOk = envPw.length > 0 && sameText(password, envPw);
  const dbOk = auth.passwordHash ? verifyHash(password, auth.passwordHash) : false;
  return userOk && (envOk || dbOk);
}

export async function checkCurrentPassword(password: string) {
  const auth = await getAuthRow();
  const envPw = process.env.ADMIN_PASSWORD ?? "";
  return (envPw && sameText(password, envPw)) || (auth.passwordHash ? verifyHash(password, auth.passwordHash) : false);
}

/** signs this device in: a session of its own (Settings → Your devices can sign it out alone), and the owner's mark for the site */
export async function createSession() {
  const { sessionVersion } = await getAuthRow();
  const h = await headers();
  const sid = randomBytes(12).toString("hex");
  await query("INSERT INTO sessions (sid, device, ip_hint) VALUES ($1,$2,$3)", [sid, deviceName(h.get("user-agent") ?? ""), ipHint(ipOf(h))]);
  const token = await new SignJWT({ role: "admin", v: sessionVersion, sid })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MAX_AGE });
  jar.set(OWNER_MARK, "1", { httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MAX_AGE });
}
/** this device's session, to mark it in the list of devices */
export async function currentSid() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return "";
  try { return String((await jwtVerify(token, secret())).payload.sid ?? ""); } catch { return ""; }
}

export async function destroySession() {
  const sid = await currentSid();
  if (sid) await query("UPDATE sessions SET revoked=true WHERE sid=$1", [sid]);
  const c = await cookies();
  c.delete(COOKIE);
  c.delete(OWNER_MARK);
}
/** Not a login: only tells the website's own scripts that the owner is here (they see the site past maintenance or private mode,
 *  and their visits aren't counted unless they want). Every save and every page of the dashboard still checks the real cookie. */
export const OWNER_MARK = "lc_owner";

export async function isAdmin() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.role !== "admin") return false;
    const { sessionVersion } = await getAuthRow();
    if (payload.v !== sessionVersion) return false;
    // a device signed out on its own (Settings → Your devices); sign-ins from before devices were listed have no session id
    if (payload.sid) {
      const row = await queryOne("SELECT revoked, last_seen FROM sessions WHERE sid=$1", [String(payload.sid)]);
      if (!row || row.revoked) return false;
      if (Date.now() - new Date(row.last_seen).getTime() > 300_000) await query("UPDATE sessions SET last_seen=NOW() WHERE sid=$1", [String(payload.sid)]);
    }
    return true;
  } catch {
    return false;
  }
}

/** proof that the password was right, for the two-step login's second step (5 minutes) */
export async function makeTicket() {
  return new SignJWT({ t: "2fa" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("5m").sign(secret());
}
export async function checkTicket(t: string) {
  try { return (await jwtVerify(t, secret())).payload.t === "2fa"; } catch { return false; }
}

/** Call at the top of every admin page and every action that changes data. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
