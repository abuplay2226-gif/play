import Link from "next/link";

import { requireRole } from "@/app/actions/auth";
import { createCustomerBooking, getCustomerBookings, type CustomerBookingRow } from "@/app/actions/customer-bookings";

const offers = [
  { title: "باقة عطلة نهاية الأسبوع", text: "جلسة مزدوجة + مشروبات + خصم 15%" },
  { title: "VIP Friday", text: "غرفة خاصة مع خدمة كافيه مخصصة" },
];

export default async function CustomerPage() {
  await requireRole(["CUSTOMER", "ADMIN"]);

  const bookings = (await getCustomerBookings()) as CustomerBookingRow[];

  return (
    <main dir="rtl" className="min-h-screen bg-[#050816] text-white">
      <header className="border-b border-white/10 bg-[#070d1f]/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-lg font-black text-slate-950">
              P
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-amber-300">Client</p>
              <p className="text-lg font-black">PlayStation Lounge</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white hover:border-amber-400 hover:text-amber-300">
              الرئيسية
            </Link>
            <Link href="/login" className="rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-4 py-2 text-sm font-black text-slate-950">
              تسجيل الخروج
            </Link>
          </div>
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <section className="rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-amber-300">مرحبًا بك</p>
              <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">واجهة العميل</h1>
              <p className="mt-4 max-w-xl text-slate-300">تابع حجوزاتك، استعرض خدماتك، وتواصل بسهولة مع فريق الصالة.</p>
            </div>

            <div className="rounded-[24px] border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
              <p>الحالة الحالية</p>
              <p className="mt-2 text-2xl font-black text-white">مستعد للعب</p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5">
            <h2 className="text-2xl font-black text-white">حجوزاتي الحالية</h2>
            <div className="mt-5 space-y-4">
              {bookings.length > 0 ? (
                bookings.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div>
                      <p className="font-bold text-white">{booking.device.name}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(new Date(booking.startTime))}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                      booking.status === "CONFIRMED"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : booking.status === "PENDING"
                          ? "bg-amber-500/15 text-amber-300"
                          : "bg-rose-500/15 text-rose-300"
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-5 text-slate-300">
                  لا توجد حجوزات حالياً.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5">
            <h2 className="text-2xl font-black text-white">عروض اليوم</h2>
            <div className="mt-5 space-y-4">
              {offers.map((offer) => (
                <div key={offer.title} className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                  <p className="font-bold text-white">{offer.title}</p>
                  <p className="mt-2 text-sm text-slate-300">{offer.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-white/10 bg-slate-900/80 p-5">
          <h2 className="text-2xl font-black text-white">احجز خدمة جديدة</h2>

          <form action={createCustomerBooking} className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-slate-300">اسم العميل</label>
              <input name="name" className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400" placeholder="أدخل اسمك" required />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">رقم الهاتف</label>
              <input name="phone" className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400" placeholder="05XXXXXXXX" required />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">نوع الخدمة</label>
              <select name="serviceType" className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400">
                <option value="PS5">جلسة PS5</option>
                <option value="VIP">غرفة VIP</option>
                <option value="PC">جلسة PC</option>
                <option value="PS4">جلسة PS4</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">تاريخ الحجز</label>
              <input name="bookingDate" type="date" className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400" required />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-slate-300">الوقت</label>
              <input name="bookingTime" type="time" defaultValue="19:00" className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-slate-300">ملاحظات</label>
              <textarea name="notes" rows={3} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400" placeholder="ملاحظات إضافية" />
            </div>

            <div className="md:col-span-2">
              <button type="submit" className="w-full rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-5 py-3 text-base font-black text-slate-950 shadow-lg shadow-orange-500/30">
                تأكيد الحجز
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
