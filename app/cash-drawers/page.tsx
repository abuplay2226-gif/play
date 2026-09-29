import { requireRole } from "@/app/actions/auth";
import { SiteShell } from "@/components/site-shell";
import { prisma } from "@/lib/prisma";

export default async function CashDrawersPage() {
  await requireRole(["ADMIN", "CASHIER"]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 1. جلب الخزائن والموردين
  const [cashDrawers, suppliers] = await Promise.all([
    prisma.cashDrawer.findMany({ orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
  ]);

  // 2. جلب مبيعات الفيزا والشبكة المسجلة اليوم
  const cardTransactions = await prisma.financialTransaction.aggregate({
    where: {
      type: "INCOME_CARD",
      createdAt: { gte: todayStart },
    },
    _sum: { amount: true },
  });

  // 3. جلب مبيعات الكاش المسجلة اليوم
  const cashTransactions = await prisma.financialTransaction.aggregate({
    where: {
      type: "INCOME",
      createdAt: { gte: todayStart },
    },
    _sum: { amount: true },
  });

  // 4. إجمالي الطلبات اليوم
  const ordersCount = await prisma.order.count({
    where: { createdAt: { gte: todayStart } },
  });

  // الحسابات المالية التفصيلية
  const todayCardRevenue = Number(cardTransactions._sum.amount ?? 0);
  const totalDrawerCash = cashDrawers.reduce((sum, d) => sum + d.balance, 0);
  const totalSupplierDebt = suppliers.reduce((sum, s) => sum + (s.balance > 0 ? s.balance : 0), 0);
  
  // إجمالي الإيراد الشامل لليوم (الكاش الفعلي في الخزن أو الحركات + الفيزا)
  const totalTodayRevenue = Number((cashTransactions._sum.amount ?? 0) + todayCardRevenue) || (totalDrawerCash + todayCardRevenue);

  return (
    <SiteShell title="الحسابات المالية">
      {/* شبكة الكروت الإحصائية العلوية مع إضافة كارت الفيزا المستقل */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
        {/* إيراد اليوم الشامل */}
        <article className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-slate-400 block">إيراد اليوم الشامل (كاش + فيزا)</span>
          <p className="mt-3 text-2xl font-black font-mono text-emerald-400">
            {totalTodayRevenue.toFixed(0)} ج.م.
          </p>
        </article>

        {/* إجمالي نقدية الخزن الورقية */}
        <article className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-slate-400 block">💵 إجمالي نقدية الخزن (كاش)</span>
          <p className="mt-3 text-2xl font-black font-mono text-white">
            {totalDrawerCash.toFixed(0)} ج.م.
          </p>
        </article>

        {/* كارت مبيعات الفيزا والشبكة المستقل */}
        <article className="rounded-3xl border border-sky-500/30 bg-slate-900/90 p-5 shadow-xl shadow-sky-950/20">
          <span className="text-xs text-sky-400 block font-bold">💳 مبيعات الفيزا / البنك (اليوم)</span>
          <p className="mt-3 text-2xl font-black font-mono text-sky-300">
            {todayCardRevenue.toFixed(0)} ج.م.
          </p>
          <span className="text-[10px] text-slate-400 block mt-1">تطابق مع شريط ماكينة البنك POS</span>
        </article>

        {/* ديون الموردين */}
        <article className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-slate-400 block">ديون الموردين المستحقة</span>
          <p className="mt-3 text-2xl font-black font-mono text-amber-400">
            {totalSupplierDebt.toFixed(0)} ج.م.
          </p>
        </article>

        {/* عدد الطلبات */}
        <article className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-slate-400 block">عدد الطلبات اليوم</span>
          <p className="mt-3 text-2xl font-black font-mono text-violet-400">
            {ordersCount}
          </p>
        </article>
      </div>

      {/* تفاصيل الخزائن وقنوات التحصيل والموردين */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ملخص الخزن وقنوات السداد */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-white">ملخص الخزن وقنوات التحصيل</h2>
            <span className="text-xs text-slate-400 font-mono">
              كاش + بنك
            </span>
          </div>

          <div className="space-y-3">
            {cashDrawers.map((drawer) => (
              <div
                key={drawer.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">💵</span>
                  <span className="font-bold text-white">{drawer.name}</span>
                  <span className="text-[10px] text-slate-500">(نقدية ورقية بالدرج)</span>
                </div>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {drawer.balance} ج.م
                </span>
              </div>
            ))}

            {/* سطر ماكينة الفيزا والحساب البنكي */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-sky-950/30 border border-sky-500/30 text-xs">
              <div className="flex items-center gap-2">
                <span>💳</span>
                <span className="font-bold text-sky-200">ماكينة الدفع الإلكتروني والفيزا (POS)</span>
                <span className="text-[10px] text-sky-400 font-bold">(حساب بنكي)</span>
              </div>
              <span className="font-mono font-bold text-sky-300 text-sm">
                {todayCardRevenue} ج.م
              </span>
            </div>
          </div>
        </div>

        {/* ملخص الموردين */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-white">ملخص حسابات الموردين</h2>
            <span className="text-xs text-slate-400 font-mono">
              الموردين: {suppliers.length}
            </span>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {suppliers.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs"
              >
                <div>
                  <span className="font-bold text-white">{s.name}</span>
                  <span className="text-[10px] text-slate-500 block">{s.phone ?? "بدون هاتف"}</span>
                </div>
                <span
                  className={`font-mono font-bold text-sm ${
                    s.balance > 0 ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {s.balance} ج.م
                </span>
              </div>
            ))}

            {suppliers.length === 0 && (
              <p className="text-center text-xs text-slate-500 py-6">
                لا يوجد موردين مسجلين حالياً.
              </p>
            )}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}