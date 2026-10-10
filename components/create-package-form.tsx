"use client";

import { useMemo, useState, useTransition } from "react";
import { createPackagePlan } from "@/app/actions/packages";
import { isBilliardDevice } from "@/lib/device-utils";

interface CreatePackageFormProps {
  deviceTypes: string[];
  products: Array<{ id: string; name: string; category: { name: string } }>;
}

export function CreatePackageForm({ deviceTypes, products }: CreatePackageFormProps) {
  const [isPending, startTransition] = useTransition();

  const [selectedDeviceType, setSelectedDeviceType] = useState<string>("ALL");
  const [gameMode, setGameMode] = useState<"ALL" | "SINGLE" | "MULTI">("ALL");
  const [drinksCount, setDrinksCount] = useState<number>(0);
  const [drinkType, setDrinkType] = useState<"ANY" | "HOT" | "COLD" | "SPECIFIC">("ANY");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [customDrinkName, setCustomDrinkName] = useState<string>("");

  const isBilliard = isBilliardDevice(selectedDeviceType);

  // الخيارات التفاعلية لنمط اللعب (تتبدل تلقائياً إذا كان الجهاز بلياردو)
  const modeOptions = useMemo(() => {
    if (isBilliard) {
      return [
        { value: "ALL", label: "🎱 شامل (ساعات وجيمات)" },
        { value: "SINGLE", label: "⏱️ لعب بالساعة فقط" },
        { value: "MULTI", label: "🎯 لعب بالجيم فقط" },
      ];
    }
    return [
      { value: "ALL", label: "🎮 شامل (فردي وجماعي)" },
      { value: "SINGLE", label: "👤 لعب فردي فقط (Single)" },
      { value: "MULTI", label: "👥 لعب جماعي فقط (Multi)" },
    ];
  }, [isBilliard]);

  const activeModeLabel = useMemo(() => {
    return modeOptions.find((m) => m.value === gameMode)?.label || "شامل";
  }, [modeOptions, gameMode]);

  const finalDrinkName = useMemo(() => {
    if (drinksCount <= 0) return "";
    if (drinkType === "SPECIFIC") {
      const found = products.find((p) => p.id === selectedProductId);
      return found ? found.name : customDrinkName || "مشروب محدد";
    }
    if (drinkType === "HOT") return "مشروبات ساخنة (شاي/قهوة)";
    if (drinkType === "COLD") return "مشروبات باردة وعصائر";
    return customDrinkName || "أي مشروب متاح";
  }, [drinksCount, drinkType, selectedProductId, customDrinkName, products]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    formData.set("gameModeLabel", activeModeLabel);
    formData.set("drinkName", finalDrinkName);

    startTransition(async () => {
      try {
        await createPackagePlan(formData);
        form.reset();
        setDrinksCount(0);
        setSelectedDeviceType("ALL");
        setGameMode("ALL");
      } catch (err: any) {
        alert(err.message || "حدث خطأ أثناء حفظ الباقة");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 text-xs text-right">
      <div>
        <label className="mb-1 block font-bold text-slate-300">اسم الباقة:</label>
        <input
          name="name"
          placeholder="مثال: باقة الأبطال VIP 10 ساعات"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400 font-bold"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block font-bold text-slate-300">سعر الباقة (ج.م):</label>
          <input
            name="price"
            type="number"
            step="any"
            placeholder="400"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-amber-300 font-bold font-mono outline-none focus:border-amber-400"
            required
          />
        </div>

        <div>
          <label className="mb-1 block font-bold text-slate-300">عدد ساعات اللعب:</label>
          <input
            name="hours"
            type="number"
            defaultValue={10}
            min={1}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-emerald-400 font-bold font-mono outline-none focus:border-emerald-400"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block font-bold text-slate-300">الصلاحية (بالأيام):</label>
          <input
            name="validityDays"
            type="number"
            defaultValue={30}
            min={1}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white font-mono outline-none"
            required
          />
        </div>

        <div>
          <label className="mb-1 block font-bold text-slate-300">
            نوع الجهاز المسموح به: (من الأجهزة المسجلة)
          </label>
          <select
            name="deviceType"
            value={selectedDeviceType}
            onChange={(e) => {
              setSelectedDeviceType(e.target.value);
              setGameMode("ALL"); // إعادة ضبط النمط عند تغيير نوع الجهاز
            }}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-sky-300 font-bold outline-none"
          >
            <option value="ALL">🌐 جميع أجهزة الصالة</option>
            {deviceTypes.map((t) => (
              <option key={t} value={t}>
                {isBilliardDevice(t) ? `🎱 ${t} (طاولة بلياردو)` : `🎮 ${t}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* اختيار نمط اللعب التفاعلي (فردي/جماعي أو ساعات/جيمات) */}
      <div className="rounded-2xl bg-slate-950/70 p-3 border border-slate-800 space-y-1.5 animate-in fade-in">
        <label className="font-bold text-slate-300 block">
          {isBilliard ? "🎱 نمط اللعب للبلياردو:" : "🎮 وضع اللعب المسموح:"}
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {modeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setGameMode(opt.value as any)}
              className={`py-2 px-1 rounded-xl border text-[11px] font-bold transition text-center ${
                gameMode === opt.value
                  ? "border-sky-400 bg-sky-500/20 text-white shadow-sm"
                  : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="gameMode" value={gameMode} />
        <input type="hidden" name="gameModeLabel" value={activeModeLabel} />
      </div>

      {/* قسم المشروبات المجانية ونوعها */}
      <div className="rounded-2xl bg-slate-950/70 p-3 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="font-bold text-cyan-300">☕ المشروبات المجانية المشمولة:</label>
          <div className="flex items-center gap-1.5">
            <input
              name="drinksCount"
              type="number"
              min={0}
              value={drinksCount}
              onChange={(e) => setDrinksCount(Math.max(0, Number(e.target.value)))}
              className="w-16 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-center font-mono font-bold text-cyan-300 outline-none"
            />
            <span className="text-slate-400">مشروب</span>
          </div>
        </div>

        {drinksCount > 0 && (
          <div className="space-y-2 pt-1 border-t border-slate-800/80 animate-in fade-in">
            <label className="text-slate-400 block text-[11px]">حدد نوع المشروب المسموح للعميل:</label>
            <select
              name="drinkType"
              value={drinkType}
              onChange={(e) => setDrinkType(e.target.value as any)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none"
            >
              <option value="ANY">☕ أي مشروب متاح بالبوفيه</option>
              <option value="HOT">🍵 مشروبات ساخنة فقط (شاي / قهوة / نسكافيه)</option>
              <option value="COLD">🥤 مشروبات باردة وعصائر فقط</option>
              <option value="SPECIFIC">🎯 صنف محدد بعينه من المنيو</option>
            </select>

            {drinkType === "SPECIFIC" ? (
              <select
                name="drinkProductId"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full rounded-xl border border-cyan-500/40 bg-slate-900 px-3 py-1.5 text-xs text-cyan-200 outline-none"
                required
              >
                <option value="">-- اختر الصنف من منيو الكافيه --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.category.name})
                  </option>
                ))}
              </select>
            ) : (
              <input
                name="drinkName"
                value={customDrinkName}
                onChange={(e) => setCustomDrinkName(e.target.value)}
                placeholder="تخصيص اسم المشروب (مثال: شاي كرك أو فنجان قهوة تركي)"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none"
              />
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input type="checkbox" name="highlight" id="hl" value="true" className="rounded" />
        <label htmlFor="hl" className="text-slate-300 cursor-pointer">
          تمييز الباقة كباقة شائعة ومميزة في الصفحة الرئيسية ⭐
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-emerald-500 py-3 text-xs font-black text-slate-950 hover:bg-emerald-400 transition disabled:opacity-40 shadow-lg shadow-emerald-950/20"
      >
        {isPending ? "جاري الحفظ..." : "+ حفظ الباقة وطرحها للبيع"}
      </button>
    </form>
  );
}