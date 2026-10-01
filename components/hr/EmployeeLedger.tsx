"use client";

import { FormEvent, useMemo, useState } from "react";
import { StoreSafePicker } from "@/components/accounting/StoreSafePicker";
import { NumericInput } from "@/components/ui/NumericInput";
import { todayIsoDate } from "@/lib/accounting";
import {
  advanceOpenAmount,
  attachAdvanceStoreBridge,
  bonusOpenAmount,
  deleteAdvance,
  deleteBonus,
  registerAdvance,
  registerBonus,
  type Advance,
  type Bonus,
} from "@/lib/hr";
import { LEDGER_VISUAL, type LedgerKind } from "@/lib/hr-visual";
import {
  isStoreBridgeActive,
  loadStoreBridgeConfig,
  syncMoneyToStore,
  withStoreBridgeMeta,
} from "@/lib/store-bridge";
import { listAllProjects, type Project } from "@/lib/projects";
import { formatCurrency, formatDate } from "@/lib/utils";
import { WORKFLOW_LABELS } from "@/lib/workshop";

const FIELD =
  "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

type LedgerEntry = {
  kind: LedgerKind;
  id: string;
  date: string;
  amount: number;
  open: number;
  settledAmount: number;
  note?: string;
  projectId?: string;
};

/**
 * فورم واحد بزرار تبديل "سلفة / مكافأة" — بدل فورمين وصفحتين منفصلتين.
 * مربوط بموظف واحد بس (مفيش اختيار موظف — إحنا أصلاً جوه صفحته).
 */
