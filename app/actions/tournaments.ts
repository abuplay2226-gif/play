"use server";

import { revalidatePath } from "next/cache";
import { assertAuthorized } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export type TournamentType = "LEAGUE" | "KNOCKOUT";
export type MatchStage =
  | "GROUP"
  | "ROUND_OF_16"
  | "QUARTER_FINAL"
  | "SEMI_FINAL"
  | "THIRD_PLACE"
  | "FINAL";

interface PlayerDrawItem {
  id: string;
  target: number;
  assigned: number;
}

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

function encodeParticipantTeam(teamName?: string | null, targetMatches = 3) {
  const cleanTeam = (teamName || "").trim();
  return `${cleanTeam}###${Math.max(1, targetMatches)}`;
}

export async function getTournaments() {
  return (prisma as any).tournament.findMany({
    include: {
      participants: { include: { customer: true } },
      matches: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTournamentDetails(tournamentId: string) {
  return (prisma as any).tournament.findUnique({
    where: { id: tournamentId },
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
  });
}

export async function createTournament(input: {
  title: string;
  gameName: string;
  type: TournamentType;
  defaultMatchesPerPlayer?: number;
}) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  const title = input.title.trim();
  const gameName = input.gameName.trim();
  if (!title || !gameName) throw new Error("اسم البطولة واسم اللعبة مطلوبان");

  const tournament = await (prisma as any).tournament.create({
    data: {
      title,
      gameName,
      type: input.type,
      entryFee: 0,
      prizePool: 0,
      groupCount: 1,
      qualifiersPerGroup: Number(input.defaultMatchesPerPlayer || (input.type === "KNOCKOUT" ? 1 : 3)),
      startDate: new Date(),
      status: "REGISTRATION",
    },
  });

  revalidatePath("/tournaments");
  return tournament;
}

export async function registerTournamentParticipant(input: {
  tournamentId: string;
  customerId: string;
  teamName?: string;
  targetMatches?: number;
}) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  const tournament = await (prisma as any).tournament.findUnique({
    where: { id: input.tournamentId },
  });

  const matchesCount = Number(input.targetMatches || tournament?.qualifiersPerGroup || 3);
  const combinedTeam = encodeParticipantTeam(input.teamName, matchesCount);

  const existing = await (prisma as any).tournamentParticipant.findFirst({
    where: {
      tournamentId: input.tournamentId,
      customerId: input.customerId,
    },
  });

  if (existing) {
    const updated = await (prisma as any).tournamentParticipant.update({
      where: { id: existing.id },
      data: { teamName: combinedTeam },
    });
    revalidatePath(`/tournaments/${input.tournamentId}`);
    return updated;
  }

  const participant = await (prisma as any).tournamentParticipant.create({
    data: {
      tournamentId: input.tournamentId,
      customerId: input.customerId,
      teamName: combinedTeam,
      points: 0,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      isQualified: tournament?.type === "KNOCKOUT",
    },
  });

  revalidatePath(`/tournaments/${input.tournamentId}`);
  return participant;
}

export async function updateParticipantMatchesCount(participantId: string, targetMatches: number) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  const current = await (prisma as any).tournamentParticipant.findUnique({
    where: { id: participantId },
  });

  if (!current) throw new Error("اللاعب غير موجود");

  const { teamName } = parseParticipantTeam(current.teamName);
  const updatedTeam = encodeParticipantTeam(teamName, targetMatches);

  const updated = await (prisma as any).tournamentParticipant.update({
    where: { id: participantId },
    data: { teamName: updatedTeam },
  });

  revalidatePath(`/tournaments/${updated.tournamentId}`);
  return updated;
}

export async function deleteTournamentParticipant(participantId: string) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  const deleted = await (prisma as any).tournamentParticipant.delete({
    where: { id: participantId },
  });

  revalidatePath(`/tournaments/${deleted.tournamentId}`);
  return deleted;
}

