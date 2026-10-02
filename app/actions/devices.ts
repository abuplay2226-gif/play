"use server";

import { revalidatePath } from "next/cache";
import { assertAuthorized } from "@/lib/auth-guard";
import { isBilliardDevice } from "@/lib/device-utils";
import { prisma } from "@/lib/prisma";
import type { DeviceStatus, SlotType } from "@prisma/client";

const toNumber = (value: number | string | null | undefined) => Number(value ?? 0);

function getActiveSlot(session: {
  slots: Array<{
    id: string;
    type: SlotType;
    hourlyRate: number;
    startTime: Date;
    endTime: Date | null;
  }>;
}) {
  return session.slots.find((slot) => !slot.endTime) ?? null;
}

function calculateSlotCost(startTime: Date, endTime: Date | null, hourlyRate: number): number {
  const finalEnd = endTime ?? new Date();
  const minutes = Math.max(0, (finalEnd.getTime() - startTime.getTime()) / 60000);
  const hours = minutes / 60;
  return Number((hours * hourlyRate).toFixed(2));
}

function roundToNearest5(amount: number): number {
  if (amount <= 0) return 0;
  const rounded = Math.round(amount / 5) * 5;
  return rounded === 0 ? 5 : rounded;
}

export async function getDevices() {
  return prisma.device.findMany({
    orderBy: { name: "asc" },
    include: {
      sessions: {
        where: {
          status: { in: ["ACTIVE", "PAUSED"] },
        },
        include: {
          slots: true,
          customer: true,
          orders: {
            where: { status: { not: "CANCELLED" } },
            include: { items: { include: { product: true } } },
          },
        },
      },
    },
  });
}

export async function getActiveSessions() {
  return prisma.deviceSession.findMany({
    where: { status: { in: ["ACTIVE", "PAUSED"] } },
    include: {
      device: true,
      slots: true,
      customer: true,
      shift: true,
    },
    orderBy: { startTime: "desc" },
  });
}

// 1. إنشاء جهاز جديد (يقبل أي نوع: PS5, بلياردو, VR, PC...)
export async function createDevice(input: {
  name: string;
  type: string;
  singleHourlyRate: number;
  multiHourlyRate: number;
  status?: DeviceStatus;
}) {
  await assertAuthorized(["ADMIN"]);
  const name = input.name.trim();
  const type = input.type.trim();

  if (!name || !type) throw new Error("اسم الجهاز ونوعه مطلوبان");

  const device = await prisma.device.create({
    data: {
      name,
      type,
      singleHourlyRate: toNumber(input.singleHourlyRate),
      multiHourlyRate: toNumber(input.multiHourlyRate),
      status: input.status ?? "AVAILABLE",
    },
  });

  revalidatePath("/devices");
  revalidatePath("/");
  return device;
}

// 2. تعديل بيانات الجهاز
export async function updateDevice(input: {
  deviceId: string;
  name: string;
  type: string;
  singleHourlyRate: number;
  multiHourlyRate: number;
}) {
  await assertAuthorized(["ADMIN"]);

  const name = input.name.trim();
  const type = input.type.trim();
  if (!input.deviceId || !name || !type) {
    throw new Error("معرف الجهاز واسمه ونوعه حقول مطلوبة");
  }

  const updated = await prisma.device.update({
    where: { id: input.deviceId },
    data: {
      name,
      type,
      singleHourlyRate: toNumber(input.singleHourlyRate),
      multiHourlyRate: toNumber(input.multiHourlyRate),
    },
  });

  revalidatePath("/devices");
  revalidatePath("/");
  return updated;
}

// 3. حذف الجهاز
export async function deleteDevice(deviceId: string) {
  await assertAuthorized(["ADMIN"]);

  if (!deviceId) throw new Error("معرف الجهاز مطلوب");

  const activeSession = await prisma.deviceSession.findFirst({
    where: {
      deviceId,
      status: { in: ["ACTIVE", "PAUSED"] },
    },
  });

  if (activeSession) {
    throw new Error("لا يمكن حذف الجهاز أثناء وجود جلسة لعب نشطة عليه، يرجى إنهاء الجلسة أولاً");
  }

  await prisma.device.delete({
    where: { id: deviceId },
  });

  revalidatePath("/devices");
  revalidatePath("/");
  return true;
}

export async function updateDeviceStatus(deviceId: string, status: DeviceStatus) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  const device = await prisma.device.update({
    where: { id: deviceId },
    data: { status },
  });

  revalidatePath("/devices");
  revalidatePath("/");
  return device;
}

