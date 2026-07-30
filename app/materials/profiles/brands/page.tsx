import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

/** البراندات اتشالت — الأسعار بقت جوه كل نظام */
export default function ProfileBrandsPage() {
  redirect(ROUTES.materials.profiles);
}
