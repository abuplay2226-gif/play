import { SiteShell } from "@/components/site-shell";

const devices = [
  { name: "PS5 - 01", type: "لعبة فردية", status: "مشغول", time: "01:42:18", badge: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  { name: "PS5 - 02", type: "لعبة زوجية", status: "متاح", time: "00:00:00", badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  { name: "PC - 05", type: "جهاز كومبيوتر", status: "صيانة", time: "-", badge: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  { name: "VIP - 01", type: "غرفة خاصة", status: "محجوز", time: "02:10:44", badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
];

export default function DevicesPage() {
  return (
    <SiteShell title="إدارة الأجهزة">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {devices.map((device) => (
          <article key={device.name} className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg shadow-slate-950/30">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xl font-black text-white">{device.name}</p>
                <p className="mt-1 text-sm text-slate-400">{device.type}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${device.badge}`}>
                {device.status}
              </span>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-950/60 p-4">
              <p className="text-sm text-slate-400">الوقت الحالي</p>
              <p className="mt-2 text-2xl font-black text-white">{device.time}</p>
            </div>

            <div className="mt-5 flex gap-3">
              <button className="flex-1 rounded-full bg-sky-500 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-sky-400">
                فتح جلسة
              </button>
              <button className="flex-1 rounded-full border border-slate-700 px-3 py-2 text-sm font-bold text-slate-200 hover:border-slate-500">
                التفاصيل
              </button>
            </div>
          </article>
        ))}
      </div>
    </SiteShell>
  );
}
