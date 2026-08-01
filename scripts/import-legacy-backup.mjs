#!/usr/bin/env node
/**
 * يحوّل باكب البرنامج القديم إلى صيغة الورشة ويكتب data/workshop-kv.json
 *
 * الاستخدام:
 *   node scripts/import-legacy-backup.mjs [path/to/backup.json]
 *   node scripts/import-legacy-backup.mjs --out data/imports/upvc-from-legacy.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const args = { input: null, out: null, writeStore: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") {
      args.out = argv[++i];
      args.writeStore = false;
    } else if (a === "--store-only") {
      args.writeStore = true;
    } else if (a === "--both") {
      args.writeStore = true;
    } else if (!a.startsWith("-") && !args.input) {
      args.input = a;
    }
  }
  return args;
}

// —— inline converter (mirrors lib/legacy-backup-import.ts) ——
const MONEY_CONTRACT_TYPES = new Set(["receipt", "agreement"]);
const SHARED_KEYS = [
  "upvc-customers",
  "upvc-deleted-customers",
  "upvc-projects",
  "upvc-deleted-projects",
  "upvc-project-items",
  "upvc-material-systems",
  "upvc-company",
  "upvc-pricing",
  "upvc-invoices",
  "upvc-payments",
  "upvc-expenses",
];

function asId(prefix, id) {
  return `${prefix}-${id}`;
}
function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function cmToMm(cm) {
  const n = num(cm, 0);
  if (n <= 0) return 1000;
  if (n >= 800) return Math.round(n);
  return Math.round(n * 10);
}
function inferStyle(name) {
  const n = name.toLowerCase();
  if (n.includes("باب")) return "door";
  if (n.includes("جرار") || n.includes("سحاب")) return "sliding-2";
  if (n.includes("قلاب")) return "casement-1";
  if (n.includes("ثابت")) return "fixed";
  if (n.includes("مفصلي")) return "casement-2";
  return "casement-1";
}
function inferFrameColor(color) {
  const c = (color ?? "").trim().toLowerCase();
  if (c.includes("بيج") || c.includes("كريمي")) return "beige";
  if (c.includes("رماد")) return "gray";
  if (c.includes("خشب") || c.includes("بلوط")) return "wood";
  if (c.includes("أسود") || c.includes("اسود") || c.includes("أنثرا")) return "black";
  return "white";
}
function mapWorkflow(status, paidAmount) {
  const s = (status ?? "").toLowerCase();
  if (s === "completed" || s === "done" || s === "finished") {
    return { workflow: "done", status: "done" };
  }
  if (paidAmount > 0) {
    if (s === "waiting" || s === "queued" || s === "pending") {
      return { workflow: "queued", status: "open" };
    }
    return { workflow: "workshop", status: "open" };
  }
  return { workflow: "quote", status: "open" };
}
function mapExpenseCategory(category) {
  const c = (category ?? "").trim();
  if (!c) return "مصروفات عامة";
  if (c === "مصنعيات" || c === "عمالة") return "أجور";
  return c;
}

function convertLegacyBackup(backup) {
  const clients = Array.isArray(backup.clients) ? backup.clients : [];
  const projects = Array.isArray(backup.projects) ? backup.projects : [];
  const contracts = Array.isArray(backup.contracts) ? backup.contracts : [];
  const expensesRaw = Array.isArray(backup.expenses) ? backup.expenses : [];

  const customerByLegacyId = new Map();
  const customers = clients.map((client) => {
    const id = asId("c", client.id);
    const customer = {
      id,
      name: (client.name ?? "").trim() || `عميل ${client.id}`,
      phone: (client.phone ?? "").trim(),
      address: client.address?.trim() || undefined,
      balance: 0,
      lastDealAt: client.createdAt ?? new Date().toISOString(),
      projectsCount: 0,
    };
    customerByLegacyId.set(String(client.id), customer);
    return customer;
  });

  const projectItems = {};
  const convertedProjects = [];
  const invoices = [];
  const payments = [];
  let itemsCount = 0;
  let queueCursor = 1;
  const projectByLegacyId = new Map();

  for (const project of projects) {
    const projectId = asId("p", project.id);
    const customer = customerByLegacyId.get(String(project.clientId));
    if (!customer) continue;

    const paidAmount = num(project.paidAmount, 0);
    const totalAmount = num(project.totalAmount, 0);
    const { workflow, status } = mapWorkflow(project.status, paidAmount);

    const items = (project.items ?? []).map((item, index) => {
      const qty = Math.max(1, Math.round(num(item.quantity, 1)));
      const unitPrice = num(item.unitPrice, 0);
      const total = num(item.total, unitPrice * qty);
      const perUnit =
        item.pricingMethod !== "per_meter"
          ? unitPrice > 0
            ? unitPrice
            : qty > 0
              ? total / qty
              : total
          : null;
      const widthMm = cmToMm(item.width);
      const heightMm = cmToMm(item.height);
      const area = (widthMm * heightMm) / 1_000_000;
      const pricePerSqm =
        item.pricingMethod === "per_meter"
          ? unitPrice
          : area > 0 && perUnit
            ? perUnit / area
            : 2600;
      const name = (item.name ?? `بند ${index + 1}`).trim() || `بند ${index + 1}`;
      const parts = [];
      if (item.profileType?.trim()) parts.push(`قطاع: ${item.profileType.trim()}`);
      if (item.glassType?.trim()) parts.push(`زجاج: ${item.glassType.trim()}`);
      if (item.color?.trim()) parts.push(`لون: ${item.color.trim()}`);
      if (item.notes?.trim()) parts.push(item.notes.trim());
      return {
        id: item.id != null ? String(item.id) : `${projectId}-item-${index + 1}`,
        name,
        nameIsCustom: true,
        style: inferStyle(name),
        frameColor: inferFrameColor(item.color),
        widthMm,
        heightMm,
        qty,
        pricePerSqm: Number.isFinite(pricePerSqm) ? Math.round(pricePerSqm) : 2600,
        notes: parts.join(" · ") || undefined,
        specialPrice:
          perUnit != null && perUnit > 0 ? Math.round(perUnit * 100) / 100 : null,
        discountId: "none",
      };
    });
    projectItems[projectId] = items;
    itemsCount += items.length;

    const saleFromItems = items.reduce((sum, item) => {
      const qty = Math.max(1, item.qty || 1);
      if (item.specialPrice != null && item.specialPrice > 0) {
        return sum + item.specialPrice * qty;
      }
      return (
        sum +
        ((item.widthMm * item.heightMm) / 1_000_000) * item.pricePerSqm * qty
      );
    }, 0);
    const invoiceTotal = Math.max(
      totalAmount > 0 ? totalAmount : 0,
      Math.round(saleFromItems * 100) / 100,
      paidAmount
    );

    let depositAt;
    if (paidAmount > 0) {
      depositAt = project.startDate
        ? `${project.startDate}T00:00:00.000Z`
        : project.createdAt ?? new Date().toISOString();
    }

    const converted = {
      id: projectId,
      customerId: customer.id,
      name: (project.name ?? "").trim() || `مشروع ${project.id}`,
      location: project.description?.trim() || undefined,
      createdAt: project.createdAt ?? new Date().toISOString(),
      status,
      workflow,
      depositAt,
      depositAmount: paidAmount > 0 ? paidAmount : undefined,
      queueOrder:
        workflow === "queued" || workflow === "workshop"
          ? queueCursor++
          : undefined,
      itemsCount: items.length,
    };
    convertedProjects.push(converted);
    projectByLegacyId.set(String(project.id), converted);

    customer.projectsCount += 1;
    if (project.createdAt) {
      if (
        !customer.lastDealAt ||
        new Date(project.createdAt) > new Date(customer.lastDealAt)
      ) {
        customer.lastDealAt = project.createdAt;
      }
    }

    if (invoiceTotal > 0) {
      const invoiceId = asId("inv", project.id);
      let invoiceStatus = "issued";
      if (paidAmount <= 0) invoiceStatus = "issued";
      else if (paidAmount + 0.01 >= invoiceTotal) invoiceStatus = "paid";
      else invoiceStatus = "partial";
      invoices.push({
        id: invoiceId,
        number: `INV-${String(project.id).padStart(4, "0")}`,
        customerId: customer.id,
        projectId,
        date:
          (project.startDate ?? project.createdAt ?? "").slice(0, 10) ||
          new Date().toISOString().slice(0, 10),
        lines: [
          {
            id: `${invoiceId}-line-1`,
            description: converted.name,
            amount: invoiceTotal,
          },
        ],
        total: invoiceTotal,
        note: "مستورد من البرنامج القديم",
        status: invoiceStatus,
        createdAt: project.createdAt ?? new Date().toISOString(),
      });
    }
  }

  for (const contract of contracts) {
    const amount = num(contract.amount, 0);
    if (amount <= 0) continue;
    if (!MONEY_CONTRACT_TYPES.has(contract.type)) continue;
    const project = projectByLegacyId.get(String(contract.projectId));
    if (!project) continue;
    const invoice = invoices.find((i) => i.projectId === project.id);
    const kindLabel =
      contract.type === "agreement" ? "اتفاق / مقدمة" : "إيصال استلام";
    payments.push({
      id: asId("pay", contract.id),
      customerId: project.customerId,
      invoiceId: invoice?.id,
      projectId: project.id,
      kind: contract.type === "agreement" ? "deposit" : "payment",
      amount,
      date:
        (contract.date ?? "").slice(0, 10) ||
        new Date().toISOString().slice(0, 10),
      method: "cash",
      note: [kindLabel, contract.details?.trim()].filter(Boolean).join(" — "),
      createdAt: contract.date ?? new Date().toISOString(),
    });
  }

  for (const project of projects) {
    const converted = projectByLegacyId.get(String(project.id));
    if (!converted) continue;
    const paidAmount = num(project.paidAmount, 0);
    if (paidAmount <= 0) continue;
    const already = payments
      .filter((p) => p.projectId === converted.id)
      .reduce((sum, p) => sum + p.amount, 0);
    const remainder = Math.round((paidAmount - already) * 100) / 100;
    if (remainder > 0.01) {
      const invoice = invoices.find((i) => i.projectId === converted.id);
      payments.push({
        id: asId("pay-adj", project.id),
        customerId: converted.customerId,
        invoiceId: invoice?.id,
        projectId: converted.id,
        kind: "payment",
        amount: remainder,
        date:
          (project.updatedAt ?? project.createdAt ?? "").slice(0, 10) ||
          new Date().toISOString().slice(0, 10),
        method: "cash",
        note: "تسوية من إجمالي المدفوع (البرنامج القديم)",
        createdAt:
          project.updatedAt ?? project.createdAt ?? new Date().toISOString(),
      });
    }
  }

  for (const customer of customers) {
    const owed = invoices
      .filter((i) => i.customerId === customer.id && i.status !== "cancelled")
      .reduce((sum, i) => sum + i.total, 0);
    const paid = payments
      .filter((p) => p.customerId === customer.id)
      .reduce((sum, p) => sum + p.amount, 0);
    customer.balance = Math.max(0, Math.round((owed - paid) * 100) / 100);
  }

  const expenses = expensesRaw.map((expense) => {
    const projectId =
      expense.projectId != null && expense.projectId !== ""
        ? asId("p", expense.projectId)
        : undefined;
    const linked = projectId && projectItems[projectId] ? projectId : undefined;
    return {
      id: asId("exp", expense.id),
      category: mapExpenseCategory(expense.category),
      description: (expense.description ?? "").trim() || "مصروف",
      amount: num(expense.amount, 0),
      date:
        (expense.date ?? "").slice(0, 10) ||
        new Date().toISOString().slice(0, 10),
      projectId: linked,
      note: expense.type === "project" ? "مصروف مشروع (مستورد)" : undefined,
      createdAt: expense.date
        ? `${String(expense.date).slice(0, 10)}T00:00:00.000Z`
        : new Date().toISOString(),
    };
  });

  const settingsRaw = backup.settings;
  const settings = Array.isArray(settingsRaw)
    ? settingsRaw[0]
    : settingsRaw ?? null;
  const company = {
    name: settings?.companyName?.trim() || "ويندور",
    phone: settings?.phone?.trim() || undefined,
    address: settings?.address?.trim() || undefined,
    note: settings?.contractTerms?.trim() || undefined,
  };

  const skippedKeys = [
    "itemTypes",
    "defaultStages",
    "employees",
    "attendance",
    "advances",
    "payroll",
    "projectAssignments",
    "notifications",
  ].filter((key) => {
    const value = backup[key];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });

  const sharedData = {
    "upvc-customers": JSON.stringify(customers),
    "upvc-deleted-customers": JSON.stringify([]),
    "upvc-projects": JSON.stringify(convertedProjects),
    "upvc-deleted-projects": JSON.stringify([]),
    "upvc-project-items": JSON.stringify(projectItems),
    "upvc-material-systems": null,
    "upvc-company": JSON.stringify(company),
    "upvc-pricing": null,
    "upvc-invoices": JSON.stringify(invoices),
    "upvc-payments": JSON.stringify(payments),
    "upvc-expenses": JSON.stringify(expenses),
  };

  return {
    sharedData,
    summary: {
      customers: customers.length,
      projects: convertedProjects.length,
      items: itemsCount,
      invoices: invoices.length,
      payments: payments.length,
      expenses: expenses.length,
      skippedKeys,
    },
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const input =
    args.input ||
    path.join(root, "data/imports/backup-2026-08-01.json");
  if (!existsSync(input)) {
    console.error("ملف الباكب غير موجود:", input);
    process.exit(1);
  }

  const backup = JSON.parse(readFileSync(input, "utf8"));
  if (!backup.clients && !backup.projects) {
    console.error("الملف لا يبدو باكب البرنامج القديم (clients/projects)");
    process.exit(1);
  }

  const { sharedData, summary } = convertLegacyBackup(backup);
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      ...sharedData,
      "upvc-unit": "cm",
      "upvc-data-version": "3-clean-start",
    },
    meta: { source: "legacy-workshop", summary },
  };

  const outPath =
    args.out || path.join(root, "data/imports/upvc-from-legacy.json");
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.log("كتبنا باكب الورشة:", outPath);

  const storePath = path.join(root, "data/workshop-kv.json");
  const store = {
    revision: 1,
    updatedAt: new Date().toISOString(),
    data: Object.fromEntries(SHARED_KEYS.map((k) => [k, sharedData[k] ?? null])),
  };
  writeFileSync(storePath, JSON.stringify(store, null, 2), "utf8");
  console.log("كتبنا مخزن الورشة:", storePath);
  console.log("الملخص:", summary);

  // تحقق سريع من المبالغ
  const payments = JSON.parse(sharedData["upvc-payments"]);
  const projects = JSON.parse(sharedData["upvc-projects"]);
  const paidSum = payments.reduce((s, p) => s + p.amount, 0);
  const depositSum = projects.reduce((s, p) => s + (p.depositAmount || 0), 0);
  console.log("مجموع الدفعات:", paidSum, "| مجموع depositAmount:", depositSum);
}

main();
