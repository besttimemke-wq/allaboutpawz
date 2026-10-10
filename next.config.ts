import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The sandbox preview gateway forwards requests with the browser's real
  // origin (https://preview-chat-*.space-z.ai) while rewriting Host to
  // localhost:3000 — Next dev flags those /_next requests as cross-origin.
  // Allow the preview origin pattern so HMR/styles always load clean there.
  allowedDevOrigins: ["https://*.space-z.ai"],
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
