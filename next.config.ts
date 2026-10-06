import type { NextConfig } from "next";

// ---------------------------------------------------------------------------
// Supabase URL / anon key: the app historically read BOTH name styles
// (SUPABASE_URL on the server, NEXT_PUBLIC_SUPABASE_URL on the client).
// Both names currently exist on Vercel as duplicates. These build-time
// fallbacks make each old name resolve from its NEXT_PUBLIC_ twin when the
// old name is absent — so deleting either duplicate set on Vercel can never
// break a future build.
// ---------------------------------------------------------------------------
const SUPABASE_URL_FALLBACK =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY_FALLBACK =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    SUPABASE_URL: SUPABASE_URL_FALLBACK,
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY_FALLBACK,
  },
  // The sandbox preview gateway forwards requests with the browser's real
  // origin (https://preview-chat-*.space-z.ai) while rewriting Host to
  // localhost:3000 — Next dev flags those /_next requests as cross-origin.
  // Allow the preview origin pattern so HMR/styles always load clean there.
  allowedDevOrigins: ["https://*.space-z.ai"],
  // 4GB host, no swap: without this the Turbopack dev worker grows until the
  // kernel OOM-killer SIGKILLs next-server (observed at 2.2–3.4GB RSS). With a
  // limit, Turbopack recycles itself and keeps serving.
  experimental: {
    // 4GB host, no swap: need enough memory for page compilation.
    // API routes compile fine at 512MB but full React page tree needs more.
    // 1GB is the sweet spot — enough for pages, not so much that OOM fires.
    turbopackMemoryLimit: 1_000_000_000,
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
