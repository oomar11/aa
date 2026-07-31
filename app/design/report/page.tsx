import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

type Props = {
  searchParams: Promise<{ customer?: string; project?: string }>;
};

/** مسار قديم — المشاركة صارت PDF من بنود المشروع */
export default async function ProjectReportPage({ searchParams }: Props) {
  const params = await searchParams;

  if (params.customer && params.project) {
    redirect(ROUTES.design.editor(params.customer, params.project));
  }
  if (params.customer) {
    redirect(ROUTES.design.projects(params.customer));
  }
  redirect(ROUTES.orders);
}
