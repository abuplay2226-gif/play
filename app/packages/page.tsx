import { requireRole } from "@/app/actions/auth";
import {
  approveOnlinePackageRequest,
  createPackagePlan,
  deletePackagePlan,
  getAllCustomerSubscriptions,
  getPackagePlans,
  getPendingPackageRequests,
  rejectOnlinePackageRequest,
  togglePackagePlan,
} from "@/app/actions/packages";
import { CustomerPackageSubscribeForm } from "@/components/customer-package-subscribe-form";
import { SiteShell } from "@/components/site-shell";
import { prisma } from "@/lib/prisma";

export default async function PackagesPage() {
  const user = await requireRole(["ADMIN", "CASHIER"]);

  const [plans, subscriptions, pendingRequests, customers, openShift, cashDrawers] = await Promise.all([
    getPackagePlans(),
    getAllCustomerSubscriptions(),
    getPendingPackageRequests(),
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, phone: true } }),
    prisma.shift.findFirst({ where: { status: "OPEN" }, include: { cashDrawer: true } }),
    prisma.cashDrawer.findMany({ orderBy: { name: "asc" } }),
  ]);

  const activePlansCount = plans.filter((p: any) => p.active).length;
  const activeSubsCount = subscriptions.filter((s: any) => s.isActive).length;

  const customerOptions = customers.map((c: any) => ({
    value: c.id,
    label: c.name,
    subLabel: `هاتف: ${c.phone}`,
  }));

  const planOptions = plans
    .filter((p: any) => p.active)
    .map((p: any) => ({
      value: p.id,
      label: `${p.name} (${p.meta.hours} ساعة)`,
      subLabel: `السعر: ${p.price} ج.م · صلاحية ${p.meta.validityDays} يوم`,
    }));

  return (
    <SiteShell title="إدارة الباقات واشتراكات العملاء">
      {/* كروت المؤشرات السريعة */}
      <div className="grid gap-4 sm:grid-cols-4 mb-8">
        <article className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-slate-400 block font-bold">🎁 الباقات المتاحة</span>
          <p className="mt-2 text-3xl font-black font-mono text-emerald-400">{activePlansCount}</p>
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-slate-400 block font-bold">👤 المشتركين النشطين</span>
          <p className="mt-2 text-3xl font-black font-mono text-sky-400">{activeSubsCount}</p>
        </article>

        <article className="rounded-3xl border border-amber-500/30 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-amber-300 block font-bold">🔔 طلبات أونلاين معلقة</span>
          <p className="mt-2 text-3xl font-black font-mono text-amber-300">{pendingRequests.length}</p>
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-slate-400 block font-bold">📦 إجمالي الاشتراكات</span>
          <p className="mt-2 text-3xl font-black font-mono text-white">{subscriptions.length}</p>
        </article>
      </div>

      {/* قسم طلبات الباقات المعلقة من الموقع الإلكتروني */}
      {pendingRequests.length > 0 && (
        <div className="mb-8 rounded-3xl border border-amber-500/40 bg-slate-900/90 p-5 shadow-xl animate-in fade-in">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
            <div>
              <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
                <span>🔔</span>
                <span>طلبات اشتراك الباقات المعلقة من الموقع الإلكتروني ({pendingRequests.length})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تأكيد استلام النقدية وشحن رصيد الساعات للعميل فور حضور الصالة أو الدفع.
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {pendingRequests.map((req: any) => (
              <div
                key={req.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{req.customerName}</span>
                    <span className="font-mono text-slate-400">{req.customerPhone}</span>
                  </div>
                  <p className="text-xs text-sky-300 mt-1">
                    الباقة المطلوبة: <strong>{req.planName}</strong> · القيمة: <strong className="text-amber-300 font-mono">{req.price} ج.م</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <form
                    action={async () => {
                      "use server";
                      await approveOnlinePackageRequest({
                        requestId: req.id,
                        packageId: req.planId,
                        customerId: req.customerId,
                        cashDrawerId: openShift?.cashDrawerId,
                        shiftId: openShift?.id,
                        paymentMethod: "CASH",
                      });
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-slate-950 hover:bg-emerald-400 transition"
                    >
                      ✓ استلام كاش وتفعيل الساعات
                    </button>
                  </form>

                  <form
                    action={async () => {
                      "use server";
                      await rejectOnlinePackageRequest(req.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-400 hover:text-rose-400 transition"
                    >
                      ✕ رفض الطلب
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.9fr]">
        {/* العمود الأيمن: تفعيل باقة لعميل + إنشاء باقة جديدة */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-sky-500/30 bg-slate-900/90 p-5 shadow-xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>⚡</span>
              <span>تفعيل باقة لعميل (شراء كاش / فيزا)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              اختر الباقة والعميل وسيتم إيداع القيمة في الخزينة وشحن رصيد الساعات فوراً.
            </p>

            <CustomerPackageSubscribeForm
              customers={customerOptions}
              plans={planOptions}
              cashDrawers={cashDrawers}
              defaultDrawerId={openShift?.cashDrawerId}
              openShiftId={openShift?.id}
            />
          </div>

          {user.role === "ADMIN" && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 h-fit shadow-xl">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>🎁</span>
                <span>إنشاء باقة جديدة للصالة</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                تحديد عدد الساعات، السعر، مدة الصلاحية، والمشروبات المجانية.
              </p>

              <form action={createPackagePlan} className="space-y-3.5 text-xs">
                <div>
                  <label className="mb-1 block font-bold text-slate-300">اسم الباقة:</label>
                  <input
                    name="name"
                    placeholder="مثال: باقة الأبطال VIP 10 ساعات"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-bold text-slate-300">سعر الباقة (ج.م):</label>
                    <input
                      name="price"
                      type="number"
                      step="any"
                      placeholder="400"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-amber-300 font-bold font-mono outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-slate-300">عدد ساعات اللعب:</label>
                    <input
                      name="hours"
                      type="number"
                      defaultValue={10}
                      min={1}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-emerald-400 font-bold font-mono outline-none focus:border-emerald-400"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-bold text-slate-300">الصلاحية (بالأيام):</label>
                    <input
                      name="validityDays"
                      type="number"
                      defaultValue={30}
                      min={1}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white font-mono outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-slate-300">المشروبات المجانية:</label>
                    <input
                      name="drinksCount"
                      type="number"
                      defaultValue={0}
                      min={0}
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white font-mono outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-slate-300">الأجهزة المسموحة:</label>
                  <select
                    name="deviceType"
                    defaultValue="ALL"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="ALL">جميع الأجهزة في الصالة</option>
                    <option value="PS5">أجهزة PS5 فقط</option>
                    <option value="VIP_ROOM">غرف الـ VIP فقط</option>
                    <option value="PS4">أجهزة PS4 فقط</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input type="checkbox" name="highlight" id="hl" value="true" className="rounded" />
                  <label htmlFor="hl" className="text-slate-300 cursor-pointer">
                    تمييز الباقة كباقة شائعة ومميزة في الصفحة الرئيسية ⭐
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-full bg-emerald-500 py-3 text-xs font-black text-slate-950 hover:bg-emerald-400 transition"
                >
                  + حفظ الباقة وطرحها للبيع
                </button>
              </form>
            </div>
          )}
        </div>

        {/* العمود الأيسر: الباقات الحالية وسجل رصيد المشتركين */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
            <h3 className="text-base font-bold text-white mb-4">الباقات المتاحة بالصالة ({plans.length})</h3>

            <div className="grid gap-3 sm:grid-cols-2">
              {plans.map((p: any) => (
                <div
                  key={p.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between ${
                    p.highlight
                      ? "border-amber-400/40 bg-amber-950/20 shadow-lg shadow-amber-950/10"
                      : "border-slate-800 bg-slate-950/70"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-black text-white text-sm">{p.name}</h4>
                      <span className="font-mono font-black text-amber-300 text-sm">{p.price} ج.م</span>
                    </div>

                    <div className="mt-2.5 space-y-1 text-xs text-slate-300">
                      <p>⏱️ وقت اللعب: <strong className="text-emerald-400">{p.meta.hours} ساعات</strong></p>
                      <p>📅 مدة الصلاحية: <strong>{p.meta.validityDays} يوم</strong></p>
                      {p.meta.drinksCount > 0 && (
                        <p>☕ مشاريب مجانية: <strong className="text-cyan-300">{p.meta.drinksCount} مشروب</strong></p>
                      )}
                    </div>
                  </div>

                  {user.role === "ADMIN" && (
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <form
                        action={async () => {
                          "use server";
                          await togglePackagePlan(p.id, !p.active);
                        }}
                      >
                        <button
                          type="submit"
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold ${
                            p.active
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {p.active ? "مفعلة بالموقع ✓" : "معطلة"}
                        </button>
                      </form>

                      <form
                        action={async () => {
                          "use server";
                          await deletePackagePlan(p.id);
                        }}
                      >
                        <button type="submit" className="text-slate-500 hover:text-rose-400 text-xs">
                          حذف
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">سجل اشتراكات وساعات العملاء</h3>
                <p className="text-[11px] text-slate-400">متابعة رصيد الساعات المتبقية وصلاحية الباقة لكل عميل.</p>
              </div>
              <span className="text-xs text-sky-400 font-mono font-bold">{subscriptions.length} اشتراك</span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-right text-xs text-slate-200">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2.5">العميل</th>
                    <th className="px-3 py-2.5">الباقة</th>
                    <th className="px-3 py-2.5 text-center">الرصيد المتبقي</th>
                    <th className="px-3 py-2.5 text-center">تاريخ الانتهاء</th>
                    <th className="px-3 py-2.5 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {subscriptions.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-950/40">
                      <td className="px-3 py-2.5 font-sans font-bold text-white">
                        <p>{s.customerName}</p>
                        <p className="text-[10px] text-slate-500">{s.customerPhone}</p>
                      </td>
                      <td className="px-3 py-2.5 font-sans text-sky-300 font-bold">{s.planName}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-emerald-400 text-sm">
                        {s.remainingHoursText}
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-400">
                        {new Date(s.expiryDate).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="px-3 py-2.5 text-center font-sans">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            s.isActive
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-500"
                          }`}
                        >
                          {s.isActive ? "نشطة وجاهزة" : "منتهية"}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {subscriptions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                        لا توجد اشتراكات باقات مسجلة بعد.
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