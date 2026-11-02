import { queryOne } from "@/lib/db";

// Serves files uploaded from the dashboard (photos, résumé).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{32}$/.test(id)) return new Response("Not found", { status: 404 });
  const f = await queryOne("SELECT name, mime, data FROM files WHERE id=$1", [id]);
  if (!f) return new Response("Not found", { status: 404 });
  const body = new Uint8Array(f.data as Uint8Array);
  const inline = String(f.mime).startsWith("image/") || f.mime === "application/pdf";
  return new Response(body, {
    headers: {
      "Content-Type": String(f.mime),
      "Content-Length": String(body.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(String(f.name))}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
