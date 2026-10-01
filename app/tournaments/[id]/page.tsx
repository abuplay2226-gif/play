import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/app/actions/auth";
import {
  advanceKnockoutNextRound,
  deleteTournamentParticipant,
  generateKnockoutDraw,
  generateLeagueDraw,
  getTournamentDetails,
  recordMatchScore,
  registerTournamentParticipant,
  toggleParticipantQualification,
  updateParticipantMatchesCount,
} from "@/app/actions/tournaments";
import { SearchableSelect } from "@/components/searchable-select";
import { SiteShell } from "@/components/site-shell";
import { prisma } from "@/lib/prisma";

function parseParticipantTeam(rawTeamName?: string | null, defaultCount = 3) {
  if (!rawTeamName) return { teamName: "", targetMatches: defaultCount };
  const parts = rawTeamName.split("###");
  if (parts.length >= 2) {
    const count = parseInt(parts[1], 10);
    return {
      teamName: parts[0].trim(),
      targetMatches: !isNaN(count) && count > 0 ? count : defaultCount,
    };
  }
  return { teamName: rawTeamName.trim(), targetMatches: defaultCount };
}

export default async function TournamentControlPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN", "CASHIER", "STAFF"]);
  const { id } = await params;

  const [tournament, customers] = await Promise.all([
    getTournamentDetails(id),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!tournament) notFound();

  const registeredCustomerIds = new Set(tournament.participants.map((p: any) => p.customerId));
  const availableCustomerOptions = customers
    .filter((c: any) => !registeredCustomerIds.has(c.id))
    .map((c: any) => ({
      value: c.id,
      label: c.name,
      subLabel: `هاتف: ${c.phone}`,
    }));

  const isKnockout = tournament.type === "KNOCKOUT";
  const leagueMatches = tournament.matches.filter((m: any) => m.stage === "GROUP");
  const knockoutMatches = tournament.matches.filter((m: any) => m.stage !== "GROUP");
  const qualifiedPlayers = tournament.participants.filter((p: any) => p.isQualified);

  const finalMatch = tournament.matches.find((m: any) => m.stage === "FINAL" && m.isCompleted);
  const thirdPlaceMatch = tournament.matches.find((m: any) => m.stage === "THIRD_PLACE" && m.isCompleted);
  const champion = finalMatch?.winner ?? null;
  const thirdPlaceWinner = thirdPlaceMatch?.winner ?? null;

  // فحص هل الدور الإقصائي الحالي اكتمل ويمكن توليد الدور التالي
  const hasActiveKnockout = knockoutMatches.length > 0;
  const hasIncompleteKnockout = knockoutMatches.some((m: any) => !m.isCompleted);
  const isFinalReached = knockoutMatches.some((m: any) => m.stage === "FINAL");

  return (
    <SiteShell title={`بطولة: ${tournament.title}`}>
      {/* رأس التحكم والبطولة */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 mb-8 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-sky-500/20 px-3 py-0.5 text-xs font-bold text-sky-300">
              {tournament.gameName}
            </span>
            <span className="text-xs text-slate-400 font-bold">
              {isKnockout ? "كأس خروج مغلوب مباشر 🏆" : "دوري عام + إقصائيات"}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1.5">{tournament.title}</h1>
          <p className="text-xs text-slate-400 mt-1">
            عدد اللاعبين المسجلين:{" "}
            <span className="font-mono text-emerald-400 font-bold">
              {tournament.participants.length} لاعب
            </span>
          </p>
        </div>

        {/* أوسمة التتويج للبطل والمركز الثالث */}
        <div className="flex flex-wrap gap-3">
          {champion && (
            <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3 flex items-center gap-2.5">
              <span className="text-2xl">🥇</span>
              <div>
                <p className="text-[10px] text-amber-300 font-bold uppercase">بطل البطولة المتوج</p>
                <p className="text-sm font-black text-white">{champion.customer?.name}</p>
              </div>
            </div>
          )}

          {thirdPlaceWinner && (
            <div className="rounded-2xl border border-amber-700/40 bg-amber-950/20 p-3 flex items-center gap-2.5">
              <span className="text-2xl">🥉</span>
              <div>
                <p className="text-[10px] text-amber-400 font-bold uppercase">المركز الثالث</p>
                <p className="text-sm font-black text-white">{thirdPlaceWinner.customer?.name}</p>
              </div>
            </div>
          )}
        </div>

        {/* أزرار إجراء القرعة وتصعيد الأدوار */}
        <div className="flex flex-wrap gap-2">
          {!isKnockout && (
            <form
              action={async () => {
                "use server";
                await generateLeagueDraw(tournament.id);
              }}
            >
              <button
                type="submit"
                disabled={tournament.participants.length < 2}
                className="rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-500 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg hover:scale-[1.02] transition disabled:opacity-40"
              >
                🎲 قرعة مباريات الدوري
              </button>
            </form>
          )}

          {/* زر قرعة الكأس الدور الأول */}
          {(!hasActiveKnockout || isKnockout) && !isFinalReached && (
            <form
              action={async () => {
                "use server";
                await generateKnockoutDraw(tournament.id);
              }}
            >
              <button
                type="submit"
                disabled={tournament.participants.length < 2}
                className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg hover:scale-[1.02] transition disabled:opacity-40"
              >
                {isKnockout ? "🎲 قرعة الدور الأول للكأس" : `⚡ قرعة الإقصائيات (${qualifiedPlayers.length} متأهل)`}
              </button>
            </form>
          )}

          {/* زر قرعة الدور التالي للفائزين فقط */}
          {hasActiveKnockout && !isFinalReached && (
            <form
              action={async () => {
                "use server";
                await advanceKnockoutNextRound(tournament.id);
              }}
            >
              <button
                type="submit"
                disabled={hasIncompleteKnockout}
                title={hasIncompleteKnockout ? "يجب تسجيل نتائج مباريات الدور الحالي أولاً" : ""}
                className="rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg hover:scale-[1.02] transition disabled:opacity-40"
              >
                ⏩ قرعة الدور التالي (للفائزين)
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_2fr]">
        {/* العمود الأيمن: تسجيل اللاعبين */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
            <h3 className="text-base font-bold text-white mb-1">
              {isKnockout ? "تسجيل لاعب في الكأس" : "تسجيل لاعب وتحديد مبارياته"}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {isKnockout ? "اختر اللاعب وفريقه لبدء قرعة الكأس." : "اختر اللاعب وحدد كم مباراة سيلعبها في الدوري."}
            </p>

            <form
              action={async (formData) => {
                "use server";
                const customerId = String(formData.get("customerId") ?? "");
                const teamName = String(formData.get("teamName") ?? "");
                const targetMatches = Number(formData.get("targetMatches") ?? (isKnockout ? 1 : 3));
                if (!customerId) return;

                await registerTournamentParticipant({
                  tournamentId: tournament.id,
                  customerId,
                  teamName,
                  targetMatches,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="mb-1 block font-bold text-slate-300">اللاعب (العميل):</label>
                <SearchableSelect
                  name="customerId"
                  options={availableCustomerOptions}
                  placeholder={
                    availableCustomerOptions.length > 0
                      ? "-- ابحث عن اللاعب --"
                      : "تمت إضافة جميع العملاء"
                  }
                  searchPlaceholder="اكتب اسم العميل..."
                  emptyText="لا يوجد عملاء متاحين للإضافة"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-300">
                  اسم الفريق / النادي:
                </label>
                <input
                  name="teamName"
                  placeholder="مثال: ريال مدريد، مانشستر سيتي"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                />
              </div>

              {/* يظهر عدد المباريات فقط في حالة الدوري */}
              {!isKnockout && (
                <div>
                  <label className="mb-1 block font-bold text-slate-300">
                    عدد المباريات المحددة لهذا اللاعب:
                  </label>
                  <input
                    name="targetMatches"
                    type="number"
                    defaultValue={tournament.qualifiersPerGroup || 3}
                    min={1}
                    max={20}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-emerald-400 font-bold font-mono outline-none focus:border-emerald-400"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={availableCustomerOptions.length === 0}
                className="w-full rounded-full bg-emerald-500 py-2.5 text-xs font-black text-slate-950 hover:bg-emerald-400 transition disabled:opacity-40"
              >
                + إضافة اللاعب للبطولة
              </button>
            </form>
          </div>

          {/* قائمة اللاعبين المسجلين */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
            <h3 className="text-base font-bold text-white mb-3">
              اللاعبين المسجلين ({tournament.participants.length})
            </h3>
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {tournament.participants.map((p: any) => {
                const { teamName, targetMatches } = parseParticipantTeam(
                  p.teamName,
                  tournament.qualifiersPerGroup || 3
                );

                return (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white">{p.customer.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {teamName ? `فريق: ${teamName}` : p.customer.phone}
                        </p>
                      </div>

                      <form
                        action={async () => {
                          "use server";
                          await deleteTournamentParticipant(p.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="text-slate-500 hover:text-rose-400 text-xs transition"
                          title="حذف اللاعب"
                        >
                          ✕
                        </button>
                      </form>
                    </div>

                    {!isKnockout && (
                      <form
                        action={async (formData) => {
                          "use server";
                          const count = Number(formData.get("matchesCount") ?? 3);
                          await updateParticipantMatchesCount(p.id, count);
                        }}
                        className="flex items-center justify-between bg-slate-900 p-2 rounded-xl border border-slate-800/80"
                      >
                        <span className="text-[11px] text-slate-400">المباريات المستهدفة:</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            name="matchesCount"
                            type="number"
                            defaultValue={targetMatches}
                            min={1}
                            max={20}
                            className="w-12 rounded-lg border border-slate-700 bg-slate-950 py-0.5 px-1.5 text-center font-mono font-bold text-emerald-300 outline-none"
                          />
                          <button
                            type="submit"
                            className="rounded-lg bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
                          >
                            حفظ
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}

              {tournament.participants.length === 0 && (
                <p className="text-center text-xs text-slate-500 py-6">
                  لم يتم تسجيل أي لاعب بعد.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* العمود الأيسر: جداول المباريات والأدوار الإقصائية */}
        <div className="space-y-6">
          {/* 1. جدول ترتيب الدوري العام (في بطولات الدوري فقط) */}
          {!isKnockout && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 border-b border-slate-800 pb-3 gap-2">
                <div>
                  <h3 className="text-base font-black text-white">جدول ترتيب الدوري العام</h3>
                  <p className="text-[11px] text-slate-400">
                    حدد اللاعبين الذين تريد تصعيدهم للأدوار الإقصائية بالضغط على زر &quot;تأهيل&quot;.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-right text-xs text-slate-200">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2"># اللاعب</th>
                      <th className="px-2 py-2 text-center">لعب / محدد</th>
                      <th className="px-2 py-2 text-center">فاز</th>
                      <th className="px-2 py-2 text-center">تعادل</th>
                      <th className="px-2 py-2 text-center">خسر</th>
                      <th className="px-2 py-2 text-center">له</th>
                      <th className="px-2 py-2 text-center">عليه</th>
                      <th className="px-2 py-2 text-center">فارق</th>
                      <th className="px-2 py-2 text-center font-bold text-amber-300">نقاط</th>
                      <th className="px-2 py-2 text-center">التأهل للإقصائيات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {tournament.participants.map((player: any, idx: number) => {
                      const { teamName, targetMatches } = parseParticipantTeam(
                        player.teamName,
                        tournament.qualifiersPerGroup || 3
                      );

                      return (
                        <tr key={player.id} className="hover:bg-slate-950/40">
                          <td className="px-3 py-2.5 font-sans font-bold text-white flex items-center gap-2">
                            <span className="text-slate-500 font-mono">{idx + 1}</span>
                            <span>{player.customer.name}</span>
                            {teamName && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({teamName})
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center font-bold">
                            {player.played} / <span className="text-slate-400">{targetMatches}</span>
                          </td>
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
                            <form
                              action={async () => {
                                "use server";
                                await toggleParticipantQualification(player.id, !player.isQualified);
                              }}
                            >
                              <button
                                type="submit"
                                className={`rounded-full px-3 py-1 text-[11px] font-bold font-sans transition ${
                                  player.isQualified
                                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-sm"
                                    : "bg-slate-800 text-slate-400 hover:text-white"
                                }`}
                              >
                                {player.isQualified ? "✓ متأهل للإقصائيات" : "+ اختيار للتأهل"}
                              </button>
                            </form>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. مباريات الأدوار الإقصائية (خروج المغلوب) مع مباراة المركز الثالث والنهائي */}
          {knockoutMatches.length > 0 && (
            <div className="rounded-3xl border border-amber-500/40 bg-slate-900/90 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-black text-amber-300">
                    🏆 مباريات الأدوار الإقصائية (خروج المغلوب)
                  </h3>
                  <p className="text-xs text-slate-400">
                    المغلوب يُستبعد مباشرة والفائز يتأهل للدور التالي.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {knockoutMatches.map((m: any) => (
                  <div
                    key={m.id}
                    className={`rounded-2xl border p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
                      m.stage === "FINAL"
                        ? "border-amber-400/60 bg-amber-950/30"
                        : m.stage === "THIRD_PLACE"
                          ? "border-amber-700/50 bg-amber-950/20"
                          : "border-slate-800 bg-slate-950/70"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          m.stage === "FINAL"
                            ? "bg-amber-400 text-slate-950 font-black"
                            : m.stage === "THIRD_PLACE"
                              ? "bg-amber-700/40 text-amber-300 font-bold"
                              : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {m.stage === "FINAL"
                          ? "المباراة النهائية 🏆"
                          : m.stage === "THIRD_PLACE"
                            ? "تحديد المركز الثالث 🥉"
                            : m.stage === "SEMI_FINAL"
                              ? "نصف النهائي"
                              : m.stage === "QUARTER_FINAL"
                                ? "ربع النهائي"
                                : "دور الـ 16"}
                      </span>
                    </div>

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
                          className="w-10 rounded-lg border border-slate-700 bg-slate-900 p-1 text-center font-mono font-black text-amber-300 outline-none"
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
                          className="w-10 rounded-lg border border-slate-700 bg-slate-900 p-1 text-center font-mono font-black text-amber-300 outline-none"
                          required
                        />
                        <span>{m.player2?.customer.name ?? "TBD"}</span>
                      </div>

                      <button
                        type="submit"
                        className="rounded-xl bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-amber-400 transition"
                      >
                        {m.isCompleted ? "تحديث" : "حفظ النتيجة"}
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. مباريات مرحلة الدوري */}
          {!isKnockout && leagueMatches.length > 0 && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
              <h3 className="text-base font-bold text-white mb-4">
                مباريات الدوري ({leagueMatches.length} مباراة)
              </h3>

              <div className="space-y-3">
                {leagueMatches.map((m: any) => (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-sky-400">
                        مباراة #{m.matchNumber}
                      </span>
                    </div>

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
                          className="w-10 rounded-lg border border-slate-700 bg-slate-900 p-1 text-center font-mono font-black text-amber-300 outline-none"
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
                          className="w-10 rounded-lg border border-slate-700 bg-slate-900 p-1 text-center font-mono font-black text-amber-300 outline-none"
                          required
                        />
                        <span>{m.player2?.customer.name ?? "TBD"}</span>
                      </div>

                      <button
                        type="submit"
                        className="rounded-xl bg-sky-500 px-3 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-sky-400 transition"
                      >
                        {m.isCompleted ? "تحديث" : "حفظ النتيجة"}
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </SiteShell>
  );
}