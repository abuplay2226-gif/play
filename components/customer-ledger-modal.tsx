"use client";

import { useState, useTransition } from "react";
import { getCustomerLedger } from "@/app/actions/bookings";

interface CustomerLedgerModalProps {
  customer: {
    id: string;
    name: string;
    phone: string;
    debt: number;
    loyaltyPts: number;
  };
}

export function CustomerLedgerModal({ customer }: CustomerLedgerModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [ledgerData, setLedgerData] = useState<any>(null);

  const handleOpen = () => {
    setIsOpen(true);
    setIsLoading(true);
    startTransition(async () => {
      try {
        const data = await getCustomerLedger(customer.id);
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
        className="rounded-xl border border-sky-500/40 bg-sky-500/20 px-3 py-1.5 text-xs font-bold text-sky-200 hover:bg-sky-500/30 hover:text-white transition flex items-center gap-1.5 shadow-sm"
      >
        <span>📊</span>
        <span>كشف الحساب التفصيلي</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl relative max-h-[92vh] overflow-y-auto text-right">
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
                كشف حساب عميل مفصل
              </span>
              <h2 className="mt-2 text-2xl font-black text-white">{customer.name}</h2>
              <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-400 font-mono">
                <span>📞 الهاتف: <strong className="text-slate-200">{customer.phone}</strong></span>
              </div>
            </div>

            {isLoading || isPending ? (
              <div className="py-16 text-center text-sm font-bold text-slate-400">
                جاري تجميع حركات الباقات والجلسات والمشاريب والديون...
              </div>
            ) : ledgerData ? (
              <div className="space-y-5 py-4">
                {/* كروت الملخص المالي */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-2xl bg-slate-950/60 p-3.5 border border-slate-800">
                    <span className="text-slate-400">الديون المعلقة الحالية:</span>
                    <p className={`mt-1 font-mono text-xl font-black ${customer.debt > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                      {customer.debt.toFixed(2)} ج.م
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950/60 p-3.5 border border-slate-800">
                    <span className="text-slate-400">نقاط الولاء المجمعة:</span>
                    <p className="mt-1 font-mono text-xl font-black text-amber-300">
                      ⭐ {customer.loyaltyPts} نقطة
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950/60 p-3.5 border border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-slate-400">إجمالي الجلسات المسجلة:</span>
                    <p className="mt-1 font-mono text-xl font-black text-sky-300">
                      {ledgerData.totalSessions} جلسة
                    </p>
                  </div>
                </div>

                {/* جدول الحركات التاريخي التراكمي */}
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50">
                  <table className="min-w-full text-right text-xs text-slate-200">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-3 py-2.5">التاريخ والوقت</th>
                        <th className="px-3 py-2.5">نوع الحركة</th>
                        <th className="px-3 py-2.5">البيان وتفاصيل الاستهلاك</th>
                        <th className="px-3 py-2.5 text-left">المبلغ / القيمة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {ledgerData.entries.map((entry: any) => (
                        <tr key={entry.id} className="hover:bg-slate-900/60 transition">
                          <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">
                            {new Date(entry.date).toLocaleString("ar-EG", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>

                          <td className="px-3 py-2.5 font-sans">
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${entry.badgeColor}`}>
                              {entry.badge}
                            </span>
                          </td>

                          <td className="px-3 py-2.5 font-sans">
                            <p className="font-bold text-white">{entry.title}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{entry.details}</p>
                          </td>

                          <td className="px-3 py-2.5 font-mono text-left font-black text-sm">
                            <span className={entry.type === "DEBT_PAYMENT" ? "text-emerald-400" : "text-white"}>
                              {entry.amount > 0 ? `${entry.amount.toFixed(2)} ج.م` : "0.00 ج.م (باقة)"}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {ledgerData.entries.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-500 font-sans">
                            لا توجد حركات أو جلسات مسجلة لهذا العميل حتى الآن.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* زر الطباعة */}
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-slate-400">
                    💡 يوضح هذا الكشف سجل استهلاك الباقات والجلسات والطلبات ومواعيد سداد الديون بدقة.
                  </span>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:border-slate-500 transition flex items-center gap-1.5"
                  >
                    <span>🖨️</span>
                    <span>طباعة كشف الحساب</span>
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