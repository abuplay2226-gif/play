"use client";

import { useEffect, useState, useTransition } from "react";
import { signIn } from "@/app/actions/auth";

export function AdminLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  // فحص الذاكرة المحلية للجهاز عند أول تحميل
  useEffect(() => {
    const savedUser = localStorage.getItem("play_admin_saved_username");
    if (savedUser) {
      setUsername(savedUser);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!username.trim() || !password.trim()) {
      setErrorMsg("يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }

    // حفظ أو مسح اسم المستخدم من ذاكرة الجهاز حسب اختيار "تذكرني"
    if (rememberMe) {
      localStorage.setItem("play_admin_saved_username", username.trim());
    } else {
      localStorage.removeItem("play_admin_saved_username");
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("username", username.trim());
        formData.set("password", password.trim());
        formData.set("role", "ADMIN");
        formData.set("rememberMe", String(rememberMe));
        await signIn(formData);
      } catch (err: any) {
        setErrorMsg(err.message || "اسم المستخدم أو كلمة المرور غير صحيحة");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs text-right">
      {errorMsg && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/15 p-2.5 text-xs text-rose-300 font-bold animate-in fade-in">
          {errorMsg}
        </div>
      )}

      <div>
        <label className="mb-1.5 block font-bold text-slate-200">اسم المستخدم:</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="أدخل اسم المستخدم"
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-violet-400"
          autoComplete="off"
          required
        />
      </div>

      <div>
        <label className="mb-1.5 block font-bold text-slate-200">كلمة المرور:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="أدخل كلمة المرور"
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-violet-400"
          autoComplete="off"
          required
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="rounded text-violet-600 h-4 w-4 bg-slate-950 border-slate-700"
          />
          <span>تذكر بيانات الدخول على هذا الجهاز</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-violet-600 py-3 text-sm font-black text-white hover:bg-violet-500 transition shadow-lg shadow-violet-950/40 disabled:opacity-40"
      >
        {isPending ? "جاري التحقق والدخول..." : "دخول لوحة المدير"}
      </button>
    </form>
  );
}