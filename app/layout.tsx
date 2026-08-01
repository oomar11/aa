import type { Metadata } from "next";
import { Cairo } from "next/font/google";
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
  title: "UPVC Design",
  description: "تصميم أبواب ونوافذ الـ uPVC",
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
        <UnitProvider>
          <SharedDataProvider>
            <CleanStartGate>{children}</CleanStartGate>
          </SharedDataProvider>
        </UnitProvider>
      </body>
    </html>
  );
}
