import { requireRole } from "@/app/actions/auth";
import { SiteShell } from "@/components/site-shell";
import { prisma } from "@/lib/prisma";

export default async function FinancialPage() {
  await requireRole(["ADMIN"]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 1. جلب الخزائن، الموردين، العملاء، ومبيعات الفيزا
  const [cashDrawers, suppliers, customers, cardTransactions] = await Promise.all([
    prisma.cashDrawer.findMany({ orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.financialTransaction.aggregate({
      where: {
        type: { in: ["INCOME_CARD", "CARD"] },
        createdAt: { gte: todayStart },
      },
      _sum: { amount: true },
    }),
  ]);

  // الأصول النقدية الحالية
  const totalDrawerCash = cashDrawers.reduce((sum, d) => sum + d.balance, 0);
  const todayCardRevenue = Number(cardTransactions._sum.amount ?? 0);
  const totalLiquidAssets = totalDrawerCash + todayCardRevenue;

  // الذمم المدينة (فلوس لنا عند العملاء)
  const totalCustomerDebts = customers.reduce((sum, c) => sum + (c.debt > 0 ? c.debt : 0), 0);
  const customersWithDebt = customers.filter((c) => c.debt > 0);

  // الذمم الدائنة (فلوس علينا للموردين)
  const totalSupplierDebts = suppliers.reduce((sum, s) => sum + (s.balance > 0 ? s.balance : 0), 0);
  const suppliersWithDebt = suppliers.filter((s) => s.balance > 0);

  // صافي رأس المال المتداول اللحظي
  const netWorkingCapital = totalLiquidAssets + totalCustomerDebts - totalSupplierDebts;

  return (
    <SiteShell title="المركز المالي والأرصدة والذمم">
      {/* شبكة كروت المركز المالي الشامل */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <article className="rounded-3xl border border-emerald-500/30 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-slate-400 block font-bold">💵 إجمالي السيولة النقدية (الخزن)</span>
          <p className="mt-2 text-2xl font-black font-mono text-emerald-400">
            {totalDrawerCash.toFixed(2)} ج.م
          </p>
          <span className="text-[10px] text-slate-500 block mt-1">نقدية فعلية بالدرج</span>
        </article>

        <article className="rounded-3xl border border-sky-500/30 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-sky-400 block font-bold">💳 مبيعات الفيزا والبنك (اليوم)</span>
          <p className="mt-2 text-2xl font-black font-mono text-sky-300">
            {todayCardRevenue.toFixed(2)} ج.م
          </p>
          <span className="text-[10px] text-slate-500 block mt-1">مطابقة مع ماكينة POS</span>
        </article>

        <article className="rounded-3xl border border-amber-500/30 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-amber-400 block font-bold">👤 ديون العملاء (لنا بالخارج)</span>
          <p className="mt-2 text-2xl font-black font-mono text-amber-300">
            {totalCustomerDebts.toFixed(2)} ج.م
          </p>
          <span className="text-[10px] text-slate-500 block mt-1">{customersWithDebt.length} عميل عليهم آجل</span>
        </article>

        <article className="rounded-3xl border border-rose-500/30 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-rose-400 block font-bold">🚚 مستحقات الموردين (علينا)</span>
          <p className="mt-2 text-2xl font-black font-mono text-rose-400">
            {totalSupplierDebts.toFixed(2)} ج.م
          </p>
          <span className="text-[10px] text-slate-500 block mt-1">{suppliersWithDebt.length} مورد دائن</span>
        </article>
      </div>

      {/* بطاقة صافي المركز المالي */}
      <div className="mb-8 rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-sky-300 font-bold">Net Working Capital</span>
          <h2 className="text-xl font-black text-white mt-1">صافي رأس المال والسيولة المتداولة اللحظية</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            (النقدية بالخزن + مبيعات البنك + ديون العملاء) - ديون الموردين
          </p>
        </div>
        <div className="text-left">
          <span className={`font-mono text-3xl font-black ${netWorkingCapital >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {netWorkingCapital.toFixed(2)} ج.م
          </span>
        </div>
      </div>

      {/* جداول الخزائن والديون والعملاء */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 1. أرصدة الخزائن النقدية */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white">🏦 أرصدة الخزائن</h3>
            <span className="text-xs text-slate-400 font-mono">{cashDrawers.length} خزن</span>
          </div>

          <div className="space-y-3">
            {cashDrawers.map((d) => (
              <div key={d.id} className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex justify-between items-center text-xs">
                <span className="font-bold text-white">{d.name}</span>
                <span className="font-mono font-bold text-emerald-400">{d.balance.toFixed(2)} ج.م</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. ديون ومستحقات الموردين */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-rose-300">🚚 مستحقات الموردين</h3>
            <span className="text-xs text-rose-400 font-mono">{suppliersWithDebt.length} مورد</span>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {suppliersWithDebt.map((s) => (
              <div key={s.id} className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-white">{s.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{s.phone ?? "بدون هاتف"}</p>
                </div>
                <span className="font-mono font-bold text-rose-400">{s.balance.toFixed(2)} ج.م</span>
              </div>
            ))}

            {suppliersWithDebt.length === 0 && (
              <p className="text-center text-xs text-slate-500 py-8">لا توجد ديون مستحقة للموردين (الحسابات خالصة) ✨</p>
            )}
          </div>
        </div>

        {/* 3. ديون العملاء الآجلة */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-amber-300">👤 ديون العملاء الآجلة</h3>
            <span className="text-xs text-amber-400 font-mono">{customersWithDebt.length} عميل</span>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {customersWithDebt.map((c) => (
              <div key={c.id} className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-white">{c.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{c.phone}</p>
                </div>
                <span className="font-mono font-bold text-amber-300">{c.debt.toFixed(2)} ج.م</span>
              </div>
            ))}

            {customersWithDebt.length === 0 && (
              <p className="text-center text-xs text-slate-500 py-8">لا توجد ديون معلقة على العملاء ✨</p>
            )}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}