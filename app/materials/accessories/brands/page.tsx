import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

/** مسار قديم — الأسعار بقت جوه تفاصيل كل نظام اكسسوار */
export default function AccessoryBrandsPage() {
  redirect(ROUTES.materials.accessories);
}
