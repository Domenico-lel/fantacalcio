import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le foto da cellulare sono grandi (3-8MB): senza questo le Server Actions
  // tagliano il body a 1MB di default e l'upload fallisce in silenzio.
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
    ],
  },
};

export default nextConfig;
