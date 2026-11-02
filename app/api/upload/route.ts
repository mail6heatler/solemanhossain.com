import { randomBytes } from "crypto";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { IMAGE_TYPES, VIDEO_TYPES } from "@/lib/settings";

// Uploads stored in the database (used when Vercel Blob storage isn't connected, e.g. on your own computer).
const ALLOWED = [...IMAGE_TYPES, ...VIDEO_TYPES, "application/pdf"];
// Vercel limits request bodies to ~4.5 MB; on your own computer there is no such limit.
const MAX = process.env.VERCEL ? 4 * 1024 * 1024 : 60 * 1024 * 1024;

export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Not logged in." }, { status: 401 });
  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file." }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return Response.json({ error: "Only JPG, PNG, WebP, GIF, MP4, WebM, MOV or PDF." }, { status: 400 });
  if (file.size > MAX) {
    const mb = Math.round(MAX / 1024 / 1024);
    return Response.json({ error: VIDEO_TYPES.includes(file.type)
      ? `This video is larger than ${mb} MB. Bigger videos need Vercel Blob storage (ask Claude to connect it).`
      : `File is larger than ${mb} MB.` }, { status: 400 });
  }
  const id = randomBytes(16).toString("hex");
  const data = Buffer.from(await file.arrayBuffer());
  await query("INSERT INTO files (id, name, mime, size, data) VALUES ($1,$2,$3,$4,$5)",
    [id, file.name.slice(0, 200) || "file", file.type, file.size, data]);
  return Response.json({ url: `/media/${id}` });
}
