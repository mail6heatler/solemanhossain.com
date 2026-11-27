import type { Metadata } from "next";
import "./site.css";
import "./themes.css";
import "./transitions.css";
import "./banner.css";
import "./mascot.css";
import "./heroLooks.css";
import "./chrome.css";
import "./admin.css";
import "./fonts.css";
import "./icons.css";
import "./launch.css";
import "./gate.css";
import { getSettings } from "@/lib/data";
import IconFallback from "@/components/IconFallback";
import { getSecret, unlockHashFor } from "@/lib/opsServer";
import { skinScript } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const o = s.ops;
  // Settings → Site status: the link preview (Facebook, WhatsApp, Messenger…), the tab and phone icons, and hiding from Google
  const share = o.share.on ? o.share : null;
  const image = share?.image || s.avatarUrl;
  const title = share?.title || s.siteTitle, description = share?.text || s.siteDescription;
  return {
    title: { default: s.siteTitle, template: `%s · ${s.nickname || s.fullName}` },
    description: s.siteDescription,
    openGraph: { title, description, images: image ? [image] : [] },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : [] },
    icons: { icon: o.icons.tab || "/icon.svg", apple: o.icons.app || o.icons.tab || undefined },
    manifest: "/manifest.webmanifest",
    robots: o.noindex || o.private.on ? { index: false, follow: false } : undefined,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  // private mode: the hash of the token a visitor keeps after typing the password (skinScript compares it before the first paint)
  const pw = s.ops.private.on ? await getSecret("private_pw") : "";
  const unlock = pw ? unlockHashFor(pw) : "";
  return (
    // the theme script sets data-skin on <html> before React loads, hence suppressHydrationWarning
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: skinScript(s, unlock) }} />
        <noscript><style>{".reveal,.split-host .ch{opacity:1!important;transform:none!important}.intro,.lch{display:none!important}"}</style></noscript>
        {/* fonts and icons come from the site itself (app/fonts.css, app/icons.css): no waiting on other servers before the first paint */}
        <link rel="preload" href="/icons/ti.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>{children}<IconFallback /></body>
    </html>
  );
}
