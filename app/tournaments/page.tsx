import Link from "next/link";

import { requireRole } from "@/app/actions/auth";
import { createTournament, getTournaments } from "@/app/actions/tournaments";
import { SiteShell } from "@/components/site-shell";

export default async function TournamentsPage() {
  await requireRole(["ADMIN", "CASHIER", "STAFF"]);

  const tournaments = await getTournaments();

  const totalTournaments = tournaments.length;
  const activeCount = tournaments.filter((t: any) => t.status === "ONGOING").length;
  const totalPrizePool = tournaments.reduce((sum: number, t: any) => sum + (t.prizePool || 0), 0);

  return (
    <SiteShell title="إدارة بطولات البلايستيشن (eSports)">
      {/* إحصائيات سريعة */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <article className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-slate-400 block font-bold">البطولات الجارية حالياً</span>
          <p className="mt-2 text-3xl font-black font-mono text-emerald-400">{activeCount}</p>
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-slate-400 block font-bold">إجمالي البطولات المسجلة</span>
          <p className="mt-2 text-3xl font-black font-mono text-white">{totalTournaments}</p>
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-slate-400 block font-bold">مجموع الجوائز المالية</span>
          <p className="mt-2 text-3xl font-black font-mono text-amber-400">{totalPrizePool} ج.م</p>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.9fr]">
        {/* نموذج إنشاء بطولة جديدة */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 h-fit">
          <h2 className="text-xl font-bold text-white">🏆 إنشاء بطولة جديدة</h2>
          <p className="text-xs text-slate-400 mt-1">حدد نوع البطولة وقواعد التصعيد واللعبة والجوائز.</p>

          <form
            action={async (formData) => {
              "use server";
              const title = String(formData.get("title") ?? "");
              const gameName = String(formData.get("gameName") ?? "FC 26");
              const type = String(formData.get("type") ?? "LEAGUE") as any;
              const entryFee = Number(formData.get("entryFee") ?? 0);
              const prizePool = Number(formData.get("prizePool") ?? 0);
              const groupCount = Number(formData.get("groupCount") ?? 2);
              const qualifiersPerGroup = Number(formData.get("qualifiersPerGroup") ?? 2);

              if (!title) return;

              await createTournament({
                title,
                gameName,
                type,
                entryFee,
                prizePool,
                groupCount,
                qualifiersPerGroup,
              });
            }}
            className="mt-5 space-y-4 text-xs"
          >
            <div>
              <label className="mb-1 block font-bold text-slate-300">اسم البطولة:</label>
              <input
                name="title"
                placeholder="مثال: بطولة صالة الأبطال FC 26"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-bold text-slate-300">اسم اللعبة:</label>
                <input
                  name="gameName"
                  defaultValue="FC 26"
                  placeholder="FC 26 / PES / Tekken"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-300">نظام البطولة:</label>
                <select
                  name="type"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400 font-bold"
                >
                  <option value="LEAGUE">دوري ومجموعات (League & Groups)</option>
                  <option value="KNOCKOUT">كأس خروج مغلوب (Cup Knockout)</option>
                  <option value="SUPER_CUP">سوبر (2 أو 4 لاعبين)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-bold text-slate-300">رسوم الاشتراك للاعب (ج.م):</label>
                <input
                  name="entryFee"
                  type="number"
                  placeholder="50"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400 font-mono"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-300">مجموع الجوائز (ج.م):</label>
                <input
                  name="prizePool"
                  type="number"
                  placeholder="500"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-amber-300 outline-none focus:border-amber-400 font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-bold text-slate-300">عدد المجموعات (للدوري):</label>
                <input
                  name="groupCount"
                  type="number"
                  defaultValue={2}
                  min={1}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400 font-mono"
                />
              </div>

              <div>
                <label className="mb-1 block text-slate-300 font-bold">كم يصعد من كل مجموعة؟</label>
                <input
                  name="qualifiersPerGroup"
                  type="number"
                  defaultValue={2}
                  min={1}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-sky-500 py-3 text-xs font-black text-slate-950 hover:bg-sky-400 transition shadow-lg shadow-sky-950/20"
            >
              + إنشاء البطولة وبدء تسجيل اللاعبين
            </button>
          </form>
        </div>

        {/* قائمة البطولات المسجلة */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
          <h2 className="text-xl font-bold text-white mb-4">البطولات الحالية والسابقة</h2>

          <div className="space-y-3">
            {tournaments.map((t: any) => (
              <div
                key={t.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">{t.title}</h3>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                      {t.gameName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    نظام:{" "}
                    <span className="text-slate-300 font-bold">
                      {t.type === "LEAGUE" ? "دوري ومجموعات" : t.type === "KNOCKOUT" ? "كأس خروج مغلوب" : "سوبر"}
                    </span>
                    {" · "}
                    اللاعبين: <span className="text-emerald-400 font-mono font-bold">{t.participants.length}</span>
                    {" · "}
                    الجوائز: <span className="text-amber-300 font-mono font-bold">{t.prizePool} ج.م</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      t.status === "ONGOING"
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        : t.status === "REGISTRATION"
                          ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {t.status === "ONGOING" ? "جارية حالياً" : t.status === "REGISTRATION" ? "فتح التسجيل" : "منتهية"}
                  </span>

                  <Link
                    href={`/tournaments/${t.id}`}
                    className="rounded-xl bg-sky-500/15 border border-sky-500/30 px-3.5 py-1.5 text-xs font-bold text-sky-300 hover:bg-sky-500/25 transition"
                  >
                    لوحة التحكم ⚙️
                  </Link>
                </div>
              </div>
            ))}

            {tournaments.length === 0 && (
              <p className="text-center text-xs text-slate-500 py-12">
                لا توجد بطولات مسجلة بعد. استخدم النموذج لإنشاء أول بطولة.
              </p>
            )}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}