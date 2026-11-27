import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/data";

export const revalidate = 300;

/** Settings → Site status → Hide from Google (and private mode) asks search engines to stay away from every page */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const s = await getSettings();
  if (s.ops.noindex || s.ops.private.on) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }] };
}
