"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        // ادفع تحديث الـ SW فورًا عشان إصلاحات الواجهة متتحبسش في كاش قديم
        void reg.update();
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          // صفحة واحدة بعد ما الـ SW الجديد يمسك — بدون لوب
          if (sessionStorage.getItem("sw-refreshed") === "1") return;
          sessionStorage.setItem("sw-refreshed", "1");
          window.location.reload();
        });
      } catch {
        // Ignore registration failures (e.g. private mode / unsupported).
      }
    };

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", () => void register(), { once: true });
    }
  }, []);

  return null;
}
