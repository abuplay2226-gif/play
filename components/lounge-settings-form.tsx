"use client";

import { useState, useTransition } from "react";
import { updateLoungeSettings } from "@/app/actions/content-admin";
import type { LoungeSettings } from "@/app/actions/site-content";

export function LoungeSettingsForm({
  initialSettings,
}: {
  initialSettings: LoungeSettings;
}) {
  const [heroImage, setHeroImage] = useState(initialSettings.heroImage || "");
  const [heroMobileImage, setHeroMobileImage] = useState(initialSettings.heroMobileImage || "");
  const [heroTitle, setHeroTitle] = useState(initialSettings.heroTitle || "");
  const [heroSubtitle, setHeroSubtitle] = useState(initialSettings.heroSubtitle || "");
  const [address, setAddress] = useState(initialSettings.address || "");
  const [mapUrl, setMapUrl] = useState(initialSettings.mapUrl || "");
  const [phone, setPhone] = useState(initialSettings.phone || "");
  const [whatsapp, setWhatsapp] = useState(initialSettings.whatsapp || "");

  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    const formData = new FormData();
    formData.set("heroImage", heroImage.trim());
    formData.set("heroMobileImage", heroMobileImage.trim());
    formData.set("heroTitle", heroTitle.trim());
    formData.set("heroSubtitle", heroSubtitle.trim());
    formData.set("address", address.trim());
    formData.set("mapUrl", mapUrl.trim());
    formData.set("phone", phone.trim());
    formData.set("whatsapp", whatsapp.trim());

    startTransition(async () => {
      try {
        const res = await updateLoungeSettings(formData);
        if (res && !res.success) {
          setStatus({ type: "error", message: res.error || "حدث خطأ أثناء الحفظ" });
        } else {
          setStatus({
            type: "success",
            message: "✓ تم حفظ وتحديث الإعدادات بنجاح! صفحة العميل تم تحديثها الآن للكمبيوتر والموبايل.",
          });
        }
      } catch (err: any) {
        setStatus({
          type: "error",
          message: err.message || "فشل الاتصال بقاعدة البيانات أثناء حفظ الإعدادات",
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs text-right">
      {status && (
        <div
          className={`rounded-2xl p-3.5 text-xs font-bold border transition-all ${
            status.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/15 border-rose-500/30 text-rose-300"
          }`}
        >
          {status.message}
        </div>
      )}

      {/* حقول الصور: صورة الكمبيوتر وصورة الموبايل */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block font-bold text-slate-300">
            رابط صورة الهيرو الرئيسية للكمبيوتر (Landscape):
          </label>
          <input
            value={heroImage}
            onChange={(e) => setHeroImage(e.target.value)}
            placeholder="https://example.com/desktop-banner.jpg"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs text-white outline-none focus:border-amber-400 font-mono"
            required
          />
          <span className="text-[10px] text-slate-500 mt-1 block">
            صورة عرضية للشاشات الكبيرة واللابتوب.
          </span>
        </div>

        <div>
          <label className="mb-1 block font-bold text-slate-300">
            رابط صورة مخصصة للموبايل (اختياري - مقاس طولي 9:16):
          </label>
          <input
            value={heroMobileImage}
            onChange={(e) => setHeroMobileImage(e.target.value)}
            placeholder="https://example.com/mobile-portrait-wallpaper.jpg"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs text-white outline-none focus:border-amber-400 font-mono"
          />
          <span className="text-[10px] text-slate-500 mt-1 block">
            إذا تركتها فارغة، سيعالج النظام الصورة الرئيسية بذكاء ليناسب الهواتف.
          </span>
        </div>
      </div>

      {/* معاينة الصورتين */}
      <div className="grid gap-3 sm:grid-cols-2">
        {heroImage && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 flex items-center gap-3">
            <div
              className="h-16 w-24 shrink-0 rounded-xl bg-cover bg-center border border-slate-700 shadow-md"
              style={{ backgroundImage: `url('${heroImage}')` }}
            />
            <div className="text-[11px] text-slate-400">
              <span className="font-bold text-emerald-400 block mb-0.5">معاينة شاشات الكمبيوتر:</span>
              تظهر بعرض 16:9 على اللابتوب.
            </div>
          </div>
        )}

        {heroMobileImage && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 flex items-center gap-3">
            <div
              className="h-16 w-12 shrink-0 rounded-xl bg-cover bg-center border border-slate-700 shadow-md"
              style={{ backgroundImage: `url('${heroMobileImage}')` }}
            />
            <div className="text-[11px] text-slate-400">
              <span className="font-bold text-sky-400 block mb-0.5">معاينة صورة الموبايل:</span>
              تظهر كخلفية طولية كاملة بالهاتف.
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block font-bold text-slate-300">العنوان الرئيسي للهيرو:</label>
          <input
            value={heroTitle}
            onChange={(e) => setHeroTitle(e.target.value)}
            placeholder="أهلاً بك في أفضل صالة بلايستيشن وبلياردو"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs text-white outline-none focus:border-amber-400 font-bold"
            required
          />
        </div>

        <div>
          <label className="mb-1 block font-bold text-slate-300">العنوان المكتوب للصالة:</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="شارع النزهة - الحي الرابع - أمام سيتي سنتر"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs text-white outline-none focus:border-amber-400"
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block font-bold text-slate-300">النص الفرعي / الوصف الترحيبي:</label>
        <textarea
          value={heroSubtitle}
          onChange={(e) => setHeroSubtitle(e.target.value)}
          rows={2}
          placeholder="أجواء شبابية راقية، شاشات 4K فائقة، طاولات بلياردو احترافية، ومشروبات باردة وساخنة 🎮🎱"
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs text-white outline-none focus:border-amber-400"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block font-bold text-slate-300">
            رابط تضمين خريطة جوجل (Google Maps Embed):
          </label>
          <input
            value={mapUrl}
            onChange={(e) => setMapUrl(e.target.value)}
            placeholder="https://maps.google.com/maps?q=Cairo&output=embed"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs text-white outline-none focus:border-amber-400 font-mono"
          />
        </div>

        <div>
          <label className="mb-1 block font-bold text-slate-300">رقم الهاتف للاتصال السريع:</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01000000000"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs text-white outline-none focus:border-amber-400 font-mono"
          />
        </div>

        <div>
          <label className="mb-1 block font-bold text-slate-300">رقم الواتساب (مع كود الدولة):</label>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="201000000000"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs text-white outline-none focus:border-amber-400 font-mono"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-7 py-3.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-950/30 hover:scale-[1.01] transition disabled:opacity-40"
      >
        {isPending ? "جاري الحفظ والتطبيق..." : "💾 حفظ إعدادات الهيرو والخريطة"}
      </button>
    </form>
  );
}