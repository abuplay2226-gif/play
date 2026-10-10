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

// دالة أمان للتأكد من وجود أعمدة customerId و notes في جدول Order
async function ensureOrderColumns() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerId" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "notes" TEXT;`);
  } catch {}
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

// 1. إنشاء الطلب (كاش فوري / تعليق لحساب جهاز / حساب كافيه مفتوح لعميل)
export async function createOrder(input: {
  shiftId: string;
  sessionId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  notes?: string | null;
  paymentMethod?: PaymentMethod;
  targetCashDrawerId?: string;
  items: Array<{ productId: string; quantity: number; unitPrice?: number | string | null }>;
}) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);
  await ensureOrderColumns();

  const items = normalizeItems(input.items);
  if (items.length === 0) throw new Error("يجب إضافة صنف واحد على الأقل");

  const shift = await prisma.shift.findUnique({
    where: { id: input.shiftId },
    include: { cashDrawer: true },
  });

  if (!shift || shift.status !== "OPEN") throw new Error("لا توجد وردية مفتوحة للمعاملة");

  // إذا كان مربوطاً بجلسة أو حساب عميل معلق يكون PENDING، وإلا كاش فوري PAID
  const isPendingOrder = Boolean(input.sessionId || input.customerId || input.customerName);
  const orderStatus = isPendingOrder ? "PENDING" : "PAID";
  const finalPaymentMethod = isPendingOrder ? null : (input.paymentMethod ?? "CASH");

  return await prisma.$transaction(async (tx) => {
    // التحقق من العميل وإنشاء حساب سريع إن لزم
    let targetCustomerId = input.customerId || null;
    let customerLabel = input.customerName?.trim() || input.notes?.trim() || null;

    if (!targetCustomerId && input.customerName?.trim()) {
      const existingCust = await tx.customer.findFirst({
        where: { name: { equals: input.customerName.trim(), mode: "insensitive" } },
      });
      if (existingCust) {
        targetCustomerId = existingCust.id;
        customerLabel = existingCust.name;
      }
    }

    const details = [];

    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) throw new Error("إحدى المنتجات غير موجودة");

      // خصم مكونات الوصفة (BOM) إن وجدت
      const recipeItems = ((await (tx as any).recipeItem?.findMany({
        where: { productId: item.productId },
        include: { ingredient: true },
      })) ?? []) as Array<{
        ingredientId: string;
        quantity: number;
        ingredient: { name: string; stockQuantity: number };
      }>;

      if (recipeItems.length > 0) {
        for (const recipe of recipeItems) {
          const neededQty = recipe.quantity * item.quantity;
          if (recipe.ingredient.stockQuantity < neededQty) {
            throw new Error(
              `خام (${recipe.ingredient.name}) غير كافٍ لتجهيز ${item.quantity} من ${product.name}`
            );
          }

          await tx.product.update({
            where: { id: recipe.ingredientId },
            data: { stockQuantity: { decrement: neededQty } },
          });
        }
      } else {
        // خصم منتج مباشر
        if (product.stockQuantity < item.quantity) {
          throw new Error(`المخزون غير كافٍ للصنف: ${product.name}`);
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

    const createdOrder = await (tx as any).order.create({
      data: {
        shiftId: input.shiftId,
        sessionId: input.sessionId ?? null,
        customerId: targetCustomerId,
        notes: customerLabel,
        totalAmount,
        paymentMethod: finalPaymentMethod ?? undefined,
        status: orderStatus,
        items: { create: details },
      },
      include: {
        items: { include: { product: true } },
      },
    });

    // توريد الكاش للخزينة فوراً في حال البيع الكاش الفوري
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
          description: `مبيعات كافيه (كاش فوري) - طلب #${createdOrder.id.slice(-6)}`,
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

// 2. تصفية ومحاسبة حساب كافيه مفتوح (Open Tab Checkout)
export async function settleCafeOrder(input: {
  orderId: string;
  discountAmount?: number;
  paidAmount: number;
  paymentMethod: "CASH" | "CARD" | "DEBT";
  targetCashDrawerId?: string;
}) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);
  await ensureOrderColumns();

  return await prisma.$transaction(async (tx) => {
    const order = await (tx as any).order.findUnique({
      where: { id: input.orderId },
      include: {
        items: { include: { product: true } },
        shift: { include: { cashDrawer: true } },
        customer: true,
      },
    });

    if (!order || order.status !== "PENDING") {
      throw new Error("الطلب غير موجود أو تمت محاسبته مسبقاً");
    }

    const discount = Number(input.discountAmount ?? 0);
    const subTotal = order.totalAmount;
    const finalPayable = Math.max(0, Number((subTotal - discount).toFixed(2)));
    const paidAmount = Number(input.paidAmount);
    const remainingDebt = Math.max(0, Number((finalPayable - paidAmount).toFixed(2)));

    // إذا تبقى دين، يرحل على حساب العميل المسجل
    if (remainingDebt > 0) {
      if (!order.customerId) {
        throw new Error("لا يمكن ترحيل دين على عميل غير مسجل في النظام");
      }
      await tx.customer.update({
        where: { id: order.customerId },
        data: { debt: { increment: remainingDebt } },
      });
    }

    const finalDrawerId = input.targetCashDrawerId || order.shift?.cashDrawerId;

    if (input.paymentMethod === "CASH" && paidAmount > 0 && finalDrawerId) {
      await tx.cashDrawer.update({
        where: { id: finalDrawerId },
        data: { balance: { increment: paidAmount } },
      });

      await tx.financialTransaction.create({
        data: {
          cashDrawerId: finalDrawerId,
          shiftId: order.shiftId,
          customerId: order.customerId,
          type: "INCOME",
          amount: paidAmount,
          description: `تحصيل حساب كافيه - طلب #${order.id.slice(-6)} (${order.notes || "عميل"})`,
        },
      });
    }

    if (input.paymentMethod === "CARD" && paidAmount > 0 && finalDrawerId) {
      await tx.financialTransaction.create({
        data: {
          cashDrawerId: finalDrawerId,
          shiftId: order.shiftId,
          customerId: order.customerId,
          type: "INCOME_CARD",
          amount: paidAmount,
          description: `تحصيل كافيه [فيزا] - طلب #${order.id.slice(-6)} (${order.notes || "عميل"})`,
        },
      });
    }

    const updated = await (tx as any).order.update({
      where: { id: order.id },
      data: {
        totalAmount: finalPayable,
        paymentMethod: input.paymentMethod,
        status: "PAID",
      },
    });

    revalidatePath("/pos");
    revalidatePath("/cash-drawers");
    revalidatePath("/customers");
    revalidatePath("/receipt");

    return {
      success: true,
      orderId: updated.id,
      finalPayable,
      paidAmount,
      remainingDebt,
    };
  });
}

// 3. تعديل كميات الطلب عند الخطأ (إرجاع أو خصم المخزون تلقائياً)
export async function updateOrderItems(input: {
  orderId: string;
  updatedItems: Array<{ productId: string; quantity: number }>;
}) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      include: { items: { include: { product: true } } },
    });

    if (!order) throw new Error("الطلب غير موجود");
    if (order.status === "PAID") {
      throw new Error("لا يمكن تعديل طلب تم تسديده وإغلاقه؛ يمكنك إلغاؤه إن لزم الأمر");
    }

    // خريطة الأصناف السابقة لإرجاع المخزون بالكامل أولاً
    for (const oldItem of order.items) {
      await tx.product.update({
        where: { id: oldItem.productId },
        data: { stockQuantity: { increment: oldItem.quantity } },
      });
    }

    // حذف البنود القديمة
    await tx.orderItem.deleteMany({ where: { orderId: order.id } });

    // إضافة البنود الجديدة وخصم المخزون بالكميات المحدثة
    const newDetails = [];
    for (const item of input.updatedItems) {
      if (item.quantity <= 0) continue;

      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error("الصنف غير موجود");

      if (product.stockQuantity < item.quantity) {
        throw new Error(`المخزون غير كافٍ للصنف: ${product.name}`);
      }

      await tx.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { decrement: item.quantity } },
      });

      const subTotal = Number((item.quantity * product.sellPrice).toFixed(2));
      newDetails.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.sellPrice,
        subTotal,
      });
    }

    const newTotal = Number(newDetails.reduce((sum, i) => sum + i.subTotal, 0).toFixed(2));

    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        totalAmount: newTotal,
        items: { create: newDetails },
      },
      include: { items: { include: { product: true } } },
    });

    revalidatePath("/pos");
    revalidatePath("/inventory");
    return updatedOrder;
  });
}

