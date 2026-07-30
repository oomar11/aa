"use client";

import { ScreenBack } from "@/components/layout/ScreenBack";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  DEFAULT_BAR_LENGTH_M,
  calcCutSizes,
  defaultIronDetails,
  defaultIronDeductions,
  findSystem,
  frameHeightFormula,
  frameWidthFormula,
  ironDeductionSummary,
  ironRoleLabel,
  loadMaterialCatalog,
  newIronPieceId,
  saveMaterialCatalog,
  sashHeightFormula,
  sashWidthFormula,
  upsertSystem,
  type IronDeductions,
  type IronPiece,
  type IronPieceRole,
  type IronSystemDetails,
  type MaterialCatalog,
  type MaterialSystem,
} from "@/lib/material-systems";
import {
  FORMULA_VAR_HELP,
  ensureEqualsPrefix,
  validateFormula,
} from "@/lib/excel-formula";

type Props = {
  systemId: string;
};

type PieceDraft = {
  id: string;
  name: string;
  role: IronPieceRole;
  sectionWidthMm: string;
  sectionHeightMm: string;
  barLengthM: string;
  enabled: boolean;
  notes: string;
};

function toPieceDraft(p?: IronPiece): PieceDraft {
  return {
    id: p?.id ?? newIronPieceId(),
    name: p?.name ?? "",
    role: p?.role ?? "frame-hinged",
    sectionWidthMm: String(p?.sectionWidthMm ?? 40),
    sectionHeightMm: String(p?.sectionHeightMm ?? 20),
    barLengthM: String(p?.barLengthM ?? DEFAULT_BAR_LENGTH_M),
    enabled: p?.enabled !== false,
    notes: p?.notes ?? "",
  };
}

function parsePiece(draft: PieceDraft): IronPiece | null {
  const name = draft.name.trim();
  if (!name) return null;
  const sectionWidthMm = Number(draft.sectionWidthMm);
  const sectionHeightMm = Number(draft.sectionHeightMm);
  const barLengthM = Number(draft.barLengthM);
  return {
    id: draft.id,
    name,
    role: draft.role,
    sectionWidthMm:
      Number.isFinite(sectionWidthMm) && sectionWidthMm >= 0
        ? sectionWidthMm
        : 40,
    sectionHeightMm:
      Number.isFinite(sectionHeightMm) && sectionHeightMm >= 0
        ? sectionHeightMm
        : 20,
    barLengthM:
      Number.isFinite(barLengthM) && barLengthM > 0
        ? barLengthM
        : DEFAULT_BAR_LENGTH_M,
    enabled: draft.enabled,
    notes: draft.notes.trim() || undefined,
  };
}

