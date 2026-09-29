"use server";

import { revalidatePath } from "next/cache";

import { assertAuthorized } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

const toNumber = (value: number | string | null | undefined) => Number(value ?? 0);

// 1. جلب قائمة الموردين مع سجل مشترياتهم
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

// 2. جلب فواتير الشراء السابقة
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

// 3. إنشاء مورد جديد
export async function createSupplier(input: {
  name: string;
  phone?: string | null;
  balance?: number | string;
}) {
  await assertAuthorized(["ADMIN", "CASHIER"]);
  const name = input.name.trim();
  if (!name) throw new Error("اسم المورد مطلوب");

  const supplier = await prisma.supplier.create({
    data: {
      name,
      phone: input.phone?.trim() || null,
      balance: toNumber(input.balance),
    },
  });

  revalidatePath("/suppliers");
  revalidatePath("/cash-drawers");
  return supplier;
}

// 4. استخراج كشف حساب المورد التفصيلي (دفتر الأستاذ مع الرصيد الافتتاحي التراكمي)
export async function getSupplierLedger(supplierId: string) {
  await assertAuthorized(["ADMIN", "CASHIER"]);

  const [supplier, invoices, transactions] = await Promise.all([
    prisma.supplier.findUnique({ where: { id: supplierId } }),
    prisma.purchaseInvoice.findMany({
      where: { supplierId },
      include: { items: { include: { product: true } } },
      orderBy: { invoiceDate: "asc" },
    }),
    prisma.financialTransaction.findMany({
      where: { supplierId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!supplier) throw new Error("المورد غير موجود");

  // معادلة استنتاج الرصيد الافتتاحي بدقة
  const invoicesNet = invoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0);
  const paymentsNet = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const openingBalance = Number((supplier.balance - invoicesNet + paymentsNet).toFixed(2));

  const rawEntries: Array<{
    date: Date;
    title: string;
    details: string;
    credit: number; // له (فواتير / استحقاق)
    debit: number;  // سداد (مدفوع كاش أو سند)
    netChange: number;
  }> = [];

  let totalCredit = 0;
  let totalPaid = 0;

  // إدراج الرصيد الافتتاحي كأول حركة رسمية في الكشف
  if (openingBalance !== 0) {
    const earliestTime = Math.min(
      ...invoices.map((i) => new Date(i.invoiceDate).getTime()),
      ...transactions.map((t) => new Date(t.createdAt).getTime()),
      Date.now()
    );
    const openingDate = new Date(earliestTime - 1000);

    rawEntries.push({
      date: openingDate,
      title: "رصيد افتتاحي (مستحق سابقاً)",
      details: "الرصيد الافتتاحي المسجل عند إضافة المورد في النظام",
      credit: openingBalance > 0 ? openingBalance : 0,
      debit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
      netChange: openingBalance,
    });

    if (openingBalance > 0) totalCredit += openingBalance;
    if (openingBalance < 0) totalPaid += Math.abs(openingBalance);
  }

  // إضافة فواتير الشراء
  for (const inv of invoices) {
    totalCredit += inv.totalAmount;
    totalPaid += inv.paidAmount;

    rawEntries.push({
      date: inv.invoiceDate,
      title: `فاتورة شراء #${inv.id.slice(-6)}`,
      details: inv.items.map((i) => `${i.product.name} (${i.quantity})`).join(", "),
      credit: inv.totalAmount,
      debit: inv.paidAmount,
      netChange: Number((inv.totalAmount - inv.paidAmount).toFixed(2)),
    });
  }

  // إضافة سندات الصرف وسداد الديون
  for (const tx of transactions) {
    totalPaid += tx.amount;
    rawEntries.push({
      date: tx.createdAt,
      title: "سند صرف نقدية (سداد دين)",
      details: tx.description,
      credit: 0,
      debit: tx.amount,
      netChange: -tx.amount,
    });
  }

  // ترتيب الحركات زمنياً لحساب الرصيد التراكمي بعد كل حركة
  rawEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningBalance = 0;
  const ledger = rawEntries.map((item) => {
    runningBalance += item.netChange;
    return {
      ...item,
      balanceAfter: Number(runningBalance.toFixed(2)),
    };
  });

  return {
    supplier,
    currentBalance: supplier.balance,
    totalCredit: Number(totalCredit.toFixed(2)),
    totalPurchases: Number(invoices.reduce((sum, i) => sum + i.totalAmount, 0).toFixed(2)),
    totalPaid: Number(totalPaid.toFixed(2)),
    openingBalance,
    ledger,
  };
}

// 5. دالة الإنشاء السريع للصنف الكامل (بمواصفات الخامة والوزن والتصنيف) من قلب الفاتورة
export async function quickCreateFullProduct(input: {
  name: string;
  categoryId?: string;
  newCategoryName?: string;
  isRawMaterial: boolean;
  unit: string;
  sellPrice?: number;
  costPrice?: number;
  minStockAlert?: number;
}) {
  await assertAuthorized(["ADMIN", "CASHIER"]);

  const name = input.name.trim();
  if (!name) throw new Error("اسم الصنف مطلوب");

  return await prisma.$transaction(async (tx) => {
    let targetCategoryId = input.categoryId;

    if (input.newCategoryName?.trim()) {
      const catName = input.newCategoryName.trim();
      let cat = await tx.category.findFirst({ where: { name: catName } });
      if (!cat) {
        cat = await tx.category.create({ data: { name: catName } });
      }
      targetCategoryId = cat.id;
    }

    if (!targetCategoryId) {
      let defaultCat = await tx.category.findFirst({ where: { name: "عام" } });
      if (!defaultCat) defaultCat = await tx.category.findFirst();
      if (!defaultCat) defaultCat = await tx.category.create({ data: { name: "عام" } });
      targetCategoryId = defaultCat.id;
    }

    const product = await tx.product.create({
      data: {
        name,
        categoryId: targetCategoryId,
        isRawMaterial: input.isRawMaterial,
        unit: input.unit || "قطعة",
        sellPrice: input.isRawMaterial ? 0 : Number(input.sellPrice ?? 0),
        costPrice: Number(input.costPrice ?? 0),
        stockQuantity: 0, // سيزداد الرصيد تلقائياً من فاتورة الشراء نفسها
        minStockAlert: Number(input.minStockAlert ?? 5),
      },
      include: { category: true },
    });

    revalidatePath("/inventory");
    revalidatePath("/suppliers");
    revalidatePath("/pos");
    return product;
  });
}

// 6. تسجيل فاتورة الشراء وتوريد المخزن وضبط الخزينة وحساب المورد
export async function createPurchaseInvoice(input: {
  supplierId: string;
  shiftId?: string;
  targetCashDrawerId?: string;
  paidAmount?: number | string;
  items: Array<{ productId: string; quantity: number; unitCost: number | string }>;
}) {
  await assertAuthorized(["ADMIN", "CASHIER"]);

  if (!input.supplierId) throw new Error("المورد مطلوب");
  if (!input.items || input.items.length === 0) throw new Error("يجب إدخال صنف واحد على الأقل");

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

  const invoiceTotal = validatedItems.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0
  );
  const paidAmount = toNumber(input.paidAmount);
  const remainingBalance = Number((invoiceTotal - paidAmount).toFixed(2));

  return await prisma.$transaction(async (tx) => {
    let finalSupplierId = input.supplierId;
    let supplierName = "المورد";

    // إذا تم كتابة مورد جديد مباشرة في البحث
    if (finalSupplierId.startsWith("NEW:")) {
      const newName = finalSupplierId.replace("NEW:", "").trim();
      const newSupplier = await tx.supplier.create({
        data: { name: newName, balance: 0 },
      });
      finalSupplierId = newSupplier.id;
      supplierName = newSupplier.name;
    } else {
      const existing = await tx.supplier.findUnique({ where: { id: finalSupplierId } });
      if (!existing) throw new Error("المورد غير موجود");
      supplierName = existing.name;
    }

    // 1. تسجيل فاتورة الشراء
    const invoice = await tx.purchaseInvoice.create({
      data: {
        supplierId: finalSupplierId,
        invoiceDate: new Date(),
        totalAmount: Number(invoiceTotal.toFixed(2)),
        paidAmount: Number(paidAmount.toFixed(2)),
        items: {
          create: validatedItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitCost: i.unitCost,
          })),
        },
      },
    });

    // 2. زيادة رصيد المخزن وتحديث سعر التكلفة
    for (const item of validatedItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: { increment: item.quantity },
          costPrice: item.unitCost,
        },
      });
    }

    // 3. تحديث رصيد المورد (دائن / مدين)
    await tx.supplier.update({
      where: { id: finalSupplierId },
      data: {
        balance: { increment: remainingBalance },
      },
    });

    // 4. خروج الكاش من الخزينة المحددة (أو خزينة الوردية كخيار افتراضي)
    let finalDrawerId = input.targetCashDrawerId;
    if (!finalDrawerId && input.shiftId) {
      const shift = await tx.shift.findUnique({ where: { id: input.shiftId } });
      finalDrawerId = shift?.cashDrawerId;
    }

    if (paidAmount > 0 && finalDrawerId) {
      await tx.cashDrawer.update({
        where: { id: finalDrawerId },
        data: { balance: { decrement: paidAmount } },
      });

      await tx.financialTransaction.create({
        data: {
          cashDrawerId: finalDrawerId,
          shiftId: input.shiftId ?? null,
          supplierId: finalSupplierId,
          type: "EXPENSE",
          amount: paidAmount,
          description: `سداد مشتريات للمورد (${supplierName}) - فاتورة #${invoice.id.slice(-6)}`,
        },
      });
    }

    revalidatePath("/suppliers");
    revalidatePath("/inventory");
    revalidatePath("/pos");
    revalidatePath("/shifts");
    revalidatePath("/cash-drawers");
    return invoice;
  });
}

