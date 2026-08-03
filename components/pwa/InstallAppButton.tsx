"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome|Android/.test(ua);
  return isIOS && (isSafari || /iPad|iPhone|iPod/.test(ua));
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [installed, setInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [iosDevice, setIosDevice] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    setIosDevice(isIosSafari());

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }

    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
      setShowIosHint(false);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card px-4 py-3.5">
        <p className="text-sm font-medium text-foreground">التطبيق مثبّت</p>
        <p className="mt-1 text-xs text-muted">
          UPVC Design يعمل كتطبيق على جهازك.
        </p>
      </section>
    );
  }

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
    if (iosDevice) {
      setShowIosHint(true);
    }
  }

  const canPrompt = Boolean(deferred) || iosDevice;

  if (!canPrompt && !showIosHint) {
    return (
      <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card px-4 py-3.5">
        <p className="text-sm font-medium text-foreground">تثبيت التطبيق</p>
        <p className="mt-1 text-xs text-muted">
          من متصفح Chrome على Android: القائمة ← تثبيت التطبيق. على iPhone:
          مشاركة ← إضافة إلى الشاشة الرئيسية.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card px-4 py-3.5">
      <p className="text-sm font-medium text-foreground">تثبيت التطبيق</p>
      <p className="mt-1 text-xs text-muted">
        نزّل UPVC Design على الشاشة الرئيسية وافتحه كلوجو التطبيق.
      </p>
      <button
        type="button"
        onClick={handleInstall}
        className="mt-3 h-11 w-full rounded-xl bg-primary text-sm font-semibold text-white transition-colors hover:opacity-95"
      >
        تثبيت التطبيق
      </button>
      {showIosHint ? (
        <ol className="mt-3 list-decimal space-y-1 pr-4 text-xs text-muted">
          <li>اضغط زر المشاركة في Safari</li>
          <li>اختر «إضافة إلى الشاشة الرئيسية»</li>
          <li>أكد الإضافة — هتظهر أيقونة UPVC</li>
        </ol>
      ) : null}
    </section>
  );
}
