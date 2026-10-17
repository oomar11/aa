import assert from "node:assert/strict";
import { test } from "node:test";
import { readWorkshopStore } from "@/lib/storage/server-store";

test("Supabase failure does not silently fall back to DATABASE_URL", async () => {
  const saved = {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    db: process.env.DATABASE_URL,
    fetch: globalThis.fetch,
  };
  const errorLog = console.error;
  process.env.SUPABASE_URL = "https://dead-project.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-key";
  // لو الكود رجع للـ fallback هيحاول يتصل بالرابط ده بدل ما يرمي الخطأ الأصلي
  process.env.DATABASE_URL = "postgres://u:p@127.0.0.1:1/stale";
  const hosts: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const raw = input instanceof Request ? input.url : String(input);
    hosts.push(new URL(raw).hostname);
    throw new TypeError("fetch failed");
  }) as typeof fetch;
  console.error = () => {};
  try {
    await assert.rejects(readWorkshopStore(), /fetch failed/);
    assert.ok(hosts.length > 0);
    assert.ok(
      hosts.every((h) => h === "dead-project.supabase.co"),
      `اتصل بقاعدة تانية: ${hosts.join(", ")}`
    );
  } finally {
    console.error = errorLog;
    globalThis.fetch = saved.fetch;
    for (const [name, value] of [
      ["SUPABASE_URL", saved.url],
      ["SUPABASE_ANON_KEY", saved.key],
      ["DATABASE_URL", saved.db],
    ] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
