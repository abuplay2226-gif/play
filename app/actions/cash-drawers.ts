"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type CounterpartyType = "GENERAL" | "CUSTOMER" | "SUPPLIER" | "EMPLOYEE" | "MANAGEMENT";

export async function getCashDrawers() {
  return prisma.cashDrawer.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createCashDrawer(input: { name: string; balance?: number }) {
  const name = input.name.trim();
  if (!name) throw new Error("اسم الخزينة مطلوب");

  const existing = await prisma.cashDrawer.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
    },
  });

  if (existing) throw new Error("اسم الخزينة موجود بالفعل");

  const drawer = await prisma.cashDrawer.create({
    data: {
      name,
      balance: input.balance ?? 0,
    },
  });

  revalidatePath("/cash-drawers");
  revalidatePath("/");
  return drawer;
}

export async function deleteCashDrawer(id: string) {
  if (!id) throw new Error("معرف الخزينة مطلوب");

  const drawer = await prisma.cashDrawer.findUnique({
    where: { id },
    include: { shifts: true },
  });

  if (!drawer) throw new Error("الخزينة غير موجودة");

  if (drawer.balance !== 0 || drawer.shifts.some((shift) => shift.status === "OPEN")) {
    throw new Error("لا يمكن حذف الخزينة إلا إذا كان رصيدها صفراً ومغلقة");
  }

  await prisma.cashDrawer.delete({ where: { id } });

  revalidatePath("/cash-drawers");
  revalidatePath("/");
  return drawer;
}

export async function createCashMovement(input: {
  cashDrawerId: string;
  type: "INCOME" | "EXPENSE" | "ADJUSTMENT";
  amount: number | string;
  description: string;
  shiftId?: string | null;
  counterpartyType?: CounterpartyType;
  customerId?: string | null;
  supplierId?: string | null;
  counterpartyName?: string | null;
}) {
  const cashDrawerId = input.cashDrawerId?.trim();
  const description = input.description?.trim();
  const amount = Number(input.amount ?? 0);
  const counterpartyType = input.counterpartyType ?? "GENERAL";
  const counterpartyName = input.counterpartyName?.trim() || null;

  if (!cashDrawerId) throw new Error("يرجى تحديد الخزينة");
  if (!description) throw new Error("يرجى كتابة بيان ووصف السند");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("المبلغ يجب أن يكون أكبر من صفر");
  }

  if (counterpartyType === "CUSTOMER" && !input.customerId && !counterpartyName) {
    throw new Error("يجب اختيار عميل من القائمة أو كتابة اسمه");
  }

  if (counterpartyType === "SUPPLIER" && !input.supplierId && !counterpartyName) {
    throw new Error("يجب اختيار مورد من القائمة أو كتابة اسمه");
  }

  if (counterpartyType === "EMPLOYEE" && !counterpartyName) {
    throw new Error("يرجى تحديد اسم الموظف المستلم للسلفة");
  }

  const drawer = await prisma.cashDrawer.findUnique({ where: { id: cashDrawerId } });
  if (!drawer) throw new Error("الخزينة غير موجودة");

  const direction = input.type === "EXPENSE" ? -1 : 1;

  const transaction = await prisma.$transaction(async (tx) => {
    // 1. تحديث رصيد الخزينة
    await tx.cashDrawer.update({
      where: { id: cashDrawerId },
      data: {
        balance: {
          increment: Number((amount * direction).toFixed(2)),
        },
      },
    });

    // 2. إذا كان سداد لمورد نخفض المستحق له
    if (counterpartyType === "SUPPLIER" && input.supplierId) {
      await tx.supplier.update({
        where: { id: input.supplierId },
        data: {
          balance: {
            decrement: input.type === "EXPENSE" ? Number(amount.toFixed(2)) : -Number(amount.toFixed(2)),
          },
        },
      });
    }

    // 3. إذا كان تحصيل دين من عميل نخفض دينه
    if (counterpartyType === "CUSTOMER" && input.customerId) {
      await tx.customer.update({
        where: { id: input.customerId },
        data: {
          debt: {
            decrement: input.type === "INCOME" ? Number(amount.toFixed(2)) : -Number(amount.toFixed(2)),
          },
        },
      });
    }

    // 4. تسجيل قيد المعاملة المالية
    return tx.financialTransaction.create({
      data: {
        cashDrawerId,
        shiftId: input.shiftId ?? null,
        customerId: counterpartyType === "CUSTOMER" ? (input.customerId ?? null) : null,
        supplierId: counterpartyType === "SUPPLIER" ? (input.supplierId ?? null) : null,
        counterpartyType: String(counterpartyType),
        counterpartyName: counterpartyName,
        type: input.type,
        amount: Number(amount.toFixed(2)),
        description,
      },
    });
  });

  revalidatePath("/cash-drawers");
  revalidatePath("/suppliers");
  revalidatePath("/customers");
  revalidatePath("/financial");
  revalidatePath("/shifts");
  revalidatePath("/");
  return transaction;
}

