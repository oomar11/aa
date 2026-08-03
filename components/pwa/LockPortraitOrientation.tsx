"use client";

import { useEffect } from "react";

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

const PORTRAIT_LOCK_CLASS = "portrait-lock-active";

/**
 * يقفل اتجاه الشاشة عمودي على الموبايل:
 * 1) Screen Orientation API (PWA / ملء الشاشة)
 * 2) كلاس CSS يعيد تدوير الواجهة عمودي لو الجهاز اتقلب
 */
export function LockPortraitOrientation() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const tryNativeLock = () => {
      const orientation = screen.orientation as OrientationWithLock | undefined;
      if (!orientation || typeof orientation.lock !== "function") return;
      void orientation.lock("portrait").catch(() => {
        // المتصفح رفض — نعتمد على CSS
      });
    };

    const syncCssLock = () => {
      const force =
        window.matchMedia("(max-width: 900px)").matches &&
        window.matchMedia("(orientation: landscape)").matches;
      document.documentElement.classList.toggle(PORTRAIT_LOCK_CLASS, force);
    };

    const onChange = () => {
      tryNativeLock();
      syncCssLock();
    };

    tryNativeLock();
    syncCssLock();

    window.addEventListener("orientationchange", onChange);
    window.addEventListener("resize", onChange);
    document.addEventListener("visibilitychange", onChange);
    document.addEventListener("fullscreenchange", onChange);

    return () => {
      window.removeEventListener("orientationchange", onChange);
      window.removeEventListener("resize", onChange);
      document.removeEventListener("visibilitychange", onChange);
      document.removeEventListener("fullscreenchange", onChange);
      document.documentElement.classList.remove(PORTRAIT_LOCK_CLASS);
    };
  }, []);

  return null;
}
