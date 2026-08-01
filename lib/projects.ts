import {
  type DesignItem,
} from "@/lib/design-items";
import type { ProjectMaterialDefaults } from "@/lib/project-materials";
import { STORAGE_KEYS } from "@/lib/storage/keys";
import { sharedGetItem, sharedSetItem } from "@/lib/storage/shared-client";
import {
  loadExpenses,
  loadPayments,
  saveExpenses,
  savePayments,
} from "@/lib/accounting";

/**
 * دورة حياة المشروع:
 * - quote: مقايسة — لا توجد دفعات بعد
 * - queued: سُجّلت دفعة وأُضيف إلى قائمة انتظار الورشة
 * - workshop: قيد التنفيذ في الورشة
 * - done: مكتمل تصنيعاً (التسليم منفصل)
 */
export type ProjectWorkflow = "quote" | "queued" | "workshop" | "done";

/** بعد اكتمال التصنيع: لسه متسلمش / اتسلم */
export type ProjectDeliveryStatus = "awaiting" | "delivered";

/** أسباب توقف الشغل (انتظار أو تنفيذ) */
export const HOLD_REASON_OPTIONS = [
  "خامات",
  "عميل",
  "موقع",
  "فلوس",
  "أخرى",
] as const;

export type HoldReason = (typeof HOLD_REASON_OPTIONS)[number] | string;

export type Project = {
  id: string;
  customerId: string;
  name: string;
  location?: string;
  createdAt: string;
  /** توافق قديم: open ≈ غير مكتمل، done ≈ مكتمل */
  status: "open" | "done";
  /** مسار الورشة — يُحدَّث من الدفعات وأزرار الورشة فقط */
  workflow: ProjectWorkflow;
  /** تاريخ أول دفعة (بداية الجدولة) */
  depositAt?: string;
  /** إجمالي المدفوع على المشروع (متزامن مع سجل الدفعات) */
  depositAmount?: number;
  /** ترتيب قائمة الانتظار (الأقل = الأقرب للتنفيذ) */
  queueOrder?: number;
  /**
   * توقف الشغل — موجود = المشروع واقف.
   * يبقى ضمن queued/workshop بدون تغيير مسار الفلوس.
   */
  holdReason?: string;
  holdAt?: string;
  /** تسليم بعد اكتمال التصنيع */
  deliveryStatus?: ProjectDeliveryStatus;
  deliveredAt?: string;
  itemsCount: number;
} & ProjectMaterialDefaults;

/** تطبيع مشروع قديم/ناقص لحقول الورشة */
export function normalizeProject(project: Project): Project {
  const legacy = project as Project & {
    workflow?: ProjectWorkflow;
    deliveryStatus?: ProjectDeliveryStatus;
  };
  let workflow = legacy.workflow;
  if (!workflow) {
    if (project.status === "done") workflow = "done";
    else if (project.depositAt || (project.depositAmount ?? 0) > 0)
      workflow = "queued";
    else workflow = "quote";
  }
  const status: Project["status"] =
    workflow === "done" ? "done" : "open";

  let deliveryStatus = legacy.deliveryStatus;
  let deliveredAt = project.deliveredAt;
  if (workflow === "done") {
    if (deliveryStatus !== "awaiting" && deliveryStatus !== "delivered") {
      deliveryStatus = deliveredAt ? "delivered" : "awaiting";
    }
  } else {
    deliveryStatus = undefined;
    deliveredAt = undefined;
  }

  const holdReason = project.holdReason?.trim() || undefined;
  const holdAt = holdReason ? project.holdAt : undefined;

  return {
    ...project,
    workflow,
    status,
    holdReason,
    holdAt,
    deliveryStatus,
    deliveredAt,
  };
}

/** @deprecated استخدم STORAGE_KEYS.projects */
export const PROJECTS_STORAGE_KEY = STORAGE_KEYS.projects;

export const PROJECTS_UPDATED_EVENT = "upvc-projects-updated";

/** لا بذرة — البداية نظيفة */
export const projects: Project[] = [];

/** بنود مربوطة بمشاريع — فارغة عند البداية */
export const projectItems: Record<string, DesignItem[]> = {};

