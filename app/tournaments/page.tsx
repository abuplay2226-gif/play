import Link from "next/link";
import { requireRole } from "@/app/actions/auth";
import { getTournaments } from "@/app/actions/tournaments";
import { CreateTournamentForm } from "@/components/create-tournament-form";
import { SiteShell } from "@/components/site-shell";

export default async function TournamentsPage() {
  await requireRole(["ADMIN", "CASHIER", "STAFF"]);

  const tournaments = await getTournaments();

  const totalTournaments = tournaments.length;
  const activeCount = tournaments.filter((t: any) => t.status === "ONGOING").length;
  const completedCount = tournaments.filter((t: any) => t.status === "COMPLETED").length;

  return (
    <SiteShell title="إدارة بطولات البلايستيشن (eSports)">
      {/* إحصائيات سريعة */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <article className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-slate-400 block font-bold">البطولات الجارية حالياً</span>
          <p className="mt-2 text-3xl font-black font-mono text-emerald-400">{activeCount}</p>
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-slate-400 block font-bold">البطولات المكتملة</span>
          <p className="mt-2 text-3xl font-black font-mono text-sky-400">{completedCount}</p>
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <span className="text-xs text-slate-400 block font-bold">إجمالي البطولات</span>
          <p className="mt-2 text-3xl font-black font-mono text-white">{totalTournaments}</p>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.9fr]">
        {/* نموذج إنشاء بطولة تفاعلي ذكي */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 h-fit">
          <h2 className="text-xl font-bold text-white">🏆 إنشاء بطولة جديدة</h2>
          <p className="text-xs text-slate-400 mt-1">
            اختر بين نظام الدوري العام أو كأس خروج المغلوب المباشر.
          </p>

          <CreateTournamentForm />
        </div>

        {/* قائمة البطولات المسجلة */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
          <h2 className="text-xl font-bold text-white mb-4">قائمة البطولات</h2>

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
                    النظام:{" "}
                    <span className="text-slate-300 font-bold">
                      {t.type === "LEAGUE" ? "دوري عام + إقصائيات" : "كأس خروج مغلوب مباشر"}
                    </span>
                    {" · "}
                    اللاعبين:{" "}
                    <span className="text-emerald-400 font-mono font-bold">
                      {t.participants.length} لاعب
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      t.status === "COMPLETED"
                        ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                        : t.status === "ONGOING"
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {t.status === "COMPLETED" ? "🏆 منتهية" : t.status === "ONGOING" ? "جارية حالياً" : "تسجيل اللاعبين"}
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
                لا توجد بطولات مسجلة بعد. استخدم النموذج بالأعلى لإنشاء أول بطولة.
              </p>
            )}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}