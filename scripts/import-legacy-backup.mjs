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

function paneNode(id) {
  return { type: "pane", id };
}

function buildStableCols(leafCount, idPrefix) {
  const count = Math.max(1, Math.min(6, leafCount));
  if (count === 1) return paneNode(`${idPrefix}-1`);
  return {
    type: "split",
    dir: "v",
    ratios: Array.from({ length: count }, () => 1),
    children: Array.from({ length: count }, (_, i) =>
      paneNode(`${idPrefix}-${i + 1}`)
    ),
  };
}

function buildApproxLayout(leafCount, idPrefix, topFixed) {
  const bottom = buildStableCols(leafCount, idPrefix);
  if (!topFixed) return bottom;
  return {
    type: "split",
    dir: "h",
    ratios: [0.28, 0.72],
    children: [paneNode(`${idPrefix}-top`), bottom],
  };
}

function listPaneIds(node) {
  if (node.type === "pane") return [node.id];
  if (node.type === "empty") return [];
  return node.children.flatMap(listPaneIds);
}

function normalizeItemName(name) {
  return String(name || "")
    .replace(/\u0640/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLeafCount(name) {
  const n = normalizeItemName(name);
  const digit = n.match(/(\d+)\s*ضلف/);
  if (digit) {
    const count = Number(digit[1]);
    if (Number.isFinite(count) && count >= 1) return Math.min(6, count);
  }
  if (/ضلفتين|٢\s*ضلف|2\s*ضلفة/.test(n)) return 2;
  if (/ثلاث(?:ة)?\s*ضلف|٣\s*ضلف|3\s*ضلفة/.test(n)) return 3;
  if (/أربع(?:ة)?\s*ضلف|٤\s*ضلف|4\s*ضلفة/.test(n)) return 4;
  if (/واحد(?:ة)?\s*ضلف|1\s*ضلفة|ضلفة\s*واحد/.test(n)) return 1;
  return null;
}

function inferOpeningFamily(name) {
  const n = normalizeItemName(name);
  if (/باب/.test(n)) {
    if (/جرار|سحاب/.test(n)) return "sliding";
    return "door";
  }
  if (/جرار|سحاب/.test(n)) return "sliding";
  if (/قلاب/.test(n)) return "tilt";
  if (/مفصلي|دوران/.test(n)) return "casement";
  if (/ثابت/.test(n) && !/قلاب|مفصلي|جرار|باب/.test(n)) return "fixed";
  if (/حمام/.test(n)) return "tilt";
  if (/بلكونة|صاله|صالة|غرفه|غرفة|مطبخ/.test(n)) return "sliding";
  return "casement";
}

function defaultLeafCount(family, name) {
  const explicit = extractLeafCount(name);
  if (explicit != null) return explicit;
  switch (family) {
    case "sliding":
      return 2;
    case "casement":
      return /مفصلي/.test(name) ? 2 : 1;
    case "door":
      return 1;
    case "tilt":
      return 1;
    default:
      return 1;
  }
}

function styleForFamily(family, leafCount) {
  if (family === "door") return "door";
  if (family === "sliding") return leafCount >= 3 ? "sliding-3" : "sliding-2";
  if (family === "fixed") return "fixed";
  if (family === "tilt") return leafCount >= 2 ? "casement-2" : "casement-1";
  return leafCount >= 2 ? "casement-2" : "casement-1";
}

function templateIdFor(leafCount, topFixed) {
  if (topFixed) {
    if (leafCount <= 1) return "t01-single";
    if (leafCount === 2) return "t10-t-top-2";
    return "t08-t-top-3";
  }
  if (leafCount <= 1) return "t01-single";
  if (leafCount === 2) return "t02-2v";
  if (leafCount === 3) return "t03-3v";
  return "t04-4v";
}

function hingeOpening(index, name) {
  if (/فتح\s*شمال|يفتح\s*شمال|شمال/.test(name) && !/يمين/.test(name)) {
    return "casement-left";
  }
  if (/فتح\s*يمين|يفتح\s*يمين|لليمين|برا\s*لليمين/.test(name)) {
    return "casement-right";
  }
  return index % 2 === 0 ? "casement-right" : "casement-left";
}

function slidingOpening(index) {
  return index % 2 === 0 ? "sliding-right" : "sliding-left";
}

function defaultPane(partial) {
  return {
    opening: "fixed",
    bouclier: false,
    bouclierManual: false,
    grid: "solid",
    sandwichPanels: false,
    panelCells: [],
    mesh: false,
    isDoor: false,
    ...partial,
  };
}

function approxDrawingFromName(rawName, itemId) {
  const name = normalizeItemName(rawName);
  const family = inferOpeningFamily(name);
  const topFixed = /ثابت\s*علو|ثابت\s*فوق|\+\s*ثابت|ثابت\s*بالطول/.test(name);
  const hasExhaust = /شفاط/.test(name);
  const isPanelDoor = /بنل|بانل|panel|ساندوتش/.test(name);
  let leafCount = defaultLeafCount(family, name);
  if (hasExhaust && leafCount <= 1 && family !== "door") {
    leafCount = 2;
  }
  const idPrefix = `leg-${itemId}`.replace(/[^a-zA-Z0-9_-]/g, "");
  const useTopFixed = topFixed && family !== "door";
  const layout = buildApproxLayout(
    Math.max(1, leafCount),
    idPrefix,
    useTopFixed
  );
  const ids = listPaneIds(layout);
  const panes = {};

  ids.forEach((id, index) => {
    const isTopTransom = useTopFixed && index === 0 && ids.length > 1;
    const operableIds = useTopFixed ? ids.slice(1) : ids;
    const operableIndex = operableIds.indexOf(id);
    let opening = "fixed";
    let isDoor = false;

    if (isTopTransom) {
      opening = "fixed";
    } else if (
      hasExhaust &&
      operableIndex === operableIds.length - 1 &&
      family !== "door"
    ) {
      opening = "exhaust";
    } else if (family === "door") {
      isDoor = true;
      opening = hingeOpening(Math.max(0, operableIndex), name);
    } else if (family === "sliding") {
      opening = slidingOpening(Math.max(0, operableIndex));
      isDoor = /باب/.test(name);
    } else if (family === "tilt") {
      opening = "tilt";
    } else if (family === "fixed") {
      opening = "fixed";
    } else {
      opening = hingeOpening(Math.max(0, operableIndex), name);
    }

    panes[id] = defaultPane({
      opening,
      isDoor,
      sandwichPanels: isDoor && isPanelDoor,
      bouclier: false,
    });
  });

  if (family === "casement" && leafCount === 2 && !hasExhaust) {
    const operable = useTopFixed ? ids.slice(1) : ids;
    if (operable.length >= 2) {
      panes[operable[0]] = defaultPane({
        ...panes[operable[0]],
        opening: "casement-right",
        bouclier: true,
      });
      panes[operable[1]] = defaultPane({
        ...panes[operable[1]],
        opening: "casement-left",
        bouclier: true,
      });
    }
  }

  return {
    style: styleForFamily(family, leafCount),
    templateId: templateIdFor(leafCount, useTopFixed),
    layout,
    panes,
  };
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
  // مدفوع → قائمة انتظار فقط. التنفيذ يبدأ يدوياً من الورشة.
  if (paidAmount > 0) {
    return { workflow: "queued", status: "open" };
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
  const payments = [];
  let itemsCount = 0;
  let queueCursor = 1;
  const projectSaleById = new Map();
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
      const id = item.id != null ? String(item.id) : `${projectId}-item-${index + 1}`;
      const drawing = approxDrawingFromName(name, id);
      return {
        id,
        name,
        nameIsCustom: true,
        style: drawing.style,
        templateId: drawing.templateId,
        layout: drawing.layout,
        panes: drawing.panes,
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
    const saleTotal = Math.max(
      totalAmount > 0 ? totalAmount : 0,
      Math.round(saleFromItems * 100) / 100,
      paidAmount
    );
    projectSaleById.set(projectId, saleTotal);

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
  }

  for (const contract of contracts) {
    const amount = num(contract.amount, 0);
    if (amount <= 0) continue;
    if (!MONEY_CONTRACT_TYPES.has(contract.type)) continue;
    const project = projectByLegacyId.get(String(contract.projectId));
    if (!project) continue;
    const kindLabel =
      contract.type === "agreement" ? "اتفاق / مقدمة" : "إيصال استلام";
    payments.push({
      id: asId("pay", contract.id),
      customerId: project.customerId,
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
      payments.push({
        id: asId("pay-adj", project.id),
        customerId: converted.customerId,
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
    const owned = convertedProjects.filter((p) => p.customerId === customer.id);
    const owed = owned.reduce(
      (sum, p) => sum + (projectSaleById.get(p.id) ?? 0),
      0
    );
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
    "upvc-invoices": JSON.stringify([]),
    "upvc-payments": JSON.stringify(payments),
    "upvc-expenses": JSON.stringify(expenses),
  };

  return {
    sharedData,
    summary: {
      customers: customers.length,
      projects: convertedProjects.length,
      items: itemsCount,
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
