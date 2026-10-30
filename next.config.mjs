/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // database drivers run as plain Node modules (PGlite ships a WebAssembly Postgres)
    serverComponentsExternalPackages: ["@electric-sql/pglite", "postgres"],
    // migrations are read from /drizzle at runtime
    outputFileTracingIncludes: { "/**": ["./drizzle/**/*"] },
  },
};

export default nextConfig;
