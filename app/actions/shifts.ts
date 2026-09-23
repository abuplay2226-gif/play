"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export async function getOpenShiftForDrawer(cashDrawerId: string) {
  return prisma.shift.findFirst({
    where: {
      cashDrawerId,
      status: "OPEN",
    },
    include: {
      user: true,
      cashDrawer: true,
    },
    orderBy: { openedAt: "desc" },
  });
}

export async function getAllShifts() {
  return prisma.shift.findMany({
    include: {
      user: true,
      cashDrawer: true,
    },
    orderBy: { openedAt: "desc" },
  });
}

export async function openShift(input: {
  userId: string;
  cashDrawerId: string;
  openingBalance: number;
}) {
  if (!input.userId || !input.cashDrawerId) {
    throw new Error("بيانات المستخدم والخزينة مطلوبة");
  }

  const activeShift = await prisma.shift.findFirst({
    where: {
      userId: input.userId,
      status: "OPEN",
    },
  });

  if (activeShift) {
    throw new Error("يوجد وردية مفتوحة لهذا المستخدم بالفعل");
  }

  const cashDrawer = await prisma.cashDrawer.findUnique({
    where: { id: input.cashDrawerId },
  });

  if (!cashDrawer) {
    throw new Error("الخزينة غير موجودة");
  }

  const shift = await prisma.shift.create({
    data: {
      userId: input.userId,
      cashDrawerId: input.cashDrawerId,
      openingBalance: Number(input.openingBalance),
      status: "OPEN",
    },
    include: {
      user: true,
      cashDrawer: true,
    },
  });

  await prisma.financialTransaction.create({
    data: {
      cashDrawerId: input.cashDrawerId,
      shiftId: shift.id,
      type: "SHIFT_OPEN",
      amount: Number(input.openingBalance),
      description: "فتح وردية جديدة",
    },
  });

  await prisma.cashDrawer.update({
    where: { id: input.cashDrawerId },
    data: { balance: Number(input.openingBalance) },
  });

  revalidatePath("/");
  return shift;
}

export async function closeShift(input: {
  shiftId: string;
  closingBalance: number;
  actualCash?: number;
}) {
  if (!input.shiftId) {
    throw new Error("معرف الوردية مطلوب");
  }

  const shift = await prisma.shift.findUnique({
    where: { id: input.shiftId },
    include: { cashDrawer: true },
  });

  if (!shift) {
    throw new Error("الوردية غير موجودة");
  }

  if (shift.status === "CLOSED") {
    throw new Error("الوردية مغلقة بالفعل");
  }

  const updatedShift = await prisma.shift.update({
    where: { id: input.shiftId },
    data: {
      status: "CLOSED",
      closingBalance: Number(input.closingBalance),
      actualCash: input.actualCash ?? Number(input.closingBalance),
      closedAt: new Date(),
    },
    include: {
      user: true,
      cashDrawer: true,
    },
  });

  await prisma.financialTransaction.create({
    data: {
      cashDrawerId: shift.cashDrawerId,
      shiftId: shift.id,
      type: "SHIFT_CLOSE",
      amount: Number(input.closingBalance),
      description: "إغلاق الوردية",
    },
  });

  revalidatePath("/");
  return updatedShift;
}
