import { createHash, randomBytes } from "crypto";
import { cookies, headers } from "next/headers";
import { query, queryOne } from "@/lib/db";
import { getComments, getSettings } from "@/lib/data";
import { cleanName } from "@/lib/names";
import { cleanTalk, COMMENT_MAX } from "@/lib/talk";

// Comments on entries, for entries whose comments are switched on. They appear straight away (the owner's choice) and the owner can hide
// or delete them from the entry's page. Only plain text: React escapes it and nothing turns it into links. What stops spam is below in POST.

const SECONDS_BETWEEN = 20;
const MOST_PER_DAY = 30;

async function talkOf(id: number) {
  if (!Number.isInteger(id) || id <= 0) return null;
  const r = await queryOne("SELECT i.talk FROM items i JOIN sections s ON s.id = i.section_id WHERE i.id=$1 AND i.visible AND s.visible", [id]);
  return r ? cleanTalk(r.talk) : null;
}

/** What visitors get: never the browser id or anything else that's only for the owner. */
async function listFor(id: number, replies: boolean) {
  const rows = await getComments(id);
  if (!replies) rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const s = await getSettings();
  return {
    owner: s.nickname || s.fullName,
    comments: rows.map((c) => ({ id: c.id, name: c.name, body: c.body, reply: replies ? c.reply : "", pinned: replies && c.pinned, at: c.created_at })),
  };
}

/** GET /api/comments?id=1 → { owner, comments } */
export async function GET(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  const talk = await talkOf(id);
  if (!talk?.comments) return Response.json({ owner: "", comments: [] }, { headers: { "Cache-Control": "no-store" } });
  return Response.json(await listFor(id, talk.replies), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const { id, body: rawBody, name: rawName } = await req.json().catch(() => ({}));
  const itemId = Number(id);
  const talk = await talkOf(itemId);
  if (!talk?.comments) return Response.json({ error: "Comments are off here." }, { status: 403 });
  const name = cleanName(String(rawName ?? ""));
  const body = String(rawBody ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, COMMENT_MAX);
  if (!name) return Response.json({ error: "Your name is needed to comment.", needName: true }, { status: 400 });
  if (!body) return Response.json({ error: "Write something first." }, { status: 400 });

  const jar = await cookies();
  let voter = jar.get("lc_voter")?.value;
  if (!voter || !/^[a-f0-9]{24}$/.test(voter)) {
    voter = randomBytes(12).toString("hex");
    jar.set("lc_voter", voter, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365, secure: process.env.NODE_ENV === "production" });
  }
  // only a scrambled address is kept, enough to slow someone down who clears their cookies
  const address = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim();
  const ip = createHash("sha256").update(`${process.env.AUTH_SECRET ?? ""}:${address}`).digest("hex").slice(0, 24);

  const seen = await queryOne(
    `SELECT COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '${SECONDS_BETWEEN} seconds')::int AS just_now,
            COUNT(*)::int AS today, COUNT(*) FILTER (WHERE body = $3)::int AS same
     FROM comments WHERE (voter=$1 OR ip=$2) AND created_at > NOW() - INTERVAL '1 day'`, [voter, ip, body]);
  if (Number(seen?.just_now ?? 0) > 0) return Response.json({ error: "Easy there, try again in a few seconds." }, { status: 429 });
  if (Number(seen?.same ?? 0) > 0) return Response.json({ error: "You've already said that." }, { status: 409 });
  if (Number(seen?.today ?? 0) >= MOST_PER_DAY) return Response.json({ error: "That's a lot of comments for one day. Try again tomorrow." }, { status: 429 });

  await query("INSERT INTO comments (item_id, voter, ip, name, body, seen) VALUES ($1,$2,$3,$4,$5,$6)", [itemId, voter, ip, name, body, !talk.notify]);
  return Response.json(await listFor(itemId, talk.replies));
}
