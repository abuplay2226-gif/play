import { requireRole } from "@/app/actions/auth";
import { closeShift, getAllShifts, openShift } from "@/app/actions/shifts";
import { SiteShell } from "@/components/site-shell";
import { prisma } from "@/lib/prisma";

export default async function ShiftsPage() {
  const user = await requireRole(["ADMIN", "CASHIER"]);

  const [shifts, cashDrawers, activeUsers] = await Promise.all([
    getAllShifts(),
    prisma.cashDrawer.findMany(),
    prisma.user.findMany(),
  ]);

  const currentOpenShift = shifts.find((s) => s.status === "OPEN");

  // تجميع الإيرادات للوردية المفتوحة حالياً
  let currentCashSales = 0;
  let currentCardSales = 0;
  let currentExpenses = 0;

  if (currentOpenShift) {
    currentOpenShift.transactions.forEach((t) => {
      if (t.type === "INCOME") currentCashSales += t.amount;
      if (t.type === "INCOME_CARD") currentCardSales += t.amount;
      if (t.type === "EXPENSE") currentExpenses += t.amount;
    });
  }

  // الكاش الدفتري المفترض وجوده ورقياً في الدرج
  const expectedCashInDrawer = currentOpenShift
    ? currentOpenShift.cashDrawer.balance
    : 0;

  const totalShiftRevenue = currentCashSales + currentCardSales;

  return (
    <SiteShell title="إدارة الورديات ومطابقة الخزائن والفيزا">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_1.8fr]">
        {/* تقفيل أو فتح الوردية مع التقرير المالي الشامل */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 h-fit">
          <h2 className="text-xl font-bold text-white">
            {currentOpenShift ? "تسوية وتقفيل الوردية الحالية" : "فتح وردية جديدة"}
          </h2>

          {currentOpenShift ? (
            <form
              action={async (formData) => {
                "use server";
                const actualCash = Number(formData.get("actualCash") ?? 0);
                await closeShift({
                  shiftId: currentOpenShift.id,
                  closingBalance: expectedCashInDrawer,
                  actualCash,
                });
              }}
              className="mt-5 space-y-4"
            >
              {/* بطاقة تفصيل مبيعات الكاش ومبيعات الفيزا */}
              <div className="rounded-2xl bg-slate-950/70 p-4 border border-slate-800 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>الموظف المسؤول:</span>
                  <span className="font-bold text-white">{currentOpenShift.user.name}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>الخزينة المربوطة:</span>
                  <span className="font-bold text-white">{currentOpenShift.cashDrawer.name}</span>
                </div>

                <div className="border-t border-slate-800/80 pt-2 flex justify-between text-slate-300">
                  <span>💵 مبيعات الكاش بالوردية:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {currentCashSales.toFixed(2)} ج.م
                  </span>
                </div>

                <div className="flex justify-between text-slate-300">
                  <span>💳 مبيعات الفيزا / الشبكة (البنك):</span>
                  <span className="font-mono font-bold text-sky-400">
                    {currentCardSales.toFixed(2)} ج.م
                  </span>
                </div>

                {currentExpenses > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>💸 مصروفات نقدية خارجة:</span>
                    <span className="font-mono font-bold text-rose-400">
                      -{currentExpenses.toFixed(2)} ج.م
                    </span>
                  </div>
                )}

                <div className="border-t border-slate-800/80 pt-2 flex justify-between text-xs font-bold text-amber-300">
                  <span>إجمالي مبيعات الوردية الشامل (كاش + فيزا):</span>
                  <span className="font-mono text-sm">{totalShiftRevenue.toFixed(2)} ج.م</span>
                </div>

                {/* الرصيد الورقي في الدرج */}
                <div className="rounded-xl bg-slate-900 p-3 border border-emerald-500/30 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-300 block font-bold">النقدية الواجب توفرها بالدرج (كاش):</span>
                    <span className="text-[10px] text-slate-500">(الافتتاح + الكاش - المصروفات)</span>
                  </div>
                  <span className="font-mono text-base font-black text-emerald-400">
                    {expectedCashInDrawer.toFixed(2)} ج.م
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-slate-300">
                  النقدية الفعلية بعد الجرد اليدوي للدرج (ج.م):
                </label>
                <input
                  name="actualCash"
                  type="number"
                  step="any"
                  defaultValue={expectedCashInDrawer}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-rose-400 font-mono font-bold"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 للمطابقة: قارن رقم الفيزا ({currentCardSales.toFixed(2)} ج.م) مع إيصال ماكينة البنك POS.
                </p>
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-rose-600 py-3 text-xs font-black text-white hover:bg-rose-500 transition shadow-lg shadow-rose-950/30"
              >
                إغلاق وتسوية الوردية
              </button>
            </form>
          ) : (
            <form
              action={async (formData) => {
                "use server";
                const cashDrawerId = String(formData.get("cashDrawerId") ?? "");
                const openingBalance = Number(formData.get("openingBalance") ?? 0);
                const shiftUserId = String(formData.get("userId") ?? user.userId);

                await openShift({
                  userId: shiftUserId,
                  cashDrawerId,
                  openingBalance,
                });
              }}
              className="mt-5 space-y-4"
            >
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-300">اختر الخزينة:</label>
                <select
                  name="cashDrawerId"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white outline-none focus:border-sky-400"
                  required
                >
                  {cashDrawers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} (رصيدها الحالي: {d.balance} ج.م)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-300">الموظف المسؤول:</label>
                <select
                  name="userId"
                  defaultValue={user.userId}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white outline-none focus:border-sky-400"
                  required
                >
                  {activeUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name ?? u.email} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-300">
                  رصيد افتتاح الوردية (العهدة النقدية بالدرج):
                </label>
                <input
                  name="openingBalance"
                  type="number"
                  step="any"
                  defaultValue={0}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white outline-none focus:border-sky-400 font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-emerald-500 py-3 text-xs font-black text-slate-950 hover:bg-emerald-400 transition"
              >
                فتح الوردية الآن
              </button>
            </form>
          )}
        </div>

        {/* جدول سجل الورديات السابقة */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
          <h2 className="text-xl font-bold text-white mb-4">سجل الورديات وحركات الخزينة</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full text-right text-xs text-slate-200">
              <thead className="bg-slate-950/80 text-slate-400">
                <tr>
                  <th className="px-3 py-2.5">المسؤول</th>
                  <th className="px-3 py-2.5">الخزينة</th>
                  <th className="px-3 py-2.5">تاريخ الفتح</th>
                  <th className="px-3 py-2.5">الافتتاح</th>
                  <th className="px-3 py-2.5">الفعلي بالدرج</th>
                  <th className="px-3 py-2.5">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {shifts.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-950/40">
                    <td className="px-3 py-2.5 font-bold text-white">{s.user.name ?? s.user.email}</td>
                    <td className="px-3 py-2.5">{s.cashDrawer.name}</td>
                    <td className="px-3 py-2.5 text-slate-400">
                      {new Date(s.openedAt).toLocaleString("ar-EG", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-3 py-2.5 font-mono">{s.openingBalance} ج.م</td>
                    <td className="px-3 py-2.5 font-mono text-emerald-400 font-bold">
                      {s.actualCash !== null ? `${s.actualCash} ج.م` : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          s.status === "OPEN"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {s.status === "OPEN" ? "مفتوحة حالياً" : "مغلقة"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}