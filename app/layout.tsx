import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { ThemeProvider } from "@/components/settings/ThemeProvider";
import { UnitProvider } from "@/components/settings/UnitProvider";
import { CleanStartGate } from "@/components/settings/CleanStartGate";
import { STORAGE_KEYS } from "@/lib/storage/keys";
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

const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('${STORAGE_KEYS.theme}');
    if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if (t === 'dark') document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = t;
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full font-sans text-foreground bg-background">
        <ThemeProvider>
          <UnitProvider>
            <CleanStartGate>{children}</CleanStartGate>
          </UnitProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
