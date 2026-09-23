"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import type { PaymentMethod } from "@prisma/client";

const toNumber = (value: number | string | null | undefined) => Number(value ?? 0);

function normalizeItems(items: Array<{ productId: string; quantity: number; unitPrice?: number | string | null }>) {
  return items
    .filter((item) => item && item.productId && Number(item.quantity ?? 0) > 0)
    .map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      unitPrice: toNumber(item.unitPrice),
    }));
}

async function assertValidShift(shiftId: string) {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: { cashDrawer: true },
  });

  if (!shift) {
    throw new Error("الوردية غير موجودة");
  }

  if (shift.status !== "OPEN") {
    throw new Error("لا توجد وردية مفتوحة للمعاملة");
  }

  if (!shift.cashDrawerId) {
    throw new Error("لا توجد خزينة مرتبطة بالوردية");
  }

  return shift;
}

export async function getCategories() {
  return prisma.category.findMany({
    include: { products: true },
    orderBy: { name: "asc" },
  });
}

export async function createCategory(input: { name: string }) {
  const name = input.name.trim();

  if (!name) {
    throw new Error("اسم التصنيف مطلوب");
  }

  const category = await prisma.category.create({
    data: { name },
  });

  revalidatePath("/");
  return category;
}

export async function getProducts() {
  return prisma.product.findMany({
    include: { category: true },
    orderBy: { name: "asc" },
  });
}

export async function getProductsByCategory(categoryId: string) {
  return prisma.product.findMany({
    where: { categoryId },
    include: { category: true },
    orderBy: { name: "asc" },
  });
}

export async function createProduct(input: {
  categoryId: string;
  name: string;
  barcode?: string | null;
  sellPrice: number | string;
  costPrice?: number | string;
  stockQuantity?: number | string;
  minStockAlert?: number | string;
}) {
  const name = input.name.trim();

  if (!name) {
    throw new Error("اسم المنتج مطلوب");
  }

  if (!input.categoryId) {
    throw new Error("التصنيف مطلوب");
  }

  const product = await prisma.product.create({
    data: {
      categoryId: input.categoryId,
      name,
      barcode: input.barcode?.trim() || null,
      sellPrice: toNumber(input.sellPrice),
      costPrice: toNumber(input.costPrice),
      stockQuantity: toNumber(input.stockQuantity),
      minStockAlert: toNumber(input.minStockAlert),
    },
  });

  revalidatePath("/");
  return product;
}

export async function updateProductStock(productId: string, deltaQty: number) {
  if (!productId) {
    throw new Error("معرف المنتج مطلوب");
  }

  const product = await prisma.product.update({
    where: { id: productId },
    data: {
      stockQuantity: {
        increment: Number(deltaQty),
      },
    },
  });

  revalidatePath("/");
  return product;
}

