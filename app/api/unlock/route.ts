import { getSettings } from "@/lib/data";
import { getSecret, ipHash, ipOf } from "@/lib/opsServer";
import { unlockToken } from "@/lib/opsServer";
import { headers } from "next/headers";
import { scryptSync, timingSafeEqual } from "crypto";

const tries = new Map<string, number[]>();

/** private mode: the right password returns the token the visitor's browser keeps (lc_unlock) */
export async function POST(req: Request) {
  const s = await getSettings();
  if (!s.ops.private.on) return Response.json({ ok: true, token: "" });
  const ip = ipHash(ipOf(await headers()));
  const now = Date.now(), list = (tries.get(ip) ?? []).filter((t) => now - t < 600_000);
  if (list.length >= 8) return Response.json({ error: "Too many tries. Wait a few minutes." }, { status: 429 });
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const stored = await getSecret("private_pw");
  const [salt, hash] = stored.split(":");
  let ok = false;
  if (salt && hash && typeof password === "string") {
    const a = scryptSync(password, salt, 64), b = Buffer.from(hash, "hex");
    ok = a.length === b.length && timingSafeEqual(a, b);
  }
  if (!ok) { list.push(now); tries.set(ip, list); await new Promise((r) => setTimeout(r, 700)); return Response.json({ error: "That isn't the password." }, { status: 401 }); }
  return Response.json({ ok: true, token: unlockToken(stored) });
}
