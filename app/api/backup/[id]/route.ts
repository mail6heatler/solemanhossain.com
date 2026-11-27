import { isAdmin } from "@/lib/auth";
import { backupJson } from "@/lib/opsServer";

/** Settings → Backups → Download: one backup as a file (only for the signed-in owner) */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new Response("Not logged in", { status: 401 });
  const { id } = await params;
  const json = await backupJson(Number(id));
  if (!json) return new Response("Not found", { status: 404 });
  const day = new Date().toISOString().slice(0, 10);
  return new Response(json, { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="site-backup-${id}-${day}.json"`, "Cache-Control": "no-store" } });
}
