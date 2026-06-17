import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { DemoUserProvider } from "@/lib/app-user-context";
import { ClerkUserBridge } from "@/components/ClerkUserBridge";
import "./globals.css";

const DEMO_MODE =
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_DEMO === "true";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (DEMO_MODE) {
    return (
      <DemoUserProvider>
        <html lang="it">
          <head />
          <body className="font-sans antialiased">{children}</body>
        </html>
      </DemoUserProvider>
    );
  }

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
