"use client";

import { useState, useTransition } from "react";
import { subscribeCustomerToPackage } from "@/app/actions/packages";
import { SearchableSelect } from "@/components/searchable-select";

interface Option {
  value: string;
  label: string;
  subLabel?: string;
}

interface CustomerPackageSubscribeFormProps {
  customers: Option[];
  plans: Option[];
  cashDrawers: Array<{ id: string; name: string; balance: number }>;
  defaultDrawerId?: string;
  openShiftId?: string;
}

export function CustomerPackageSubscribeForm({
  customers,
  plans,
  cashDrawers,
  defaultDrawerId,
  openShiftId,
}: CustomerPackageSubscribeFormProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD">("CASH");
  const [cashDrawerId, setCashDrawerId] = useState(defaultDrawerId || cashDrawers[0]?.id || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!customerId) {
      setErrorMsg("يرجى اختيار العميل");
      return;
    }

    if (!packageId) {
      setErrorMsg("يرجى اختيار الباقة المراد شراؤها");
      return;
    }

    startTransition(async () => {
      try {
        await subscribeCustomerToPackage({
          packageId,
          customerId,
          cashDrawerId: cashDrawerId || undefined,
          shiftId: openShiftId,
          paymentMethod,
        });

        setSuccessMsg("✓ تم تفعيل وشحن رصيد الباقة للعميل بنجاح وتوريد القيمة بالخزينة");
        setCustomerId("");
        setPackageId("");
      } catch (err: any) {
        setErrorMsg(err.message || "فشل تفعيل الباقة للعميل");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
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

      <div>
        <label className="mb-1 block font-bold text-slate-300">اختر العميل:</label>
        <SearchableSelect
          options={customers}
          value={customerId}
          onChange={(val) => setCustomerId(val)}
          placeholder="-- ابحث عن العميل --"
          searchPlaceholder="اكتب اسم العميل أو الهاتف..."
          required
        />
      </div>

      <div>
        <label className="mb-1 block font-bold text-slate-300">اختر الباقة المراد شراؤها:</label>
        <SearchableSelect
          options={plans}
          value={packageId}
          onChange={(val) => setPackageId(val)}
          placeholder="-- اختر الباقة --"
          searchPlaceholder="ابحث باسم الباقة..."
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block font-bold text-slate-300">طريقة الدفع:</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as any)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none font-bold"
          >
            <option value="CASH">💵 نقدية بالدرج (كاش)</option>
            <option value="CARD">💳 ماكينة فيزا / بنك</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block font-bold text-slate-300">الخزينة المودع بها:</label>
          <select
            value={cashDrawerId}
            onChange={(e) => setCashDrawerId(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-emerald-300 font-bold outline-none"
          >
            {cashDrawers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.id === defaultDrawerId ? "⭐ (الوردية)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-500 py-3 text-xs font-black text-slate-950 hover:brightness-110 transition shadow-lg shadow-sky-950/30 disabled:opacity-40"
      >
        {isPending ? "جاري الشحن والتفعيل..." : "+ تفعيل وشحن الباقة للعميل فوراً"}
      </button>
    </form>
  );
}