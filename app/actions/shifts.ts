"use server";

import { revalidatePath } from "next/cache";

import { assertAuthorized } from "@/lib/auth-guard";
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
      transactions: true,
      orders: true,
    },
    orderBy: { openedAt: "desc" },
  });
}

export async function openShift(input: {
  userId: string;
  cashDrawerId: string;
  openingBalance: number;
}) {
  await assertAuthorized(["ADMIN", "CASHIER"]);

  if (!input.userId || !input.cashDrawerId) {
    throw new Error("بيانات المستخدم والخزينة مطلوبة");
  }

  return await prisma.$transaction(async (tx) => {
    const activeShift = await tx.shift.findFirst({
      where: {
        userId: input.userId,
        status: "OPEN",
      },
    });

    if (activeShift) {
      throw new Error("يوجد وردية مفتوحة لهذا المستخدم بالفعل");
    }

    const cashDrawer = await tx.cashDrawer.findUnique({
      where: { id: input.cashDrawerId },
    });

    if (!cashDrawer) {
      throw new Error("الخزينة غير موجودة");
    }

    const shift = await tx.shift.create({
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

    await tx.financialTransaction.create({
      data: {
        cashDrawerId: input.cashDrawerId,
        shiftId: shift.id,
        type: "SHIFT_OPEN",
        amount: Number(input.openingBalance),
        description: `فتح وردية للمستخدم ${shift.user.name ?? shift.user.email}`,
      },
    });

    await tx.cashDrawer.update({
      where: { id: input.cashDrawerId },
      data: { balance: Number(input.openingBalance) },
    });

    revalidatePath("/shifts");
    revalidatePath("/");
    return shift;
  });
}

export async function closeShift(input: {
  shiftId: string;
  closingBalance: number;
  actualCash?: number;
}) {
  await assertAuthorized(["ADMIN", "CASHIER"]);

  if (!input.shiftId) {
    throw new Error("معرف الوردية مطلوب");
  }

  return await prisma.$transaction(async (tx) => {
    const shift = await tx.shift.findUnique({
      where: { id: input.shiftId },
      include: { cashDrawer: true },
    });

    if (!shift) throw new Error("الوردية غير موجودة");
    if (shift.status === "CLOSED") throw new Error("الوردية مغلقة بالفعل");

    const updatedShift = await tx.shift.update({
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

    await tx.financialTransaction.create({
      data: {
        cashDrawerId: shift.cashDrawerId,
        shiftId: shift.id,
        type: "SHIFT_CLOSE",
        amount: Number(input.closingBalance),
        description: `إغلاق الوردية - النقدية الفعلية: ${input.actualCash ?? input.closingBalance}`,
      },
    });

    revalidatePath("/shifts");
    revalidatePath("/");
    return updatedShift;
  });
}