"use client";

import { useMemo, useState } from "react";
import { SupplierLedgerModal } from "@/components/supplier-ledger-modal";

interface SupplierItem {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
}

interface SuppliersDirectoryProps {
  suppliers: SupplierItem[];
}

export function SuppliersDirectory({ suppliers }: SuppliersDirectoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "WITH_DEBT" | "CLEARED">("ALL");

  // فلترة الموردين بالبحث الحي والنوع
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.phone && s.phone.includes(searchQuery));

      if (!matchSearch) return false;
      if (filterType === "WITH_DEBT") return s.balance > 0;
      if (filterType === "CLEARED") return s.balance <= 0;
      return true;
    });
  }, [suppliers, searchQuery, filterType]);

  const totalOutstanding = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + (s.balance > 0 ? s.balance : 0), 0);
  }, [suppliers]);

  const withDebtCount = suppliers.filter((s) => s.balance > 0).length;

  return (
    <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden transition-all">
      {/* الشريط النشط القابل للضغط لفتح وإغلاق القائمة */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 text-right flex items-center justify-between hover:bg-slate-800/50 transition outline-none"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/15 text-lg font-black text-sky-400">
            🚚
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">قائمة الموردين</h2>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-mono font-bold text-sky-300">
                {suppliers.length} مورد
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isOpen
                ? "اضغط لإخفاء القائمة لتوفير مساحة الشاشة"
                : "اضغط هنا لاستعراض الموردين وأرصدتهم وكشوف الحسابات"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {totalOutstanding > 0 && (
            <div className="hidden sm:block text-left">
              <span className="text-[11px] text-slate-400 block">إجمالي المستحق للموردين:</span>
              <span className="font-mono text-sm font-black text-rose-400">
                {totalOutstanding.toFixed(2)} ج.م
              </span>
            </div>
          )}
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sm text-slate-300">
            {isOpen ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {/* المحتوى الداخلي: يظهر فقط عند الضغط على العنوان */}
      {isOpen && (
        <div className="border-t border-slate-800 p-5 space-y-4 animate-in fade-in duration-200">
          {/* شريط البحث الحي وفلاتر التصفية السريعة */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن مورد بالاسم أو رقم الهاتف..."
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-400"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute left-3 top-2.5 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* أزرار الفلترة السريعة */}
            <div className="flex gap-1.5 text-xs w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setFilterType("ALL")}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl font-bold transition ${
                  filterType === "ALL"
                    ? "bg-sky-500 text-slate-950"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                الكل ({suppliers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("WITH_DEBT")}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl font-bold transition ${
                  filterType === "WITH_DEBT"
                    ? "bg-rose-500 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                له رصيد ({withDebtCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("CLEARED")}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl font-bold transition ${
                  filterType === "CLEARED"
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                خالص الحساب ({suppliers.length - withDebtCount})
              </button>
            </div>
          </div>

          {/* شبكة الكروت بصندوق تمرير ذكي لا يشوه الصفحة حتى مع 200 مورد */}
          <div className="max-h-[520px] overflow-y-auto pr-1">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSuppliers.map((s) => (
                <article
                  key={s.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-md flex flex-col justify-between hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-base font-black text-white">{s.name}</h3>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          {s.phone ?? "بدون هاتف"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          s.balance > 0
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "bg-emerald-500/20 text-emerald-300"
                        }`}
                      >
                        {s.balance > 0 ? "له رصيد (دائن)" : "خالص الحساب"}
                      </span>
                    </div>

                    <div className="mt-3 border-t border-slate-800/80 pt-2 flex justify-between items-center text-xs">
                      <span className="text-slate-400">الرصيد المستحق له:</span>
                      <span
                        className={`font-mono text-base font-black ${
                          s.balance > 0 ? "text-rose-400" : "text-white"
                        }`}
                      >
                        {s.balance} ج.م
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                    <SupplierLedgerModal
                      supplierId={s.id}
                      supplierName={s.name}
                      currentBalance={s.balance}
                    />
                  </div>
                </article>
              ))}

              {filteredSuppliers.length === 0 && (
                <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-500">
                  لا توجد نتائج مطابقة لـ &quot;{searchQuery}&quot;
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}