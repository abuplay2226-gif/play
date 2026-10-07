import Link from "next/link";
import { getCurrentUser, signOut } from "@/app/actions/auth";
import { createCustomerBooking } from "@/app/actions/customer-bookings";
import { getLandingPageContent, getLoungeSettings } from "@/app/actions/site-content";
import { PackageOrderModal } from "@/components/package-order-modal";
import { isBilliardDevice } from "@/lib/device-utils";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const [user, { services, packages, reviews }, loungeSettings, devices] = await Promise.all([
    getCurrentUser(),
    getLandingPageContent(),
    getLoungeSettings(),
    prisma.device.findMany({ orderBy: { name: "asc" } }),
  ]);

  // تصنيف الأجهزة إلى بلايستيشن وبلياردو
  const billiardDevices = devices.filter((d) => isBilliardDevice(d.type));
  const psDevices = devices.filter((d) => !isBilliardDevice(d.type));

  const availableBilliardsCount = billiardDevices.filter((d) => d.status === "AVAILABLE").length;
  const availablePsCount = psDevices.filter((d) => d.status === "AVAILABLE").length;

  const dashboardHref =
    user?.role === "ADMIN"
      ? "/admin"
      : user?.role === "CASHIER" || user?.role === "STAFF"
      ? "/staff"
      : "/customer";

  return (
    <main dir="rtl" className="min-h-screen bg-[#020617] text-white selection:bg-amber-400 selection:text-slate-950 overflow-x-hidden">
      {/* ستايل الحركات والطفو والتوهج النيون للأيقونات الكبيرة */}
      <style>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(1.5deg); }
        }
        @keyframes floatReverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(8px) rotate(-1.5deg); }
        }
        @keyframes neonPulse {
          0%, 100% { opacity: 0.35; transform: scale(0.98); }
          50% { opacity: 0.85; transform: scale(1.08); }
        }
        @keyframes starTwinkle {
          0%, 100% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 8px rgba(250,204,21,0.6)); }
          50% { transform: scale(1.15) rotate(12deg); filter: drop-shadow(0 0 20px rgba(250,204,21,0.95)); }
        }
        @keyframes radarSweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes shimmerBtn {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(150%); }
        }
        @keyframes steamFloat {
          0% { transform: translateY(0) scaleX(1); opacity: 0.9; }
          50% { transform: translateY(-6px) scaleX(1.2); opacity: 0.4; }
          100% { transform: translateY(-12px) scaleX(0.8); opacity: 0; }
        }
        .animate-float-slow {
          animation: floatSlow 4s ease-in-out infinite;
        }
        .animate-float-reverse {
          animation: floatReverse 4.5s ease-in-out infinite;
        }
        .animate-neon-pulse {
          animation: neonPulse 3s ease-in-out infinite;
        }
        .animate-star-twinkle {
          animation: starTwinkle 3s ease-in-out infinite;
        }
        .animate-radar-sweep {
          animation: radarSweep 5s linear infinite;
        }
        .animate-shimmer {
          animation: shimmerBtn 3s infinite ease-in-out;
        }
        .animate-steam {
          animation: steamFloat 2s infinite ease-out;
        }
      `}</style>

      {/* 1. الشريط العلوي بتصميم زجاجي كاجوال */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070d1f]/85 backdrop-blur-2xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-xl font-black text-slate-950 shadow-xl shadow-orange-500/25">
              <span className="relative z-10">P</span>
              <span className="absolute -inset-0.5 rounded-2xl bg-amber-400 opacity-40 blur-md animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs uppercase tracking-[0.25em] text-amber-300 font-bold">PlayLounge</span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  مفتوح 24 ساعة
                </span>
              </div>
              <p className="text-sm font-black text-white">صالة البلايستيشن والبلياردو</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-7 text-xs font-bold text-slate-300">
            <a href="#hub" className="hover:text-amber-300 transition">أقسام الصالة</a>
            <a href="#rates" className="hover:text-amber-300 transition">الأسعار والأجهزة</a>
            <a href="#packages" className="hover:text-amber-300 transition">الباقات</a>
            <a href="#booking" className="hover:text-amber-300 transition">احجز جلستك</a>
            <a href="#location" className="hover:text-amber-300 transition">الخريطة واللوكيشن</a>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href={dashboardHref}
                  className="rounded-full bg-slate-900 border border-amber-400/30 px-4 py-2 text-xs font-bold text-amber-300 transition hover:bg-slate-800"
                >
                  لوحة التحكم ({user.name})
                </Link>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20"
                  >
                    خروج
                  </button>
                </form>
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-full border border-white/15 bg-slate-900/60 px-4 py-2 text-xs font-bold text-white transition hover:border-amber-400 hover:text-amber-300"
              >
                تسجيل الدخول
              </Link>
            )}

            <Link
              href="#booking"
              className="rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-5 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-orange-500/25 transition hover:scale-105 active:scale-95"
            >
              احجز الآن
            </Link>
          </div>
        </nav>
      </header>

      {/* 2. قسم الهيرو الرئيسي الديناميكي */}
      <section className="relative overflow-hidden min-h-[620px] flex items-center justify-center border-b border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 scale-105"
          style={{
            backgroundImage: `url('${loungeSettings.heroImage}')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/85 to-[#020617]/55" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(251,191,36,0.18),_transparent_70%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center space-y-7">
          {/* وسام ترحيبي عائم كاجوال */}
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-slate-950/85 px-4 py-2 text-xs font-bold text-amber-300 shadow-2xl backdrop-blur-xl animate-in fade-in">
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <span>🎱 طاولات بلياردو احترافية · 🎮 أجهزة PS5 وشاشات 4K فائقة · ☕ كافيه متكامل</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight drop-shadow-2xl max-w-4xl mx-auto">
            {loungeSettings.heroTitle}
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
            {loungeSettings.heroSubtitle}
          </p>

          {/* أزرار الإجراءات النيون التفاعلية مع تأثيرات ضوئية متحركة */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
            <Link
              href="#booking"
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-8 py-4 text-sm font-black text-slate-950 shadow-[0_0_30px_rgba(249,115,22,0.4)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_45px_rgba(249,115,22,0.7)] active:scale-95"
            >
              <span className="absolute inset-0 w-1/2 h-full bg-white/25 skew-x-12 animate-shimmer pointer-events-none" />
              <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/20 text-lg group-hover:scale-110 transition-transform">
                <span className="absolute h-full w-full rounded-full bg-white/30 animate-ping opacity-60" />
                🎯
              </span>
              <span className="relative tracking-wide">احجز طاولتك أو جهازك الآن</span>
            </Link>

            <a
              href="#rates"
              className="group relative inline-flex items-center gap-3 rounded-full border border-amber-400/40 bg-slate-950/80 px-7 py-4 text-sm font-bold text-white shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-amber-400 hover:bg-slate-900/90 hover:shadow-[0_0_30px_rgba(251,191,36,0.3)] hover:scale-105"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/15 text-lg group-hover:rotate-12 transition-transform">
                💰
              </span>
              <span className="group-hover:text-amber-300 transition-colors">قائمة الأسعار الحية</span>
            </a>
          </div>

          {/* كروت المؤشرات الأربعة الكبيرة بأيقونات ثلاثية الأبعاد متحركة وإضاءات نيون */}
          <div className="pt-6 grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 max-w-5xl mx-auto">
            {/* 1. كارت أجهزة البلايستيشن */}
            <div className="group relative rounded-[26px] border border-emerald-500/30 bg-slate-950/85 p-4 sm:p-5 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-2 hover:border-emerald-400 hover:shadow-[0_0_30px_rgba(52,211,153,0.3)] overflow-hidden text-right">
              <div className="absolute -inset-0.5 rounded-[26px] bg-gradient-to-br from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div className="relative flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-300 group-hover:text-emerald-300 transition-colors">
                  أجهزة البلايستيشن
                </span>

                <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 shadow-md shadow-emerald-500/30 animate-float-slow group-hover:scale-110 transition-transform">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.75 3.5C5.12 3.5 3 5.62 3 8.25c0 1.25.48 2.39 1.28 3.25L3.2 18.15c-.17.92.48 1.8 1.41 1.95.93.15 1.8-.48 1.95-1.41L7.3 14.5h9.4l.74 4.19c.15.93 1.02 1.56 1.95 1.41.93-.15 1.58-1.03 1.41-1.95l-1.08-6.65c.8-.86 1.28-2 1.28-3.25 0-2.63-2.12-4.75-4.75-4.75H7.75zM8 8a1 1 0 110 2 1 1 0 010-2zm8 0a1 1 0 110 2 1 1 0 010-2zm-9 3h2v2H7v-2zm10 0a1 1 0 110 2 1 1 0 010-2z" />
                  </svg>
                </div>
              </div>

              <div className="relative flex items-baseline gap-1.5">
                <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]">
                  {availablePsCount}
                </p>
                <span className="text-xs sm:text-sm font-bold text-emerald-300">متاح للعب الآن</span>
              </div>

              <div className="relative mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span>شاشات 4K جاهزة فوراً</span>
              </div>
            </div>

            {/* 2. كارت طاولات البلياردو */}
            <div className="group relative rounded-[26px] border border-amber-500/30 bg-slate-950/85 p-4 sm:p-5 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-2 hover:border-amber-400 hover:shadow-[0_0_30px_rgba(251,191,36,0.3)] overflow-hidden text-right">
              <div className="absolute -inset-0.5 rounded-[26px] bg-gradient-to-br from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div className="relative flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-300 group-hover:text-amber-300 transition-colors">
                  طاولات البلياردو
                </span>

                <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-slate-950 shadow-md shadow-amber-500/30 animate-float-reverse group-hover:scale-110 transition-transform">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="9" />
                    <circle cx="12" cy="12" r="4.5" fill="#ffffff" />
                    <path d="M12 9.5a1.25 1.25 0 00-.88 2.13A1.5 1.5 0 1012 14.5a1.5 1.5 0 00.88-2.87A1.25 1.25 0 0012 9.5zm-.5 1.25a.5.5 0 111 0 .5.5 0 01-1 0zm0 2.5a.65.65 0 111.3 0 .65.65 0 01-1.3 0z" fill="#000000" />
                  </svg>
                </div>
              </div>

              <div className="relative flex items-baseline gap-1.5">
                <p className="text-2xl sm:text-3xl font-black text-amber-300 font-mono drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]">
                  {availableBilliardsCount}
                </p>
                <span className="text-xs sm:text-sm font-bold text-amber-200">طاولة جاهزة</span>
              </div>

              <div className="relative mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                <span>عصيان وكرات معتمدة</span>
              </div>
            </div>

            {/* 3. كارت تقييم العملاء */}
            <div className="group relative rounded-[26px] border border-sky-500/30 bg-slate-950/85 p-4 sm:p-5 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-2 hover:border-sky-400 hover:shadow-[0_0_30px_rgba(56,189,248,0.3)] overflow-hidden text-right">
              <div className="absolute -inset-0.5 rounded-[26px] bg-gradient-to-br from-sky-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div className="relative flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-300 group-hover:text-sky-300 transition-colors">
                  تقييم العملاء
                </span>

                <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-slate-950 shadow-md shadow-sky-500/30 animate-star-twinkle group-hover:scale-110 transition-transform">
                  <svg className="h-6 w-6 text-amber-300 fill-amber-300" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
              </div>

              <div className="relative flex items-baseline gap-1.5">
                <p className="text-2xl sm:text-3xl font-black text-sky-300 font-mono drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]">
                  4.9
                </p>
                <span className="text-xs sm:text-sm font-bold text-slate-400 font-mono">/ 5.0</span>
              </div>

              <div className="relative mt-2.5 flex items-center gap-1 text-[10px] text-amber-400">
                <span>★★★★★</span>
                <span className="text-slate-400 mr-1">(تقييم ممتاز)</span>
              </div>
            </div>

            {/* 4. كارت ساعات العمل 24/7 */}
            <div className="group relative rounded-[26px] border border-violet-500/30 bg-slate-950/85 p-4 sm:p-5 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-2 hover:border-violet-400 hover:shadow-[0_0_30px_rgba(167,139,250,0.3)] overflow-hidden text-right">
              <div className="absolute -inset-0.5 rounded-[26px] bg-gradient-to-br from-violet-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div className="relative flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-300 group-hover:text-violet-300 transition-colors">
                  ساعات العمل
                </span>

                <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 text-slate-950 shadow-md shadow-violet-500/30 animate-float-slow group-hover:scale-110 transition-transform">
                  <svg className="h-6 w-6 animate-radar-sweep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
              </div>

              <div className="relative flex items-baseline gap-1.5">
                <p className="text-2xl sm:text-3xl font-black text-violet-300 font-mono drop-shadow-[0_0_12px_rgba(167,139,250,0.5)]">
                  24/7
                </p>
                <span className="text-xs sm:text-sm font-bold text-violet-200">متواصل</span>
              </div>

              <div className="relative mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="h-2 w-2 rounded-full bg-violet-400 animate-ping" />
                <span>نستقبلك في أي وقت 🌙☀️</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 🔥 مركز الأيقونات الكبيرة العصرية والمتحركة بالكامل (The Mega Casual Animated Hub) */}
      <section id="hub" className="relative py-16 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="rounded-full bg-gradient-to-r from-amber-400/20 via-orange-500/20 to-rose-500/20 border border-amber-400/30 px-4 py-1.5 text-xs font-black text-amber-300 uppercase tracking-widest inline-flex items-center gap-2 shadow-lg">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            Lounge Experience · خدمات وأقسام الصالة الكبرى
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white">اختر وجهتك بنقرة واحدة</h2>
          <p className="text-xs sm:text-sm text-slate-400">
            أيقونات كبيرة وعصرية ومتحركة تأخذك مباشرة للجلسة أو الأسعار أو اللوكيشن أو الدعم.
          </p>
        </div>

        {/* شبكة الأيقونات الثمانية الكبيرة ثلاثية الأبعاد */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {/* 1. حجز جلسة سريعة */}
          <Link
            href="#booking"
            className="group relative flex flex-col items-center text-center p-6 rounded-[32px] border border-amber-500/30 bg-gradient-to-b from-amber-500/15 via-slate-900/90 to-slate-950 backdrop-blur-2xl shadow-xl transition-all duration-300 hover:-translate-y-2.5 hover:border-amber-400 hover:shadow-[0_0_35px_rgba(251,191,36,0.3)] overflow-hidden"
          >
            <div className="absolute -inset-0.5 rounded-[32px] bg-amber-500 opacity-0 blur-2xl group-hover:opacity-40 transition-opacity duration-500" />
            
            <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 p-4 shadow-xl shadow-amber-500/30 animate-float-slow group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <svg className="h-11 w-11 text-slate-950" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </div>

            <h3 className="text-base sm:text-lg font-black text-white group-hover:text-amber-300 transition">حجز جلسة سريعة</h3>
            <p className="mt-1 text-xs text-slate-400">تأكيد فوري بدون انتظار</p>
            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-amber-400/15 border border-amber-400/30 px-3 py-1 text-[11px] font-bold text-amber-300">
              احجز الآن 🎯
            </span>
          </Link>

          {/* 2. أسعار البلايستيشن والـ VIP */}
          <a
            href="#rates"
            className="group relative flex flex-col items-center text-center p-6 rounded-[32px] border border-sky-500/30 bg-gradient-to-b from-sky-500/15 via-slate-900/90 to-slate-950 backdrop-blur-2xl shadow-xl transition-all duration-300 hover:-translate-y-2.5 hover:border-sky-400 hover:shadow-[0_0_35px_rgba(56,189,248,0.3)] overflow-hidden"
          >
            <div className="absolute -inset-0.5 rounded-[32px] bg-sky-500 opacity-0 blur-2xl group-hover:opacity-40 transition-opacity duration-500" />
            
            <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 p-4 shadow-xl shadow-sky-500/30 animate-float-reverse group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300">
              <svg className="h-11 w-11 text-slate-950" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.75 3.5C5.12 3.5 3 5.62 3 8.25c0 1.25.48 2.39 1.28 3.25L3.2 18.15c-.17.92.48 1.8 1.41 1.95.93.15 1.8-.48 1.95-1.41L7.3 14.5h9.4l.74 4.19c.15.93 1.02 1.56 1.95 1.41.93-.15 1.58-1.03 1.41-1.95l-1.08-6.65c.8-.86 1.28-2 1.28-3.25 0-2.63-2.12-4.75-4.75-4.75H7.75zM8 8a1 1 0 110 2 1 1 0 010-2zm8 0a1 1 0 110 2 1 1 0 010-2zm-9 3h2v2H7v-2zm10 0a1 1 0 110 2 1 1 0 010-2z" />
              </svg>
            </div>

            <h3 className="text-base sm:text-lg font-black text-white group-hover:text-sky-300 transition">أسعار البلايستيشن</h3>
            <p className="mt-1 text-xs text-slate-400">فردي، زوجي، وغرف VIP</p>
            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-sky-500/15 border border-sky-500/30 px-3 py-1 text-[11px] font-bold text-sky-300 font-mono">
              {availablePsCount} جهاز متاح
            </span>
          </a>

          {/* 3. أسعار طاولات البلياردو */}
          <a
            href="#rates"
            className="group relative flex flex-col items-center text-center p-6 rounded-[32px] border border-amber-500/30 bg-gradient-to-b from-amber-500/15 via-slate-900/90 to-slate-950 backdrop-blur-2xl shadow-xl transition-all duration-300 hover:-translate-y-2.5 hover:border-amber-400 hover:shadow-[0_0_35px_rgba(251,191,36,0.3)] overflow-hidden"
          >
            <div className="absolute -inset-0.5 rounded-[32px] bg-amber-500 opacity-0 blur-2xl group-hover:opacity-40 transition-opacity duration-500" />
            
            <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 p-4 shadow-xl shadow-amber-500/30 animate-float-slow group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <svg className="h-11 w-11 text-slate-950" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="4.5" fill="#ffffff" />
                <path d="M12 9.5a1.25 1.25 0 00-.88 2.13A1.5 1.5 0 1012 14.5a1.5 1.5 0 00.88-2.87A1.25 1.25 0 0012 9.5zm-.5 1.25a.5.5 0 111 0 .5.5 0 01-1 0zm0 2.5a.65.65 0 111.3 0 .65.65 0 01-1.3 0z" fill="#000000" />
              </svg>
            </div>

            <h3 className="text-base sm:text-lg font-black text-white group-hover:text-amber-300 transition">طاولات البلياردو</h3>
            <p className="mt-1 text-xs text-slate-400">بالساعة أو بالجيم المفتوح</p>
            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-[11px] font-bold text-amber-300 font-mono">
              {availableBilliardsCount} طاولة جاهزة
            </span>
          </a>

          {/* 4. باقات الساعات والتوفير */}
          <a
            href="#packages"
            className="group relative flex flex-col items-center text-center p-6 rounded-[32px] border border-emerald-500/30 bg-gradient-to-b from-emerald-500/15 via-slate-900/90 to-slate-950 backdrop-blur-2xl shadow-xl transition-all duration-300 hover:-translate-y-2.5 hover:border-emerald-400 hover:shadow-[0_0_35px_rgba(52,211,153,0.3)] overflow-hidden"
          >
            <div className="absolute -inset-0.5 rounded-[32px] bg-emerald-500 opacity-0 blur-2xl group-hover:opacity-40 transition-opacity duration-500" />
            
            <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 p-4 shadow-xl shadow-emerald-500/30 animate-float-reverse group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300">
              <svg className="h-11 w-11 text-slate-950" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 6h-2.18c.11-.31.18-.65.18-1a3 3 0 00-5.45-1.73L12 4.14l-.55-.87A3 3 0 006 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1h-2V5c0-.55.45-1 1-1zm-6 1c0-.55.45-1 1-1s1 .45 1 1v1H9V5zm11 14H4v-2h16v2zm0-5H4v-5h6.5v2h3v-2H20v5z" />
              </svg>
            </div>

            <h3 className="text-base sm:text-lg font-black text-white group-hover:text-emerald-300 transition">باقات التوفير</h3>
            <p className="mt-1 text-xs text-slate-400">ساعات إضافية وخصومات</p>
            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-[11px] font-bold text-emerald-300">
              خصم حتى 35% 🎁
            </span>
          </a>

          {/* 5. بطولات الجيمينج eSports */}
          <Link
            href="/tournaments"
            className="group relative flex flex-col items-center text-center p-6 rounded-[32px] border border-violet-500/30 bg-gradient-to-b from-violet-500/15 via-slate-900/90 to-slate-950 backdrop-blur-2xl shadow-xl transition-all duration-300 hover:-translate-y-2.5 hover:border-violet-400 hover:shadow-[0_0_35px_rgba(167,139,250,0.3)] overflow-hidden"
          >
            <div className="absolute -inset-0.5 rounded-[32px] bg-violet-500 opacity-0 blur-2xl group-hover:opacity-40 transition-opacity duration-500" />
            
            <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 p-4 shadow-xl shadow-violet-500/30 animate-float-slow group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <svg className="h-11 w-11 text-slate-950" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H8v2h8v-2h-3v-3.1c1.83-.43 3.24-1.84 3.61-3.06C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
              </svg>
            </div>

            <h3 className="text-base sm:text-lg font-black text-white group-hover:text-violet-300 transition">بطولات الصالة</h3>
            <p className="mt-1 text-xs text-slate-400">تحديات FC 26 وبلياردو</p>
            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-violet-500/15 border border-violet-500/30 px-3 py-1 text-[11px] font-bold text-violet-300">
              جوائز نقدية 🏆
            </span>
          </Link>

          {/* 6. بار الكافيه والمشروبات */}
          <a
            href="#services"
            className="group relative flex flex-col items-center text-center p-6 rounded-[32px] border border-rose-500/30 bg-gradient-to-b from-rose-500/15 via-slate-900/90 to-slate-950 backdrop-blur-2xl shadow-xl transition-all duration-300 hover:-translate-y-2.5 hover:border-rose-400 hover:shadow-[0_0_35px_rgba(251,113,133,0.3)] overflow-hidden"
          >
            <div className="absolute -inset-0.5 rounded-[32px] bg-rose-500 opacity-0 blur-2xl group-hover:opacity-40 transition-opacity duration-500" />
            
            <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-pink-600 p-4 shadow-xl shadow-rose-500/30 animate-float-reverse group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300">
              <svg className="h-11 w-11 text-slate-950" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 19h18v2H2v-2zm18-9h-1V7a2 2 0 00-2-2H5a2 2 0 00-2 2v8a4 4 0 004 4h8a4 4 0 004-4v-1h1a3 3 0 003-3v-2a3 3 0 00-3-3zm1 5a1 1 0 01-1 1h-1v-4h1a1 1 0 011 1v2zM5 7h12v8a2 2 0 01-2 2H7a2 2 0 01-2-2V7z" />
              </svg>
            </div>

            <h3 className="text-base sm:text-lg font-black text-white group-hover:text-rose-300 transition">بار الكافيه</h3>
            <p className="mt-1 text-xs text-slate-400">قهوة، مثلجات وسناكس</p>
            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-3 py-1 text-[11px] font-bold text-rose-300">
              منيو كامل ☕
            </span>
          </a>

          {/* 7. الخريطة واللوكيشن المباشر */}
          <a
            href="#location"
            className="group relative flex flex-col items-center text-center p-6 rounded-[32px] border border-orange-500/30 bg-gradient-to-b from-orange-500/15 via-slate-900/90 to-slate-950 backdrop-blur-2xl shadow-xl transition-all duration-300 hover:-translate-y-2.5 hover:border-orange-400 hover:shadow-[0_0_35px_rgba(249,115,22,0.3)] overflow-hidden"
          >
            <div className="absolute -inset-0.5 rounded-[32px] bg-orange-500 opacity-0 blur-2xl group-hover:opacity-40 transition-opacity duration-500" />
            
            <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-red-600 p-4 shadow-xl shadow-orange-500/30 animate-float-slow group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <svg className="h-11 w-11 text-slate-950" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
              </svg>
            </div>

            <h3 className="text-base sm:text-lg font-black text-white group-hover:text-orange-300 transition">الخريطة واللوكيشن</h3>
            <p className="mt-1 text-xs text-slate-400">على خرائط جوجل مباشرة</p>
            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-orange-500/15 border border-orange-500/30 px-3 py-1 text-[11px] font-bold text-orange-300">
              افتح الخريطة 📍
            </span>
          </a>

          {/* 8. واتساب ودعم الصالة الفوري */}
          <a
            href={loungeSettings.whatsapp ? `https://wa.me/${loungeSettings.whatsapp}` : "#location"}
            target="_blank"
            rel="noreferrer"
            className="group relative flex flex-col items-center text-center p-6 rounded-[32px] border border-emerald-500/30 bg-gradient-to-b from-emerald-500/15 via-slate-900/90 to-slate-950 backdrop-blur-2xl shadow-xl transition-all duration-300 hover:-translate-y-2.5 hover:border-emerald-400 hover:shadow-[0_0_35px_rgba(52,211,153,0.3)] overflow-hidden"
          >
            <div className="absolute -inset-0.5 rounded-[32px] bg-emerald-500 opacity-0 blur-2xl group-hover:opacity-40 transition-opacity duration-500" />
            
            <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 p-4 shadow-xl shadow-emerald-500/30 animate-float-reverse group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300">
              <svg className="h-11 w-11 text-slate-950" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67M8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7.02 8.48 7.02 9.68C7.02 10.88 7.89 12.04 8.01 12.2C8.13 12.37 9.74 14.84 12.2 15.91C12.78 16.16 13.24 16.31 13.6 16.42C14.18 16.61 14.71 16.58 15.13 16.52C15.6 16.45 16.58 15.93 16.78 15.35C16.98 14.78 16.98 14.29 16.92 14.19C16.86 14.09 16.7 14.03 16.44 13.9C16.18 13.78 14.91 13.15 14.68 13.06C14.44 12.98 14.28 12.94 14.11 13.19C13.95 13.43 13.49 13.97 13.35 14.13C13.21 14.29 13.07 14.31 12.82 14.19C12.56 14.06 11.74 13.79 10.77 12.92C10.01 12.25 9.5 11.41 9.35 11.16C9.21 10.92 9.34 10.78 9.47 10.65C9.58 10.54 9.73 10.35 9.86 10.2C9.99 10.04 10.03 9.93 10.11 9.76C10.19 9.6 10.15 9.46 10.09 9.33C10.03 9.21 9.56 8.07 9.37 7.59C9.18 7.12 8.99 7.19 8.84 7.18C8.7 7.17 8.53 7.33 8.53 7.33Z" />
              </svg>
            </div>

            <h3 className="text-base sm:text-lg font-black text-white group-hover:text-emerald-300 transition">واتساب الصالة</h3>
            <p className="mt-1 text-xs text-slate-400">تواصل واستفسار مباشر</p>
            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-[11px] font-bold text-emerald-300">
              شات فوري 💬
            </span>
          </a>
        </div>
      </section>

      {/* 4. قائمة الأسعار الحية للأجهزة والبلياردو (Live Pricing Grid) */}
      <section id="rates" className="py-16 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="rounded-full bg-sky-500/10 border border-sky-500/30 px-3.5 py-1 text-xs font-bold text-sky-300 uppercase tracking-widest inline-block">
            Live Rates & Devices
          </span>
          <h2 className="text-3xl font-black text-white">قائمة الأسعار الحية بالصالة</h2>
          <p className="text-xs sm:text-sm text-slate-400">
            أسعار رسمية محدثة ومربوطة بعدادات الصالة مباشرة بدون أي رسوم خفية.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* كارت أسعار طاولات البلياردو */}
          <div className="rounded-[32px] border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/20 border border-amber-400/40 text-2xl animate-float-slow">
                  🎱
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">طاولات البلياردو الاحترافية</h3>
                  <p className="text-xs text-amber-300/80">طاولات سنوكر وبول فاخرة، عصيان نقية، وكرات معتمدة</p>
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
                  className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-amber-400/40 transition"
                >
                  <div>
                    <p className="font-bold text-white text-sm">{table.name}</p>
                    <span className="text-[10px] text-slate-400">طاولة ألعاب بلياردو احترافية</span>
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
                  طاولات البلياردو متاحة بسعر يبدأ من 60 ج.م للساعة و20 ج.م للجيم.
                </div>
              )}
            </div>
          </div>

          {/* كارت أسعار البلايستيشن */}
          <div className="rounded-[32px] border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-slate-900 to-slate-950 p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400/20 border border-sky-400/40 text-2xl animate-float-reverse">
                  🎮
                </div>
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
                  className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-sky-400/40 transition"
                >
                  <div>
                    <p className="font-bold text-white text-sm">{device.name}</p>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                      {device.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 block">فردي (Single):</span>
                      <span className="font-mono text-base font-black text-emerald-400">
                        {device.singleHourlyRate} ج.م / س
                      </span>
                    </div>

                    <div className="text-left border-r border-slate-800 pr-4">
                      <span className="text-[10px] text-slate-400 block">جماعي (Multi):</span>
                      <span className="font-mono text-base font-black text-amber-300">
                        {device.multiHourlyRate} ج.م / س
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {psDevices.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
                  أجهزة البلايستيشن متاحة بأنظمة الفردي والزوجي وغرف VIP.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 5. قسم الخدمات المميزة (Services) */}
      <section id="services" className="py-12 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300">مميزات الصالة</p>
          <h2 className="text-3xl font-black text-white sm:text-4xl">خدمات متكاملة لتجربة استثنائية</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {services.map((service) => (
            <article key={service.id} className="group relative rounded-[30px] border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-xl hover:-translate-y-2 hover:border-amber-400/40 transition-all duration-300">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-2xl font-black text-slate-950 shadow-lg shadow-orange-500/25 group-hover:scale-110 transition-transform">
                {service.icon ?? service.title[0]}
              </div>
              <h3 className="text-xl font-black text-white group-hover:text-amber-300 transition">{service.title}</h3>
              <p className="mt-3 text-xs leading-6 text-slate-300">{service.description}</p>
              <div className="mt-5 border-t border-white/10 pt-4 text-xs font-bold text-amber-300">{service.price}</div>
            </article>
          ))}
        </div>
      </section>

      {/* 6. قسم باقات الساعات المخفضة (Packages) */}
      <section id="packages" className="py-12 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-300">العروض والباقات</p>
          <h2 className="text-3xl font-black text-white sm:text-4xl">اختر باقتك واستمتع بخصم الساعات</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {packages.map((item) => (
            <div
              key={item.id}
              className={`rounded-[32px] border p-7 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 ${
                item.highlight
                  ? "border-amber-400/50 bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-950 shadow-2xl shadow-amber-500/10"
                  : "border-white/10 bg-slate-900/80 hover:border-white/25"
              }`}
            >
              <div>
                <div className="flex justify-between items-center">
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400 font-bold">{item.name}</p>
                  {item.highlight && (
                    <span className="rounded-full bg-amber-400/20 px-3 py-0.5 text-xs font-bold text-amber-300 border border-amber-400/30 flex items-center gap-1">
                      <span>⭐</span> الأكثر طلباً
                    </span>
                  )}
                </div>

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white font-mono">{item.price}</span>
                  <span className="text-sm text-slate-400">ج.م</span>
                </div>

                <div className="mt-5 space-y-2.5 text-xs text-slate-300 border-t border-white/10 pt-4">
                  <p className="flex items-center gap-2">
                    <span className="text-base">⏱️</span>
                    <strong className="text-emerald-400 text-sm">{item.hours} ساعات لعب رصيد</strong>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-base">📅</span>
                    <span>صالحة للاستخدام لمدة: <strong>{item.validityDays} يوم</strong></span>
                  </p>
                  {item.drinksCount > 0 && (
                    <p className="flex items-center gap-2">
                      <span className="text-base">☕</span>
                      <strong className="text-cyan-300">{item.drinksCount} مشروب مجاني</strong>
                    </p>
                  )}
                </div>

                <ul className="mt-6 space-y-2 text-xs text-slate-400">
                  <li>✓ خصم فوري من رصيد الساعات عند اللعب</li>
                  <li>✓ تفعيل مباشر ومشروبات مجانية بالصالة</li>
                </ul>
              </div>

              <div className="mt-7">
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
            </div>
          ))}
        </div>
      </section>

      {/* 7. قسم الحجز المباشر (Online Booking) */}
      <section id="booking" className="py-12 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl">
        <div className="rounded-[36px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 lg:p-12 shadow-2xl">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300">احجز موعدك</p>
              <h2 className="mt-3 text-3xl sm:text-4xl font-black text-white">ابدأ رحلتك داخل أجوائنا</h2>
              <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                اختر نوع الجهاز أو طاولة البلياردو والوقت المناسب وسنجهز مكانك والتكييف والمشروبات مسبقاً.
              </p>

              <div className="mt-6 space-y-3 text-xs text-slate-200">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <span className="text-slate-300 font-bold">الأجهزة والطاولات المتاحة</span>
                  <span className="font-black text-emerald-300 font-mono text-sm">{availablePsCount + availableBilliardsCount} متوفر حالياً</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <span className="text-slate-300 font-bold">سرعة التجهيز والاستقبال</span>
                  <span className="font-black text-sky-300 text-sm">بدون انتظار ⚡</span>
                </div>
              </div>
            </div>

            <form action={createCustomerBooking} className="space-y-4 rounded-[30px] border border-white/10 bg-slate-950/80 p-6 sm:p-8 text-xs shadow-xl">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="mb-1.5 block font-bold text-slate-300">اسم العميل:</label>
                  <input id="name" name="name" defaultValue={user?.name ?? ""} className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400" placeholder="أدخل اسمك" required />
                </div>
                <div>
                  <label htmlFor="phone" className="mb-1.5 block font-bold text-slate-300">رقم الهاتف:</label>
                  <input id="phone" name="phone" defaultValue={user?.phone ?? ""} className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400 font-mono" placeholder="01XXXXXXXXX" required />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="serviceType" className="mb-1.5 block font-bold text-slate-300">نوع الخدمة / الجلسة:</label>
                  <select id="serviceType" name="serviceType" className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400 font-bold">
                    <option value="PS5">🎮 جلسة PS5 (فردي / زوجي)</option>
                    <option value="VIP">👑 غرفة VIP خاصة</option>
                    <option value="PC">🎱 طاولة بلياردو (بالساعة)</option>
                    <option value="PS4">🎱 طاولة بلياردو (بالجيم)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="bookingDate" className="mb-1.5 block font-bold text-slate-300">اليوم المفضل:</label>
                  <input id="bookingDate" name="bookingDate" type="date" className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400 font-mono" required />
                </div>
              </div>

              <div>
                <label htmlFor="bookingTime" className="mb-1.5 block font-bold text-slate-300">الوقت المفضل:</label>
                <input id="bookingTime" name="bookingTime" type="time" className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400 font-mono" defaultValue="19:00" />
              </div>

              <input type="hidden" name="notes" value="حجز مباشر من الصفحة الرئيسية" />

              <button type="submit" className="w-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-orange-500/30 transition hover:brightness-110 active:scale-95">
                تأكيد حجز الجلسة الآن
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* 8. قسم موقع الصالة وخريطة جوجل التفاعلية (Google Maps & Location) */}
      <section id="location" className="py-12 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl">
        <div className="rounded-[36px] border border-white/10 bg-slate-900/80 p-6 lg:p-10 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <span className="text-xs font-bold text-amber-300 uppercase tracking-widest block">Find Us</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2 mt-1">
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
                  className="rounded-full bg-emerald-500 px-4 py-2.5 text-xs font-black text-slate-950 hover:bg-emerald-400 transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                >
                  <span>💬</span>
                  <span>واتساب اللوكيشن</span>
                </a>
              )}

              {loungeSettings.phone && (
                <a
                  href={`tel:${loungeSettings.phone}`}
                  className="rounded-full border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-white hover:border-slate-500 transition flex items-center gap-1.5"
                >
                  <span>📞</span>
                  <span>اتصل بالصالة: {loungeSettings.phone}</span>
                </a>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_2fr] items-center">
            <div className="space-y-4 text-xs">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-1.5">
                <span className="text-slate-400 block font-bold">العنوان بالتفصيل:</span>
                <p className="font-bold text-white text-sm">{loungeSettings.address}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-1.5">
                <span className="text-slate-400 block font-bold">ساعات العمل:</span>
                <p className="font-bold text-emerald-400 text-sm">مفتوح يومياً 24 ساعة بدون انقطاع</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-2">
                <span className="text-slate-400 block font-bold">مميزات وخدمات إضافية:</span>
                <p className="text-slate-300">✓ بار مشروبات ساخنة وعصائر وسناكس طازجة</p>
                <p className="text-slate-300">✓ إنترنت فائق السرعة Wi-Fi مجاناً</p>
                <p className="text-slate-300">✓ تكييف مركزي متواصل وركنة سيارات متاحة</p>
              </div>
            </div>

            <div className="h-80 w-full overflow-hidden rounded-3xl border border-white/10 shadow-inner bg-slate-950">
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
                  يمكن تعديل رابط الخريطة من لوحة التحكم (إدارة المحتوى).
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 9. آراء العملاء (Customer Reviews) */}
      <section id="reviews" className="py-12 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300">التقييمات</p>
          <h2 className="text-3xl font-black text-white sm:text-4xl">آراء عملائنا</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {reviews.map((review) => (
            <article key={review.name} className="rounded-[30px] border border-white/10 bg-slate-900/80 p-6 hover:border-amber-400/30 transition">
              <div className="mb-4 flex items-center gap-1 text-amber-300">
                {Array.from({ length: 5 }).map((_, index) => (
                  <span key={index}>★</span>
                ))}
              </div>
              <p className="text-xs leading-7 text-slate-300">“{review.text}”</p>
              <div className="mt-5 border-t border-white/10 pt-4 text-xs font-bold text-white">{review.name}</div>
            </article>
          ))}
        </div>
      </section>

      {/* 10. الفوتر الكاجوال */}
      <footer className="border-t border-white/10 bg-[#02050f] mt-20 py-10 text-xs text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-base font-black text-white">PlayLounge</p>
            <p className="mt-1">صالة ألعاب بلايستيشن، طاولات بلياردو احترافية، وكافيه متكامل</p>
          </div>
          <div className="flex items-center gap-6 font-bold">
            <a href="#hub" className="transition hover:text-amber-300">الأقسام</a>
            <a href="#rates" className="transition hover:text-amber-300">الأسعار</a>
            <a href="#packages" className="transition hover:text-amber-300">الباقات</a>
            <a href="#booking" className="transition hover:text-amber-300">الحجز</a>
            <a href="#location" className="transition hover:text-amber-300">الخريطة</a>
          </div>
        </div>
      </footer>
    </main>
  );
}