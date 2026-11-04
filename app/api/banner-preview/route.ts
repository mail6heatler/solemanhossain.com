import { isAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { bannerView } from "@/lib/settings";

// Lets the logged-in owner preview their saved banner on the real site before switching it on.
export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "Not logged in." }, { status: 401 });
  const s = await getSettings();
  return Response.json(bannerView(s.banner, s.timezone), { headers: { "Cache-Control": "no-store" } });
}
