import Link from "next/link";

import { requireRole } from "@/app/actions/auth";
import {
  createDevice,
  extendSessionDuration,
  getDevices,
  pauseDeviceSession,
  resumeDeviceSession,
  switchSessionMode,
  updateDeviceStatus,
} from "@/app/actions/devices";
import { CheckoutModal } from "@/components/checkout-modal";
import { DeviceTimer } from "@/components/device-timer";
import { OpenSessionModal } from "@/components/open-session-modal";
import { SiteShell } from "@/components/site-shell";
import { prisma } from "@/lib/prisma";
import type { DeviceStatus } from "@prisma/client";

export default async function DevicesPage() {
  await requireRole(["ADMIN", "CASHIER", "STAFF"]);

  const [devices, openShift, rawCustomers] = await Promise.all([
    getDevices(),
    prisma.shift.findFirst({ where: { status: "OPEN" }, include: { cashDrawer: true } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
  ]);

  const customerItems = rawCustomers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    loyaltyPts: c.loyaltyPts,
  }));

  return (
    <SiteShell title="إدارة الأجهزة والجلسات">
      {!openShift && (
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
          ⚠️ <strong>تنبيه:</strong> لا توجد وردية مفتوحة حالياً. يرجى{" "}
          <Link href="/shifts" className="font-bold underline text-amber-300">
            فتح وردية من هنا
          </Link>{" "}
          لتتمكن من بدء الجلسات وتشغيل العدادات.
        </div>
      )}

      {/* قسم إضافة جهاز جديد */}
      <details className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
        <summary className="cursor-pointer font-bold text-sky-400 select-none">
          + إضافة جهاز جديد إلى الصالة
        </summary>
        <form
          action={async (formData) => {
            "use server";
            const name = String(formData.get("name") ?? "");
            const type = String(formData.get("type") ?? "PS5") as "PS4" | "PS5" | "PC" | "VIP_ROOM";
            const singleHourlyRate = Number(formData.get("singleHourlyRate") ?? 0);
            const multiHourlyRate = Number(formData.get("multiHourlyRate") ?? 0);

            if (!name) return;
            await createDevice({ name, type, singleHourlyRate, multiHourlyRate });
          }}
          className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <label className="mb-1 block text-xs text-slate-400">اسم الجهاز</label>
            <input
              name="name"
              placeholder="مثال: PS5 - Room 3"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">النوع</label>
            <select
              name="type"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
            >
              <option value="PS5">PS5</option>
              <option value="PS4">PS4</option>
              <option value="PC">PC</option>
              <option value="VIP_ROOM">VIP_ROOM</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">سعر الفردي (ساعة)</label>
            <input
              name="singleHourlyRate"
              type="number"
              placeholder="120"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">سعر المجموعة (ساعة)</label>
            <input
              name="multiHourlyRate"
              type="number"
              placeholder="180"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
              required
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="w-full rounded-full bg-sky-500 py-2.5 text-sm font-black text-slate-950 hover:bg-sky-400 transition"
            >
              حفظ الجهاز
            </button>
          </div>
        </form>
      </details>

      {/* كروت الأجهزة الاحترافية */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {devices.map((device) => {
          const activeSession = device.sessions[0] ?? null;
          const isOccupied = device.status === "OCCUPIED" && activeSession !== null;
          const isPaused = activeSession?.status === "PAUSED";
          const activeSlot = activeSession?.slots?.find((s) => !s.endTime);
          const currentSlotType = activeSlot?.type ?? "SINGLE";
          const currentRate = activeSlot
            ? activeSlot.hourlyRate
            : currentSlotType === "MULTI"
              ? device.multiHourlyRate
              : device.singleHourlyRate;

          const currentCustomer = activeSession?.customer ?? null;
          const plannedMinutes = (activeSession as any)?.plannedMinutes ?? null;

          return (
            <article
              key={device.id}
              className={`rounded-3xl border p-5 flex flex-col justify-between transition-all ${
                isOccupied
                  ? isPaused
                    ? "border-amber-500/40 bg-slate-900/90 shadow-amber-950/20"
                    : "border-rose-500/40 bg-slate-900/90 shadow-rose-950/20"
                  : "border-slate-800 bg-slate-900/80 shadow-slate-950/30"
              } shadow-xl`}
            >
              <div>
                {/* رأس الكارت */}
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${
                      isOccupied
                        ? isPaused
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                        : device.status === "MAINTENANCE"
                          ? "bg-slate-700 text-slate-300"
                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {isOccupied ? (isPaused ? "PAUSED" : "PLAYING") : device.status}
                  </span>

                  <div className="text-left">
                    <h3 className="text-lg font-black text-white">{device.name}</h3>
                    <p className="text-[11px] text-slate-400">{device.type}</p>
                  </div>
                </div>

                {/* كادر العميل */}
                {isOccupied && (
                  <div className="mt-3 rounded-2xl border border-sky-500/30 bg-sky-950/40 p-2.5 text-xs text-sky-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white">
                        👤 {currentCustomer ? currentCustomer.name : "عميل صالة (عابر)"}
                      </span>
                      {currentCustomer?.phone && (
                        <p className="text-[10px] text-sky-400 font-mono mt-0.5">
                          📞 {currentCustomer.phone}
                        </p>
                      )}
                    </div>
                    {currentCustomer && (
                      <span className="rounded-full bg-sky-500/20 px-2 py-0.5 font-bold text-[10px] text-sky-300">
                        ⭐ {currentCustomer.loyaltyPts} نقطة
                      </span>
                    )}
                  </div>
                )}

                {/* أسعار الساعة */}
                <div className="mt-3 space-y-1 text-sm border-t border-slate-800/80 pt-2.5">
                  <div className="flex justify-between text-slate-300">
                    <span className="font-mono font-bold text-white">{device.singleHourlyRate} ج.م</span>
                    <span className="text-slate-400 text-xs">سعر الفردي:</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="font-mono font-bold text-white">{device.multiHourlyRate} ج.م</span>
                    <span className="text-slate-400 text-xs">سعر المجموعة:</span>
                  </div>
                </div>

                {/* شاشة العداد الحي التنازلي والتصاعدي */}
                <div className="mt-3 rounded-2xl bg-slate-950/70 p-4 border border-slate-800/50">
                  {isOccupied && activeSession ? (
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="rounded bg-sky-500/20 px-2 py-0.5 font-bold text-sky-300">
                          وضع: {currentSlotType === "MULTI" ? "مجموعة (زوجي)" : "فردي"}
                        </span>
                        <span className="text-slate-400">{currentRate} ج.م / ساعة</span>
                      </div>
                      <DeviceTimer
                        startTime={activeSlot?.startTime ?? activeSession.startTime}
                        hourlyRate={currentRate}
                        initialCost={activeSession.timeCost}
                        isPaused={isPaused}
                        plannedMinutes={plannedMinutes}
                        customerName={currentCustomer?.name ?? "عميل صالة"}
                        deviceName={device.name}
                      />
                    </div>
                  ) : (
                    <div className="py-2 text-center text-xs font-semibold text-slate-500">
                      الجهاز متاح وجاهز لبدء جلسة جديدة
                    </div>
                  )}
                </div>
              </div>

              {/* أزرار التحكم والتشغيل والمحاسبة */}
              <div className="mt-4 border-t border-slate-800/80 pt-3">
                {isOccupied && activeSession ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {isPaused ? (
                        <form
                          action={async () => {
                            "use server";
                            await resumeDeviceSession(activeSession.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="w-full rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition"
                          >
                            ▶ استئناف
                          </button>
                        </form>
                      ) : (
                        <form
                          action={async () => {
                            "use server";
                            await pauseDeviceSession(activeSession.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="w-full rounded-xl bg-amber-600 py-2 text-xs font-bold text-white hover:bg-amber-500 transition"
                          >
                            ⏸ إيقاف مؤقت
                          </button>
                        </form>
                      )}

                      <form
                        action={async () => {
                          "use server";
                          const nextType = currentSlotType === "SINGLE" ? "MULTI" : "SINGLE";
                          await switchSessionMode(activeSession.id, nextType);
                        }}
                      >
                        <button
                          type="submit"
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2 text-xs font-bold text-slate-200 hover:border-slate-500 transition"
                        >
                          تبديل لـ {currentSlotType === "SINGLE" ? "مجموعة" : "فردي"}
                        </button>
                      </form>
                    </div>

                    {/* زر تمديد الوقت للجلسات المحددة إذا طلب العميل وقتاً إضافياً */}
                    {plannedMinutes && (
                      <div className="grid grid-cols-2 gap-2">
                        <form
                          action={async () => {
                            "use server";
                            await extendSessionDuration(activeSession.id, 60); // تمديد ساعة
                          }}
                        >
                          <button
                            type="submit"
                            className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 py-1.5 text-[11px] font-bold text-amber-300 hover:bg-amber-500/20 transition"
                          >
                            + تمديد (1 ساعة)
                          </button>
                        </form>

                        <form
                          action={async () => {
                            "use server";
                            await extendSessionDuration(activeSession.id, null); // تحويل لمفتوح
                          }}
                        >
                          <button
                            type="submit"
                            className="w-full rounded-xl border border-sky-500/30 bg-sky-500/10 py-1.5 text-[11px] font-bold text-sky-300 hover:bg-sky-500/20 transition"
                          >
                            تحويل لوقت مفتوح ♾️
                          </button>
                        </form>
                      </div>
                    )}

                    {/* زر المحاسبة والفوترة */}
                    <CheckoutModal
                      sessionId={activeSession.id}
                      deviceName={device.name}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {openShift ? (
                      <OpenSessionModal
                        device={{
                          id: device.id,
                          name: device.name,
                          type: device.type,
                          singleHourlyRate: device.singleHourlyRate,
                          multiHourlyRate: device.multiHourlyRate,
                        }}
                        shiftId={openShift.id}
                        initialCustomers={customerItems}
                      />
                    ) : (
                      <button
                        disabled
                        className="w-full rounded-2xl bg-slate-800 py-3 text-xs font-bold text-slate-500 opacity-50"
                      >
                        يجب فتح وردية أولاً
                      </button>
                    )}

                    {/* تغيير الحالة يدوياً */}
                    <form
                      action={async (formData) => {
                        "use server";
                        const newStatus = String(formData.get("status")) as DeviceStatus;
                        await updateDeviceStatus(device.id, newStatus);
                      }}
                      className="flex gap-2 pt-1"
                    >
                      <select
                        name="status"
                        defaultValue={device.status}
                        className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-400 outline-none"
                      >
                        <option value="AVAILABLE">متاح للعب</option>
                        <option value="MAINTENANCE">في الصيانة</option>
                      </select>
                      <button
                        type="submit"
                        className="rounded-xl border border-slate-800 px-3 py-1 text-[11px] text-slate-400 hover:border-slate-600"
                      >
                        تحديث
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </SiteShell>
  );
}