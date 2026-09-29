import Link from "next/link";
import { notFound } from "next/navigation";

import { requireRole } from "@/app/actions/auth";
import {
  generateTournamentDraw,
  getTournamentDetails,
  recordMatchScore,
  registerTournamentParticipant,
  toggleParticipantQualification,
} from "@/app/actions/tournaments";
import { SearchableSelect } from "@/components/searchable-select";
import { SiteShell } from "@/components/site-shell";
import { prisma } from "@/lib/prisma";

export default async function TournamentControlPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN", "CASHIER", "STAFF"]);
  const { id } = await params;

  const [tournament, customers, loungeDevices] = await Promise.all([
    getTournamentDetails(id),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.device.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!tournament) notFound();

  // خيارات العملاء للتسجيل
  const customerOptions = customers.map((c: any) => ({
    value: c.id,
    label: c.name,
    subLabel: `هاتف: ${c.phone}`,
  }));

  return (
    <SiteShell title={`إدارة بطولة: ${tournament.title}`}>
      {/* رأس الصفحة مع معلومات البطولة وزر القرعة */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 mb-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-sky-500/20 px-3 py-0.5 text-xs font-bold text-sky-300">
              {tournament.gameName}
            </span>
            <span className="text-xs text-slate-400 font-bold">
              {tournament.type === "LEAGUE"
                ? "دوري ومجموعات"
                : tournament.type === "KNOCKOUT"
                  ? "كأس خروج مغلوب"
                  : "سوبر"}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1.5">{tournament.title}</h1>
          <p className="text-xs text-slate-400 mt-1">
            الجوائز:{" "}
            <span className="font-mono text-amber-300 font-bold">
              {tournament.prizePool} ج.م
            </span>
            {" · "}
            المشاركين:{" "}
            <span className="font-mono text-emerald-400 font-bold">
              {tournament.participants.length} لاعب
            </span>
          </p>
        </div>

        {/* زر إجراء القرعة العشوائية وتوليد المباريات */}
        <form
          action={async () => {
            "use server";
            await generateTournamentDraw(tournament.id);
          }}
        >
          <button
            type="submit"
            disabled={tournament.participants.length < 2}
            className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 text-xs font-black text-slate-950 shadow-lg shadow-orange-500/20 hover:scale-[1.02] transition disabled:opacity-40"
          >
            🎲 إجراء القرعة وتوليد المباريات آلياً
          </button>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_2fr]">
        {/* القسم الأيمن: تسجيل اللاعبين المشاركين */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
            <h3 className="text-base font-bold text-white mb-2">تسجيل لاعب جديد في البطولة</h3>
            <p className="text-xs text-slate-400 mb-4">
              اختر العميل من القائمة بالبحث وحدد فريقه.
            </p>

            <form
              action={async (formData) => {
                "use server";
                const customerId = String(formData.get("customerId") ?? "");
                const teamName = String(formData.get("teamName") ?? "");
                if (!customerId) return;
                await registerTournamentParticipant({
                  tournamentId: tournament.id,
                  customerId,
                  teamName,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="mb-1 block font-bold text-slate-300">اللاعب (العميل):</label>
                <SearchableSelect
                  name="customerId"
                  options={customerOptions}
                  placeholder="-- ابحث عن اللاعب --"
                  searchPlaceholder="اكتب اسم العميل..."
                  required
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-300">
                  اسم الفريق / النادي (اختياري):
                </label>
                <input
                  name="teamName"
                  placeholder="مثال: ريال مدريد، مانشستر سيتي، بايرن"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-emerald-500 py-2.5 text-xs font-black text-slate-950 hover:bg-emerald-400 transition"
              >
                + تأكيد تسجيل اللاعب
              </button>
            </form>
          </div>

          {/* قائمة اللاعبين المسجلين */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
            <h3 className="text-base font-bold text-white mb-3">
              اللاعبين المشاركين ({tournament.participants.length})
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {tournament.participants.map((p: any) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-white">{p.customer.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {p.teamName ? `الفريق: ${p.teamName}` : p.customer.phone}
                    </p>
                  </div>
                  {p.group && (
                    <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] text-sky-300 font-bold">
                      {p.group.name}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* القسم الأيسر: جداول المجموعات والمباريات وتسجيل النتائج */}
        <div className="space-y-6">
          {/* جداول ترتيب المجموعات الدوري */}
          {tournament.type === "LEAGUE" && (
            <div className="space-y-6">
              {tournament.groups.map((group: any) => (
                <div key={group.id} className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
                    <h3 className="text-base font-black text-white">{group.name}</h3>
                    <span className="text-xs text-emerald-400 font-bold">
                      يصعد الأول والثاني للأدوار الإقصائية
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-right text-xs text-slate-200">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="px-3 py-2">الترتيب واللاعب</th>
                          <th className="px-2 py-2 text-center">لعب</th>
                          <th className="px-2 py-2 text-center">فاز</th>
                          <th className="px-2 py-2 text-center">تعادل</th>
                          <th className="px-2 py-2 text-center">خسر</th>
                          <th className="px-2 py-2 text-center">له</th>
                          <th className="px-2 py-2 text-center">عليه</th>
                          <th className="px-2 py-2 text-center">فارق</th>
                          <th className="px-2 py-2 text-center font-bold text-amber-300">نقاط</th>
                          <th className="px-2 py-2 text-center">التأهل</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {group.participants.map((player: any, idx: number) => (
                          <tr key={player.id} className="hover:bg-slate-950/40">
                            <td className="px-3 py-2 font-sans font-bold text-white flex items-center gap-2">
                              <span className="text-slate-500 font-mono">{idx + 1}</span>
                              <span>{player.customer.name}</span>
                              {player.teamName && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ({player.teamName})
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-center">{player.played}</td>
                            <td className="px-2 py-2 text-center text-emerald-400">{player.won}</td>
                            <td className="px-2 py-2 text-center text-slate-400">{player.drawn}</td>
                            <td className="px-2 py-2 text-center text-rose-400">{player.lost}</td>
                            <td className="px-2 py-2 text-center">{player.goalsFor}</td>
                            <td className="px-2 py-2 text-center">{player.goalsAgainst}</td>
                            <td className="px-2 py-2 text-center font-bold">
                              {player.goalDiff > 0 ? `+${player.goalDiff}` : player.goalDiff}
                            </td>
                            <td className="px-2 py-2 text-center font-black text-amber-300 text-sm">
                              {player.points}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {/* زر التبديل اليدوي لحالة التأهل */}
                              <form
                                action={async () => {
                                  "use server";
                                  await toggleParticipantQualification(
                                    player.id,
                                    !player.isQualified
                                  );
                                }}
                              >
                                <button
                                  type="submit"
                                  title="اضغط للتعديل اليدوي في حال اعتذار اللاعب أو استبداله"
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold font-sans transition ${
                                    player.isQualified
                                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                      : "bg-slate-800 text-slate-500"
                                  }`}
                                >
                                  {player.isQualified ? "✓ متأهل" : "غير متأهل"}
                                </button>
                              </form>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* جدول المباريات وتسجيل النتائج المباشرة */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
            <h3 className="text-base font-bold text-white mb-4">
              جدول المباريات والنتائج ({tournament.matches.length} مباراة)
            </h3>

            <div className="space-y-3">
              {tournament.matches.map((m: any) => (
                <div
                  key={m.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-sky-400">
                      {m.stage === "GROUP"
                        ? "دور المجموعات"
                        : m.stage === "FINAL"
                          ? "النهائي 🏆"
                          : "إقصائيات"}
                    </span>
                    {m.group && (
                      <span className="text-[10px] text-slate-400">{m.group.name}</span>
                    )}
                  </div>

                  {/* نموذج تسجيل النتيجة المباشرة */}
                  <form
                    action={async (formData) => {
                      "use server";
                      const p1Score = Number(formData.get("p1Score") ?? 0);
                      const p2Score = Number(formData.get("p2Score") ?? 0);
                      await recordMatchScore({
                        matchId: m.id,
                        player1Score: p1Score,
                        player2Score: p2Score,
                      });
                    }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex items-center gap-2 font-bold text-white">
                      <span>{m.player1?.customer.name ?? "TBD"}</span>
                      <input
                        name="p1Score"
                        type="number"
                        min={0}
                        defaultValue={m.player1Score ?? ""}
                        placeholder="0"
                        className="w-10 rounded-lg border border-slate-700 bg-slate-900 p-1 text-center font-mono font-black text-amber-300 outline-none focus:border-amber-400"
                        required
                      />
                    </div>

                    <span className="text-slate-500 font-bold">VS</span>

                    <div className="flex items-center gap-2 font-bold text-white">
                      <input
                        name="p2Score"
                        type="number"
                        min={0}
                        defaultValue={m.player2Score ?? ""}
                        placeholder="0"
                        className="w-10 rounded-lg border border-slate-700 bg-slate-900 p-1 text-center font-mono font-black text-amber-300 outline-none focus:border-amber-400"
                        required
                      />
                      <span>{m.player2?.customer.name ?? "TBD"}</span>
                    </div>

                    <button
                      type="submit"
                      className="rounded-xl bg-sky-500 px-3 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-sky-400 transition"
                    >
                      {m.isCompleted ? "تحديث النتيجة" : "حفظ النتيجة"}
                    </button>
                  </form>
                </div>
              ))}

              {tournament.matches.length === 0 && (
                <p className="text-center text-xs text-slate-500 py-8">
                  لم يتم إجراء القرعة بعد. سجل اللاعبين ثم اضغط على زر &quot;إجراء القرعة&quot; بالأعلى.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}