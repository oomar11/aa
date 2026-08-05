"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  EXPENSE_CATEGORIES,
  todayIsoDate,
  upsertExpense,
} from "@/lib/accounting";
import { mergeCustomers, type Customer } from "@/lib/customers";
import { listAllProjects, type Project } from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import {
  isStoreBridgeActive,
  loadStoreBridgeConfig,
  syncMoneyToStore,
  withStoreBridgeMeta,
} from "@/lib/store-bridge";
import { smartSearchMatch } from "@/lib/utils";
import { WORKFLOW_LABELS } from "@/lib/workshop";
import { NumericInput } from "@/components/ui/NumericInput";

/**
 * تسجيل مصروف ورشة من الحسابات.
 * مع ربط المتجر: يُسحب من خزنة المتجر (مصدر الحقيقة).
 */
export function ExpenseForm() {
  const router = useRouter();

  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayIsoDate);
  const [note, setNote] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projectQuery, setProjectQuery] = useState("");
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [bridgeOn, setBridgeOn] = useState(false);
  const [bridgeSafeName, setBridgeSafeName] = useState("");

  useEffect(() => {
    const cfg = loadStoreBridgeConfig();
    setBridgeOn(isStoreBridgeActive(cfg));
    setBridgeSafeName(cfg?.safeName || "");
  }, []);

  const customers = useMemo(() => mergeCustomers(), []);
  const customerById = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const c of customers) map.set(c.id, c);
    return map;
  }, [customers]);

  const projects = useMemo(() => {
    return listAllProjects().sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const customer = customerById.get(p.customerId);
      return smartSearchMatch(projectQuery, [
        p.name,
        p.location,
        customer?.name,
        customer?.phone,
        WORKFLOW_LABELS[p.workflow],
      ]);
    });
  }, [projects, projectQuery, customerById]);

  const selectedProject = projectId
    ? projects.find((p) => p.id === projectId)
    : undefined;

  function clearProject() {
    setProjectId("");
    setProjectQuery("");
    setShowProjectPicker(false);
  }

  function pickProject(project: Project) {
    setProjectId(project.id);
    setProjectQuery("");
    setShowProjectPicker(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (amount <= 0) {
      setError("أدخل المبلغ");
      return;
    }
    if (!description.trim()) {
      setError("أدخل وصف المصروف");
      return;
    }

    const id = `exp-${Date.now()}`;
    const cfg = loadStoreBridgeConfig();
    const bridgeActive = isStoreBridgeActive(cfg);

    setSaving(true);
    setError("");
    try {
      let storeBridge = undefined as
        | ReturnType<typeof withStoreBridgeMeta>
        | undefined;
      if (bridgeActive && cfg) {
        const sync = await syncMoneyToStore(
          {
            kind: "expense",
            externalKey: id,
            amount,
            description: [
              "ورشة · مصروف",
              category,
              description.trim(),
              selectedProject?.name,
            ]
              .filter(Boolean)
              .join(" · "),
            notes: note.trim() || undefined,
            occurredAt: date ? `${date}T12:00:00.000Z` : undefined,
            safeId: cfg.safeId,
          },
          cfg
        );
        storeBridge = withStoreBridgeMeta(
          amount,
          sync.safe_id || cfg.safeId,
          sync.reference_id
        );
      }

      upsertExpense({
        id,
        category,
        description: description.trim(),
        amount,
        date,
        projectId: projectId || undefined,
        note: note.trim() || undefined,
        createdAt: new Date().toISOString(),
        storeBridge,
      });
      router.replace(ROUTES.accounting.expenses);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر حفظ المصروف أو مزامنة خزنة المتجر"
      );
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-[#E8956F] focus:ring-2 focus:ring-[#E8956F]/20";

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex w-full flex-col gap-4"
    >
      <p className="rounded-2xl border border-[#E8956F]/30 bg-[#E8956F]/10 px-3.5 py-3 text-xs leading-relaxed text-foreground">
        سجّل مصروف ورشة عام، أو اربطه بمشروع لو عايز يتظهر في حساب المشروع.
        {bridgeOn
          ? ` · يُسحب من خزنة المتجر${bridgeSafeName ? ` (${bridgeSafeName})` : ""}.`
          : " · خزنة المتجر غير مربوطة (إعدادات)."}
      </p>

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
          autoFocus
          className={`${fieldClass} text-left text-xl font-bold tabular-nums`}
          dir="ltr"
          inputMode="decimal"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-xs font-medium text-muted">الوصف</span>
        <input
          type="text"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setError("");
          }}
          placeholder="مثال: كهرباء / أجرة فني / نقل"
          className={fieldClass}
        />
      </label>

      <div className="flex flex-col gap-1.5 text-right">
        <span className="text-xs font-medium text-muted">التصنيف</span>
        <div className="flex flex-wrap gap-2">
          {EXPENSE_CATEGORIES.map((item) => {
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
        </div>
      </div>

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
        <span className="text-xs font-medium text-muted">ملاحظة (اختياري)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="اختياري"
          className={`${fieldClass} resize-none`}
        />
      </label>

      <div className="flex flex-col gap-2 text-right">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted">
            ربط بمشروع (اختياري)
          </span>
          {selectedProject ? (
            <button
              type="button"
              onClick={clearProject}
              className="text-xs font-semibold text-[#E85A8A]"
            >
              إزالة الربط
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowProjectPicker((v) => !v)}
              className="text-xs font-semibold text-[#C45C26]"
            >
              {showProjectPicker ? "إخفاء" : "اختيار مشروع…"}
            </button>
          )}
        </div>

        {selectedProject ? (
          <div className="rounded-2xl border border-[#E8956F]/40 bg-[#E8956F]/10 px-3.5 py-3">
            <p className="text-sm font-bold text-foreground">
              {selectedProject.name}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {customerById.get(selectedProject.customerId)?.name ?? "عميل"}
              {" · "}
              {WORKFLOW_LABELS[selectedProject.workflow]}
            </p>
          </div>
        ) : showProjectPicker ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
            <input
              type="search"
              value={projectQuery}
              onChange={(e) => setProjectQuery(e.target.value)}
              placeholder="بحث باسم المشروع أو العميل…"
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-[#E8956F]"
            />
            <ul className="max-h-48 overflow-y-auto">
              {filteredProjects.length === 0 ? (
                <li className="px-2 py-4 text-center text-xs text-muted">
                  مفيش نتائج
                </li>
              ) : (
                filteredProjects.slice(0, 20).map((project) => (
                  <li key={project.id}>
                    <button
                      type="button"
                      onClick={() => pickProject(project)}
                      className="flex w-full flex-col gap-0.5 rounded-xl px-2.5 py-2 text-right hover:bg-[#E8956F]/10"
                    >
                      <span className="text-sm font-semibold text-foreground">
                        {project.name}
                      </span>
                      <span className="text-[11px] text-muted">
                        {customerById.get(project.customerId)?.name ?? "عميل"}
                        {" · "}
                        {WORKFLOW_LABELS[project.workflow]}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-muted">مصروف عام للورشة — بدون مشروع</p>
        )}
      </div>

      {error ? (
        <p className="text-sm font-medium text-[#E85A8A]">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#C45C26] text-sm font-bold text-white transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
      >
        {saving ? "جاري الحفظ…" : "حفظ المصروف"}
      </button>
    </form>
  );
}
