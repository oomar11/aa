"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { NavBack } from "@/components/NavBack";
import {
  loadLocalProjects,
  PROJECTS_STORAGE_KEY,
  type Project,
} from "@/lib/projects";

type Props = {
  customerId: string;
};

export function NewProjectForm({ customerId }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

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

    const project: Project = {
      id: `local-p-${Date.now()}`,
      customerId,
      name: trimmedName,
      location: trimmedAddress,
      createdAt: new Date().toISOString().slice(0, 10),
      status: "open",
      itemsCount: 0,
    };

    const existing = loadLocalProjects();
    localStorage.setItem(
      PROJECTS_STORAGE_KEY,
      JSON.stringify([project, ...existing])
    );

    // Replace the “مشروع جديد” form so Back from the editor returns to projects.
    router.replace(
      `/design/editor?customer=${customerId}&project=${project.id}`
    );
  }

  const fieldClass =
    "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

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
          }}
          placeholder="مثال: فيلا المعادي"
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
          }}
          placeholder="العنوان أو الموقع"
          className={fieldClass}
        />
      </label>

      {error ? (
        <p className="text-sm font-medium text-[#E85A8A]">{error}</p>
      ) : null}

      <div className="mt-2 flex gap-3">
        <NavBack
          href={`/design/projects?customer=${customerId}`}
          className="flex h-12 flex-1 items-center justify-center rounded-2xl border border-border bg-card text-sm font-semibold transition-colors hover:bg-primary-soft"
        >
          رجوع
        </NavBack>
        <button
          type="submit"
          className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-white transition-all hover:brightness-105 active:scale-[0.98]"
        >
          حفظ ومتابعة
        </button>
      </div>
    </form>
  );
}