export function LedgerForm({
  employeeId,
  onSaved,
}: {
  employeeId: string;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState<LedgerKind>("advance");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayIsoDate);
  const [note, setNote] = useState("");
  const [projectId, setProjectId] = useState("");
  const [safeId, setSafeId] = useState("");
  const [safeName, setSafeName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [projects] = useState<Project[]>(() =>
    typeof window === "undefined" ? [] : listAllProjects()
  );

  const visual = LEDGER_VISUAL[kind];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!(amount > 0)) {
      setError(kind === "advance" ? "أدخل مبلغ السلفة" : "أدخل مبلغ المكافأة");
      return;
    }
    const cfg = loadStoreBridgeConfig();
    const bridgeOn = isStoreBridgeActive(cfg);
    if (kind === "advance" && bridgeOn && !safeId) {
      setError("اختر خزنة المتجر");
      return;
    }

    setError("");
    setSaving(true);
    try {
      if (kind === "advance") {
        const saved = registerAdvance({
          employeeId,
          amount,
          date,
          note: note.trim() || undefined,
        });
        if (saved.expenseId && bridgeOn && cfg) {
          try {
            const sync = await syncMoneyToStore(
              {
                kind: "expense",
                externalKey: saved.expenseId,
                amount: saved.amount,
                description: ["ورشة · سلفة"].join(" · "),
                notes: saved.note,
                occurredAt: date ? `${date}T12:00:00.000Z` : undefined,
                safeId,
              },
              cfg
            );
            attachAdvanceStoreBridge(
              saved.id,
              withStoreBridgeMeta(
                saved.amount,
                sync.safe_id || safeId,
                sync.reference_id,
                safeName
              )
            );
          } catch (err) {
            setError(
              `اتسجّلت السلفة محلياً — ${
                err instanceof Error ? err.message : "فشلت مزامنة الخزنة"
              }`
            );
          }
        }
      } else {
        registerBonus({
          employeeId,
          amount,
          date,
          note: note.trim() || undefined,
          projectId: projectId || undefined,
        });
      }
      setAmount(0);
      setNote("");
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : kind === "advance"
            ? "تعذر تسجيل السلفة"
            : "تعذر تسجيل المكافأة"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
    >
      <div className="grid grid-cols-2 gap-2">
        {(["advance", "bonus"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setKind(id)}
            className={`rounded-2xl px-3 py-2.5 text-sm font-bold transition-all active:scale-[0.98] ${
              kind === id
                ? id === "advance"
                  ? "bg-[#b5543f] text-white"
                  : "bg-[#2F9B7A] text-white"
                : "border border-border bg-background text-foreground"
            }`}
          >
            {LEDGER_VISUAL[id].label}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">المبلغ</span>
        <NumericInput value={amount} onChange={setAmount} min={0} className={FIELD} />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">التاريخ</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={FIELD}
        />
      </label>

      {kind === "bonus" ? (
        <label className="flex flex-col gap-1.5 text-right">
          <span className="text-sm font-medium">شغلانة (اختياري)</span>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className={FIELD}
          >
            <option value="">غير مربوطة بشغلانة</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
                {project.workflow !== "quote"
                  ? ` · ${WORKFLOW_LABELS[project.workflow]}`
                  : ""}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <StoreSafePicker
          value={safeId}
          preferredSafeId={safeId}
          onChange={(id, safe) => {
            setSafeId(id);
            setSafeName(safe?.name ?? "");
          }}
          label="خزنة الصرف"
          variant="choices"
        />
      )}

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">ملاحظة</span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={FIELD}
        />
      </label>

      {error ? <p className="text-sm font-medium text-[#b5543f]">{error}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className={`flex h-11 items-center justify-center rounded-2xl text-sm font-semibold text-white disabled:opacity-50 ${
          kind === "advance" ? "bg-[#b5543f]" : "bg-[#2F9B7A]"
        }`}
      >
        {saving ? "جاري الحفظ…" : visual.verb}
      </button>
      <p className="text-[11px] text-muted">
        {kind === "advance"
          ? "السلفة مصروف أجور وتتخصم من الراتب عند الصرف، ومع الربط تتسحب من الخزنة فوراً."
          : "المكافأة بتدخل الرصيد ومش بتسحب من الخزنة غير لما تصرف الراتب."}
      </p>
    </form>
  );
}

/** قائمة السلف والمكافآت مع بعض — مرتبة بالتاريخ ومُلوّنة حسب النوع. */
export function LedgerList({
  advances,
  bonuses,
  projects,
  onChanged,
}: {
  advances: Advance[];
  bonuses: Bonus[];
  projects: Project[];
  onChanged: () => void;
}) {
  const [filterOpen, setFilterOpen] = useState(true);
  const [error, setError] = useState("");

  const projectById = useMemo(() => {
    const map = new Map<string, Project>();
    for (const row of projects) map.set(row.id, row);
    return map;
  }, [projects]);

  const entries = useMemo<LedgerEntry[]>(() => {
    const rows: LedgerEntry[] = [
      ...advances.map((row) => ({
        kind: "advance" as const,
        id: row.id,
        date: row.date,
        amount: row.amount,
        open: advanceOpenAmount(row),
        settledAmount: row.settledAmount ?? 0,
        note: row.note,
      })),
      ...bonuses.map((row) => ({
        kind: "bonus" as const,
        id: row.id,
        date: row.date,
        amount: row.amount,
        open: bonusOpenAmount(row),
        settledAmount: row.settledAmount ?? 0,
        note: row.note,
        projectId: row.projectId,
      })),
    ];
    return rows
      .filter((row) => (filterOpen ? row.open > 0.004 : true))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [advances, bonuses, filterOpen]);

  const openTotal = useMemo(
    () =>
      advances.reduce((sum, row) => sum + advanceOpenAmount(row), 0) +
      bonuses.reduce((sum, row) => sum + bonusOpenAmount(row), 0),
    [advances, bonuses]
  );

  async function handleDelete(entry: LedgerEntry) {
    const label = LEDGER_VISUAL[entry.kind].label;
    if (!window.confirm(`حذف ال${label}؟`)) return;
    setError("");
    try {
      if (entry.kind === "advance") {
        const advance = advances.find((row) => row.id === entry.id);
        const cfg = loadStoreBridgeConfig();
        if (advance?.expenseId && advance.storeBridge && isStoreBridgeActive(cfg) && cfg) {
          try {
            await syncMoneyToStore(
              {
                kind: "expense",
                externalKey: advance.expenseId,
                amount: 0,
                description: "ورشة · إلغاء سلفة",
                safeId: advance.storeBridge.safeId || cfg.safeId,
              },
              cfg
            );
          } catch (err) {
            setError(
              err instanceof Error
                ? `فشل إلغاء السلفة في الخزنة: ${err.message}`
                : "فشل إلغاء السلفة في الخزنة"
            );
            return;
          }
        }
        deleteAdvance(entry.id);
      } else {
        deleteBonus(entry.id);
      }
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : `تعذر حذف ال${label}`);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-sm font-bold">
          سلف ومكافآت مفتوحة {formatCurrency(openTotal)} ج.م
        </p>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={filterOpen}
            onChange={(e) => setFilterOpen(e.target.checked)}
          />
          المفتوحة فقط
        </label>
      </div>

      {error ? <p className="px-1 text-sm font-medium text-[#b5543f]">{error}</p> : null}

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted">
          مفيش سلف أو مكافآت
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => {
            const visual = LEDGER_VISUAL[entry.kind];
            const projectName = entry.projectId
              ? projectById.get(entry.projectId)?.name
              : undefined;
            const canDelete = entry.open > 0.004 && entry.settledAmount < 0.004;
            return (
              <li
                key={`${entry.kind}-${entry.id}`}
                className="rounded-2xl border border-border bg-card px-3.5 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span
                      className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold ${visual.soft} ${visual.text}`}
                    >
                      {visual.label}
                    </span>
                    <p className="mt-1 text-xs text-muted">
                      {formatDate(entry.date)}
                      {entry.note ? ` · ${entry.note}` : ""}
                      {projectName ? ` · ${projectName}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className={`text-sm font-bold tabular-nums ${visual.text}`}>
                      {formatCurrency(entry.open)} ج.م
                    </p>
                    {entry.open < entry.amount - 0.004 ? (
                      <p className="text-[11px] text-muted">
                        من أصل {formatCurrency(entry.amount)}
                      </p>
                    ) : null}
                  </div>
                </div>
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => void handleDelete(entry)}
                    className="mt-2 text-[11px] font-semibold text-muted hover:text-[#b5543f]"
                  >
                    حذف
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
