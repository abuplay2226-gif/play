import { requireRole } from "@/app/actions/auth";
import { PurchaseInvoiceForm } from "@/components/purchase-invoice-form";
import { SiteShell } from "@/components/site-shell";
import { SuppliersDirectory } from "@/components/suppliers-directory";
import { prisma } from "@/lib/prisma";

export default async function SuppliersPage() {
  await requireRole(["ADMIN", "CASHIER"]);

  const [suppliers, products, openShift, cashDrawers, categories, invoices] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.shift.findFirst({ where: { status: "OPEN" }, include: { cashDrawer: true } }),
    prisma.cashDrawer.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.purchaseInvoice.findMany({
      include: { supplier: true, items: { include: { product: true } } },
      orderBy: { invoiceDate: "desc" },
      take: 10,
    }),
  ]);

  const supplierOptions = suppliers.map((s) => ({
    value: s.id,
    label: s.name,
    subLabel: `المستحق له: ${s.balance} ج.م · ${s.phone ?? "بدون هاتف"}`,
  }));

  return (
    <SiteShell title="إدارة الموردين وفواتير الشراء">
      {/* قائمة الموردين القابلة للطي والمزودة بالبحث الحي */}
      <SuppliersDirectory suppliers={suppliers} />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1.8fr]">
        {/* نموذج فاتورة الشراء الذكي */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 h-fit">
          <h2 className="text-xl font-bold text-white">تسجيل فاتورة شراء جديدة</h2>
          <p className="text-xs text-slate-400 mt-1">
            إدخال بضاعة أو خامات مع إمكانية تعريف الصنف الكامل بنقر زر.
          </p>

          <div className="mt-5">
            <PurchaseInvoiceForm
              initialSuppliers={supplierOptions}
              initialProducts={products}
              categories={categories}
              cashDrawers={cashDrawers}
              openShiftId={openShift?.id}
              defaultDrawerId={openShift?.cashDrawerId}
            />
          </div>
        </div>

        {/* القسم الأيسر: سند صرف الديون وسجل الفواتير */}
        <div className="space-y-6">
          <details className="rounded-3xl border border-amber-500/30 bg-slate-900/90 p-5">
            <summary className="cursor-pointer font-bold text-amber-300 text-xs select-none">
              💵 سند صرف نقدية لمورد (سداد دين سابق بدون بضاعة)
            </summary>
            <form
              action={async (formData) => {
                "use server";
                const { paySupplierDebt } = await import("@/app/actions/suppliers");
                const supplierId = String(formData.get("supplierId") ?? "");
                const amount = Number(formData.get("amount") ?? 0);
                const targetCashDrawerId = String(formData.get("targetCashDrawerId") ?? "");
                const notes = String(formData.get("notes") ?? "");

                if (!supplierId || amount <= 0) return;

                await paySupplierDebt({
                  supplierId,
                  shiftId: openShift?.id,
                  targetCashDrawerId: targetCashDrawerId || undefined,
                  amount,
                  notes,
                });
              }}
              className="mt-4 space-y-3"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] text-slate-400">اختر المورد:</label>
                  <select
                    name="supplierId"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                    required
                  >
                    <option value="">-- اختر المورد المسدد له --</option>
                    {suppliers
                      .filter((s) => s.balance > 0)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (المستحق له: {s.balance} ج.م)
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] text-slate-400">المبلغ المصروف له (ج.م):</label>
                  <input
                    name="amount"
                    type="number"
                    step="any"
                    placeholder="مثال: 500"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-amber-400 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] text-slate-400">اصرف من الخزينة:</label>
                <select
                  name="targetCashDrawerId"
                  defaultValue={openShift?.cashDrawerId ?? cashDrawers[0]?.id ?? ""}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-amber-300 font-bold outline-none"
                >
                  {cashDrawers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} (رصيدها: {d.balance} ج.م) {d.id === openShift?.cashDrawerId ? "⭐ (خزينة الوردية - افتراضي)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  name="notes"
                  placeholder="ملاحظات السند (مثلاً: دفعة من حساب فاتورة بن رقم 12)"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <button
                type="submit"
                className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
              >
                تأكيد صرف السند وتخفيض الدين
              </button>
            </form>
          </details>

          {/* جدول سجل الفواتير السابقة */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
            <h3 className="text-lg font-bold text-white mb-4">سجل آخر فواتير الشراء والتوريد</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-right text-xs text-slate-200">
                <thead className="bg-slate-950/80 text-slate-400">
                  <tr>
                    <th className="px-3 py-2.5">المورد</th>
                    <th className="px-3 py-2.5">الأصناف المشتراة</th>
                    <th className="px-3 py-2.5">الإجمالي</th>
                    <th className="px-3 py-2.5">المدفوع</th>
                    <th className="px-3 py-2.5">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-950/40">
                      <td className="px-3 py-2.5 font-bold text-white">{inv.supplier.name}</td>
                      <td className="px-3 py-2.5">
                        {inv.items.map((i) => `${i.product.name} (${i.quantity})`).join(", ")}
                      </td>
                      <td className="px-3 py-2.5 font-mono font-bold text-white">{inv.totalAmount} ج.م</td>
                      <td className="px-3 py-2.5 font-mono text-emerald-400">{inv.paidAmount} ج.م</td>
                      <td className="px-3 py-2.5 text-slate-400">
                        {new Date(inv.invoiceDate).toLocaleDateString("ar-EG")}
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        لا توجد فواتير شراء مسجلة بعد.
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