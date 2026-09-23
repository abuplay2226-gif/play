import { SiteShell } from "@/components/site-shell";

const menu = [
  { name: "كوكاكولا 500ml", price: "24 ج.م", stock: "12" },
  { name: "قهوة عربي", price: "18 ج.م", stock: "20" },
  { name: "بيتزا صغيرة", price: "58 ج.م", stock: "7" },
  { name: "شاورما لحم", price: "70 ج.م", stock: "9" },
  { name: "سندويتش تشيز", price: "42 ج.م", stock: "11" },
  { name: "مياه معدنية", price: "12 ج.م", stock: "25" },
];

export default function PosPage() {
  return (
    <SiteShell title="نقاط البيع">
      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">منتجات الكافيه</h2>
            <button className="rounded-full border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500">
              إضافة منتج
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {menu.map((item) => (
              <article key={item.name} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-lg font-bold text-white">{item.name}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-slate-400">السعر</span>
                  <span className="text-lg font-black text-emerald-300">{item.price}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-slate-400">المخزون</span>
                  <span className="text-sm font-bold text-sky-300">{item.stock}</span>
                </div>
                <button className="mt-5 w-full rounded-full bg-sky-500 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-sky-400">
                  إضافة للسلة
                </button>
              </article>
            ))}
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
          <h2 className="text-xl font-bold text-white">سلة الطلب</h2>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
              <div>
                <p className="font-bold text-white">قهوة عربي</p>
                <p className="text-xs text-slate-400">الكمية: 2</p>
              </div>
              <span className="font-black text-emerald-300">36 ج.م</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
              <div>
                <p className="font-bold text-white">كوكاكولا</p>
                <p className="text-xs text-slate-400">الكمية: 1</p>
              </div>
              <span className="font-black text-emerald-300">24 ج.م</span>
            </div>
          </div>

          <div className="mt-6 space-y-3 border-t border-slate-800 pt-4 text-sm text-slate-300">
            <div className="flex items-center justify-between"><span>الإجمالي</span><span className="text-white font-bold">60 ج.م</span></div>
            <div className="flex items-center justify-between"><span>الضريبة</span><span className="text-white font-bold">0 ج.م</span></div>
            <div className="flex items-center justify-between"><span>المجموع</span><span className="text-xl font-black text-emerald-300">60 ج.م</span></div>
          </div>

          <button className="mt-6 w-full rounded-full bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 hover:bg-emerald-400">
            تأكيد الدفع
          </button>
        </aside>
      </div>
    </SiteShell>
  );
}
