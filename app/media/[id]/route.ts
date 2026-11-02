import { queryOne } from "@/lib/db";

// Serves files uploaded from the dashboard (photos, videos, résumé).
// Supports "Range" requests so videos can be scrubbed (and play at all in Safari).
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{32}$/.test(id)) return new Response("Not found", { status: 404 });
  const f = await queryOne("SELECT name, mime, data FROM files WHERE id=$1", [id]);
  if (!f) return new Response("Not found", { status: 404 });
  const body = new Uint8Array(f.data as Uint8Array);
  const mime = String(f.mime);
  const inline = mime.startsWith("image/") || mime.startsWith("video/") || mime === "application/pdf";
  const headers: Record<string, string> = {
    "Content-Type": mime,
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(String(f.name))}"`,
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  };
  const range = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range && (range[1] || range[2])) {
    const size = body.byteLength;
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    start = Math.max(0, start); end = Math.min(size - 1, end);
    if (start > end || start >= size)
      return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
    return new Response(body.slice(start, end + 1), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(body, { headers: { ...headers, "Content-Length": String(body.byteLength) } });
}
