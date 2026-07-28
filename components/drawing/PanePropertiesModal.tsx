"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  defaultPaneConfig,
  gridCellCount,
  normalizePaneConfig,
  type PaneConfig,
  type PaneGrid,
  type PaneOpening,
} from "@/lib/design-items";
import { getGridCells, gridLines } from "@/lib/pane-grid";

type Props = {
  open: boolean;
  initial: PaneConfig;
  bouclierEligible?: boolean;
  onClose: () => void;
  onConfirm: (config: PaneConfig) => void;
};

const GRIDS: { id: PaneGrid; label: string }[] = [
  { id: "solid", label: "ضلفة كاملة" },
  { id: "2v", label: "قسمين رأسي" },
  { id: "2h", label: "قسمين أفقي" },
  { id: "3v", label: "٣ أقسام رأسي" },
  { id: "3h", label: "٣ أقسام أفقي" },
  { id: "4v", label: "٤ أقسام رأسي" },
  { id: "4h", label: "٤ أقسام أفقي" },
  { id: "2x2", label: "شبكة ٢×٢" },
  { id: "3x2", label: "شبكة ٣×٢" },
  { id: "2x3", label: "شبكة ٢×٣" },
  { id: "3x3", label: "شبكة ٣×٣" },
  { id: "top-2v", label: "أعلى منقسم" },
  { id: "bot-2v", label: "أسفل منقسم" },
  { id: "diamond", label: "معين" },
];

const OPENINGS: { id: PaneOpening; label: string }[] = [
  { id: "sliding-right", label: "سحاب يمين" },
  { id: "tilt", label: "قلاب" },
  { id: "sliding-left", label: "سحاب يسار" },
  { id: "fixed", label: "ثابت" },
  { id: "exhaust", label: "شفاط" },
  { id: "tilt-turn", label: "قلب وضلفة" },
  { id: "tilt-turn-left", label: "قلب وضلفة يسار" },
  { id: "drawer-right", label: "جرار يمين" },
  { id: "drawer-left", label: "جرار شمال" },
];