export function IronSystemDetailEditor({ systemId }: Props) {
  const [catalog, setCatalog] = useState<MaterialCatalog | null>(null);
  const [system, setSystem] = useState<MaterialSystem | null>(null);
  const [systemName, setSystemName] = useState("");
  const [systemNotes, setSystemNotes] = useState("");
  const [pieces, setPieces] = useState<IronPiece[]>([]);
  const [deductions, setDeductions] =
    useState<IronDeductions>(defaultIronDeductions);
  const [pieceDraft, setPieceDraft] = useState<PieceDraft | null>(null);
  const [previewW, setPreviewW] = useState("1200");
  const [previewH, setPreviewH] = useState("1400");
  const [flash, setFlash] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  const showFlash = useCallback((msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 1800);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      const cat = loadMaterialCatalog();
      setCatalog(cat);
      const found = findSystem("iron", systemId, cat);
      if (!found) {
        setMissing(true);
        return;
      }
      const details = found.iron ?? defaultIronDetails();
      setSystem(found);
      setSystemName(found.name);
      setSystemNotes(found.notes ?? "");
      setPieces(details.pieces);
      setDeductions(details.deductions);
    });
  }, [systemId]);

  function persistIron(
    nextPieces: IronPiece[],
    nextDeductions: IronDeductions,
    name = systemName,
    notes = systemNotes
  ) {
    if (!catalog || !system) return;
    const iron: IronSystemDetails = {
      pieces: nextPieces,
      deductions: nextDeductions,
    };
    const nextSystem: MaterialSystem = {
      ...system,
      name: name.trim() || system.name,
      notes: notes.trim() || undefined,
      iron,
    };
    const saved = saveMaterialCatalog(
      upsertSystem(catalog, "iron", nextSystem)
    );
    setCatalog(saved);
    const refreshed = findSystem("iron", systemId, saved);
    if (refreshed) {
      setSystem(refreshed);
      const details = refreshed.iron ?? defaultIronDetails();
      setPieces(details.pieces);
      setDeductions(details.deductions);
    }
  }

  function saveMeta(e: FormEvent) {
    e.preventDefault();
    persistIron(pieces, deductions);
    showFlash("تم حفظ بيانات النظام");
  }

  function saveDeductions(e: FormEvent) {
    e.preventDefault();
    const normalized: IronDeductions = {
      frame: {
        width: ensureEqualsPrefix(deductions.frame.width),
        height: ensureEqualsPrefix(deductions.frame.height),
      },
      sash: {
        width: ensureEqualsPrefix(deductions.sash.width),
        height: ensureEqualsPrefix(deductions.sash.height),
      },
      mullion: ensureEqualsPrefix(deductions.mullion),
    };
    setDeductions(normalized);
    persistIron(pieces, normalized);
    showFlash("تم حفظ معادلات التخصيم");
  }

  function togglePieceEnabled(id: string) {
    const next = pieces.map((p) =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    setPieces(next);
    persistIron(next, deductions);
    showFlash("تم الحفظ");
  }

  function openEditPiece(piece: IronPiece) {
    setPieceDraft(toPieceDraft(piece));
  }

  function openNewPiece() {
    setPieceDraft(toPieceDraft());
  }

  function savePiece(e: FormEvent) {
    e.preventDefault();
    if (!pieceDraft) return;
    const parsed = parsePiece(pieceDraft);
    if (!parsed) return;
    const exists = pieces.some((p) => p.id === parsed.id);
    const next = exists
      ? pieces.map((p) => (p.id === parsed.id ? parsed : p))
      : [...pieces, parsed];
    setPieces(next);
    persistIron(next, deductions);
    setPieceDraft(null);
    showFlash(exists ? "تم تعديل العود" : "تمت إضافة العود");
  }

  function deletePiece(id: string) {
    if (!window.confirm("حذف هذا العود؟")) return;
    const next = pieces.filter((p) => p.id !== id);
    setPieces(next);
    persistIron(next, deductions);
    if (pieceDraft?.id === id) setPieceDraft(null);
    showFlash("تم الحذف");
  }

  if (missing) {
    return (
      <div className="space-y-3">
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted">
          النظام مش موجود
        </p>
        <ScreenBack href="/materials/iron">رجوع للحديد</ScreenBack>
      </div>
    );
  }

  if (!system) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted">
        جاري التحميل…
      </div>
    );
  }

  const previewCuts = calcCutSizes(
    Math.max(0, Number(previewW) || 0),
    Math.max(0, Number(previewH) || 0),
    {
      frame: { width: "=W", height: "=H" },
      sash: { width: "=FW-10", height: "=FH-10" },
    }
  );

  const previewIronFrameW = (() => {
    const f = validateFormula(ensureEqualsPrefix(deductions.frame.width));
    if (!f.ok) return 0;
    return previewCuts.frameWidthMm - 100;
  })();

  return (
    <div className="flex flex-col gap-3">
      <div className="px-1">
        <h2 className="text-lg font-bold text-foreground">{system.name}</h2>
        <p className="mt-0.5 text-xs text-muted">
          أنواع الحديد للحلق · الضلفة · السوقاس — مفصلي وجرار
        </p>
      </div>

      {flash ? (
        <p
          className="rounded-xl border border-primary/30 bg-primary-soft px-3 py-2 text-center text-xs font-semibold text-primary"
          role="status"
        >
          {flash}
        </p>
      ) : null}

      <p className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs leading-relaxed text-muted">
        الحديد بيكون أصغر من القطاع حسب المعادلات (افتراضي{" "}
        <span className="font-mono text-foreground">−١٠٠ مم</span> = ١٠ سم).
        فعّل كل نوع تحتاجه وحدّد مقطعه.
      </p>

      <form
        onSubmit={saveMeta}
        className="space-y-3 rounded-2xl border border-border bg-card p-3"
      >
        <h3 className="text-xs font-bold text-foreground">بيانات النظام</h3>
        <input
          type="text"
          value={systemName}
          onChange={(e) => setSystemName(e.target.value)}
          placeholder="اسم نظام الحديد"
          required
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <textarea
          value={systemNotes}
          onChange={(e) => setSystemNotes(e.target.value)}
          placeholder="ملاحظات (اختياري)"
          rows={2}
          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          حفظ الاسم
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <h3 className="text-xs font-bold text-foreground">أنواع الحديد</h3>
          <button
            type="button"
            onClick={openNewPiece}
            className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground"
          >
            + نوع جديد
          </button>
        </div>

        {pieceDraft ? (
          <form
            onSubmit={savePiece}
            className="space-y-2.5 border-b border-border bg-primary-soft/40 p-3"
          >
            <p className="text-[11px] font-bold text-primary">
              {pieces.some((p) => p.id === pieceDraft.id)
                ? "تعديل العود"
                : "عود جديد"}
            </p>
            <input
              type="text"
              value={pieceDraft.name}
              onChange={(e) =>
                setPieceDraft((d) => (d ? { ...d, name: e.target.value } : d))
              }
              placeholder="اسم العود (مثلاً: حديد حلق مفصلي)"
              required
              autoFocus
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <select
              value={pieceDraft.role}
              onChange={(e) =>
                setPieceDraft((d) =>
                  d ? { ...d, role: e.target.value as IronPieceRole } : d
                )
              }
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {[
                "frame-hinged",
                "frame-sliding",
                "sash-hinged",
                "sash-sliding",
                "sash-door",
                "mullion",
              ].map((role) => (
                <option key={role} value={role}>
                  {ironRoleLabel(role as IronPieceRole)}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <label className="block text-[11px] text-muted">
                عرض (مم)
                <input
                  type="number"
                  min={0}
                  value={pieceDraft.sectionWidthMm}
                  onChange={(e) =>
                    setPieceDraft((d) =>
                      d ? { ...d, sectionWidthMm: e.target.value } : d
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block text-[11px] text-muted">
                ارتفاع (مم)
                <input
                  type="number"
                  min={0}
                  value={pieceDraft.sectionHeightMm}
                  onChange={(e) =>
                    setPieceDraft((d) =>
                      d ? { ...d, sectionHeightMm: e.target.value } : d
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block text-[11px] text-muted">
                طول العود (م)
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={pieceDraft.barLengthM}
                  onChange={(e) =>
                    setPieceDraft((d) =>
                      d ? { ...d, barLengthM: e.target.value } : d
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={pieceDraft.enabled}
                onChange={(e) =>
                  setPieceDraft((d) =>
                    d ? { ...d, enabled: e.target.checked } : d
                  )
                }
                className="h-4 w-4 accent-[var(--primary)]"
              />
              مفعّل في الحساب
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPieceDraft(null)}
                className="h-10 rounded-xl border border-border bg-background text-sm font-semibold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="h-10 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
              >
                حفظ
              </button>
            </div>
          </form>
        ) : null}

        <ul>
          {pieces.map((piece, i) => (
            <li
              key={piece.id}
              className={`flex items-start gap-3 px-3 py-3 ${i > 0 ? "border-t border-border" : ""}`}
            >
              <input
                type="checkbox"
                checked={piece.enabled}
                onChange={() => togglePieceEnabled(piece.id)}
                className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
                aria-label={`تفعيل ${piece.name}`}
              />
              <div className="min-w-0 flex-1 text-right">
                <p
                  className={`text-sm font-semibold ${piece.enabled ? "text-foreground" : "text-muted line-through"}`}
                >
                  {piece.name}
                </p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {ironRoleLabel(piece.role)} · مقطع {piece.sectionWidthMm}×
                  {piece.sectionHeightMm} مم · عود {piece.barLengthM} م
                </p>
                <div className="mt-1.5 flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditPiece(piece)}
                    className="rounded-lg border border-border px-2 py-0.5 text-[11px] font-medium"
                  >
                    تعديل
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePiece(piece.id)}
                    className="rounded-lg border border-border px-2 py-0.5 text-[11px] font-medium text-red-600"
                  >
                    حذف
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <form
        onSubmit={saveDeductions}
        className="space-y-3 rounded-2xl border border-border bg-card p-3"
      >
        <h3 className="text-xs font-bold text-foreground">معادلات التخصيم</h3>
        <p className="text-[11px] leading-relaxed text-muted">
          {ironDeductionSummary(deductions)}
        </p>
        <p className="text-[11px] text-muted">
          المتغيرات:{" "}
          {FORMULA_VAR_HELP.map((v) => (
            <span key={v.key} className="font-mono text-foreground">
              {v.key}
            </span>
          ))}{" "}
          · L لطول السوقاس
        </p>

        <div className="space-y-2 rounded-xl border border-border/80 bg-background/70 p-2.5">
          <p className="text-[11px] font-semibold text-foreground">الحلق</p>
          <label className="block text-[11px] text-muted">
            {frameWidthFormula({ frame: deductions.frame, sash: deductions.sash })}
            <input
              type="text"
              value={deductions.frame.width}
              onChange={(e) =>
                setDeductions((d) => ({
                  ...d,
                  frame: { ...d.frame, width: e.target.value },
                }))
              }
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
              dir="ltr"
            />
          </label>
          <label className="block text-[11px] text-muted">
            {frameHeightFormula({ frame: deductions.frame, sash: deductions.sash })}
            <input
              type="text"
              value={deductions.frame.height}
              onChange={(e) =>
                setDeductions((d) => ({
                  ...d,
                  frame: { ...d.frame, height: e.target.value },
                }))
              }
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
              dir="ltr"
            />
          </label>
        </div>

        <div className="space-y-2 rounded-xl border border-border/80 bg-background/70 p-2.5">
          <p className="text-[11px] font-semibold text-foreground">الضلفة</p>
          <label className="block text-[11px] text-muted">
            {sashWidthFormula({ frame: deductions.frame, sash: deductions.sash })}
            <input
              type="text"
              value={deductions.sash.width}
              onChange={(e) =>
                setDeductions((d) => ({
                  ...d,
                  sash: { ...d.sash, width: e.target.value },
                }))
              }
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
              dir="ltr"
            />
          </label>
          <label className="block text-[11px] text-muted">
            {sashHeightFormula({ frame: deductions.frame, sash: deductions.sash })}
            <input
              type="text"
              value={deductions.sash.height}
              onChange={(e) =>
                setDeductions((d) => ({
                  ...d,
                  sash: { ...d.sash, height: e.target.value },
                }))
              }
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
              dir="ltr"
            />
          </label>
        </div>

        <label className="block text-[11px] text-muted">
          طول سوقاس الحديد (=L-100)
          <input
            type="text"
            value={deductions.mullion}
            onChange={(e) =>
              setDeductions((d) => ({ ...d, mullion: e.target.value }))
            }
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
            dir="ltr"
          />
        </label>

        <button
          type="submit"
          className="h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          حفظ المعادلات
        </button>
      </form>

      <section className="rounded-2xl border border-border bg-card p-3">
        <h3 className="text-xs font-bold text-foreground">معاينة (مثال)</h3>
        <p className="mt-1 text-[11px] text-muted">
          فتحة {previewW}×{previewH} مم — حلق {previewCuts.frameWidthMm}×
          {previewCuts.frameHeightMm} مم
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block text-[11px] text-muted">
            عرض الفتحة
            <input
              type="number"
              min={0}
              value={previewW}
              onChange={(e) => setPreviewW(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block text-[11px] text-muted">
            ارتفاع الفتحة
            <input
              type="number"
              min={0}
              value={previewH}
              onChange={(e) => setPreviewH(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          حديد الحلق (تقريبي): عرض ≈ {Math.max(0, previewCuts.frameWidthMm - 100)}{" "}
          مم
          {previewIronFrameW > 0 ? ` (من ${deductions.frame.width})` : ""}
        </p>
      </section>
    </div>
  );
}
