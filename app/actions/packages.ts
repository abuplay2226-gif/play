"use server";

import { revalidatePath } from "next/cache";
import { assertAuthorized } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export interface PackageMeta {
  hours: number;
  validityDays: number;
  deviceType: "ALL" | "PS5" | "PS4" | "VIP_ROOM" | "PC";
  drinksCount: number;
  description: string;
}

export interface CustomerSubscription {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  planId: string;
  planName: string;
  totalMinutes: number;
  usedMinutes: number;
  remainingMinutes: number;
  remainingHoursText: string;
  expiryDate: string;
  isExpired: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface PackagePlanItem {
  id: string;
  name: string;
  price: number;
  highlight: boolean;
  active: boolean;
  meta: PackageMeta;
}

function parsePackageFeature(featureStr?: string | null): PackageMeta {
  if (!featureStr) {
    return { hours: 5, validityDays: 30, deviceType: "ALL", drinksCount: 0, description: "" };
  }
  try {
    return JSON.parse(featureStr);
  } catch {
    return { hours: 5, validityDays: 30, deviceType: "ALL", drinksCount: 0, description: featureStr };
  }
}

// 1. جلب جميع الباقات المعرفة في النظام
export async function getPackagePlans(): Promise<PackagePlanItem[]> {
  const plans = await (prisma as any).packagePlan.findMany({
    orderBy: { order: "asc" },
  });

  return plans.map((p: any) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    highlight: Boolean(p.highlight),
    active: Boolean(p.active),
    meta: parsePackageFeature(p.feature),
  }));
}

