import { revalidatePath } from "next/cache";

import { requireRole } from "@/app/actions/auth";
import { InventoryItemForm } from "@/components/inventory-item-form";
import { SiteShell } from "@/components/site-shell";
import { prisma } from "@/lib/prisma";

export default async function InventoryPage() {
  await requireRole(["ADMIN", "CASHIER", "STAFF"]);

  // 1. جلب البيانات بمرونة تامة
  const [allProducts, categories] = await Promise.all([
    prisma.product.findMany({
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      include: { products: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // جلب بنود الوصفات إن وجدت
  const recipeItems = ((await (prisma as any).recipeItem?.findMany({
    include: { ingredient: true },
  })) ?? []) as Array<{ id: string; productId: string; quantity: number; ingredient: { name: string; unit: string } }>;

  // فلترة المواد الخام عن المنتجات المباعة
  const products = allProducts.filter((p: any) => !p.isRawMaterial);
  const rawMaterials = allProducts.filter((p: any) => p.isRawMaterial);

  // تجهيز خيارات التصنيفات لمكون البحث الحي
  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
    subLabel: `${c.products?.length ?? 0} أصناف مسجلة`,
  }));

  // معالج حفظ الصنف الجديد في قاعدة البيانات
  async function handleCreateProduct(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const rawCategory = String(formData.get("categoryId") ?? "").trim();
    const isRawMaterial = formData.get("isRawMaterial") === "true";
    const unit = String(formData.get("unit") ?? (isRawMaterial ? "جرام" : "قطعة"));
    const sellPrice = isRawMaterial ? 0 : Number(formData.get("sellPrice") ?? 0);
    const costPrice = Number(formData.get("costPrice") ?? 0);
    const stockQuantity = Number(formData.get("stockQuantity") ?? 0);
    const minStockAlert = Number(formData.get("minStockAlert") ?? 5);

    if (!name) throw new Error("اسم الصنف مطلوب");

    // التحقق من التصنيف: هل هو موجود أم جديد كُتب بالبحث الحي؟
    let targetCategoryId = "";

    if (rawCategory.startsWith("NEW:")) {
      const newCategoryName = rawCategory.replace("NEW:", "").trim();
      if (newCategoryName) {
        const existingCat = await prisma.category.findFirst({
          where: { name: newCategoryName },
        });
        if (existingCat) {
          targetCategoryId = existingCat.id;
        } else {
          const createdCat = await prisma.category.create({
            data: { name: newCategoryName },
          });
          targetCategoryId = createdCat.id;
        }
      }
    } else {
      targetCategoryId = rawCategory;
    }

    if (!targetCategoryId) {
      throw new Error("يرجى اختيار تصنيف أو كتابة تصنيف جديد");
    }

    try {
      await (prisma as any).product.create({
        data: {
          name,
          categoryId: targetCategoryId,
          isRawMaterial,
          unit,
          sellPrice,
          costPrice,
          stockQuantity,
          minStockAlert,
        },
      });
    } catch {
      await prisma.product.create({
        data: {
          name,
          categoryId: targetCategoryId,
          sellPrice,
          costPrice,
          stockQuantity,
          minStockAlert,
        },
      });
    }

    revalidatePath("/inventory");
    revalidatePath("/pos");
  }

  return (
    <SiteShell title="إدارة المخزن والمواد الخام والوصفات">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.9fr]">
        {/* نموذج إضافة صنف أو مادة خام تفاعلي ذكي */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 h-fit">
          <h2 className="text-xl font-bold text-white">إضافة منتج أو مادة خام</h2>
          <p className="text-xs text-slate-400 mt-1">
            حدد نوع الصنف وسيقوم النموذج بتهيئة الحقول المناسبة له تلقائياً.
          </p>

          <InventoryItemForm
            categories={categoryOptions}
            action={handleCreateProduct}
          />
        </div>

        {/* عرض المواد الخام والمنتجات المباعة */}
        <div className="space-y-6">
          {/* قسم المواد الخام */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
            <h3 className="text-lg font-bold text-white mb-3">🧪 المواد الخام بالمخزن (تستهلك بالوصفات)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-right text-xs text-slate-200">
                <thead className="bg-slate-950/80 text-slate-400">
                  <tr>
                    <th className="px-3 py-2">المادة الخام</th>
                    <th className="px-3 py-2">الرصيد المتاح</th>
                    <th className="px-3 py-2">الوحدة</th>
                    <th className="px-3 py-2">التكلفة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {rawMaterials.map((rm: any) => (
                    <tr key={rm.id}>
                      <td className="px-3 py-2 font-bold text-white">{rm.name}</td>
                      <td className="px-3 py-2 font-mono text-emerald-400 font-bold">{rm.stockQuantity}</td>
                      <td className="px-3 py-2">{rm.unit ?? "جرام"}</td>
                      <td className="px-3 py-2 font-mono">{rm.costPrice} ج.م</td>
                    </tr>
                  ))}
                  {rawMaterials.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-500">
                        لا توجد مواد خام بعد (سجل البن أو السكر باختيار &quot;مادة خام للبوفيه&quot;).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* قسم المنتجات المباعة والوصفات */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
            <h3 className="text-lg font-bold text-white mb-3">☕ المنتجات والمشروبات المباعة للزبائن</h3>
            <div className="space-y-3">
              {products.map((p: any) => {
                const pRecipes = recipeItems.filter((r) => r.productId === p.id);
                return (
                  <div key={p.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white text-sm">{p.name}</p>
                        <p className="text-xs text-slate-400">
                          سعر البيع: <span className="text-emerald-400 font-bold">{p.sellPrice} ج.م</span>
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-sky-300">
                        {pRecipes.length > 0
                          ? `وصفة مقادير (${pRecipes.length} خامات)`
                          : `منتج مباشر (${p.stockQuantity} قطعة)`}
                      </span>
                    </div>

                    {/* مقادير الوصفة ونموذج الإضافة */}
                    <div className="mt-3 border-t border-slate-800/80 pt-3">
                      {pRecipes.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-2">
                          {pRecipes.map((r) => (
                            <span
                              key={r.id}
                              className="rounded-lg bg-sky-950/80 border border-sky-800 px-2 py-0.5 text-[11px] text-sky-200"
                            >
                              {r.ingredient.name}: {r.quantity} {r.ingredient.unit ?? "وحدة"}
                            </span>
                          ))}
                        </div>
                      )}

                      <form
                        action={async (formData) => {
                          "use server";
                          const ingredientId = String(formData.get("ingredientId") ?? "");
                          const quantity = Number(formData.get("quantity") ?? 0);
                          if (!ingredientId || quantity <= 0) return;

                          await (prisma as any).recipeItem?.create({
                            data: {
                              productId: p.id,
                              ingredientId,
                              quantity,
                            },
                          });

                          revalidatePath("/inventory");
                        }}
                        className="flex gap-2 items-center"
                      >
                        <select
                          name="ingredientId"
                          className="rounded-xl border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white outline-none flex-1"
                        >
                          <option value="">+ اربط خامة مستهلكة (بن، سكر، كوب)...</option>
                          {rawMaterials.map((rm: any) => (
                            <option key={rm.id} value={rm.id}>
                              {rm.name} ({rm.unit ?? "وحدة"})
                            </option>
                          ))}
                        </select>

                        <input
                          name="quantity"
                          type="number"
                          step="any"
                          placeholder="الكمية لكل كوب"
                          className="w-24 rounded-xl border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white outline-none font-mono"
                        />

                        <button
                          type="submit"
                          disabled={rawMaterials.length === 0}
                          className="rounded-xl bg-sky-500 px-3 py-1 text-xs font-bold text-slate-950 hover:bg-sky-400 disabled:opacity-40"
                        >
                          إضافة للوصفة
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}