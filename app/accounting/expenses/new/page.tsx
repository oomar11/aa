import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

/** التسجيل أصبح من داخل المشروع فقط */
export default function NewExpenseRedirectPage() {
  redirect(ROUTES.accounting.expenses);
}
