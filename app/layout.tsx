import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import { UnitProvider } from "@/components/settings/UnitProvider";
import { CleanStartGate } from "@/components/settings/CleanStartGate";
import { SharedDataProvider } from "@/components/settings/SharedDataProvider";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "الوهيدي",
  description: "تصميم أبواب ونوافذ الـ uPVC",
  applicationName: "الوهيدي",
  appleWebApp: {
    capable: true,
    title: "الوهيدي",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport = {
  themeColor: "#0d6a6b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} h-full antialiased`}
      style={{ colorScheme: "light" }}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans text-foreground bg-background">
        <RegisterSW />
        <UnitProvider>
          <SharedDataProvider>
            <CleanStartGate>{children}</CleanStartGate>
          </SharedDataProvider>
        </UnitProvider>
      </body>
    </html>
  );
}
