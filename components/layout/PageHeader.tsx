import { AppBreadcrumb, type Crumb } from "@/components/layout/AppBreadcrumb";
import { ScreenBack } from "@/components/layout/ScreenBack";

type PageHeaderProps = {
  backHref?: string;
  backLabel?: string;
  breadcrumb?: Crumb[];
  title: string;
  description?: string;
  className?: string;
};

/** عنوان الصفحة مع زر رجوع اختياري ومسار تنقل */
export function PageHeader({
  backHref,
  backLabel,
  breadcrumb,
  title,
  description,
  className = "px-1",
}: PageHeaderProps) {
  return (
    <div className={className}>
      {backHref && backLabel && (
        <ScreenBack href={backHref} className="mb-2">
          {backLabel}
        </ScreenBack>
      )}
      {breadcrumb && breadcrumb.length > 0 ? (
        <AppBreadcrumb className="mb-2" items={breadcrumb} />
      ) : null}
      <h1 className="text-xl font-bold">{title}</h1>
      {description && (
        <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>
      )}
    </div>
  );
}
