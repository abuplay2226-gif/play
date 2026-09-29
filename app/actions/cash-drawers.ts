"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export async function getCashDrawers() {
  return prisma.cashDrawer.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createCashDrawer(input: { name: string; balance?: number }) {
  const name = input.name.trim();

  if (!name) {
    throw new Error("اسم الخزينة مطلوب");
  }

  const existing = await prisma.cashDrawer.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
  });

  if (existing) {
    throw new Error("اسم الخزينة موجود بالفعل");
  }

  const drawer = await prisma.cashDrawer.create({
    data: {
      name,
      balance: input.balance ?? 0,
    },
  });

  revalidatePath("/");
  return drawer;
}

export async function updateCashDrawer(id: string, input: { name: string }) {
  const name = input.name.trim();

  if (!id) {
    throw new Error("معرف الخزينة مطلوب");
  }

  if (!name) {
    throw new Error("اسم الخزينة مطلوب");
  }

  const existing = await prisma.cashDrawer.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },
      NOT: { id },
    },
  });

  if (existing) {
    throw new Error("اسم الخزينة موجود بالفعل");
  }

  const drawer = await prisma.cashDrawer.update({
    where: { id },
    data: { name },
  });

  revalidatePath("/");
  return drawer;
}

export async function deleteCashDrawer(id: string) {
  if (!id) {
    throw new Error("معرف الخزينة مطلوب");
  }

  const drawer = await prisma.cashDrawer.findUnique({
    where: { id },
    include: {
      transactions: true,
      shifts: true,
    },
  });

  if (!drawer) {
    throw new Error("الخزينة غير موجودة");
  }

  if (drawer.balance !== 0 || drawer.shifts.some((shift) => shift.status === "OPEN")) {
    throw new Error("لا يمكن حذف الخزينة إلا إذا كانت فارغة ومغلقة");
  }

  await prisma.cashDrawer.delete({
    where: { id },
  });

  revalidatePath("/");
  return drawer;
}

export async function updateCashDrawerBalance(id: string, amount: number) {
  if (!id) {
    throw new Error("معرف الخزينة مطلوب");
  }

  const drawer = await prisma.cashDrawer.update({
    where: { id },
    data: {
      balance: {
        increment: amount,
      },
    },
  });

  revalidatePath("/");
  return drawer;
}

export async function getCashDrawerTransactions(cashDrawerId?: string) {
  const where = cashDrawerId ? { cashDrawerId } : undefined;

  return prisma.financialTransaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

export async function createCashMovement(input: {
  cashDrawerId: string;
  type: "INCOME" | "EXPENSE" | "ADJUSTMENT";
  amount: number | string;
  description: string;
  shiftId?: string | null;
  counterpartyType?: "GENERAL" | "CUSTOMER" | "SUPPLIER";
  customerId?: string | null;
  supplierId?: string | null;
  counterpartyName?: string | null;
}) {
  const cashDrawerId = input.cashDrawerId?.trim();
  const description = input.description?.trim();
  const amount = Number(input.amount ?? 0);
  const counterpartyType = input.counterpartyType ?? "GENERAL";
  const counterpartyName = input.counterpartyName?.trim() || null;

  if (!cashDrawerId) {
    throw new Error("معرف الخزينة مطلوب");
  }

  if (!description) {
    throw new Error("وصف السند مطلوب");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("المبلغ يجب أن يكون أكبر من صفر");
  }

  if (counterpartyType === "CUSTOMER" && !input.customerId && !counterpartyName) {
    throw new Error("يجب اختيار عميل أو كتابة اسم العميل");
  }

  if (counterpartyType === "SUPPLIER" && !input.supplierId && !counterpartyName) {
    throw new Error("يجب اختيار مورد أو كتابة اسم المورد");
  }

  const drawer = await prisma.cashDrawer.findUnique({ where: { id: cashDrawerId } });

  if (!drawer) {
    throw new Error("الخزينة غير موجودة");
  }

  const direction = input.type === "EXPENSE" ? -1 : 1;

  const transaction = await prisma.$transaction(async (tx) => {
    await tx.cashDrawer.update({
      where: { id: cashDrawerId },
      data: {
        balance: {
          increment: Number((amount * direction).toFixed(2)),
        },
      },
    });

    return tx.financialTransaction.create({
      data: {
        cashDrawerId,
        shiftId: input.shiftId ?? null,
        customerId: input.counterpartyType === "CUSTOMER" ? (input.customerId ?? null) : null,
        supplierId: input.counterpartyType === "SUPPLIER" ? (input.supplierId ?? null) : null,
        counterpartyType,
        counterpartyName:
          input.counterpartyType === "GENERAL" ? input.counterpartyName ?? null : null,
        type: input.type,
        amount: Number(amount.toFixed(2)),
        description,
      },
      include: {
        shift: true,
      },
    });
  });

  revalidatePath("/");
  return transaction;
}
