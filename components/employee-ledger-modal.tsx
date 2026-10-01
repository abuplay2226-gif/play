"use client";

import { useState, useTransition } from "react";
import { getEmployeeLedger } from "@/app/actions/users";

interface EmployeeLedgerModalProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
}

export function EmployeeLedgerModal({ user }: EmployeeLedgerModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ledgerData, setLedgerData] = useState<any>(null);

  const fetchLedger = (sDate = startDate, eDate = endDate) => {
    setIsLoading(true);
    startTransition(async () => {
      try {
        const data = await getEmployeeLedger({
          userId: user.id,
          startDate: sDate || undefined,
          endDate: eDate || undefined,
        });
        setLedgerData(data);
      } finally {
        setIsLoading(false);
      }
    });
  };

  const handleOpen = () => {
    setIsOpen(true);
    fetchLedger(startDate, endDate);
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLedger(startDate, endDate);
  };

  const handleResetFilter = () => {
    setStartDate("");
    setEndDate("");
    fetchLedger("", "");
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition flex items-center gap-1.5"
      >
        <span>📊</span>
        <span>كشف المسحوبات والسلف</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            {/* زر الإغلاق */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute left-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              ✕
            </button>

            {/* رأس كشف الحساب */}
            <div className="border-b border-slate-800 pb-4">
              <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-bold text-cyan-300">
                كشف مسحوبات وسلف الموظف
              </span>
              <h2 className="mt-2 text-2xl font-black text-white">{user.name ?? user.email}</h2>
              <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-400">
                <span>البريد: <strong className="text-slate-200">{user.email}</strong></span>
                <span>الدور: <strong className="text-cyan-300">{user.role}</strong></span>
              </div>
            </div>

            {/* فلتر التاريخ */}
            <form
              onSubmit={handleFilterSubmit}
              className="mt-4 rounded-2xl bg-slate-950/70 p-4 border border-slate-800 flex flex-wrap items-end gap-3 text-xs"
            >
              <div className="flex-1 min-w-[140px]">
                <label className="block text-slate-400 mb-1 font-bold">من تاريخ:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div className="flex-1 min-w-[140px]">
                <label className="block text-slate-400 mb-1 font-bold">إلى تاريخ:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isLoading || isPending}
                  className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-black text-slate-950 hover:bg-cyan-400 transition"
                >
                  🔍 بحث وتصفية
                </button>

                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={handleResetFilter}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:text-white"
                  >
                    عرض الكل
                  </button>
                )}
              </div>
            </form>

            {isLoading || isPending ? (
              <div className="py-16 text-center text-sm font-bold text-slate-400">
                جاري تجميع حركات وسلف الموظف...
              </div>
            ) : ledgerData ? (
              <div className="space-y-5 py-4">
                {/* كروت الإجماليات */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-2xl bg-slate-950/60 p-3.5 border border-rose-500/30">
                    <span className="text-slate-400">إجمالي المسحوبات والسلف:</span>
                    <p className="mt-1 font-mono text-xl font-black text-rose-400">
                      {ledgerData.totalAdvances.toFixed(2)} ج.م
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950/60 p-3.5 border border-slate-800">
                    <span className="text-slate-400">عدد مرات السحب:</span>
                    <p className="mt-1 font-mono text-xl font-black text-white">
                      {ledgerData.transactionsCount} مرة
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950/60 p-3.5 border border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-slate-400">إجمالي الورديات المسجلة:</span>
                    <p className="mt-1 font-mono text-xl font-black text-cyan-300">
                      {ledgerData.user.shiftsCount} وردية
                    </p>
                  </div>
                </div>

                {/* جدول تفاصيل السلف */}
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50">
                  <table className="min-w-full text-right text-xs text-slate-200">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-3 py-2.5">التاريخ والوقت</th>
                        <th className="px-3 py-2.5">الخزينة المصروف منها</th>
                        <th className="px-3 py-2.5">البيان والملاحظات</th>
                        <th className="px-3 py-2.5 text-left">مبلغ السلفة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {ledgerData.transactions.map((t: any) => (
                        <tr key={t.id} className="hover:bg-slate-900/60 transition">
                          <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">
                            {new Date(t.date).toLocaleString("ar-EG", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="px-3 py-2.5 font-sans font-bold text-slate-300">
                            {t.drawerName}
                          </td>
                          <td className="px-3 py-2.5 font-sans">
                            <p className="font-bold text-white">{t.description}</p>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-left font-black text-rose-400 text-sm">
                            -{t.amount.toFixed(2)} ج.م
                          </td>
                        </tr>
                      ))}

                      {ledgerData.transactions.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-500 font-sans">
                            لا توجد مسحوبات أو سلف مسجلة لهذا الموظف في الفترة المحددة.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-slate-400">
                    💡 يُخصم هذا الإجمالي ({ledgerData.totalAdvances.toFixed(2)} ج.م) من راتب الموظف عند التسوية.
                  </span>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:border-slate-500 transition"
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