#!/usr/bin/env node
/**
 * @deprecated استخدم: npm run import:legacy
 * يوجّه لنفس سكربت TypeScript حتى لا يتكرر منطق الرسم التقريبي.
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tsScript = path.join(__dirname, "import-legacy-backup.ts");
const result = spawnSync(
  "npx",
  ["--yes", "tsx", tsScript, ...process.argv.slice(2)],
  { stdio: "inherit", shell: true }
);
process.exit(result.status ?? 1);
