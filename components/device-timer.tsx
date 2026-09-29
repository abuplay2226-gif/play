"use client";

import { useEffect, useRef, useState } from "react";

// تشغيل نغمة تنبيه صوتية احترافية عبر Web Audio API
function playAlertChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";

    // نغمة جرس تنبيه ثنائية التردد (D5 -> A5)
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // في حال حظر الصوت التلقائي من المتصفح
  }
}

export function DeviceTimer({
  startTime,
  hourlyRate,
  initialCost = 0,
  isPaused = false,
  plannedMinutes = null,
  customerName = "العميل",
  deviceName = "الجهاز",
}: {
  startTime: string | Date;
  hourlyRate: number;
  initialCost?: number;
  isPaused?: boolean;
  plannedMinutes?: number | null;
  customerName?: string;
  deviceName?: string;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const alertedRef = useRef(false);

  useEffect(() => {
    const start = new Date(startTime).getTime();

    const calculate = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - start) / 1000));
      setElapsedSeconds(diff);

      // تشغيل التنبيه الصوتي لمرة واحدة فور انتهاء الوقت المحدد
      if (plannedMinutes && diff >= plannedMinutes * 60 && !alertedRef.current && !isPaused) {
        alertedRef.current = true;
        playAlertChime();
      }
    };

    calculate();
    if (isPaused) return;

    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [startTime, isPaused, plannedMinutes]);

  const currentCost = isPaused
    ? initialCost.toFixed(2)
    : (initialCost + (elapsedSeconds / 3600) * hourlyRate).toFixed(2);

  // إذا كانت الجلسة بوقت محدد مسبقاً (Fixed Duration)
  const isFixed = Boolean(plannedMinutes && plannedMinutes > 0);
  const totalPlannedSeconds = (plannedMinutes ?? 0) * 60;
  const remainingSeconds = totalPlannedSeconds - elapsedSeconds;
  const isExpired = isFixed && remainingSeconds <= 0;
  const isCloseToEnd = isFixed && remainingSeconds > 0 && remainingSeconds <= 600; // أقل من 10 دقائق

  // حساب ساعات ودقائق الوقت
  const formatTime = (totalSec: number) => {
    const absSec = Math.abs(totalSec);
    const h = Math.floor(absSec / 3600);
    const m = Math.floor((absSec % 3600) / 60);
    const s = absSec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const progressPercent = isFixed
    ? Math.min(100, Math.max(0, (elapsedSeconds / totalPlannedSeconds) * 100))
    : 100;

  return (
    <div className="space-y-3">
      {/* شريط الإشعار والتنبيه الصارخ عند انتهاء الوقت */}
      {isExpired && (
        <div className="rounded-xl border border-rose-500/50 bg-rose-500/20 p-2.5 text-center text-xs text-rose-200 animate-pulse font-bold flex items-center justify-center gap-1.5">
          <span>🔔</span>
          <span>انتهى وقت ({customerName}) على {deviceName}!</span>
        </div>
      )}

      {isCloseToEnd && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/15 p-2 text-center text-[11px] text-amber-300 font-bold">
          ⚠️ يتبقى أقل من 10 دقائق على انتهاء وقت الجلسة
        </div>
      )}

      {/* تفاصيل الوقت والشريط الزمني */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">
            {isFixed ? (isExpired ? "الوقت الإضافي المتجاوز:" : "الوقت المتبقي:") : "الوقت المنقضي:"}
          </span>
          <span className="font-bold text-slate-300">
            {isFixed ? `المحجوز: ${plannedMinutes} دقيقة` : "لعب مفتوح ♾️"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span
            className={`font-mono text-2xl font-black ${
              isExpired
                ? "text-rose-400 animate-pulse"
                : isCloseToEnd
                  ? "text-amber-400"
                  : "text-white"
            }`}
          >
            {isFixed ? (isExpired ? `+${formatTime(remainingSeconds)}` : formatTime(remainingSeconds)) : formatTime(elapsedSeconds)}
          </span>

          <span className="text-xl font-black text-amber-300 font-mono">
            {currentCost} <span className="text-xs font-normal">ج.م</span>
          </span>
        </div>

        {/* شريط التقدم المرئي للجلسات المحددة */}
        {isFixed && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isExpired ? "bg-rose-500" : isCloseToEnd ? "bg-amber-400" : "bg-sky-400"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}