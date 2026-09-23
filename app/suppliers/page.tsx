import { SiteShell } from "@/components/site-shell";

const suppliers = [
  { name: "مورد المشروبات", phone: "966500123", balance: "1,250 ج.م", status: "له" },
  { name: "مورد الأغذية", phone: "966500456", balance: "980 ج.م", status: "عليه" },
  { name: "مورد المعدات", phone: "966500789", balance: "2,400 ج.م", status: "له" },
];

export default function SuppliersPage() {
  return (
    <SiteShell title="الموردون">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {suppliers.map((supplier) => (
          <article key={supplier.name} className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xl font-black text-white">{supplier.name}</p>
              <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                supplier.status === "له" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
              }`}>
                {supplier.status}
              </span>
            </div>

            <div className="mt-5 space-y-3 text-sm text-slate-300">
              <div className="flex items-center justify-between"><span>الهاتف</span><span className="text-white">{supplier.phone}</span></div>
              <div className="flex items-center justify-between"><span>الرصيد</span><span className="text-white">{supplier.balance}</span></div>
            </div>
          </article>
        ))}
      </div>
    </SiteShell>
  );
}
