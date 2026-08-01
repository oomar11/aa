"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ScreenBack } from "@/components/layout/ScreenBack";
import { ProjectMaterialDefaultsFields } from "@/components/design/ProjectMaterialDefaultsFields";
import {
  defaultProjectMaterialDefaults,
  normalizeProjectAccessoryDetails,
  projectUsesCustomAccessory,
  type ProjectMaterialDefaults,
} from "@/lib/project-materials";
import { defaultAccessoryDetails, loadMaterialCatalog } from "@/lib/material-systems";
import {
  deleteProject,
  getProjectById,
  upsertProjectOverride,
  type Project,
} from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import { WORKFLOW_VISUAL } from "@/lib/workshop";
import { WorkflowBadge } from "@/components/workshop/WorkflowBadge";
import Link from "next/link";

type Props = {
  customerId: string;
  projectId: string;
};

export function ProjectSettingsForm({ customerId, projectId }: Props) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [materials, setMaterials] = useState<ProjectMaterialDefaults>({});
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const found = getProjectById(projectId);
    if (!found) return;
    setProject(found);
    setName(found.name);
    setAddress(found.location ?? "");
    const catalog = loadMaterialCatalog();
    const defaults = defaultProjectMaterialDefaults(catalog);
    setMaterials({
      systemId: found.systemId ?? defaults.systemId,
      accessoryId: found.accessoryId ?? defaults.accessoryId,
      accessorySource: found.accessorySource ?? defaults.accessorySource,
      accessoryCustomName: found.accessoryCustomName,
      accessoryDetails: found.accessoryDetails
        ? normalizeProjectAccessoryDetails(
            found.accessoryDetails,
            catalog
          )
        : projectUsesCustomAccessory(found)
          ? defaultAccessoryDetails()
          : undefined,
      glassPane1Id: found.glassPane1Id ?? defaults.glassPane1Id,
      glassPane2Id: found.glassPane2Id,
      glassGeorgian: found.glassGeorgian ?? defaults.glassGeorgian,
    });
  }, [projectId]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();

    if (!trimmedName) {
      setError("أدخل اسم المشروع");
      return;
    }
    if (!trimmedAddress) {
      setError("أدخل عنوان المشروع");
      return;
    }
    if (!project) {
      setError("المشروع غير موجود");
      return;
    }

    const updated: Project = {
      ...project,
      name: trimmedName,
      location: trimmedAddress,
      ...materials,
    };

    upsertProjectOverride(updated);
    setProject(updated);
    setSaved(true);
    setError("");

    window.setTimeout(() => {
      router.replace(
        `/design/editor?customer=${customerId}&project=${projectId}`
      );
    }, 400);
  }

  function handleDelete() {
    if (!project) return;
    const label = project.name.trim() || "المشروع";
    if (
      !window.confirm(
        `هل تريد حذف «${label}» نهائياً؟ سيتم حذف جميع البنود المرتبطة به، ولا يمكن التراجع.`
      )
    ) {
      return;
    }
    deleteProject(project.id);
    router.replace(ROUTES.design.projects(customerId));
  }

  const fieldClass =
    "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

  if (!project) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
        المشروع غير موجود
        <ScreenBack href={`/design/projects?customer=${customerId}`}>
          رجوع للمشاريع
        </ScreenBack>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium text-foreground">
          اسم المشروع <span className="text-[#E85A8A]">*</span>
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
            setSaved(false);
          }}
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium text-foreground">
          العنوان <span className="text-[#E85A8A]">*</span>
        </span>
        <input
          type="text"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setError("");
            setSaved(false);
          }}
          placeholder="العنوان أو الموقع"
          className={fieldClass}
        />
      </label>

      <div
        className={`rounded-2xl border border-s-[3px] bg-card px-4 py-3 text-right ${WORKFLOW_VISUAL[project.workflow].rail} ${WORKFLOW_VISUAL[project.workflow].border}`}
      >
        <p className="text-xs text-muted">حالة المشروع</p>
        <div className="mt-1.5">
          <WorkflowBadge workflow={project.workflow} solid />
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          الحالة تتحدد تلقائياً: دفعة → قائمة الانتظار، ثم أزرار الورشة
          (بدء / إكمال). لا تُعدَّل من هنا.
        </p>
      </div>

      {project.workflow === "quote" ? (
        <Link
          href={ROUTES.accounting.depositForProject(customerId, projectId)}
          className="flex h-11 w-full items-center justify-center rounded-2xl border border-primary/30 bg-primary-soft text-sm font-semibold text-primary transition-all hover:brightness-105 active:scale-[0.98]"
        >
          تسجيل دفعة في الحسابات
        </Link>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold text-foreground">
          خامات المشروع الافتراضية
        </h2>
        <ProjectMaterialDefaultsFields
          value={materials}
          onChange={(next) => {
            setMaterials(next);
            setSaved(false);
          }}
        />
      </div>

      {error ? (
        <p className="text-sm font-medium text-[#E85A8A]">{error}</p>
      ) : null}
      {saved ? (
        <p className="text-sm font-medium text-emerald-600">
          تم حفظ إعدادات المشروع
        </p>
      ) : null}

      <button
        type="submit"
        className="mt-2 flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-white transition-all hover:brightness-105 active:scale-[0.98]"
      >
        حفظ
      </button>

      <button
        type="button"
        onClick={handleDelete}
        className="flex h-12 w-full items-center justify-center rounded-2xl border border-[#E85A8A]/40 bg-card text-sm font-semibold text-[#E85A8A] transition-all hover:bg-[#E85A8A]/10 active:scale-[0.98]"
      >
        حذف المشروع
      </button>
    </form>
  );
}
