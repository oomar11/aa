"use client";

import { ScreenBack } from "@/components/ScreenBack";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  DEFAULT_BAR_LENGTH_M,
  calcCutSizes,
  defaultDeductions,
  defaultProfileDetails,
  findSystem,
  formatFormulaVars,
  frameHeightFormula,
  frameWidthFormula,
  getCutCalculationSteps,
  loadMaterialCatalog,
  newPieceId,
  PROFILE_PIECE_ROLES,
  profileRoleLabel,
  saveMaterialCatalog,
  sashHeightFormula,
  sashWidthFormula,
  upsertSystem,
  type MaterialCatalog,
  type MaterialSystem,
  type ProfileDeductions,
  type ProfilePiece,
  type ProfilePieceRole,
  type ProfileSystemDetails,
} from "@/lib/material-systems";
import {
  FORMULA_VAR_HELP,
  areAllDeductionsSimple,
  deductToFormula,
  describeFormulaAr,
  ensureEqualsPrefix,
  parseSimpleDeduct,
  validateFormula,
  type FormulaBaseVar,
} from "@/lib/excel-formula";

type Props = {
  systemId: string;
};

type PieceDraft = {
  id: string;
  name: string;
  role: ProfilePieceRole;
  sectionWidthMm: string;
  barLengthM: string;
  notes: string;
};

type FormulaMode = "simple" | "advanced";

type DeductPreset = {
  id: string;
  label: string;
  frameW: number;
  frameH: number;
  sashW: number;
  sashH: number;
};

const DEDUCT_PRESETS: DeductPreset[] = [
  { id: "none", label: "بدون تخصيم", frameW: 0, frameH: 0, sashW: 0, sashH: 0 },
  { id: "sash10", label: "ضلفة −١٠", frameW: 0, frameH: 0, sashW: 10, sashH: 10 },
  {
    id: "frame5-sash10",
    label: "حلق −٥ · ضلفة −١٠",
    frameW: 5,
    frameH: 5,
    sashW: 10,
    sashH: 10,
  },
  {
    id: "frame10-sash20",
    label: "حلق −١٠ · ضلفة −٢٠",
    frameW: 10,
    frameH: 10,
    sashW: 20,
    sashH: 20,
  },
];

function deductMmFromFormula(formula: string): number {
  const parsed = parseSimpleDeduct(formula);
  return parsed.simple ? parsed.deductMm : 0;
}

function deductionsFromSimpleMm(mm: {
  frameW: number;
  frameH: number;
  sashW: number;
  sashH: number;
}): ProfileDeductions {
  return {
    frame: {
      width: deductToFormula("W", mm.frameW),
      height: deductToFormula("H", mm.frameH),
    },
    sash: {
      width: deductToFormula("FW", mm.sashW),
      height: deductToFormula("FH", mm.sashH),
    },
  };
}

function toPieceDraft(p?: ProfilePiece): PieceDraft {
  return {
    id: p?.id ?? newPieceId(),
    name: p?.name ?? "",
    role: p?.role ?? "other",
    sectionWidthMm: String(p?.sectionWidthMm ?? 60),
    barLengthM: String(p?.barLengthM ?? DEFAULT_BAR_LENGTH_M),
    notes: p?.notes ?? "",
  };
}

function parsePiece(draft: PieceDraft): ProfilePiece | null {
  const name = draft.name.trim();
  if (!name) return null;
  const sectionWidthMm = Number(draft.sectionWidthMm);
  const barLengthM = Number(draft.barLengthM);
  return {
    id: draft.id,
    name,
    role: draft.role,
    sectionWidthMm:
      Number.isFinite(sectionWidthMm) && sectionWidthMm >= 0
        ? sectionWidthMm
        : 60,
    barLengthM:
      Number.isFinite(barLengthM) && barLengthM > 0
        ? barLengthM
        : DEFAULT_BAR_LENGTH_M,
    notes: draft.notes.trim() || undefined,
  };
}

