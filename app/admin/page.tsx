import Link from "next/link";

import { requireRole } from "@/app/actions/auth";
import { getUsers } from "@/app/actions/users";
import { SiteShell } from "@/components/site-shell";

const adminSummary = [
  { title: "إيراد اليوم", value: "8,450 ج.م", accent: "text-emerald-300" },
  { title: "الجلسات النشطة", value: "14", accent: "text-sky-300" },
  { title: "المخزون المنخفض", value: "5", accent: "text-amber-300" },
  { title: "الطلبات", value: "27", accent: "text-violet-300" },
];

const quickLinks = [
  { label: "إدارة الموظفين", href: "/users" },
  { label: "التقارير", href: "/reports" },
  { label: "الأجهزة", href: "/devices" },
  { label: "نقاط البيع", href: "/pos" },
];

export default async function AdminPage() {
  await requireRole(["ADMIN"]);

  const users = (await getUsers()) as Array<{
    id: string;
    name: string | null;
    email: string;
    role: "ADMIN" | "CASHIER" | "STAFF";
  }>;

  return (
    <SiteShell title="لوحة المدير">
      <div className="rounded-[32px] border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-slate-900 to-slate-950 p-5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-violet-300">Operations Overview</p>
            <h2 className="mt-4 text-3xl font-black text-white">مؤشرات الأداء اليوم</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {quickLinks.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-bold text-violet-200 hover:border-violet-400">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {adminSummary.map((item) => (
          <article key={item.title} className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-5">
            <p className="text-sm text-slate-400">{item.title}</p>
            <p className={`mt-4 text-3xl font-black ${item.accent}`}>{item.value}</p>
          </article>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border border-slate-800 bg-slate-900/90 p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-black text-white">إدارة الموظفين</h2>
            <Link href="/users" className="text-sm font-bold text-sky-300 hover:text-sky-200">
              إدارة كاملة
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {users.slice(0, 5).map((user) => (
              <div key={user.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-white">{user.name ?? "غير محدد"}</span>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                    user.role === "ADMIN"
                      ? "bg-violet-500/15 text-violet-300"
                      : user.role === "CASHIER"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-sky-500/15 text-sky-300"
                  }`}>
                    {user.role}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{user.email}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-800 bg-slate-900/90 p-5">
          <h2 className="text-xl font-black text-white">أداء اليوم</h2>
          <div className="mt-5 space-y-4">
            {[
              { label: "المبيعات اليومية", value: "8,450 ج.م", tone: "text-emerald-300" },
              { label: "معدل الحضور", value: "96%", tone: "text-sky-300" },
              { label: "الأداء الأسبوعي", value: "+12.4%", tone: "text-violet-300" },
            ].map((report) => (
              <div key={report.label} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <span>{report.label}</span>
                  <span className={`font-black ${report.tone}`}>{report.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
