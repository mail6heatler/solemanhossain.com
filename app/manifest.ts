import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/data";

export const revalidate = 300;

/** what a phone uses when someone adds the site to their home screen (Settings → Site status → Icons) */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSettings();
  const name = s.ops.icons.appName || s.nickname || s.fullName;
  const icon = s.ops.icons.app || s.ops.icons.tab;
  return {
    name: s.siteTitle || name, short_name: name, start_url: "/", display: "standalone", background_color: "#07090b", theme_color: "#07090b",
    icons: icon ? [{ src: icon, sizes: "512x512", purpose: "any" }] : [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
