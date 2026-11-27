import { isAdmin } from "@/lib/auth";
import { query } from "@/lib/db";

/** Settings → Tools → Spreadsheet export: entries, chat messages or comments as a CSV file that opens in Excel or Google Sheets */
const SHEETS: Record<string, { sql: string; cols: [string, string][] }> = {
  entries: {
    sql: "SELECT i.id, s.title AS section, i.category, i.title, i.subtitle, i.date_label, i.location, i.status, i.tags, i.visible, i.pinned, i.created_at, i.body FROM items i JOIN sections s ON s.id = i.section_id ORDER BY s.sort, i.sort, i.id",
    cols: [["id", "ID"], ["section", "Section"], ["category", "Subsection"], ["title", "Title"], ["subtitle", "Subtitle"], ["date_label", "Date"], ["location", "Place"], ["status", "Status"], ["tags", "Tags"], ["visible", "Showing"], ["pinned", "Pinned"], ["created_at", "Added"], ["body", "Story"]],
  },
  messages: {
    sql: "SELECT id, created_at, name, email, body, from_owner, approved, read FROM messages ORDER BY created_at",
    cols: [["id", "ID"], ["created_at", "When"], ["name", "Name"], ["email", "Email"], ["body", "Message"], ["from_owner", "From you"], ["approved", "On the Wall"], ["read", "Read"]],
  },
  comments: {
    sql: "SELECT c.id, c.created_at, i.title AS entry, c.name, c.body, c.reply, c.hidden FROM comments c JOIN items i ON i.id = c.item_id ORDER BY c.created_at",
    cols: [["id", "ID"], ["created_at", "When"], ["entry", "Entry"], ["name", "Name"], ["body", "Comment"], ["reply", "Your reply"], ["hidden", "Hidden"]],
  },
};
const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString().slice(0, 16).replace("T", " ") : typeof v === "boolean" ? (v ? "yes" : "no") : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  if (!(await isAdmin())) return new Response("Not logged in", { status: 401 });
  const what = new URL(req.url).searchParams.get("what") ?? "entries";
  const sheet = SHEETS[what];
  if (!sheet) return new Response("Unknown", { status: 400 });
  const rows = await query(sheet.sql);
  const lines = [sheet.cols.map(([, h]) => cell(h)).join(","), ...rows.map((r) => sheet.cols.map(([k]) => cell(k === "created_at" && r[k] ? new Date(r[k]) : r[k])).join(","))];
  // the mark at the start tells Excel the file is UTF-8, so Bangla and emoji show properly
  return new Response("\ufeff" + lines.join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${what}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
