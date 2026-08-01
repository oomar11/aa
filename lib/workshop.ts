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
} from "@/lib/accounting";

export const WORKFLOW_LABELS: Record<ProjectWorkflow, string> = {
  quote: "مقايسة",
  queued: "في الانتظار",
  workshop: "قيد التنفيذ",
  done: "مكتمل",
};

/** ترتيب العرض حسب أولوية الشغل اليومي */
export const WORKFLOW_PRIORITY: ProjectWorkflow[] = [
  "workshop",
  "queued",
  "quote",
  "done",
];

export type WorkflowVisual = {
  label: string;
  /** شارة الحالة */
  badge: string;
  /** شارة بارزة (التالي / قيد الشغل) */
  badgeSolid: string;
  /** شريط جانبي للبطاقة */
  rail: string;
  /** خلفية قسم / فلتر نشط */
  soft: string;
  /** نص وعنوان القسم */
  text: string;
  /** حدود خفيفة */
  border: string;
  /** نقطة الملخص */
  dot: string;
};

/** ألوان موحّدة لكل حالة — نفس المعنى في الورشة والطلبات */
export const WORKFLOW_VISUAL: Record<ProjectWorkflow, WorkflowVisual> = {
  quote: {
    label: WORKFLOW_LABELS.quote,
    badge: "bg-wf-quote-soft text-wf-quote",
    badgeSolid: "bg-wf-quote text-white",
    rail: "border-s-wf-quote",
    soft: "bg-wf-quote-soft",
    text: "text-wf-quote",
    border: "border-wf-quote/30",
    dot: "bg-wf-quote",
  },
  queued: {
    label: WORKFLOW_LABELS.queued,
    badge: "bg-wf-queued-soft text-wf-queued",
    badgeSolid: "bg-wf-queued text-white",
    rail: "border-s-wf-queued",
    soft: "bg-wf-queued-soft",
    text: "text-wf-queued",
    border: "border-wf-queued/35",
    dot: "bg-wf-queued",
  },
  workshop: {
    label: WORKFLOW_LABELS.workshop,
    badge: "bg-wf-workshop-soft text-wf-workshop",
    badgeSolid: "bg-wf-workshop text-white",
    rail: "border-s-wf-workshop",
    soft: "bg-wf-workshop-soft",
    text: "text-wf-workshop",
    border: "border-wf-workshop/35",
    dot: "bg-wf-workshop",
  },
  done: {
    label: WORKFLOW_LABELS.done,
    badge: "bg-wf-done-soft text-wf-done",
    badgeSolid: "bg-wf-done text-white",
    rail: "border-s-wf-done",
    soft: "bg-wf-done-soft",
    text: "text-wf-done",
    border: "border-wf-done/30",
    dot: "bg-wf-done",
  },
};

export function workflowPriorityRank(workflow: ProjectWorkflow): number {
  const i = WORKFLOW_PRIORITY.indexOf(workflow);
  return i < 0 ? WORKFLOW_PRIORITY.length : i;
}

export function compareProjectsByWorkflowThenDate(
  a: { workflow: ProjectWorkflow; createdAt: string },
  b: { workflow: ProjectWorkflow; createdAt: string }
): number {
  const byWf = workflowPriorityRank(a.workflow) - workflowPriorityRank(b.workflow);
  if (byWf !== 0) return byWf;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function notifyWorkshopUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PROJECTS_UPDATED_EVENT));
  window.dispatchEvent(new Event("upvc-accounting-updated"));
}

/** إجمالي المبالغ المسجّلة على المشروع */
export function projectPaidTotal(projectId: string): number {
  return loadPayments().reduce((sum, payment) => {
    if (payment.projectId === projectId) return sum + payment.amount;
    return sum;
  }, 0);
}

/** @deprecated استخدم projectPaidTotal */
export function projectDepositTotal(projectId: string): number {
  return projectPaidTotal(projectId);
}

export function projectHasPayment(project: Project): boolean {
  return projectPaidTotal(project.id) > 0;
}

/** @deprecated استخدم projectHasPayment */
export function projectHasDeposit(project: Project): boolean {
  return projectHasPayment(project);
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
 * يعيد مزامنة depositAmount + حالة الطابور من مجموع الدفعات الفعلي.
 * - فيه فلوس + مقايسة → قائمة انتظار
 * - مفيش فلوس + (انتظار) → يرجع مقايسة
 * - قيد التنفيذ / مكتمل: لا يُخرج من حالته تلقائياً
 */
export function syncProjectMoneyFromPayments(
  projectId: string,
  date: string = todayIsoDate()
): Project | undefined {
  const project = getProjectById(projectId);
  if (!project) return undefined;

  const paid = projectPaidTotal(projectId);
  const hasMoney = paid > 0;

  let workflow = project.workflow;
  let status = project.status;
  let queueOrder = project.queueOrder;
  let depositAt = project.depositAt;

  if (hasMoney) {
    if (workflow === "quote") {
      workflow = "queued";
      status = "open";
      queueOrder = queueOrder ?? nextQueueOrder();
    }
    depositAt = depositAt ?? date;
  } else {
    // لا فلوس: اخرج من قائمة الانتظار فقط (لا تلمس ورشة/مكتمل)
    if (workflow === "queued") {
      workflow = "quote";
      status = "open";
      queueOrder = undefined;
    }
    depositAt = undefined;
  }

  const updated: Project = {
    ...project,
    status,
    workflow,
    depositAt,
    depositAmount: paid,
    queueOrder,
  };

  upsertProjectOverride(updated);
  return updated;
}

/**
 * بعد تسجيل دفعة على مشروع: يزامن المال ويدخل قائمة الانتظار إن لزم.
 * المشاريع المكتملة: تُحدَّث المبالغ فقط دون إعادتها للطابور.
 */
export function queueProjectAfterPayment(
  projectId: string,
  _amount: number = 0,
  date: string = todayIsoDate()
): Project | undefined {
  return syncProjectMoneyFromPayments(projectId, date);
}

/** @deprecated استخدم queueProjectAfterPayment */
export function applyDepositToProject(
  projectId: string,
  amount: number,
  date: string = todayIsoDate()
): Project | undefined {
  return queueProjectAfterPayment(projectId, amount, date);
}

/** تسجيل دفعة + دخول قائمة الانتظار (أو تحديث المال للمشاريع المكتملة) */
export function scheduleProjectWithDeposit(input: {
  projectId: string;
  amount: number;
  date?: string;
  method?: Payment["method"];
  note?: string;
}): Project | undefined {
  const project = getProjectById(input.projectId);
  if (!project) return undefined;

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
      note: input.note?.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
  }

  return syncProjectMoneyFromPayments(project.id, date);
}

/** بدء التنفيذ في الورشة */
export function startWorkshopProject(projectId: string): Project | undefined {
  const project = getProjectById(projectId);
  if (!project) return undefined;
  if (project.workflow === "quote" && !projectHasPayment(project)) {
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

/** المشروع التالي للتنفيذ: أول عنصر في قائمة الانتظار */
export function getNextUpProject(): Project | undefined {
  return listQueuedProjects()[0];
}

/** تغيير ترتيب قائمة الانتظار */
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
