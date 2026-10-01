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
    highlight?: boolean;
  };
  currentUser?: {
    name?: string | null;
    phone?: string | null;
  } | null;
}

export function PackageOrderModal({ plan, currentUser }: PackageOrderModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const [name, setName] = useState(currentUser?.name || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [notes, setNotes] = useState("");

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
          notes: notes.trim(),
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
          setIsSuccess(false);
          setErrorMsg("");
          setIsOpen(true);
        }}
        className={`mt-6 w-full rounded-full py-3 text-sm font-black transition ${
          plan.highlight
            ? "bg-gradient-to-r from-amber-300 to-orange-500 text-slate-950 shadow-lg shadow-orange-500/25 hover:scale-[1.02]"
            : "bg-slate-800 text-white hover:bg-slate-700"
        }`}
      >
        اشترك في هذه الباقة الآن
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl relative text-right">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute left-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              ✕
            </button>

            {isSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-3xl">
                  🎉
                </div>
                <h3 className="text-xl font-black text-white">تم استلام طلبك بنجاح!</h3>
                <p className="text-xs text-slate-300 leading-6">
                  تم تسجيل طلب اشتراكك في <strong>({plan.name})</strong>.
                  <br />
                  سيقوم الكاشير في الصالة بتفعيل ساعات الباقة في حسابك فور تأكيد الدفع عند زيارتك القادمة.
                </p>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="mt-4 rounded-full bg-emerald-500 px-6 py-2.5 text-xs font-black text-slate-950 hover:bg-emerald-400"
                >
                  حسناً، فهمت
                </button>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-800 pb-3 mb-4">
                  <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300">
                    طلب اشتراك في باقة
                  </span>
                  <h3 className="mt-2 text-xl font-black text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    السعر: <strong className="text-amber-300 font-mono text-sm">{plan.price} ج.م</strong> · {plan.hours} ساعات لعب
                  </p>
                </div>

                {errorMsg && (
                  <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/15 p-2.5 text-xs text-rose-300 font-bold">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                  <div>
                    <label className="mb-1 block font-bold text-slate-300">الاسم الكامل:</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="أدخل اسمك الكريم"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-slate-300">رقم الهاتف:</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="05XXXXXXXX"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-slate-300">ملاحظات (اختياري):</label>
                    <input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="أي استفسار أو تفضيل تود إبلاغنا به"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full rounded-full bg-gradient-to-r from-amber-300 to-orange-500 py-3 text-xs font-black text-slate-950 shadow-lg shadow-orange-500/25 hover:scale-[1.01] transition disabled:opacity-40"
                  >
                    {isPending ? "جاري إرسال الطلب..." : "تأكيد وإرسال طلب الباقة"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}