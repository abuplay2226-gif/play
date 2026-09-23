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

  const drawer = await prisma.cashDrawer.create({
    data: {
      name,
      balance: input.balance ?? 0,
    },
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
