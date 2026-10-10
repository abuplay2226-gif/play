"use client";

import { useState, useTransition } from "react";
import { requestPackageOnline } from "@/app/actions/packages";

interface PackageOrderModalProps {
  plan: {
    id: string;
    name: string;
    price: number;
    hours: number;
    validityDays: number;
    drinksCount: number;
    drinkName?: string;
    deviceType?: string;
    gameModeLabel?: string;
    highlight?: boolean;
  };
  currentUser?: { name?: string | null; phone?: string | null } | null;
}

export function PackageOrderModal({ plan, currentUser }: PackageOrderModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(currentUser?.name || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim() || !phone.trim()) {
      setErrorMsg("الاسم ورقم الهاتف مطلوبان");
      return;
    }

    startTransition(async () => {
      try {
        await requestPackageOnline({
          packageId: plan.id,
          name: name.trim(),
          phone: phone.trim(),
          notes: notes.trim() || undefined,
        });
        setIsSuccess(true);
      } catch (err: any) {
        setErrorMsg(err.message || "حدث خطأ أثناء إرسال الطلب");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setIsSuccess(false);
          setErrorMsg("");
        }}
        className={`w-full rounded-full py-3 text-xs font-black transition active:scale-95 ${
          plan.highlight
            ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-lg shadow-orange-500/25 hover:brightness-110"
            : "border border-white/20 bg-slate-800 text-white hover:border-amber-400 hover:text-amber-300"
        }`}
      >
        طلب وشحن الباقة 🎁
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 text-right space-y-4 text-xs shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute left-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              ✕
            </button>

            <div className="border-b border-slate-800 pb-3">
              <span className="rounded-full bg-amber-500/20 text-amber-300 font-bold px-3 py-0.5 border border-amber-500/30">
                طلب اشتراك باقة
              </span>
              <h3 className="text-xl font-black text-white mt-1.5">{plan.name}</h3>
              <p className="text-slate-400 font-mono mt-0.5">القيمة: {plan.price} ج.م</p>
            </div>

            {/* تفاصيل الباقة المتقدمة */}
            <div className="rounded-2xl bg-slate-950/70 p-3.5 border border-slate-800 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">ساعات اللعب:</span>
                <strong className="text-emerald-400 font-mono">{plan.hours} ساعات</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">مدة الصلاحية:</span>
                <strong className="text-white">{plan.validityDays} يوم</strong>
              </div>
              {plan.deviceType && (
                <div className="flex justify-between">
                  <span className="text-slate-400">الأجهزة المسموحة:</span>
                  <strong className="text-sky-300">{plan.deviceType === "ALL" ? "جميع الأجهزة" : plan.deviceType}</strong>
                </div>
              )}
              {plan.gameModeLabel && (
                <div className="flex justify-between">
                  <span className="text-slate-400">نمط اللعب:</span>
                  <strong className="text-amber-200">{plan.gameModeLabel}</strong>
                </div>
              )}
              {plan.drinksCount > 0 && (
                <div className="flex justify-between border-t border-slate-800/80 pt-1">
                  <span className="text-slate-400">المشروبات المجانية:</span>
                  <strong className="text-cyan-300">{plan.drinksCount} {plan.drinkName || "مشروب"}</strong>
                </div>
              )}
            </div>

            {isSuccess ? (
              <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-5 text-center space-y-2">
                <p className="text-2xl">🎉</p>
                <h4 className="font-black text-emerald-300 text-sm">تم إرسال طلب اشتراكك بنجاح!</h4>
                <p className="text-slate-300 text-[11px]">
                  سيتم تفعيل رصيد الساعات في حسابك فور الدفع في الصالة أو تأكيد الكاشير.
                </p>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="mt-3 rounded-full bg-emerald-500 px-6 py-2 text-xs font-black text-slate-950"
                >
                  حسناً
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {errorMsg && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/15 p-2 text-rose-300 font-bold">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="font-bold text-slate-300 block mb-1">اسم العميل:</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="اسمك الكريم"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">رقم الهاتف:</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-400 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">ملاحظات إضافية (اختياري):</label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أي استفسار أو تفضيل تود إبلاغه للكاشير"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 py-3 text-xs font-black text-slate-950 hover:brightness-110 transition disabled:opacity-40"
                >
                  {isPending ? "جاري الإرسال..." : "تأكيد وإرسال طلب الباقة"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}