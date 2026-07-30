"use client";

import { useEffect, useState } from "react";
import { GlassBottlePicker } from "@/components/GlassBottlePicker";
import {
  loadAccessoryOptions,
  loadSystemOptions,
} from "@/lib/item-catalogs";
import {
  type ProjectMaterialDefaults,
} from "@/lib/project-materials";
import { glassBottleOptions, loadMaterialCatalog } from "@/lib/material-systems";

type Props = {
  value: ProjectMaterialDefaults;
  onChange: (next: ProjectMaterialDefaults) => void;
};

/** اختيار القطاع والاكسسوار والزجاج الافتراضي للمشروع — كل الأنظمة من الكتالوج */
export function ProjectMaterialDefaultsFields({ value, onChange }: Props) {
  const [systemOpts, setSystemOpts] = useState<{ id: string; label: string }[]>(
    []
  );
  const [accessoryOpts, setAccessoryOpts] = useState<
    { id: string; label: string }[]
  >([]);
  const [bottleOpts, setBottleOpts] = useState<
    { id: string; label: string; pricePerSqm: number }[]
  >([]);

  useEffect(() => {
    const catalog = loadMaterialCatalog();
    const withoutIgnore = (opts: { id: string; label: string }[]) =>
      opts.filter((o) => o.id !== "none");
    setSystemOpts(withoutIgnore(loadSystemOptions()));
    setAccessoryOpts(withoutIgnore(loadAccessoryOptions()));
    setBottleOpts(glassBottleOptions(catalog));
  }, []);

  function patch(partial: Partial<ProjectMaterialDefaults>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] leading-relaxed text-muted">
        الخامات الافتراضية للبنود الجديدة — اختَر أي نظام من الكتالوج (مش لازم
        الافتراضي أو الاقتصادي). تقدر تغيّر لكل بند لاحقاً من إعدادات البند.
      </p>

      <Field title="نظام القطاعات">
        <RadioList
          name="project-system"
          options={systemOpts}
          value={value.systemId ?? ""}
          onChange={(id) => patch({ systemId: id })}
        />
      </Field>

      <Field title="نظام الاكسسوار">
        <RadioList
          name="project-accessory"
          options={accessoryOpts}
          value={value.accessoryId ?? ""}
          onChange={(id) => patch({ accessoryId: id })}
        />
      </Field>

      <Field title="الزجاج الافتراضي">
        <GlassBottlePicker
          pane1Id={value.glassPane1Id}
          pane2Id={value.glassPane2Id}
          georgian={value.glassGeorgian}
          bottleOpts={bottleOpts}
          onChange={(next) =>
            patch({
              glassPane1Id: next.pane1Id,
              glassPane2Id: next.pane2Id,
              glassGeorgian: next.georgian,
            })
          }
        />
      </Field>
    </div>
  );
}

function Field({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-2 text-right">
      <legend className="text-sm font-medium text-foreground">{title}</legend>
      {children}
    </fieldset>
  );
}

function RadioList({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (options.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-3 py-2 text-xs text-muted">
        جاري تحميل الأنظمة…
      </p>
    );
  }

  return (
    <div className="max-h-48 overflow-y-auto rounded-2xl border border-border bg-card">
      {options.map((opt, i) => {
        const active = value === opt.id;
        return (
          <label
            key={opt.id}
            className={`flex cursor-pointer items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
              i > 0 ? "border-t border-border" : ""
            } ${active ? "bg-primary-soft" : "hover:bg-primary-soft/40"}`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                active ? "border-primary" : "border-border"
              }`}
            >
              {active ? (
                <span className="h-2 w-2 rounded-full bg-primary" />
              ) : null}
            </span>
            <input
              type="radio"
              name={name}
              checked={active}
              onChange={() => onChange(opt.id)}
              className="sr-only"
            />
            <span
              className={
                active ? "font-semibold text-primary" : "text-foreground"
              }
            >
              {opt.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
