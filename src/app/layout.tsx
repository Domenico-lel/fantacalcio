import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ClerkUserBridge } from "@/components/ClerkUserBridge";
import PwaRuntime from "@/components/PwaRuntime";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  applicationName: "Fanta Soccer Club",
  title: "Fanta Soccer Club",
  description: "La lega più scatenata del fantacalcio",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fanta Soccer Club",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#070b14",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="it" suppressHydrationWarning>
        <head />
        <body className="font-sans antialiased">
          <ClerkUserBridge>{children}</ClerkUserBridge>
          <PwaRuntime />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
