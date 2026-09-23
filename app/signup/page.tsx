import { createCustomerAccount } from "@/app/actions/auth";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4" dir="rtl">
      <div className="w-full max-w-xl rounded-[32px] border border-slate-800 bg-slate-900/90 p-6 shadow-2xl shadow-slate-950/40">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-2xl font-black text-emerald-300">
            P
          </div>
          <h1 className="mt-5 text-3xl font-black text-white">إنشاء حساب عميل</h1>
          <p className="mt-2 text-sm text-slate-400">يمكن للعميل إنشاء حسابه مباشرة</p>
        </div>

        <form action={createCustomerAccount} className="space-y-5">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-bold text-slate-200">
              الاسم الكامل
            </label>
            <input
              id="name"
              name="name"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400"
              placeholder="أدخل اسمك الكامل"
              required
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-2 block text-sm font-bold text-slate-200">
              رقم الهاتف
            </label>
            <input
              id="phone"
              name="phone"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400"
              placeholder="05XXXXXXXX"
              required
            />
          </div>

          <button type="submit" className="w-full rounded-full bg-emerald-500 px-4 py-3 text-base font-black text-slate-950 transition hover:bg-emerald-400">
            إنشاء الحساب
          </button>
        </form>
      </div>
    </main>
  );
}
