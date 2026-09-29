"use client";

import { useState, useTransition } from "react";
import { createBooking, updateBooking } from "@/app/actions/bookings";

interface DeviceItem {
  id: string;
  name: string;
  type: string;
}

interface CustomerItem {
  id: string;
  name: string;
  phone: string;
}

interface BookingModalProps {
  devices: DeviceItem[];
  customers: CustomerItem[];
  bookingToEdit?: {
    id: string;
    deviceId: string;
    customerId: string;
    startTime: string;
    endTime: string;
    notes?: string | null;
  } | null;
  triggerButtonText?: string;
}

// دالة مساعدة لضبط التاريخ المحلي بصيغة YYYY-MM-DDTHH:mm لخانة الإدخال
function toLocalDatetimeInput(dateStr?: string | Date) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BookingModal({
  devices,
  customers,
  bookingToEdit,
  triggerButtonText,
}: BookingModalProps) {
  // مغلقة دائماً افتراضياً عند فتح الصفحة
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const [deviceId, setDeviceId] = useState(bookingToEdit?.deviceId || devices[0]?.id || "");
  const [customerId, setCustomerId] = useState(bookingToEdit?.customerId || "");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [startTime, setStartTime] = useState(toLocalDatetimeInput(bookingToEdit?.startTime));
  const [endTime, setEndTime] = useState(toLocalDatetimeInput(bookingToEdit?.endTime));
  const [notes, setNotes] = useState(bookingToEdit?.notes || "");

  const handleOpen = () => {
    setErrorMsg("");
    // تحديث المواعيد الحالية عند النقر
    if (bookingToEdit) {
      setDeviceId(bookingToEdit.deviceId);
      setStartTime(toLocalDatetimeInput(bookingToEdit.startTime));
      setEndTime(toLocalDatetimeInput(bookingToEdit.endTime));
      setNotes(bookingToEdit.notes || "");
    } else {
      // موعد افتراضي لحجز جديد يبدأ بعد ساعة من الآن
      const now = new Date();
      now.setHours(now.getHours() + 1, 0, 0, 0);
      const after = new Date(now);
      after.setHours(after.getHours() + 1);

      setStartTime(toLocalDatetimeInput(now));
      setEndTime(toLocalDatetimeInput(after));
    }
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    startTransition(async () => {
      try {
        if (bookingToEdit) {
          await updateBooking({
            bookingId: bookingToEdit.id,
            deviceId,
            startTime,
            endTime,
            notes,
          });
        } else {
          await createBooking({
            deviceId,
            customerId: customerId || undefined,
            customerName: custName || undefined,
            customerPhone: custPhone || undefined,
            startTime,
            endTime,
            notes,
          });
        }
        setIsOpen(false);
      } catch (err: any) {
        setErrorMsg(err.message || "حدث خطأ أثناء حفظ الحجز");
      }
    });
  };

  return (
    <>
      {/* الزر المشغل للنافذة (يظهر زر التعديل في السطر وزر الحجز الجديد في الأعلى) */}
      <button
        type="button"
        onClick={handleOpen}
        className={
          bookingToEdit
            ? "rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 hover:border-sky-400 hover:text-white transition"
            : "rounded-full bg-sky-500 px-4 py-2 text-xs font-black text-slate-950 hover:bg-sky-400 transition shadow-lg shadow-sky-500/20"
        }
      >
        {triggerButtonText || (bookingToEdit ? "✏️ تعديل" : "+ حجز جديد")}
      </button>

      {/* النافذة المنبثقة تظهر فقط عند النقر على الزر بيدك */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute left-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              ✕
            </button>

            <div className="border-b border-slate-800 pb-3 mb-4">
              <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-bold text-sky-300">
                {bookingToEdit ? "تعديل موعد الحجز" : "تسجيل حجز جديد"}
              </span>
              <h2 className="mt-2 text-xl font-black text-white">
                {bookingToEdit ? "تعديل بيانات الحجز" : "حجز جهاز وموعد مسبق"}
              </h2>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/15 p-2.5 text-xs text-rose-300 font-bold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* اختيار الجهاز */}
              <div>
                <label className="mb-1 block font-bold text-slate-300">الجهاز المطلوب:</label>
                <select
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-sky-400 font-bold"
                  required
                >
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* اختيار أو تسجيل العميل عند الحجز الجديد فقط */}
              {!bookingToEdit && (
                <div className="rounded-2xl bg-slate-950/60 p-3 border border-slate-800 space-y-2">
                  <label className="block font-bold text-sky-300">بيانات العميل:</label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-white outline-none"
                  >
                    <option value="">-- اختر عميل مسجل أو اكتب بالأسفل --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>

                  {!customerId && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <input
                        value={custName}
                        onChange={(e) => setCustName(e.target.value)}
                        placeholder="اسم العميل"
                        className="rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-white outline-none"
                        required={!customerId}
                      />
                      <input
                        value={custPhone}
                        onChange={(e) => setCustPhone(e.target.value)}
                        placeholder="رقم الهاتف"
                        className="rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-white outline-none"
                        required={!customerId}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* توقيت البداية والنهاية */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-bold text-slate-300">وقت البداية:</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white outline-none focus:border-sky-400 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-300">وقت النهاية:</label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white outline-none focus:border-sky-400 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-300">ملاحظات الحجز:</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: ذراعين إضافيين / غرفة VIP"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-sky-400"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-full bg-emerald-500 py-3 text-xs font-black text-slate-950 hover:bg-emerald-400 transition shadow-lg shadow-emerald-950/20 disabled:opacity-40"
              >
                {isPending ? "جاري الحفظ..." : bookingToEdit ? "تحديث بيانات الحجز" : "تأكيد تسجيل الحجز"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}