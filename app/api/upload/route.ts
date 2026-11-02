import { randomBytes } from "crypto";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
const MAX = 4 * 1024 * 1024; // Vercel limits request bodies to ~4.5MB

export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Not logged in." }, { status: 401 });
  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file." }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return Response.json({ error: "Only JPG, PNG, WebP, GIF or PDF." }, { status: 400 });
  if (file.size > MAX) return Response.json({ error: "File is larger than 4 MB." }, { status: 400 });
  const id = randomBytes(16).toString("hex");
  const data = Buffer.from(await file.arrayBuffer());
  await query("INSERT INTO files (id, name, mime, size, data) VALUES ($1,$2,$3,$4,$5)",
    [id, file.name.slice(0, 200) || "file", file.type, file.size, data]);
  return Response.json({ url: `/media/${id}` });
}
