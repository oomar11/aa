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
  type ProjectWorkflow,
} from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import { WORKFLOW_LABELS, scheduleProjectWithDeposit } from "@/lib/workshop";
import { NumericInput } from "@/components/ui/NumericInput";
import { todayIsoDate } from "@/lib/accounting";

type Props = {
  customerId: string;
  projectId: string;
};

export function ProjectSettingsForm({ customerId, projectId }: Props) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [workflow, setWorkflow] = useState<ProjectWorkflow>("quote");
  const [materials, setMaterials] = useState<ProjectMaterialDefaults>({});
  const [depositAmount, setDepositAmount] = useState(0);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const found = getProjectById(projectId);
    if (!found) return;
    setProject(found);
    setName(found.name);
    setAddress(found.location ?? "");
    setWorkflow(found.workflow);
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
      setError("اكتب اسم المشروع");
      return;
    }
    if (!trimmedAddress) {
      setError("اكتب عنوان المشروع");
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
      status: workflow === "done" ? "done" : "open",
      workflow,
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
        `هل تريد حذف «${label}» نهائيًا؟ هتتحذف كل البنود المرتبطة بيه، ومفيش تراجع.`
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

      <fieldset className="flex flex-col gap-2 text-right">
        <legend className="text-sm font-medium text-foreground">
          حالة المشروع
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              "quote",
              "queued",
              "workshop",
              "done",
            ] as const satisfies readonly ProjectWorkflow[]
          ).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setWorkflow(key);
                setSaved(false);
              }}
              className={`h-11 rounded-2xl border text-sm font-semibold transition-colors ${
                workflow === key
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-card text-foreground"
              }`}
            >
              {WORKFLOW_LABELS[key]}
            </button>
          ))}
        </div>
        <p className="text-[11px] leading-relaxed text-muted">
          المقايسة متترفعش للورشة غير بعد استلام العربون — أو غيّر الحالة يدوي
          من هنا.
        </p>
      </fieldset>

      {workflow === "quote" ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-bold text-foreground">
            استلام عربون وجدولة
          </h2>
          <label className="flex flex-col gap-1.5 text-right">
            <span className="text-xs font-medium">المبلغ (ج.م)</span>
            <NumericInput
              value={depositAmount}
              onChange={setDepositAmount}
              min={0}
              blankZero
              className={`${fieldClass} text-left`}
              dir="ltr"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              if (depositAmount <= 0) {
                setError("ادخل مبلغ العربون");
                return;
              }
              scheduleProjectWithDeposit({
                projectId,
                amount: depositAmount,
                date: todayIsoDate(),
              });
              setWorkflow("queued");
              setDepositAmount(0);
              setError("");
              setSaved(true);
            }}
            className="mt-3 flex h-11 w-full items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-white"
          >
            استلام عربون وإضافة للطابور
          </button>
        </div>
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
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
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
