import { signIn } from "@/app/actions/auth";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4" dir="rtl">
      <div className="w-full max-w-md rounded-[32px] border border-violet-500/30 bg-slate-900/90 p-6 shadow-2xl shadow-slate-950/40">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/15 text-2xl font-black text-violet-300">
            A
          </div>
          <h1 className="mt-5 text-3xl font-black text-white">دخول المدير</h1>
          <p className="mt-2 text-sm text-slate-400">صفحة خاصة للمدير فقط</p>
        </div>

        <form action={signIn} className="space-y-5">
          <input type="hidden" name="role" value="ADMIN" />

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-bold text-slate-200">
              البريد الإلكتروني
            </label>
            <input id="email" name="email" defaultValue="admin@play.local" className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-violet-400" required />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-200">
              كلمة المرور
            </label>
            <input id="password" name="password" type="password" defaultValue="admin123" className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-violet-400" required />
          </div>

          <button type="submit" className="w-full rounded-full bg-violet-500 px-4 py-3 text-base font-black text-white transition hover:bg-violet-400">
            دخول المدير
          </button>
        </form>
      </div>
    </main>
  );
}