export async function updateCashMovement(input: {
  transactionId: string;
  cashDrawerId: string;
  type: "INCOME" | "EXPENSE" | "ADJUSTMENT";
  amount: number | string;
  description: string;
  counterpartyType?: CounterpartyType;
  customerId?: string | null;
  supplierId?: string | null;
  counterpartyName?: string | null;
}) {
  const transactionId = input.transactionId;
  const newDrawerId = input.cashDrawerId?.trim();
  const description = input.description?.trim();
  const newAmount = Number(input.amount ?? 0);
  const newType = input.type;
  const counterpartyType = input.counterpartyType ?? "GENERAL";
  const counterpartyName = input.counterpartyName?.trim() || null;

  if (!transactionId) throw new Error("معرف السند مطلوب");
  if (!newDrawerId) throw new Error("يرجى تحديد الخزينة");
  if (!description) throw new Error("يرجى كتابة بيان ووصف السند");
  if (!Number.isFinite(newAmount) || newAmount <= 0) {
    throw new Error("المبلغ يجب أن يكون أكبر من صفر");
  }

  return await prisma.$transaction(async (tx) => {
    const oldTx = await tx.financialTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!oldTx) throw new Error("السند غير موجود");

    if (oldTx.type === "SHIFT_OPEN" || oldTx.type === "SHIFT_CLOSE") {
      throw new Error("لا يمكن تعديل حركات فتح وإغلاق الورديات");
    }

    // 1. عكس التأثير المالي القديم
    const oldAmount = oldTx.amount;
    const oldIsExpense = oldTx.type === "EXPENSE";

    if (oldTx.cashDrawerId) {
      await tx.cashDrawer.update({
        where: { id: oldTx.cashDrawerId },
        data: {
          balance: {
            increment: oldIsExpense ? oldAmount : -oldAmount,
          },
        },
      });
    }

    if (oldTx.counterpartyType === "SUPPLIER" && oldTx.supplierId) {
      await tx.supplier.update({
        where: { id: oldTx.supplierId },
        data: {
          balance: {
            increment: oldIsExpense ? oldAmount : -oldAmount,
          },
        },
      });
    }

    if (oldTx.counterpartyType === "CUSTOMER" && oldTx.customerId) {
      await tx.customer.update({
        where: { id: oldTx.customerId },
        data: {
          debt: {
            increment: !oldIsExpense ? oldAmount : -oldAmount,
          },
        },
      });
    }

    // 2. تطبيق التأثير المالي الجديد
    const newIsExpense = newType === "EXPENSE";
    const direction = newIsExpense ? -1 : 1;

    await tx.cashDrawer.update({
      where: { id: newDrawerId },
      data: {
        balance: {
          increment: Number((newAmount * direction).toFixed(2)),
        },
      },
    });

    if (counterpartyType === "SUPPLIER" && input.supplierId) {
      await tx.supplier.update({
        where: { id: input.supplierId },
        data: {
          balance: {
            decrement: newIsExpense ? Number(newAmount.toFixed(2)) : -Number(newAmount.toFixed(2)),
          },
        },
      });
    }

    if (counterpartyType === "CUSTOMER" && input.customerId) {
      await tx.customer.update({
        where: { id: input.customerId },
        data: {
          debt: {
            decrement: !newIsExpense ? Number(newAmount.toFixed(2)) : -Number(newAmount.toFixed(2)),
          },
        },
      });
    }

    // 3. تحديث السجل
    const updated = await tx.financialTransaction.update({
      where: { id: transactionId },
      data: {
        cashDrawerId: newDrawerId,
        customerId: counterpartyType === "CUSTOMER" ? (input.customerId ?? null) : null,
        supplierId: counterpartyType === "SUPPLIER" ? (input.supplierId ?? null) : null,
        counterpartyType: String(counterpartyType),
        counterpartyName: counterpartyName,
        type: newType,
        amount: Number(newAmount.toFixed(2)),
        description,
      },
    });

    revalidatePath("/cash-drawers");
    revalidatePath("/suppliers");
    revalidatePath("/customers");
    revalidatePath("/financial");
    revalidatePath("/shifts");
    revalidatePath("/");
    return updated;
  });
}

export async function deleteCashMovement(transactionId: string) {
  if (!transactionId) throw new Error("معرف السند مطلوب");

  return await prisma.$transaction(async (tx) => {
    const transaction = await tx.financialTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) throw new Error("السند غير موجود");

    if (transaction.type === "SHIFT_OPEN" || transaction.type === "SHIFT_CLOSE") {
      throw new Error("لا يمكن حذف حركات فتح وإغلاق الورديات");
    }

    const amount = transaction.amount;
    const isExpense = transaction.type === "EXPENSE";

    if (transaction.cashDrawerId) {
      await tx.cashDrawer.update({
        where: { id: transaction.cashDrawerId },
        data: {
          balance: {
            increment: isExpense ? amount : -amount,
          },
        },
      });
    }

    if (transaction.counterpartyType === "SUPPLIER" && transaction.supplierId) {
      await tx.supplier.update({
        where: { id: transaction.supplierId },
        data: {
          balance: {
            increment: isExpense ? amount : -amount,
          },
        },
      });
    }

    if (transaction.counterpartyType === "CUSTOMER" && transaction.customerId) {
      await tx.customer.update({
        where: { id: transaction.customerId },
        data: {
          debt: {
            increment: !isExpense ? amount : -amount,
          },
        },
      });
    }

    await tx.financialTransaction.delete({
      where: { id: transactionId },
    });

    revalidatePath("/cash-drawers");
    revalidatePath("/suppliers");
    revalidatePath("/customers");
    revalidatePath("/financial");
    revalidatePath("/shifts");
    revalidatePath("/");
    return true;
  });
}