export function ProfileSystemDetailEditor({ systemId }: Props) {
  const [catalog, setCatalog] = useState<MaterialCatalog | null>(null);
  const [system, setSystem] = useState<MaterialSystem | null>(null);
  const [systemName, setSystemName] = useState("");
  const [systemNotes, setSystemNotes] = useState("");
  const [pieces, setPieces] = useState<ProfilePiece[]>([]);
  const [deductions, setDeductions] =
    useState<ProfileDeductions>(defaultDeductions);
  const [formulaMode, setFormulaMode] = useState<FormulaMode>("simple");
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
      const found = findSystem("profiles", systemId, cat);
      if (!found) {
        setMissing(true);
        return;
      }
      const details = found.profile ?? defaultProfileDetails();
      setSystem(found);
      setSystemName(found.name);
      setSystemNotes(found.notes ?? "");
      setPieces(details.pieces);
      setDeductions(details.deductions);
      const formulas = [
        details.deductions.frame.width,
        details.deductions.frame.height,
        details.deductions.sash.width,
        details.deductions.sash.height,
      ];
      setFormulaMode(areAllDeductionsSimple(formulas) ? "simple" : "advanced");
    });
  }, [systemId]);

  function persistProfile(
    nextPieces: ProfilePiece[],
    nextDeductions: ProfileDeductions,
    name = systemName,
    notes = systemNotes
  ) {
    if (!catalog || !system) return;
    const profile: ProfileSystemDetails = {
      pieces: nextPieces,
      deductions: nextDeductions,
    };
    const nextSystem: MaterialSystem = {
      ...system,
      name: name.trim() || system.name,
      notes: notes.trim() || undefined,
      profile,
    };
    const saved = saveMaterialCatalog(
      upsertSystem(catalog, "profiles", nextSystem)
    );
    setCatalog(saved);
    const refreshed = findSystem("profiles", systemId, saved);
    if (refreshed) {
      setSystem(refreshed);
      setSystemName(refreshed.name);
      setSystemNotes(refreshed.notes ?? "");
      const details = refreshed.profile ?? defaultProfileDetails();
      setPieces(details.pieces);
      setDeductions(details.deductions);
    }
  }

  function saveMeta(e: FormEvent) {
    e.preventDefault();
    persistProfile(pieces, deductions);
    showFlash("تم حفظ بيانات النظام");
  }

  function saveDeductions(e: FormEvent) {
    e.preventDefault();
    const normalized: ProfileDeductions = {
      frame: {
        width: ensureEqualsPrefix(deductions.frame.width),
        height: ensureEqualsPrefix(deductions.frame.height),
      },
      sash: {
        width: ensureEqualsPrefix(deductions.sash.width),
        height: ensureEqualsPrefix(deductions.sash.height),
      },
    };
    setDeductions(normalized);
    persistProfile(pieces, normalized);
    showFlash("تم حفظ التخصيمات");
  }

  function setSimpleDeduct(
    part: "frame" | "sash",
    axis: "width" | "height",
    raw: string
  ) {
    const n = Math.max(0, Number(raw) || 0);
    const base: FormulaBaseVar =
      part === "frame"
        ? axis === "width"
          ? "W"
          : "H"
        : axis === "width"
          ? "FW"
          : "FH";
    setDeductions((d) => ({
      ...d,
      [part]: {
        ...d[part],
        [axis]: deductToFormula(base, n),
      },
    }));
  }

  function applyPreset(preset: DeductPreset) {
    const next = deductionsFromSimpleMm(preset);
    setDeductions(next);
    setFormulaMode("simple");
    persistProfile(pieces, next);
    showFlash(`تم تطبيق: ${preset.label}`);
  }

  function switchMode(mode: FormulaMode) {
    if (mode === "simple") {
      const formulas = [
        deductions.frame.width,
        deductions.frame.height,
        deductions.sash.width,
        deductions.sash.height,
      ];
      if (!areAllDeductionsSimple(formulas)) {
        const ok = window.confirm(
          "في معادلات متقدمة. التحويل للوضع السهل هيخلّي التخصيم أرقام ثابتة بس. كمّل؟"
        );
        if (!ok) return;
        const next = deductionsFromSimpleMm({
          frameW: deductMmFromFormula(deductions.frame.width),
          frameH: deductMmFromFormula(deductions.frame.height),
          sashW: deductMmFromFormula(deductions.sash.width),
          sashH: deductMmFromFormula(deductions.sash.height),
        });
        setDeductions(next);
      }
    }
    setFormulaMode(mode);
  }

  function openNewPiece() {
    setPieceDraft(toPieceDraft());
  }

  function openEditPiece(piece: ProfilePiece) {
    setPieceDraft(toPieceDraft(piece));
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
    persistProfile(next, deductions);
    setPieceDraft(null);
    showFlash(exists ? "تم تعديل العود" : "تمت إضافة العود");
  }

  function deletePiece(id: string) {
    if (!window.confirm("حذف هذا العود؟")) return;
    const next = pieces.filter((p) => p.id !== id);
    setPieces(next);
    persistProfile(next, deductions);
    if (pieceDraft?.id === id) setPieceDraft(null);
    showFlash("تم الحذف");
  }

  if (missing) {
    return (
      <div className="space-y-3">
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted">
          النظام مش موجود
        </p>
        <ScreenBack href="/materials/profiles">رجوع للقطاعات</ScreenBack>
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
    deductions
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="px-1">
        <h2 className="text-lg font-bold text-foreground">{system.name}</h2>
        <p className="mt-0.5 text-xs text-muted">
          العيدان · أطوال العود · تخصيمات مقاس القطع
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

      {/* بيانات النظام */}
      <form
        onSubmit={saveMeta}
        className="space-y-3 rounded-2xl border border-border bg-card p-3"
      >
        <h3 className="text-xs font-bold text-foreground">بيانات النظام</h3>
        <input
          type="text"
          value={systemName}
          onChange={(e) => setSystemName(e.target.value)}
          placeholder="اسم النظام"
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

      {/* العيدان */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <h3 className="text-xs font-bold text-foreground">القطاعات / العيدان</h3>
          <button
            type="button"
            onClick={openNewPiece}
            className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground"
          >
            + عود جديد
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
              placeholder="اسم العود (مثلاً: حلق مفصلي)"
              required
              autoFocus
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <select
              value={pieceDraft.role}
              onChange={(e) =>
                setPieceDraft((d) =>
                  d
                    ? { ...d, role: e.target.value as ProfilePieceRole }
                    : d
                )
              }
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {PROFILE_PIECE_ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] text-muted">
                عرض المقطع (مم)
                <input
                  type="number"
                  min={0}
                  step={1}
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
            <input
              type="text"
              value={pieceDraft.notes}
              onChange={(e) =>
                setPieceDraft((d) =>
                  d ? { ...d, notes: e.target.value } : d
                )
              }
              placeholder="ملاحظة (اختياري)"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
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
                حفظ العود
              </button>
            </div>
          </form>
        ) : null}

        {pieces.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">
            مفيش عيدان — اضغط «عود جديد»
          </p>
        ) : (
          <ul>
            {pieces.map((piece, i) => (
              <li
                key={piece.id}
                className={`px-3 py-3 ${i > 0 ? "border-t border-border" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {piece.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {profileRoleLabel(piece.role)} · مقطع{" "}
                      {piece.sectionWidthMm} مم · طول العود{" "}
                      {piece.barLengthM} م
                    </p>
                    {piece.notes ? (
                      <p className="mt-0.5 text-[11px] text-muted">
                        {piece.notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => openEditPiece(piece)}
                      className="rounded-lg border border-border px-2 py-1 text-[11px] font-medium"
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePiece(piece.id)}
                      className="rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-red-600"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* تخصيمات مقاس القطع */}
      <form
        onSubmit={saveDeductions}
        className="space-y-3 rounded-2xl border border-border bg-card p-3"
      >
        <div>
          <h3 className="text-xs font-bold text-foreground">
            تخصيمات مقاس القطع
          </h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            التخصيم = كام مليمتر نخصم عشان نطلع مقاس قطع الحلق والضلفة من مقاس
            الفتحة.
          </p>
        </div>

        <div className="rounded-xl border border-primary/25 bg-primary-soft/30 px-3 py-2.5 text-[11px] leading-relaxed text-foreground">
          <p className="font-bold text-primary">بالبلدي كده (خطوتين)</p>
          <ol className="mt-1.5 list-inside list-decimal space-y-1 text-muted">
            <li>
              <span className="text-foreground">الحلق</span> بيتقص من الفتحة بعد
              خصم العرض/الارتفاع
            </li>
            <li>
              <span className="text-foreground">الضلفة</span> بتتقص من الحلق بعد
              خصم العرض/الارتفاع
            </li>
          </ol>
          <p className="mt-2 border-t border-primary/20 pt-2 text-[10px] text-muted">
            أمتار الخامات في الرسم تتحسب من تقسيمات الرسم. التخصيمات هنا لمقاس
            القطع فقط.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-background p-1">
          <button
            type="button"
            onClick={() => switchMode("simple")}
            className={`h-9 rounded-lg text-xs font-semibold transition-colors ${
              formulaMode === "simple"
                ? "bg-primary text-primary-foreground"
                : "text-muted hover:bg-card"
            }`}
          >
            سهل — أرقام
          </button>
          <button
            type="button"
            onClick={() => switchMode("advanced")}
            className={`h-9 rounded-lg text-xs font-semibold transition-colors ${
              formulaMode === "advanced"
                ? "bg-primary text-primary-foreground"
                : "text-muted hover:bg-card"
            }`}
          >
            متقدم — معادلة
          </button>
        </div>

        {formulaMode === "simple" ? (
          <>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-muted">
                قوالب جاهزة
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DEDUCT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:border-primary hover:text-primary"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-3">
              <p className="mb-1 text-[11px] font-bold text-primary">
                الخطوة ١ — خصم الحلق من الفتحة
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <SimpleDeductField
                  label="خصم العرض"
                  value={deductMmFromFormula(deductions.frame.width)}
                  onChange={(v) => setSimpleDeduct("frame", "width", v)}
                  explain="عرض الحلق = عرض الفتحة − الخصم"
                />
                <SimpleDeductField
                  label="خصم الارتفاع"
                  value={deductMmFromFormula(deductions.frame.height)}
                  onChange={(v) => setSimpleDeduct("frame", "height", v)}
                  explain="ارتفاع الحلق = ارتفاع الفتحة − الخصم"
                />
              </div>
              <div className="mt-2 space-y-0.5 text-[11px] leading-relaxed text-muted">
                <p>{describeFormulaAr(deductions.frame.width, "عرض الحلق")}</p>
                <p>
                  {describeFormulaAr(deductions.frame.height, "ارتفاع الحلق")}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-3">
              <p className="mb-1 text-[11px] font-bold text-primary">
                الخطوة ٢ — خصم الضلفة من الحلق
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <SimpleDeductField
                  label="خصم العرض"
                  value={deductMmFromFormula(deductions.sash.width)}
                  onChange={(v) => setSimpleDeduct("sash", "width", v)}
                  explain="عرض الضلفة = عرض الحلق − الخصم"
                />
                <SimpleDeductField
                  label="خصم الارتفاع"
                  value={deductMmFromFormula(deductions.sash.height)}
                  onChange={(v) => setSimpleDeduct("sash", "height", v)}
                  explain="ارتفاع الضلفة = ارتفاع الحلق − الخصم"
                />
              </div>
              <div className="mt-2 space-y-0.5 text-[11px] leading-relaxed text-muted">
                <p>{describeFormulaAr(deductions.sash.width, "عرض الضلفة")}</p>
                <p>
                  {describeFormulaAr(deductions.sash.height, "ارتفاع الضلفة")}
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="rounded-xl border border-dashed border-border bg-background/60 px-3 py-2 text-[11px] leading-relaxed text-muted">
              الوضع المتقدم للمعادلات الحرة زي إكسل. الخطوة ١ تحسب الحلق من{" "}
              <span className="font-mono text-foreground">W/H</span>، والخطوة ٢
              تحسب الضلفة من{" "}
              <span className="font-mono text-foreground">FW/FH</span>.
            </p>

            <div className="rounded-xl border border-border bg-background p-3">
              <p className="mb-1 text-[11px] font-bold text-primary">
                الخطوة ١ — معادلات الحلق
              </p>
              <p className="mb-2 text-[10px] text-muted">
                استخدم <span className="font-mono text-foreground">W</span> و{" "}
                <span className="font-mono text-foreground">H</span> (مقاس الفتحة)
              </p>
              <div className="space-y-2.5">
                <FormulaField
                  label="عرض الحلق → FW"
                  value={deductions.frame.width}
                  onChange={(width) =>
                    setDeductions((d) => ({
                      ...d,
                      frame: { ...d.frame, width },
                    }))
                  }
                  hint="مثال: =W أو =W-10"
                  preferredVars={["W", "H"]}
                />
                <FormulaField
                  label="ارتفاع الحلق → FH"
                  value={deductions.frame.height}
                  onChange={(height) =>
                    setDeductions((d) => ({
                      ...d,
                      frame: { ...d.frame, height },
                    }))
                  }
                  hint="مثال: =H أو =H-5"
                  preferredVars={["W", "H"]}
                />
              </div>
              <div className="mt-2 space-y-0.5 text-[11px] leading-relaxed text-muted">
                <p>{frameWidthFormula(deductions)}</p>
                <p>{frameHeightFormula(deductions)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-3">
              <p className="mb-1 text-[11px] font-bold text-primary">
                الخطوة ٢ — معادلات الضلفة
              </p>
              <p className="mb-2 text-[10px] text-muted">
                بعد حساب الحلق، استخدم{" "}
                <span className="font-mono text-foreground">FW</span> و{" "}
                <span className="font-mono text-foreground">FH</span>
              </p>
              <div className="space-y-2.5">
                <FormulaField
                  label="عرض الضلفة"
                  value={deductions.sash.width}
                  onChange={(width) =>
                    setDeductions((d) => ({
                      ...d,
                      sash: { ...d.sash, width },
                    }))
                  }
                  hint="مثال: =FW-10"
                  preferredVars={["FW", "FH", "W", "H"]}
                />
                <FormulaField
                  label="ارتفاع الضلفة"
                  value={deductions.sash.height}
                  onChange={(height) =>
                    setDeductions((d) => ({
                      ...d,
                      sash: { ...d.sash, height },
                    }))
                  }
                  hint="مثال: =FH-10 أو =H-2*35"
                  preferredVars={["FW", "FH", "W", "H"]}
                />
              </div>
              <div className="mt-2 space-y-0.5 text-[11px] leading-relaxed text-muted">
                <p>{sashWidthFormula(deductions)}</p>
                <p>{sashHeightFormula(deductions)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-border bg-background/60 px-3 py-2 text-[10px] leading-relaxed text-muted">
              <p className="font-semibold text-foreground">المتغيرات المتاحة</p>
              {FORMULA_VAR_HELP.map((v) => (
                <p key={v.key}>
                  <span className="font-mono text-primary">{v.key}</span> —{" "}
                  {v.label}
                </p>
              ))}
              <p className="mt-1.5 border-t border-border/60 pt-1.5">
                دوال: MIN MAX ABS ROUND FLOOR CEIL IF · مثال:{" "}
                <span className="font-mono text-foreground">=W-2*60</span>
              </p>
            </div>
          </>
        )}

        <button
          type="submit"
          className="h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          حفظ التخصيمات
        </button>
      </form>

      {/* معاينة على مقاس */}
      <section className="space-y-2 rounded-2xl border border-border bg-card p-3">
        <h3 className="text-xs font-bold text-foreground">جرّب على مقاس فتحة</h3>
        <p className="text-[10px] leading-relaxed text-muted">
          اكتب أي مقاس فتحة وشوف مقاس قطع الحلق والضلفة بعد التخصيم خطوة بخطوة.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[11px] text-muted">
            عرض الفتحة W (مم)
            <input
              type="number"
              min={0}
              value={previewW}
              onChange={(e) => setPreviewW(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block text-[11px] text-muted">
            ارتفاع الفتحة H (مم)
            <input
              type="number"
              min={0}
              value={previewH}
              onChange={(e) => setPreviewH(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>

        <CutStepsList
          steps={getCutCalculationSteps(
            Math.max(0, Number(previewW) || 0),
            Math.max(0, Number(previewH) || 0),
            deductions
          )}
        />

        <div className="overflow-hidden rounded-xl border border-border bg-background text-sm">
          <div className="grid grid-cols-3 border-b border-border text-center text-[11px] font-semibold text-muted">
            <span className="px-2 py-2">الجزء</span>
            <span className="px-2 py-2">العرض</span>
            <span className="px-2 py-2">الارتفاع</span>
          </div>
          <div className="grid grid-cols-3 border-b border-border text-center tabular-nums">
            <span className="px-2 py-2.5 text-start text-xs font-semibold">
              الفتحة
            </span>
            <span className="px-2 py-2.5">{previewCuts.openingWidthMm}</span>
            <span className="px-2 py-2.5">{previewCuts.openingHeightMm}</span>
          </div>
          <div className="grid grid-cols-3 border-b border-border text-center tabular-nums">
            <span className="px-2 py-2.5 text-start text-xs font-semibold text-primary">
              الحلق (FW × FH)
            </span>
            <span className="px-2 py-2.5 font-semibold text-primary">
              {previewCuts.errors.frameWidth
                ? "!"
                : previewCuts.frameWidthMm}
            </span>
            <span className="px-2 py-2.5 font-semibold text-primary">
              {previewCuts.errors.frameHeight
                ? "!"
                : previewCuts.frameHeightMm}
            </span>
          </div>
          <div className="grid grid-cols-3 text-center tabular-nums">
            <span className="px-2 py-2.5 text-start text-xs font-semibold text-primary">
              الضلفة
            </span>
            <span className="px-2 py-2.5 font-semibold text-primary">
              {previewCuts.errors.sashWidth ? "!" : previewCuts.sashWidthMm}
            </span>
            <span className="px-2 py-2.5 font-semibold text-primary">
              {previewCuts.errors.sashHeight ? "!" : previewCuts.sashHeightMm}
            </span>
          </div>
        </div>
        {Object.values(previewCuts.errors).some(Boolean) ? (
          <ul className="space-y-0.5 text-[11px] text-red-600">
            {previewCuts.errors.frameWidth ? (
              <li>عرض الحلق: {previewCuts.errors.frameWidth}</li>
            ) : null}
            {previewCuts.errors.frameHeight ? (
              <li>ارتفاع الحلق: {previewCuts.errors.frameHeight}</li>
            ) : null}
            {previewCuts.errors.sashWidth ? (
              <li>عرض الضلفة: {previewCuts.errors.sashWidth}</li>
            ) : null}
            {previewCuts.errors.sashHeight ? (
              <li>ارتفاع الضلفة: {previewCuts.errors.sashHeight}</li>
            ) : null}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function CutStepsList({
  steps,
}: {
  steps: ReturnType<typeof getCutCalculationSteps>;
}) {
  return (
    <ol className="space-y-1.5 rounded-xl border border-border bg-background/80 p-2.5 text-[11px]">
      {steps.map((s) => (
        <li key={s.step} className="leading-relaxed">
          <span
            className={`font-semibold ${
              s.phase === "frame" ? "text-primary" : "text-foreground"
            }`}
          >
            {s.step}. {s.label}
          </span>
          <span className="mx-1 font-mono text-muted">{s.formula}</span>
          {s.error ? (
            <span className="text-red-600"> — {s.error}</span>
          ) : (
            <span className="text-muted">
              {" "}
              ({formatFormulaVars(
                s.vars,
                s.phase === "frame" ? ["W", "H"] : ["W", "H", "FW", "FH"]
              )}) →{" "}
              <strong className="text-primary">{s.resultMm} مم</strong>
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}


function SimpleDeductField({
  label,
  value,
  onChange,
  explain,
}: {
  label: string;
  value: number;
  onChange: (next: string) => void;
  explain: string;
}) {
  return (
    <label className="block text-[11px] text-muted">
      {label} (مم)
      <input
        type="number"
        min={0}
        step={1}
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm tabular-nums text-foreground outline-none focus:border-primary"
      />
      <p className="mt-0.5 text-[10px] leading-snug text-muted">{explain}</p>
    </label>
  );
}

function FormulaField({
  label,
  value,
  onChange,
  hint,
  preferredVars,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: string;
  preferredVars?: ("W" | "H" | "FW" | "FH")[];
}) {
  const check = validateFormula(value || "=");
  const varsHint =
    preferredVars && preferredVars.length > 0
      ? `المتغيرات: ${preferredVars.join(" · ")}`
      : null;
  return (
    <label className="block text-[11px] text-muted">
      {label}
      <input
        type="text"
        dir="ltr"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => onChange(ensureEqualsPrefix(value))}
        placeholder="=W-10"
        className={`mt-1 w-full rounded-xl border bg-card px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary ${
          check.ok ? "border-border" : "border-red-400"
        }`}
      />
      {varsHint ? (
        <p className="mt-0.5 text-[10px] text-muted">{varsHint}</p>
      ) : null}
      {hint ? <p className="mt-0.5 text-[10px] text-muted">{hint}</p> : null}
      {!check.ok ? (
        <p className="mt-0.5 text-[10px] text-red-600">{check.error}</p>
      ) : null}
    </label>
  );
}
