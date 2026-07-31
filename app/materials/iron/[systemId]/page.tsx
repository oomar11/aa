import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

/** الحديد سيستم واحد — أي رابط قديم يروح لصفحة التسليح */
export default function IronSystemPage() {
  redirect(ROUTES.materials.iron);
}
