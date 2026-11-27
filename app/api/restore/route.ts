import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { readSnapshot, restoreSnapshot } from "@/lib/opsServer";

/**
 * Settings → Backups → Restore from a file: `preview` says what the file holds without changing anything; `apply` restores it,
 * after making a safety copy of how things are now. A route rather than an action, because a backup can be bigger than an action takes.
 */
export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Not logged in." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { mode?: string; data?: unknown; withSettings?: boolean } | null;
  if (!body) return Response.json({ error: "That file couldn't be read." }, { status: 400 });
  const s = readSnapshot(body.data);
  if (!s.ok) return Response.json({ error: s.error }, { status: 400 });
  if (body.mode !== "apply") return Response.json({ ok: true, summary: s.summary, createdAt: s.snap.createdAt, hasSettings: !!s.snap.settings });
  try {
    await restoreSnapshot(s.snap, !!body.withSettings);
    revalidatePath("/", "layout");
    return Response.json({ ok: true, summary: s.summary });
  } catch (e) {
    console.error("restore", e);
    return Response.json({ error: "The restore stopped partway. Restore the safety copy (Before a restore) from the list to undo." }, { status: 500 });
  }
}
