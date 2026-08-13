import { BottomNav } from "@/components/layout/BottomNav";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { Header } from "@/components/layout/Header";
import { StoreBridgeAutoConnect } from "@/components/settings/StoreBridgeAutoConnect";

type AppShellProps = {
  children: React.ReactNode;
  /** إظهار الشريط العلوي (افتراضي: نعم) */
  showHeader?: boolean;
  /** إظهار شريط التنقل السفلي / القائمة الجانبية (افتراضي: نعم) */
  showBottomNav?: boolean;
  /** كلاسات إضافية لعنصر main */
  mainClassName?: string;
  /** ارتفاع كامل الشاشة بدل min-h-full */
  fullHeight?: boolean;
};

/**
 * الغلاف الموحد لمعظم شاشات التطبيق.
 * موبايل مريح + قائمة جانبية وعرض واسع على الكمبيوتر.
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
      className={`mx-auto flex ${heightClass} w-full max-w-lg flex-col bg-background lg:mx-0 lg:min-h-dvh lg:max-w-none lg:flex-row`}
    >
      {showBottomNav ? <DesktopSidebar /> : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <StoreBridgeAutoConnect />
        {showHeader && <Header />}
        <main className={`${mainClassName} lg:px-6 lg:pb-8`}>{children}</main>
        {showBottomNav && <BottomNav />}
      </div>
    </div>
  );
}
