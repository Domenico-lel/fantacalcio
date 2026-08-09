import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ClerkUserBridge } from "@/components/ClerkUserBridge";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

// Inter: font da UI ad alta leggibilità sugli schermi piccoli (cellulare).
// Esposto come --font-inter, che tailwind usa già per `font-sans`.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Sora: font display geometrico per titoli e numeri grandi (--font-display,
// usato da .page-title e .font-display in globals.css).
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["600", "700", "800"],
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Fanta Soccer Club",
  description: "La lega più scatenata del fantacalcio",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fanta Soccer Club",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070b14",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="it" className={`${inter.variable} ${sora.variable}`} suppressHydrationWarning>
        <head />
        <body className="font-sans antialiased">
          <ClerkUserBridge>{children}</ClerkUserBridge>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