export function PanePropertiesModal({
  open,
  initial,
  bouclierEligible = false,
  onClose,
  onConfirm,
}: Props) {
  const [draft, setDraft] = useState<PaneConfig>(defaultPaneConfig());

  useEffect(() => {
    if (!open) return;
    setDraft(normalizePaneConfig(initial));
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const cellCount = useMemo(
    () => gridCellCount(draft.grid ?? "solid"),
    [draft.grid]
  );

  if (!open) return null;

  function setGrid(grid: PaneGrid) {
    const count = gridCellCount(grid);
    setDraft((d) => ({
      ...d,
      grid,
      panelCells: (d.panelCells ?? []).filter((i) => i < count),
    }));
  }

  function togglePanelCell(index: number) {
    setDraft((d) => {
      const set = new Set(d.panelCells ?? []);
      if (set.has(index)) set.delete(index);
      else set.add(index);
      return { ...d, panelCells: [...set].sort((a, b) => a - b) };
    });
  }

  function toggleFlag(
    key: "sandwichPanels" | "mesh" | "isDoor",
    value: boolean
  ) {
    setDraft((d) => {
      const next = { ...d, [key]: value };
      if (
        key === "sandwichPanels" &&
        value &&
        ((d.grid ?? "solid") === "solid" || d.grid === "diamond")
      ) {
        next.panelCells = [0];
      }
      if (
        key === "sandwichPanels" &&
        !value &&
        ((d.grid ?? "solid") === "solid" || d.grid === "diamond")
      ) {
        next.panelCells = [];
      }
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-3 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pane-props-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(90dvh,680px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(15,20,28,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-3 py-2.5 text-center">
          <h2
            id="pane-props-title"
            className="text-sm font-bold text-foreground"
          >
            خصائص الضلفة
          </h2>
          <p className="mt-0.5 text-[11px] text-muted">
            اختَر نوع الفتح ثم التقسيم الداخلي
          </p>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-0 overflow-hidden">
          {/* نوع الفتح — أولاً (يمين في RTL) */}
          <section className="flex min-h-0 flex-col border-l border-border">
            <header className="bg-primary px-2 py-1.5 text-center">
              <p className="text-sm font-bold text-primary-foreground">
                نوع الفتح
              </p>
              <p className="text-[10px] font-normal text-primary-foreground/80">
                ثابت، سحاب، قلاب…
              </p>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto bg-background/40 p-2">
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {OPENINGS.map((o) => {
                  const active = draft.opening === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      title={o.label}
                      aria-label={o.label}
                      aria-pressed={active}
                      onClick={() =>
                        setDraft((d) => ({ ...d, opening: o.id }))
                      }
                      className={`flex flex-col items-center gap-1 rounded-xl border-2 bg-card p-1.5 ${
                        active
                          ? "border-primary ring-2 ring-primary/25"
                          : "border-transparent hover:border-primary/40"
                      }`}
                    >
                      <span className="aspect-square w-full max-w-[3.25rem]">
                        <OpeningIcon type={o.id} />
                      </span>
                      <span className="w-full truncate text-center text-[10px] font-medium leading-tight text-foreground">
                        {o.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* التقسيم الداخلي */}
          <section className="flex min-h-0 flex-col">
            <header className="bg-primary px-2 py-1.5 text-center">
              <p className="text-sm font-bold text-primary-foreground">
                التقسيم الداخلي
              </p>
              <p className="text-[10px] font-normal text-primary-foreground/80">
                عوائد / تقسيم الزجاج
              </p>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto bg-background/40 p-2">
              <div className="grid grid-cols-2 gap-1.5">
                {GRIDS.map((g) => {
                  const active = (draft.grid ?? "solid") === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      title={g.label}
                      aria-label={g.label}
                      aria-pressed={active}
                      onClick={() => setGrid(g.id)}
                      className={`flex flex-col items-center gap-1 rounded-xl border-2 bg-card p-1.5 ${
                        active
                          ? "border-primary ring-2 ring-primary/25"
                          : "border-transparent hover:border-primary/40"
                      }`}
                    >
                      <span className="aspect-square w-full max-w-[3.25rem]">
                        <GridIcon type={g.id} />
                      </span>
                      <span className="w-full truncate text-center text-[10px] font-medium leading-tight text-foreground">
                        {g.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 space-y-2">
                <FlagRow
                  label="بنل ساندوتش"
                  checked={Boolean(draft.sandwichPanels)}
                  onChange={(v) => toggleFlag("sandwichPanels", v)}
                  icon={<PanelIcon />}
                />
                <FlagRow
                  label="ضلفة باب"
                  checked={Boolean(draft.isDoor)}
                  onChange={(v) => toggleFlag("isDoor", v)}
                  icon={<DoorIcon />}
                />
                <FlagRow
                  label="شبكة سلك"
                  checked={Boolean(draft.mesh)}
                  onChange={(v) => toggleFlag("mesh", v)}
                  icon={<MeshIcon />}
                />
              </div>

              {bouclierEligible && draft.opening === "fixed" && (
                <div className="mt-3 rounded-xl border border-border bg-card p-2">
                  <p className="mb-2 text-[11px] font-semibold text-foreground">
                    سوقاس / بوكلير
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          bouclier: false,
                          bouclierManual: true,
                        }))
                      }
                      className={`rounded-xl border px-2 py-2 text-[11px] font-semibold ${
                        !draft.bouclier
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border bg-background text-foreground"
                      }`}
                    >
                      سوقاس (ثابت)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          bouclier: true,
                          bouclierManual: true,
                        }))
                      }
                      className={`rounded-xl border px-2 py-2 text-[11px] font-semibold ${
                        draft.bouclier
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border bg-background text-foreground"
                      }`}
                    >
                      بوكلير
                    </button>
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted">
                    البوكلير متاح فقط بين مفصلي يمين ويسار والمقابض باتجاه بعض
                  </p>
                </div>
              )}

              {draft.sandwichPanels && cellCount > 1 && (
                <PanelCellPicker
                  grid={draft.grid ?? "solid"}
                  cellCount={cellCount}
                  selected={draft.panelCells ?? []}
                  onToggle={togglePanelCell}
                  onSelectAll={() =>
                    setDraft((d) => ({
                      ...d,
                      panelCells: Array.from(
                        { length: cellCount },
                        (_, i) => i
                      ),
                    }))
                  }
                  onClearAll={() =>
                    setDraft((d) => ({ ...d, panelCells: [] }))
                  }
                />
              )}
            </div>
          </section>
        </div>

        <footer className="grid grid-cols-2 gap-3 border-t border-border p-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 items-center justify-center rounded-2xl border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:bg-primary-soft"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => onConfirm(normalizePaneConfig(draft))}
            className="flex h-12 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition-all hover:brightness-105 active:scale-[0.98]"
          >
            تطبيق
          </button>
        </footer>
      </div>
    </div>
  );
}

function PanelCellPicker({
  grid,
  cellCount,
  selected,
  onToggle,
  onSelectAll,
  onClearAll,
}: {
  grid: PaneGrid;
  cellCount: number;
  selected: number[];
  onToggle: (index: number) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  const selectedCount = selected.length;
  const allSelected = selectedCount === cellCount;
  const noneSelected = selectedCount === 0;
  const cells = getGridCells(grid, 0, 0, 100, 100);

  return (
    <div className="mt-3 rounded-xl border border-border bg-card p-2.5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-foreground">
            أجزاء البنل
          </p>
          <p className="text-[10px] text-muted">
            اضغط على الجزء عشان يبقى بنل أو زجاج
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">
          {selectedCount}/{cellCount}
        </span>
      </div>

      <div
        className="relative mx-auto overflow-hidden rounded-lg border-2 border-[#6b7280] bg-[#6b7280] shadow-inner"
        style={{ width: "100%", maxWidth: 168, aspectRatio: "1 / 1.05" }}
      >
        {cells.map((cell, i) => {
          const on = selected.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onToggle(i)}
              aria-pressed={on}
              aria-label={on ? `جزء ${i + 1}: بنل` : `جزء ${i + 1}: زجاج`}
              className={`absolute flex items-center justify-center overflow-hidden transition-colors ${
                on
                  ? "bg-[#c4a06a] text-white"
                  : "bg-[linear-gradient(180deg,#dbeafe_0%,#93c5fd_100%)] text-sky-900/70"
              }`}
              style={{
                left: `${cell.x}%`,
                top: `${cell.y}%`,
                width: `${cell.w}%`,
                height: `${cell.h}%`,
                boxShadow: "inset 0 0 0 1.5px #6b7280",
              }}
            >
              {on && (
                <span
                  className="pointer-events-none absolute inset-0"
                  aria-hidden
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(to bottom, transparent 0, transparent 28%, rgba(0,0,0,0.22) 28%, rgba(0,0,0,0.22) 34%)",
                  }}
                />
              )}
              <span className="relative text-[9px] font-bold leading-none">
                {on ? "بنل" : "زجاج"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-muted">
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: "#c4a06a" }}
            aria-hidden
          />
          بنل
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm bg-sky-300"
            aria-hidden
          />
          زجاج
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={onSelectAll}
          disabled={allSelected}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-[10px] font-semibold text-foreground disabled:opacity-40"
        >
          كل البنل
        </button>
        <button
          type="button"
          onClick={onClearAll}
          disabled={noneSelected}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-[10px] font-semibold text-foreground disabled:opacity-40"
        >
          كل الزجاج
        </button>
      </div>
    </div>
  );
}

function FlagRow({
  label,
  checked,
  onChange,
  icon,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-1.5 py-1">
      <span className="flex h-8 w-8 items-center justify-center text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-[11px] font-medium text-foreground">
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--primary)]"
      />
    </label>
  );
}

function GridIcon({ type }: { type: PaneGrid }) {
  const stroke = "currentColor";
  const lines = gridLines(type, 4, 4, 32, 32);
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full text-primary" aria-hidden>
      <rect
        x="4"
        y="4"
        width="32"
        height="32"
        fill="var(--primary-soft)"
        stroke={stroke}
        strokeWidth="2"
      />
      {lines.map((line, i) => (
        <line
          key={i}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={stroke}
          strokeWidth={type === "3x3" || type === "4v" || type === "4h" ? 1.5 : 2}
        />
      ))}
    </svg>
  );
}

function OpeningIcon({ type }: { type: PaneOpening }) {
  const s = "currentColor";
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full text-primary" fill="none" aria-hidden>
      <rect x="5" y="5" width="30" height="30" stroke={s} strokeWidth="1.8" />
      {type === "fixed" && (
        <>
          <line x1="8" y1="20" x2="32" y2="20" stroke={s} strokeWidth="1.6" />
          <line x1="20" y1="8" x2="20" y2="32" stroke={s} strokeWidth="1.6" />
        </>
      )}
      {type === "exhaust" && (
        <>
          <circle cx="20" cy="20" r="10" stroke={s} strokeWidth="1.6" />
          <circle cx="20" cy="20" r="2.2" fill={s} stroke="none" />
          <path
            d="M20 10.5 Q26 14 24.5 20 Q22 12.5 20 10.5 M20 10.5 Q14 14 15.5 20 Q18 12.5 20 10.5 M24.5 20 Q26 26 20 29.5 Q22 22.5 24.5 20 M15.5 20 Q14 26 20 29.5 Q18 22.5 15.5 20"
            stroke={s}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </>
      )}
      {type === "tilt" && (
        <path d="M8 32 L20 8 L32 32" stroke={s} strokeWidth="1.6" />
      )}
      {type === "casement-left" && (
        <path d="M32 8 L8 20 L32 32" stroke={s} strokeWidth="1.6" />
      )}
      {type === "casement-right" && (
        <path d="M8 8 L32 20 L8 32" stroke={s} strokeWidth="1.6" />
      )}
      {type === "sliding-left" && (
        <path d="M28 20 H12 M16 14 L10 20 L16 26" stroke={s} strokeWidth="1.6" />
      )}
      {type === "sliding-right" && (
        <path d="M12 20 H28 M24 14 L30 20 L24 26" stroke={s} strokeWidth="1.6" />
      )}
      {type === "drawer-left" && (
        <path
          d="M16 14.5 L11 20 L16 25.5 M11 20 H29 V26"
          stroke={s}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {type === "drawer-right" && (
        <path
          d="M24 14.5 L29 20 L24 25.5 M29 20 H11 V26"
          stroke={s}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {type === "tilt-turn" && (
        <>
          <path d="M8 32 L20 8 L32 32" stroke={s} strokeWidth="1.4" />
          <path d="M32 8 L8 20 L32 32" stroke={s} strokeWidth="1.3" opacity="0.8" />
        </>
      )}
      {type === "tilt-turn-left" && (
        <>
          <path d="M8 32 L20 8 L32 32" stroke={s} strokeWidth="1.4" />
          <path d="M8 8 L32 20 L8 32" stroke={s} strokeWidth="1.3" opacity="0.8" />
        </>
      )}
      {(type === "door-left" || type === "door-right") && (
        <path
          d={
            type === "door-left"
              ? "M32 8 L8 20 L32 32"
              : "M8 8 L32 20 L8 32"
          }
          stroke={s}
          strokeWidth="1.6"
        />
      )}
    </svg>
  );
}

function PanelIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="4" y="3" width="16" height="18" />
      <rect x="6" y="12" width="12" height="7" fill="currentColor" opacity="0.25" />
    </svg>
  );
}

function DoorIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="7" y="2" width="10" height="20" />
      <circle cx="14" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function MeshIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <rect x="4" y="4" width="16" height="16" />
      <path d="M4 8h16M4 12h16M4 16h16M8 4v16M12 4v16M16 4v16" />
    </svg>
  );
}
