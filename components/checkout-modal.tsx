"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getSessionCheckoutPreview, settleAndCloseSession } from "@/app/actions/devices";

interface CheckoutModalProps {
  sessionId: string;
  deviceName: string;
}

export function CheckoutModal({ sessionId, deviceName }: CheckoutModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, startTransition] = useTransition();

  const [data, setData] = useState<any>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "DEBT" | "MIXED">("CASH");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [cashPortion, setCashPortion] = useState<number>(0);
  const [selectedDrawerId, setSelectedDrawerId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleOpen = async () => {
    setIsOpen(true);
    setIsLoading(true);
    setErrorMessage("");
    try {
      const preview = await getSessionCheckoutPreview(sessionId);
      setData(preview);
      setDiscount(0);
      setPaidAmount(preview.roundedTotal);
      setCashPortion(preview.roundedTotal);
      // ضبط الخزينة الافتراضية على خزينة الوردية تلقائياً
      setSelectedDrawerId(preview.defaultCashDrawerId);
    } catch (err: any) {
      setErrorMessage(err.message || "فشل تحميل تفاصيل الفاتورة");
    } finally {
      setIsLoading(false);
    }
  };

  const rawSubTotal = data ? data.exactTotal : 0;
  const afterDiscount = Math.max(0, rawSubTotal - discount);
  const netPayable = afterDiscount > 0 ? (Math.round(afterDiscount / 5) * 5 || 5) : 0;
  const roundingDiff = Number((netPayable - afterDiscount).toFixed(2));
  const remainingDebt = Math.max(0, Number((netPayable - paidAmount).toFixed(2)));

  useEffect(() => {
    if (paymentMethod === "DEBT") {
      setPaidAmount(0);
    } else if (paymentMethod === "CASH" || paymentMethod === "CARD") {
      setPaidAmount(netPayable);
    }
  }, [paymentMethod, netPayable]);

  const handleSettle = (printReceipt: boolean) => {
    setErrorMessage("");

    if (remainingDebt > 0 && !data?.customer) {
      setErrorMessage("لا يمكن ترحيل دين على عميل عابر. يجب سداد المبلغ بالكامل أو تسجيل العميل.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await settleAndCloseSession({
          sessionId,
          discountAmount: discount,
          paidAmount,
          paymentMethod,
          cashPortion: paymentMethod === "MIXED" ? cashPortion : undefined,
          targetCashDrawerId: selectedDrawerId, // تمرير الخزينة المحددة
        });

        setIsOpen(false);
        if (printReceipt) {
          router.push(`/receipt?sessionId=${result.sessionId}`);
        }
      } catch (err: any) {
        setErrorMessage(err.message || "حدث خطأ أثناء تقفيل الحساب");
      }
    });
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="w-full rounded-xl bg-gradient-to-r from-rose-600 to-red-600 py-2.5 text-xs font-black text-white hover:from-rose-500 hover:to-red-500 transition shadow-lg shadow-rose-950/40"
      >
        🧾 محاسبة وإنهاء الجلسة
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute left-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              ✕
            </button>

            <div className="border-b border-slate-800 pb-4">
              <span className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-300">
                تسوية الفاتورة والتحصيل
              </span>
              <h2 className="mt-2 text-2xl font-black text-white">حساب جهاز: {deviceName}</h2>
              <p className="text-xs text-slate-400 mt-1">
                العميل:{" "}
                <span className="font-bold text-white">
                  {data?.customer ? `${data.customer.name} (${data.customer.phone})` : "عميل صالة عابر"}
                </span>
                {data?.customer?.debt > 0 && (
                  <span className="text-amber-400 font-bold mr-2">
                    · (عليه ديون سابقة: {data.customer.debt} ج.م)
                  </span>
                )}
              </p>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-sm font-bold text-slate-400">
                جاري حساب الوقت والطلبات...
              </div>
            ) : data ? (
              <div className="space-y-4 py-4">
                {errorMessage && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/15 p-3 text-xs text-rose-300 font-bold">
                    {errorMessage}
                  </div>
                )}

                {/* تفاصيل الوقت والطلبات */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-2xl bg-slate-950/70 p-3 border border-slate-800 space-y-1">
                    <span className="text-slate-400">وقت اللعب ({data.durationText}):</span>
                    <p className="font-mono text-base font-bold text-sky-400">{data.totalTimeCost} ج.م</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950/70 p-3 border border-slate-800 space-y-1">
                    <span className="text-slate-400">مشاريب وطلبات ({data.orderItems.length}):</span>
                    <p className="font-mono text-base font-bold text-amber-400">{data.ordersTotal} ج.م</p>
                  </div>
                </div>

                {/* الخصم وجبر الكسور لأقرب 5 */}
                <div className="rounded-2xl bg-slate-950/50 p-4 border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center text-xs text-slate-300">
                    <span>المجموع الفعلي قبل التقريب:</span>
                    <span className="font-mono font-bold text-white">{rawSubTotal} ج.م</span>
                  </div>

                  <div className="flex justify-between items-center gap-3">
                    <label className="text-xs text-slate-400 font-bold">خصم نقدي (ج.م):</label>
                    <input
                      type="number"
                      min={0}
                      value={discount || ""}
                      placeholder="0"
                      onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                      className="w-28 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-left text-white outline-none focus:border-sky-400 font-mono"
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                    <span>جبر الكسور لأقرب 5 ج.م:</span>
                    <span className={`font-mono font-bold ${roundingDiff >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                      {roundingDiff >= 0 ? `+${roundingDiff}` : roundingDiff} ج.م
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-700 pt-2 text-sm font-black">
                    <span className="text-slate-100">المبلغ الصافي المطلوب:</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">
                      {netPayable} <span className="text-xs font-normal">ج.م</span>
                    </span>
                  </div>
                </div>

                {/* تحديد الخزينة (مع افتراض خزينة الوردية) */}
                {paymentMethod !== "CARD" && paymentMethod !== "DEBT" && (
                  <div className="rounded-2xl bg-slate-950/60 p-3 border border-slate-800">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      🏦 توريد النقدية إلى الخزينة:
                    </label>
                    <select
                      value={selectedDrawerId}
                      onChange={(e) => setSelectedDrawerId(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-emerald-300 font-bold outline-none focus:border-sky-400"
                    >
                      {data?.availableCashDrawers?.map((drawer: any) => (
                        <option key={drawer.id} value={drawer.id}>
                          {drawer.name} {drawer.id === data.defaultCashDrawerId ? "⭐ (خزينة الوردية - افتراضي)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* خيارات السداد */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300">طريقة الدفع:</label>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {[
                      { id: "CASH", label: "💵 كاش" },
                      { id: "CARD", label: "💳 فيزا" },
                      { id: "DEBT", label: "⏳ آجل (دين)" },
                      { id: "MIXED", label: "🔀 جزئي" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={`rounded-xl py-2 font-bold border transition ${
                          paymentMethod === m.id
                            ? "border-sky-400 bg-sky-500/20 text-white"
                            : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* حقول الدفع النقدي والآجل */}
                <div className="rounded-2xl bg-slate-950/60 p-3 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-bold">المبلغ المدفوع كاش الآن:</span>
                    <input
                      type="number"
                      step={5}
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(Number(e.target.value))}
                      className="w-28 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-left font-mono font-bold text-emerald-400 outline-none"
                    />
                  </div>

                  {remainingDebt > 0 && (
                    <div className="flex justify-between items-center text-rose-400 font-bold border-t border-slate-800/80 pt-2">
                      <span>المبلغ المتبقي (يُسجل ديناً على العميل):</span>
                      <span className="font-mono text-sm">{remainingDebt} ج.م</span>
                    </div>
                  )}
                </div>

                {/* أزرار السداد والطباعة */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSettle(true)}
                    className="rounded-2xl bg-emerald-500 py-3 text-xs font-black text-slate-950 hover:bg-emerald-400 transition shadow-lg shadow-emerald-950/30 flex items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    <span>🖨️ تحصيل وطباعة</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSettle(false)}
                    className="rounded-2xl bg-slate-800 py-3 text-xs font-black text-white hover:bg-slate-700 transition disabled:opacity-40"
                  >
                    <span>تحصيل بدون طباعة</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}