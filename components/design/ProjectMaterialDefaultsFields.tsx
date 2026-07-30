"use client";

import { useEffect, useState } from "react";
import { AccessoryDetailsForm } from "@/components/materials/AccessoryDetailsForm";
import { GlassBottlePicker } from "@/components/materials/GlassBottlePicker";
import {
  loadAccessoryOptions,
  loadSystemOptions,
} from "@/lib/item-catalogs";
import {
  normalizeProjectAccessoryDetails,
  type ProjectMaterialDefaults,
} from "@/lib/project-materials";
import {
  defaultAccessoryDetails,
  findSystem,
  glassBottleOptions,
  loadMaterialCatalog,
} from "@/lib/material-systems";

type Props = {
  value: ProjectMaterialDefaults;
  onChange: (next: ProjectMaterialDefaults) => void;
};

/** اختيار القطاع والاكسسوار والزجاج الافتراضي للمشروع */
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
  const [brandCatalog, setBrandCatalog] = useState(
    () => loadMaterialCatalog().accessoryBrands ?? []
  );
  const [showCustomEditor, setShowCustomEditor] = useState(false);

  const accessorySource = value.accessorySource ?? "catalog";
  const isCustom = accessorySource === "custom";

  useEffect(() => {
    const catalog = loadMaterialCatalog();
    const withoutIgnore = (opts: { id: string; label: string }[]) =>
      opts.filter((o) => o.id !== "none");
    setSystemOpts(withoutIgnore(loadSystemOptions()));
    setAccessoryOpts(withoutIgnore(loadAccessoryOptions()));
    setBottleOpts(glassBottleOptions(catalog));
    setBrandCatalog(catalog.accessoryBrands ?? []);
  }, []);

  function patch(partial: Partial<ProjectMaterialDefaults>) {
    onChange({ ...value, ...partial });
  }

  function switchToCatalog() {
    patch({ accessorySource: "catalog" });
    setShowCustomEditor(false);
  }

  function switchToCustom(fromCatalogId?: string) {
    const catalog = loadMaterialCatalog();
    const baseId = fromCatalogId ?? value.accessoryId;
    const base = baseId
      ? findSystem("accessories", baseId, catalog)
      : null;
    const details = base?.accessory
      ? normalizeProjectAccessoryDetails(base.accessory, catalog)
      : defaultAccessoryDetails();
    patch({
      accessorySource: "custom",
      accessoryCustomName:
        value.accessoryCustomName?.trim() ||
        (base ? `${base.name} (مخصص)` : "اكسسوار مخصص للمشروع"),
      accessoryDetails: value.accessoryDetails ?? details,
    });
    setShowCustomEditor(true);
  }

  function copyFromCatalog(catalogId: string) {
    const catalog = loadMaterialCatalog();
    const base = findSystem("accessories", catalogId, catalog);
    if (!base?.accessory) return;
    patch({
      accessoryDetails: normalizeProjectAccessoryDetails(
        base.accessory,
        catalog
      ),
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] leading-relaxed text-muted">
        الخامات الافتراضية للبنود الجديدة. غالباً يكفي اختيار نظام اكسسوار من
        الكتالوج.
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
        <div className="mb-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={switchToCatalog}
            className={`h-10 rounded-xl border text-xs font-semibold transition-colors ${
              !isCustom
                ? "border-primary bg-primary text-white"
                : "border-border bg-card text-foreground"
            }`}
          >
            من الكتالوج
          </button>
          <button
            type="button"
            onClick={() => switchToCustom()}
            className={`h-10 rounded-xl border text-xs font-semibold transition-colors ${
              isCustom
                ? "border-primary bg-primary text-white"
                : "border-border bg-card text-foreground"
            }`}
          >
            مخصص للمشروع
          </button>
        </div>

        {isCustom ? (
          <div className="space-y-3 rounded-2xl border border-primary/30 bg-primary-soft/20 p-3">
            <label className="block text-right text-[11px] text-muted">
              اسم نظام الاكسسوار
              <input
                type="text"
                value={value.accessoryCustomName ?? ""}
                onChange={(e) =>
                  patch({ accessoryCustomName: e.target.value })
                }
                placeholder="مثال: اكسسوار فيلا المعادي"
                className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>

            <div className="flex flex-wrap justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setShowCustomEditor((v) => !v)}
                className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground"
              >
                {showCustomEditor ? "إخفاء القواعد" : "تعديل القواعد"}
              </button>
              {accessoryOpts.length > 0 ? (
                <select
                  value=""
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) copyFromCatalog(id);
                  }}
                  className="rounded-lg border border-border bg-card px-2 py-1 text-[11px] text-foreground"
                  aria-label="نسخ من كتالوج"
                >
                  <option value="">نسخ من كتالوج…</option>
                  {accessoryOpts.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            {showCustomEditor && value.accessoryDetails ? (
              <AccessoryDetailsForm
                compact
                details={value.accessoryDetails}
                onChange={(next) => patch({ accessoryDetails: next })}
                brandCatalog={brandCatalog}
              />
            ) : (
              <p className="text-[10px] leading-relaxed text-muted">
                القواعد محفوظة مع المشروع — اضغط «تعديل القواعد» لو حابب تغيّر
                أرقام المفصلات والجرار.
              </p>
            )}
          </div>
        ) : (
          <RadioList
            name="project-accessory"
            options={accessoryOpts}
            value={value.accessoryId ?? ""}
            onChange={(id) => patch({ accessoryId: id })}
          />
        )}
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
