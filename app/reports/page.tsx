import { requireRole } from "@/app/actions/auth";
import { getDetailedProfitReport } from "@/app/actions/reports";
import { SiteShell } from "@/components/site-shell";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireRole(["ADMIN"]);

  const { from, to } = await searchParams;

  const report = await getDetailedProfitReport(from, to);

  return (
    <SiteShell title="التقارير والأرباح وقائمة الدخل">
      {/* شريط فلتر التاريخ */}
      <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
        <form method="GET" className="flex flex-wrap items-end gap-3 text-xs">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-slate-300 font-bold mb-1">من تاريخ:</label>
            <input
              type="date"
              name="from"
              defaultValue={from || ""}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-sky-400 font-mono"
            />
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-slate-300 font-bold mb-1">إلى تاريخ:</label>
            <input
              type="date"
              name="to"
              defaultValue={to || ""}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-sky-400 font-mono"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-xl bg-sky-500 px-5 py-2.5 text-xs font-black text-slate-950 hover:bg-sky-400 transition"
            >
              📊 استخراج التقرير
            </button>

            {(from || to) && (
              <a
                href="/reports"
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs text-slate-300 hover:text-white flex items-center"
              >
                تقرير اليوم
              </a>
            )}
          </div>
        </form>
      </div>

      {/* بطاقة قائمة الدخل وصافي الربح الحقيقي */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* إجمالي الإيرادات */}
        <article className="rounded-3xl border border-sky-500/30 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-sky-300 block font-bold">📈 إجمالي الإيرادات للفترة</span>
          <p className="mt-2 text-2xl font-black font-mono text-white">
            {report.totalGrossRevenue.toFixed(2)} ج.م
          </p>
          <span className="text-[10px] text-slate-400 block mt-1">
            بلايستيشن: {report.playstationRevenue} + كافيه: {report.cafeRevenue}
          </span>
        </article>

        {/* المصروفات التشغيلية */}
        <article className="rounded-3xl border border-rose-500/30 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-rose-300 block font-bold">💸 المصروفات التشغيلية للفترة</span>
          <p className="mt-2 text-2xl font-black font-mono text-rose-400">
            {report.operatingExpenses.toFixed(2)} ج.م
          </p>
          <span className="text-[10px] text-slate-400 block mt-1">فواتير، صيانة، بوفيه، نثريات</span>
        </article>

        {/* صافي الربح التشغيلي الحقيقي */}
        <article className="rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 to-slate-900 p-5 shadow-xl">
          <span className="text-xs text-emerald-300 block font-bold">🏆 صافي الربح التشغيلي (Net Profit)</span>
          <p className="mt-2 text-2xl font-black font-mono text-emerald-400">
            {report.netOperatingProfit.toFixed(2)} ج.م
          </p>
          <span className="text-[10px] text-emerald-200/70 block mt-1">الإيرادات - المصروفات التشغيلية</span>
        </article>

        {/* مسحوبات وتوريد الإدارة */}
        <article className="rounded-3xl border border-violet-500/30 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-violet-300 block font-bold">🏛️ توريد للإدارة / مسحوبات المالك</span>
          <p className="mt-2 text-2xl font-black font-mono text-violet-300">
            {report.managementWithdrawals.toFixed(2)} ج.م
          </p>
          <span className="text-[10px] text-slate-400 block mt-1">نقدية مستلمة للمالك (غير مخصومة كربح)</span>
        </article>
      </div>

      {/* تفصيل مصادر الإيراد والأداء */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* 1. الأجهزة الأكثر تحقيقاً للإيراد */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white">🎮 أعلى الأجهزة تشغيلاً وإيراداً</h3>
            <span className="text-xs text-slate-400">وقت اللعب: {report.playstationRevenue} ج.م</span>
          </div>

          <div className="space-y-3">
            {report.topDevices.map((d: any, idx: number) => (
              <div key={d.name} className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-slate-500 font-bold">#{idx + 1}</span>
                  <div>
                    <p className="font-bold text-white">{d.name}</p>
                    <p className="text-[10px] text-slate-400">{d.type} · {d.sessionsCount} جلسة مكتملة</p>
                  </div>
                </div>
                <span className="font-mono font-black text-sky-400 text-sm">{d.revenue.toFixed(2)} ج.م</span>
              </div>
            ))}

            {report.topDevices.length === 0 && (
              <p className="text-center text-xs text-slate-500 py-6">لا توجد جلسات مكتملة في هذه الفترة.</p>
            )}
          </div>
        </div>

        {/* 2. الأصناف الأكثر مبيعاً في الكافيه */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white">☕ أعلى منتجات الكافيه مبيعاً</h3>
            <span className="text-xs text-slate-400">مبيعات الكافيه: {report.cafeRevenue} ج.م</span>
          </div>

          <div className="space-y-3">
            {report.topProducts.map((p: any, idx: number) => (
              <div key={p.name} className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-slate-500 font-bold">#{idx + 1}</span>
                  <div>
                    <p className="font-bold text-white">{p.name}</p>
                    <p className="text-[10px] text-slate-400">الكمية المباعة: {p.quantity} قطعة/كوب</p>
                  </div>
                </div>
                <span className="font-mono font-black text-emerald-400 text-sm">{p.totalRevenue.toFixed(2)} ج.م</span>
              </div>
            ))}

            {report.topProducts.length === 0 && (
              <p className="text-center text-xs text-slate-500 py-6">لا توجد مبيعات كافيه مسجلة في هذه الفترة.</p>
            )}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}