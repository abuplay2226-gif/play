import { getCurrentUser, signOut } from "@/app/actions/auth";
import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { label: "لوحة التحكم", href: "/" },
  { label: "الأجهزة", href: "/devices" },
  { label: "الورديات", href: "/shifts" },
  { label: "نقاط البيع", href: "/pos" },
  { label: "الحجوزات", href: "/bookings" },
  { label: "المخزون", href: "/inventory" },
  { label: "الموردون", href: "/suppliers" },
  { label: "الموظفون", href: "/users" },
  { label: "التقارير", href: "/reports" },
  { label: "الفاتورة", href: "/receipt" },
];

export async function SiteShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50" dir="rtl">
      <div className="mx-auto flex max-w-[1600px] gap-6 p-4 lg:p-6">
        <aside className="hidden w-72 shrink-0 rounded-[28px] border border-slate-800 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/20 text-xl font-black text-sky-300">
              P
            </div>
            <div>
              <p className="text-xs text-slate-400">PlayStation Lounge</p>
              <p className="text-lg font-black text-white">إدارة متقدمة</p>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                  item.href === "/"
                    ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
                    : "border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-xs text-slate-400">حالة التشغيل</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-slate-300">الخادم</span>
              <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-300">
                Online
              </span>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <header className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/30 backdrop-blur sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Operations Hub</p>
                <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">{title}</h1>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-full border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200">
                  {user ? `${user.name} · ${user.role}` : "زائر"}
                </div>
                <div className="rounded-full border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200">
                  {new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(new Date())}
                </div>
                <form action={signOut}>
                  <button type="submit" className="rounded-full bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-slate-700">
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
