"use server";

import { revalidatePath } from "next/cache";

import { assertAuthorized } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

// تعريف الأنواع محلياً لمنع أي خطأ استيراد من بريزما
export type TournamentType = "LEAGUE" | "KNOCKOUT" | "SUPER_CUP";
export type MatchStage =
  | "GROUP"
  | "ROUND_OF_16"
  | "QUARTER_FINAL"
  | "SEMI_FINAL"
  | "THIRD_PLACE"
  | "FINAL";

// 1. جلب كل البطولات
export async function getTournaments() {
  return (prisma as any).tournament.findMany({
    include: {
      participants: { include: { customer: true } },
      matches: true,
      groups: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

// 2. جلب تفاصيل بطولة محددة مع كل بياناتها ومبارياتها
export async function getTournamentDetails(tournamentId: string) {
  return (prisma as any).tournament.findUnique({
    where: { id: tournamentId },
    include: {
      groups: {
        include: {
          participants: {
            include: { customer: true },
            orderBy: [
              { points: "desc" },
              { goalDiff: "desc" },
              { goalsFor: "desc" },
            ],
          },
          matches: {
            include: {
              player1: { include: { customer: true } },
              player2: { include: { customer: true } },
              winner: { include: { customer: true } },
            },
            orderBy: [{ roundNumber: "asc" }, { matchNumber: "asc" }],
          },
        },
      },
      participants: {
        include: { customer: true, group: true },
        orderBy: [
          { points: "desc" },
          { goalDiff: "desc" },
          { goalsFor: "desc" },
        ],
      },
      matches: {
        include: {
          player1: { include: { customer: true } },
          player2: { include: { customer: true } },
          winner: { include: { customer: true } },
          group: true,
        },
        orderBy: [{ roundNumber: "asc" }, { matchNumber: "asc" }],
      },
    },
  });
}

// 3. إنشاء بطولة جديدة
export async function createTournament(input: {
  title: string;
  gameName: string;
  type: TournamentType;
  entryFee?: number;
  prizePool?: number;
  groupCount?: number;
  qualifiersPerGroup?: number;
  startDate?: Date | string;
}) {
  await assertAuthorized(["ADMIN", "CASHIER"]);

  const title = input.title.trim();
  const gameName = input.gameName.trim();
  if (!title || !gameName) throw new Error("اسم البطولة واسم اللعبة مطلوبان");

  const groupCount = input.type === "LEAGUE" ? Math.max(1, input.groupCount || 2) : 1;

  return await prisma.$transaction(async (tx) => {
    const tournament = await (tx as any).tournament.create({
      data: {
        title,
        gameName,
        type: input.type,
        entryFee: Number(input.entryFee || 0),
        prizePool: Number(input.prizePool || 0),
        groupCount,
        qualifiersPerGroup: Math.max(1, input.qualifiersPerGroup || 2),
        startDate: input.startDate ? new Date(input.startDate) : new Date(),
        status: "REGISTRATION",
      },
    });

    // إنشاء المجموعات الفارغة إذا كانت البطولة بنظام الدوري/المجموعات
    if (input.type === "LEAGUE") {
      const groupNames = ["A", "B", "C", "D", "E", "F", "G", "H"];
      for (let i = 0; i < groupCount; i++) {
        await (tx as any).tournamentGroup.create({
          data: {
            tournamentId: tournament.id,
            name: `المجموعة ${groupNames[i] || i + 1}`,
          },
        });
      }
    }

    revalidatePath("/tournaments");
    return tournament;
  });
}

// 4. تسجيل لاعبين في البطولة من قائمة العملاء
export async function registerTournamentParticipant(input: {
  tournamentId: string;
  customerId: string;
  teamName?: string;
}) {
  await assertAuthorized(["ADMIN", "CASHIER"]);

  const existing = await (prisma as any).tournamentParticipant.findFirst({
    where: {
      tournamentId: input.tournamentId,
      customerId: input.customerId,
    },
  });

  if (existing) throw new Error("هذا العميل مسجل بالفعل في البطولة");

  const participant = await (prisma as any).tournamentParticipant.create({
    data: {
      tournamentId: input.tournamentId,
      customerId: input.customerId,
      teamName: input.teamName?.trim() || null,
    },
  });

  revalidatePath(`/tournaments/${input.tournamentId}`);
  return participant;
}

// 5. إجراء القرعة وتوليد المباريات آلياً
export async function generateTournamentDraw(tournamentId: string) {
  await assertAuthorized(["ADMIN", "CASHIER"]);

  return await prisma.$transaction(async (tx) => {
    const tournament = await (tx as any).tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: true,
        groups: true,
      },
    });

    if (!tournament) throw new Error("البطولة غير موجودة");
    if (tournament.participants.length < 2) throw new Error("يجب تسجيل لاعبين اثنين على الأقل لإجراء القرعة");

    const shuffled = [...tournament.participants].sort(() => Math.random() - 0.5);

    // حذف أي مباريات قديمة لإعادة القرعة
    await (tx as any).tournamentMatch.deleteMany({ where: { tournamentId } });

    // نظام المجموعات والدوري
    if (tournament.type === "LEAGUE") {
      const groups = tournament.groups;
      if (groups.length === 0) throw new Error("لا توجد مجموعات منشأة في البطولة");

      for (let i = 0; i < shuffled.length; i++) {
        const targetGroup = groups[i % groups.length];
        await (tx as any).tournamentParticipant.update({
          where: { id: shuffled[i].id },
          data: { groupId: targetGroup.id },
        });
      }

      for (const group of groups) {
        const groupPlayers = await (tx as any).tournamentParticipant.findMany({
          where: { tournamentId, groupId: group.id },
        });

        let matchNumber = 1;
        for (let i = 0; i < groupPlayers.length; i++) {
          for (let j = i + 1; j < groupPlayers.length; j++) {
            await (tx as any).tournamentMatch.create({
              data: {
                tournamentId,
                groupId: group.id,
                stage: "GROUP",
                roundNumber: 1,
                matchNumber: matchNumber++,
                player1Id: groupPlayers[i].id,
                player2Id: groupPlayers[j].id,
                status: "SCHEDULED",
              },
            });
          }
        }
      }
    }

    // نظام الكأس خروج المغلوب
    if (tournament.type === "KNOCKOUT") {
      let stage: MatchStage = "FINAL";
      if (shuffled.length > 8) stage = "ROUND_OF_16";
      else if (shuffled.length > 4) stage = "QUARTER_FINAL";
      else if (shuffled.length > 2) stage = "SEMI_FINAL";

      let matchNumber = 1;
      for (let i = 0; i < shuffled.length; i += 2) {
        await (tx as any).tournamentMatch.create({
          data: {
            tournamentId,
            stage,
            roundNumber: 1,
            matchNumber: matchNumber++,
            player1Id: shuffled[i]?.id ?? null,
            player2Id: shuffled[i + 1]?.id ?? null,
            status: "SCHEDULED",
          },
        });
      }
    }

    // نظام السوبر
    if (tournament.type === "SUPER_CUP") {
      if (shuffled.length === 2) {
        await (tx as any).tournamentMatch.create({
          data: {
            tournamentId,
            stage: "FINAL",
            roundNumber: 1,
            matchNumber: 1,
            player1Id: shuffled[0].id,
            player2Id: shuffled[1].id,
            status: "SCHEDULED",
          },
        });
      } else {
        await (tx as any).tournamentMatch.create({
          data: {
            tournamentId,
            stage: "SEMI_FINAL",
            roundNumber: 1,
            matchNumber: 1,
            player1Id: shuffled[0]?.id,
            player2Id: shuffled[1]?.id,
            status: "SCHEDULED",
          },
        });
        await (tx as any).tournamentMatch.create({
          data: {
            tournamentId,
            stage: "SEMI_FINAL",
            roundNumber: 1,
            matchNumber: 2,
            player1Id: shuffled[2]?.id,
            player2Id: shuffled[3]?.id,
            status: "SCHEDULED",
          },
        });
      }
    }

    await (tx as any).tournament.update({
      where: { id: tournamentId },
      data: { status: "ONGOING" },
    });

    revalidatePath(`/tournaments/${tournamentId}`);
    return true;
  });
}

// 6. تسجيل نتيجة مباراة وحساب الترتيب والنقاط
export async function recordMatchScore(input: {
  matchId: string;
  player1Score: number;
  player2Score: number;
  winnerId?: string;
}) {
  await assertAuthorized(["ADMIN", "CASHIER"]);

  return await prisma.$transaction(async (tx) => {
    const match = await (tx as any).tournamentMatch.findUnique({
      where: { id: input.matchId },
      include: {
        tournament: true,
        player1: true,
        player2: true,
      },
    });

    if (!match || !match.player1Id || !match.player2Id) {
      throw new Error("المباراة غير صالحة أو ينقصها أحد الطرفين");
    }

    const p1Score = Number(input.player1Score);
    const p2Score = Number(input.player2Score);

    let winnerId: string | null = null;
    if (p1Score > p2Score) winnerId = match.player1Id;
    else if (p2Score > p1Score) winnerId = match.player2Id;
    else winnerId = input.winnerId || null;

    await (tx as any).tournamentMatch.update({
      where: { id: input.matchId },
      data: {
        player1Score: p1Score,
        player2Score: p2Score,
        isCompleted: true,
        status: "COMPLETED",
        winnerId,
      },
    });

    // إذا كانت المباراة ضمن المجموعات: حساب النقاط التلقائي
    if (match.stage === "GROUP" && match.groupId) {
      const p1Points = p1Score > p2Score ? 3 : p1Score === p2Score ? 1 : 0;
      const p1Won = p1Score > p2Score ? 1 : 0;
      const p1Drawn = p1Score === p2Score ? 1 : 0;
      const p1Lost = p1Score < p2Score ? 1 : 0;

      await (tx as any).tournamentParticipant.update({
        where: { id: match.player1Id },
        data: {
          played: { increment: 1 },
          won: { increment: p1Won },
          drawn: { increment: p1Drawn },
          lost: { increment: p1Lost },
          goalsFor: { increment: p1Score },
          goalsAgainst: { increment: p2Score },
          goalDiff: { increment: p1Score - p2Score },
          points: { increment: p1Points },
        },
      });

      const p2Points = p2Score > p1Score ? 3 : p1Score === p2Score ? 1 : 0;
      const p2Won = p2Score > p1Score ? 1 : 0;
      const p2Drawn = p1Score === p2Score ? 1 : 0;
      const p2Lost = p2Score < p1Score ? 1 : 0;

      await (tx as any).tournamentParticipant.update({
        where: { id: match.player2Id },
        data: {
          played: { increment: 1 },
          won: { increment: p2Won },
          drawn: { increment: p2Drawn },
          lost: { increment: p2Lost },
          goalsFor: { increment: p2Score },
          goalsAgainst: { increment: p1Score },
          goalDiff: { increment: p2Score - p1Score },
          points: { increment: p2Points },
        },
      });

      // ترتيب المجموعة وتحديد المتأهلين
      const groupRanked = await (tx as any).tournamentParticipant.findMany({
        where: { tournamentId: match.tournamentId, groupId: match.groupId },
        orderBy: [
          { points: "desc" },
          { goalDiff: "desc" },
          { goalsFor: "desc" },
        ],
      });

      const qualifiersCount = match.tournament.qualifiersPerGroup || 2;
      for (let i = 0; i < groupRanked.length; i++) {
        await (tx as any).tournamentParticipant.update({
          where: { id: groupRanked[i].id },
          data: { isQualified: i < qualifiersCount },
        });
      }
    }

    revalidatePath(`/tournaments/${match.tournamentId}`);
    return true;
  });
}

// 7. تغيير حالة الصعود يدوياً
export async function toggleParticipantQualification(
  participantId: string,
  isQualified: boolean
) {
  await assertAuthorized(["ADMIN", "CASHIER"]);

  const updated = await (prisma as any).tournamentParticipant.update({
    where: { id: participantId },
    data: { isQualified },
  });

  revalidatePath(`/tournaments/${updated.tournamentId}`);
  return updated;
}