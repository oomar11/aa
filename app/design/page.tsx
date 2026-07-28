import Link from "next/link";
import { NavBack } from "@/components/NavBack";

export default function DesignPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <header className="px-4 pt-5 pb-2 text-center">
        <p className="text-sm font-medium text-primary">UPVC Design</p>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <h1 className="mb-8 text-2xl font-bold text-primary">طلب جديد</h1>

        <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl shadow-[0_8px_28px_rgba(15,20,28,0.12)]">
          <Link
            href="/design/new-customer"
            className="flex h-16 items-center justify-center bg-[#4BA3F5] text-lg font-semibold text-white transition-all duration-300 hover:brightness-105 active:brightness-95"
          >
            عميل جديد
          </Link>
          <Link
            href="/design/customers"
            className="flex h-16 items-center justify-center bg-[#E85A8A] text-lg font-semibold text-white transition-all duration-300 hover:brightness-105 active:brightness-95"
          >
            قاعدة العملاء
          </Link>
        </div>

        <NavBack
          href="/"
          className="mt-10 text-sm font-medium text-muted transition-colors hover:text-primary"
        >
          رجوع للرئيسية
        </NavBack>
      </main>
    </div>
  );
}