export async function createOrder(input: {
  shiftId: string;
  sessionId?: string | null;
  paymentMethod?: PaymentMethod;
  items: Array<{ productId: string; quantity: number; unitPrice?: number | string | null }>;
}) {
  if (!input.shiftId) {
    throw new Error("معرف الوردية مطلوب");
  }

  const items = normalizeItems(input.items);

  if (items.length === 0) {
    throw new Error("يجب إضافة منتج واحد على الأقل للطلب");
  }

  const shift = await assertValidShift(input.shiftId);

  if (input.sessionId) {
    const session = await prisma.deviceSession.findUnique({
      where: { id: input.sessionId },
    });

    if (!session) {
      throw new Error("الجلسة غير موجودة");
    }

    if (session.shiftId !== input.shiftId) {
      throw new Error("الجلسة لا تنتمي إلى نفس الوردية");
    }
  }

  const orderStatus = input.sessionId ? "PENDING" : "PAID";
  const paymentMethod = input.paymentMethod ?? (input.sessionId ? null : "CASH");

  const details = await Promise.all(
    items.map(async (item) => {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new Error("إحدى المنتجات غير موجودة");
      }

      if (product.stockQuantity < item.quantity) {
        throw new Error(`المخزون غير كافي لـ ${product.name}`);
      }

      const unitPrice = item.unitPrice > 0 ? item.unitPrice : product.sellPrice;

      return {
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: Number(unitPrice),
        subTotal: Number((item.quantity * Number(unitPrice)).toFixed(2)),
      };
    }),
  );

  const totalAmount = Number(details.reduce((sum, item) => sum + item.subTotal, 0).toFixed(2));

  const createdOrder = await prisma.$transaction(async (tx) => {
    for (const detail of details) {
      await tx.product.update({
        where: { id: detail.productId },
        data: {
          stockQuantity: {
            decrement: detail.quantity,
          },
        },
      });
    }

    return tx.order.create({
      data: {
        shiftId: input.shiftId,
        sessionId: input.sessionId ?? null,
        totalAmount,
        paymentMethod: paymentMethod ?? undefined,
        status: orderStatus,
        items: {
          create: details.map((detail) => ({
            productId: detail.productId,
            quantity: detail.quantity,
            unitPrice: detail.unitPrice,
            subTotal: detail.subTotal,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  });

  revalidatePath("/");
  return createdOrder;
}

export async function cancelOrder(orderId: string) {
  if (!orderId) {
    throw new Error("معرف الطلب مطلوب");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new Error("الطلب غير موجود");
  }

  if (order.status === "CANCELLED") {
    throw new Error("الطلب ملغي بالفعل");
  }

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: {
            increment: item.quantity,
          },
        },
      });
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
      },
    });
  });

  revalidatePath("/");
  return true;
}

export async function updateOrderItems(
  orderId: string,
  nextItems: Array<{ productId: string; quantity: number; unitPrice?: number | string | null }>,
) {
  if (!orderId) {
    throw new Error("معرف الطلب مطلوب");
  }

  const normalized = normalizeItems(nextItems);

  if (normalized.length === 0) {
    throw new Error("يجب أن يحتوي الطلب على منتج واحد على الأقل");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new Error("الطلب غير موجود");
  }

  const currentByProduct = new Map(order.items.map((item) => [item.productId, item]));

  await prisma.$transaction(async (tx) => {
    for (const existing of order.items) {
      const nextItem = normalized.find((item) => item.productId === existing.productId);
      if (!nextItem) {
        await tx.product.update({
          where: { id: existing.productId },
          data: { stockQuantity: { increment: existing.quantity } },
        });
      } else if (nextItem.quantity !== existing.quantity) {
        const diff = nextItem.quantity - existing.quantity;
        if (diff > 0) {
          const product = await tx.product.findUnique({ where: { id: existing.productId } });
          if (!product || product.stockQuantity < diff) {
            throw new Error(`المخزون غير كافي لـ ${product?.name ?? "المنتج"}`);
          }
        }
        await tx.product.update({
          where: { id: existing.productId },
          data: { stockQuantity: { increment: -diff } },
        });
      }
    }

    for (const item of normalized) {
      if (!currentByProduct.has(item.productId)) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || product.stockQuantity < item.quantity) {
          throw new Error(`المخزون غير كافي لـ ${product?.name ?? "المنتج"}`);
        }
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }
    }

    await tx.orderItem.deleteMany({ where: { orderId } });

    const total = await Promise.all(
      normalized.map(async (item) => {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        const unitPrice = item.unitPrice > 0 ? item.unitPrice : product?.sellPrice ?? 0;
        const subTotal = Number((item.quantity * Number(unitPrice)).toFixed(2));

        await tx.orderItem.create({
          data: {
            orderId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: Number(unitPrice),
            subTotal,
          },
        });

        return subTotal;
      }),
    );

    await tx.order.update({
      where: { id: orderId },
      data: {
        totalAmount: Number(total.reduce((sum, value) => sum + value, 0).toFixed(2)),
      },
    });
  });

  revalidatePath("/");
  return true;
}

export async function getOrdersByShift(shiftId: string) {
  return prisma.order.findMany({
    where: { shiftId },
    include: {
      items: { include: { product: true } },
      session: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
