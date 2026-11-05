import type { Metadata } from "next";
import "./site.css";
import "./themes.css";
import "./admin.css";
import { getSettings } from "@/lib/data";
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700;9..144,800&family=Fredoka:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Orbitron:wght@700;800;900&family=Space+Grotesk:wght@300;400;500;600;700&family=Syne:wght@400;700;800&display=swap" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.35.0/dist/tabler-icons.min.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