export async function quickCreateCustomer(input: { name: string; phone: string }) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);
  const name = input.name.trim();
  const phone = input.phone.trim();

  if (!name || !phone) throw new Error("الاسم ورقم الهاتف مطلوبان");

  const customer = await prisma.customer.upsert({
    where: { phone },
    update: { name },
    create: {
      name,
      phone,
      loyaltyPts: 0,
      debt: 0,
    },
  });

  revalidatePath("/devices");
  return customer;
}

export async function openDeviceSession(input: {
  deviceId: string;
  shiftId: string;
  customerId?: string | null;
  slotType?: SlotType;
  plannedMinutes?: number | null;
  usePackage?: boolean;
}) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  return await prisma.$transaction(async (tx) => {
    const device = await tx.device.findUnique({ where: { id: input.deviceId } });
    if (!device) throw new Error("الجهاز غير موجود");

    const shift = await tx.shift.findUnique({ where: { id: input.shiftId } });
    if (!shift || shift.status !== "OPEN") throw new Error("لا توجد وردية مفتوحة لبدء الجلسة");

    const activeSession = await tx.deviceSession.findFirst({
      where: {
        deviceId: input.deviceId,
        status: { in: ["ACTIVE", "PAUSED"] },
      },
    });

    if (activeSession) throw new Error("هذا الجهاز مشغول حالياً بجلسة نشطة");

    const chosenType = input.slotType ?? "SINGLE";
    const rawHourlyRate = chosenType === "MULTI" ? device.multiHourlyRate : device.singleHourlyRate;
    const hourlyRate = input.usePackage ? 0 : rawHourlyRate;

    const isFixed = Boolean(input.plannedMinutes && input.plannedMinutes > 0);
    const durationVal = input.plannedMinutes ?? null;

    const sessionData: any = {
      deviceId: input.deviceId,
      shiftId: input.shiftId,
      customerId: input.customerId ?? null,
      status: "ACTIVE",
      startTime: new Date(),
      isFixedTime: isFixed,
      fixedDuration: input.usePackage ? -999 : durationVal,
      plannedMinutes: durationVal,
      timeCost: 0,
      totalCost: 0,
      slots: {
        create: {
          type: chosenType,
          hourlyRate,
          startTime: new Date(),
          endTime: null,
          totalCost: 0,
        },
      },
    };

    const session = await (tx as any).deviceSession.create({
      data: sessionData,
      include: {
        slots: true,
        device: true,
        customer: true,
      },
    });

    await tx.device.update({
      where: { id: input.deviceId },
      data: { status: "OCCUPIED" },
    });

    revalidatePath("/devices");
    revalidatePath("/pos");
    revalidatePath("/");
    return session;
  });
}

export async function extendSessionDuration(sessionId: string, additionalMinutes: number | null) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  const session = await prisma.deviceSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("الجلسة غير موجودة");

  let nextPlanned: number | null = null;
  if (additionalMinutes === null) {
    nextPlanned = null;
  } else {
    const currentDuration = Number((session as any).plannedMinutes ?? (session as any).fixedDuration ?? 0);
    nextPlanned = currentDuration + additionalMinutes;
  }

  const updated = await (prisma as any).deviceSession.update({
    where: { id: sessionId },
    data: {
      isFixedTime: nextPlanned !== null && nextPlanned > 0,
      fixedDuration: nextPlanned,
      plannedMinutes: nextPlanned,
    },
  });

  revalidatePath("/devices");
  return updated;
}

export async function pauseDeviceSession(sessionId: string) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  return await prisma.$transaction(async (tx) => {
    const session = await tx.deviceSession.findUnique({
      where: { id: sessionId },
      include: { slots: true },
    });

    if (!session || session.status !== "ACTIVE") {
      throw new Error("الجلسة غير موجودة أو ليست نشطة");
    }

    const activeSlot = getActiveSlot(session);
    if (!activeSlot) throw new Error("لا توجد فترة زمنية نشطة للجلسة");

    const now = new Date();
    const isPackageSession = session.fixedDuration === -999 || session.slots.some((s) => s.hourlyRate === 0);
    const slotCost = isPackageSession ? 0 : calculateSlotCost(activeSlot.startTime, now, activeSlot.hourlyRate);

    await tx.timeSlot.update({
      where: { id: activeSlot.id },
      data: { endTime: now, totalCost: slotCost },
    });

    const newTimeCost = Number((session.timeCost + slotCost).toFixed(2));

    const updatedSession = await tx.deviceSession.update({
      where: { id: sessionId },
      data: {
        status: "PAUSED",
        timeCost: newTimeCost,
        totalCost: newTimeCost,
      },
    });

    revalidatePath("/devices");
    revalidatePath("/");
    return updatedSession;
  });
}

