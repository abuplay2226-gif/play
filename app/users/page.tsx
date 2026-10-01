import { requireRole } from "@/app/actions/auth";
import { createUser, getUsers } from "@/app/actions/users";
import { EmployeeLedgerModal } from "@/components/employee-ledger-modal";
import { SiteShell } from "@/components/site-shell";
import { UserEditModal } from "@/components/user-edit-modal";

export default async function UsersPage() {
  await requireRole(["ADMIN"]);

  const users = await getUsers();

  return (
    <SiteShell title="إدارة الموظفين والحسابات">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.9fr]">
        {/* نموذج إضافة موظف جديد */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 h-fit shadow-xl">
          <h2 className="text-xl font-bold text-white">إضافة موظف جديد</h2>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            تحديد الاسم الكامل واسم الدخول للنظام والصلاحية.
          </p>

          <form action={createUser} className="space-y-4 text-xs">
            <div>
              <label className="mb-1 block font-bold text-slate-300">الاسم الكامل للموظف:</label>
              <input
                name="name"
                placeholder="مثال: أحمد محمد محمود"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-sky-500"
                required
              />
            </div>

            <div>
              <label className="mb-1 block font-bold text-slate-300">اسم الدخول للنظام (Username):</label>
              <input
                name="username"
                placeholder="مثال: ahmed / cashier1 / staff_ali"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-amber-300 font-bold font-mono outline-none focus:border-amber-400"
                required
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                الاسم الذي سيكتبه الموظف لتسجيل الدخول.
              </span>
            </div>

            <div>
              <label className="mb-1 block font-bold text-slate-300">كلمة المرور:</label>
              <input
                name="password"
                type="password"
                placeholder="أدخل كلمة مرور الحساب"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-sky-500"
                required
              />
            </div>

            <div>
              <label className="mb-1 block font-bold text-slate-300">الصلاحية / الرتبة:</label>
              <select
                name="role"
                defaultValue="STAFF"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-sky-500 font-bold"
              >
                <option value="STAFF">موظف صالة (Staff)</option>
                <option value="CASHIER">كاشير (Cashier)</option>
                <option value="ADMIN">مدير النظام (Admin)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-sky-500 py-3 text-xs font-black text-slate-950 hover:bg-sky-400 transition shadow-lg shadow-sky-950/30"
            >
              + إنشاء حساب الموظف
            </button>
          </form>
        </div>

        {/* جدول قائمة الحسابات */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <div className="mb-5 flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-xl font-bold text-white">قائمة الحسابات والموظفين</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تعديل الأسماء، تغيير اسم الدخول والباسورد، ومتابعة السلف.
              </p>
            </div>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-sky-300">
              {users.length} حساب مسجل
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="min-w-full text-right text-xs text-slate-200">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">الاسم الكامل</th>
                  <th className="px-4 py-3 text-center">اسم الدخول</th>
                  <th className="px-4 py-3 text-center">الصلاحية</th>
                  <th className="px-4 py-3 text-center">الورديات</th>
                  <th className="px-4 py-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-950/40 transition">
                    <td className="px-4 py-3 font-sans font-bold text-white">
                      {u.name ?? "بدون اسم"}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className="rounded-lg bg-slate-950 px-2.5 py-1 text-amber-300 font-bold border border-slate-800">
                        @{u.username}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center font-sans">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          u.role === "ADMIN"
                            ? "bg-violet-500/15 text-violet-300 border border-violet-500/30"
                            : u.role === "CASHIER"
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                        }`}
                      >
                        {u.role === "ADMIN" ? "مدير 👑" : u.role === "CASHIER" ? "كاشير 💵" : "موظف صالة 🎮"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center font-bold text-slate-300">
                      {u.shifts.length}
                    </td>

                    <td className="px-4 py-3 text-center font-sans">
                      <div className="flex items-center justify-center gap-2">
                        {/* كشف السلف */}
                        <EmployeeLedgerModal user={u} />

                        {/* تعديل الاسم الكامل واسم الدخول وكلمة المرور */}
                        <UserEditModal
                          user={{
                            id: u.id,
                            name: u.name,
                            username: u.username,
                            role: u.role,
                          }}
                        />
                      </div>
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