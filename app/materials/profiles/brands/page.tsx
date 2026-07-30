import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

/** البراندات بقت داخل صفحة القطاعات — توجيه للتبويب المناسب */
export default function ProfileBrandsPage() {
  redirect(`${ROUTES.materials.profiles}?tab=brands`);
}