export async function resumeDeviceSession(sessionId: string) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  return await prisma.$transaction(async (tx) => {
    const session = await tx.deviceSession.findUnique({
      where: { id: sessionId },
      include: { slots: true, device: true },
    });

    if (!session || session.status !== "PAUSED") {
      throw new Error("الجلسة ليست في حالة إيقاف مؤقت");
    }

    const isPackageSession = session.fixedDuration === -999 || session.slots.some((s) => s.hourlyRate === 0);

    const lastSlot = [...session.slots].sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime()
    )[0];
    const chosenType = lastSlot?.type ?? "SINGLE";
    const rawHourlyRate =
      chosenType === "MULTI" ? session.device.multiHourlyRate : session.device.singleHourlyRate;

    const hourlyRate = isPackageSession ? 0 : rawHourlyRate;

    const newSlot = await tx.timeSlot.create({
      data: {
        sessionId,
        type: chosenType,
        hourlyRate,
        startTime: new Date(),
        endTime: null,
        totalCost: 0,
      },
    });

    const updatedSession = await tx.deviceSession.update({
      where: { id: sessionId },
      data: { status: "ACTIVE" },
      include: { slots: true },
    });

    revalidatePath("/devices");
    revalidatePath("/");
    return { session: updatedSession, newSlot };
  });
}

export async function switchSessionMode(sessionId: string, nextType: SlotType) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  return await prisma.$transaction(async (tx) => {
    const session = await tx.deviceSession.findUnique({
      where: { id: sessionId },
      include: { slots: true, device: true },
    });

    if (!session || session.status !== "ACTIVE") {
      throw new Error("الجلسة غير نشطة لتغيير وضع اللعب");
    }

    const isPackageSession = session.fixedDuration === -999 || session.slots.some((s) => s.hourlyRate === 0);

    const activeSlot = getActiveSlot(session);
    let additionalCost = 0;

    if (activeSlot) {
      const now = new Date();
      additionalCost = isPackageSession
        ? 0
        : calculateSlotCost(activeSlot.startTime, now, activeSlot.hourlyRate);

      await tx.timeSlot.update({
        where: { id: activeSlot.id },
        data: { endTime: now, totalCost: additionalCost },
      });
    }

    const rawHourlyRate =
      nextType === "MULTI" ? session.device.multiHourlyRate : session.device.singleHourlyRate;

    const newHourlyRate = isPackageSession ? 0 : rawHourlyRate;

    const newSlot = await tx.timeSlot.create({
      data: {
        sessionId,
        type: nextType,
        hourlyRate: newHourlyRate,
        startTime: new Date(),
        endTime: null,
        totalCost: 0,
      },
    });

    const updatedTimeCost = Number((session.timeCost + additionalCost).toFixed(2));

    const updatedSession = await tx.deviceSession.update({
      where: { id: sessionId },
      data: { timeCost: updatedTimeCost, totalCost: updatedTimeCost },
      include: { slots: true, device: true },
    });

    revalidatePath("/devices");
    revalidatePath("/");
    return { session: updatedSession, newSlot };
  });
}

export async function closeDeviceSession(sessionId: string) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  return await prisma.$transaction(async (tx) => {
    const session = await tx.deviceSession.findUnique({
      where: { id: sessionId },
      include: { slots: true },
    });

    if (!session || session.status === "COMPLETED") {
      throw new Error("الجلسة غير صالحة أو مغلقة بالفعل");
    }

    const now = new Date();
    const isPackageSession = session.fixedDuration === -999 || session.slots.some((s) => s.hourlyRate === 0);
    let totalTimeCost = 0;

    for (const slot of session.slots) {
      const end = slot.endTime ?? now;
      const cost = isPackageSession ? 0 : calculateSlotCost(slot.startTime, end, slot.hourlyRate);

      if (!slot.endTime) {
        await tx.timeSlot.update({
          where: { id: slot.id },
          data: { endTime: now, totalCost: cost },
        });
      }
      totalTimeCost += cost;
    }

    if (isPackageSession && session.customerId) {
      const playedMinutes = Math.max(1, Math.round((now.getTime() - session.startTime.getTime()) / 60000));
      const { deductMinutesFromPackage } = await import("@/app/actions/packages");
      await deductMinutesFromPackage(session.customerId, playedMinutes);
      totalTimeCost = 0;
    }

    totalTimeCost = Number(totalTimeCost.toFixed(2));

    const sessionOrders = await tx.order.findMany({
      where: { sessionId: session.id, status: { not: "CANCELLED" } },
    });

    const ordersTotal = sessionOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const afterDiscount = Math.max(0, totalTimeCost + ordersTotal);
    const grandTotal = roundToNearest5(afterDiscount);

    const finalSession = await tx.deviceSession.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
        endTime: now,
        timeCost: totalTimeCost,
        totalCost: grandTotal,
      },
      include: { slots: true, device: true, customer: true },
    });

    await tx.device.update({
      where: { id: session.deviceId },
      data: { status: "AVAILABLE" },
    });

    revalidatePath("/devices");
    revalidatePath("/receipt");
    revalidatePath("/packages");
    revalidatePath("/");
    return finalSession;
  });
}