// 2. إنشاء باقة جديدة
export async function createPackagePlan(formData: FormData): Promise<void> {
  await assertAuthorized(["ADMIN"]);

  const name = String(formData.get("name") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const hours = Number(formData.get("hours") ?? 5);
  const validityDays = Number(formData.get("validityDays") ?? 30);
  const deviceType = String(formData.get("deviceType") ?? "ALL") as any;
  const drinksCount = Number(formData.get("drinksCount") ?? 0);
  const highlight = String(formData.get("highlight") ?? "false") === "true";
  const description = String(formData.get("description") ?? "").trim();

  if (!name || price <= 0 || hours <= 0) {
    throw new Error("اسم الباقة وسعرها وعدد ساعاتها حقول مطلوبة");
  }

  const meta: PackageMeta = {
    hours,
    validityDays,
    deviceType,
    drinksCount,
    description: description || `${hours} ساعات لعب صالحة لمدة ${validityDays} يوم`,
  };

  await (prisma as any).packagePlan.create({
    data: {
      name,
      price,
      feature: JSON.stringify(meta),
      highlight,
      active: true,
      order: Date.now() % 100000,
    },
  });

  revalidatePath("/packages");
  revalidatePath("/admin/content");
  revalidatePath("/");
}

// 3. تفعيل / تعطيل باقة
export async function togglePackagePlan(id: string, active: boolean): Promise<void> {
  await assertAuthorized(["ADMIN"]);

  await (prisma as any).packagePlan.update({
    where: { id },
    data: { active },
  });

  revalidatePath("/packages");
  revalidatePath("/");
}

// 4. حذف باقة
export async function deletePackagePlan(id: string): Promise<void> {
  await assertAuthorized(["ADMIN"]);

  await (prisma as any).packagePlan.delete({ where: { id } });

  revalidatePath("/packages");
  revalidatePath("/");
}

// 5. تفعيل وشراء باقة لعميل بالاسم
export async function subscribeCustomerToPackage(input: {
  packageId: string;
  customerId: string;
  cashDrawerId?: string;
  shiftId?: string;
  paymentMethod?: "CASH" | "CARD";
}): Promise<boolean> {
  await assertAuthorized(["ADMIN", "CASHIER"]);

  return await prisma.$transaction(async (tx: any) => {
    const plan = await tx.packagePlan.findUnique({ where: { id: input.packageId } });
    if (!plan) throw new Error("الباقة غير موجودة");

    const customer = await tx.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw new Error("العميل غير موجود");

    const meta = parsePackageFeature(plan.feature);
    const totalMinutes = meta.hours * 60;
    const expiryDate = new Date(Date.now() + meta.validityDays * 24 * 60 * 60 * 1000);

    const subscriptionData = {
      planId: plan.id,
      planName: plan.name,
      totalMinutes,
      usedMinutes: 0,
      expiryDate: expiryDate.toISOString(),
      drinksCount: meta.drinksCount,
      deviceType: meta.deviceType,
    };

    const drawerId = input.cashDrawerId;
    if (drawerId && plan.price > 0 && input.paymentMethod !== "CARD") {
      await tx.cashDrawer.update({
        where: { id: drawerId },
        data: { balance: { increment: plan.price } },
      });

      await tx.financialTransaction.create({
        data: {
          cashDrawerId: drawerId,
          shiftId: input.shiftId ?? null,
          customerId: customer.id,
          type: "INCOME",
          amount: plan.price,
          counterpartyType: "CUSTOMER",
          counterpartyName: `PACKAGE_SUB:${JSON.stringify(subscriptionData)}`,
          description: `شراء باقة (${plan.name}) - العميل: ${customer.name}`,
        },
      });
    } else {
      await tx.financialTransaction.create({
        data: {
          cashDrawerId: drawerId ?? null,
          shiftId: input.shiftId ?? null,
          customerId: customer.id,
          type: input.paymentMethod === "CARD" ? "INCOME_CARD" : "INCOME",
          amount: plan.price,
          counterpartyType: "CUSTOMER",
          counterpartyName: `PACKAGE_SUB:${JSON.stringify(subscriptionData)}`,
          description: `شراء باقة (${plan.name}) [فيزا] - العميل: ${customer.name}`,
        },
      });
    }

    revalidatePath("/packages");
    revalidatePath("/devices");
    revalidatePath("/customer");
    revalidatePath("/cash-drawers");
    revalidatePath("/");
    return true;
  });
}

// 6. استخراج الباقات النشطة لعميل معين
export async function getCustomerActivePackages(customerId: string): Promise<CustomerSubscription[]> {
  const transactions = await (prisma as any).financialTransaction.findMany({
    where: {
      customerId,
      counterpartyName: { startsWith: "PACKAGE_SUB:" },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date().getTime();
  const list: CustomerSubscription[] = [];

  for (const t of transactions) {
    try {
      const rawJson = t.counterpartyName.replace("PACKAGE_SUB:", "");
      const sub = JSON.parse(rawJson);
      const expiry = new Date(sub.expiryDate).getTime();
      const remaining = Math.max(0, sub.totalMinutes - sub.usedMinutes);
      const isExpired = expiry < now || remaining <= 0;

      const remHours = Math.floor(remaining / 60);
      const remMins = remaining % 60;

      list.push({
        id: t.id,
        customerId,
        customerName: "",
        customerPhone: "",
        planId: sub.planId,
        planName: sub.planName,
        totalMinutes: sub.totalMinutes,
        usedMinutes: sub.usedMinutes,
        remainingMinutes: remaining,
        remainingHoursText: `${remHours} س ${remMins > 0 ? `و ${remMins} د` : ""}`,
        expiryDate: sub.expiryDate,
        isExpired,
        isActive: !isExpired,
        createdAt: t.createdAt.toISOString(),
      });
    } catch {
      // ignore
    }
  }

  return list;
}

// 7. استخراج جميع الاشتراكات لجميع العملاء
export async function getAllCustomerSubscriptions(): Promise<CustomerSubscription[]> {
  const [transactions, customers] = await Promise.all([
    (prisma as any).financialTransaction.findMany({
      where: {
        counterpartyName: { startsWith: "PACKAGE_SUB:" },
      },
      orderBy: { createdAt: "desc" },
    }),
    (prisma as any).customer.findMany({ select: { id: true, name: true, phone: true } }),
  ]);

  const now = new Date().getTime();
  const list: CustomerSubscription[] = [];

  for (const t of transactions) {
    try {
      const rawJson = t.counterpartyName.replace("PACKAGE_SUB:", "");
      const sub = JSON.parse(rawJson);
      const cust = customers.find((c: any) => c.id === t.customerId);
      const expiry = new Date(sub.expiryDate).getTime();
      const remaining = Math.max(0, sub.totalMinutes - sub.usedMinutes);
      const isExpired = expiry < now || remaining <= 0;

      const remHours = Math.floor(remaining / 60);
      const remMins = remaining % 60;

      list.push({
        id: t.id,
        customerId: t.customerId,
        customerName: cust?.name || "عميل",
        customerPhone: cust?.phone || "",
        planId: sub.planId,
        planName: sub.planName,
        totalMinutes: sub.totalMinutes,
        usedMinutes: sub.usedMinutes,
        remainingMinutes: remaining,
        remainingHoursText: `${remHours} س ${remMins > 0 ? `و ${remMins} د` : ""}`,
        expiryDate: sub.expiryDate,
        isExpired,
        isActive: !isExpired,
        createdAt: t.createdAt.toISOString(),
      });
    } catch {
      // ignore
    }
  }

  return list;
}

// 8. خصم دقائق من رصيد باقة العميل
export async function deductMinutesFromPackage(customerId: string, minutesToDeduct: number): Promise<void> {
  const transactions = await (prisma as any).financialTransaction.findMany({
    where: {
      customerId,
      counterpartyName: { startsWith: "PACKAGE_SUB:" },
    },
    orderBy: { createdAt: "asc" },
  });

  const now = new Date().getTime();
  let remainingToDeduct = minutesToDeduct;

  for (const t of transactions) {
    if (remainingToDeduct <= 0) break;
    try {
      const rawJson = t.counterpartyName.replace("PACKAGE_SUB:", "");
      const sub = JSON.parse(rawJson);
      const expiry = new Date(sub.expiryDate).getTime();
      const available = Math.max(0, sub.totalMinutes - sub.usedMinutes);

      if (expiry >= now && available > 0) {
        const deductNow = Math.min(available, remainingToDeduct);
        sub.usedMinutes += deductNow;
        remainingToDeduct -= deductNow;

        await (prisma as any).financialTransaction.update({
          where: { id: t.id },
          data: {
            counterpartyName: `PACKAGE_SUB:${JSON.stringify(sub)}`,
          },
        });
      }
    } catch {
      // ignore
    }
  }

  revalidatePath("/packages");
  revalidatePath("/customer");
}
// 9. تقديم العميل لطلب اشتراك باقة من الموقع الإلكتروني
export async function requestPackageOnline(input: {
  packageId: string;
  name: string;
  phone: string;
  notes?: string;
}) {
  const plan = await (prisma as any).packagePlan.findUnique({ where: { id: input.packageId } });
  if (!plan) throw new Error("الباقة غير موجودة");

  // تسجيل أو تحديث بيانات العميل
  const customer = await prisma.customer.upsert({
    where: { phone: input.phone },
    update: { name: input.name },
    create: {
      name: input.name,
      phone: input.phone,
      loyaltyPts: 0,
      debt: 0,
    },
  });

  // تسجيل إشعار وطلب معلق للإدارة
  await (prisma as any).notification.create({
    data: {
      title: "طلب باقة أونلاين جديد 🎁",
      message: `طلب العميل (${customer.name}) الاشتراك في باقة (${plan.name}) بقيمة ${plan.price} ج.م`,
      type: `ONLINE_PKG:${plan.id}`,
      customerId: customer.id,
    },
  });

  revalidatePath("/packages");
  revalidatePath("/admin");
  return true;
}

// 10. جلب طلبات الباقات المعلقة للأدمن والكاشير
export async function getPendingPackageRequests() {
  const notifications = await (prisma as any).notification.findMany({
    where: {
      type: { startsWith: "ONLINE_PKG:" },
      readAt: null,
    },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });

  const plans = await (prisma as any).packagePlan.findMany();

  return notifications.map((n: any) => {
    const planId = n.type.replace("ONLINE_PKG:", "");
    const plan = plans.find((p: any) => p.id === planId);
    return {
      id: n.id,
      customerId: n.customerId,
      customerName: n.customer?.name || "عميل",
      customerPhone: n.customer?.phone || "",
      planId,
      planName: plan?.name || "باقة ساعات",
      price: plan?.price || 0,
      createdAt: n.createdAt,
    };
  });
}

// 11. تأكيد استلام النقدية وتفعيل الباقة للطلب الأونلاين
export async function approveOnlinePackageRequest(input: {
  requestId: string;
  packageId: string;
  customerId: string;
  cashDrawerId?: string;
  shiftId?: string;
  paymentMethod?: "CASH" | "CARD";
}) {
  await assertAuthorized(["ADMIN", "CASHIER"]);

  // تفعيل الباقة للعميل
  await subscribeCustomerToPackage({
    packageId: input.packageId,
    customerId: input.customerId,
    cashDrawerId: input.cashDrawerId,
    shiftId: input.shiftId,
    paymentMethod: input.paymentMethod,
  });

  // تحديد الطلب كمكتمل
  await (prisma as any).notification.update({
    where: { id: input.requestId },
    data: { readAt: new Date() },
  });

  revalidatePath("/packages");
}

// 12. رفض وإلغاء طلب باقة
export async function rejectOnlinePackageRequest(requestId: string) {
  await assertAuthorized(["ADMIN", "CASHIER"]);

  await (prisma as any).notification.delete({
    where: { id: requestId },
  });

  revalidatePath("/packages");
}