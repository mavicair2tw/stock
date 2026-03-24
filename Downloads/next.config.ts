// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow cross-origin images from openai-tw.com
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "openai-tw.com" },
    ],
  },

  // If deploying to Vercel alongside openai-tw.com, set basePath:
  // basePath: "/api-server",

  // Expose only safe env vars to browser
  env: {
    NEXT_PUBLIC_SUPABASE_URL:      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  },
};

export default nextConfig;
