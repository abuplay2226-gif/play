"use client";

import { useState, useTransition } from "react";
import { deleteCashMovement, updateCashMovement, type CounterpartyType } from "@/app/actions/cash-drawers";

interface CashMovementActionsProps {
  transaction: any;
  drawers: Array<{ id: string; name: string; balance: number }>;
  suppliers: Array<{ id: string; name: string; balance: number }>;
  customers: Array<{ id: string; name: string; debt: number }>;
  users?: Array<{ id: string; name: string | null; email: string; role: string }>;
}

export function CashMovementActions({
  transaction,
  drawers,
  suppliers,
  customers,
  users = [],
}: CashMovementActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const [cashDrawerId, setCashDrawerId] = useState(transaction.cashDrawerId || drawers[0]?.id || "");
  const [type, setType] = useState<"EXPENSE" | "INCOME" | "ADJUSTMENT">(
    transaction.type === "INCOME" || transaction.type === "EXPENSE" || transaction.type === "ADJUSTMENT"
      ? transaction.type
      : "EXPENSE"
  );
  const [counterpartyType, setCounterpartyType] = useState<CounterpartyType>(
    (transaction.counterpartyType as CounterpartyType) || "GENERAL"
  );
  const [amount, setAmount] = useState<number | "">(transaction.amount);
  const [supplierId, setSupplierId] = useState(transaction.supplierId || "");
  const [customerId, setCustomerId] = useState(transaction.customerId || "");
  const [counterpartyName, setCounterpartyName] = useState(transaction.counterpartyName || "");
  const [description, setDescription] = useState(transaction.description || "");

  const isShiftAction = transaction.type === "SHIFT_OPEN" || transaction.type === "SHIFT_CLOSE";
  if (isShiftAction) {
    return <span className="text-[10px] text-slate-500 font-sans">قيد وردية آلي 🔒</span>;
  }

  const handleDelete = () => {
    if (!confirm(`هل أنت متأكد من حذف هذا السند بقيمة (${transaction.amount} ج.م)؟\nسيتم عكس التأثير المالي على الخزينة فوراً.`)) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteCashMovement(transaction.id);
      } catch (err: any) {
        alert(err.message || "فشل حذف السند");
      }
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!amount || Number(amount) <= 0) {
      setErrorMsg("المبلغ يجب أن يكون أكبر من صفر");
      return;
    }

    if (!description.trim()) {
      setErrorMsg("البيان والوصف مطلوب");
      return;
    }

    startTransition(async () => {
      try {
        await updateCashMovement({
          transactionId: transaction.id,
          cashDrawerId,
          type,
          amount: Number(amount),
          counterpartyType,
          supplierId: counterpartyType === "SUPPLIER" ? supplierId : null,
          customerId: counterpartyType === "CUSTOMER" ? customerId : null,
          counterpartyName: counterpartyName || null,
          description,
        });
        setIsEditOpen(false);
      } catch (err: any) {
        setErrorMsg(err.message || "فشل تحديث السند");
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-1.5 justify-center">
        <button
          type="button"
          onClick={() => setIsEditOpen(true)}
          className="rounded-lg bg-slate-800 p-1.5 text-[11px] text-slate-300 hover:bg-slate-700 hover:text-white transition"
          title="تعديل السند"
        >
          ✏️ تعديل
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={handleDelete}
          className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-1.5 text-[11px] text-rose-300 hover:bg-rose-500/20 transition disabled:opacity-40"
          title="حذف السند"
        >
          🗑️ حذف
        </button>
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="absolute left-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              ✕
            </button>

            <div className="border-b border-slate-800 pb-3 mb-4 text-right">
              <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300">
                تعديل السند النقدى
              </span>
              <h3 className="mt-2 text-xl font-black text-white">تعديل بيانات وحسابات السند</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                سيتم ضبط وتسوية أرصدة الخزائن والموردين آلياً فور الحفظ.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/15 p-2.5 text-xs text-rose-300 font-bold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-3.5 text-xs text-right">
              <div>
                <label className="mb-1 block font-bold text-slate-300">الخزينة:</label>
                <select
                  value={cashDrawerId}
                  onChange={(e) => setCashDrawerId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400 font-bold"
                  required
                >
                  {drawers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} (رصيدها: {d.balance} ج.م)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-bold text-slate-300">نوع السند:</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none font-bold"
                  >
                    <option value="EXPENSE">💸 سند صرف</option>
                    <option value="INCOME">📥 سند قبض</option>
                    <option value="ADJUSTMENT">⚙️ تسوية</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-slate-300">المبلغ (ج.م):</label>
                  <input
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-amber-300 font-bold font-mono outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              {/* جهة السند */}
              <div className="rounded-2xl bg-slate-950/60 p-3 border border-slate-800 space-y-2.5">
                <label className="block font-bold text-sky-300">جهة المعاملة:</label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setCounterpartyType("GENERAL")}
                    className={`py-1.5 rounded-xl border font-bold transition ${
                      counterpartyType === "GENERAL"
                        ? "border-amber-400 bg-amber-400/20 text-amber-300"
                        : "border-slate-800 bg-slate-900 text-slate-400"
                    }`}
                  >
                    مصروفات عامة
                  </button>
                  <button
                    type="button"
                    onClick={() => setCounterpartyType("MANAGEMENT")}
                    className={`py-1.5 rounded-xl border font-bold transition ${
                      counterpartyType === "MANAGEMENT"
                        ? "border-violet-400 bg-violet-500/20 text-violet-300"
                        : "border-slate-800 bg-slate-900 text-slate-400"
                    }`}
                  >
                    توريد للإدارة
                  </button>
                  <button
                    type="button"
                    onClick={() => setCounterpartyType("EMPLOYEE")}
                    className={`py-1.5 rounded-xl border font-bold transition ${
                      counterpartyType === "EMPLOYEE"
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                        : "border-slate-800 bg-slate-900 text-slate-400"
                    }`}
                  >
                    سلفة موظف
                  </button>
                  <button
                    type="button"
                    onClick={() => setCounterpartyType("SUPPLIER")}
                    className={`py-1.5 rounded-xl border font-bold transition ${
                      counterpartyType === "SUPPLIER"
                        ? "border-sky-400 bg-sky-500/20 text-sky-300"
                        : "border-slate-800 bg-slate-900 text-slate-400"
                    }`}
                  >
                    مورد
                  </button>
                  <button
                    type="button"
                    onClick={() => setCounterpartyType("CUSTOMER")}
                    className={`py-1.5 rounded-xl border font-bold transition ${
                      counterpartyType === "CUSTOMER"
                        ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                        : "border-slate-800 bg-slate-900 text-slate-400"
                    }`}
                  >
                    عميل
                  </button>
                </div>

                {counterpartyType === "EMPLOYEE" && (
                  <div>
                    <label className="mb-1 block text-slate-300 font-bold">الموظف:</label>
                    <select
                      value={counterpartyName}
                      onChange={(e) => setCounterpartyName(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none"
                    >
                      <option value="">-- اختر الموظف --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.name || u.email}>
                          {u.name || u.email}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {counterpartyType === "GENERAL" && (
                  <div>
                    <label className="mb-1 block text-slate-400 text-[11px]">اسم المستلم (اختياري):</label>
                    <input
                      value={counterpartyName}
                      onChange={(e) => setCounterpartyName(e.target.value)}
                      placeholder="مثال: فني صيانة / كهرباء / بوفيه"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                )}

                {counterpartyType === "MANAGEMENT" && (
                  <div>
                    <label className="mb-1 block text-slate-400 text-[11px]">اسم المستلم من الإدارة:</label>
                    <input
                      value={counterpartyName}
                      onChange={(e) => setCounterpartyName(e.target.value)}
                      placeholder="مثال: أ/ محمد (المالك)"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                )}

                {counterpartyType === "SUPPLIER" && (
                  <div>
                    <label className="mb-1 block text-slate-300 font-bold">المورد:</label>
                    <select
                      value={supplierId}
                      onChange={(e) => {
                        setSupplierId(e.target.value);
                        const s = suppliers.find((x) => x.id === e.target.value);
                        if (s) setCounterpartyName(s.name);
                      }}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none"
                      required
                    >
                      <option value="">-- اختر المورد --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (له: {s.balance} ج.م)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {counterpartyType === "CUSTOMER" && (
                  <div>
                    <label className="mb-1 block text-slate-300 font-bold">العميل:</label>
                    <select
                      value={customerId}
                      onChange={(e) => {
                        setCustomerId(e.target.value);
                        const c = customers.find((x) => x.id === e.target.value);
                        if (c) setCounterpartyName(c.name);
                      }}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none"
                      required
                    >
                      <option value="">-- اختر العميل --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.debt > 0 ? `عليه: ${c.debt} ج.م` : "خالص"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-300">بيان / سبب السند:</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-amber-500 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-400 transition disabled:opacity-40"
                >
                  {isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs text-slate-400 hover:text-white"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}