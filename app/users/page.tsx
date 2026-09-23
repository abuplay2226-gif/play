import { requireRole } from "@/app/actions/auth";
import { createUser, getUsers } from "@/app/actions/users";
import { SiteShell } from "@/components/site-shell";

export default async function UsersPage() {
  await requireRole(["ADMIN"]);

  const users = (await getUsers()) as Array<{
    id: string;
    name: string | null;
    email: string;
    role: "ADMIN" | "CASHIER" | "STAFF";
    shifts: Array<{ id: string }>;
  }>;

  return (
    <SiteShell title="إدارة الموظفين">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.7fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
          <h2 className="text-xl font-bold text-white">إضافة موظف جديد</h2>

          <form action={createUser} className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-300">الاسم الكامل</label>
              <input name="name" className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-500" required />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">البريد الإلكتروني</label>
              <input name="email" type="email" className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-500" required />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">كلمة المرور</label>
              <input name="password" type="password" className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-500" required />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">الدور</label>
              <select name="role" className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-500">
                <option value="ADMIN">مدير</option>
                <option value="CASHIER">كاشير</option>
                <option value="STAFF">موظف</option>
              </select>
            </div>

            <button type="submit" className="w-full rounded-full bg-sky-500 px-4 py-3 text-sm font-black text-slate-950 hover:bg-sky-400">
              حفظ الموظف
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">قائمة الموظفين</h2>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-800">
            <table className="min-w-full text-right text-sm text-slate-200">
              <thead className="bg-slate-950/80 text-slate-300">
                <tr>
                  <th className="px-4 py-3">الاسم</th>
                  <th className="px-4 py-3">البريد</th>
                  <th className="px-4 py-3">الدور</th>
                  <th className="px-4 py-3">الورديات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-slate-800 bg-slate-900/60">
                    <td className="px-4 py-3 font-bold text-white">{user.name}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                        user.role === "ADMIN"
                          ? "bg-violet-500/15 text-violet-300"
                          : user.role === "CASHIER"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-sky-500/15 text-sky-300"
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">{user.shifts.length}</td>
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
