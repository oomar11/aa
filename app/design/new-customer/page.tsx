import { NewCustomerForm } from "@/components/customers/NewCustomerForm";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ROUTES } from "@/lib/routes";

export default function NewCustomerPage() {
  return (
    <AppShell
      showHeader={false}
      fullHeight
      mainClassName="flex flex-1 flex-col px-4 pb-24 pt-5"
    >
      <PageHeader backHref={ROUTES.design.hub} title="عميل جديد" />
      <div className="mt-4 flex-1">
        <NewCustomerForm />
      </div>
    </AppShell>
  );
}
