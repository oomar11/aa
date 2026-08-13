import {
  loadExpenses,
  loadPayments,
  paymentChannelLabel,
  type Expense,
  type Payment,
} from "@/lib/accounting";
import { getCustomerById } from "@/lib/customers";
import { getProjectById } from "@/lib/projects";

export type MoneyMovementKind = "in" | "out";

export type MoneyMovement = {
  id: string;
  kind: MoneyMovementKind;
  date: string;
  amount: number;
  title: string;
  subtitle: string;
  methodLabel?: string;
  createdAt: string;
  projectId?: string;
  customerId?: string;
};

function paymentToMovement(payment: Payment): MoneyMovement {
  const project = payment.projectId
    ? getProjectById(payment.projectId)
    : undefined;
  const customer = getCustomerById(payment.customerId);
  return {
    id: `pay:${payment.id}`,
    kind: "in",
    date: payment.date,
    amount: payment.amount,
    title: customer?.name ?? "عميل",
    subtitle: [
      project?.name ?? "بدون مشروع",
      payment.note?.trim() || undefined,
    ]
      .filter(Boolean)
      .join(" · "),
    methodLabel: paymentChannelLabel(payment),
    createdAt: payment.createdAt,
    projectId: payment.projectId,
    customerId: payment.customerId,
  };
}

function expenseToMovement(expense: Expense): MoneyMovement {
  const project = expense.projectId
    ? getProjectById(expense.projectId)
    : undefined;
  return {
    id: `exp:${expense.id}`,
    kind: "out",
    date: expense.date,
    amount: expense.amount,
    title: expense.description,
    subtitle: [
      expense.category,
      project?.name ?? "مصروف ورشة عام",
      expense.note?.trim() || undefined,
    ]
      .filter(Boolean)
      .join(" · "),
    createdAt: expense.createdAt,
    projectId: expense.projectId,
    customerId: project?.customerId,
  };
}

/** دمج التحصيل والمصروف مرتّباً من الأحدث */
export function listMoneyMovements(
  payments: Payment[] = loadPayments(),
  expenses: Expense[] = loadExpenses()
): MoneyMovement[] {
  const rows: MoneyMovement[] = [
    ...payments.map(paymentToMovement),
    ...expenses.map(expenseToMovement),
  ];
  return rows.sort((a, b) => {
    const byDate = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (byDate !== 0) return byDate;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function moneyMovementsNet(movements: MoneyMovement[]): number {
  return movements.reduce((sum, row) => {
    return row.kind === "in" ? sum + row.amount : sum - row.amount;
  }, 0);
}
