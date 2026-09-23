import Link from "next/link";

import { requireRole, signOut } from "@/app/actions/auth";
import { getDevices } from "@/app/actions/devices";
import { getDashboardSummary } from "@/app/actions/reports";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(value);
}

const quickActions = [
  { label: "فتح شيفت", href: "/shifts" },
  { label: "إدارة الأجهزة", href: "/devices" },
  { label: "نقاط البيع", href: "/pos" },
  { label: "الحجوزات", href: "/bookings" },
];

export default async function StaffPage() {
  await requireRole(["STAFF", "ADMIN", "CASHIER"]);

  const [summary, devices] = await Promise.all([getDashboardSummary(), getDevices()]);

  const board = [
    { title: "الأجهزة المتاحة", value: String(devices.filter((device) => device.status === "AVAILABLE").length), accent: "text-emerald-300" },
    { title: "الطلبات الجديدة", value: String(summary.ordersToday), accent: "text-amber-300" },
    { title: "الحجوزات اليوم", value: String(summary.ordersCount), accent: "text-sky-300" },
    { title: "إيرادات اليوم", value: formatCurrency(summary.totalSales), accent: "text-violet-300" },
  ];

  const devicesList = devices.slice(0, 4).map((device) => ({
    label: device.name,
    status: device.status === "AVAILABLE" ? "متاح" : device.status === "OCCUPIED" ? "مشغول" : device.status === "MAINTENANCE" ? "صيانة" : "متاح",
  }));

  return (
    <main dir="rtl" className="min-h-screen bg-[#050816] text-white">
      <header className="border-b border-white/10 bg-[#070d1f]/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-500 text-lg font-black text-slate-950">
              P
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-sky-300">Staff</p>
              <p className="text-lg font-black">PlayStation Lounge</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/reports" className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white hover:border-sky-400 hover:text-sky-300">
              التقارير
            </Link>
            <form action={signOut}>
              <button type="submit" className="rounded-full bg-gradient-to-r from-sky-400 to-cyan-500 px-4 py-2 text-sm font-black text-slate-950">
                تسجيل الخروج
              </button>
            </form>
          </div>
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <section className="rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-sky-300">لوحة التشغيل</p>
              <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">واجهة الموظف</h1>
            </div>
            <div className="rounded-[22px] border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
              <p>حالة اليوم</p>
              <p className="mt-2 text-2xl font-black text-white">مستوى الخدمة ممتاز</p>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {board.map((item) => (
            <div key={item.title} className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-5">
              <p className="text-sm text-slate-400">{item.title}</p>
              <p className={`mt-4 text-3xl font-black ${item.accent}`}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 mb-6 flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className="rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-bold text-sky-200 hover:border-sky-400">
              {action.label}
            </Link>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-slate-800 bg-slate-900/90 p-5">
            <h2 className="text-2xl font-black text-white">جداول التشغيل</h2>
            <div className="mt-5 space-y-3">
              {devicesList.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-slate-200">
                  <span className="font-bold text-white">{item.label}</span>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                    item.status === "مشغول"
                      ? "bg-rose-500/15 text-rose-300"
                      : item.status === "محجوز"
                        ? "bg-amber-500/15 text-amber-300"
                        : "bg-emerald-500/15 text-emerald-300"
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-800 bg-slate-900/90 p-5">
            <h2 className="text-2xl font-black text-white">الطلبات الحالية</h2>
            <div className="mt-5 space-y-3">
              {[
                { item: "إجمالي الطلبات", value: String(summary.ordersCount), tone: "text-amber-300" },
                { item: "الجلسات النشطة", value: String(summary.activeSessions), tone: "text-emerald-300" },
                { item: "إيراد المبيعات", value: formatCurrency(summary.totalSales), tone: "text-sky-300" },
              ].map((entry) => (
                <div key={entry.item} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-slate-200">
                  <span className="font-bold text-white">{entry.item}</span>
                  <span className={`font-black ${entry.tone}`}>{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
