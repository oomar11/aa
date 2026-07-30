import { redirect } from "next/navigation";

/** الحساب فاضي حالياً — الإعدادات هي المكان المناسب. */
export default function ProfilePage() {
  redirect("/settings");
}
