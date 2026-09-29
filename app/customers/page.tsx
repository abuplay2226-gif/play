import { requireRole } from "@/app/actions/auth";
import { createCustomer, deleteCustomer, getCustomers, updateCustomer } from "@/app/actions/bookings";
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
  await requireRole(["ADMIN", "CASHIER"]);

  const customers = await getCustomers();

  return (
    <SiteShell title="إدارة العملاء">
      <div className="mb-8 grid gap-6 xl:grid-cols-[1.1fr_1.3fr]">
        <div className="rounded-[28px] border border-slate-800 bg-slate-900/90 p-5">
          <h2 className="text-xl font-bold text-white">إضافة عميل جديد</h2>
          <form action={createCustomerAction} className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-300">اسم العميل</label>
              <input name="name" className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400" placeholder="اسم العميل" required />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">رقم الهاتف</label>
              <input name="phone" className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400" placeholder="05XXXXXXXX" required />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-300">نقاط الولاء</label>
                <input type="number" name="loyaltyPts" defaultValue={0} min={0} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-300">الديون</label>
                <input type="number" name="debt" defaultValue={0} min={0} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400" />
              </div>
            </div>
            <button type="submit" className="w-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-500 px-4 py-3 text-sm font-black text-slate-950">
              حفظ العميل
            </button>
          </form>
        </div>

        <div className="rounded-[28px] border border-slate-800 bg-slate-900/90 p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">قائمة العملاء</h2>
            <div className="rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-xs font-bold text-sky-200">
              {customers.length} عميل
            </div>
          </div>

          <div className="space-y-3">
            {customers.map((customer) => (
              <div key={customer.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-lg font-black text-white">{customer.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{customer.phone}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={deleteCustomerAction}>
                      <input type="hidden" name="customerId" value={customer.id} />
                      <button type="submit" className="rounded-full bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/25">
                        حذف
                      </button>
                    </form>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                    <p className="text-xs text-slate-400">نقاط الولاء</p>
                    <p className="mt-1 text-lg font-black text-white">{customer.loyaltyPts}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                    <p className="text-xs text-slate-400">الديون</p>
                    <p className="mt-1 text-lg font-black text-amber-300">{Number(customer.debt).toFixed(0)} ج.م</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                    <p className="text-xs text-slate-400">الحجوزات</p>
                    <p className="mt-1 text-lg font-black text-sky-300">{customer.bookings.length}</p>
                  </div>
                </div>

                <form action={updateCustomerAction} className="mt-4 grid gap-3 md:grid-cols-4">
                  <input type="hidden" name="customerId" value={customer.id} />
                  <input name="name" defaultValue={customer.name} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-sky-400" required />
                  <input name="phone" defaultValue={customer.phone} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-sky-400" required />
                  <input type="number" name="loyaltyPts" defaultValue={customer.loyaltyPts} min={0} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-sky-400" />
                  <input type="number" name="debt" defaultValue={customer.debt} min={0} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-sky-400" />
                  <div className="md:col-span-4">
                    <button type="submit" className="rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-bold text-sky-200">
                      حفظ التعديلات
                    </button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
