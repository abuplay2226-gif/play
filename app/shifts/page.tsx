import { requireRole } from "@/app/actions/auth";
import { closeShift, getAllShifts, openShift } from "@/app/actions/shifts";
import { SiteShell } from "@/components/site-shell";
import { prisma } from "@/lib/prisma";

export default async function ShiftsPage() {
  const user = await requireRole(["ADMIN", "CASHIER", "STAFF"]);

  const [shifts, cashDrawers, currentOpenShift, currentUserDb] = await Promise.all([
    getAllShifts(),
    prisma.cashDrawer.findMany({ orderBy: { name: "asc" } }),
    prisma.shift.findFirst({
      where: { status: "OPEN" },
      include: { user: true, cashDrawer: true, orders: true, transactions: true },
    }),
    prisma.user.findUnique({
      where: { id: user.userId },
      include: { defaultCashDrawer: true },
    }),
  ]);

  // فحص هل الموظف مخصص له خزينة مسبقاً
  const lockedDrawer = currentUserDb?.defaultCashDrawer ?? null;

  return (
    <SiteShell title="إدارة الورديات">
      <div className="grid gap-6 xl:grid-cols-[1fr_1.8fr]">
        <div className="space-y-6">
          {currentOpenShift ? (
            <div className="rounded-3xl border border-emerald-500/40 bg-slate-900/90 p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 text-xs font-bold animate-pulse">
                  وردية نشطة ومفتوحة الآن
                </span>
                <span className="text-xs text-slate-400 font-mono">#{currentOpenShift.id.slice(-6)}</span>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>المسؤول:</span>
                  <strong className="text-white text-sm">{currentOpenShift.user.name}</strong>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>الخزينة المربوطة:</span>
                  <strong className="text-emerald-400">{currentOpenShift.cashDrawer.name}</strong>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>رصيد البداية:</span>
                  <strong className="text-white font-mono">{currentOpenShift.openingBalance} ج.م</strong>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>وقت الفتح:</span>
                  <span className="font-mono text-slate-400">
                    {new Date(currentOpenShift.openedAt).toLocaleTimeString("ar-EG", { timeStyle: "short" })}
                  </span>
                </div>
              </div>

              {(user.role === "ADMIN" || user.role === "CASHIER" || user.userId === currentOpenShift.userId) && (
                <form
                  action={async (formData) => {
                    "use server";
                    const closingBalance = Number(formData.get("closingBalance") ?? 0);
                    const actualCash = Number(formData.get("actualCash") ?? closingBalance);
                    await closeShift({
                      shiftId: currentOpenShift.id,
                      closingBalance,
                      actualCash,
                    });
                  }}
                  className="mt-5 pt-4 border-t border-slate-800 space-y-3 text-xs"
                >
                  <label className="block text-slate-300 font-bold">النقدية الفعلية بالدرج عند الإغلاق (ج.م):</label>
                  <input
                    name="actualCash"
                    type="number"
                    step="any"
                    placeholder="المبلغ الموجود بالدرج"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-rose-400 font-mono"
                    required
                  />
                  <input type="hidden" name="closingBalance" value={currentOpenShift.cashDrawer.balance} />

                  <button
                    type="submit"
                    className="w-full rounded-full bg-rose-600 py-2.5 text-xs font-black text-white hover:bg-rose-500 transition shadow-lg shadow-rose-950/30"
                  >
                    🔒 إغلاق وتقفيل الوردية الحالية
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* نموذج فتح الوردية */
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
              <h2 className="text-base font-bold text-white mb-2">⚡ فتح وردية جديدة</h2>
              <p className="text-xs text-slate-400 mb-4">أدخل رصيد الفكة لبدء الوردية.</p>

              <form
                action={async (formData) => {
                  "use server";
                  const cashDrawerId = String(formData.get("cashDrawerId") ?? "");
                  const openingBalance = Number(formData.get("openingBalance") ?? 0);
                  if (!cashDrawerId) return;

                  await openShift({
                    userId: user.userId!,
                    cashDrawerId,
                    openingBalance,
                  });
                }}
                className="space-y-3 text-xs"
              >
                {/* إذا كان لديه خزينة مخصصة تظهر مقفلة 🔒 */}
                {lockedDrawer ? (
                  <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 space-y-1">
                    <span className="text-[11px] text-slate-300 block">الخزينة المخصصة لك من الإدارة:</span>
                    <p className="text-sm font-black text-emerald-300 flex items-center gap-1.5">
                      <span>🔒</span>
                      <span>{lockedDrawer.name}</span>
                    </p>
                    <input type="hidden" name="cashDrawerId" value={lockedDrawer.id} />
                  </div>
                ) : (
                  /* إذا لم تكن مخصصة (كالمدير) يختار من القائمة */
                  <div>
                    <label className="mb-1 block font-bold text-slate-300">الخزينة المستهدفة:</label>
                    <select
                      name="cashDrawerId"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400 font-bold"
                      required
                    >
                      <option value="">-- اختر الخزينة --</option>
                      {cashDrawers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} (رصيدها: {d.balance} ج.م)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="mb-1 block font-bold text-slate-300">رصيد البداية (الفكة بالدرج):</label>
                  <input
                    name="openingBalance"
                    type="number"
                    step="any"
                    defaultValue={0}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-emerald-400 font-bold font-mono outline-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-full bg-emerald-500 py-3 text-xs font-black text-slate-950 hover:bg-emerald-400 transition shadow-lg shadow-emerald-950/20"
                >
                  + بدء وفتح الوردية
                </button>
              </form>
            </div>
          )}
        </div>

        {/* سجل الورديات السابقة */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <h2 className="text-base font-bold text-white mb-4">سجل الورديات السابقة</h2>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="min-w-full text-right text-xs text-slate-200">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="px-3 py-2.5">المسؤول</th>
                  <th className="px-3 py-2.5">الخزينة</th>
                  <th className="px-3 py-2.5">التاريخ</th>
                  <th className="px-3 py-2.5">رصيد البداية</th>
                  <th className="px-3 py-2.5">الإغلاق</th>
                  <th className="px-3 py-2.5 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {shifts.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-950/40">
                    <td className="px-3 py-2.5 font-sans font-bold text-white">{s.user.name}</td>
                    <td className="px-3 py-2.5 font-sans text-slate-300">{s.cashDrawer.name}</td>
                    <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">
                      {new Date(s.openedAt).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="px-3 py-2.5 text-emerald-400">{s.openingBalance} ج.م</td>
                    <td className="px-3 py-2.5 text-white">{s.closingBalance !== null ? `${s.closingBalance} ج.م` : "—"}</td>
                    <td className="px-3 py-2.5 text-center font-sans">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          s.status === "OPEN"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {s.status === "OPEN" ? "مفتوحة" : "مغلقة"}
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