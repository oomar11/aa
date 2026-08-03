"use client";

import { useEffect, useState } from "react";
import { WindowLogo } from "@/components/brand/WindowLogo";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

type InstallAppCardProps = {
  className?: string;
};

export function InstallAppButton({ className = "" }: InstallAppCardProps) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [installed, setInstalled] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [iosDevice, setIosDevice] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    setIosDevice(isIosDevice());

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }

    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
      setShowSteps(false);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
      setDeferred(null);
      return;
    }
    setShowSteps(true);
  }

  if (installed) {
    return (
      <section
        className={`overflow-hidden rounded-2xl border border-primary/25 bg-primary-soft px-4 py-4 ${className}`}
      >
        <div className="flex items-center gap-3">
          <WindowLogo size="lg" />
          <div className="min-w-0 text-right">
            <p className="text-sm font-bold text-foreground">التطبيق مثبّت</p>
            <p className="mt-0.5 text-xs text-muted">
              UPVC Design على شاشتك الرئيسية باللوجو الأزرق.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-border bg-card px-4 py-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <img
          src="/icons/icon-192.png"
          alt=""
          width={56}
          height={56}
          className="h-14 w-14 shrink-0 rounded-2xl shadow-sm"
        />
        <div className="min-w-0 flex-1 text-right">
          <p className="text-base font-bold text-foreground">نزّل التطبيق</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            ثبّت UPVC Design على التليفون — هيظهر باللوجو الأزرق على الشاشة
            الرئيسية زي أي تطبيق.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleInstall}
        className="mt-4 h-12 w-full rounded-xl bg-primary text-sm font-bold text-white transition-opacity hover:opacity-95"
      >
        {deferred ? "تثبيت الآن" : "إزاي أثبّت التطبيق؟"}
      </button>

      {showSteps || (!deferred && iosDevice) ? (
        <ol className="mt-3 list-decimal space-y-1.5 pr-5 text-xs leading-relaxed text-muted">
          {iosDevice ? (
            <>
              <li>افتح الموقع من Safari</li>
              <li>اضغط زر المشاركة (المربع والسهم)</li>
              <li>اختَر «إضافة إلى الشاشة الرئيسية»</li>
              <li>أكد — هتظهر أيقونة النافذة الزرقاء باسم UPVC</li>
            </>
          ) : (
            <>
              <li>افتح الموقع من Chrome على الموبايل</li>
              <li>اضغط ⋮ أعلى اليمين</li>
              <li>اختَر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»</li>
              <li>أكد — هتظهر أيقونة النافذة الزرقاء باسم UPVC</li>
            </>
          )}
        </ol>
      ) : null}
    </section>
  );
}
