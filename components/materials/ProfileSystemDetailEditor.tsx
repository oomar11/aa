"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { MaterialSectionTabs } from "@/components/materials/MaterialSectionTabs";
import { NumericInput } from "@/components/ui/NumericInput";
import {
  DEFAULT_BAR_LENGTH_M,
  defaultProfileDetails,
  findSystem,
  getCutDeductions,
  loadMaterialCatalog,
  makeProfileBarRate,
  mergeStandardProfilePieces,
  newPieceId,
  PROFILE_PIECE_ROLES,
  PROFILE_PRICE_CATEGORIES,
  profileBarPricePerM,
  profilePriceCategoryLabel,
  profileRoleDefaultName,
  profileRoleLabel,
  saveMaterialCatalog,
  unifiedToProfileDeductions,
  upsertSystem,
  type MaterialCatalog,
  type MaterialSystem,
  type ProfileBarRate,
  type ProfilePiece,
  type ProfilePieceRole,
  type ProfilePriceCategory,
  type ProfileSystemDetails,
} from "@/lib/material-systems";
import { ROUTES } from "@/lib/routes";

type Props = {
  systemId: string;
};

type ProfileDetailTab = "meta" | "prices" | "pieces";

const PROFILE_DETAIL_TABS: { id: ProfileDetailTab; label: string }[] = [
  { id: "meta", label: "بيانات" },
  { id: "prices", label: "الأسعار" },
  { id: "pieces", label: "العيدان" },
];

function rateSummary(rate: ProfileBarRate | undefined): string | null {
  if (!rate || rate.barPrice <= 0 || rate.barLengthM <= 0) return null;
  const perM = profileBarPricePerM(rate.barPrice, rate.barLengthM);
  return `${rate.barPrice} ج.م/عود · ${rate.barLengthM} م ← ${perM} ج.م/م`;
}

