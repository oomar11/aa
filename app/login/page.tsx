"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "تعذر تسجيل الدخول");
        return;
      }
      const next = params.get("next");
      const target =
        next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
      router.replace(target);
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="flex min-h-dvh w-full items-center justify-center px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo.png"
            alt="الوهيدي"
            className="mx-auto mb-3 h-auto w-40"
          />
          <h1 className="text-lg font-semibold text-foreground">
            تسجيل الدخول
          </h1>
          <p className="mt-1 text-xs text-muted">
            أدخل باسورد الورشة للمتابعة
          </p>
        </div>

        <label className="flex flex-col gap-1.5 text-right">
          <span className="text-sm font-medium">الباسورد</span>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldClass}
            placeholder="••••••••"
          />
        </label>

        {error && (
          <p className="rounded-2xl border border-[#b5543f]/30 bg-[#b5543f]/10 px-4 py-2 text-xs text-[#b5543f]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          className="rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        >
          {loading ? "جاري الدخول..." : "دخول"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
