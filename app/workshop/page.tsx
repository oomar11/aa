import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

/** المسار القديم يوجّه للورشة على الرئيسية — مفيش صفحتين لنفس الشغل */
export default function WorkshopRedirectPage() {
  redirect(ROUTES.home);
}
