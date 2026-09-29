"use client";

import { useMemo, useState } from "react";
import { SearchableSelect } from "@/components/searchable-select";

interface CategoryOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface InventoryItemFormProps {
  categories: CategoryOption[];
  action: (formData: FormData) => Promise<void>;
}

export function InventoryItemForm({ categories, action }: InventoryItemFormProps) {
  // حالة التحكم بنوع الصنف (مادة خام أو منتج للبيع)
  const [isRawMaterial, setIsRawMaterial] = useState<boolean>(false);

  // بيانات حاسبة العبوة التلقائية للمواد الخام
  const [packagePrice, setPackagePrice] = useState<number | "">(""); // سعر شراء الكيس
  const [packageSize, setPackageSize] = useState<number | "">(1000);   // وزن أو سعة الكيس (افتراضي 1000 جم)
  const [packageCount, setPackageCount] = useState<number | "">(1);    // عدد الأكياس المتوفرة
  const [unit, setUnit] = useState<string>("جرام");

  // الحسبة الذكية للجرام وإجمالي المخزون لحظياً
  const calculatedCostPerUnit = useMemo(() => {
    const price = Number(packagePrice) || 0;
    const size = Number(packageSize) || 0;
    if (price <= 0 || size <= 0) return 0;
    return Number((price / size).toFixed(4));
  }, [packagePrice, packageSize]);

  const calculatedTotalStock = useMemo(() => {
    const count = Number(packageCount) || 0;
    const size = Number(packageSize) || 0;
    return count * size;
  }, [packageCount, packageSize]);

  return (
    <form action={action} className="mt-5 space-y-4">
      {/* اسم الصنف */}
      <div>
        <label className="mb-1 block text-xs font-bold text-slate-300">اسم الصنف:</label>
        <input
          name="name"
          placeholder={
            isRawMaterial
              ? "مثال: بن تركي محوج / سكر أبيض / أكواب ورقية 8oz"
              : "مثال: فنجان قهوة / كانز بيبسي / شيبس"
          }
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
          required
        />
      </div>

      {/* حقل التصنيف مع البحث الحي والإضافة المباشرة */}
      <div>
        <label className="mb-1 block text-xs font-bold text-slate-300">
          التصنيف: (اختر بالبحث أو اكتب جديداً)
        </label>
        <SearchableSelect
          name="categoryId"
          options={categories}
          placeholder="-- اختر تصنيفاً أو ابحث واكتب جديداً --"
          searchPlaceholder="اكتب اسم التصنيف (مثلاً: خامات، مشروبات، سناكس)..."
          emptyText="لا يوجد تصنيف مطابق - اضغط بالزر أعلاه لإنشائه"
          allowCreate={true}
          required
        />
      </div>

      {/* نوع الصنف: منتج مباع أو مادة خام */}
      <div className="rounded-2xl bg-slate-950/60 p-3.5 border border-slate-800 space-y-3">
        <label className="block text-xs font-bold text-sky-300">نوع الصنف وتوظيفه:</label>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setIsRawMaterial(false)}
            className={`p-2.5 rounded-xl border text-center font-bold transition flex items-center justify-center gap-2 ${
              !isRawMaterial
                ? "border-sky-400 bg-sky-500/20 text-white shadow-lg shadow-sky-500/10"
                : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
            }`}
          >
            <span>🛍️</span>
            <span>منتج يباع للعميل</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRawMaterial(true)}
            className={`p-2.5 rounded-xl border text-center font-bold transition flex items-center justify-center gap-2 ${
              isRawMaterial
                ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-lg shadow-emerald-500/10"
                : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
            }`}
          >
            <span>🧪</span>
            <span>مادة خام للبوفيه</span>
          </button>
        </div>

        {/* حقل مخفي لتمرير القيمة للـ Server Action */}
        <input type="hidden" name="isRawMaterial" value={String(isRawMaterial)} />
      </div>

      {/* نموذج المادة الخام (حاسبة الكيس والعبوة الذكية) */}
      {isRawMaterial ? (
        <div className="rounded-2xl bg-slate-950/70 p-4 border border-emerald-500/30 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-emerald-400">
              📦 بيانات شراء الكيس / العبوة:
            </span>
            <span className="text-[11px] text-slate-400">النظام يحسب سعر الجرام آلياً</span>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">وحدة القياس للمحتوى:</label>
            <select
              name="unit"
              value={unit}
              onChange={(e) => {
                const u = e.target.value;
                setUnit(u);
                if (u === "جرام" || u === "ملي") setPackageSize(1000);
                if (u === "قطعة") setPackageSize(50);
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-emerald-300 font-bold outline-none"
            >
              <option value="جرام">جرام (بُن، سكر، شاي، مسحوق شوكولاتة)</option>
              <option value="قطعة">قطعة (أكواب ورقية، أغطية، شاليموه)</option>
              <option value="ملي">ملي / لتر (حليب، عصائر، سيرب نكهات)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] text-slate-300">
                سعر شراء الكيس / العبوة (ج.م):
              </label>
              <input
                type="number"
                step="any"
                value={packagePrice}
                onChange={(e) => setPackagePrice(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="مثال: 450"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-emerald-400 font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-slate-300">
                وزن أو عدد الكيس الواحد ({unit}):
              </label>
              <input
                type="number"
                step="any"
                value={packageSize}
                onChange={(e) => setPackageSize(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="1000"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-emerald-400 font-mono font-bold"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-slate-300">
              كم كيس / عبوة موجودة عندك حالياً؟
            </label>
            <input
              type="number"
              step="any"
              value={packageCount}
              onChange={(e) => setPackageCount(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="مثال: 2"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-emerald-400 font-mono font-bold"
              required
            />
          </div>

          {/* بطاقة النتيجة الحسابية التلقائية */}
          <div className="rounded-xl bg-slate-900/90 border border-emerald-500/20 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span>💡 تكلفة الـ ({unit}) الواحد محسوبة:</span>
              <span className="font-mono font-black text-amber-300 text-sm">
                {calculatedCostPerUnit} ج.م / {unit}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300 border-t border-slate-800 pt-1.5">
              <span>📦 إجمالي الرصيد الذي سيدخل المخزن:</span>
              <span className="font-mono font-black text-emerald-400 text-sm">
                {calculatedTotalStock} {unit}
              </span>
            </div>
          </div>

          {/* حقول مخفية تحمل القيم المحسوبة آلياً لترسل لقاعدة البيانات مباشرة */}
          <input type="hidden" name="costPrice" value={calculatedCostPerUnit} />
          <input type="hidden" name="stockQuantity" value={calculatedTotalStock} />
          <input type="hidden" name="sellPrice" value="0" />

          <div>
            <label className="mb-1 block text-[11px] text-slate-400">
              نبهني عند وصول المخزن لأقل من ({unit}):
            </label>
            <input
              name="minStockAlert"
              type="number"
              step="any"
              defaultValue={unit === "قطعة" ? 20 : 200}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none font-mono"
              required
            />
          </div>
        </div>
      ) : (
        /* نموذج المنتج العادي المباع بالقطعة */
        <div className="space-y-4 animate-in fade-in duration-200">
          <input type="hidden" name="unit" value="قطعة" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-300">
                سعر البيع للعميل (ج.م):
              </label>
              <input
                name="sellPrice"
                type="number"
                step="any"
                placeholder="مثال: 25"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-sky-400 font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-300">
                سعر التكلفة (ج.م):
              </label>
              <input
                name="costPrice"
                type="number"
                step="any"
                placeholder="مثال: 14"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-sky-400 font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-300">
                الكمية المتوفرة (قطع):
              </label>
              <input
                name="stockQuantity"
                type="number"
                step="any"
                defaultValue={0}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-sky-400 font-mono"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-300">
                حد تنبيه النواقص:
              </label>
              <input
                name="minStockAlert"
                type="number"
                step="any"
                defaultValue={5}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-sky-400 font-mono"
                required
              />
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        className="w-full rounded-full bg-emerald-500 py-3 text-xs font-black text-slate-950 hover:bg-emerald-400 transition shadow-lg shadow-emerald-950/20"
      >
        {isRawMaterial ? "+ حفظ المادة الخام بالمخزن" : "+ حفظ المنتج في قائمة البيع"}
      </button>
    </form>
  );
}