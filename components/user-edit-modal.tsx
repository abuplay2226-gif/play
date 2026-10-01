"use client";

import { useState, useTransition } from "react";
import { deleteUser, updateUser } from "@/app/actions/users";

interface UserEditModalProps {
  user: {
    id: string;
    name: string | null;
    username: string;
    role: "ADMIN" | "CASHIER" | "STAFF";
  };
}

export function UserEditModal({ user }: UserEditModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const [name, setName] = useState(user.name || "");
  const [username, setUsername] = useState(user.username || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "CASHIER" | "STAFF">(user.role);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim() || !username.trim()) {
      setErrorMsg("الاسم الكامل واسم الدخول مطلوبان");
      return;
    }

    startTransition(async () => {
      try {
        await updateUser({
          userId: user.id,
          name: name.trim(),
          username: username.trim(),
          password: password.trim() || undefined,
          role,
        });
        setIsOpen(false);
        setPassword("");
      } catch (err: any) {
        setErrorMsg(err.message || "فشل تحديث بيانات المستخدم");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`هل أنت متأكد من حذف الموظف (${user.name}) نهائياً؟`)) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteUser(user.id);
        setIsOpen(false);
      } catch (err: any) {
        alert(err.message || "فشل حذف الموظف");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setName(user.name || "");
          setUsername(user.username || "");
          setPassword("");
          setRole(user.role);
          setErrorMsg("");
          setIsOpen(true);
        }}
        className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-amber-400 hover:text-white transition"
      >
        ✏️ تعديل الحساب / الباسورد
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl relative text-right">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute left-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              ✕
            </button>

            <div className="border-b border-slate-800 pb-3 mb-4">
              <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300">
                تعديل الحساب واسم الدخول
              </span>
              <h3 className="mt-2 text-xl font-black text-white">{user.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تعديل الاسم الكامل، اسم الدخول، الصلاحية، أو تعيين كلمة مرور جديدة.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/15 p-2.5 text-xs text-rose-300 font-bold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-3.5 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-300">الاسم الكامل للموظف:</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أحمد محمد محمود"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400 font-bold"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-300">اسم الدخول للنظام (Username):</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثال: ahmed / admin / cashier1"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-amber-300 font-bold font-mono outline-none focus:border-amber-400"
                  required
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  هذا هو الاسم المستخدم لتسجيل الدخول في شاشة الدخول.
                </span>
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-300">تعيين كلمة مرور جديدة:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="اتركها فارغة إذا كنت لا تريد تغييرها"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-300">الدور / الصلاحية:</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none font-bold"
                >
                  <option value="STAFF">موظف صالة (Staff)</option>
                  <option value="CASHIER">كاشير (Cashier)</option>
                  <option value="ADMIN">مدير النظام (Admin)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-amber-500 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-400 transition disabled:opacity-40"
                >
                  {isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleDelete}
                  className="rounded-xl bg-rose-500/15 border border-rose-500/30 px-3 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-500/25 transition disabled:opacity-40"
                >
                  حذف الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}