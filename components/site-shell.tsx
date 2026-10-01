"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";

const navItems = [
  { label: "لوحة التحكم", href: "/", icon: "🏠" },
  { label: "الأجهزة", href: "/devices", icon: "🎮" },
  { label: "البطولات", href: "/tournaments", icon: "🏆" },
  { label: "نقاط البيع", href: "/pos", icon: "☕" },
  { label: "الورديات", href: "/shifts", icon: "⏱️" },
  { label: "الخزائن والسندات", href: "/cash-drawers", icon: "🏦" }, // تمت إعادتها هنا
  { label: "الحسابات المالية", href: "/financial", icon: "💵" },
  { label: "التقارير", href: "/reports", icon: "📊" },
  { label: "الحجوزات", href: "/bookings", icon: "📅" },
  { label: "المخزون", href: "/inventory", icon: "📦" },
  { label: "الموردون", href: "/suppliers", icon: "🚚" },
  { label: "العملاء", href: "/customers", icon: "👤" },
  { label: "الباقات", href: "/packages", icon: "🎁" },
  { label: "الموظفون", href: "/users", icon: "👔" },
  { label: "الفاتورة", href: "/receipt", icon: "🧾" },
];

export function SiteShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col pb-20 lg:pb-0" dir="rtl">
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-6 p-3 sm:p-4 lg:p-6">
        {/* الشريط الجانبي للشاشات الكبيرة (Desktop Sidebar) */}
        <aside className="hidden w-72 shrink-0 rounded-[28px] border border-slate-800 bg-slate-900/80 p-4 shadow-2xl backdrop-blur-xl lg:block">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-xl font-black text-slate-950 shadow-lg shadow-orange-500/20">
              P
            </div>
            <div>
              <p className="text-xs text-slate-400">PlayStation Lounge</p>
              <p className="text-base font-black text-white">إدارة الصالة والكافيه</p>
            </div>
          </div>

          <nav className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition ${
                    isActive
                      ? "border border-sky-400/40 bg-sky-500/15 text-sky-300 shadow-md shadow-sky-500/10"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* جسم الصفحة الرئيسي */}
        <div className="flex-1 min-w-0">
          {/* رأس الصفحة مع شريط الموبايل */}
          <header className="rounded-[24px] sm:rounded-[28px] border border-slate-800 bg-slate-900/80 p-3.5 sm:p-5 shadow-xl backdrop-blur-md mb-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* زر القائمة للشاشات الصغيرة */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-white lg:hidden active:scale-95 transition"
                  aria-label="القائمة الرئيسية"
                >
                  <span className="text-lg">☰</span>
                </button>

                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-sky-400 font-bold">
                    Lounge Hub
                  </p>
                  <h1 className="text-lg sm:text-2xl font-black text-white truncate max-w-[200px] sm:max-w-none">
                    {title}
                  </h1>
                </div>
              </div>

              {/* عناصر المستخدم وزر الخروج */}
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="hidden sm:inline-block rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-300 font-mono">
                  {new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(new Date())}
                </span>

                <form action={signOut}>
                  <button
                    type="submit"
                    className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition active:scale-95"
                  >
                    خروج
                  </button>
                </form>
              </div>
            </div>
          </header>

          <main>{children}</main>
        </div>
      </div>

      {/* ======================================================== */}
      {/* القائمة المنبثقة الجانبية للموبايل (Mobile Drawer) */}
      {/* ======================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* خلفية معتمة */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 w-72 bg-slate-900 border-l border-slate-800 p-5 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 font-black text-slate-950">
                    P
                  </div>
                  <span className="font-black text-white text-sm">قائمة النظام</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <nav className="mt-4 space-y-1.5">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-xs font-bold transition ${
                        isActive
                          ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                          : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                      }`}
                    >
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <Link
                href="/"
                className="w-full block text-center rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-slate-300 hover:text-white"
              >
                🌐 واجهة الزوار الرئيسية
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* شريط التنقل السفلي السريع للموبايل (Native Bottom Bar) */}
      {/* ======================================================== */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800/80 bg-slate-900/95 backdrop-blur-xl py-2 px-4 flex items-center justify-around lg:hidden shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
        {[
          { label: "الأجهزة", href: "/devices", icon: "🎮" },
          { label: "الكافيه", href: "/pos", icon: "☕" },
          { label: "الخزائن", href: "/cash-drawers", icon: "🏦" },
          { label: "البطولات", href: "/tournaments", icon: "🏆" },
        ].map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 transition ${
                isActive ? "text-amber-400 font-black scale-105" : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span className="text-[10px] font-bold">{tab.label}</span>
            </Link>
          );
        })}

        {/* زر فتح باقي القائمة من الأسفل */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition"
        >
          <span className="text-base">☰</span>
          <span className="text-[10px] font-bold">المزيد</span>
        </button>
      </nav>
    </div>
  );
}