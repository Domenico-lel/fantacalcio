import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ClerkUserBridge } from "@/components/ClerkUserBridge";
import "./globals.css";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Soccer Dick Club",
  description: "La lega più scatenata del fantacalcio",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Soccer Dick Club",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0f1d",
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
