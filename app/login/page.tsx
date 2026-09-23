import Link from "next/link";

import { signInCustomer } from "@/app/actions/auth";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4" dir="rtl">
      <div className="w-full max-w-4xl rounded-[32px] border border-slate-800 bg-slate-900/90 p-6 shadow-2xl shadow-slate-950/40 lg:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/15 text-2xl font-black text-sky-300">
            P
          </div>
          <h1 className="mt-5 text-3xl font-black text-white">تسجيل الدخول</h1>
          <p className="mt-2 text-sm text-slate-400">الدخول إلى حساب العميل</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-emerald-500/30 bg-emerald-500/10 p-6">
            <h2 className="text-2xl font-black text-white">عميل جديد؟</h2>
            <p className="mt-3 text-slate-300">أنشئ حسابك الآن وابدأ بحجز جلساتك ومشاهدة عروضنا.</p>
            <Link href="/signup" className="mt-6 inline-block rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-5 py-3 text-sm font-black text-slate-950">
              إنشاء حساب جديد
            </Link>
          </div>

          <form action={signInCustomer} className="space-y-5 rounded-[28px] border border-slate-800 bg-slate-950/60 p-6">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-bold text-slate-200">
                الاسم الكامل
              </label>
              <input
                id="name"
                name="name"
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400"
                placeholder="اكتب اسمك الكامل"
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
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-emerald-400"
                placeholder="05XXXXXXXX"
                required
              />
            </div>

            <button type="submit" className="w-full rounded-full bg-emerald-500 px-4 py-3 text-base font-black text-slate-950 transition hover:bg-emerald-400">
              دخول العميل
            </button>
          </form>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-300">
          <Link href="/admin/login" className="rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-violet-200 hover:border-violet-400">
            دخول المدير
          </Link>
          <Link href="/staff/login" className="rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sky-200 hover:border-sky-400">
            دخول الموظف
          </Link>
        </div>
      </div>
    </main>
  );
}
