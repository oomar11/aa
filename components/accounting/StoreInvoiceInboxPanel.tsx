"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadExpenses,
  todayIsoDate,
  upsertExpense,
} from "@/lib/accounting";
import { mergeCustomers, type Customer } from "@/lib/customers";
import type { Project } from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import {
  fetchWorkshopInvoiceInbox,
  hasStoreBridgeCredentials,
  loadStoreBridgeConfig,
  resolveWorkshopInvoice,
  type StoreInvoiceInboxItem,
} from "@/lib/store-bridge";
import { formatCurrency, smartSearchMatch } from "@/lib/utils";
import {
  listActiveJobsForStoreInvoice,
  WORKFLOW_LABELS,
} from "@/lib/workshop";

export const STORE_INBOX_UPDATED_EVENT = "upvc-store-invoice-inbox-updated";

function customerName(map: Map<string, Customer>, id: string) {
  return map.get(id)?.name ?? "عميل";
}

function invoiceAlreadyAssigned(invoiceId: string): boolean {
  return loadExpenses().some((e) => e.storeInvoiceId === invoiceId);
}

/**
 * صندوق فواتير المحل: تعيين لاحق على شغلانة نشطة بدون سحب خزنة مكرر.
 */
export function StoreInvoiceInboxPanel() {
  const [items, setItems] = useState<StoreInvoiceInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [assigningId, setAssigningId] = useState("");
  const [projectQuery, setProjectQuery] = useState("");
  const [message, setMessage] = useState("");

  const customers = useMemo(() => mergeCustomers(), []);
  const customerById = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const c of customers) map.set(c.id, c);
    return map;
  }, [customers]);

  const jobs = useMemo(() => listActiveJobsForStoreInvoice(), [items, message]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((p) => {
      const customer = customerById.get(p.customerId);
      return smartSearchMatch(projectQuery, [
        p.name,
        p.location,
        customer?.name,
        customer?.phone,
        WORKFLOW_LABELS[p.workflow],
      ]);
    });
  }, [jobs, projectQuery, customerById]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (!hasStoreBridgeCredentials()) {
        setItems([]);
        setError("اربط المتجر من الإعدادات عشان يوصل صندوق الفواتير");
        return;
      }
      const rows = await fetchWorkshopInvoiceInbox("pending");
      setItems(rows);
      window.dispatchEvent(new Event(STORE_INBOX_UPDATED_EVENT));
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل الصندوق");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function assignToProject(
    item: StoreInvoiceInboxItem,
    project: Project
  ) {
    setBusyId(item.invoice_id);
    setError("");
    setMessage("");
    try {
      if (invoiceAlreadyAssigned(item.invoice_id)) {
        await resolveWorkshopInvoice({
          invoiceId: item.invoice_id,
          action: "assign",
          projectKey: project.id,
          projectName: project.name,
        });
        setMessage("الفاتورة كانت متعيّنة قبل كده — اتشالت من الصندوق");
        setAssigningId("");
        await refresh();
        return;
      }

      const date = item.invoice_date
        ? item.invoice_date.slice(0, 10)
        : todayIsoDate();
      const lines = (item.items_summary || [])
        .slice(0, 4)
        .map((l) => l.name || "صنف")
        .filter(Boolean);
      upsertExpense({
        id: `exp-store-${item.invoice_id}`,
        category: "خامات",
        description: `فاتورة محل ${item.invoice_number}`,
        amount: Number(item.total) || 0,
        date,
        projectId: project.id,
        note: [
          lines.length ? lines.join(" · ") : undefined,
          item.notes?.trim() || undefined,
        ]
          .filter(Boolean)
          .join(" — "),
        createdAt: new Date().toISOString(),
        storeInvoiceId: item.invoice_id,
        storeInvoiceNumber: item.invoice_number,
      });

      await resolveWorkshopInvoice({
        invoiceId: item.invoice_id,
        action: "assign",
        projectKey: project.id,
        projectName: project.name,
      });

      setMessage(
        `اتسجّلت على «${project.name}» كمصروف خامات — بدون سحب من الخزنة`
      );
      setAssigningId("");
      setProjectQuery("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر التعيين");
    } finally {
      setBusyId("");
    }
  }

  async function dismissItem(item: StoreInvoiceInboxItem) {
    if (!window.confirm(`تجاهل فاتورة ${item.invoice_number}؟`)) return;
    setBusyId(item.invoice_id);
    setError("");
    try {
      await resolveWorkshopInvoice({
        invoiceId: item.invoice_id,
        action: "dismiss",
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر التجاهل");
    } finally {
      setBusyId("");
    }
  }

  const bridgeOk = hasStoreBridgeCredentials(loadStoreBridgeConfig());

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="rounded-2xl border border-primary/20 bg-primary-soft/40 px-3.5 py-3 text-xs leading-relaxed text-foreground">
        فواتير المحل المعلّمة «للورشة». عيّن كل فاتورة على شغلانة شغّالة، أو سيّبها
        وارجع لها بعدين. التعيين يسجّل مصروف مشروع — فاتورة المحل صرف داخلي بدون
        حركة خزنة.
      </p>

      {!bridgeOk ? (
        <Link
          href={ROUTES.settings}
          className="rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted"
        >
          اربط خزنة المتجر من الإعدادات أولاً
        </Link>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-foreground">
          معلّق: {items.length}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="text-xs font-semibold text-primary disabled:opacity-50"
        >
          {loading ? "…" : "تحديث"}
        </button>
      </div>

      {error ? (
        <p className="text-sm font-medium text-[#E85A8A]">{error}</p>
      ) : null}
      {message ? (
        <p className="text-sm font-medium text-[#2F9B7A]">{message}</p>
      ) : null}

      {loading && items.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted">
          جاري التحميل…
        </p>
      ) : null}

      {!loading && items.length === 0 && bridgeOk ? (
        <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
          مفيش فواتير معلّقة من المحل
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {items.map((item) => {
          const open = assigningId === item.invoice_id;
          const busy = busyId === item.invoice_id;
          return (
            <li
              key={item.invoice_id}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="flex flex-col gap-2 px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {item.invoice_number}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {item.invoice_date
                        ? new Date(item.invoice_date).toLocaleDateString("ar-EG")
                        : "—"}
                      {(item.items_summary || []).length
                        ? ` · ${(item.items_summary || []).length} صنف`
                        : ""}
                    </p>
                  </div>
                  <p className="text-sm font-bold tabular-nums text-foreground">
                    {formatCurrency(Number(item.total) || 0)}
                  </p>
                </div>
                {(item.items_summary || []).length > 0 ? (
                  <p className="text-[11px] leading-relaxed text-muted">
                    {(item.items_summary || [])
                      .slice(0, 3)
                      .map((l) => l.name)
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}

                <div className="mt-1 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setAssigningId(open ? "" : item.invoice_id);
                      setProjectQuery("");
                      setMessage("");
                    }}
                    className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {open ? "إخفاء الشغلانات" : "تعيين لشغلانة"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setAssigningId("");
                      setMessage("سيبتها معلّقة — تقدر ترجع من القائمة في أي وقت");
                    }}
                    className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-60"
                  >
                    لاحقًا
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void dismissItem(item)}
                    className="rounded-xl border border-[#E85A8A]/30 px-3 py-2 text-xs font-semibold text-[#E85A8A] disabled:opacity-60"
                  >
                    تجاهل
                  </button>
                </div>

                {open ? (
                  <div className="mt-2 flex flex-col gap-2 rounded-xl border border-border bg-background p-3">
                    <input
                      type="search"
                      value={projectQuery}
                      onChange={(e) => setProjectQuery(e.target.value)}
                      placeholder="بحث بالشغلانة أو العميل…"
                      className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                    />
                    {filteredJobs.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted">
                        مفيش شغلانات نشطة (انتظار / تنفيذ)
                      </p>
                    ) : (
                      <ul className="max-h-56 overflow-y-auto">
                        {filteredJobs.map((project) => (
                          <li key={project.id}>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void assignToProject(item, project)}
                              className="flex w-full flex-col gap-0.5 rounded-xl px-2.5 py-2 text-right hover:bg-primary-soft/50 disabled:opacity-60"
                            >
                              <span className="text-sm font-semibold text-foreground">
                                {project.name}
                              </span>
                              <span className="text-[11px] text-muted">
                                {customerName(customerById, project.customerId)}
                                {" · "}
                                {WORKFLOW_LABELS[project.workflow]}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** عدّاد سريع للبانر */
export async function countPendingStoreInvoices(): Promise<number> {
  if (!hasStoreBridgeCredentials()) return 0;
  try {
    const rows = await fetchWorkshopInvoiceInbox("pending");
    return rows.length;
  } catch {
    return 0;
  }
}
