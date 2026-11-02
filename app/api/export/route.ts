import { isAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { getSettings } from "@/lib/data";

// Downloads all your content as one JSON file (uploaded files are listed, not embedded).
export async function GET() {
  if (!(await isAdmin())) return new Response("Not logged in", { status: 401 });
  const data = {
    exportedAt: new Date().toISOString(),
    settings: await getSettings(),
    sections: await query("SELECT * FROM sections ORDER BY sort"),
    items: await query("SELECT * FROM items ORDER BY section_id, sort"),
    messages: await query("SELECT * FROM messages ORDER BY created_at"),
    files: await query("SELECT id, name, mime, size, created_at FROM files ORDER BY created_at"),
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="life-chronicle-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
