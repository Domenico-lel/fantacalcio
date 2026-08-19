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
      { protocol: "https", hostname: "crests.football-data.org" },
      { protocol: "https", hostname: "a.espncdn.com" },
      { protocol: "https", hostname: "r2.thesportsdb.com" },
      { protocol: "https", hostname: "eredivisie.b-cdn.net" },
    ],
  },
  // La sezione Trofei ora vive dentro /standings (Classifica). Le vecchie
  // pagine /news e /trofei sono linkate da config Clerk legacy, bookmark e
  // PWA: reindirizziamo a /standings per evitare il 404 post-login.
  async redirects() {
    return [
      { source: "/news", destination: "/standings", permanent: false },
      { source: "/trofei", destination: "/standings", permanent: false },
    ];
  },
};

export default nextConfig;
