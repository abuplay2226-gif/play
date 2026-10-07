import Link from "next/link";
import { getCurrentUser, requireRole, signOut } from "@/app/actions/auth";
import { createCustomerBooking, getCustomerBookings, type CustomerBookingRow } from "@/app/actions/customer-bookings";
import { getCustomerActivePackages } from "@/app/actions/packages";
import { getLandingPageContent, getLoungeSettings } from "@/app/actions/site-content";
import { BookingCountdown } from "@/components/booking-countdown";
import { PackageOrderModal } from "@/components/package-order-modal";
import { isBilliardDevice } from "@/lib/device-utils";
import { prisma } from "@/lib/prisma";

export default async function CustomerPage() {
  await requireRole(["CUSTOMER", "ADMIN", "STAFF", "CASHIER"]);

  const user = await getCurrentUser();
  const customerPhone = user?.phone ?? "";

  // جلب إعدادات الصالة، الأجهزة والأسعار الحية، الباقات، والحجوزات
  const [loungeSettings, devices, landingContent, customerDb, bookings] = await Promise.all([
    getLoungeSettings(),
    prisma.device.findMany({ orderBy: { name: "asc" } }),
    getLandingPageContent(),
    customerPhone
      ? prisma.customer.findUnique({ where: { phone: customerPhone } })
      : null,
    customerPhone
      ? ((await getCustomerBookings(customerPhone)) as CustomerBookingRow[])
      : [],
  ]);

  // الباقات النشطة المشحونة للعميل
  const activeSubs = customerDb ? await getCustomerActivePackages(customerDb.id) : [];

  // تصنيف الأجهزة
  const billiardDevices = devices.filter((d) => isBilliardDevice(d.type));
  const psDevices = devices.filter((d) => !isBilliardDevice(d.type));

  const availableBilliardsCount = billiardDevices.filter((d) => d.status === "AVAILABLE").length;
  const availablePsCount = psDevices.filter((d) => d.status === "AVAILABLE").length;

  const currentPoints = customerDb?.loyaltyPts ?? 0;
  const activeBookings = bookings.filter((b) => b.status === "CONFIRMED" || b.status === "PENDING");

  return (
    <main dir="rtl" className="min-h-screen bg-[#030712] text-slate-100 selection:bg-amber-400 selection:text-slate-950 pb-20">
      {/* 1. الشريط العلوي الشفاف بتأثير زجاجي كاجوال */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070d1f]/80 backdrop-blur-2xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-xl font-black text-slate-950 shadow-lg shadow-orange-500/20">
              P
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs uppercase tracking-[0.25em] text-amber-300 font-bold">PlayLounge</span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.2 text-[9px] font-bold text-emerald-300 border border-emerald-500/30">
                  Open 24/7
                </span>
              </div>
              <p className="text-sm font-black text-white">صالة البلايستيشن والبلياردو</p>
            </div>
          </div>

          {/* روابط سريعة في الهيدر */}
          <div className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-300">
            <a href="#rates" className="hover:text-amber-300 transition">الأسعار والأجهزة</a>
            <a href="#packages" className="hover:text-amber-300 transition">باقات التوفير</a>
            <a href="#booking" className="hover:text-amber-300 transition">احجز طاولتك</a>
            <a href="#my-bookings" className="hover:text-amber-300 transition">حجوزاتي</a>
            <a href="#location" className="hover:text-amber-300 transition">موقعنا والخريطة</a>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="rounded-full bg-slate-900/90 border border-amber-400/30 px-3 py-1.5 text-xs text-amber-300 font-bold flex items-center gap-1.5">
              <span>⭐</span>
              <span className="font-mono">{currentPoints}</span>
              <span className="hidden sm:inline text-slate-400 font-normal">نقطة ولاء</span>
            </div>

            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition"
              >
                خروج
              </button>
            </form>
          </div>
        </nav>
      </header>

      {/* 2. قسم الهيرو الكاجوال (Hero Section) مع صورة قابلة للتعديل من الأدمن */}
      <section className="relative overflow-hidden min-h-[540px] flex items-center justify-center border-b border-white/10">
        {/* صورة الهيرو الرئيسية من لوحة التحكم مع تدرج لوني سينمائي */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 scale-105"
          style={{
            backgroundImage: `url('${loungeSettings.heroImage}')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/80 to-[#030712]/50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(251,191,36,0.15),_transparent_70%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center space-y-6">
          {/* وسام ترحيبي عائم */}
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-slate-950/80 px-4 py-2 text-xs font-bold text-amber-300 shadow-xl backdrop-blur-xl animate-in fade-in">
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <span>🎱 أفضل طاولات بلياردو احترافية · 🎮 أجهزة PS5 وشاشات 4K فائقة</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight drop-shadow-2xl max-w-4xl mx-auto">
            {loungeSettings.heroTitle}
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
            {loungeSettings.heroSubtitle}
          </p>

          {/* أزرار الإجراءات الرئيسية في الهيرو */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <a
              href="#booking"
              className="rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-7 py-3.5 text-sm font-black text-slate-950 shadow-xl shadow-orange-500/25 transition hover:scale-105 hover:brightness-110 active:scale-95"
            >
              🎯 احجز طاولتك أو جهازك الآن
            </a>
            <a
              href="#rates"
              className="rounded-full border border-white/20 bg-slate-900/80 px-6 py-3.5 text-sm font-bold text-white hover:border-amber-400 hover:text-amber-300 transition backdrop-blur-md"
            >
              💰 استعراض قائمة الأسعار
            </a>
          </div>

          {/* مؤشرات حية عائمة أسفل الهيرو */}
          <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 backdrop-blur-xl">
              <span className="text-[10px] text-slate-400 font-bold block">🎮 أجهزة البلايستيشن</span>
              <p className="text-xl font-black text-emerald-400 font-mono mt-0.5">{availablePsCount} متاح للعب</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 backdrop-blur-xl">
              <span className="text-[10px] text-slate-400 font-bold block">🎱 طاولات البلياردو</span>
              <p className="text-xl font-black text-amber-300 font-mono mt-0.5">{availableBilliardsCount} طاولة جاهزة</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 backdrop-blur-xl">
              <span className="text-[10px] text-slate-400 font-bold block">⭐ نقاط ولائك</span>
              <p className="text-xl font-black text-sky-400 font-mono mt-0.5">{currentPoints} نقطة</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 backdrop-blur-xl">
              <span className="text-[10px] text-slate-400 font-bold block">📅 حجوزاتك النشطة</span>
              <p className="text-xl font-black text-violet-300 font-mono mt-0.5">{activeBookings.length} حجز</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. شريط الأيقونات العائمة الكاجوال (Floating Casual Action Bubbles) */}
      <section className="sticky top-[69px] z-40 bg-[#030712]/90 backdrop-blur-xl border-b border-white/5 py-3">
        <div className="mx-auto max-w-7xl px-4 overflow-x-auto scrollbar-none">
          <div className="flex items-center justify-start sm:justify-center gap-2.5 min-w-max">
            <a
              href="#booking"
              className="rounded-full bg-amber-500/15 border border-amber-500/30 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition flex items-center gap-1.5 shadow-sm"
            >
              <span>🎮</span>
              <span>حجز جلسة سريعة</span>
            </a>

            <a
              href="#rates"
              className="rounded-full bg-sky-500/15 border border-sky-500/30 px-4 py-2 text-xs font-bold text-sky-300 hover:bg-sky-500/25 transition flex items-center gap-1.5 shadow-sm"
            >
              <span>🎱</span>
              <span>أسعار البلياردو والبلايستيشن</span>
            </a>

            <a
              href="#packages"
              className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition flex items-center gap-1.5 shadow-sm"
            >
              <span>🎁</span>
              <span>باقات الساعات</span>
            </a>

            <a
              href="#location"
              className="rounded-full bg-violet-500/15 border border-violet-500/30 px-4 py-2 text-xs font-bold text-violet-300 hover:bg-violet-500/25 transition flex items-center gap-1.5 shadow-sm"
            >
              <span>📍</span>
              <span>الخريطة واللوكيشن</span>
            </a>

            {loungeSettings.whatsapp && (
              <a
                href={`https://wa.me/${loungeSettings.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-emerald-600/20 border border-emerald-500/40 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-600/30 transition flex items-center gap-1.5 shadow-sm"
              >
                <span>💬</span>
                <span>واتساب الصالة</span>
              </a>
            )}

            {loungeSettings.phone && (
              <a
                href={`tel:${loungeSettings.phone}`}
                className="rounded-full bg-slate-800 border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white transition flex items-center gap-1.5 shadow-sm"
              >
                <span>📞</span>
                <span>اتصال فوري</span>
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-16">
        {/* 4. قسم باقات العميل المشحونة إن وجدت */}
        {activeSubs.length > 0 && (
          <section className="rounded-[32px] border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950 p-6 shadow-xl">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-2xl">🎁</span>
              <div>
                <h2 className="text-xl font-black text-white">رصيد باقاتك المشحونة النشطة</h2>
                <p className="text-xs text-slate-400">تُخصم ساعات لعبك تلقائياً عند زيارتك للصالة بدون دفع كاش.</p>
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {activeSubs.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-2xl border border-emerald-500/30 bg-slate-950/70 p-4 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-black text-white text-sm">{sub.planName}</h3>
                    <span className="rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5">
                      نشطة
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2">
                    <span className="text-xs text-slate-400">الرصيد المتبقي:</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">
                      {sub.remainingHoursText}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    صالحة حتى: {new Date(sub.expiryDate).toLocaleDateString("ar-EG")}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 5. قسم حجوزات العميل والعداد التنازلي */}
        {bookings.length > 0 && (
          <section id="my-bookings" className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <span>📅</span>
                  <span>حجوزاتك الحالية والقادمة</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">متابعة وقت بدء الجلسة والعداد التنازلي المباشر</p>
              </div>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-mono font-bold text-amber-300">
                {bookings.length} حجز مسجل
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {bookings.slice(0, 4).map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-white text-base">{b.device.name}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {new Intl.DateTimeFormat("ar-EG", { dateStyle: "full", timeStyle: "short" }).format(new Date(b.startTime))}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                        b.status === "CONFIRMED"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : b.status === "PENDING"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {b.status === "CONFIRMED" ? "✓ مؤكد" : b.status === "PENDING" ? "قيد التأكيد" : "ملغي"}
                    </span>
                  </div>

                  <BookingCountdown
                    startTime={b.startTime}
                    endTime={new Date(new Date(b.startTime).getTime() + 60 * 60 * 1000)}
                    status={b.status}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 6. قائمة الأسعار الاحترافية الحية (PlayStation & Billiards Live Rates) */}
        <section id="rates" className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="rounded-full bg-sky-500/10 border border-sky-500/30 px-3.5 py-1 text-xs font-bold text-sky-300 uppercase tracking-widest inline-block">
              Pricing & Devices
            </span>
            <h2 className="text-3xl font-black text-white">قائمة الأسعار والأجهزة بالصالة</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              أسعار شفافة ودقيقة متوافقة مع عدادات الصالة لحظة بلحظة.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* كارت أسعار البلياردو */}
            <div className="rounded-[30px] border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🎱</span>
                  <div>
                    <h3 className="text-xl font-black text-white">طاولات البلياردو الاحترافية</h3>
                    <p className="text-xs text-amber-300/80">طاولات مستوردة، عصيان نقية، وكرات معتمدة</p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-400/30">
                  {availableBilliardsCount} طاولة متاحة
                </span>
              </div>

              <div className="space-y-3">
                {billiardDevices.map((table) => (
                  <div
                    key={table.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-white text-sm">{table.name}</p>
                      <span className="text-[10px] text-slate-400">طاولة ألعاب بلياردو وسنوكر</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <span className="text-[10px] text-slate-400 block">سعر الساعة:</span>
                        <span className="font-mono text-base font-black text-emerald-400">
                          {table.singleHourlyRate} ج.م / س
                        </span>
                      </div>

                      <div className="text-left border-r border-slate-800 pr-4">
                        <span className="text-[10px] text-slate-400 block">سعر الجيم:</span>
                        <span className="font-mono text-base font-black text-amber-300">
                          {table.multiHourlyRate} ج.م / جيم
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {billiardDevices.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
                    طاولات البلياردو يتم تسجيلها من لوحة الإدارة وسعر الساعة يبدأ من 60 ج.م
                  </div>
                )}
              </div>
            </div>

            {/* كارت أسعار البلايستيشن */}
            <div className="rounded-[30px] border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-slate-900 to-slate-950 p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🎮</span>
                  <div>
                    <h3 className="text-xl font-black text-white">أجهزة PlayStation 5 & VIP</h3>
                    <p className="text-xs text-sky-300/80">شاشات OLED 4K 120Hz، دراعات إضافية، وتكييف مركزي</p>
                  </div>
                </div>
                <span className="rounded-full bg-sky-400/20 px-3 py-1 text-xs font-bold text-sky-300 border border-sky-400/30">
                  {availablePsCount} جهاز متاح
                </span>
              </div>

              <div className="space-y-3">
                {psDevices.slice(0, 5).map((device) => (
                  <div
                    key={device.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-white text-sm">{device.name}</p>
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                        {device.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <span className="text-[10px] text-slate-400 block">لعب فردي (Single):</span>
                        <span className="font-mono text-base font-black text-emerald-400">
                          {device.singleHourlyRate} ج.م / س
                        </span>
                      </div>

                      <div className="text-left border-r border-slate-800 pr-4">
                        <span className="text-[10px] text-slate-400 block">لعب جماعي (Multi):</span>
                        <span className="font-mono text-base font-black text-amber-300">
                          {device.multiHourlyRate} ج.م / س
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {psDevices.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
                    أجهزة البلايستيشن تسجل من لوحة الإدارة.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 7. قسم باقات الساعات والعروض المخفضة */}
        <section id="packages" className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1 text-xs font-bold text-emerald-300 uppercase tracking-widest inline-block">
              Packages & Deals
            </span>
            <h2 className="text-3xl font-black text-white">باقات الساعات مسبقة الدفع</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              اشترِ باقتك المفضلة بخصم الساعات واستمتع باللعب بأي وقت مع مشروبات مجانية.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {landingContent.packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`rounded-[30px] border p-6 flex flex-col justify-between ${
                  pkg.highlight
                    ? "border-amber-400/50 bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-950 shadow-2xl shadow-amber-500/10"
                    : "border-white/10 bg-slate-900/80"
                }`}
              >
                <div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-black text-white">{pkg.name}</p>
                    {pkg.highlight && (
                      <span className="rounded-full bg-amber-400/20 px-3 py-0.5 text-xs font-bold text-amber-300 border border-amber-400/30">
                        الأكثر طلباً ⭐
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white font-mono">{pkg.price}</span>
                    <span className="text-sm text-slate-400">ج.م</span>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-300 border-t border-white/10 pt-4">
                    <p className="flex items-center gap-2">
                      <span>⏱️</span>
                      <strong className="text-emerald-400 text-sm">{pkg.hours} ساعات لعب رصيد</strong>
                    </p>
                    <p className="flex items-center gap-2">
                      <span>📅</span>
                      <span>صلاحية لمدة: <strong>{pkg.validityDays} يوم</strong></span>
                    </p>
                    {pkg.drinksCount > 0 && (
                      <p className="flex items-center gap-2">
                        <span>☕</span>
                        <strong className="text-cyan-300">{pkg.drinksCount} مشروب مجاني</strong>
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <PackageOrderModal
                    plan={{
                      id: pkg.id,
                      name: pkg.name,
                      price: pkg.price,
                      hours: pkg.hours,
                      validityDays: pkg.validityDays,
                      drinksCount: pkg.drinksCount,
                      highlight: pkg.highlight,
                    }}
                    currentUser={user}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 8. قسم الحجز المباشر (احجز موعدك) */}
        <section id="booking" className="rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 lg:p-10 shadow-2xl">
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <div className="space-y-4">
              <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-3.5 py-1 text-xs font-bold text-amber-300 inline-block">
                Online Reservation
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                احجز طاولتك أو جهازك المفضل مسبقاً
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                حدد الوقت ونوع الجلسة التي تناسبك وسيقوم فريق الصالة بتجهيز مكانك وتهيئة التكييف والمشروبات لاستقبالك.
              </p>

              <div className="pt-2 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3.5">
                  <span className="text-slate-400 block">بدون رسوم حجز</span>
                  <strong className="text-emerald-400 text-sm">حجز فوري ومؤكد</strong>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3.5">
                  <span className="text-slate-400 block">خدمة الضيافة</span>
                  <strong className="text-amber-300 text-sm">كافيه متكامل ☕</strong>
                </div>
              </div>
            </div>

            <form
              action={createCustomerBooking}
              className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/80 p-6 shadow-xl"
            >
              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div>
                  <label className="mb-1.5 block font-bold text-slate-300">اسم العميل:</label>
                  <input
                    name="name"
                    defaultValue={user?.name ?? ""}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400"
                    placeholder="اسمك الكريم"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-bold text-slate-300">رقم الهاتف:</label>
                  <input
                    name="phone"
                    defaultValue={user?.phone ?? ""}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400 font-mono"
                    placeholder="01XXXXXXXXX"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div>
                  <label className="mb-1.5 block font-bold text-slate-300">نوع الخدمة / الطاولة:</label>
                  <select
                    name="serviceType"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400 font-bold"
                  >
                    <option value="PS5">🎮 جلسة PS5 (فردي / زوجي)</option>
                    <option value="VIP">👑 غرفة VIP خاصة</option>
                    <option value="PC">🎱 طاولة بلياردو (ساعة)</option>
                    <option value="PS4">🎱 طاولة بلياردو (جيم)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block font-bold text-slate-300">اليوم المفضل:</label>
                  <input
                    name="bookingDate"
                    type="date"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="mb-1.5 block font-bold text-slate-300">الوقت التقريبي للحضور:</label>
                <input
                  name="bookingTime"
                  type="time"
                  defaultValue="19:00"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400 font-mono"
                  required
                />
              </div>

              <div className="text-xs">
                <label className="mb-1.5 block font-bold text-slate-300">ملاحظات إضافية (اختياري):</label>
                <input
                  name="notes"
                  placeholder="مثال: عدد 4 لاعبين / تحضير طاولة البلياردو القريبة من الشاشة"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 py-3.5 text-sm font-black text-slate-950 shadow-xl shadow-orange-500/25 transition hover:brightness-110 active:scale-95"
              >
                تأكيد حجز الجلسة الآن
              </button>
            </form>
          </div>
        </section>

        {/* 9. قسم موقع الصالة والخريطة التفاعلية (Location & Google Maps) */}
        <section id="location" className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 lg:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <span className="text-xs font-bold text-amber-300 uppercase tracking-widest block">Find Us</span>
              <h2 className="text-2xl font-black text-white flex items-center gap-2 mt-1">
                <span>📍</span>
                <span>موقعنا على الخريطة وساعات العمل</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">{loungeSettings.address}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {loungeSettings.whatsapp && (
                <a
                  href={`https://wa.me/${loungeSettings.whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-black text-slate-950 hover:bg-emerald-400 transition flex items-center gap-1.5"
                >
                  <span>💬</span>
                  <span>واتساب اللوكيشن</span>
                </a>
              )}

              {loungeSettings.phone && (
                <a
                  href={`tel:${loungeSettings.phone}`}
                  className="rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:border-slate-500 transition flex items-center gap-1.5"
                >
                  <span>📞</span>
                  <span>اتصل بالصالة: {loungeSettings.phone}</span>
                </a>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_2fr] items-center">
            {/* بطاقة تفاصيل الموقع والمميزات */}
            <div className="space-y-4 text-xs">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-2">
                <span className="text-slate-400 block">العنوان بالتفصيل:</span>
                <p className="font-bold text-white text-sm">{loungeSettings.address}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-2">
                <span className="text-slate-400 block">ساعات العمل:</span>
                <p className="font-bold text-emerald-400 text-sm">مفتوح يومياً 24 ساعة بدون انقطاع</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-1">
                <span className="text-slate-400 block">خدمات إضافية متوفرة:</span>
                <p className="text-slate-300">✓ بار مشروبات ساخنة وعصائر ومثلجات</p>
                <p className="text-slate-300">✓ إنترنت Wi-Fi فائق السرعة مجاناً</p>
                <p className="text-slate-300">✓ جراج وركنة سيارات متاحة</p>
              </div>
            </div>

            {/* إطار خريطة جوجل التفاعلية */}
            <div className="h-80 w-full overflow-hidden rounded-2xl border border-white/10 shadow-inner bg-slate-950">
              {loungeSettings.mapUrl ? (
                <iframe
                  src={loungeSettings.mapUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="موقع صالة البلايستيشن والبلياردو"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">
                  يمكن إضافة رابط الخريطة من لوحة التحكم (إدارة المحتوى).
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* 10. الفوتر الكاجوال */}
      <footer className="border-t border-white/10 bg-[#02050f] mt-16 py-8 text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-white text-sm">PlayLounge</span>
            <span>· صالة ألعاب البلايستيشن والبلياردو والكافيه</span>
          </div>
          <p>© 2026 جميع الحقوق محفوظة لـ PlayLounge</p>
        </div>
      </footer>
    </main>
  );
}