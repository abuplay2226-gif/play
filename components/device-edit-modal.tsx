"use client";

import { useState, useTransition } from "react";
import { deleteDevice, updateDevice } from "@/app/actions/devices";

interface DeviceEditModalProps {
  device: {
    id: string;
    name: string;
    type: "PS4" | "PS5" | "PC" | "VIP_ROOM";
    singleHourlyRate: number;
    multiHourlyRate: number;
  };
}

export function DeviceEditModal({ device }: DeviceEditModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const [name, setName] = useState(device.name);
  const [type, setType] = useState<"PS4" | "PS5" | "PC" | "VIP_ROOM">(device.type);
  const [singleHourlyRate, setSingleHourlyRate] = useState<number | "">(device.singleHourlyRate);
  const [multiHourlyRate, setMultiHourlyRate] = useState<number | "">(device.multiHourlyRate);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("اسم الجهاز مطلوب");
      return;
    }

    startTransition(async () => {
      try {
        await updateDevice({
          deviceId: device.id,
          name: name.trim(),
          type,
          singleHourlyRate: Number(singleHourlyRate || 0),
          multiHourlyRate: Number(multiHourlyRate || 0),
        });
        setIsOpen(false);
      } catch (err: any) {
        setErrorMsg(err.message || "فشل تحديث بيانات الجهاز");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`هل أنت متأكد من حذف الجهاز (${device.name}) نهائياً من الصالة؟`)) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteDevice(device.id);
        setIsOpen(false);
      } catch (err: any) {
        alert(err.message || "فشل حذف الجهاز");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setName(device.name);
          setType(device.type);
          setSingleHourlyRate(device.singleHourlyRate);
          setMultiHourlyRate(device.multiHourlyRate);
          setErrorMsg("");
          setIsOpen(true);
        }}
        className="rounded-lg bg-slate-800/80 p-1 text-[11px] text-slate-400 hover:bg-slate-700 hover:text-white transition"
        title="تعديل الجهاز أو حذفه"
      >
        ⚙️ تعديل
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

            <div className="border-b border-slate-800 pb-3 mb-4">
              <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-bold text-sky-300">
                إدارة الجهاز
              </span>
              <h3 className="mt-2 text-xl font-black text-white">تعديل بيانات {device.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تعديل اسم الجهاز، نوعه، وسعر الساعة الفردي والزوجي.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/15 p-2.5 text-xs text-rose-300 font-bold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-3.5 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-300">اسم الجهاز:</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: PS5 - Room 3"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400 font-bold"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-300">النوع:</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none font-bold"
                >
                  <option value="PS5">PS5</option>
                  <option value="VIP_ROOM">غرفة VIP</option>
                  <option value="PS4">PS4</option>
                  <option value="PC">PC</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-bold text-slate-300">سعر الفردي / ساعة (ج.م):</label>
                  <input
                    type="number"
                    step="any"
                    value={singleHourlyRate}
                    onChange={(e) => setSingleHourlyRate(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-emerald-400 font-bold font-mono outline-none focus:border-emerald-400"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block font-bold text-slate-300">سعر المجموعة / ساعة (ج.م):</label>
                  <input
                    type="number"
                    step="any"
                    value={multiHourlyRate}
                    onChange={(e) => setMultiHourlyRate(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-emerald-400 font-bold font-mono outline-none focus:border-emerald-400"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-sky-500 py-2.5 text-xs font-black text-slate-950 hover:bg-sky-400 transition disabled:opacity-40"
                >
                  {isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleDelete}
                  className="rounded-xl bg-rose-500/15 border border-rose-500/30 px-3 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-500/25 transition disabled:opacity-40"
                >
                  حذف الجهاز 🗑️
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}