import { getCurrentUser, signOut } from "@/app/actions/auth";
import Link from "next/link";
import type { ReactNode } from "react";

type Role = "ADMIN" | "CASHIER" | "STAFF";

interface NavItem {
  label: string;
  href: string;
  roles: Role[];
}

const allNavItems: NavItem[] = [
  // 1. لوحات التحكم
  { label: "لوحة المدير 👑", href: "/admin", roles: ["ADMIN"] },
  { label: "لوحة التشغيل ⚡", href: "/staff", roles: ["CASHIER", "STAFF"] },

  // 2. التشغيل اليومي والصالة
  { label: "الأجهزة والعدادات", href: "/devices", roles: ["ADMIN", "CASHIER", "STAFF"] },
  { label: "نقاط البيع (POS)", href: "/pos", roles: ["ADMIN", "CASHIER", "STAFF"] },
  { label: "العملاء 👥", href: "/customers", roles: ["ADMIN", "CASHIER", "STAFF"] },
  { label: "الباقات والاشتراكات 🎁", href: "/packages", roles: ["ADMIN", "CASHIER"] },
  { label: "الحجوزات", href: "/bookings", roles: ["ADMIN", "CASHIER", "STAFF"] },
  { label: "البطولات 🏆", href: "/tournaments", roles: ["ADMIN", "CASHIER", "STAFF"] },
  { label: "المخزون والمواد الخام", href: "/inventory", roles: ["ADMIN", "CASHIER", "STAFF"] },

  // 3. النقدية والورديات والموردين
  { label: "الورديات", href: "/shifts", roles: ["ADMIN", "CASHIER"] },
  { label: "الخزائن والسندات 💵", href: "/cash-drawers", roles: ["ADMIN", "CASHIER"] },
  { label: "الموردون وفواتير الشراء", href: "/suppliers", roles: ["ADMIN", "CASHIER"] },

  // 4. الحسابات والإدارة الحساسة (للمدير فقط)
  { label: "إدارة الموظفين والمسحوبات", href: "/users", roles: ["ADMIN"] },
  { label: "المركز المالي والأرصدة", href: "/financial", roles: ["ADMIN"] },
  { label: "التقارير وقائمة الدخل", href: "/reports", roles: ["ADMIN"] },
];

export async function SiteShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  const currentRole = (user?.role as Role) || "STAFF";

  const visibleNavItems = allNavItems.filter((item) =>
    item.roles.includes(currentRole)
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50" dir="rtl">
      <div className="mx-auto flex max-w-[1600px] gap-6 p-4 lg:p-6">
        {/* الشريط الجانبي */}
        <aside className="hidden w-72 shrink-0 rounded-[28px] border border-slate-800 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 lg:block">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/20 text-xl font-black text-sky-300">
              P
            </div>
            <div>
              <p className="text-xs text-slate-400">PlayStation Lounge</p>
              <p className="text-base font-black text-white">
                {currentRole === "ADMIN"
                  ? "إدارة النظام (Admin)"
                  : currentRole === "CASHIER"
                    ? "واجهة الكاشير"
                    : "واجهة الصالة"}
              </p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-2.5 text-xs font-bold text-slate-300 transition hover:border-slate-700 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/50 p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">الصلاحية:</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  currentRole === "ADMIN"
                    ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                    : currentRole === "CASHIER"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                }`}
              >
                {currentRole === "ADMIN"
                  ? "مدير النظام 👑"
                  : currentRole === "CASHIER"
                    ? "كاشير 💵"
                    : "موظف صالة 🎮"}
              </span>
            </div>
          </div>
        </aside>

        {/* جسم الصفحة الرئيسي */}
        <div className="flex-1">
          <header className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/30 backdrop-blur sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Operations Hub</p>
                <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">{title}</h1>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-full border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-200">
                  👤 {user ? `${user.name}` : "زائر"}
                </div>
                <div className="rounded-full border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-mono text-slate-200">
                  {new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(new Date())}
                </div>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="rounded-full bg-slate-800 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition border border-rose-500/20"
                  >
                    تسجيل الخروج
                  </button>
                </form>
              </div>
            </div>
          </header>

          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}