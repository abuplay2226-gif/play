import Link from "next/link";
import { getCurrentUser, signOut } from "@/app/actions/auth";
import { createCustomerBooking } from "@/app/actions/customer-bookings";
import { getLandingPageContent } from "@/app/actions/site-content";
import { PackageOrderModal } from "@/components/package-order-modal";

export default async function Home() {
  const user = await getCurrentUser();
  const { services, packages, reviews } = await getLandingPageContent();

  const dashboardHref =
    user?.role === "ADMIN"
      ? "/admin"
      : user?.role === "CASHIER" || user?.role === "STAFF"
      ? "/staff"
      : "/customer";

  return (
    <main dir="rtl" className="min-h-screen bg-[#050816] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070d1f]/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-lg font-black text-slate-950">
              P
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-amber-300">PlayStation</p>
              <p className="text-lg font-black text-white">Lounge</p>
            </div>
          </div>

          <div className="hidden items-center gap-7 text-sm font-medium text-slate-200 md:flex">
            <a href="#services" className="transition hover:text-amber-300">الخدمات</a>
            <a href="#packages" className="transition hover:text-amber-300">الباقات</a>
            <a href="#booking" className="transition hover:text-amber-300">الحجز</a>
            <a href="#reviews" className="transition hover:text-amber-300">التقييمات</a>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href={dashboardHref}
                  className="rounded-full bg-slate-800 border border-slate-700 px-4 py-2 text-sm font-bold text-amber-300 transition hover:bg-slate-700"
                >
                  لوحة التحكم ({user.name})
                </Link>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/20"
                  >
                    خروج
                  </button>
                </form>
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white transition hover:border-amber-400 hover:text-amber-300"
              >
                تسجيل الدخول
              </Link>
            )}

            <Link
              href="#booking"
              className="rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-5 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-orange-500/30 transition hover:scale-[1.02]"
            >
              احجز الآن
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.14),_transparent_25%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-sm font-bold text-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-300" />
              تجربة لعب فاخرة + كافيه أنيق
            </div>

            <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
              أجواء عصرية لعشاق الألعاب والمقاهي
            </h1>

            <p className="mt-6 text-lg leading-8 text-slate-300">
              استمتع بجلسات بلايستيشن احترافية، غرف VIP خاصة، ومشروبات مميزة في مكان يليق بنمطك.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="#booking" className="rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-6 py-3 text-base font-black text-slate-950 shadow-lg shadow-orange-500/30">
                احجز جلسة الآن
              </Link>
              <a href="#services" className="rounded-full border border-white/15 px-6 py-3 text-base font-bold text-white transition hover:border-sky-400 hover:text-sky-200">
                استعرض الخدمات
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-8 text-sm text-slate-300">
              <div>
                <p className="text-3xl font-black text-white">12+</p>
                <p>جهاز حديث</p>
              </div>
              <div>
                <p className="text-3xl font-black text-white">4.9</p>
                <p>تقييم العملاء</p>
              </div>
              <div>
                <p className="text-3xl font-black text-white">24/7</p>
                <p>خدمة العملاء</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-[32px] bg-gradient-to-br from-amber-400/20 via-transparent to-sky-500/20 blur-2xl" />
            <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.8)]">
              <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400">حجز سريع</p>
                    <p className="mt-2 text-2xl font-black text-white">VIP Room</p>
                  </div>
                  <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">متاح الآن</div>
                </div>

                <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>اليوم</span>
                    <span className="font-bold text-white">السبت</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>الوقت</span>
                    <span className="font-bold text-white">19:00 - 21:00</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>السعر</span>
                    <span className="text-xl font-black text-amber-300">180 ج.م</span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-slate-700 bg-slate-900 p-3">
                    <p className="text-slate-400">جهاز</p>
                    <p className="mt-2 font-black text-white">PS5 Pro</p>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-900 p-3">
                    <p className="text-slate-400">النوع</p>
                    <p className="mt-2 font-black text-white">جلسة ثنائية</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-amber-300">الخدمات</p>
          <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">كل ما تحتاجه في مكان واحد</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {services.map((service) => (
            <article key={service.id} className="rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 shadow-xl shadow-slate-950/30">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-xl font-black text-slate-950">
                {service.icon ?? service.title[0]}
              </div>
              <h3 className="text-xl font-black text-white">{service.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{service.description}</p>
              <div className="mt-5 border-t border-white/10 pt-4 text-sm font-bold text-amber-300">{service.price}</div>
            </article>
          ))}
        </div>
      </section>

      {/* Packages Section */}
      <section id="packages" className="bg-slate-950/80 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-sky-300">الباقات والعروض</p>
            <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">اختر باقتك المفضلة واستمتع بخصم الساعات</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {packages.map((item) => (
              <div
                key={item.id}
                className={`rounded-[30px] border p-7 flex flex-col justify-between ${
                  item.highlight
                    ? "border-amber-400/50 bg-gradient-to-br from-amber-500/10 to-slate-900 shadow-xl shadow-amber-500/10"
                    : "border-white/10 bg-slate-900/80"
                }`}
              >
                <div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-400 font-bold">{item.name}</p>
                    {item.highlight && (
                      <span className="rounded-full bg-amber-400/20 px-3 py-0.5 text-xs font-bold text-amber-300 border border-amber-400/30">
                        باقة مميزة ⭐
                      </span>
                    )}
                  </div>

                  <div className="mt-5 flex items-baseline gap-2">
                    <span className="text-5xl font-black text-white font-mono">{item.price}</span>
                    <span className="text-sm text-slate-400">ج.م</span>
                  </div>

                  <div className="mt-5 space-y-2 text-xs text-slate-300 border-t border-white/10 pt-4">
                    <p className="flex items-center gap-2">
                      <span>⏱️</span>
                      <strong className="text-emerald-400 text-sm">{item.hours} ساعات لعب مسبقة الدفع</strong>
                    </p>
                    <p className="flex items-center gap-2">
                      <span>📅</span>
                      <span>صالحة للاستخدام لمدة: <strong>{item.validityDays} يوم</strong></span>
                    </p>
                    {item.drinksCount > 0 && (
                      <p className="flex items-center gap-2">
                        <span>☕</span>
                        <strong className="text-cyan-300">{item.drinksCount} مشروب مجاني</strong>
                      </p>
                    )}
                  </div>

                  <ul className="mt-6 space-y-2.5 text-xs text-slate-400">
                    <li>✓ خصم فوري من رصيد الوقت عند بدء اللعب</li>
                    <li>✓ تفعيل مباشر فور تأكيد الدفع في الصالة</li>
                  </ul>
                </div>

                {/* زر فتح نافذة طلب الباقة التفاعلية */}
                <PackageOrderModal
                  plan={{
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    hours: item.hours,
                    validityDays: item.validityDays,
                    drinksCount: item.drinksCount,
                    highlight: item.highlight,
                  }}
                  currentUser={user}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking Section */}
      <section id="booking" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 lg:grid-cols-[0.9fr_1.1fr] lg:p-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-amber-300">احجز موعدك</p>
            <h2 className="mt-4 text-3xl font-black text-white">ابدأ رحلتك داخل أجواءنا</h2>
            <p className="mt-4 text-slate-300">اختر نوع الجهاز والموعد وسنجهز مكانك مسبقاً.</p>

            <div className="mt-8 space-y-4 text-sm text-slate-200">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <span>الأماكن المتاحة</span>
                <span className="font-black text-emerald-300">12 جهاز</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <span>متوسط الانتظار</span>
                <span className="font-black text-sky-300">بدون انتظار</span>
              </div>
            </div>
          </div>

          <form action={createCustomerBooking} className="space-y-5 rounded-[28px] border border-white/10 bg-slate-950/70 p-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm text-slate-300">اسم العميل</label>
                <input id="name" name="name" defaultValue={user?.name ?? ""} className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400" placeholder="أدخل اسمك" required />
              </div>
              <div>
                <label htmlFor="phone" className="mb-2 block text-sm text-slate-300">رقم الهاتف</label>
                <input id="phone" name="phone" defaultValue={user?.phone ?? ""} className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400" placeholder="05XXXXXXXX" required />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="serviceType" className="mb-2 block text-sm text-slate-300">نوع الخدمة</label>
                <select id="serviceType" name="serviceType" className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400">
                  <option value="PS5">جلسة PS5</option>
                  <option value="VIP">غرفة VIP</option>
                  <option value="PC">جلسة PC</option>
                  <option value="PS4">جلسة PS4</option>
                </select>
              </div>
              <div>
                <label htmlFor="bookingDate" className="mb-2 block text-sm text-slate-300">اليوم</label>
                <input id="bookingDate" name="bookingDate" type="date" className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400" required />
              </div>
            </div>

            <div>
              <label htmlFor="bookingTime" className="mb-2 block text-sm text-slate-300">الوقت المفضل</label>
              <input id="bookingTime" name="bookingTime" type="time" className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400" defaultValue="19:00" />
            </div>

            <input type="hidden" name="notes" value="حجز من الصفحة الرئيسية" />

            <button type="submit" className="w-full rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-5 py-3 text-base font-black text-slate-950 shadow-lg shadow-orange-500/25">
              تأكيد حجز الجلسة
            </button>
          </form>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="bg-slate-950/80 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-amber-300">التقييمات</p>
            <h2 className="mt-4 text-3xl font-black text-white">آراء عملائنا</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {reviews.map((review) => (
              <article key={review.name} className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6">
                <div className="mb-4 flex items-center gap-1 text-amber-300">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <span key={index}>★</span>
                  ))}
                </div>
                <p className="text-sm leading-8 text-slate-300">“{review.text}”</p>
                <div className="mt-5 border-t border-white/10 pt-4 text-sm font-bold text-white">{review.name}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-amber-400/30 bg-gradient-to-r from-amber-500/10 to-sky-500/10 p-8 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-amber-300">تجربة استثنائية</p>
          <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">اصنع يومك في أجواء احترافية ومميزة</h2>
          <Link href="#booking" className="mt-8 inline-flex rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-6 py-3 text-base font-black text-slate-950 shadow-lg shadow-orange-500/30">
            احجز الآن
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#030712]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 text-sm text-slate-300 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-lg font-black text-white">PlayStation Lounge</p>
            <p className="mt-2">صالة ألعاب بلايستيشن وكافيه متكامل</p>
          </div>
          <div className="flex items-center gap-6">
            <a href="#services" className="transition hover:text-amber-300">الخدمات</a>
            <a href="#packages" className="transition hover:text-amber-300">الباقات</a>
            <a href="#booking" className="transition hover:text-amber-300">الحجز</a>
          </div>
        </div>
      </footer>
    </main>
  );
}