"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import type { UserRole } from "@/lib/auth-guard";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
}

const allNavItems: NavItem[] = [
  // 1. لوحات التحكم
  { label: "لوحة المدير", href: "/admin", icon: "👑", roles: ["ADMIN"] },
  { label: "لوحة التشغيل", href: "/staff", icon: "⚡", roles: ["STAFF", "CASHIER"] },

  // 2. العمليات التشغيلية (للموظف والكاشير والمدير)
  { label: "الأجهزة والعدادات", href: "/devices", icon: "🎮", roles: ["ADMIN", "CASHIER", "STAFF"] },
  { label: "نقاط البيع (الكافيه)", href: "/pos", icon: "☕", roles: ["ADMIN", "CASHIER", "STAFF"] },
  { label: "الورديات والشيفت", href: "/shifts", icon: "⏱️", roles: ["ADMIN", "CASHIER", "STAFF"] },
  { label: "الحجوزات", href: "/bookings", icon: "📅", roles: ["ADMIN", "CASHIER", "STAFF"] },
  { label: "البطولات", href: "/tournaments", icon: "🏆", roles: ["ADMIN", "CASHIER", "STAFF"] },
  { label: "المخزون", href: "/inventory", icon: "📦", roles: ["ADMIN", "CASHIER", "STAFF"] },
  { label: "العملاء", href: "/customers", icon: "👤", roles: ["ADMIN", "CASHIER", "STAFF"] },
  { label: "الفاتورة", href: "/receipt", icon: "🧾", roles: ["ADMIN", "CASHIER", "STAFF"] },

  // 3. الصلاحيات المالية والمشتريات (للكاشير والمدير فقط)
  { label: "الخزائن والسندات", href: "/cash-drawers", icon: "🏦", roles: ["ADMIN", "CASHIER"] },
  { label: "الموردون والمشتريات", href: "/suppliers", icon: "🚚", roles: ["ADMIN", "CASHIER"] },
  { label: "الباقات والعروض", href: "/packages", icon: "🎁", roles: ["ADMIN", "CASHIER"] },

  // 4. صلاحيات الإدارة العليا والتقارير (للمدير فقط)
  { label: "الحسابات المالية", href: "/financial", icon: "💵", roles: ["ADMIN"] },
  { label: "التقارير والأرباح", href: "/reports", icon: "📊", roles: ["ADMIN"] },
  { label: "إدارة الموظفين", href: "/users", icon: "👔", roles: ["ADMIN"] },
  { label: "محتوى الموقع", href: "/admin/content", icon: "🌐", roles: ["ADMIN"] },
];

export function SiteShellClient({
  title,
  children,
  userRole,
  userName,
}: {
  title: string;
  children: React.ReactNode;
  userRole: UserRole;
  userName: string;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // تصفية الروابط بحسب رتبة المستخدم الحقيقية الممررة من السيرفر
  const visibleNavItems = allNavItems.filter((item) =>
    item.roles.includes(userRole)
  );

  // أزرار الشريط السفلي للهواتف
  const bottomTabs = [
    { label: "الرئيسية", href: userRole === "ADMIN" ? "/admin" : "/staff", icon: "🏠" },
    { label: "الأجهزة", href: "/devices", icon: "🎮" },
    { label: "الكافيه", href: "/pos", icon: "☕" },
    userRole === "ADMIN" || userRole === "CASHIER"
      ? { label: "الخزائن", href: "/cash-drawers", icon: "🏦" }
      : { label: "الحجوزات", href: "/bookings", icon: "📅" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col pb-20 lg:pb-0" dir="rtl">
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-6 p-3 sm:p-4 lg:p-6">
        {/* الشريط الجانبي للشاشات الكبيرة */}
        <aside className="hidden w-72 shrink-0 rounded-[28px] border border-slate-800 bg-slate-900/80 p-4 shadow-2xl backdrop-blur-xl lg:flex lg:flex-col justify-between">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-xl font-black text-slate-950 shadow-lg shadow-orange-500/20">
                P
              </div>
              <div>
                <p className="text-xs text-slate-400">PlayStation Lounge</p>
                <p className="text-base font-black text-white">إدارة الصالة والكافيه</p>
              </div>
            </div>

            <nav className="space-y-1 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
              {visibleNavItems.map((item) => {
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
          </div>

          {/* بطاقة المستخدم أسفل القائمة */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-xs text-white truncate max-w-[130px]">
                  {userName}
                </p>
                <span
                  className={`inline-block mt-0.5 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    userRole === "ADMIN"
                      ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                      : userRole === "CASHIER"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                  }`}
                >
                  {userRole === "ADMIN" ? "مدير النظام 👑" : userRole === "CASHIER" ? "كاشير 💵" : "موظف صالة 🎮"}
                </span>
              </div>
              <form action={signOut}>
                <button
                  type="submit"
                  title="تسجيل الخروج"
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2 text-rose-300 hover:bg-rose-500/20 transition"
                >
                  🚪
                </button>
              </form>
            </div>
          </div>
        </aside>

        {/* جسم الصفحة الرئيسي */}
        <div className="flex-1 min-w-0">
          <header className="rounded-[24px] sm:rounded-[28px] border border-slate-800 bg-slate-900/80 p-3.5 sm:p-5 shadow-xl backdrop-blur-md mb-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
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

      {/* قائمة الموبايل المنبثقة */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
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
                  <div>
                    <span className="font-black text-white text-sm block">{userName}</span>
                    <span className="text-[10px] text-sky-400 font-bold">{userRole}</span>
                  </div>
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
                {visibleNavItems.map((item) => {
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

      {/* الشريط السفلي للهواتف */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800/80 bg-slate-900/95 backdrop-blur-xl py-2 px-4 flex items-center justify-around lg:hidden shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
        {bottomTabs.map((tab) => {
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