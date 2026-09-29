"use client";

import { useState, useTransition } from "react";
import { getSupplierLedger } from "@/app/actions/suppliers";

interface SupplierLedgerModalProps {
  supplierId: string;
  supplierName: string;
  currentBalance: number;
}

export function SupplierLedgerModal({
  supplierId,
  supplierName,
  currentBalance,
}: SupplierLedgerModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpen = () => {
    setIsOpen(true);
    setIsLoading(true);
    startTransition(async () => {
      try {
        const data = await getSupplierLedger(supplierId);
        setLedgerData(data);
      } finally {
        setIsLoading(false);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="w-full rounded-xl border border-sky-500/30 bg-sky-500/10 py-2 text-xs font-bold text-sky-300 hover:bg-sky-500/20 transition flex items-center justify-center gap-1.5"
      >
        <span>📊</span>
        <span>كشف الحساب وسجل الحركات</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* زر الإغلاق */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute left-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              ✕
            </button>

            {/* رأس كشف الحساب */}
            <div className="border-b border-slate-800 pb-4">
              <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-bold text-sky-300">
                كشف حساب مورد تفصيلي
              </span>
              <h2 className="mt-2 text-2xl font-black text-white">{supplierName}</h2>
              <div className="mt-2 flex flex-wrap gap-4 text-xs">
                <span className="text-slate-400">
                  الرصيد المستحق الحالي:{" "}
                  <strong className={currentBalance > 0 ? "text-rose-400 text-sm font-mono" : "text-emerald-400 text-sm font-mono"}>
                    {currentBalance} ج.م
                  </strong>
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="py-16 text-center text-sm font-bold text-slate-400">
                جاري تجميع حركات الفواتير والسندات...
              </div>
            ) : ledgerData ? (
              <div className="space-y-5 py-4">
                {/* كروت الإجماليات (تشمل الرصيد الافتتاحي وفواتير الشراء) */}
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="rounded-2xl bg-slate-950/60 p-3 border border-slate-800">
                    <span className="text-slate-400">إجمالي المستحق له (فواتير + رصيد سابق):</span>
                    <p className="mt-1 font-mono text-sm font-black text-white">
                      {ledgerData.totalCredit} ج.م
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-950/60 p-3 border border-slate-800">
                    <span className="text-slate-400">إجمالي المسدد نقداً:</span>
                    <p className="mt-1 font-mono text-sm font-black text-emerald-400">
                      {ledgerData.totalPaid} ج.م
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-950/60 p-3 border border-slate-800">
                    <span className="text-slate-400">الرصيد المتبقي له:</span>
                    <p className="mt-1 font-mono text-sm font-black text-rose-400">
                      {ledgerData.currentBalance} ج.م
                    </p>
                  </div>
                </div>

                {/* جدول دفتر أستاذ المورد */}
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50">
                  <table className="min-w-full text-right text-xs text-slate-200">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-3 py-2.5">التاريخ</th>
                        <th className="px-3 py-2.5">بيان الحركة</th>
                        <th className="px-3 py-2.5 text-center text-rose-300">دائن (له / فواتير)</th>
                        <th className="px-3 py-2.5 text-center text-emerald-300">مدين (سداد / صرف)</th>
                        <th className="px-3 py-2.5 text-left">الرصيد بعد الحركة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {ledgerData.ledger.map((entry: any, index: number) => (
                        <tr key={index} className="hover:bg-slate-900/60 transition">
                          <td className="px-3 py-2.5 font-mono text-slate-400 whitespace-nowrap">
                            {new Date(entry.date).toLocaleString("ar-EG", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="font-bold text-white">{entry.title}</p>
                            {entry.details && (
                              <p className="text-[10px] text-slate-400">{entry.details}</p>
                            )}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-center font-bold text-rose-300">
                            {entry.credit > 0 ? `${entry.credit} ج.م` : "—"}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-center font-bold text-emerald-400">
                            {entry.debit > 0 ? `${entry.debit} ج.م` : "—"}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-left font-black text-white">
                            {entry.balanceAfter} ج.م
                          </td>
                        </tr>
                      ))}

                      {ledgerData.ledger.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            لا توجد حركات مسجلة لهذا المورد.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:border-slate-500"
                  >
                    🖨️ طباعة كشف الحساب
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