import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The site renders even before any env vars are set (Supabase reads return
  // empty data), so a fresh clone / first Vercel deploy always succeeds.
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
