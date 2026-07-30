import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

/** الحساب فاضي حالياً — الإعدادات هي المكان المناسب. */
export default function ProfilePage() {
  redirect(ROUTES.settings);
}
