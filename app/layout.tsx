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
import { getSettings } from "@/lib/data";
import IconFallback from "@/components/IconFallback";
import { skinScript } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: { default: s.siteTitle, template: `%s · ${s.nickname || s.fullName}` },
    description: s.siteDescription,
    openGraph: { title: s.siteTitle, description: s.siteDescription, images: s.avatarUrl ? [s.avatarUrl] : [] },
    icons: { icon: "/icon.svg" },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    // the theme script sets data-skin on <html> before React loads, hence suppressHydrationWarning
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: skinScript(s) }} />
        <noscript><style>{".reveal,.split-host .ch{opacity:1!important;transform:none!important}.intro{display:none}"}</style></noscript>
        {/* fonts and icons come from the site itself (app/fonts.css, app/icons.css): no waiting on other servers before the first paint */}
        <link rel="preload" href="/icons/ti.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>{children}<IconFallback /></body>
    </html>
  );
}
