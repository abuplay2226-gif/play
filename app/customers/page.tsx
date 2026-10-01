import { requireRole } from "@/app/actions/auth";
import { createCustomer, deleteCustomer, getCustomers, updateCustomer } from "@/app/actions/bookings";
import { CustomerLedgerModal } from "@/components/customer-ledger-modal";
import { SiteShell } from "@/components/site-shell";

async function createCustomerAction(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const loyaltyPts = Number(formData.get("loyaltyPts") ?? 0);
  const debt = Number(formData.get("debt") ?? 0);

  if (!name || !phone) {
    throw new Error("اسم العميل ورقم الهاتف مطلوبان");
  }

  await createCustomer({ name, phone, loyaltyPts, debt });
}

async function updateCustomerAction(formData: FormData) {
  "use server";

  const customerId = String(formData.get("customerId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const loyaltyPts = Number(formData.get("loyaltyPts") ?? 0);
  const debt = Number(formData.get("debt") ?? 0);

  if (!customerId || !name || !phone) {
    throw new Error("بيانات العميل غير مكتملة");
  }

  await updateCustomer(customerId, { name, phone, loyaltyPts, debt });
}

async function deleteCustomerAction(formData: FormData) {
  "use server";

  const customerId = String(formData.get("customerId") ?? "");
  if (customerId) {
    await deleteCustomer(customerId);
  }
}

export default async function CustomersPage() {
  await requireRole(["ADMIN", "CASHIER", "STAFF"]);

  const customers = await getCustomers();

  return (
    <SiteShell title="إدارة العملاء وكشوف الحسابات">
      <div className="mb-8 grid gap-6 xl:grid-cols-[1.1fr_1.9fr]">
        {/* نموذج إضافة عميل جديد */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 h-fit shadow-xl">
          <h2 className="text-xl font-bold text-white">إضافة عميل جديد</h2>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            تسجيل العميل لمتابعة نقاط ولائه، باقاته، وديونه.
          </p>

          <form action={createCustomerAction} className="space-y-4 text-xs">
            <div>
              <label className="mb-1 block font-bold text-slate-300">اسم العميل:</label>
              <input
                name="name"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-sky-400"
                placeholder="مثال: سارة علي / محمود حسن"
                required
              />
            </div>

            <div>
              <label className="mb-1 block font-bold text-slate-300">رقم الهاتف:</label>
              <input
                name="phone"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-sky-400 font-mono"
                placeholder="05XXXXXXXX"
                required
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-bold text-slate-300">نقاط الولاء الافتتاحية:</label>
                <input
                  type="number"
                  name="loyaltyPts"
                  defaultValue={0}
                  min={0}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-300">ديون سابقة (إن وجدت):</label>
                <input
                  type="number"
                  name="debt"
                  defaultValue={0}
                  min={0}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-rose-400 font-bold font-mono outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-500 py-3 text-xs font-black text-slate-950 shadow-lg hover:scale-[1.01] transition"
            >
              + حفظ العميل
            </button>
          </form>
        </div>

        {/* قائمة العملاء مع كشوف الحسابات */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <div className="mb-5 flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-xl font-bold text-white">قائمة العملاء</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                متابعة الحسابات، نقاط الولاء، وكشوفات استهلاك الباقات والديون.
              </p>
            </div>
            <div className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-sky-300">
              {customers.length} عميل
            </div>
          </div>

          <div className="space-y-4 max-h-[680px] overflow-y-auto pr-1">
            {customers.map((customer) => (
              <div
                key={customer.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3.5 hover:border-slate-700 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-white">{customer.name}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{customer.phone}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* زر كشف الحساب التفصيلي */}
                    <CustomerLedgerModal
                      customer={{
                        id: customer.id,
                        name: customer.name,
                        phone: customer.phone,
                        debt: customer.debt,
                        loyaltyPts: customer.loyaltyPts,
                      }}
                    />

                    <form action={deleteCustomerAction}>
                      <input type="hidden" name="customerId" value={customer.id} />
                      <button
                        type="submit"
                        className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition"
                      >
                        حذف
                      </button>
                    </form>
                  </div>
                </div>

                {/* كروت المؤشرات الخاصة بالعميل */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2.5">
                    <span className="text-[11px] text-slate-400 block">نقاط الولاء:</span>
                    <span className="font-mono font-bold text-amber-300">⭐ {customer.loyaltyPts}</span>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2.5">
                    <span className="text-[11px] text-slate-400 block">الديون المعلقة:</span>
                    <span className={`font-mono font-bold ${customer.debt > 0 ? "text-rose-400 font-black" : "text-emerald-400"}`}>
                      {customer.debt.toFixed(2)} ج.م
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2.5">
                    <span className="text-[11px] text-slate-400 block">الجلسات المسجلة:</span>
                    <span className="font-mono font-bold text-sky-300">{customer.sessions?.length ?? 0}</span>
                  </div>
                </div>
              </div>
            ))}

            {customers.length === 0 && (
              <p className="text-center text-xs text-slate-500 py-12">
                لا يوجد عملاء مسجلين حالياً.
              </p>
            )}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}