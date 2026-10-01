import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXTS = [".ts", ".tsx", "/index.ts"];

function tryResolve(base) {
  if (path.extname(base)) return existsSync(base) ? base : null;
  for (const ext of EXTS) if (existsSync(base + ext)) return base + ext;
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const hit = tryResolve(path.join(root, specifier.slice(2)));
    if (hit) return nextResolve(pathToFileURL(hit).href, context);
  } else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    const parent = fileURLToPath(context.parentURL);
    if (parent.endsWith(".ts") || parent.endsWith(".tsx")) {
      const hit = tryResolve(path.resolve(path.dirname(parent), specifier));
      if (hit) return nextResolve(pathToFileURL(hit).href, context);
    }
  }
  return nextResolve(specifier, context);
}
