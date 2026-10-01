"use server";

import { revalidatePath } from "next/cache";

import { assertAuthorized } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import type { PaymentMethod } from "@prisma/client";

const toNumber = (value: number | string | null | undefined) => Number(value ?? 0);

function normalizeItems(
  items: Array<{ productId: string; quantity: number; unitPrice?: number | string | null }>
) {
  return items
    .filter((item) => item && item.productId && Number(item.quantity ?? 0) > 0)
    .map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      unitPrice: toNumber(item.unitPrice),
    }));
}

export async function getCategories() {
  return prisma.category.findMany({
    include: { products: true },
    orderBy: { name: "asc" },
  });
}

export async function createCategory(input: { name: string }) {
  await assertAuthorized(["ADMIN"]);
  const name = input.name.trim();
  if (!name) throw new Error("اسم التصنيف مطلوب");

  const category = await prisma.category.create({ data: { name } });
  revalidatePath("/pos");
  revalidatePath("/inventory");
  return category;
}

export async function getProducts() {
  return prisma.product.findMany({
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
  await assertAuthorized(["ADMIN"]);
  const name = input.name.trim();

  if (!name || !input.categoryId) {
    throw new Error("اسم المنتج وتصنيفه مطلوبان");
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

  revalidatePath("/pos");
  revalidatePath("/inventory");
  return product;
}

// إنشاء الطلب مع دعم تحديد الخزينة التي يورد إليها الكاش (targetCashDrawerId)
export async function createOrder(input: {
  shiftId: string;
  sessionId?: string | null;
  paymentMethod?: PaymentMethod;
  targetCashDrawerId?: string; // الخزينة المحددة لتوريد النقدية
  items: Array<{ productId: string; quantity: number; unitPrice?: number | string | null }>;
}) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  const items = normalizeItems(input.items);
  if (items.length === 0) throw new Error("يجب إضافة صنف واحد على الأقل");

  const shift = await prisma.shift.findUnique({
    where: { id: input.shiftId },
    include: { cashDrawer: true },
  });

  if (!shift || shift.status !== "OPEN") throw new Error("لا توجد وردية مفتوحة للمعاملة");

  const orderStatus = input.sessionId ? "PENDING" : "PAID";
  const finalPaymentMethod = input.paymentMethod ?? (input.sessionId ? null : "CASH");

  return await prisma.$transaction(async (tx) => {
    const details = [];

    for (const item of items) {
      // 1. جلب المنتج الأساسي
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) throw new Error("إحدى المنتجات غير موجودة");

      // 2. جلب مكونات الوصفة بشكل آمن متوافق مع البريزما
      const recipeItems = ((await (tx as any).recipeItem?.findMany({
        where: { productId: item.productId },
        include: { ingredient: true },
      })) ?? []) as Array<{
        ingredientId: string;
        quantity: number;
        ingredient: { name: string; stockQuantity: number };
      }>;

      // 3. إذا كان للمنتج مقادير ووصفة (BOM) يُخصم من المواد الخام
      if (recipeItems.length > 0) {
        for (const recipe of recipeItems) {
          const neededQty = recipe.quantity * item.quantity;
          if (recipe.ingredient.stockQuantity < neededQty) {
            throw new Error(
              `خام (${recipe.ingredient.name}) غير كافي لتجهيز ${item.quantity} من ${product.name}`
            );
          }

          await tx.product.update({
            where: { id: recipe.ingredientId },
            data: { stockQuantity: { decrement: neededQty } },
          });
        }
      } else {
        // إذا كان منتجاً عادياً (مياه، كانز، شيبس) يُخصم بالقطعة
        if (product.stockQuantity < item.quantity) {
          throw new Error(`المخزون غير كافي للصنف: ${product.name}`);
        }

        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }

      const unitPrice = item.unitPrice > 0 ? item.unitPrice : product.sellPrice;
      const subTotal = Number((item.quantity * Number(unitPrice)).toFixed(2));

      details.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(unitPrice),
        subTotal,
      });
    }

    const totalAmount = Number(details.reduce((sum, i) => sum + i.subTotal, 0).toFixed(2));

    const createdOrder = await tx.order.create({
      data: {
        shiftId: input.shiftId,
        sessionId: input.sessionId ?? null,
        totalAmount,
        paymentMethod: finalPaymentMethod ?? undefined,
        status: orderStatus,
        items: { create: details },
      },
      include: {
        items: { include: { product: true } },
      },
    });

    // 4. توريد الكاش للخزينة المختارة أو خزينة الوردية كخيار افتراضي
    const finalDrawerId = input.targetCashDrawerId || shift.cashDrawerId;

    if (orderStatus === "PAID" && finalPaymentMethod === "CASH" && finalDrawerId) {
      await tx.cashDrawer.update({
        where: { id: finalDrawerId },
        data: { balance: { increment: totalAmount } },
      });

      await tx.financialTransaction.create({
        data: {
          cashDrawerId: finalDrawerId,
          shiftId: input.shiftId,
          type: "INCOME",
          amount: totalAmount,
          description: `مبيعات كافيه (كاش سريع) - طلب #${createdOrder.id.slice(-6)}`,
        },
      });
    }

    revalidatePath("/pos");
    revalidatePath("/inventory");
    revalidatePath("/shifts");
    revalidatePath("/cash-drawers");
    return createdOrder;
  });
}

export async function cancelOrder(orderId: string) {
  await assertAuthorized(["ADMIN", "CASHIER"]);

  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true, shift: true },
    });

    if (!order) throw new Error("الطلب غير موجود");
    if (order.status === "CANCELLED") throw new Error("الطلب ملغي بالفعل");

    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { increment: item.quantity } },
      });
    }

    if (order.status === "PAID" && order.paymentMethod === "CASH" && order.shift?.cashDrawerId) {
      await tx.cashDrawer.update({
        where: { id: order.shift.cashDrawerId },
        data: { balance: { decrement: order.totalAmount } },
      });

      await tx.financialTransaction.create({
        data: {
          cashDrawerId: order.shift.cashDrawerId,
          shiftId: order.shiftId,
          type: "EXPENSE",
          amount: order.totalAmount,
          description: `إلغاء واسترجاع طلب #${order.id.slice(-6)}`,
        },
      });
    }

    const cancelled = await tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });

    revalidatePath("/pos");
    revalidatePath("/inventory");
    revalidatePath("/shifts");
    return cancelled;
  });
}