// 7. سند صرف وسداد مديونية سابقة لمورد
export async function paySupplierDebt(input: {
  supplierId: string;
  shiftId?: string;
  targetCashDrawerId?: string;
  amount: number | string;
  notes?: string;
}) {
  await assertAuthorized(["ADMIN", "CASHIER"]);

  const amount = toNumber(input.amount);
  if (amount <= 0) throw new Error("المبلغ يجب أن يكون أكبر من صفر");

  return await prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findUnique({
      where: { id: input.supplierId },
    });

    if (!supplier) throw new Error("المورد غير موجود");

    let finalDrawerId = input.targetCashDrawerId;
    if (!finalDrawerId && input.shiftId) {
      const shift = await tx.shift.findUnique({ where: { id: input.shiftId } });
      finalDrawerId = shift?.cashDrawerId;
    }

    if (!finalDrawerId) {
      throw new Error("يجب تحديد خزينة لصرف المبلغ منها");
    }

    // خصم المبلغ من رصيد الخزينة المحددة
    await tx.cashDrawer.update({
      where: { id: finalDrawerId },
      data: { balance: { decrement: amount } },
    });

    // تسجيل قيد سند الصرف وربطه بالمورد
    await tx.financialTransaction.create({
      data: {
        cashDrawerId: finalDrawerId,
        shiftId: input.shiftId ?? null,
        supplierId: input.supplierId,
        type: "EXPENSE",
        amount,
        description: `سند صرف نقدية لمورد (${supplier.name}) - ${input.notes || "سداد مديونية"}`,
      },
    });

    // تخفيض المستحق للمورد
    const updatedSupplier = await tx.supplier.update({
      where: { id: input.supplierId },
      data: { balance: { decrement: amount } },
    });

    revalidatePath("/suppliers");
    revalidatePath("/shifts");
    revalidatePath("/cash-drawers");
    return updatedSupplier;
  });
}