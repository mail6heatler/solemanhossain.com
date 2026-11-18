import { query, queryOne } from "@/lib/db";

// The hero status's 👁 count: how many browsers have seen the status set at `since`. A browser counts once
// (a random id it keeps in localStorage); no names, no addresses. GET reads the count, POST adds this browser.
const SINCE = /^\d{4}-\d\d-\d\dT[\d:.]+Z$/;
const ID = /^[a-f0-9]{16,32}$/;

async function count(since: string) {
  const r = await queryOne("SELECT COUNT(*)::int AS n FROM status_views WHERE since=$1", [since]);
  return Number(r?.n ?? 0);
}

export async function GET(req: Request) {
  const since = new URL(req.url).searchParams.get("since") ?? "";
  if (!SINCE.test(since)) return Response.json({ n: 0 }, { headers: { "Cache-Control": "no-store" } });
  return Response.json({ n: await count(since) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const { since, id } = await req.json().catch(() => ({}));
  if (typeof since !== "string" || !SINCE.test(since) || typeof id !== "string" || !ID.test(id)) return Response.json({ n: 0 }, { status: 400 });
  await query("INSERT INTO status_views (since, visitor) VALUES ($1,$2) ON CONFLICT DO NOTHING", [since, id]);
  return Response.json({ n: await count(since) }, { headers: { "Cache-Control": "no-store" } });
}
