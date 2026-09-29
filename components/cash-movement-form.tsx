"use client";

import { useState } from "react";

type Drawer = { id: string; name: string; balance: number };
type Customer = { id: string; name: string };
type Supplier = { id: string; name: string };

type CashMovementFormProps = {
  drawers: Drawer[];
  customers: Customer[];
  suppliers: Supplier[];
  action: (formData: FormData) => Promise<void>;
};

export function CashMovementForm({ drawers, customers, suppliers, action }: CashMovementFormProps) {
  const [counterpartyMode, setCounterpartyMode] = useState<"GENERAL" | "CUSTOMER" | "SUPPLIER">("GENERAL");
  const [movementType, setMovementType] = useState<"INCOME" | "EXPENSE" | "ADJUSTMENT">("INCOME");

  const showCustomer = counterpartyMode === "CUSTOMER";
  const showSupplier = counterpartyMode === "SUPPLIER";
  const showGeneralExpense = counterpartyMode === "GENERAL" && movementType === "EXPENSE";

  return (
    <form action={action} className="mt-5 space-y-4">
      <div>
        <label className="mb-2 block text-sm text-slate-300">الخزينة</label>
        <select name="cashDrawerId" className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400" required>
          <option value="">اختر الخزينة</option>
          {drawers.map((drawer) => (
            <option key={drawer.id} value={drawer.id}>{drawer.name}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-slate-300">نوع الحركة</label>
          <select
            name="type"
            value={movementType}
            onChange={(event) => setMovementType(event.target.value as "INCOME" | "EXPENSE" | "ADJUSTMENT")}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400"
          >
            <option value="INCOME">قبض</option>
            <option value="EXPENSE">صرف</option>
            <option value="ADJUSTMENT">تسوية</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-300">المبلغ</label>
          <input
            type="number"
            name="amount"
            min={0.01}
            step="0.01"
            defaultValue={""}
            placeholder="ادخل المبلغ"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400"
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-300">جهة التعامل</label>
        <select
          name="counterpartyMode"
          value={counterpartyMode}
          onChange={(event) => setCounterpartyMode(event.target.value as "GENERAL" | "CUSTOMER" | "SUPPLIER")}
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400"
        >
          <option value="GENERAL">عام / مصروفات</option>
          <option value="CUSTOMER">عميل</option>
          <option value="SUPPLIER">مورد</option>
        </select>
      </div>

      {showCustomer && (
        <div>
          <label className="mb-2 block text-sm text-slate-300">اختيار العميل</label>
          <select name="customerId" defaultValue="" className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400">
            <option value="">اختر عميل</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </select>
        </div>
      )}

      {showSupplier && (
        <div>
          <label className="mb-2 block text-sm text-slate-300">اختيار المورد</label>
          <select name="supplierId" defaultValue="" className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400">
            <option value="">اختر مورد</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </select>
        </div>
      )}

      {showGeneralExpense && (
        <div>
          <label className="mb-2 block text-sm text-slate-300">اسم المصروف</label>
          <input name="counterpartyName" className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400" placeholder="اسم الجهة المصروف لها فقط" />
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm text-slate-300">الوصف</label>
        <textarea name="description" rows={3} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400" placeholder="مثال: سداد عميل، شراء مستلزمات، تسوية رصيد" required />
      </div>

      <button type="submit" className="w-full rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">
        حفظ السند
      </button>
    </form>
  );
}
