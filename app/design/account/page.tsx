import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

type Props = {
  searchParams: Promise<{ customer?: string; project?: string }>;
};

/** توافق قديم — الحساب صار تبويب داخل المحرر */
export default async function ProjectAccountRedirect({ searchParams }: Props) {
  const params = await searchParams;
  if (!params.customer || !params.project) {
    redirect(ROUTES.orders);
  }
  redirect(ROUTES.design.account(params.customer, params.project));
}
