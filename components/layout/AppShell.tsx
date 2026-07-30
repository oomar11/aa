import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";

type AppShellProps = {
  children: React.ReactNode;
  /** إظهار الشريط العلوي (افتراضي: نعم) */
  showHeader?: boolean;
  /** إظهار شريط التنقل السفلي (افتراضي: نعم) */
  showBottomNav?: boolean;
  /** كلاسات إضافية لعنصر main */
  mainClassName?: string;
  /** ارتفاع كامل الشاشة بدل min-h-full */
  fullHeight?: boolean;
};

/**
 * الغلاف الموحد لمعظم شاشات التطبيق.
 * يجمع الهيدر + المحتوى + شريط التنقل السفلي في مكان واحد.
 */
export function AppShell({
  children,
  showHeader = true,
  showBottomNav = true,
  mainClassName = "flex flex-1 flex-col px-4 pb-20 pt-2",
  fullHeight = false,
}: AppShellProps) {
  const heightClass = fullHeight ? "min-h-dvh" : "min-h-full";

  return (
    <div
      className={`mx-auto flex ${heightClass} w-full max-w-md flex-col bg-background`}
    >
      {showHeader && <Header />}
      <main className={mainClassName}>{children}</main>
      {showBottomNav && <BottomNav />}
    </div>
  );
}
