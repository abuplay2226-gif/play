"use client";

import { useMemo, useState, useTransition } from "react";
import { createPurchaseInvoice, createSupplier, quickCreateFullProduct } from "@/app/actions/suppliers";
import { SearchableSelect } from "@/components/searchable-select";

interface Option {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
}

interface InvoiceLine {
  id: string;
  productId: string;
  quantity: number | "";
  unitCost: number | "";
}

interface PurchaseInvoiceFormProps {
  initialSuppliers: Option[];
  initialProducts: any[];
  categories: { id: string; name: string }[];
  cashDrawers: { id: string; name: string; balance: number }[];
  openShiftId?: string;
  defaultDrawerId?: string;
}

export function PurchaseInvoiceForm({
  initialSuppliers,
  initialProducts,
  categories,
  cashDrawers,
  openShiftId,
  defaultDrawerId,
}: PurchaseInvoiceFormProps) {
  const [suppliers, setSuppliers] = useState<Option[]>(initialSuppliers);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [products, setProducts] = useState(initialProducts);

  // جدول بنود الفاتورة
  const [lines, setLines] = useState<InvoiceLine[]>([
    { id: "line-1", productId: "", quantity: "", unitCost: "" },
  ]);

  // السداد الافتراضي: آجل
  const [paymentType, setPaymentType] = useState<"DEBT" | "CASH" | "PARTIAL">("DEBT");
  const [partialPaid, setPartialPaid] = useState<number | "">("");
  const [selectedDrawerId, setSelectedDrawerId] = useState(defaultDrawerId || cashDrawers[0]?.id || "");

  const [isSubmitting, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  // نافذة تعريف الصنف الكامل
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTargetLineId, setModalTargetLineId] = useState<string>("line-1");
  const [modalInitialName, setModalInitialName] = useState("");
  const [modalIsRaw, setModalIsRaw] = useState(false);
  const [modalCategoryId, setModalCategoryId] = useState(categories[0]?.id || "");
  const [modalNewCatName, setModalNewCatName] = useState("");
  const [modalUnit, setModalUnit] = useState("جرام");
  const [modalSellPrice, setModalSellPrice] = useState<number | "">("");
  const [modalCostPrice, setModalCostPrice] = useState<number | "">("");
  const [modalPkgPrice, setModalPkgPrice] = useState<number | "">("");
  const [modalPkgSize, setModalPkgSize] = useState<number | "">(1000);

  const calculatedGramCost = useMemo(() => {
    const p = Number(modalPkgPrice) || 0;
    const s = Number(modalPkgSize) || 0;
    return s > 0 ? Number((p / s).toFixed(4)) : 0;
  }, [modalPkgPrice, modalPkgSize]);

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p.id,
        label: p.name,
        subLabel: p.isRawMaterial ? `خامة (${p.unit ?? "وحدة"})` : "منتج للبيع",
        badge: `المخزون: ${p.stockQuantity}`,
      })),
    [products]
  );

  // دالة إنشاء سطر جديد مع فتح البحث في السطر الجديد تلقائياً وبشكل فوري
  const addNewLineAndFocus = () => {
    const newId = `line-${Date.now()}`;
    setLines((prev) => [
      ...prev,
      { id: newId, productId: "", quantity: "", unitCost: "" },
    ]);

    // فتح قائمة الصنف في السطر الجديد فور إنشائه
    setTimeout(() => {
      const triggerBtn = document.getElementById(`prod-btn-${newId}`);
      if (triggerBtn) {
        triggerBtn.focus();
        triggerBtn.click();
      }
    }, 50);
  };

  const removeLine = (id: string) => {
    if (lines.length === 1) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLine = (id: string, field: keyof InvoiceLine, value: any) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        if (field === "productId") {
          const prod = products.find((p) => p.id === value);
          if (prod && prod.costPrice > 0 && !updated.unitCost) {
            updated.unitCost = prod.costPrice;
          }
        }
        return updated;
      })
    );
  };

  // إجمالي الفاتورة من كل الأسطر
  const invoiceTotal = useMemo(() => {
    return lines.reduce((sum, l) => {
      const q = Number(l.quantity) || 0;
      const c = Number(l.unitCost) || 0;
      return sum + q * c;
    }, 0);
  }, [lines]);

  const finalPaidAmount = useMemo(() => {
    if (paymentType === "DEBT") return 0;
    if (paymentType === "CASH") return invoiceTotal;
    return Number(partialPaid) || 0;
  }, [paymentType, invoiceTotal, partialPaid]);

  const remainingDebt = Math.max(0, Number((invoiceTotal - finalPaidAmount).toFixed(2)));

  // فتح نافذة تعريف صنف مخصص
  const handleOpenModalForLine = (lineId: string, typedName?: string) => {
    setModalTargetLineId(lineId);
    setModalInitialName(typedName || "");
    setIsModalOpen(true);
  };

  // تسجيل مورد جديد فوراً
  const handleQuickCreateSupplier = async (supplierName: string) => {
    try {
      const created = await createSupplier({ name: supplierName });
      const newOption: Option = {
        value: created.id,
        label: created.name,
        subLabel: "المستحق له: 0 ج.م · بدون هاتف",
        badge: "جديد ✨",
      };
      setSuppliers((prev) => [newOption, ...prev]);
      setSelectedSupplierId(created.id);
    } catch (err: any) {
      setErrorMsg(err.message || "فشل تسجيل المورد");
    }
  };

  // حفظ الصنف الجديد من النافذة وتعيينه للسطر
  const handleSaveModalProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      const finalCost = modalIsRaw ? calculatedGramCost : Number(modalCostPrice) || 0;
      const created = await quickCreateFullProduct({
        name: modalInitialName,
        categoryId: modalCategoryId,
        newCategoryName: modalNewCatName,
        isRawMaterial: modalIsRaw,
        unit: modalIsRaw ? modalUnit : "قطعة",
        sellPrice: modalIsRaw ? 0 : Number(modalSellPrice) || 0,
        costPrice: finalCost,
        minStockAlert: modalIsRaw ? 200 : 5,
      });

      setProducts((prev) => [created, ...prev]);
      updateLine(modalTargetLineId, "productId", created.id);
      if (finalCost > 0) updateLine(modalTargetLineId, "unitCost", finalCost);
      setIsModalOpen(false);

      // نقل التركيز فوراً لحقل الكمية في نفس السطر
      setTimeout(() => {
        document.getElementById(`qty-${modalTargetLineId}`)?.focus();
      }, 50);
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ أثناء حفظ الصنف");
    }
  };

  // حفظ الفاتورة
  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!selectedSupplierId) {
      setErrorMsg("يرجى اختيار المورد أولاً");
      return;
    }

    const validItems = lines
      .filter((l) => l.productId && Number(l.quantity) > 0)
      .map((l) => ({
        productId: l.productId,
        quantity: Number(l.quantity),
        unitCost: Number(l.unitCost) || 0,
      }));

    if (validItems.length === 0) {
      setErrorMsg("يرجى إضافة صنف واحد على الأقل مع تحديد الكمية وسعر الشراء");
      return;
    }

    startTransition(async () => {
      try {
        await createPurchaseInvoice({
          supplierId: selectedSupplierId,
          shiftId: openShiftId,
          targetCashDrawerId: paymentType === "DEBT" ? undefined : selectedDrawerId,
          paidAmount: finalPaidAmount,
          items: validItems,
        });

        setLines([{ id: `line-${Date.now()}`, productId: "", quantity: "", unitCost: "" }]);
        setPaymentType("DEBT");
        setPartialPaid("");
      } catch (err: any) {
        setErrorMsg(err.message || "فشل تسجيل الفاتورة");
      }
    });
  };

  return (
    <>
      <form onSubmit={handleSaveInvoice} className="space-y-5">
        {errorMsg && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/15 p-3 text-xs text-rose-300 font-bold">
            {errorMsg}
          </div>
        )}

        {/* 1. المورد */}
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-300">
            المورد: (ابحث أو اكتب لايف لإضافة مورد جديد)
          </label>
          <SearchableSelect
            name="supplierId"
            options={suppliers}
            value={selectedSupplierId}
            onChange={(val) => setSelectedSupplierId(val)}
            placeholder="-- ابحث عن مورد أو اكتب جديداً --"
            searchPlaceholder="اكتب اسم المورد للبحث أو الإضافة..."
            emptyText="لا يوجد مورد مطابق بهذا الاسم"
            allowCreate={true}
            createLabel="كمورد جديد"
            onCreateClick={(typedName) => handleQuickCreateSupplier(typedName)}
            required
          />
        </div>

        {/* 2. جدول بنود الفاتورة مع التنقل الكامل بالـ Enter */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <h3 className="text-xs font-bold text-white">📦 أصناف الفاتورة:</h3>
              <p className="text-[10px] text-emerald-400 font-medium">
                ⚡ اكتب واضغط Enter في كل خانة وسينشأ سطر جديد فورياً!
              </p>
            </div>
            <button
              type="button"
              onClick={addNewLineAndFocus}
              className="rounded-xl bg-sky-500/20 border border-sky-500/40 px-3 py-1.5 text-xs font-bold text-sky-300 hover:bg-sky-500/30 transition"
            >
              + إضافة سطر صنف
            </button>
          </div>

          <div className="space-y-2.5">
            {lines.map((line, idx) => {
              const lineSubtotal = (Number(line.quantity) || 0) * (Number(line.unitCost) || 0);

              return (
                <div
                  key={line.id}
                  className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-2 text-xs animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-400">سطر #{idx + 1}</span>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="text-slate-500 hover:text-rose-400 transition text-[11px]"
                      >
                        🗑️ حذف السطر
                      </button>
                    )}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[1.8fr_1fr_1fr_1fr] items-end">
                    {/* حقل الصنف (عند الاختيار ينقل المؤشر للكمية) */}
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">الصنف:</label>
                      <SearchableSelect
                        id={`prod-btn-${line.id}`}
                        options={productOptions}
                        value={line.productId}
                        onChange={(val) => updateLine(line.id, "productId", val)}
                        onSelect={() => {
                          // نقل المؤشر تلقائياً لخانة الكمية فور اختيار الصنف
                          setTimeout(() => {
                            document.getElementById(`qty-${line.id}`)?.focus();
                          }, 50);
                        }}
                        placeholder="-- اختر أو ابحث عن صنف --"
                        searchPlaceholder="اكتب اسم الصنف..."
                        emptyText="صنف غير موجود - اضغط بالزر لإنشائه"
                        allowCreate={true}
                        createLabel="كصنف جديد"
                        onCreateClick={(typedName) => handleOpenModalForLine(line.id, typedName)}
                        required
                      />
                    </div>

                    {/* حقل الكمية (عند الضغط على Enter ينقل المؤشر للسعر) */}
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">الكمية:</label>
                      <input
                        id={`qty-${line.id}`}
                        type="number"
                        step="any"
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(
                            line.id,
                            "quantity",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            document.getElementById(`cost-${line.id}`)?.focus();
                          }
                        }}
                        placeholder="الكمية (Enter)"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white outline-none focus:border-sky-400 font-mono"
                        required
                      />
                    </div>

                    {/* حقل سعر الشراء (عند الضغط على Enter ينشأ سطر جديد وينقل المؤشر للصنف الجديد) */}
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">سعر الشراء:</label>
                      <input
                        id={`cost-${line.id}`}
                        type="number"
                        step="any"
                        value={line.unitCost}
                        onChange={(e) =>
                          updateLine(
                            line.id,
                            "unitCost",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const costVal =
                              e.currentTarget.value !== ""
                                ? Number(e.currentTarget.value)
                                : Number(line.unitCost);
                            updateLine(line.id, "unitCost", costVal);

                            // إذا كانت بيانات السطر ممتلئة ينشئ سطراً جديداً وينقل المؤشر إليه فوراً
                            if (line.productId && Number(line.quantity) > 0) {
                              addNewLineAndFocus();
                            }
                          }
                        }}
                        placeholder="السعر (Enter)"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white outline-none focus:border-sky-400 font-mono"
                        required
                      />
                    </div>

                    {/* الإجمالي */}
                    <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800 text-left">
                      <span className="text-[10px] text-slate-400 block text-right">الإجمالي:</span>
                      <span className="font-mono font-bold text-white text-xs">
                        {lineSubtotal.toFixed(2)} ج.م
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. خيارات السداد: آجل (افتراضي) / نقدي / دفع جزئي */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
          <label className="block text-xs font-bold text-sky-300">طريقة سداد الفاتورة:</label>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setPaymentType("DEBT")}
              className={`py-2.5 rounded-xl border font-bold transition flex items-center justify-center gap-1.5 ${
                paymentType === "DEBT"
                  ? "border-amber-400 bg-amber-400/20 text-amber-300 shadow-lg shadow-amber-500/10"
                  : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
              }`}
            >
              <span>⏳</span>
              <span>فاتورة آجلة (على الحساب)</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentType("CASH")}
              className={`py-2.5 rounded-xl border font-bold transition flex items-center justify-center gap-1.5 ${
                paymentType === "CASH"
                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-lg shadow-emerald-500/10"
                  : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
              }`}
            >
              <span>💵</span>
              <span>فاتورة نقدية (مسددة كاش)</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentType("PARTIAL")}
              className={`py-2.5 rounded-xl border font-bold transition flex items-center justify-center gap-1.5 ${
                paymentType === "PARTIAL"
                  ? "border-sky-400 bg-sky-500/20 text-white shadow-lg shadow-sky-500/10"
                  : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
              }`}
            >
              <span>🔀</span>
              <span>دفع جزئي (دفعة كاش)</span>
            </button>
          </div>

          {paymentType === "PARTIAL" && (
            <div className="pt-1 animate-in fade-in duration-200">
              <label className="block text-xs font-bold text-slate-300 mb-1">
                المبلغ المسدد كاش الآن من الفاتورة:
              </label>
              <input
                type="number"
                step="any"
                value={partialPaid}
                onChange={(e) =>
                  setPartialPaid(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="أدخل المبلغ المدفوع كاش..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-emerald-400 font-mono font-bold outline-none focus:border-emerald-400"
                required
              />
            </div>
          )}

          {paymentType !== "DEBT" ? (
            <div className="rounded-xl border border-emerald-500/30 bg-slate-900/90 p-3 space-y-1.5 animate-in fade-in duration-200">
              <label className="block text-xs font-bold text-emerald-400">
                🏦 الخزينة التي سيخرج منها الكاش ({finalPaidAmount.toFixed(2)} ج.م):
              </label>
              <select
                value={selectedDrawerId}
                onChange={(e) => setSelectedDrawerId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-emerald-300 font-bold outline-none focus:border-sky-400"
              >
                {cashDrawers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} (رصيدها: {d.balance} ج.م){" "}
                    {d.id === defaultDrawerId ? "⭐ (خزينة الوردية - افتراضي)" : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-200 flex items-center gap-2">
              <span>ℹ️</span>
              <span>
                الفاتورة آجلة بالكامل: سيتم ترحيل إجمالي الفاتورة ({invoiceTotal.toFixed(2)} ج.م) كدين مستحق للمورد دون المساس بأي خزينة.
              </span>
            </div>
          )}
        </div>

        {/* 4. الإجماليات وزر الحفظ والتوريد */}
        <div className="rounded-2xl bg-slate-950/40 p-3.5 border border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-300">
            <span>إجمالي الفاتورة المحسوب:</span>
            <span className="font-mono text-base font-black text-white">
              {invoiceTotal.toFixed(2)} ج.م
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-300">
            <span>المدفوع كاش الآن:</span>
            <span className="font-mono font-bold text-emerald-400">
              {finalPaidAmount.toFixed(2)} ج.م
            </span>
          </div>

          <div className="flex justify-between items-center text-rose-400 font-bold border-t border-slate-800/80 pt-2">
            <span>المتبقي آجل (دين للمورد في حسابه):</span>
            <span className="font-mono text-sm">{remainingDebt.toFixed(2)} ج.م</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || invoiceTotal <= 0}
          className="w-full rounded-full bg-emerald-500 py-3 text-xs font-black text-slate-950 hover:bg-emerald-400 transition shadow-lg shadow-emerald-950/20 disabled:opacity-40"
        >
          {isSubmitting ? "جاري توريد الأصناف والحفظ..." : `+ توريد بنود الفاتورة (${lines.length} صنف) للمخزن`}
        </button>
      </form>

      {/* المودال السريع لتعريف الصنف الكامل */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute left-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              ✕
            </button>

            <div className="border-b border-slate-800 pb-3 mb-4">
              <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-bold text-sky-300">
                تعريف صنف جديد
              </span>
              <h3 className="mt-2 text-xl font-black text-white">إضافة الصنف ومواصفاته للمخزن</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                بعد الحفظ سيُدرج الصنف فوراً في سطر الفاتورة المحدد.
              </p>
            </div>

            <form onSubmit={handleSaveModalProduct} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-300">اسم الصنف:</label>
                <input
                  value={modalInitialName}
                  onChange={(e) => setModalInitialName(e.target.value)}
                  placeholder="مثال: لب سوبر / بن محوج / كانز شويبس"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-300">التصنيف:</label>
                <select
                  value={modalCategoryId}
                  onChange={(e) => setModalCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  value={modalNewCatName}
                  onChange={(e) => setModalNewCatName(e.target.value)}
                  placeholder="أو اكتب تصنيفاً جديداً هنا..."
                  className="mt-1.5 w-full rounded-xl border border-dashed border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs text-emerald-300 placeholder-slate-500 outline-none"
                />
              </div>

              <div className="rounded-2xl bg-slate-950/60 p-3 border border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-sky-300">نوع الصنف:</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setModalIsRaw(false)}
                    className={`py-2 rounded-xl border font-bold transition ${
                      !modalIsRaw
                        ? "border-sky-400 bg-sky-500/20 text-white"
                        : "border-slate-800 bg-slate-900 text-slate-400"
                    }`}
                  >
                    🛍️ منتج يباع للعميل
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalIsRaw(true)}
                    className={`py-2 rounded-xl border font-bold transition ${
                      modalIsRaw
                        ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                        : "border-slate-800 bg-slate-900 text-slate-400"
                    }`}
                  >
                    🧪 مادة خام للبوفيه
                  </button>
                </div>
              </div>

              {modalIsRaw ? (
                <div className="rounded-2xl bg-slate-950/70 p-3.5 border border-emerald-500/30 space-y-2.5 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">سعر الكيس/العبوة:</label>
                      <input
                        type="number"
                        step="any"
                        value={modalPkgPrice}
                        onChange={(e) =>
                          setModalPkgPrice(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        placeholder="مثال: 450"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">وزن أو محتوى الكيس:</label>
                      <input
                        type="number"
                        step="any"
                        value={modalPkgSize}
                        onChange={(e) =>
                          setModalPkgSize(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        placeholder="1000"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">وحدة القياس:</label>
                    <select
                      value={modalUnit}
                      onChange={(e) => setModalUnit(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-emerald-300 font-bold outline-none"
                    >
                      <option value="جرام">جرام (بُن، سكر، لب، شاي)</option>
                      <option value="قطعة">قطعة (أكواب ورقية، أغطية)</option>
                      <option value="ملي">ملي / لتر (حليب، عصائر)</option>
                    </select>
                  </div>

                  <div className="rounded-xl bg-slate-900 p-2.5 border border-emerald-500/20 flex justify-between items-center text-xs">
                    <span className="text-slate-300">سعر الـ ({modalUnit}) الواحد المحسوب:</span>
                    <span className="font-mono font-bold text-amber-300">{calculatedGramCost} ج.م</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">سعر البيع للعميل (ج.م):</label>
                    <input
                      type="number"
                      step="any"
                      value={modalSellPrice}
                      onChange={(e) =>
                        setModalSellPrice(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      placeholder="مثال: 25"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none font-mono font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">سعر التكلفة (ج.م):</label>
                    <input
                      type="number"
                      step="any"
                      value={modalCostPrice}
                      onChange={(e) =>
                        setModalCostPrice(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      placeholder="مثال: 15"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none font-mono"
                      required
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-full bg-emerald-500 py-3 text-xs font-black text-slate-950 hover:bg-emerald-400 transition shadow-lg shadow-emerald-950/20"
              >
                + حفظ وإدراج الصنف في السطر فوراً
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}