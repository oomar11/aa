"use client";

import { useEffect, useState } from "react";

type OrientationLockType =
  | "portrait"
  | "portrait-primary"
  | "portrait-secondary"
  | "landscape"
  | "landscape-primary"
  | "landscape-secondary"
  | "any"
  | "natural";

type OrientationWithLock = ScreenOrientation & {
  lock?: (orientation: OrientationLockType) => Promise<void>;
};

function isPhoneViewport(): boolean {
  return window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
}

function isLandscape(): boolean {
  if (window.matchMedia("(orientation: landscape)").matches) return true;
  return window.innerWidth > window.innerHeight;
}

async function lockPortraitNative(): Promise<boolean> {
  const orientation = screen.orientation as OrientationWithLock | undefined;
  if (!orientation || typeof orientation.lock !== "function") return false;

  for (const mode of ["portrait", "portrait-primary"] as const) {
    try {
      await orientation.lock(mode);
      return true;
    } catch {
      // المتصفح رفض هذا الوضع — نجرب التالي
    }
  }
  return false;
}

/**
 * قفل اتجاه عمودي على الموبايل بدون لفّ شكل البرنامج.
 * - يحاول Screen Orientation API (يشتغل قوي في الـ PWA)
 * - لو الجهاز اتقلب للعرض: شاشة تمنع الاستخدام لحد ما يرجع عمودي
 */
export function LockPortraitOrientation() {
  const [blockLandscape, setBlockLandscape] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    const sync = async () => {
      if (!isPhoneViewport()) {
        if (!cancelled) setBlockLandscape(false);
        return;
      }

      await lockPortraitNative();
      if (cancelled) return;
      setBlockLandscape(isLandscape());
    };

    void sync();

    const onChange = () => {
      void sync();
    };

    // كتير من المتصفحات بتحتاج لمسة مستخدم قبل ما تقفل الاتجاه
    const onGesture = () => {
      void lockPortraitNative().then(() => {
        if (!cancelled) setBlockLandscape(isPhoneViewport() && isLandscape());
      });
    };

    window.addEventListener("orientationchange", onChange);
    window.addEventListener("resize", onChange);
    document.addEventListener("visibilitychange", onChange);
    document.addEventListener("fullscreenchange", onChange);
    window.addEventListener("pointerdown", onGesture, { passive: true });
    window.addEventListener("touchstart", onGesture, { passive: true });

    return () => {
      cancelled = true;
      window.removeEventListener("orientationchange", onChange);
      window.removeEventListener("resize", onChange);
      document.removeEventListener("visibilitychange", onChange);
      document.removeEventListener("fullscreenchange", onChange);
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("touchstart", onGesture);
    };
  }, []);

  if (!blockLandscape) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#152033] px-8 text-center"
      style={{ touchAction: "none" }}
    >
      <div className="max-w-sm space-y-3 text-white">
        <p className="text-lg font-semibold">استخدم التليفون بالطول</p>
        <p className="text-sm text-white/75">
          البرنامج مقفول على الوضع العمودي — رجّع التليفون عشان تكمل.
        </p>
      </div>
    </div>
  );
}
