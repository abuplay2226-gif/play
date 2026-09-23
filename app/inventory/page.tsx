import { SiteShell } from "@/components/site-shell";

const inventory = [
  { name: "كوكاكولا", stock: 12, min: 5, status: "مستقر" },
  { name: "قهوة عربي", stock: 4, min: 8, status: "تنبيه" },
  { name: "بيتزا صغيرة", stock: 7, min: 6, status: "مستقر" },
  { name: "مياه معدنية", stock: 25, min: 10, status: "مستقر" },
];

export default function InventoryPage() {
  return (
    <SiteShell title="المخزون">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {inventory.map((item) => (
          <article key={item.name} className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
            <div className="flex items-center justify-between">
              <p className="text-lg font-black text-white">{item.name}</p>
              <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                item.status === "تنبيه" ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"
              }`}>
                {item.status}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 text-sm text-slate-300">
              <div>
                <p>الرصيد</p>
                <p className="mt-2 text-2xl font-black text-white">{item.stock}</p>
              </div>
              <div>
                <p>حد الأمان</p>
                <p className="mt-2 text-2xl font-black text-white">{item.min}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </SiteShell>
  );
}
