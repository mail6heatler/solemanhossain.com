import type { Metadata } from "next";
import "./site.css";
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@300;400;500;600;700&family=Syne:wght@400;700;800&display=swap" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.35.0/dist/tabler-icons.min.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
