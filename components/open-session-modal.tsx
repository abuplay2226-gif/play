"use client";

import { useMemo, useState, useTransition } from "react";
import { openDeviceSession, quickCreateCustomer } from "@/app/actions/devices";
import type { SlotType } from "@prisma/client";

interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  loyaltyPts: number;
}

interface OpenSessionModalProps {
  device: {
    id: string;
    name: string;
    type: string;
    singleHourlyRate: number;
    multiHourlyRate: number;
  };
  shiftId: string;
  initialCustomers: CustomerItem[];
}

export function OpenSessionModal({
  device,
  shiftId,
  initialCustomers,
}: OpenSessionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [customers, setCustomers] = useState<CustomerItem[]>(initialCustomers);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [slotType, setSlotType] = useState<SlotType>("SINGLE");

  // التحكم بنوع المدة (مفتوح أو محدد بالدقائق)
  const [isFixedDuration, setIsFixedDuration] = useState<boolean>(false);
  const [selectedMinutes, setSelectedMinutes] = useState<number>(60); // افتراضي ساعة

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [addError, setAddError] = useState("");

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [searchQuery, customers]);

  const handleSelectCustomer = (customer: CustomerItem) => {
    setSelectedCustomer(customer);
    setIsWalkIn(false);
    setSearchQuery("");
  };

  const handleSelectWalkIn = () => {
    setIsWalkIn(true);
    setSelectedCustomer(null);
    setSearchQuery("");
  };

  const handleStartAdding = () => {
    setIsAddingNew(true);
    if (/^\d+$/.test(searchQuery.trim())) {
      setNewPhone(searchQuery.trim());
      setNewName("");
    } else {
      setNewName(searchQuery.trim());
      setNewPhone("");
    }
  };

  const handleSaveNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");

    if (!newName.trim() || !newPhone.trim()) {
      setAddError("الاسم ورقم الهاتف مطلوبان");
      return;
    }

    try {
      const created = await quickCreateCustomer({ name: newName, phone: newPhone });
      const newCust: CustomerItem = {
        id: created.id,
        name: created.name,
        phone: created.phone,
        loyaltyPts: created.loyaltyPts,
      };

      setCustomers((prev) => [newCust, ...prev]);
      setSelectedCustomer(newCust);
      setIsWalkIn(false);
      setIsAddingNew(false);
      setSearchQuery("");
    } catch (err: any) {
      setAddError(err.message || "فشل تسجيل العميل");
    }
  };

  const handleOpenSession = () => {
    startTransition(async () => {
      await openDeviceSession({
        deviceId: device.id,
        shiftId,
        slotType,
        customerId: selectedCustomer?.id ?? null,
        plannedMinutes: isFixedDuration ? selectedMinutes : null,
      });
      setIsOpen(false);
    });
  };

  // حساب التكلفة التقديرية للوقت المحدد
  const currentHourlyRate = slotType === "MULTI" ? device.multiHourlyRate : device.singleHourlyRate;
  const estimatedCost = isFixedDuration
    ? ((selectedMinutes / 60) * currentHourlyRate).toFixed(2)
    : null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 py-3 text-sm font-black text-slate-950 shadow-lg shadow-sky-500/20 transition hover:brightness-110 active:scale-[0.98]"
      >
        ⚡ بدء الجلسة وتشغيل العداد
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute left-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              ✕
            </button>

            <div className="mb-4 text-right">
              <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-bold text-sky-300">
                {device.type}
              </span>
              <h2 className="mt-2 text-2xl font-black text-white">{device.name}</h2>
              <p className="text-xs text-slate-400 mt-1">حدد العميل وطريقة ونظام وقت اللعب</p>
            </div>

            {/* 1. اختيار العميل */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-bold text-slate-300">بيانات العميل:</label>
              {selectedCustomer ? (
                <div className="flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3">
                  <div>
                    <p className="font-bold text-emerald-300">👤 {selectedCustomer.name}</p>
                    <p className="text-xs text-slate-300 font-mono">
                      📞 {selectedCustomer.phone} · ⭐ {selectedCustomer.loyaltyPts} نقطة
                    </p>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="text-xs text-rose-400 hover:underline">
                    تغيير
                  </button>
                </div>
              ) : isWalkIn ? (
                <div className="flex items-center justify-between rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3">
                  <div>
                    <p className="font-bold text-amber-300">👤 عميل صالة عابر</p>
                    <p className="text-xs text-slate-400">بدون بيانات مسجلة</p>
                  </div>
                  <button onClick={() => setIsWalkIn(false)} className="text-xs text-rose-400 hover:underline">
                    تغيير
                  </button>
                </div>
              ) : isAddingNew ? (
                <form onSubmit={handleSaveNewCustomer} className="rounded-2xl border border-sky-500/30 bg-slate-950/70 p-3 space-y-2">
                  <p className="text-xs font-bold text-sky-300">+ إضافة عميل جديد:</p>
                  {addError && <p className="text-xs text-rose-400">{addError}</p>}
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="الاسم الكامل"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-400"
                    autoFocus
                  />
                  <input
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="رقم الهاتف"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-400"
                  />
                  <div className="flex gap-2 pt-1">
                    <button type="submit" className="flex-1 rounded-xl bg-sky-500 py-1.5 text-xs font-black text-slate-950 hover:bg-sky-400">
                      حفظ واختيار
                    </button>
                    <button type="button" onClick={() => setIsAddingNew(false)} className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-white">
                      إلغاء
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-1.5">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم أو رقم الهاتف..."
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white outline-none focus:border-sky-400"
                  />
                  <div className="max-h-36 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 divide-y divide-slate-800/60">
                    <button
                      type="button"
                      onClick={handleSelectWalkIn}
                      className="w-full px-3 py-2 text-right text-xs hover:bg-slate-900 flex items-center justify-between text-amber-300 font-bold transition"
                    >
                      <span>⚡ عميل صالة عابر (سريع)</span>
                      <span className="text-[10px] text-slate-500">بدون بيانات</span>
                    </button>
                    {filteredCustomers.map((cust) => (
                      <button
                        key={cust.id}
                        type="button"
                        onClick={() => handleSelectCustomer(cust)}
                        className="w-full px-3 py-2 text-right text-xs hover:bg-slate-900 flex items-center justify-between transition"
                      >
                        <div>
                          <p className="font-bold text-white">{cust.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{cust.phone}</p>
                        </div>
                        <span className="text-[10px] text-sky-400">⭐ {cust.loyaltyPts} نقطة</span>
                      </button>
                    ))}
                    {filteredCustomers.length === 0 && searchQuery.trim() !== "" && (
                      <div className="p-2.5 text-center space-y-1.5">
                        <p className="text-xs text-slate-400">لا يوجد عميل مطابق</p>
                        <button
                          type="button"
                          onClick={handleStartAdding}
                          className="w-full rounded-xl bg-sky-500/20 py-1.5 text-xs font-bold text-sky-300 hover:bg-sky-500/30 transition border border-sky-500/30"
                        >
                          + إضافة &quot;{searchQuery}&quot; كعميل جديد
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. نوع اللعب (فردي / مجموعة) */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-bold text-slate-300">وضع اللعب:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSlotType("SINGLE")}
                  className={`rounded-2xl border p-2.5 text-center transition ${
                    slotType === "SINGLE"
                      ? "border-sky-400 bg-sky-500/20 text-white shadow-lg shadow-sky-500/10"
                      : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <p className="text-xs font-black">جلسة فردية</p>
                  <p className="font-mono text-xs font-bold text-sky-300 mt-0.5">{device.singleHourlyRate} ج.م / س</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSlotType("MULTI")}
                  className={`rounded-2xl border p-2.5 text-center transition ${
                    slotType === "MULTI"
                      ? "border-indigo-400 bg-indigo-500/20 text-white shadow-lg shadow-indigo-500/10"
                      : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <p className="text-xs font-black">جلسة مجموعة (زوجي)</p>
                  <p className="font-mono text-xs font-bold text-indigo-300 mt-0.5">{device.multiHourlyRate} ج.م / س</p>
                </button>
              </div>
            </div>

            {/* 3. نظام المدة: وقت مفتوح أو وقت محدد مسبقاً */}
            <div className="mb-6 rounded-2xl bg-slate-950/60 p-3.5 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-sky-300">نظام مدة الحجز:</label>
                <div className="flex gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setIsFixedDuration(false)}
                    className={`px-3 py-1 rounded-xl font-bold transition ${
                      !isFixedDuration ? "bg-sky-500 text-slate-950" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    ♾️ وقت مفتوح
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFixedDuration(true)}
                    className={`px-3 py-1 rounded-xl font-bold transition ${
                      isFixedDuration ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    ⏱️ وقت محدد
                  </button>
                </div>
              </div>

              {isFixedDuration && (
                <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    {[
                      { m: 30, lbl: "30 د" },
                      { m: 60, lbl: "1 ساعة" },
                      { m: 120, lbl: "ساعتان" },
                      { m: 180, lbl: "3 ساعات" },
                    ].map((btn) => (
                      <button
                        key={btn.m}
                        type="button"
                        onClick={() => setSelectedMinutes(btn.m)}
                        className={`py-1.5 rounded-xl font-bold border transition ${
                          selectedMinutes === btn.m
                            ? "border-amber-400 bg-amber-400/20 text-amber-300"
                            : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {btn.lbl}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400">دقائق أخرى:</span>
                    <input
                      type="number"
                      step={15}
                      min={15}
                      value={selectedMinutes}
                      onChange={(e) => setSelectedMinutes(Math.max(15, Number(e.target.value)))}
                      className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-center font-mono font-bold text-white outline-none"
                    />
                    <span className="font-bold text-amber-300 font-mono">
                      ≈ {estimatedCost} ج.م
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* زر البدء */}
            <button
              type="button"
              disabled={isPending || (!selectedCustomer && !isWalkIn)}
              onClick={handleOpenSession}
              className="w-full rounded-2xl bg-emerald-500 py-3 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:opacity-40"
            >
              {isPending ? "جاري تشغيل العداد..." : "تأكيد وبدء العداد الآن"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}