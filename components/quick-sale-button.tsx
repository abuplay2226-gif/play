"use client";

import { useState, useTransition } from "react";
import { createOrder } from "@/app/actions/pos";

interface CashDrawerOption {
  id: string;
  name: string;
  balance: number;
}

interface QuickSaleButtonProps {
  product: {
    id: string;
    name: string;
    sellPrice: number;
    stockQuantity: number;
  };
  shiftId: string;
  cashDrawers: CashDrawerOption[];
  defaultDrawerId: string;
}

export function QuickSaleButton({
  product,
  shiftId,
  cashDrawers,
  defaultDrawerId,
}: QuickSaleButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedDrawerId, setSelectedDrawerId] = useState(defaultDrawerId || cashDrawers[0]?.id || "");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const handleOpen = () => {
    setQuantity(1);
    setSelectedDrawerId(defaultDrawerId || cashDrawers[0]?.id || "");
    setErrorMsg("");
    setIsOpen(true);
  };

  const totalAmount = (quantity * product.sellPrice).toFixed(2);

  const handleConfirmSale = () => {
    setErrorMsg("");
    startTransition(async () => {
      try {
        await createOrder({
          shiftId,
          paymentMethod: "CASH",
          targetCashDrawerId: selectedDrawerId,
          items: [{ productId: product.id, quantity }],
        });
        setIsOpen(false);
      } catch (err: any) {
        setErrorMsg(err.message || "فشلت عملية البيع، يرجى المحاولة لاحقاً");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={product.stockQuantity <= 0}
        className="w-full rounded-xl bg-sky-500 py-2 text-xs font-black text-slate-950 transition hover:bg-sky-400 disabled:opacity-40 active:scale-[0.98]"
      >
        {product.stockQuantity > 0 ? "بيع سريع (كاش)" : "نفذ المخزون"}
      </button>

      {/* نافذة التأكيد وتحديد الخزينة والكمية */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-2xl relative text-right">
            {/* زر الإغلاق */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute left-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition text-xs"
            >
              ✕
            </button>

            <div className="border-b border-slate-800 pb-3 mb-3">
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/30">
                ⚡ تأكيد بيع نقدي فوري
              </span>
              <h3 className="mt-2 text-lg font-black text-white">{product.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                سعر الوحدة: <span className="font-mono font-bold text-emerald-400">{product.sellPrice} ج.م</span>
              </p>
            </div>

            {errorMsg && (
              <div className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/15 p-2 text-xs text-rose-300 font-bold">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3 py-1">
              {/* اختيار الكمية */}
              <div className="flex items-center justify-between rounded-2xl bg-slate-950/70 p-3 border border-slate-800">
                <span className="text-xs text-slate-300 font-bold">الكمية المباعة:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    disabled={quantity <= 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-sm font-bold text-white hover:border-slate-500 disabled:opacity-30"
                  >
                    -
                  </button>
                  <span className="font-mono text-base font-bold text-white w-8 text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.min(product.stockQuantity, prev + 1))}
                    disabled={quantity >= product.stockQuantity}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-sm font-bold text-white hover:border-slate-500 disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* اختيار الخزينة مع افتراض خزينة الوردية */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 space-y-1.5 text-xs">
                <label className="block text-[11px] font-bold text-emerald-400">
                  🏦 الخزينة المودع بها الكاش:
                </label>
                <select
                  value={selectedDrawerId}
                  onChange={(e) => setSelectedDrawerId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-emerald-300 font-bold outline-none focus:border-sky-400"
                >
                  {cashDrawers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.balance.toFixed(2)} ج.م) {d.id === defaultDrawerId ? "⭐ (خزينة الوردية - افتراضي)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* إجمالي المبلغ */}
              <div className="rounded-2xl bg-slate-950/40 p-3 border border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-300 font-bold">المبلغ المطلوب استلامه كاش:</span>
                <span className="font-mono text-base font-black text-emerald-400">
                  {totalAmount} ج.م
                </span>
              </div>
            </div>

            {/* أزرار التأكيد أو التراجع */}
            <div className="grid grid-cols-2 gap-2 pt-3 mt-1 border-t border-slate-800">
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmSale}
                className="w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-black text-slate-950 hover:bg-emerald-400 transition shadow-lg shadow-emerald-950/20 disabled:opacity-40"
              >
                {isPending ? "جاري التوريد..." : "✓ تأكيد واستلام الكاش"}
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() => setIsOpen(false)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-600 transition"
              >
                إلغاء التراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}