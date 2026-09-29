import { requireRole } from "@/app/actions/auth";
import { cancelBooking, confirmBooking, getBookings } from "@/app/actions/bookings";
import { BookingModal } from "@/components/booking-modal";
import { SiteShell } from "@/components/site-shell";
import { prisma } from "@/lib/prisma";

export default async function BookingsPage() {
  await requireRole(["ADMIN", "CASHIER", "STAFF"]);

  const [bookings, devices, customers] = await Promise.all([
    getBookings(),
    prisma.device.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, type: true } }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, phone: true } }),
  ]);

  const now = new Date();

  return (
    <SiteShell title="إدارة الحجوزات">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">جدول الحجوزات</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              متابعة مواعيد العملاء وتأكيدها (الحجز الفائت لا يمكن تأكيده).
            </p>
          </div>

          <BookingModal devices={devices} customers={customers} />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-full text-right text-xs text-slate-200">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">العميل</th>
                <th className="px-4 py-3">الجهاز</th>
                <th className="px-4 py-3">موعد البداية</th>
                <th className="px-4 py-3">موعد النهاية</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {bookings.map((b) => {
                const isPast = new Date(b.startTime) < now;
                const canConfirm = b.status === "PENDING" && !isPast;

                return (
                  <tr key={b.id} className="hover:bg-slate-950/40 transition">
                    <td className="px-4 py-3">
                      <p className="font-bold text-white">{b.customer.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{b.customer.phone}</p>
                    </td>

                    <td className="px-4 py-3 font-bold text-sky-300">
                      {b.device.name} ({b.device.type})
                    </td>

                    <td className="px-4 py-3 font-mono">
                      {new Date(b.startTime).toLocaleString("ar-EG", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-400">
                      {new Date(b.endTime).toLocaleTimeString("ar-EG", {
                        timeStyle: "short",
                      })}
                    </td>

                    <td className="px-4 py-3">
                      {isPast && b.status === "PENDING" ? (
                        <span className="rounded-full bg-slate-800 border border-rose-500/30 px-2.5 py-0.5 text-[10px] font-bold text-rose-400">
                          ⌛ فات موعده (منتهي)
                        </span>
                      ) : (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            b.status === "CONFIRMED"
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : b.status === "PENDING"
                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                : "bg-rose-500/15 text-rose-300"
                          }`}
                        >
                          {b.status === "CONFIRMED"
                            ? "مؤكد"
                            : b.status === "PENDING"
                              ? "قيد الانتظار"
                              : "ملغي"}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {/* زر التأكيد (يُعطَّل برمجياً وبصرياً إذا فات الوقت) */}
                        {b.status === "PENDING" && (
                          <form
                            action={async () => {
                              "use server";
                              await confirmBooking(b.id);
                            }}
                          >
                            <button
                              type="submit"
                              disabled={!canConfirm}
                              title={
                                isPast
                                  ? "لا يمكن تأكيد الحجز لأن وقته وتاريخه قد فات"
                                  : "تأكيد الحجز"
                              }
                              className="rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500 transition disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              ✓ تأكيد
                            </button>
                          </form>
                        )}

                        {/* زر تعديل الحجز */}
                        {b.status !== "CANCELLED" && (
                          <BookingModal
                            devices={devices}
                            customers={customers}
                            bookingToEdit={{
                              id: b.id,
                              deviceId: b.deviceId,
                              customerId: b.customerId,
                              startTime: new Date(b.startTime).toISOString(),
                              endTime: new Date(b.endTime).toISOString(),
                              notes: b.notes,
                            }}
                            triggerButtonText="✏️ تعديل"
                          />
                        )}

                        {/* زر إلغاء الحجز */}
                        {b.status !== "CANCELLED" && (
                          <form
                            action={async () => {
                              "use server";
                              await cancelBooking(b.id);
                            }}
                          >
                            <button
                              type="submit"
                              className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] text-slate-300 hover:text-rose-400 hover:border-rose-500/40 transition"
                            >
                              ✕ إلغاء
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {bookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    لا توجد حجوزات مسجلة حالياً. اضغط على زر &quot;+ حجز جديد&quot; لتسجيل أول حجز.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SiteShell>
  );
}