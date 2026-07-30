"use client";

import type { MeshKind } from "@/lib/design-items";

type CategoryOpt = {
  id: string;
  label: string;
  calcProfile: boolean;
};

type MeshOpt = {
  id: string;
  label: string;
  kind: MeshKind;
  pricePerSqm: number;
};

type Props = {
  meshTypeId?: string;
  meshKind: MeshKind;
  meshKindManual?: boolean;
  categoryOpts: CategoryOpt[];
  meshOpts: MeshOpt[];
  onChange: (next: {
    meshTypeId?: string;
    meshKind?: MeshKind;
    meshKindManual?: boolean;
  }) => void;
  hint?: string;
};

export function MeshTypePicker({
  meshTypeId,
  meshKind,
  meshKindManual,
  categoryOpts,
  meshOpts,
  onChange,
  hint,
}: Props) {
  const typesForKind = meshOpts.filter((m) => m.kind === meshKind);

  function pickTypeForKind(kind: MeshKind) {
    const current = meshOpts.find((m) => m.id === meshTypeId);
    if (current?.kind === kind) return meshTypeId;
    return meshOpts.find((m) => m.kind === kind)?.id;
  }

  return (
    <div className="space-y-3">
      {hint ? (
        <p className="text-[12px] leading-relaxed text-muted">{hint}</p>
      ) : null}

      <div>
        <p className="mb-2 text-[11px] font-semibold text-foreground">
          تصنيف السلك
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {categoryOpts.map((k) => {
            const active = meshKind === k.id;
            const typeCount = meshOpts.filter((m) => m.kind === k.id).length;
            return (
              <button
                key={k.id}
                type="button"
                onClick={() =>
                  onChange({
                    meshTypeId: pickTypeForKind(k.id),
                    meshKind: k.id,
                    meshKindManual: true,
                  })
                }
                className={`rounded-xl border px-2 py-2.5 text-[11px] font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-background text-foreground"
                }`}
              >
                <span className="block">{k.label}</span>
                {k.calcProfile ? (
                  <span className="mt-0.5 block text-[9px] font-normal opacity-80">
                    قطاع + مساحة
                  </span>
                ) : (
                  <span className="mt-0.5 block text-[9px] font-normal opacity-80">
                    {typeCount > 0 ? `${typeCount} نوع` : "بدون أنواع"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {!meshKindManual ? (
          <p className="mt-1.5 text-[10px] text-muted">
            تلقائي من نوع الفتح — غيّر يدوياً لو محتاج
          </p>
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold text-foreground">
          نوع السلك
        </p>
        {typesForKind.length === 0 ? (
          <p className="rounded-xl border border-border bg-background px-3 py-2.5 text-[11px] text-muted">
            مفيش أنواع للتصنيف ده — أضف من صفحة السلك في الخامات
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {typesForKind.map((m) => {
              const active = meshTypeId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      meshTypeId: m.id,
                      meshKind,
                      meshKindManual,
                    })
                  }
                  className={`rounded-xl border px-2 py-2.5 text-[11px] font-semibold transition-colors ${
                    active
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-background text-foreground"
                  }`}
                >
                  <span className="block truncate">{m.label}</span>
                  {m.pricePerSqm > 0 ? (
                    <span className="mt-0.5 block text-[9px] font-normal opacity-80">
                      {m.pricePerSqm} ج.م/م²
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
