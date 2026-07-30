import Link from "next/link";

export type Crumb = {
  label: string;
  href?: string;
};

type Props = {
  items: Crumb[];
  className?: string;
};

/** مسار مختصر يوضح أين المستخدم في التدفق */
export function AppBreadcrumb({ items, className }: Props) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="مسار الصفحة"
      className={`flex flex-wrap items-center gap-1 text-[11px] text-muted ${className ?? ""}`}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
            {index > 0 ? (
              <span aria-hidden className="opacity-50">
                ‹
              </span>
            ) : null}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="max-w-[9rem] truncate font-medium text-primary transition-opacity hover:opacity-80"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`max-w-[9rem] truncate ${
                  isLast ? "font-semibold text-foreground" : ""
                }`}
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
