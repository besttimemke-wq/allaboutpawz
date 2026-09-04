import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
