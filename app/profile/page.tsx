import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";

export default function ProfilePage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 pb-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
          <svg
            viewBox="0 0 24 24"
            className="h-8 w-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden
          >
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
          </svg>
        </div>
        <h1 className="text-xl font-bold">الملف الشخصي</h1>
        <p className="text-sm text-muted">استخدام شخصي — بدون حساب مطلوب حالياً.</p>
        <Link
          href="/"
          className="mt-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          العودة للرئيسية
        </Link>
      </main>
      <BottomNav />
    </div>
  );
}
