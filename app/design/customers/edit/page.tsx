import { EditCustomerForm } from "@/components/customers/EditCustomerForm";
import { ScreenBack } from "@/components/layout/ScreenBack";
import { ROUTES } from "@/lib/routes";

type Props = {
  searchParams: Promise<{ customer?: string }>;
};

export default async function EditCustomerPage({ searchParams }: Props) {
  const params = await searchParams;

  if (!params.customer) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 bg-background px-6 py-6">
        <ScreenBack href={ROUTES.orders}>العودة إلى الطلبات</ScreenBack>
        <p className="text-center font-semibold">بيانات العميل ناقصة</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <header className="px-4 pt-5 pb-3">
        <ScreenBack href={ROUTES.design.projects(params.customer)}>
          رجوع لمشاريع العميل
        </ScreenBack>
        <div className="mt-3 text-center">
          <h1 className="text-xl font-bold">تعديل العميل</h1>
          <p className="mt-1 text-xs text-muted">الاسم · الهاتف · العنوان</p>
        </div>
      </header>
      <main className="flex-1 px-4 pb-16">
        <EditCustomerForm customerId={params.customer} />
      </main>
    </div>
  );
}
