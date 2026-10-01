import Link from "next/link";
import { StaffLoginForm } from "@/components/staff-login-form";

export default function StaffLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4" dir="rtl">
      <div className="w-full max-w-md rounded-[32px] border border-sky-500/30 bg-slate-900/90 p-6 shadow-2xl shadow-slate-950/40">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-800/60 px-4 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <span>→</span>
            <span>العودة للرئيسية</span>
          </Link>
        </div>

        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/15 text-2xl font-black text-sky-300">
            🎮
          </div>
          <h1 className="mt-4 text-2xl font-black text-white">دخول الموظف / الكاشير</h1>
          <p className="mt-1 text-xs text-slate-400">لوحة تشغيل الصالة وإدارة العدادات</p>
        </div>

        <StaffLoginForm />
      </div>
    </main>
  );
}