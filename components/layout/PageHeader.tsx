import { AppBreadcrumb, type Crumb } from "@/components/layout/AppBreadcrumb";
import { ScreenBack } from "@/components/layout/ScreenBack";

type PageHeaderProps = {
  backHref?: string;
  backLabel?: string;
  breadcrumb?: Crumb[];
  title: string;
  description?: string;
  className?: string;
  /** على الكمبيوتر القائمة الجانبية تغني عن زر الرجوع */
  hideBackOnDesktop?: boolean;
};

/**
 * عنوان الصفحة مع رجوع اختياري.
 * القاعدة: رجوع + عنوان فقط؛ الوصف يُعرض فقط إن وُجد وكان قصيراً.
 */
export function PageHeader({
  backHref,
  backLabel,
  breadcrumb,
  title,
  description,
  className = "px-1",
  hideBackOnDesktop = false,
}: PageHeaderProps) {
  const showBreadcrumb = breadcrumb && breadcrumb.length >= 3;

  return (
    <div className={className}>
      {backHref ? (
        <ScreenBack
          href={backHref}
          className={hideBackOnDesktop ? "mb-2 lg:hidden" : "mb-2"}
        >
          {backLabel ?? "رجوع"}
        </ScreenBack>
      ) : null}
      {showBreadcrumb ? (
        <AppBreadcrumb className="mb-2" items={breadcrumb} />
      ) : null}
      <h1 className="text-xl font-bold">{title}</h1>
      {description && description.length <= 60 ? (
        <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>
      ) : null}
    </div>
  );
}