// 1. القرعة العشوائية لمباريات الدوري العام
export async function generateLeagueDraw(tournamentId: string) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  return await prisma.$transaction(async (tx: any) => {
    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
      include: { participants: true },
    });

    if (!tournament) throw new Error("البطولة غير موجودة");
    if (tournament.participants.length < 2) {
      throw new Error("يجب إضافة لاعبين اثنين على الأقل لإجراء القرعة");
    }

    await tx.tournamentMatch.deleteMany({
      where: { tournamentId, stage: "GROUP" },
    });

    for (const p of tournament.participants) {
      await tx.tournamentParticipant.update({
        where: { id: p.id },
        data: {
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDiff: 0,
          points: 0,
        },
      });
    }

    const players: PlayerDrawItem[] = tournament.participants.map((p: any) => {
      const { targetMatches } = parseParticipantTeam(p.teamName, tournament.qualifiersPerGroup || 3);
      return { id: p.id, target: targetMatches, assigned: 0 };
    });

    const pairsSet = new Set<string>();
    const matchesToCreate: Array<{ p1: string; p2: string }> = [];

    let attempts = 0;
    const maxAttempts = 2000;

    while (attempts < maxAttempts) {
      attempts++;
      players.sort((a: PlayerDrawItem, b: PlayerDrawItem) => (b.target - b.assigned) - (a.target - a.assigned));

      const needMatches: PlayerDrawItem[] = players.filter((p: PlayerDrawItem) => p.assigned < p.target);
      if (needMatches.length < 2) break;

      const p1 = needMatches[0];
      const validOpponents: PlayerDrawItem[] = needMatches
        .slice(1)
        .filter((cand: PlayerDrawItem) => !pairsSet.has(`${p1.id}-${cand.id}`) && !pairsSet.has(`${cand.id}-${p1.id}`));

      const candidate: PlayerDrawItem | undefined = validOpponents.length > 0
        ? validOpponents[Math.floor(Math.random() * validOpponents.length)]
        : needMatches[1];

      if (candidate) {
        p1.assigned++;
        candidate.assigned++;
        pairsSet.add(`${p1.id}-${candidate.id}`);
        matchesToCreate.push({ p1: p1.id, p2: candidate.id });
      } else {
        break;
      }
    }

    let matchNumber = 1;
    for (const m of matchesToCreate) {
      await tx.tournamentMatch.create({
        data: {
          tournamentId,
          stage: "GROUP",
          roundNumber: 1,
          matchNumber: matchNumber++,
          player1Id: m.p1,
          player2Id: m.p2,
          status: "SCHEDULED",
        },
      });
    }

    await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: "ONGOING" },
    });

    revalidatePath(`/tournaments/${tournamentId}`);
    return true;
  });
}

// 2. القرعة العشوائية المباشرة لبطولة الكأس (الدور الأول) أو المتأهلين من الدوري
export async function generateKnockoutDraw(tournamentId: string) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  return await prisma.$transaction(async (tx: any) => {
    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: true,
      },
    });

    if (!tournament) throw new Error("البطولة غير موجودة");

    const pool = tournament.type === "KNOCKOUT"
      ? tournament.participants
      : tournament.participants.filter((p: any) => p.isQualified);

    if (pool.length < 2) {
      throw new Error("يجب توفر لاعبين اثنين على الأقل لإجراء قرعة خروج المغلوب");
    }

    await tx.tournamentMatch.deleteMany({
      where: { tournamentId, stage: { not: "GROUP" } },
    });

    const shuffled = [...pool].sort(() => Math.random() - 0.5);

    let stage: MatchStage = "FINAL";
    if (shuffled.length > 8) stage = "ROUND_OF_16";
    else if (shuffled.length > 4) stage = "QUARTER_FINAL";
    else if (shuffled.length > 2) stage = "SEMI_FINAL";

    let matchNumber = 1;
    for (let i = 0; i < shuffled.length; i += 2) {
      await tx.tournamentMatch.create({
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

    await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: "ONGOING" },
    });

    revalidatePath(`/tournaments/${tournamentId}`);
    return true;
  });
}