// دالة تفصيل الحساب وتفصيل الفردي والجماعي (أو بالساعة وبالجيم للبلياردو)
export async function getSessionCheckoutPreview(sessionId: string) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  const [session, allDrawers] = await Promise.all([
    prisma.deviceSession.findUnique({
      where: { id: sessionId },
      include: {
        device: true,
        customer: true,
        slots: { orderBy: { startTime: "asc" } },
        shift: { include: { cashDrawer: true } },
        orders: {
          where: { status: { not: "CANCELLED" } },
          include: { items: { include: { product: true } } },
        },
      },
    }),
    prisma.cashDrawer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, balance: true },
    }),
  ]);

  if (!session) throw new Error("الجلسة غير موجودة");

  const isBilliard = isBilliardDevice(session.device.type);
  const now = new Date();
  const isPackageSession = session.fixedDuration === -999 || session.slots.some((s) => s.hourlyRate === 0);

  let totalTimeCost = 0;
  let singleMinutes = 0;
  let singleCost = 0;
  let multiMinutes = 0;
  let multiCost = 0;

  for (const slot of session.slots) {
    const end = slot.endTime ?? now;
    const slotMins = Math.max(0, Math.floor((end.getTime() - slot.startTime.getTime()) / 60000));
    const cost = isPackageSession ? 0 : calculateSlotCost(slot.startTime, end, slot.hourlyRate);

    if (slot.type === "MULTI") {
      multiMinutes += slotMins;
      multiCost += cost;
    } else {
      singleMinutes += slotMins;
      singleCost += cost;
    }
    totalTimeCost += cost;
  }

  totalTimeCost = Number(totalTimeCost.toFixed(2));
  singleCost = Number(singleCost.toFixed(2));
  multiCost = Number(multiCost.toFixed(2));

  const formatMins = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h} س و ${m} د`;
  };

  const totalMinutes = singleMinutes + multiMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const orderItemsList: Array<{ name: string; quantity: number; unitPrice: number; subTotal: number }> = [];
  let ordersTotal = 0;

  for (const order of session.orders) {
    for (const item of order.items) {
      orderItemsList.push({
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subTotal: item.subTotal,
      });
      ordersTotal += item.subTotal;
    }
  }

  ordersTotal = Number(ordersTotal.toFixed(2));
  const exactTotal = Number((totalTimeCost + ordersTotal).toFixed(2));
  const roundedTotal = roundToNearest5(exactTotal);

  const defaultDrawerId = session.shift?.cashDrawerId || allDrawers[0]?.id || "";
  const defaultDrawerName = session.shift?.cashDrawer?.name || "الخزينة الافتراضية";

  return {
    sessionId: session.id,
    deviceName: session.device.name,
    deviceType: session.device.type,
    isBilliard,
    defaultCashDrawerId: defaultDrawerId,
    defaultCashDrawerName: defaultDrawerName,
    availableCashDrawers: allDrawers,
    customer: session.customer,
    startTime: session.startTime,
    endTime: now,
    durationText: `${hours} س و ${minutes} د`,
    totalTimeCost,

    // تفاصيل أوضاع اللعب المنفصلة
    singleMinutes,
    singleDurationText: formatMins(singleMinutes),
    singleCost,
    multiMinutes,
    multiDurationText: formatMins(multiMinutes),
    multiCost,
    hasSwitchedModes: singleMinutes > 0 && multiMinutes > 0,

    ordersTotal,
    exactTotal,
    roundedTotal,
    orderItems: orderItemsList,
    isPackageSession,
  };
}

export async function settleAndCloseSession(input: {
  sessionId: string;
  discountAmount?: number;
  paidAmount: number;
  paymentMethod: "CASH" | "CARD" | "DEBT" | "MIXED";
  cashPortion?: number;
  targetCashDrawerId?: string;
}) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  return await prisma.$transaction(async (tx) => {
    const session = await tx.deviceSession.findUnique({
      where: { id: input.sessionId },
      include: {
        slots: true,
        device: true,
        customer: true,
        shift: { include: { cashDrawer: true } },
        orders: { where: { status: { not: "CANCELLED" } } },
      },
    });

    if (!session || session.status === "COMPLETED") {
      throw new Error("الجلسة غير صالحة أو مغلقة بالفعل");
    }

    const now = new Date();
    const isPackageSession = session.fixedDuration === -999 || session.slots.some((s) => s.hourlyRate === 0);
    let totalTimeCost = 0;

    for (const slot of session.slots) {
      const end = slot.endTime ?? now;
      const cost = isPackageSession ? 0 : calculateSlotCost(slot.startTime, end, slot.hourlyRate);

      if (!slot.endTime) {
        await tx.timeSlot.update({
          where: { id: slot.id },
          data: { endTime: now, totalCost: cost },
        });
      }
      totalTimeCost += cost;
    }

    if (isPackageSession && session.customerId) {
      const playedMinutes = Math.max(1, Math.round((now.getTime() - session.startTime.getTime()) / 60000));
      const { deductMinutesFromPackage } = await import("@/app/actions/packages");
      await deductMinutesFromPackage(session.customerId, playedMinutes);
      totalTimeCost = 0;
    }

    totalTimeCost = Number(totalTimeCost.toFixed(2));

    const ordersTotal = session.orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const subTotal = Number((totalTimeCost + ordersTotal).toFixed(2));
    const discount = Number(input.discountAmount ?? 0);
    const afterDiscount = Math.max(0, subTotal - discount);
    const netPayable = roundToNearest5(afterDiscount);

    const paidAmount = Number(input.paidAmount);
    const remainingDebt = Math.max(0, Number((netPayable - paidAmount).toFixed(2)));

    if (remainingDebt > 0 && session.customerId) {
      await tx.customer.update({
        where: { id: session.customerId },
        data: { debt: { increment: remainingDebt } },
      });
    }

    let cashAmount = 0;
    let cardAmount = 0;

    if (input.paymentMethod === "CASH") cashAmount = Math.min(paidAmount, netPayable);
    else if (input.paymentMethod === "CARD") cardAmount = Math.min(paidAmount, netPayable);
    else if (input.paymentMethod === "MIXED") {
      cashAmount = Number(input.cashPortion ?? 0);
      cardAmount = Math.max(0, paidAmount - cashAmount);
    }

    const finalDrawerId = input.targetCashDrawerId || session.shift?.cashDrawerId;

    if (cashAmount > 0 && finalDrawerId) {
      await tx.cashDrawer.update({
        where: { id: finalDrawerId },
        data: { balance: { increment: cashAmount } },
      });

      await tx.financialTransaction.create({
        data: {
          cashDrawerId: finalDrawerId,
          shiftId: session.shiftId,
          type: "INCOME",
          amount: cashAmount,
          description: `تحصيل كاش - جلسة (${session.device.name}) - عميل: ${session.customer?.name ?? "عابر"}`,
        },
      });
    }

    if (cardAmount > 0 && finalDrawerId) {
      await tx.financialTransaction.create({
        data: {
          cashDrawerId: finalDrawerId,
          shiftId: session.shiftId,
          type: "INCOME_CARD",
          amount: cardAmount,
          description: `تحصيل فيزا - جلسة (${session.device.name}) - عميل: ${session.customer?.name ?? "عابر"}`,
        },
      });
    }

    await tx.order.updateMany({
      where: { sessionId: session.id, status: "PENDING" },
      data: {
        status: "PAID",
        paymentMethod: input.paymentMethod === "CARD" ? "CARD" : "CASH",
      },
    });

    const finalSession = await tx.deviceSession.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
        endTime: now,
        timeCost: totalTimeCost,
        totalCost: netPayable,
      },
    });

    await tx.device.update({
      where: { id: session.deviceId },
      data: { status: "AVAILABLE" },
    });

    revalidatePath("/devices");
    revalidatePath("/pos");
    revalidatePath("/shifts");
    revalidatePath("/receipt");
    revalidatePath("/packages");
    revalidatePath("/");

    return {
      success: true,
      sessionId: finalSession.id,
      netPayable,
      paidAmount,
      remainingDebt,
    };
  });
}