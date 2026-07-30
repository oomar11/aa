"use client";

type Tab<T extends string> = {
  id: T;
  label: string;
};

type Props<T extends string> = {
  tabs: readonly Tab<T>[];
  active: T;
  onChange: (id: T) => void;
  /** اسم aria للمجموعة */
  label?: string;
};

/** تبويبات أفقية لتنظيم صفحات تفاصيل الخامات */
export function MaterialSectionTabs<T extends string>({
  tabs,
  active,
  onChange,
  label = "أقسام الصفحة",
}: Props<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1"
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              selected
                ? "bg-primary text-primary-foreground"
                : "text-muted hover:bg-primary-soft hover:text-primary"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