// 3. إجراء قرعة الدور التالي للفائزين فقط + توليد مباراة المركز الثالث عند نصف النهائي
export async function advanceKnockoutNextRound(tournamentId: string) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  return await prisma.$transaction(async (tx: any) => {
    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        matches: {
          where: { stage: { not: "GROUP" } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!tournament) throw new Error("البطولة غير موجودة");

    const stagesOrder: MatchStage[] = ["ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "FINAL"];
    const currentMatches = tournament.matches;

    let latestStage: MatchStage | null = null;
    for (const st of stagesOrder) {
      if (currentMatches.some((m: any) => m.stage === st)) {
        latestStage = st;
      }
    }

    if (!latestStage) throw new Error("لم يتم بدء الأدوار الإقصائية بعد");

    const matchesOfCurrentStage = currentMatches.filter((m: any) => m.stage === latestStage);
    const incomplete = matchesOfCurrentStage.some((m: any) => !m.isCompleted || !m.winnerId);

    if (incomplete) {
      throw new Error("يجب تسجيل نتائج جميع مباريات الدور الحالي لتحديد الفائزين قبل إجراء قرعة الدور التالي");
    }

    const winnerIds = matchesOfCurrentStage.map((m: any) => m.winnerId);

    if (latestStage === "SEMI_FINAL") {
      // مباراة النهائي
      await tx.tournamentMatch.create({
        data: {
          tournamentId,
          stage: "FINAL",
          roundNumber: 3,
          matchNumber: 1,
          player1Id: winnerIds[0],
          player2Id: winnerIds[1],
          status: "SCHEDULED",
        },
      });

      // مباراة المركز الثالث
      const loserIds = matchesOfCurrentStage.map((m: any) =>
        m.player1Id === m.winnerId ? m.player2Id : m.player1Id
      );

      if (loserIds[0] && loserIds[1]) {
        await tx.tournamentMatch.create({
          data: {
            tournamentId,
            stage: "THIRD_PLACE",
            roundNumber: 3,
            matchNumber: 2,
            player1Id: loserIds[0],
            player2Id: loserIds[1],
            status: "SCHEDULED",
          },
        });
      }
    } else if (latestStage === "ROUND_OF_16" || latestStage === "QUARTER_FINAL") {
      const nextStage: MatchStage = latestStage === "ROUND_OF_16" ? "QUARTER_FINAL" : "SEMI_FINAL";
      const shuffledWinners = [...winnerIds].sort(() => Math.random() - 0.5);

      let matchNum = 1;
      for (let i = 0; i < shuffledWinners.length; i += 2) {
        await tx.tournamentMatch.create({
          data: {
            tournamentId,
            stage: nextStage,
            roundNumber: latestStage === "ROUND_OF_16" ? 2 : 3,
            matchNumber: matchNum++,
            player1Id: shuffledWinners[i] ?? null,
            player2Id: shuffledWinners[i + 1] ?? null,
            status: "SCHEDULED",
          },
        });
      }
    } else {
      throw new Error("وصلت البطولة للمباراة النهائية بالفعل!");
    }

    revalidatePath(`/tournaments/${tournamentId}`);
    return true;
  });
}

// 4. تسجيل نتيجة المباراة وتحديث الترتيب
export async function recordMatchScore(input: {
  matchId: string;
  player1Score: number;
  player2Score: number;
  winnerId?: string;
}) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  return await prisma.$transaction(async (tx: any) => {
    const match = await tx.tournamentMatch.findUnique({
      where: { id: input.matchId },
      include: { tournament: true },
    });

    if (!match || !match.player1Id || !match.player2Id) {
      throw new Error("المباراة غير صالحة");
    }

    const p1Score = Number(input.player1Score);
    const p2Score = Number(input.player2Score);

    let winnerId: string | null = null;
    if (p1Score > p2Score) winnerId = match.player1Id;
    else if (p2Score > p1Score) winnerId = match.player2Id;
    else winnerId = input.winnerId || null;

    await tx.tournamentMatch.update({
      where: { id: input.matchId },
      data: {
        player1Score: p1Score,
        player2Score: p2Score,
        isCompleted: true,
        status: "COMPLETED",
        winnerId,
      },
    });

    if (match.stage === "GROUP") {
      const allLeagueMatches = await tx.tournamentMatch.findMany({
        where: { tournamentId: match.tournamentId, stage: "GROUP", isCompleted: true },
      });

      const statsMap: Record<string, { played: number; won: number; drawn: number; lost: number; gf: number; ga: number; pts: number }> = {};

      for (const m of allLeagueMatches) {
        if (!m.player1Id || !m.player2Id || m.player1Score === null || m.player2Score === null) continue;

        if (!statsMap[m.player1Id]) statsMap[m.player1Id] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };
        if (!statsMap[m.player2Id]) statsMap[m.player2Id] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };

        statsMap[m.player1Id].played++;
        statsMap[m.player2Id].played++;
        statsMap[m.player1Id].gf += m.player1Score;
        statsMap[m.player1Id].ga += m.player2Score;
        statsMap[m.player2Id].gf += m.player2Score;
        statsMap[m.player2Id].ga += m.player1Score;

        if (m.player1Score > m.player2Score) {
          statsMap[m.player1Id].won++;
          statsMap[m.player1Id].pts += 3;
          statsMap[m.player2Id].lost++;
        } else if (m.player2Score > m.player1Score) {
          statsMap[m.player2Id].won++;
          statsMap[m.player2Id].pts += 3;
          statsMap[m.player1Id].lost++;
        } else {
          statsMap[m.player1Id].drawn++;
          statsMap[m.player2Id].drawn++;
          statsMap[m.player1Id].pts += 1;
          statsMap[m.player2Id].pts += 1;
        }
      }

      for (const [playerId, s] of Object.entries(statsMap)) {
        await tx.tournamentParticipant.update({
          where: { id: playerId },
          data: {
            played: s.played,
            won: s.won,
            drawn: s.drawn,
            lost: s.lost,
            goalsFor: s.gf,
            goalsAgainst: s.ga,
            goalDiff: s.gf - s.ga,
            points: s.pts,
          },
        });
      }
    }

    if (match.stage === "FINAL" && winnerId) {
      await tx.tournament.update({
        where: { id: match.tournamentId },
        data: { status: "COMPLETED" },
      });
    }

    revalidatePath(`/tournaments/${match.tournamentId}`);
    return true;
  });
}

export async function toggleParticipantQualification(participantId: string, isQualified: boolean) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  const updated = await (prisma as any).tournamentParticipant.update({
    where: { id: participantId },
    data: { isQualified },
  });

  revalidatePath(`/tournaments/${updated.tournamentId}`);
  return updated;
}