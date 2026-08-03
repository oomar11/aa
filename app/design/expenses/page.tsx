import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

type Props = {
  searchParams: Promise<{ customer?: string; project?: string }>;
};

/** توافق قديم — المصروفات صارت تبويب داخل المحرر */
export default async function ProjectExpensesRedirect({ searchParams }: Props) {
  const params = await searchParams;
  if (!params.customer || !params.project) {
    redirect(ROUTES.orders);
  }
  redirect(ROUTES.design.expenses(params.customer, params.project));
}