// 4. نقل الطلب لوجهة أخرى (من جهاز لجهاز، أو من جهاز لعميل كافيه، أو العكس)
export async function transferOrder(input: {
  orderId: string;
  targetType: "SESSION" | "CUSTOMER";
  targetSessionId?: string | null;
  targetCustomerId?: string | null;
  targetCustomerName?: string | null;
}) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);
  await ensureOrderColumns();

  const updateData: any = {};

  if (input.targetType === "SESSION") {
    if (!input.targetSessionId) throw new Error("يجب تحديد الجهاز المستهدف");
    updateData.sessionId = input.targetSessionId;
    updateData.customerId = null;
    updateData.notes = null;
  } else {
    updateData.sessionId = null;
    updateData.customerId = input.targetCustomerId || null;
    updateData.notes = input.targetCustomerName || "عميل كافيه";
  }

  const updated = await (prisma as any).order.update({
    where: { id: input.orderId },
    data: updateData,
  });

  revalidatePath("/pos");
  revalidatePath("/devices");
  return updated;
}

// 5. إلغاء الطلب بالكامل وإرجاع المخزون والخزينة
export async function cancelOrder(orderId: string) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true, shift: true },
    });

    if (!order) throw new Error("الطلب غير موجود");
    if (order.status === "CANCELLED") throw new Error("الطلب ملغي بالفعل");

    // إرجاع المخزون للأصناف
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { increment: item.quantity } },
      });
    }

    // استرداد النقدية من الخزينة إن كان مسدداً كاش
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
    revalidatePath("/cash-drawers");
    return cancelled;
  });
}