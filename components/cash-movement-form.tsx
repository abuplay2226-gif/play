"use client";

import { useState, useTransition } from "react";
import { createCashMovement, type CounterpartyType } from "@/app/actions/cash-drawers";

interface CashDrawerItem {
  id: string;
  name: string;
  balance: number;
}

interface SupplierItem {
  id: string;
  name: string;
  balance: number;
}

interface CustomerItem {
  id: string;
  name: string;
  debt: number;
}

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface CashMovementFormProps {
  drawers: CashDrawerItem[];
  suppliers: SupplierItem[];
  customers: CustomerItem[];
  users: UserItem[];
  defaultDrawerId?: string;
  openShiftId?: string;
}

export function CashMovementForm({
  drawers,
  suppliers,
  customers,
  users,
  defaultDrawerId,
  openShiftId,
}: CashMovementFormProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [selectedDrawerId, setSelectedDrawerId] = useState(defaultDrawerId || drawers[0]?.id || "");
  const [movementType, setMovementType] = useState<"EXPENSE" | "INCOME" | "ADJUSTMENT">("EXPENSE");
  const [counterpartyType, setCounterpartyType] = useState<CounterpartyType>("GENERAL");

  const [amount, setAmount] = useState<number | "">("");
  const [supplierId, setSupplierId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [description, setDescription] = useState("");

  const handleCounterpartyChange = (type: CounterpartyType) => {
    setCounterpartyType(type);
    setSupplierId("");
    setCustomerId("");
    setCounterpartyName("");

    if (type === "MANAGEMENT") {
      setMovementType("EXPENSE");
      setDescription("تسليم إيراد الوردية للإدارة / المالك");
      setCounterpartyName("الإدارة / صاحب المكان");
    } else if (type === "EMPLOYEE") {
      setMovementType("EXPENSE");
      setDescription("سلفة نقدية على حساب الراتب");
    } else if (type === "GENERAL") {
      setDescription("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!selectedDrawerId) {
      setErrorMsg("يرجى تحديد الخزينة");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setErrorMsg("يرجى إدخال مبلغ صحيح أكبر من صفر");
      return;
    }

    if (counterpartyType === "SUPPLIER" && !supplierId) {
      setErrorMsg("يرجى اختيار المورد المسدد له");
      return;
    }

    if (counterpartyType === "CUSTOMER" && !customerId) {
      setErrorMsg("يرجى اختيار العميل المسدد منه");
      return;
    }

    if (counterpartyType === "EMPLOYEE" && !counterpartyName) {
      setErrorMsg("يرجى تحديد اسم الموظف المستلم للسلفة");
      return;
    }

    if (!description.trim()) {
      setErrorMsg("يرجى كتابة بيان ووصف السند");
      return;
    }

    startTransition(async () => {
      try {
        await createCashMovement({
          cashDrawerId: selectedDrawerId,
          type: movementType,
          amount: Number(amount),
          counterpartyType,
          supplierId: counterpartyType === "SUPPLIER" ? supplierId : null,
          customerId: counterpartyType === "CUSTOMER" ? customerId : null,
          counterpartyName: counterpartyName || null,
          description,
          shiftId: openShiftId || null,
        });

        setSuccessMsg("✓ تم تسجيل السند النقدى وتحديث الأرصدة بنجاح");
        setAmount("");
        setDescription("");
        setCounterpartyName("");
        setSupplierId("");
        setCustomerId("");
      } catch (err: any) {
        setErrorMsg(err.message || "حدث خطأ أثناء حفظ السند");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      {errorMsg && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/15 p-2.5 text-xs text-rose-300 font-bold">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-2.5 text-xs text-emerald-300 font-bold">
          {successMsg}
        </div>
      )}

      {/* اختيار الخزينة */}
      <div>
        <label className="mb-1 block font-bold text-slate-300">الخزينة المستهدفة:</label>
        <select
          value={selectedDrawerId}
          onChange={(e) => setSelectedDrawerId(e.target.value)}
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-emerald-300 outline-none focus:border-sky-400 font-bold"
          required
        >
          {drawers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} (رصيدها: {d.balance} ج.م) {d.id === defaultDrawerId ? "⭐ (خزينة الوردية)" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* نوع السند والمبلغ */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block font-bold text-slate-300">نوع السند:</label>
          <select
            value={movementType}
            onChange={(e) => setMovementType(e.target.value as any)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white outline-none font-bold"
          >
            <option value="EXPENSE">💸 سند صرف (خروج فلوس)</option>
            <option value="INCOME">📥 سند قبض (دخول فلوس)</option>
            <option value="ADJUSTMENT">⚙️ تسوية رصيد</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block font-bold text-slate-300">المبلغ (ج.م):</label>
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="مثال: 150"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-amber-300 font-bold font-mono outline-none focus:border-amber-400"
            required
          />
        </div>
      </div>

      {/* أزرار جهة المعاملة الخمسة */}
      <div className="rounded-2xl bg-slate-950/60 p-3.5 border border-slate-800 space-y-3">
        <label className="block font-bold text-sky-300">جهة المعاملة والسند:</label>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleCounterpartyChange("GENERAL")}
            className={`py-2 px-2 rounded-xl border font-bold transition ${
              counterpartyType === "GENERAL"
                ? "border-amber-400 bg-amber-400/20 text-amber-300 shadow-sm"
                : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
            }`}
          >
            ☕ مصروفات عامة
          </button>

          <button
            type="button"
            onClick={() => handleCounterpartyChange("MANAGEMENT")}
            className={`py-2 px-2 rounded-xl border font-bold transition ${
              counterpartyType === "MANAGEMENT"
                ? "border-violet-400 bg-violet-500/20 text-violet-300 shadow-sm"
                : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
            }`}
          >
            🏛️ توريد للإدارة / المالك
          </button>

          <button
            type="button"
            onClick={() => handleCounterpartyChange("EMPLOYEE")}
            className={`py-2 px-2 rounded-xl border font-bold transition ${
              counterpartyType === "EMPLOYEE"
                ? "border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-sm"
                : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
            }`}
          >
            👔 سلفة موظف
          </button>

          <button
            type="button"
            onClick={() => handleCounterpartyChange("SUPPLIER")}
            className={`py-2 px-2 rounded-xl border font-bold transition ${
              counterpartyType === "SUPPLIER"
                ? "border-sky-400 bg-sky-500/20 text-sky-300 shadow-sm"
                : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
            }`}
          >
            🚚 سداد مورد
          </button>

          <button
            type="button"
            onClick={() => handleCounterpartyChange("CUSTOMER")}
            className={`py-2 px-2 rounded-xl border font-bold transition ${
              counterpartyType === "CUSTOMER"
                ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-sm"
                : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
            }`}
          >
            👤 عميل
          </button>
        </div>

        {/* 1. مصروفات عامة */}
        {counterpartyType === "GENERAL" && (
          <div className="pt-1 animate-in fade-in duration-150 space-y-2">
            <div>
              <label className="mb-1 block text-slate-400">اسم المستلم أو نوع المصروف (اختياري):</label>
              <input
                value={counterpartyName}
                onChange={(e) => setCounterpartyName(e.target.value)}
                placeholder="مثال: فني الصيانة / عامل النظافة / فاتورة الكهرباء"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
              />
            </div>
          </div>
        )}

        {/* 2. توريد للإدارة / مسحوبات المالك */}
        {counterpartyType === "MANAGEMENT" && (
          <div className="pt-1 animate-in fade-in duration-150 space-y-2">
            <div>
              <label className="mb-1 block text-violet-300 font-bold">اسم المستلم من الإدارة / المالك:</label>
              <input
                value={counterpartyName}
                onChange={(e) => setCounterpartyName(e.target.value)}
                placeholder="مثال: أ/ محمد (صاحب المكان)"
                className="w-full rounded-xl border border-violet-500/40 bg-slate-900 px-3 py-2 text-xs text-violet-200 outline-none focus:border-violet-400"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                💡 هذا السند يخفض نقدية الدرج لتسليمه بصفر دون أن يُحسب كمصروف تشغيلي مشوه للأرباح.
              </p>
            </div>
          </div>
        )}

        {/* 3. سلفة موظف من الراتب */}
        {counterpartyType === "EMPLOYEE" && (
          <div className="pt-1 animate-in fade-in duration-150 space-y-2">
            <div>
              <label className="mb-1 block text-cyan-300 font-bold">اختر الموظف المستلم للسلفة:</label>
              <select
                value={counterpartyName}
                onChange={(e) => {
                  setCounterpartyName(e.target.value);
                  if (e.target.value) {
                    setDescription(`سلفة على حساب الراتب - الموظف: ${e.target.value}`);
                  }
                }}
                className="w-full rounded-xl border border-cyan-500/40 bg-slate-900 px-3 py-2 text-xs text-cyan-200 outline-none focus:border-cyan-400 font-bold"
                required
              >
                <option value="">-- اختر الموظف --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.name || u.email}>
                    {u.name || u.email} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 4. مورد */}
        {counterpartyType === "SUPPLIER" && (
          <div className="pt-1 animate-in fade-in duration-150">
            <label className="mb-1 block text-slate-300 font-bold">اختر المورد:</label>
            <select
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value);
                const s = suppliers.find((x) => x.id === e.target.value);
                if (s) {
                  setCounterpartyName(s.name);
                  if (!description) setDescription(`سداد دفعة حساب للمورد: ${s.name}`);
                }
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
              required
            >
              <option value="">-- اختر المورد المسدد له --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (له رصيد: {s.balance} ج.م)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 5. عميل */}
        {counterpartyType === "CUSTOMER" && (
          <div className="pt-1 animate-in fade-in duration-150">
            <label className="mb-1 block text-slate-300 font-bold">اختر العميل:</label>
            <select
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                const c = customers.find((x) => x.id === e.target.value);
                if (c) {
                  setCounterpartyName(c.name);
                  if (!description) setDescription(`تحصيل دين سابق من العميل: ${c.name}`);
                }
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
              required
            >
              <option value="">-- اختر العميل --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.debt > 0 ? `عليه دين: ${c.debt} ج.م` : "خالص الحساب"})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* البيان والوصف التفصيلي */}
      <div>
        <label className="mb-1 block font-bold text-slate-300">بيان / سبب السند بالتفصيل:</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="اكتب تفاصيل وملاحظات السند..."
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 py-3 text-xs font-black text-slate-950 shadow-lg hover:scale-[1.01] transition disabled:opacity-40"
      >
        {isPending ? "جاري الحفظ..." : "+ حفظ وتأكيد السند النقدى"}
      </button>
    </form>
  );
}