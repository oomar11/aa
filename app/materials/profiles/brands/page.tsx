import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

/** مسار قديم — الأسعار بقت جوه كل نظام */
export default function ProfileBrandsPage() {
  redirect(ROUTES.materials.profiles);
}
