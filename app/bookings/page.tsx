import { SiteShell } from "@/components/site-shell";

const bookings = [
  { customer: "سارة أحمد", device: "PS5 - 01", date: "2026-09-24 18:00", status: "مؤكد" },
  { customer: "أحمد يوسف", device: "VIP - 01", date: "2026-09-24 20:00", status: "قيد الانتظار" },
  { customer: "محمود علي", device: "PC - 03", date: "2026-09-25 15:30", status: "ملغي" },
];

export default function BookingsPage() {
  return (
    <SiteShell title="الحجوزات">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">جدول الحجوزات</h2>
          <button className="rounded-full bg-sky-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-sky-400">
            حجز جديد
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="min-w-full text-right text-sm text-slate-200">
            <thead className="bg-slate-950/80 text-slate-300">
              <tr>
                <th className="px-4 py-3">العميل</th>
                <th className="px-4 py-3">الجهاز</th>
                <th className="px-4 py-3">الوقت</th>
                <th className="px-4 py-3">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.customer} className="border-t border-slate-800 bg-slate-900/60">
                  <td className="px-4 py-3 font-bold text-white">{booking.customer}</td>
                  <td className="px-4 py-3">{booking.device}</td>
                  <td className="px-4 py-3">{booking.date}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                      booking.status === "مؤكد"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : booking.status === "قيد الانتظار"
                          ? "bg-amber-500/15 text-amber-300"
                          : "bg-rose-500/15 text-rose-300"
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SiteShell>
  );
}
