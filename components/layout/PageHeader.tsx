import { ScreenBack } from "@/components/layout/ScreenBack";

type PageHeaderProps = {
  backHref?: string;
  backLabel?: string;
  title: string;
  description?: string;
  className?: string;
};

/** عنوان الصفحة مع زر رجوع اختياري */
export function PageHeader({
  backHref,
  backLabel,
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
      <h1 className="text-xl font-bold">{title}</h1>
      {description && (
        <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>
      )}
    </div>
  );
}
