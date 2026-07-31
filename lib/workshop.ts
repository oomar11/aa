import {
  getProjectById,
  listAllProjects,
  PROJECTS_UPDATED_EVENT,
  type Project,
  type ProjectWorkflow,
  upsertProjectOverride,
} from "@/lib/projects";
import {
  todayIsoDate,
  upsertPayment,
  type Payment,
  loadPayments,
  loadInvoices,
} from "@/lib/accounting";

export const WORKFLOW_LABELS: Record<ProjectWorkflow, string> = {
  quote: "مقايسة",
  queued: "مجدول",
  workshop: "في الورشة",
  done: "مكتمل",
};

export function notifyWorkshopUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PROJECTS_UPDATED_EVENT));
  window.dispatchEvent(new Event("upvc-accounting-updated"));
}

/** مبلغ العربون المسجّل على المشروع (تحصيل بنوع عربون أو مربوط بفواتيره) */
export function projectDepositTotal(projectId: string): number {
  const payments = loadPayments();
  const invoices = loadInvoices();
  const invoiceIds = new Set(
    invoices
      .filter((i) => i.projectId === projectId && i.status !== "cancelled")
      .map((i) => i.id)
  );

  return payments.reduce((sum, payment) => {
    if (payment.projectId === projectId && payment.kind === "deposit") {
      return sum + payment.amount;
    }
    if (
      payment.kind === "deposit" &&
      payment.invoiceId &&
      invoiceIds.has(payment.invoiceId)
    ) {
      return sum + payment.amount;
    }
    return sum;
  }, 0);
}

export function projectHasDeposit(project: Project): boolean {
  if ((project.depositAmount ?? 0) > 0 || project.depositAt) return true;
  return projectDepositTotal(project.id) > 0;
}

function nextQueueOrder(projects: Project[] = listAllProjects()): number {
  let max = 0;
  for (const project of projects) {
    if (
      (project.workflow === "queued" || project.workflow === "workshop") &&
      typeof project.queueOrder === "number"
    ) {
      max = Math.max(max, project.queueOrder);
    }
  }
  return max + 1;
}

/**
 * تطبيق عربون على المشروع (بدون إنشاء قيد تحصيل جديد).
 * يُستدعى بعد حفظ التحصيل أو من شاشة الورشة.
 */
export function applyDepositToProject(
  projectId: string,
  amount: number,
  date: string = todayIsoDate()
): Project | undefined {
  const project = getProjectById(projectId);
  if (!project || project.workflow === "done") return project;

  const addAmount = Math.max(0, amount);
  const updated: Project = {
    ...project,
    status: "open",
    workflow:
      project.workflow === "workshop" || project.workflow === "queued"
        ? project.workflow
        : "queued",
    depositAt: project.depositAt ?? date,
    depositAmount: (project.depositAmount ?? 0) + addAmount,
    queueOrder: project.queueOrder ?? nextQueueOrder(),
  };

  upsertProjectOverride(updated);
  return updated;
}

/** استلام عربون → قيد تحصيل + دخول طابور الورشة */
export function scheduleProjectWithDeposit(input: {
  projectId: string;
  amount: number;
  date?: string;
  method?: Payment["method"];
  note?: string;
}): Project | undefined {
  const project = getProjectById(input.projectId);
  if (!project) return undefined;
  if (project.workflow === "done") return project;

  const date = input.date ?? todayIsoDate();
  const amount = Math.max(0, input.amount);

  if (amount > 0) {
    upsertPayment({
      id: `pay-dep-${Date.now()}`,
      customerId: project.customerId,
      projectId: project.id,
      amount,
      date,
      method: input.method ?? "cash",
      kind: "deposit",
      note: input.note?.trim() || "عربون",
      createdAt: new Date().toISOString(),
    });
  }

  return applyDepositToProject(project.id, amount, date);
}

/** بدء التنفيذ في الورشة */
export function startWorkshopProject(projectId: string): Project | undefined {
  const project = getProjectById(projectId);
  if (!project) return undefined;
  if (project.workflow === "quote" && !projectHasDeposit(project)) {
    return project;
  }

  const updated: Project = {
    ...project,
    status: "open",
    workflow: "workshop",
    depositAt: project.depositAt ?? todayIsoDate(),
    queueOrder: project.queueOrder ?? nextQueueOrder(),
  };
  upsertProjectOverride(updated);
  return updated;
}

/** إرجاع للطابور من الورشة */
export function returnToQueue(projectId: string): Project | undefined {
  const project = getProjectById(projectId);
  if (!project || project.workflow === "done" || project.workflow === "quote") {
    return project;
  }

  const updated: Project = {
    ...project,
    status: "open",
    workflow: "queued",
    queueOrder: project.queueOrder ?? nextQueueOrder(),
  };
  upsertProjectOverride(updated);
  return updated;
}

export function completeWorkshopProject(projectId: string): Project | undefined {
  const project = getProjectById(projectId);
  if (!project) return undefined;

  const updated: Project = {
    ...project,
    status: "done",
    workflow: "done",
  };
  upsertProjectOverride(updated);
  return updated;
}

function sortByQueue(a: Project, b: Project): number {
  const ao = a.queueOrder ?? Number.MAX_SAFE_INTEGER;
  const bo = b.queueOrder ?? Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  const ad = a.depositAt ?? a.createdAt;
  const bd = b.depositAt ?? b.createdAt;
  return new Date(ad).getTime() - new Date(bd).getTime();
}

export function listWorkshopProjects(): Project[] {
  return listAllProjects()
    .filter((p) => p.workflow === "workshop")
    .sort(sortByQueue);
}

export function listQueuedProjects(): Project[] {
  return listAllProjects()
    .filter((p) => p.workflow === "queued")
    .sort(sortByQueue);
}

/** الشغلانة اللي عليها الدور: أول طابور */
export function getNextUpProject(): Project | undefined {
  return listQueuedProjects()[0];
}

/** تحريك ترتيب الطابور */
export function moveInQueue(
  projectId: string,
  direction: "up" | "down"
): void {
  const queued = listQueuedProjects();
  const index = queued.findIndex((p) => p.id === projectId);
  if (index < 0) return;

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= queued.length) return;

  const a = queued[index];
  const b = queued[swapWith];
  const orderA = a.queueOrder ?? index + 1;
  const orderB = b.queueOrder ?? swapWith + 1;

  upsertProjectOverride({ ...a, queueOrder: orderB });
  upsertProjectOverride({ ...b, queueOrder: orderA });
}