export function loadLocalProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sharedGetItem(PROJECTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Project[];
    return Array.isArray(parsed)
      ? parsed.map((p) => normalizeProject(p))
      : [];
  } catch {
    return [];
  }
}

export function loadDeletedProjectIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sharedGetItem(STORAGE_KEYS.deletedProjects);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function saveDeletedProjectIds(ids: string[]) {
  if (typeof window === "undefined") return;
  sharedSetItem(STORAGE_KEYS.deletedProjects, JSON.stringify(ids));
}

export function isProjectDeleted(projectId: string): boolean {
  return loadDeletedProjectIds().includes(projectId);
}

function notifyProjectsUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PROJECTS_UPDATED_EVENT));
  window.dispatchEvent(new Event("upvc-accounting-updated"));
}

/** كل المشاريع الظاهرة بعد استبعاد المحذوفة */
export function listAllProjects(): Project[] {
  const deleted = new Set(loadDeletedProjectIds());
  const local = loadLocalProjects().filter((p) => !deleted.has(p.id));
  const localIds = new Set(local.map((p) => p.id));
  const seeded = projects
    .filter((p) => !localIds.has(p.id) && !deleted.has(p.id))
    .map((p) => normalizeProject(p));
  return [...local, ...seeded];
}

export function getProjectsForCustomer(customerId: string): Project[] {
  return listAllProjects()
    .filter((p) => p.customerId === customerId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function getProjectById(projectId: string): Project | undefined {
  if (isProjectDeleted(projectId)) return undefined;
  const found =
    loadLocalProjects().find((p) => p.id === projectId) ??
    projects.find((p) => p.id === projectId);
  return found ? normalizeProject(found) : undefined;
}

const ITEMS_STORAGE_KEY = STORAGE_KEYS.projectItems;

function loadLocalItems(): Record<string, DesignItem[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sharedGetItem(ITEMS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, DesignItem[]>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getItemsForProject(projectId: string): DesignItem[] {
  if (isProjectDeleted(projectId)) return [];
  const local = loadLocalItems()[projectId];
  if (local) return local;
  return projectItems[projectId] ?? [];
}

export function saveItemsForProject(projectId: string, items: DesignItem[]) {
  if (typeof window === "undefined") return;
  const all = loadLocalItems();
  all[projectId] = items;
  sharedSetItem(ITEMS_STORAGE_KEY, JSON.stringify(all));
}

function clearItemsForProject(projectId: string) {
  if (typeof window === "undefined") return;
  const all = loadLocalItems();
  if (!(projectId in all)) return;
  delete all[projectId];
  sharedSetItem(ITEMS_STORAGE_KEY, JSON.stringify(all));
}

export function upsertProjectOverride(project: Project) {
  const previousDeleted = loadDeletedProjectIds();
  const deleted = previousDeleted.filter((id) => id !== project.id);
  if (deleted.length !== previousDeleted.length) {
    saveDeletedProjectIds(deleted);
  }
  const normalized = normalizeProject(project);
  const local = loadLocalProjects().filter((p) => p.id !== normalized.id);
  sharedSetItem(
    PROJECTS_STORAGE_KEY,
    JSON.stringify([normalized, ...local])
  );
  notifyProjectsUpdated();
}

/** حذف نهائي للمشروع وبنوده، وفك ربط الحركات المحاسبية */
export function deleteProject(projectId: string) {
  if (typeof window === "undefined") return;
  const local = loadLocalProjects().filter((p) => p.id !== projectId);
  sharedSetItem(PROJECTS_STORAGE_KEY, JSON.stringify(local));

  const deleted = new Set(loadDeletedProjectIds());
  deleted.add(projectId);
  saveDeletedProjectIds([...deleted]);

  clearItemsForProject(projectId);

  const payments = loadPayments().map((p) =>
    p.projectId === projectId ? { ...p, projectId: undefined } : p
  );
  savePayments(payments);

  saveExpenses(loadExpenses().filter((e) => e.projectId !== projectId));

  notifyProjectsUpdated();
  window.dispatchEvent(new Event("upvc-accounting-updated"));
}
