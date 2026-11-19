import { query, queryOne } from "@/lib/db";

const recent = new Map<string, number>();

/** A heart on a note on the Wall, or taken back. The browser remembers which it hearted (lc_hearts), so each counts once per browser. */
export async function POST(req: Request) {
  const { id, on } = (await req.json().catch(() => ({}))) as { id?: unknown; on?: unknown };
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return Response.json({ ok: false }, { status: 400 });
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const k = `${ip}:${n}`, now = Date.now();
  if (now - (recent.get(k) ?? 0) < 1500) return Response.json({ ok: false }, { status: 429 });
  recent.set(k, now);
  if (recent.size > 5000) recent.clear();
  await query("UPDATE messages SET hearts = GREATEST(0, hearts + $2) WHERE id=$1 AND approved AND NOT from_owner", [n, on === false ? -1 : 1]);
  const r = await queryOne("SELECT hearts FROM messages WHERE id=$1", [n]);
  return Response.json({ ok: true, hearts: Number(r?.hearts ?? 0) }, { headers: { "Cache-Control": "no-store" } });
}
