import Link from "next/link";

import { requireRole } from "@/app/actions/auth";
import { createOrder } from "@/app/actions/pos";
import { QuickSaleButton } from "@/components/quick-sale-button";
import { SearchableSelect } from "@/components/searchable-select";
import { SiteShell } from "@/components/site-shell";
import { prisma } from "@/lib/prisma";

export default async function PosPage() {
  await requireRole(["ADMIN", "CASHIER", "STAFF"]);

  const [categories, products, activeSessions, openShift, cashDrawers] = await Promise.all([
    prisma.category.findMany({
      include: { products: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { isRawMaterial: false },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    prisma.deviceSession.findMany({
      where: { status: { in: ["ACTIVE", "PAUSED"] } },
      include: { device: true, customer: true },
      orderBy: { startTime: "desc" },
    }),
    prisma.shift.findFirst({
      where: { status: "OPEN" },
      include: { cashDrawer: true },
    }),
    prisma.cashDrawer.findMany({ orderBy: { name: "asc" } }),
  ]);

  const deviceOptions = activeSessions.map((s) => ({
    value: s.id,
    label: `🎮 ${s.device.name}`,
    subLabel: `العميل: ${s.customer?.name ?? "عابر"} · بدأ: ${new Date(s.startTime).toLocaleTimeString("ar-EG")}`,
  }));

  const productOptions = products
    .filter((p) => p.stockQuantity > 0)
    .map((p) => ({
      value: p.id,
      label: p.name,
      subLabel: `${p.category.name} · المتاح: ${p.stockQuantity} قطعة`,
      badge: `${p.sellPrice} ج.م`,
    }));

  return (
    <SiteShell title="نقطة البيع (POS)">
      {!openShift ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-200">
          ⚠️ لا يمكن تسجيل طلبات بدون وردية مفتوحة. الرجاء{" "}
          <Link href="/shifts" className="font-bold underline text-white">
            فتح وردية من هنا
          </Link>
          .
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
          {/* قسم المنتجات والبيع السريع مع التأكيد واختيار الخزينة */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">قائمة منتجات الكافيه</h2>
                <p className="text-xs text-slate-400 mt-1">
                  الخزينة الافتراضية للوردية:{" "}
                  <span className="text-emerald-400 font-bold">{openShift.cashDrawer.name}</span>
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {products.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[11px] text-sky-400 font-bold">
                      {item.category.name}
                    </span>
                    <p className="text-base font-bold text-white mt-1">{item.name}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-slate-400">السعر</span>
                      <span className="text-base font-black text-emerald-400">
                        {item.sellPrice} ج.م
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs text-slate-400">المخزون</span>
                      <span
                        className={`text-xs font-bold ${
                          item.stockQuantity <= item.minStockAlert
                            ? "text-amber-400"
                            : "text-slate-300"
                        }`}
                      >
                        {item.stockQuantity} قطعة
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <QuickSaleButton
                      product={{
                        id: item.id,
                        name: item.name,
                        sellPrice: item.sellPrice,
                        stockQuantity: item.stockQuantity,
                      }}
                      shiftId={openShift.id}
                      cashDrawers={cashDrawers}
                      defaultDrawerId={openShift.cashDrawerId}
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* قسم إضافة الطلب على جهاز نشط مع البحث الحي */}
          <aside className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 h-fit">
            <h2 className="text-xl font-bold text-white">إضافة طلب لحساب جهاز</h2>
            <p className="text-xs text-slate-400">
              تنزيل المشاريب على الجلسة ليتم دفعها مجمعة مع وقت اللعب عند الانتهاء.
            </p>

            <form
              action={async (formData) => {
                "use server";
                const productId = String(formData.get("productId") ?? "");
                const sessionId = String(formData.get("sessionId") ?? "");
                const quantity = Number(formData.get("quantity") ?? 1);

                if (!productId || !sessionId) return;

                await createOrder({
                  shiftId: openShift.id,
                  sessionId,
                  items: [{ productId, quantity }],
                });
              }}
              className="mt-5 space-y-4"
            >
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-300">
                  الجهاز النشط:
                </label>
                <SearchableSelect
                  name="sessionId"
                  options={deviceOptions}
                  placeholder="-- ابحث أو اختر جهاز شغال --"
                  searchPlaceholder="اكتب اسم الجهاز أو العميل..."
                  emptyText="لا توجد أجهزة مطابقة تعمل حالياً"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-slate-300">
                  المنتج المطلوب:
                </label>
                <SearchableSelect
                  name="productId"
                  options={productOptions}
                  placeholder="-- ابحث أو اختر المشروب/الصنف --"
                  searchPlaceholder="اكتب اسم الصنف (مثلاً: قهوة، شاي، ميرندا)..."
                  emptyText="لا توجد منتجات مطابقة في المخزن"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-slate-300">الكمية:</label>
                <input
                  name="quantity"
                  type="number"
                  defaultValue={1}
                  min={1}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-sky-400 font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={activeSessions.length === 0}
                className="w-full rounded-full bg-emerald-500 py-3 text-xs font-black text-slate-950 transition hover:bg-emerald-400 disabled:opacity-40"
              >
                تنزيل الطلب على حساب الجهاز
              </button>
            </form>
          </aside>
        </div>
      )}
    </SiteShell>
  );
}