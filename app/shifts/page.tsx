import { SiteShell } from "@/components/site-shell";

const shifts = [
  { cashier: "أحمد علي", drawer: "الخزينة الرئيسية", opening: "1,200 ج.م", actual: "1,480 ج.م", status: "مفتوح" },
  { cashier: "سارة حسن", drawer: "درج كاشير 2", opening: "800 ج.م", actual: "920 ج.م", status: "مفتوح" },
  { cashier: "خالد ناصر", drawer: "درج الشحن", opening: "650 ج.م", actual: "610 ج.م", status: "مغلق" },
];

export default function ShiftsPage() {
  return (
    <SiteShell title="الورديات">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shifts.map((shift) => (
          <article key={shift.cashier} className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xl font-black text-white">{shift.cashier}</p>
              <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                shift.status === "مفتوح" ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/15 text-slate-300"
              }`}>
                {shift.status}
              </span>
            </div>

            <div className="mt-5 space-y-3 text-sm text-slate-300">
              <div className="flex items-center justify-between"><span>الخزينة</span><span className="text-white">{shift.drawer}</span></div>
              <div className="flex items-center justify-between"><span>العهدة</span><span className="text-white">{shift.opening}</span></div>
              <div className="flex items-center justify-between"><span>النقدية الفعلية</span><span className="text-white">{shift.actual}</span></div>
            </div>
          </article>
        ))}
      </div>
    </SiteShell>
  );
}
