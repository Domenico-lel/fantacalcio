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
  // La vecchia pagina /news (Notizie) è stata sostituita da /trofei. Qualche
  // configurazione Clerk legacy (env "after sign-in URL") e i bookmark/PWA
  // puntano ancora a /news: reindirizziamo per evitare il 404 post-login.
  async redirects() {
    return [
      { source: "/news", destination: "/trofei", permanent: false },
    ];
  },
};

export default nextConfig;
