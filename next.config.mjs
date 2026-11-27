/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  // cards ask for their pictures at card size through /_next/image (lib/sized.ts); the originals stay for the viewer
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
    localPatterns: [{ pathname: "/media/**" }],
    minimumCacheTTL: 2678400, // a month: an uploaded picture never changes, a new one gets a new address
  },
};
export default nextConfig;
