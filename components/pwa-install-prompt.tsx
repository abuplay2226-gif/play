"use client";

import { useEffect, useState } from "react";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 1. فحص هل هو هاتف آيفون / آيباد في متصفح سفاري
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone = (window.navigator as any).standalone || window.matchMedia("(display-mode: standalone)").matches;

    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
    }

    // 2. التقاط حدث التثبيت لأجهزة أندرويد وكروم
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  if (isDismissed) return null;

  // شريط أجهزة الأندرويد والكمبيوتر
  if (isInstallable) {
    return (
      <div className="fixed bottom-16 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="rounded-2xl border border-amber-400/40 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 font-black text-slate-950 text-base">
              P
            </div>
            <div>
              <p className="text-xs font-black">تثبيت التطبيق على هاتفك</p>
              <p className="text-[10px] text-slate-400">وصول سريع وسلس بدون فتح المتصفح</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-3.5 py-1.5 text-xs font-black text-slate-950 shadow-md hover:brightness-110 transition active:scale-95"
            >
              تثبيت
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="rounded-lg p-1.5 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  }

  // إرشادات هواتف الآيفون (iOS Safari)
  if (isIOS && !showIOSPrompt) {
    return (
      <div className="fixed bottom-16 left-4 right-4 z-50 sm:hidden animate-in slide-in-from-bottom duration-300">
        <div className="rounded-2xl border border-sky-500/40 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📲</span>
            <div>
              <p className="text-xs font-bold text-white">تثبيت كـ تطبيق على الآيفون</p>
              <p className="text-[10px] text-slate-400">لتجربة شاشة كاملة وسريعة</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowIOSPrompt(true)}
              className="rounded-xl bg-sky-500 px-3 py-1.5 text-xs font-black text-slate-950"
            >
              كيف؟
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="rounded-lg p-1.5 text-slate-400 text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  }

  // نافذة إرشادات الآيفون
  if (showIOSPrompt) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-2xl text-right">
          <h3 className="text-base font-black text-amber-300 mb-2">طريقة التثبيت على الآيفون:</h3>
          <ol className="text-xs space-y-2 text-slate-300 list-decimal list-inside">
            <li>اضغط على زر المشاركة <strong>(Share / مربع به سهم للأعلى)</strong> في أسفل متصفح Safari.</li>
            <li>مرر القائمة للأسفل واختر <strong>&quot;إضافة إلى الشاشة الرئيسية&quot; (Add to Home Screen)</strong>.</li>
            <li>اضغط على <strong>&quot;إضافة&quot; (Add)</strong> في الزاوية العلوية.</li>
          </ol>
          <button
            onClick={() => {
              setShowIOSPrompt(false);
              setIsDismissed(true);
            }}
            className="mt-4 w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-white hover:bg-slate-700"
          >
            فهمت ذلك
          </button>
        </div>
      </div>
    );
  }

  return null;
}