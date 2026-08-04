/**
 * يحوّل باكب البرنامج القديم إلى صيغة الورشة ويكتب data/workshop-kv.json
 *
 * الاستخدام:
 *   npx tsx scripts/import-legacy-backup.ts [path/to/backup.json]
 *   npx tsx scripts/import-legacy-backup.ts --out data/imports/upvc-from-legacy.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  buildUpvcBackupFromLegacy,
  isLegacyBackup,
  type LegacyBackup,
} from "../lib/legacy-backup-import";
import { SHARED_STORAGE_KEYS } from "../lib/storage/keys";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function parseArgs(argv: string[]) {
  const args: { input: string | null; out: string | null } = {
    input: null,
    out: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--out") {
      args.out = argv[++i] ?? null;
    } else if (!a.startsWith("-") && !args.input) {
      args.input = a;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const input =
    args.input ||
    path.join(root, "data/imports/backup-2026-08-04.json");
  if (!existsSync(input)) {
    console.error("ملف الباكب غير موجود:", input);
    process.exit(1);
  }

  const backup = JSON.parse(readFileSync(input, "utf8")) as unknown;
  if (!isLegacyBackup(backup)) {
    console.error("الملف لا يبدو باكب البرنامج القديم (clients/projects)");
    process.exit(1);
  }

  const payload = buildUpvcBackupFromLegacy(backup as LegacyBackup);
  const outPath =
    args.out || path.join(root, "data/imports/upvc-from-legacy.json");
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.log("كتبنا باكب الورشة:", outPath);

  const storePath = path.join(root, "data/workshop-kv.json");
  const store = {
    revision: 1,
    updatedAt: new Date().toISOString(),
    data: Object.fromEntries(
      SHARED_STORAGE_KEYS.map((k) => [k, payload.data[k] ?? null])
    ),
  };
  writeFileSync(storePath, JSON.stringify(store, null, 2), "utf8");
  console.log("كتبنا مخزن الورشة:", storePath);
  console.log("الملخص:", payload.meta?.summary);

  const payments = JSON.parse(String(payload.data["upvc-payments"] ?? "[]")) as {
    amount: number;
  }[];
  const projects = JSON.parse(String(payload.data["upvc-projects"] ?? "[]")) as {
    depositAmount?: number;
  }[];
  const paidSum = payments.reduce((s, p) => s + p.amount, 0);
  const depositSum = projects.reduce((s, p) => s + (p.depositAmount || 0), 0);
  console.log("مجموع الدفعات:", paidSum, "| مجموع depositAmount:", depositSum);
}

main();
