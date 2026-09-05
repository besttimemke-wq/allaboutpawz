import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // 4GB host, no swap: without this the Turbopack dev worker grows until the
  // kernel OOM-killer SIGKILLs next-server (observed at 2.2–3.4GB RSS). With a
  // limit, Turbopack recycles itself and keeps serving.
  experimental: {
    turbopackMemoryLimit: 1_600_000_000,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "https", hostname: "aapawz.com" },
      { protocol: "https", hostname: "qdgfkxbkqcnuhckhvhzd.supabase.co" },
    ],
  },
};

export default nextConfig;
