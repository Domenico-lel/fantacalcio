import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ClerkUserBridge } from "@/components/ClerkUserBridge";
import "./globals.css";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "FantaCalcio",
  description: "La tua app per il Fantacalcio",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FantaCalcio",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a2010",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="it">
        <head />
        <body className="font-sans antialiased">
          <ClerkUserBridge>{children}</ClerkUserBridge>
        </body>
      </html>
    </ClerkProvider>
  );
}
