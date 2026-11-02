/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  images: { unoptimized: true },
};
export default nextConfig;
