"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, useSyncExternalStore } from "react";
import { ContactPickerButton } from "@/components/customers/ContactPickerButton";
import { NumericInput } from "@/components/ui/NumericInput";
import { pickContactFromDevice } from "@/lib/contact-picker";
import {
  deleteEmployee,
  EMPLOYEE_ROLES,
  EMPLOYEE_STATUS_LABELS,
  getEmployeeById,
  PAY_TYPE_LABELS,
  upsertEmployee,
  type Employee,
  type EmployeeStatus,
  type PayType,
} from "@/lib/hr";
import { todayIsoDate } from "@/lib/accounting";
import { ROUTES } from "@/lib/routes";

const FIELD =
  "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function EmployeeForm() {
  const isClient = useIsClient();
  const searchParams = useSearchParams();
  const employeeId = searchParams.get("employee") ?? "";

  if (!isClient) {
    return (
      <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted">
        جاري التحميل…
      </div>
    );
  }

  const existing = employeeId ? getEmployeeById(employeeId) ?? null : null;
  if (employeeId && !existing) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
        الموظف غير موجود
      </p>
    );
  }

  return (
    <EmployeeFormFields
      key={existing?.id || "new"}
      existing={existing}
    />
  );
}

function EmployeeFormFields({ existing }: { existing: Employee | null }) {
  const router = useRouter();
  const [name, setName] = useState(existing?.name ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [role, setRole] = useState(existing?.role ?? EMPLOYEE_ROLES[0]);
  const [payType, setPayType] = useState<PayType>(existing?.payType ?? "daily");
  const [wage, setWage] = useState(existing?.wage ?? 0);
  const [hiredAt, setHiredAt] = useState(existing?.hiredAt ?? todayIsoDate());
  const [status, setStatus] = useState<EmployeeStatus>(
    existing?.status ?? "active"
  );
  const [note, setNote] = useState(existing?.note ?? "");
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handlePickContact() {
    setError("");
    setPicking(true);
    try {
      const result = await pickContactFromDevice();
      if (!result.ok) {
        if (result.reason !== "cancelled") setError(result.message);
        return;
      }
      setName(result.contact.name);
      if (result.contact.phone) setPhone(result.contact.phone);
    } finally {
      setPicking(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("أدخل اسم الموظف");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const employee: Employee = {
        id: existing?.id || `emp-${Date.now()}`,
        name: trimmed,
        phone: phone.trim() || undefined,
        role,
        payType,
        wage: Math.max(0, wage),
        hiredAt,
        status,
        note: note.trim() || undefined,
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
      upsertEmployee(employee);
      router.replace(ROUTES.hr.employees);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ الموظف");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!existing) return;
    if (!window.confirm(`حذف «${existing.name}»؟`)) return;
    try {
      deleteEmployee(existing.id);
      router.replace(ROUTES.hr.employees);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حذف الموظف");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <ContactPickerButton
        label="إضافة من جهات الاتصال"
        picking={picking}
        onPick={() => void handlePickContact()}
      />

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">
          الاسم <span className="text-[#E85A8A]">*</span>
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          placeholder="اسم الموظف"
          className={FIELD}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">رقم الهاتف</span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="01xxxxxxxxx"
          dir="ltr"
          className={`${FIELD} text-left`}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">الوظيفة</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={FIELD}
        >
          {EMPLOYEE_ROLES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">نوع الأجر</span>
        <div className="grid grid-cols-2 gap-2">
          {(["daily", "monthly"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setPayType(id)}
              className={`rounded-2xl px-3 py-2.5 text-sm font-bold transition-all active:scale-[0.98] ${
                payType === id
                  ? "bg-primary text-white"
                  : "border border-border bg-card text-foreground"
              }`}
            >
              {PAY_TYPE_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">
          {payType === "daily" ? "اليومية (ج.م)" : "الراتب الشهري (ج.م)"}
        </span>
        <NumericInput
          value={wage}
          onChange={setWage}
          min={0}
          className={FIELD}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">تاريخ التعيين</span>
        <input
          type="date"
          value={hiredAt}
          onChange={(e) => setHiredAt(e.target.value)}
          className={FIELD}
        />
      </label>

      {existing ? (
        <div className="flex flex-col gap-1.5 text-right">
          <span className="text-sm font-medium">الحالة</span>
          <div className="grid grid-cols-2 gap-2">
            {(["active", "left"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setStatus(id)}
                className={`rounded-2xl px-3 py-2.5 text-sm font-bold transition-all active:scale-[0.98] ${
                  status === id
                    ? "bg-primary text-white"
                    : "border border-border bg-card text-foreground"
                }`}
              >
                {EMPLOYEE_STATUS_LABELS[id]}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">ملاحظة</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className={`${FIELD} resize-none`}
        />
      </label>

      {error ? (
        <p className="text-sm font-medium text-[#E85A8A]">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="mt-2 flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-white transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
      >
        {saving ? "جاري الحفظ..." : existing ? "حفظ التعديل" : "حفظ الموظف"}
      </button>

      {existing ? (
        <button
          type="button"
          onClick={handleDelete}
          className="flex h-12 w-full items-center justify-center rounded-2xl border border-[#E85A8A]/40 bg-card text-sm font-semibold text-[#E85A8A]"
        >
          حذف الموظف
        </button>
      ) : null}
    </form>
  );
}
