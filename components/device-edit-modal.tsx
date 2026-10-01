"use client";

import { useState, useTransition } from "react";
import { deleteDevice, updateDevice } from "@/app/actions/devices";

interface DeviceEditModalProps {
  device: {
    id: string;
    name: string;
    type: string;
    singleHourlyRate: number;
    multiHourlyRate: number;
  };
}

export function DeviceEditModal({ device }: DeviceEditModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(device.name);
  const [type, setType] = useState(device.type);
  const [customType, setCustomType] = useState("");
  const [isCustom, setIsCustom] = useState(!["PS5", "PS4", "PC", "غرفة VIP", "VR", "Xbox"].includes(device.type));
  const [singleRate, setSingleRate] = useState(device.singleHourlyRate);
  const [multiRate, setMultiRate] = useState(device.multiHourlyRate);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const finalType = isCustom ? customType.trim() : type;
    if (!finalType) {
      setErrorMsg("نوع الجهاز مطلوب");
      return;
    }

    startTransition(async () => {
      try {
        await updateDevice({
          deviceId: device.id,
          name,
          type: finalType,
          singleHourlyRate: Number(singleRate),
          multiHourlyRate: Number(multiRate),
        });
        setIsOpen(false);
      } catch (err: any) {
        setErrorMsg(err.message || "فشل تعديل بيانات الجهاز");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`هل أنت متأكد من حذف الجهاز (${device.name}) نهائياً من الصالة؟`)) return;

    setErrorMsg("");
    startTransition(async () => {
      try {
        await deleteDevice(device.id);
        setIsOpen(false);
      } catch (err: any) {
        setErrorMsg(err.message || "فشل حذف الجهاز");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:border-sky-400 hover:text-white transition"
      >
        ⚙️ تعديل
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-2xl relative text-right">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute left-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition text-xs"
            >
              ✕
            </button>

            <div className="border-b border-slate-800 pb-3 mb-4">
              <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-[11px] font-bold text-sky-300">
                إعدادات وتعديل الجهاز
              </span>
              <h3 className="mt-2 text-lg font-black text-white">{device.name}</h3>
            </div>

            {errorMsg && (
              <div className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/15 p-2 text-xs text-rose-300 font-bold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-300">اسم الجهاز:</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-sky-400"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-300">نوع الجهاز:</label>
                  <button
                    type="button"
                    onClick={() => setIsCustom(!isCustom)}
                    className="text-[10px] text-sky-400 hover:underline"
                  >
                    {isCustom ? "اختيار من القائمة الشائعة" : "+ كتابة نوع مخصص جديد"}
                  </button>
                </div>

                {isCustom ? (
                  <input
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    placeholder="اكتب نوع الجهاز (مثلاً: PS6 / VR / بلياردو)..."
                    className="w-full rounded-xl border border-dashed border-sky-500/40 bg-slate-950 px-3 py-2 text-white outline-none focus:border-sky-400"
                    required
                  />
                ) : (
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-sky-400 font-bold"
                  >
                    <option value="PS5">PS5</option>
                    <option value="PS4">PS4</option>
                    <option value="غرفة VIP">غرفة VIP</option>
                    <option value="PC">PC</option>
                    <option value="VR">VR (واقع افتراضي)</option>
                    <option value="Xbox">Xbox</option>
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-bold text-slate-300">سعر الفردي / س (ج.م):</label>
                  <input
                    type="number"
                    step="any"
                    value={singleRate}
                    onChange={(e) => setSingleRate(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-emerald-400 font-mono font-bold outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-300">سعر المجموعة / س (ج.م):</label>
                  <input
                    type="number"
                    step="any"
                    value={multiRate}
                    onChange={(e) => setMultiRate(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-emerald-400 font-mono font-bold outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-sky-500 py-2 font-bold text-slate-950 hover:bg-sky-400 transition disabled:opacity-40"
                >
                  {isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleDelete}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 font-bold text-rose-300 hover:bg-rose-500/20 transition"
                >
                  حذف الجهاز
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}