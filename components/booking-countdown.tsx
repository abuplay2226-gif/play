"use client";

import { useEffect, useState } from "react";

type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "NO_SHOW";

type BookingCountdownProps = {
  startTime: Date | string;
  endTime: Date | string;
  status: BookingStatus;
  compact?: boolean;
};

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} س ${minutes} د ${seconds} ث`;
  }

  if (minutes > 0) {
    return `${minutes} د ${seconds} ث`;
  }

  return `${seconds} ث`;
}

export function BookingCountdown({ startTime, endTime, status, compact = false }: BookingCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();
  const startsIn = startMs - now;
  const endsIn = endMs - now;

  if (status === "CANCELLED") {
    return (
      <div className={compact ? "text-xs text-rose-300" : "rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200"}>
        <p className="font-bold">الحجز ملغي</p>
      </div>
    );
  }

  if (status === "NO_SHOW") {
    return (
      <div className={compact ? "text-xs text-slate-300" : "rounded-2xl border border-slate-500/30 bg-slate-500/10 p-3 text-sm text-slate-200"}>
        <p className="font-bold">لم يحضر العميل</p>
      </div>
    );
  }

  if (startsIn > 0) {
    return (
      <div className={compact ? "text-xs text-amber-300" : "rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200"}>
        <p className="font-bold">يبدأ بعد: {formatDuration(startsIn)}</p>
        <p className="mt-1 text-[11px] text-amber-100/80">سيبدأ في {new Date(startTime).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}</p>
      </div>
    );
  }

  if (endsIn > 0) {
    return (
      <div className={compact ? "text-xs text-emerald-300" : "rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200"}>
        <p className="font-bold">جاري الآن — باقي: {formatDuration(endsIn)}</p>
        <p className="mt-1 text-[11px] text-emerald-100/80">ينتهي في {new Date(endTime).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}</p>
      </div>
    );
  }

  return (
    <div className={compact ? "text-xs text-sky-300" : "rounded-2xl border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-200"}>
      <p className="font-bold">انتهى الحجز</p>
      <p className="mt-1 text-[11px] text-sky-100/80">تم انتهاء الوقت بنجاح</p>
    </div>
  );
}
