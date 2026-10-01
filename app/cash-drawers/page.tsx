import { requireRole } from "@/app/actions/auth";
import {
  createCashDrawer,
  deleteCashDrawer,
  getCashDrawers,
} from "@/app/actions/cash-drawers";
import { CashMovementActions } from "@/components/cash-movement-actions";
import { CashMovementForm } from "@/components/cash-movement-form";
import { SiteShell } from "@/components/site-shell";
import { prisma } from "@/lib/prisma";

export default async function CashDrawersPage() {
  await requireRole(["ADMIN", "CASHIER"]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [cashDrawers, suppliers, customers, users, openShift, transactions] = await Promise.all([
    getCashDrawers(),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.shift.findFirst({ where: { status: "OPEN" }, include: { cashDrawer: true } }),
    prisma.financialTransaction.findMany({
      take: 40,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalCashInDrawers = cashDrawers.reduce((sum, d) => sum + d.balance, 0);

  const todayOpExpenses = transactions
    .filter(
      (t: any) =>
        t.type === "EXPENSE" &&
        t.counterpartyType !== "MANAGEMENT" &&
        new Date(t.createdAt) >= todayStart
    )
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const todayManagementDrop = transactions
    .filter(
      (t: any) =>
        t.type === "EXPENSE" &&
        t.counterpartyType === "MANAGEMENT" &&
        new Date(t.createdAt) >= todayStart
    )
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const todayIncome = transactions
    .filter((t: any) => (t.type === "INCOME" || t.type === "SHIFT_OPEN") && new Date(t.createdAt) >= todayStart)
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  return (
    <SiteShell title="إدارة الخزائن وسندات الصرف والقبض">
      {/* كروت المؤشرات المالية */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <article className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-slate-400 block font-bold">💵 إجمالي النقدية المتوفرة بالخزائن</span>
          <p className="mt-2 text-2xl font-black font-mono text-emerald-400">
            {totalCashInDrawers.toFixed(2)} ج.م
          </p>
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-slate-400 block font-bold">🏛️ توريد نقدية للإدارة / المالك (اليوم)</span>
          <p className="mt-2 text-2xl font-black font-mono text-violet-300">
            {todayManagementDrop.toFixed(2)} ج.م
          </p>
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-slate-400 block font-bold">💸 المصروفات التشغيلية اليوم</span>
          <p className="mt-2 text-2xl font-black font-mono text-rose-400">
            {todayOpExpenses.toFixed(2)} ج.م
          </p>
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-slate-400 block font-bold">📥 إجمالي المقبوضات النقدية اليوم</span>
          <p className="mt-2 text-2xl font-black font-mono text-sky-400">
            {todayIncome.toFixed(2)} ج.م
          </p>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1.8fr]">
        {/* العمود الأيمن: نموذج السند الشامل */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 h-fit shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📝</span>
              <span>تسجيل سند نقدية (صرف / قبض)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              إخراج مصروفات، سلفة موظف، توريد للإدارة، سداد مورد، أو تحصيل دين.
            </p>

            <CashMovementForm
              drawers={cashDrawers}
              suppliers={suppliers}
              customers={customers}
              users={users}
              defaultDrawerId={openShift?.cashDrawerId}
              openShiftId={openShift?.id}
            />
          </div>

          <details className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
            <summary className="cursor-pointer font-bold text-sky-400 text-xs select-none">
              + إضافة خزينة / درج نقدية جديد
            </summary>
            <form
              action={async (formData) => {
                "use server";
                const name = String(formData.get("name") ?? "");
                const balance = Number(formData.get("balance") ?? 0);
                if (!name) return;
                await createCashDrawer({ name, balance });
              }}
              className="mt-3 space-y-3 text-xs"
            >
              <div>
                <label className="mb-1 block text-slate-300">اسم الخزينة:</label>
                <input
                  name="name"
                  placeholder="مثال: درج كاشير 2 / الخزينة الرئيسية"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-slate-300">الرصيد الافتتاحي (ج.م):</label>
                <input
                  name="balance"
                  type="number"
                  defaultValue={0}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-sky-500 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400"
              >
                حفظ الخزينة
              </button>
            </form>
          </details>
        </div>

        {/* العمود الأيسر: قائمة الخزائن وسجل السندات التفصيلي */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
            <h2 className="text-base font-bold text-white mb-4">الخزائن النقدية وأرصدتها الحالية</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {cashDrawers.map((d) => (
                <div
                  key={d.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-white">{d.name}</p>
                    <span className="text-[10px] text-slate-400">
                      {d.id === openShift?.cashDrawerId ? "⭐ مربوطة بالوردية الحالية" : "خزينة نقدية"}
                    </span>
                  </div>
                  <div className="text-left">
                    <span className="font-mono text-base font-black text-emerald-400 block">
                      {d.balance.toFixed(2)} ج.م
                    </span>
                    {d.balance === 0 && (
                      <form
                        action={async () => {
                          "use server";
                          await deleteCashDrawer(d.id);
                        }}
                      >
                        <button type="submit" className="text-[10px] text-rose-400 hover:underline mt-0.5">
                          حذف الخزينة
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white">سجل سندات الصرف والقبض</h2>
              <span className="text-xs text-slate-400 font-mono">آخر العمليات</span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-right text-xs text-slate-200">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2.5">التاريخ</th>
                    <th className="px-3 py-2.5">الخزينة</th>
                    <th className="px-3 py-2.5">النوع والتصنيف</th>
                    <th className="px-3 py-2.5">البيان / الجهة</th>
                    <th className="px-3 py-2.5 text-center">المبلغ</th>
                    <th className="px-3 py-2.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {transactions.map((t: any) => {
                    const isExpense = t.type === "EXPENSE";
                    const isCard = t.type === "INCOME_CARD" || t.type === "CARD";
                    const isManagement = t.counterpartyType === "MANAGEMENT";
                    const isEmployee = t.counterpartyType === "EMPLOYEE";
                    const isSupplier = t.counterpartyType === "SUPPLIER";
                    const isCustomer = t.counterpartyType === "CUSTOMER";

                    // فحص هل السند خاص بشراء باقة لإخفاء كود الـ JSON وعرض اسم الباقة
                    const isPackageSub = t.counterpartyName?.startsWith("PACKAGE_SUB:");
                    let packagePlanName = "";
                    if (isPackageSub) {
                      try {
                        const parsed = JSON.parse(t.counterpartyName.replace("PACKAGE_SUB:", ""));
                        packagePlanName = parsed.planName || "باقة ساعات";
                      } catch {
                        packagePlanName = "باقة ساعات";
                      }
                    }

                    const drawer = cashDrawers.find((d) => d.id === t.cashDrawerId);
                    const supplier = suppliers.find((s) => s.id === t.supplierId);
                    const customer = customers.find((c) => c.id === t.customerId);

                    return (
                      <tr key={t.id} className="hover:bg-slate-950/40">
                        <td className="px-3 py-2.5 text-slate-400 font-mono whitespace-nowrap">
                          {new Date(t.createdAt).toLocaleString("ar-EG", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-3 py-2.5 font-sans font-bold text-slate-300">
                          {drawer?.name ?? "الخزينة الافتراضية"}
                        </td>
                        <td className="px-3 py-2.5 font-sans">
                          {isPackageSub ? (
                            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              🎁 اشتراك باقة
                            </span>
                          ) : isManagement ? (
                            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                              🏛️ توريد إدارة
                            </span>
                          ) : isEmployee ? (
                            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              👔 سلفة موظف
                            </span>
                          ) : isSupplier ? (
                            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              🚚 سداد مورد
                            </span>
                          ) : isCustomer ? (
                            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              👤 عميل
                            </span>
                          ) : isExpense ? (
                            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              💸 مصروف تشغيلي
                            </span>
                          ) : isCard ? (
                            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              💳 فيزا
                            </span>
                          ) : (
                            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              📥 قبض نقدية
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-sans">
                          <p className="font-bold text-white">{t.description}</p>
                          {/* عرض منسق ونظيف بدون كود JSON */}
                          {isPackageSub ? (
                            <p className="text-[10px] text-amber-300">الباقة: {packagePlanName} {customer ? `· العميل: ${customer.name}` : ""}</p>
                          ) : (
                            <>
                              {t.counterpartyName && (
                                <p className="text-[10px] text-amber-300">الجهة / المستلم: {t.counterpartyName}</p>
                              )}
                              {supplier && (
                                <p className="text-[10px] text-sky-300">مورد: {supplier.name}</p>
                              )}
                              {customer && (
                                <p className="text-[10px] text-emerald-300">عميل: {customer.name}</p>
                              )}
                            </>
                          )}
                        </td>
                        <td
                          className={`px-3 py-2.5 text-center font-black text-sm ${
                            isExpense ? "text-rose-400" : "text-emerald-400"
                          }`}
                        >
                          {isExpense ? `-${t.amount.toFixed(2)}` : `+${t.amount.toFixed(2)}`} ج.م
                        </td>
                        <td className="px-3 py-2.5 text-center font-sans">
                          <CashMovementActions
                            transaction={t}
                            drawers={cashDrawers}
                            suppliers={suppliers}
                            customers={customers}
                            users={users}
                          />
                        </td>
                      </tr>
                    );
                  })}

                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                        لا توجد سندات أو حركات نقدية مسجلة بعد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}