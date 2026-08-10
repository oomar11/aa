"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  deleteExpense,
  todayIsoDate,
  upsertExpense,
  type Expense,
} from "@/lib/accounting";
import { listProjectExpenses, projectExpenseTotal } from "@/lib/project-money";
import { getProjectById } from "@/lib/projects";
import {
  hasStoreBridgeCredentials,
  isStoreBridgeActive,
  loadStoreBridgeConfig,
  syncMoneyToStore,
  withStoreBridgeMeta,
} from "@/lib/store-bridge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { NumericInput } from "@/components/ui/NumericInput";
import { ProjectStoreIssue } from "@/components/design/ProjectStoreIssue";
import { StoreSafePicker } from "@/components/accounting/StoreSafePicker";

/** التصنيفات الأكثر استخداماً لمصروف المشروع */
const PROJECT_CATEGORIES = ["خامات", "أجور", "نقل", "صيانة", "مصروفات عامة"] as const;

type Props = {
  customerId: string;
  projectId: string;
  /** فتح مصروف محدد للتعديل عند الدخول */
  editExpenseId?: string | null;
};

/**
 * مصروفات المشروع من داخل المشروع فقط:
 * إجمالي → تسجيل/تعديل → سجل قابل للضغط للتعديل.
 */
export function ProjectExpenses({
  customerId,
  projectId,
  editExpenseId = null,
}: Props) {
  const project = getProjectById(projectId);
  const formRef = useRef<HTMLElement>(null);

  const [expenses, setExpenses] = useState<Expense[]>(() =>
    typeof window === "undefined" ? [] : listProjectExpenses(projectId)
  );
  const [total, setTotal] = useState(() =>
    typeof window === "undefined" ? 0 : projectExpenseTotal(projectId)
  );
  const [justSavedId, setJustSavedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string>("");

  const [category, setCategory] = useState<string>(PROJECT_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayIsoDate());
  const [note, setNote] = useState("");
  const [showExtra, setShowExtra] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [storeIssueOpen, setStoreIssueOpen] = useState(false);
  const [bridgeOk, setBridgeOk] = useState(false);
  const [safeId, setSafeId] = useState("");

  const isEditing = editingId !== null;

  useEffect(() => {
    function refreshBridge() {
      const cfg = loadStoreBridgeConfig();
      setBridgeOk(hasStoreBridgeCredentials(cfg));
      if (!safeId) setSafeId(cfg?.safeId || "");
    }
    refreshBridge();
    window.addEventListener("upvc-store-bridge-updated", refreshBridge);
    return () =>
      window.removeEventListener("upvc-store-bridge-updated", refreshBridge);
  }, [safeId]);

  useEffect(() => {
    function refresh() {
      setExpenses(listProjectExpenses(projectId));
      setTotal(projectExpenseTotal(projectId));
    }
    refresh();
    window.addEventListener("upvc-accounting-updated", refresh);
    return () => window.removeEventListener("upvc-accounting-updated", refresh);
  }, [projectId]);

  useEffect(() => {
    if (!justSavedId) return;
    const t = window.setTimeout(() => setJustSavedId(null), 1600);
    return () => window.clearTimeout(t);
  }, [justSavedId]);

  function resetForm() {
    setEditingId(null);
    setCreatedAt("");
    setDescription("");
    setAmount(0);
    setNote("");
    setDate(todayIsoDate());
    setCategory(PROJECT_CATEGORIES[0]);
    setShowExtra(false);
    setError("");
  }

  function startEdit(expense: Expense) {
    setStoreIssueOpen(false);
    setEditingId(expense.id);
    setCreatedAt(expense.createdAt);
    setAmount(expense.amount);
    setDescription(expense.description);
    setCategory(expense.category);
    setDate(expense.date);
    setNote(expense.note ?? "");
    setSafeId(expense.storeBridge?.safeId || safeId);
    setShowExtra(Boolean(expense.note) || expense.date !== todayIsoDate());
    setError("");
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  useEffect(() => {
    if (!editExpenseId) return;
    const target = listProjectExpenses(projectId).find(
      (e) => e.id === editExpenseId
    );
    if (target) startEdit(target);
  }, [editExpenseId, projectId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!project) {
      setError("المشروع غير موجود");
      return;
    }
    if (amount <= 0) {
      setError("أدخل المبلغ");
      return;
    }
    if (!description.trim()) {
      setError("أدخل وصف المصروف");
      return;
    }

    setSaving(true);
    setError("");
    const id = editingId ?? `exp-${Date.now()}`;
    const existing = editingId
      ? expenses.find((exp) => exp.id === editingId)
      : undefined;
    // Preserve store invoice linkage; never wipe on edit
    const preservedInvoiceId = existing?.storeInvoiceId;
    const preservedInvoiceNumber = existing?.storeInvoiceNumber;
    const skipSafeSync = Boolean(preservedInvoiceId);

    const base: Expense = {
      id,
      category,
      description: description.trim(),
      amount,
      date,
      projectId,
      note: note.trim() || undefined,
      createdAt: createdAt || new Date().toISOString(),
      storeBridge: existing?.storeBridge,
      storeInvoiceId: preservedInvoiceId,
      storeInvoiceNumber: preservedInvoiceNumber,
    };
    upsertExpense(base);

    const cfg = loadStoreBridgeConfig();
    if (!skipSafeSync && isStoreBridgeActive(cfg) && cfg) {
      const chosenSafeId = (
        safeId ||
        existing?.storeBridge?.safeId ||
        cfg.safeId ||
        ""
      ).trim();
      if (!chosenSafeId) {
        setError("اختر خزنة المتجر");
        setSaving(false);
        return;
      }
      try {
        const sync = await syncMoneyToStore(
          {
            kind: "expense",
            externalKey: id,
            amount,
            description: [
              "ورشة · مصروف مشروع",
              category,
              description.trim(),
              project.name,
            ]
              .filter(Boolean)
              .join(" · "),
            notes: note.trim() || undefined,
            occurredAt: date ? `${date}T12:00:00.000Z` : undefined,
            safeId: chosenSafeId,
          },
          cfg
        );
        upsertExpense({
          ...base,
          storeBridge: withStoreBridgeMeta(
            amount,
            sync.safe_id || chosenSafeId,
            sync.reference_id
          ),
        });
      } catch (err) {
        setError(
          `تم الحفظ محلياً — ${
            err instanceof Error ? err.message : "فشلت مزامنة خزنة المتجر"
          }`
        );
        setJustSavedId(id);
        setSaving(false);
        setExpenses(listProjectExpenses(projectId));
        setTotal(projectExpenseTotal(projectId));
        return;
      }
    }

    resetForm();
    setJustSavedId(id);
    setSaving(false);
    setExpenses(listProjectExpenses(projectId));
    setTotal(projectExpenseTotal(projectId));
  }

  async function handleDeleteExpense(expenseId: string) {
    if (!window.confirm("حذف هذا المصروف؟")) return;
    const target = expenses.find((exp) => exp.id === expenseId);
    const cfg = loadStoreBridgeConfig();
    if (
      target?.storeBridge &&
      !target.storeInvoiceId &&
      isStoreBridgeActive(cfg) &&
      cfg
    ) {
      try {
        await syncMoneyToStore(
          {
            kind: "expense",
            externalKey: expenseId,
            amount: 0,
            description: "ورشة · حذف مصروف",
            safeId: target.storeBridge.safeId || cfg.safeId,
          },
          cfg
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? `فشل إلغاء المصروف في خزنة المتجر: ${err.message}`
            : "فشل إلغاء المصروف في خزنة المتجر"
        );
        return;
      }
    }
    deleteExpense(expenseId);
    resetForm();
    setExpenses(listProjectExpenses(projectId));
    setTotal(projectExpenseTotal(projectId));
  }

  if (!project || project.customerId !== customerId) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
        المشروع غير موجود
      </p>
    );
  }

  const fieldClass =
    "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-[#E8956F] focus:ring-2 focus:ring-[#E8956F]/20";

  return (
    <div className="flex flex-col gap-5">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#C45C26] to-[#E8956F] px-4 py-5 text-white shadow-[0_8px_24px_rgba(196,92,38,0.28)]">
        <p className="text-xs font-medium opacity-90">إجمالي مصروف المشروع</p>
        <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
          {formatCurrency(total)}
          <span className="mr-1.5 text-sm font-semibold opacity-85">ج.م</span>
        </p>
        <p className="mt-2 truncate text-xs opacity-85">
          {project.name}
          {expenses.length > 0 ? ` · ${expenses.length} قيد` : ""}
        </p>
      </section>

      <section ref={formRef} className="flex flex-col gap-3 scroll-mt-4">
        {!storeIssueOpen && bridgeOk && !isEditing ? (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setStoreIssueOpen(true);
              setError("");
            }}
            className="rounded-2xl border border-[#E8956F]/40 bg-[#E8956F]/10 px-4 py-3 text-sm font-bold text-[#C45C26] transition-transform active:scale-[0.98]"
          >
            صرف من المحل
            <span className="mt-0.5 block text-[11px] font-medium text-[#C45C26]/80">
              اختر صنف · عدّل السعر أو الخصم · يتسجّل كمصروف
            </span>
          </button>
        ) : null}

        {storeIssueOpen ? (
          <div className="rounded-2xl border border-[#E8956F] bg-card p-4">
            <ProjectStoreIssue
              projectId={projectId}
              projectName={project.name}
              onCancel={() => setStoreIssueOpen(false)}
              onDone={(expenseId) => {
                setStoreIssueOpen(false);
                setJustSavedId(expenseId);
              }}
            />
          </div>
        ) : null}

        {!storeIssueOpen ? (
          <>
        <div className="flex items-center justify-between gap-2 px-0.5">
          <h2 className="text-sm font-bold text-foreground">
            {isEditing ? "تعديل المصروف" : "تسجيل مصروف جديد"}
          </h2>
          {isEditing ? (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-semibold text-muted"
            >
              إلغاء التعديل
            </button>
          ) : null}
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className={`flex flex-col gap-3.5 rounded-2xl border bg-card p-4 transition-colors ${
            isEditing ? "border-[#E8956F]" : "border-border"
          }`}
        >
          <label className="flex flex-col gap-1.5 text-right">
            <span className="text-xs font-medium text-muted">المبلغ (ج.م)</span>
            <NumericInput
              value={amount}
              onChange={(value) => {
                setAmount(value);
                setError("");
              }}
              min={0}
              blankZero
              autoFocus={!isEditing}
              className={`${fieldClass} text-left text-xl font-bold tabular-nums`}
              dir="ltr"
              inputMode="decimal"
            />
          </label>

          {bridgeOk &&
          !(
            isEditing &&
            expenses.find((e) => e.id === editingId)?.storeInvoiceId
          ) ? (
            <StoreSafePicker
              value={safeId}
              preferredSafeId={
                expenses.find((e) => e.id === editingId)?.storeBridge?.safeId
              }
              onChange={(id) => setSafeId(id)}
            />
          ) : null}

          <label className="flex flex-col gap-1.5 text-right">
            <span className="text-xs font-medium text-muted">الوصف</span>
            <input
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setError("");
              }}
              placeholder="مثال: زجاج / نقل / أجرة فني"
              className={fieldClass}
            />
          </label>

          <div className="flex flex-col gap-1.5 text-right">
            <span className="text-xs font-medium text-muted">التصنيف</span>
            <div className="flex flex-wrap gap-2">
              {PROJECT_CATEGORIES.map((item) => {
                const active = category === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                      active
                        ? "bg-[#E8956F] text-white"
                        : "border border-border bg-background text-foreground"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
              {!PROJECT_CATEGORIES.includes(
                category as (typeof PROJECT_CATEGORIES)[number]
              ) ? (
                <span className="rounded-xl bg-[#E8956F]/15 px-3 py-1.5 text-xs font-semibold text-[#C45C26]">
                  {category}
                </span>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowExtra((v) => !v)}
            className="self-start text-xs font-semibold text-[#C45C26]"
          >
            {showExtra ? "إخفاء التاريخ والملاحظة" : "تاريخ وملاحظة…"}
          </button>

          {showExtra ? (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-right">
                <span className="text-xs font-medium text-muted">التاريخ</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`${fieldClass} text-left`}
                  dir="ltr"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-right">
                <span className="text-xs font-medium text-muted">ملاحظة</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="اختياري"
                  className={`${fieldClass} resize-none`}
                />
              </label>
            </div>
          ) : null}

          {error ? (
            <p className="text-sm font-medium text-[#E85A8A]">{error}</p>
          ) : null}

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#C45C26] text-sm font-bold text-white transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
            >
              {saving
                ? "جاري الحفظ…"
                : isEditing
                  ? "حفظ التعديل"
                  : "إضافة إلى السجل"}
            </button>
            {isEditing ? (
              <button
                type="button"
                onClick={() => {
                  if (!editingId) return;
                  void handleDeleteExpense(editingId);
                }}
                className="flex h-11 w-full items-center justify-center rounded-2xl border border-[#E85A8A]/35 text-sm font-semibold text-[#E85A8A]"
              >
                حذف المصروف
              </button>
            ) : null}
          </div>
        </form>
          </>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2 px-0.5">
          <h2 className="text-sm font-bold text-foreground">سجل المصروفات</h2>
          <span className="text-xs text-muted">
            {expenses.length > 0 ? "اضغط للتعديل" : "0"}
          </span>
        </div>

        {expenses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm leading-relaxed text-muted">
            لا توجد مصروفات بعد.
            <br />
            سجّل أول مصروف أعلاه.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {expenses.map((expense) => {
              const highlight = expense.id === justSavedId;
              const selected = expense.id === editingId;
              return (
                <li key={expense.id}>
                  <button
                    type="button"
                    onClick={() => startEdit(expense)}
                    className={`w-full rounded-2xl border bg-card p-3.5 text-right transition-all duration-300 active:scale-[0.99] ${
                      selected
                        ? "border-[#E8956F] bg-[#E8956F]/10 shadow-[0_0_0_3px_rgba(232,149,111,0.2)]"
                        : highlight
                          ? "border-[#E8956F] shadow-[0_0_0_3px_rgba(232,149,111,0.25)]"
                          : "border-border hover:border-[#E8956F]/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">
                          {expense.description}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-lg bg-[#E8956F]/15 px-2 py-0.5 text-[10px] font-semibold text-[#C45C26]">
                            {expense.category}
                          </span>
                          <span className="text-[11px] text-muted">
                            {formatDate(expense.date)}
                          </span>
                          {selected ? (
                            <span className="text-[10px] font-semibold text-[#C45C26]">
                              قيد التعديل
                            </span>
                          ) : null}
                        </div>
                        {expense.note ? (
                          <p className="mt-1.5 text-xs text-muted">
                            {expense.note}
                          </p>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-base font-bold tabular-nums text-[#C45C26]">
                        {formatCurrency(expense.amount)}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
