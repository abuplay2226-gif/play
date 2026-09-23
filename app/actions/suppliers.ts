"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

const toNumber = (value: number | string | null | undefined) => Number(value ?? 0);

export async function getSuppliers() {
  return prisma.supplier.findMany({
    include: {
      purchases: {
        include: {
          items: { include: { product: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function createSupplier(input: { name: string; phone?: string | null; balance?: number | string }) {
  const name = input.name.trim();

  if (!name) {
    throw new Error("اسم المورد مطلوب");
  }

  const supplier = await prisma.supplier.create({
    data: {
      name,
      phone: input.phone?.trim() || null,
      balance: toNumber(input.balance),
    },
  });

  revalidatePath("/");
  return supplier;
}

export async function createPurchaseInvoice(input: {
  supplierId: string;
  invoiceDate?: Date | string;
  paidAmount?: number | string;
  items: Array<{ productId: string; quantity: number; unitCost?: number | string }>; 
}) {
  if (!input.supplierId) {
    throw new Error("معرف المورد مطلوب");
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error("يجب إدخال عنصر واحد على الأقل في الفاتورة");
  }

  const supplierExists = await prisma.supplier.findUnique({
    where: { id: input.supplierId },
  });

  if (!supplierExists) {
    throw new Error("المورد غير موجود");
  }

  const validatedItems = input.items
    .filter((item) => item && item.productId && Number(item.quantity ?? 0) > 0)
    .map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      unitCost: toNumber(item.unitCost),
    }));

  if (validatedItems.length === 0) {
    throw new Error("لا توجد أصناف صالحة في الفاتورة");
  }

  const invoiceTotal = validatedItems.reduce((sum, item) => {
    return sum + item.quantity * item.unitCost;
  }, 0);

  const paidAmount = toNumber(input.paidAmount);

  const invoice = await prisma.$transaction(async (tx) => {
    const createdInvoice = await tx.purchaseInvoice.create({
      data: {
        supplierId: input.supplierId,
        invoiceDate: input.invoiceDate ? new Date(input.invoiceDate) : new Date(),
        totalAmount: Number(invoiceTotal.toFixed(2)),
        paidAmount: Number(paidAmount.toFixed(2)),
        items: {
          create: validatedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: Number(item.unitCost.toFixed(2)),
          })),
        },
      },
      include: { items: true },
    });

    for (const item of validatedItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: {
            increment: item.quantity,
          },
          costPrice: Number(item.unitCost.toFixed(2)),
        },
      });
    }

    const newBalance = Number((supplierExists.balance + (invoiceTotal - paidAmount)).toFixed(2));
    await tx.supplier.update({
      where: { id: input.supplierId },
      data: {
        balance: newBalance,
      },
    });

    return createdInvoice;
  });

  revalidatePath("/");
  return invoice;
}

export async function getPurchaseInvoices() {
  return prisma.purchaseInvoice.findMany({
    include: {
      supplier: true,
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { invoiceDate: "desc" },
  });
}
