"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ScreenBack } from "@/components/ScreenBack";
import {
  getProjectById,
  upsertProjectOverride,
  type Project,
} from "@/lib/projects";

type Props = {
  customerId: string;
  projectId: string;
};

export function ProjectSettingsForm({ customerId, projectId }: Props) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<Project["status"]>("open");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const found = getProjectById(projectId);
    if (!found) return;
    setProject(found);
    setName(found.name);
    setAddress(found.location ?? "");
    setStatus(found.status);
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
      status,
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
        <legend className="text-sm font-medium text-foreground">الحالة</legend>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setStatus("open");
              setSaved(false);
            }}
            className={`h-11 rounded-2xl border text-sm font-semibold transition-colors ${
              status === "open"
                ? "border-primary bg-primary text-white"
                : "border-border bg-card text-foreground"
            }`}
          >
            مفتوح
          </button>
          <button
            type="button"
            onClick={() => {
              setStatus("done");
              setSaved(false);
            }}
            className={`h-11 rounded-2xl border text-sm font-semibold transition-colors ${
              status === "done"
                ? "border-primary bg-primary text-white"
                : "border-border bg-card text-foreground"
            }`}
          >
            مكتمل
          </button>
        </div>
      </fieldset>

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
    </form>
  );
}
