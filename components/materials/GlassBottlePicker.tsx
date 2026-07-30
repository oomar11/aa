"use client";

type BottleOpt = { id: string; label: string; pricePerSqm: number };

type Props = {
  pane1Id?: string;
  pane2Id?: string;
  georgian?: boolean;
  bottleOpts: BottleOpt[];
  onChange: (next: {
    pane1Id?: string;
    pane2Id?: string;
    georgian?: boolean;
  }) => void;
  /** نص توضيحي أعلى الاختيار */
  hint?: string;
};

export function GlassBottlePicker({
  pane1Id,
  pane2Id,
  georgian,
  bottleOpts,
  onChange,
  hint,
}: Props) {
  return (
    <div className="space-y-3">
      {hint ? (
        <p className="text-[12px] leading-relaxed text-muted">{hint}</p>
      ) : null}

      <div>
        <p className="mb-2 text-[11px] font-semibold text-foreground">
          الزجاجة الأولى
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {bottleOpts.map((b) => {
            const active = pane1Id === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onChange({ pane1Id: b.id, pane2Id, georgian })}
                className={`rounded-xl border px-2 py-2.5 text-[11px] font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-background text-foreground"
                }`}
              >
                <span className="block truncate">{b.label}</span>
                {b.pricePerSqm > 0 ? (
                  <span className="mt-0.5 block text-[9px] font-normal opacity-80">
                    {b.pricePerSqm} ج.م/م²
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {pane1Id ? (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-foreground">
              الزجاجة الثانية (دبل)
            </p>
            {pane2Id ? (
              <button
                type="button"
                onClick={() =>
                  onChange({ pane1Id, pane2Id: undefined, georgian: undefined })
                }
                className="text-[10px] font-semibold text-primary"
              >
                إزالة
              </button>
            ) : null}
          </div>
          {!pane2Id ? (
            <button
              type="button"
              onClick={() =>
                onChange({
                  pane1Id,
                  pane2Id:
                    bottleOpts.find((b) => b.id !== pane1Id)?.id ??
                    bottleOpts[0]?.id,
                  georgian,
                })
              }
              className="w-full rounded-xl border border-dashed border-primary/50 bg-primary-soft/30 px-3 py-2.5 text-[11px] font-semibold text-primary"
            >
              + إضافة زجاجة تانية (دبل)
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {bottleOpts.map((b) => {
                const active = pane2Id === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onChange({ pane1Id, pane2Id: b.id, georgian })}
                    className={`rounded-xl border px-2 py-2.5 text-[11px] font-semibold transition-colors ${
                      active
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border bg-background text-foreground"
                    }`}
                  >
                    <span className="block truncate">{b.label}</span>
                    {b.pricePerSqm > 0 ? (
                      <span className="mt-0.5 block text-[9px] font-normal opacity-80">
                        {b.pricePerSqm} ج.م/م²
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {pane2Id ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
          <div>
            <p className="text-[12px] font-semibold text-foreground">جورجيا</p>
            <p className="text-[10px] text-muted">بارك زخرفي بين الزجاجتين</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(georgian)}
            onClick={() =>
              onChange({ pane1Id, pane2Id, georgian: !georgian })
            }
            className={`relative h-7 w-12 rounded-full transition-colors ${
              georgian ? "bg-primary" : "bg-border"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                georgian ? "left-0.5" : "left-5"
              }`}
            />
          </button>
        </div>
      ) : null}
    </div>
  );
}
