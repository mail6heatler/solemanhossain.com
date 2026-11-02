import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isAdmin } from "@/lib/auth";
import { IMAGE_TYPES, VIDEO_TYPES } from "@/lib/settings";

// Big files (videos) go straight from the dashboard to Vercel Blob storage; this route only hands out
// short-lived upload permission, and only to the logged-in admin. Needs BLOB_READ_WRITE_TOKEN (set by Vercel
// when a Blob store is connected). Without it the dashboard falls back to /api/upload (stored in the database).
export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: "Blob storage is not set up." }, { status: 501 });
  const body = (await req.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return Response.json({ error: "Bad request" }, { status: 400 });
  // the "upload finished" callback comes from Vercel's servers (no login cookie); only token requests need the admin
  if (body.type === "blob.generate-client-token" && !(await isAdmin()))
    return Response.json({ error: "Not logged in." }, { status: 401 });
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [...IMAGE_TYPES, ...VIDEO_TYPES, "application/pdf"],
        maximumSizeInBytes: 200 * 1024 * 1024, // 200 MB
        addRandomSuffix: true,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      }),
      onUploadCompleted: async () => {},
    });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}
