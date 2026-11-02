import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getAuthRow, getSettings } from "./data";

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

export async function createSession() {
  const { sessionVersion } = await getAuthRow();
  const token = await new SignJWT({ role: "admin", v: sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.role !== "admin") return false;
    const { sessionVersion } = await getAuthRow();
    return payload.v === sessionVersion;
  } catch {
    return false;
  }
}

/** Call at the top of every admin page and every action that changes data. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
