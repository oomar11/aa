import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ROUTES } from "@/lib/routes";

type BrandLinkProps = {
  href: string;
  title: string;
  description: string;
};

function BrandLink({ href, title, description }: BrandLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5 transition-colors hover:border-primary/40 hover:bg-primary-soft/30"
    >
      <div className="min-w-0 text-right">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
          {description}
        </p>
      </div>
      <span className="shrink-0 text-lg text-muted" aria-hidden>
        ‹
      </span>
    </Link>
  );
}

type MaterialCategoryShellProps = {
  title: string;
  description: string;
  brandLink?: BrandLinkProps;
  children: React.ReactNode;
};

/** غلاف موحد لصفحات فئات الخامات (قطاعات، اكسسوار، زجاج، حديد) */
export function MaterialCategoryShell({
  title,
  description,
  brandLink,
  children,
}: MaterialCategoryShellProps) {
  return (
    <AppShell mainClassName="flex flex-1 flex-col gap-3 px-4 pb-24 pt-2">
      <PageHeader
        backHref={ROUTES.materials.hub}
        backLabel="رجوع للخامات"
        title={title}
        description={description}
      />
      {brandLink && <BrandLink {...brandLink} />}
      {children}
    </AppShell>
  );
}