type PieceDraft = {
  id: string;
  name: string;
  role: ProfilePieceRole;
  sectionWidthMm: string;
  barLengthM: string;
  notes: string;
};

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
  const [bouclierCapKitPrice, setBouclierCapKitPrice] = useState("");
  const [rates, setRates] = useState<
    Partial<Record<ProfilePriceCategory, ProfileBarRate>>
  >({});
  const [pieces, setPieces] = useState<ProfilePiece[]>([]);
  const [pieceDraft, setPieceDraft] = useState<PieceDraft | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<ProfileDetailTab>("meta");

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
      setBouclierCapKitPrice(
        details.bouclierCapKitPrice != null && details.bouclierCapKitPrice > 0
          ? String(details.bouclierCapKitPrice)
          : ""
      );
      setRates(details.rates ?? {});
      setPieces(details.pieces);
    });
  }, [systemId]);

  function persistProfile(
    nextPieces: ProfilePiece[],
    name = systemName,
    notes = systemNotes,
    nextRates = rates,
    kitPriceRaw = bouclierCapKitPrice
  ) {
    if (!catalog || !system) return;
    const kitN = Number(kitPriceRaw);
    const profile: ProfileSystemDetails = {
      pieces: nextPieces,
      deductions: unifiedToProfileDeductions(getCutDeductions(catalog)),
      rates: { ...nextRates },
      bouclierCapKitPrice:
        Number.isFinite(kitN) && kitN >= 0 ? kitN : undefined,
    };
    const nextSystem: MaterialSystem = {
      ...system,
      name: name.trim() || system.name,
      notes: notes.trim() || undefined,
      profileBrandId: undefined,
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
      setBouclierCapKitPrice(
        details.bouclierCapKitPrice != null && details.bouclierCapKitPrice > 0
          ? String(details.bouclierCapKitPrice)
          : ""
      );
      setRates(details.rates ?? {});
      setPieces(details.pieces);
    }
  }

  function saveMeta(e: FormEvent) {
    e.preventDefault();
    persistProfile(pieces);
    showFlash("تم حفظ بيانات النظام");
  }

  function setRateValue(
    category: ProfilePriceCategory,
    field: "barPrice" | "barLengthM",
    value: number
  ) {
    const prev = rates[category] ?? makeProfileBarRate(0, 6);
    setRates({
      ...rates,
      [category]: { ...prev, [field]: value },
    });
  }

  function saveRates(e: FormEvent) {
    e.preventDefault();
    persistProfile(pieces, systemName, systemNotes, rates);
    showFlash("تم حفظ أسعار النظام");
  }

  function openNewPiece() {
    const draft = toPieceDraft();
    draft.name = profileRoleDefaultName(draft.role);
    setPieceDraft(draft);
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
    persistProfile(next);
    setPieceDraft(null);
    showFlash(exists ? "تم تعديل العود" : "تمت إضافة العود");
  }

  function addStandardPieces(kind: "hinged" | "sliding") {
    const next = mergeStandardProfilePieces(pieces, kind);
    setPieces(next);
    persistProfile(next);
    showFlash(
      kind === "hinged"
        ? "تمت إضافة قطاعات المفصلي القياسية"
        : "تمت إضافة قطاعات الجرار القياسية"
    );
  }

  function onPieceRoleChange(role: ProfilePieceRole) {
    setPieceDraft((d) => {
      if (!d) return d;
      const defaultName = profileRoleDefaultName(role);
      const keepName =
        d.name.trim() &&
        d.name !== profileRoleDefaultName(d.role) &&
        !/بيادة|بياة/.test(d.name);
      return {
        ...d,
        role,
        name: keepName ? d.name : defaultName,
      };
    });
  }

  function deletePiece(id: string) {
    if (!window.confirm("حذف هذا العود؟")) return;
    const next = pieces.filter((p) => p.id !== id);
    setPieces(next);
    persistProfile(next);
    if (pieceDraft?.id === id) setPieceDraft(null);
    showFlash("تم الحذف");
  }

  if (missing) {
    return (
      <div className="space-y-3">
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted">
          النظام مش موجود
        </p>
        <Link
          href={ROUTES.materials.profiles}
          className="block text-center text-sm font-semibold text-primary"
        >
          رجوع للقطاعات
        </Link>
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

  return (
    <div className="flex flex-col gap-3">
      <div className="px-1">
        <h1 className="text-xl font-bold text-foreground">{system.name}</h1>
        <p className="mt-0.5 text-xs text-muted">
          بيانات · الأسعار · العيدان — التخصيم من{" "}
          <Link
            href={ROUTES.materials.deductions}
            className="font-semibold text-primary"
          >
            التخصيمات الموحدة
          </Link>
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

      <MaterialSectionTabs
        tabs={PROFILE_DETAIL_TABS}
        active={tab}
        onChange={setTab}
        label="أقسام نظام القطاعات"
      />

      {tab === "meta" ? (
        <form
          onSubmit={saveMeta}
          className="space-y-3 rounded-2xl border border-border bg-card p-3"
        >
          <h3 className="text-xs font-bold text-foreground">بيانات النظام</h3>
          <input
            type="text"
            value={systemName}
            onChange={(e) => setSystemName(e.target.value)}
            placeholder="اسم السيستم (مثلاً: بريمير سيتي)"
            required
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <label className="block text-[11px] text-muted">
            سعر طقم طبة البوكلير (ج.م/طقم)
            <input
              type="number"
              min={0}
              step={1}
              value={bouclierCapKitPrice}
              onChange={(e) => setBouclierCapKitPrice(e.target.value)}
              placeholder="مثلاً: 45"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </label>
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
            حفظ البيانات
          </button>
        </form>
      ) : null}

      {tab === "prices" ? (
        <form
          onSubmit={saveRates}
          className="space-y-3 rounded-2xl border border-border bg-card p-3"
        >
          <div>
            <h3 className="text-xs font-bold text-foreground">أسعار العود</h3>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              سعر العود ÷ الطول = سعر المتر
            </p>
          </div>
          <div className="space-y-2">
            {PROFILE_PRICE_CATEGORIES.map((cat) => {
              const rate = rates[cat.id] ?? makeProfileBarRate(0, 6);
              const summary = rateSummary(rate.barPrice > 0 ? rate : undefined);
              return (
                <div
                  key={cat.id}
                  className="rounded-xl border border-border/70 bg-background/60 p-2"
                >
                  <p className="text-[11px] font-semibold text-foreground">
                    {profilePriceCategoryLabel(cat.id)}
                  </p>
                  {rate.productName ? (
                    <p className="mt-0.5 text-[10px] text-muted">
                      {rate.productName}
                    </p>
                  ) : null}
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <label className="block text-[10px] text-muted">
                      سعر العود (ج.م)
                      <NumericInput
                        min={0}
                        step={1}
                        value={rate.barPrice}
                        onChange={(v) => setRateValue(cat.id, "barPrice", v)}
                        placeholder="0"
                        className="mt-0.5 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                      />
                    </label>
                    <label className="block text-[10px] text-muted">
                      طول العود (م)
                      <NumericInput
                        min={0.1}
                        step={0.1}
                        fallback={6}
                        blankZero={false}
                        value={rate.barLengthM}
                        onChange={(v) => setRateValue(cat.id, "barLengthM", v)}
                        placeholder="6"
                        className="mt-0.5 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                      />
                    </label>
                  </div>
                  {summary ? (
                    <p className="mt-1 text-[10px] font-medium text-primary">
                      {summary}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
          <button
            type="submit"
            className="h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            حفظ الأسعار
          </button>
        </form>
      ) : null}

      {tab === "pieces" ? (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <h3 className="text-xs font-bold text-foreground">
              القطاعات / العيدان
            </h3>
            <button
              type="button"
              onClick={openNewPiece}
              className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground"
            >
              + عود جديد
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 border-b border-border bg-background/50 px-3 py-2">
            <button
              type="button"
              onClick={() => addStandardPieces("hinged")}
              className="rounded-lg border border-primary/40 bg-primary-soft px-2.5 py-1 text-[10px] font-semibold text-primary"
            >
              + قطاعات مفصلي قياسية
            </button>
            <button
              type="button"
              onClick={() => addStandardPieces("sliding")}
              className="rounded-lg border border-border px-2.5 py-1 text-[10px] font-semibold text-foreground"
            >
              + قطاعات جرار قياسية
            </button>
          </div>
          <p className="border-b border-border px-3 py-2 text-[10px] leading-relaxed text-muted">
            باكتة سنجل/دبل حسب نوع الزجاج — البنل بند مستقل · ضلفة شباك مفصلي
            منفصلة عن ضلفة باب مفصلي
          </p>

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
                  onPieceRoleChange(e.target.value as ProfilePieceRole)
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <RoleOptionGroup
                  label="حلق وضلف"
                  roles={[
                    "frame-hinged",
                    "frame-sliding",
                    "sash-hinged",
                    "sash-door",
                    "sash-sliding",
                  ]}
                />
                <RoleOptionGroup
                  label="باكتة وبنل"
                  roles={[
                    "bead-single-hinged",
                    "bead-double-hinged",
                    "bead-single-sliding",
                    "bead-double-sliding",
                    "panel",
                  ]}
                />
                <RoleOptionGroup
                  label="أخرى"
                  roles={[
                    "mullion",
                    "coupling",
                    "knife",
                    "four-leaf-meeting",
                    "mesh-meeting",
                    "bouclier-cap",
                    "other",
                  ]}
                />
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
                        {piece.sectionWidthMm} مم · طول العود {piece.barLengthM}{" "}
                        م
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
      ) : null}
    </div>
  );
}

function RoleOptionGroup({
  label,
  roles,
}: {
  label: string;
  roles: ProfilePieceRole[];
}) {
  return (
    <optgroup label={label}>
      {PROFILE_PIECE_ROLES.filter((r) => roles.includes(r.id)).map((r) => (
        <option key={r.id} value={r.id}>
          {r.label}
        </option>
      ))}
    </optgroup>
  );
}
