import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { query, queryOne } from "@/lib/db";
import { getPollCounts } from "@/lib/data";

async function poll(id: number) {
  const it = await queryOne("SELECT poll_options FROM items WHERE id=$1 AND type='poll' AND visible", [id]);
  if (!it) return null;
  try { const a = JSON.parse(it.poll_options); return Array.isArray(a) ? a.length : 0; } catch { return 0; }
}

export async function GET(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  const n = await poll(id);
  if (!n) return Response.json({ error: "Not found" }, { status: 404 });
  const voter = (await cookies()).get("lc_voter")?.value;
  const mine = voter ? await queryOne("SELECT option FROM votes WHERE item_id=$1 AND voter=$2", [id, voter]) : null;
  return Response.json({ counts: await getPollCounts(id, n), mine: mine ? Number(mine.option) : null },
    { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const { id, option } = await req.json().catch(() => ({}));
  const n = await poll(Number(id));
  if (!n || !Number.isInteger(option) || option < 0 || option >= n)
    return Response.json({ error: "Bad vote" }, { status: 400 });
  const jar = await cookies();
  let voter = jar.get("lc_voter")?.value;
  if (!voter || !/^[a-f0-9]{24}$/.test(voter)) {
    voter = randomBytes(12).toString("hex");
    jar.set("lc_voter", voter, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365, secure: process.env.NODE_ENV === "production" });
  }
  await query(
    `INSERT INTO votes (item_id, voter, option) VALUES ($1,$2,$3)
     ON CONFLICT (item_id, voter) DO UPDATE SET option = EXCLUDED.option`, [Number(id), voter, option]);
  return Response.json({ counts: await getPollCounts(Number(id), n), mine: option });
}
