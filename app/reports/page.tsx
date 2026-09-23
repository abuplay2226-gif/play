import { requireRole } from "@/app/actions/auth";
import { getDashboardSummary, getFinancialReport } from "@/app/actions/reports";
import { SiteShell } from "@/components/site-shell";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function ReportsPage() {
  await requireRole(["ADMIN"]);

  const summary = await getDashboardSummary();
  const finance = await getFinancialReport();

  const cards = [
    { label: "إجمالي المبيعات", value: formatCurrency(summary.totalSales), tone: "emerald" },
    { label: "الأجهزة المتاحة", value: String(summary.devicesCount), tone: "sky" },
    { label: "الجلسات النشطة", value: String(summary.activeSessions), tone: "violet" },
    { label: "الورديات المفتوحة", value: String(summary.openShifts), tone: "amber" },
  ];

  return (
    <SiteShell title="التقارير المالية">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
            <p className="text-sm text-slate-400">{card.label}</p>
            <p className="mt-4 text-3xl font-black text-white">{card.value}</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full ${
                  card.tone === "emerald"
                    ? "bg-emerald-400"
                    : card.tone === "sky"
                      ? "bg-sky-400"
                      : card.tone === "violet"
                        ? "bg-violet-400"
                        : "bg-amber-400"
                }`}
                style={{ width: "72%" }}
              />
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
          <p className="text-sm text-slate-400">المبيعات اليوم</p>
          <p className="mt-3 text-3xl font-black text-emerald-300">{formatCurrency(finance.today)}</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
          <p className="text-sm text-slate-400">المبيعات خلال 7 أيام</p>
          <p className="mt-3 text-3xl font-black text-sky-300">{formatCurrency(finance.week)}</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
          <p className="text-sm text-slate-400">المبيعات هذا الشهر</p>
          <p className="mt-3 text-3xl font-black text-violet-300">{formatCurrency(finance.month)}</p>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
        <h3 className="text-xl font-black text-white">ملخص التشغيل</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm text-slate-400">إجمالي الطلبات</p>
            <p className="mt-2 text-2xl font-black text-white">{summary.ordersCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm text-slate-400">طلبات اليوم</p>
            <p className="mt-2 text-2xl font-black text-white">{summary.ordersToday}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm text-slate-400">عناصر المخزون المنخفض</p>
            <p className="mt-2 text-2xl font-black text-white">{summary.lowStock}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm text-slate-400">إجمالي الأجهزة</p>
            <p className="mt-2 text-2xl font-black text-white">{summary.devicesCount}</p>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
