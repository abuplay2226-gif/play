"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import type { DeviceStatus, SessionStatus, SlotType } from "@prisma/client";

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

function calculateSlotCost(startTime: Date, endTime: Date | null, hourlyRate: number) {
  const finalEnd = endTime ?? new Date();
  const minutes = Math.max(0, (finalEnd.getTime() - startTime.getTime()) / 60000);
  const hours = minutes / 60;
  return Number((hours * hourlyRate).toFixed(2));
}

export async function getDevices() {
  return prisma.device.findMany({
    orderBy: { name: "asc" },
    include: {
      sessions: {
        where: {
          status: {
            in: ["ACTIVE", "PAUSED"],
          },
        },
        include: {
          slots: true,
        },
      },
    },
  });
}

export async function createDevice(input: {
  name: string;
  type: "PS4" | "PS5" | "PC" | "VIP_ROOM";
  singleHourlyRate: number;
  multiHourlyRate: number;
  status?: DeviceStatus;
}) {
  const name = input.name.trim();

  if (!name) {
    throw new Error("اسم الجهاز مطلوب");
  }

  const device = await prisma.device.create({
    data: {
      name,
      type: input.type,
      singleHourlyRate: toNumber(input.singleHourlyRate),
      multiHourlyRate: toNumber(input.multiHourlyRate),
      status: input.status ?? "AVAILABLE",
    },
  });

  revalidatePath("/");
  return device;
}

export async function updateDeviceStatus(deviceId: string, status: DeviceStatus) {
  const device = await prisma.device.update({
    where: { id: deviceId },
    data: { status },
  });

  revalidatePath("/");
  return device;
}

export async function openDeviceSession(input: {
  deviceId: string;
  shiftId: string;
  customerId?: string | null;
  slotType?: SlotType;
}) {
  const device = await prisma.device.findUnique({
    where: { id: input.deviceId },
  });

  if (!device) {
    throw new Error("الجهاز غير موجود");
  }

  const shift = await prisma.shift.findUnique({
    where: { id: input.shiftId },
  });

  if (!shift || shift.status !== "OPEN") {
    throw new Error("لا توجد وردية مفتوحة لهذه الخزينة");
  }

  const activeSession = await prisma.deviceSession.findFirst({
    where: {
      deviceId: input.deviceId,
      status: { in: ["ACTIVE", "PAUSED"] },
    },
  });

  if (activeSession) {
    throw new Error("هذا الجهاز مشغول حالياً بجلسة نشطة");
  }

  const chosenType = input.slotType ?? "SINGLE";
  const hourlyRate = chosenType === "MULTI" ? device.multiHourlyRate : device.singleHourlyRate;

  const session = await prisma.deviceSession.create({
    data: {
      deviceId: input.deviceId,
      shiftId: input.shiftId,
      customerId: input.customerId ?? null,
      status: "ACTIVE",
      startTime: new Date(),
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
    },
    include: {
      slots: true,
      device: true,
    },
  });

  await prisma.device.update({
    where: { id: input.deviceId },
    data: { status: "OCCUPIED" },
  });

  revalidatePath("/");
  return session;
}

export async function pauseDeviceSession(sessionId: string) {
  const session = await prisma.deviceSession.findUnique({
    where: { id: sessionId },
    include: { slots: true },
  });

  if (!session) {
    throw new Error("الجلسة غير موجودة");
  }

  const activeSlot = getActiveSlot(session);

  if (!activeSlot) {
    throw new Error("لا توجد فترة زمنية نشطة في الجلسة");
  }

  const slotCost = calculateSlotCost(activeSlot.startTime, new Date(), activeSlot.hourlyRate);

  await prisma.timeSlot.update({
    where: { id: activeSlot.id },
    data: {
      endTime: new Date(),
      totalCost: Number(slotCost.toFixed(2)),
    },
  });

  const updatedSession = await prisma.deviceSession.update({
    where: { id: sessionId },
    data: {
      status: "PAUSED",
      timeCost: Number((session.timeCost + slotCost).toFixed(2)),
      totalCost: Number((session.totalCost + slotCost).toFixed(2)),
      endTime: null,
    },
  });

  revalidatePath("/");
  return updatedSession;
}

export async function resumeDeviceSession(sessionId: string) {
  const session = await prisma.deviceSession.findUnique({
    where: { id: sessionId },
    include: { slots: true, device: true },
  });

  if (!session) {
    throw new Error("الجلسة غير موجودة");
  }

  const lastSlot = [...session.slots].sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0];
  const chosenType = lastSlot?.type ?? "SINGLE";
  const hourlyRate = chosenType === "MULTI" ? session.device.multiHourlyRate : session.device.singleHourlyRate;

  const newSlot = await prisma.timeSlot.create({
    data: {
      sessionId,
      type: chosenType,
      hourlyRate,
      startTime: new Date(),
      endTime: null,
      totalCost: 0,
    },
  });

  const updatedSession = await prisma.deviceSession.update({
    where: { id: sessionId },
    data: {
      status: "ACTIVE",
      endTime: null,
    },
    include: {
      slots: true,
    },
  });

  revalidatePath("/");
  return { session: updatedSession, newSlot };
}

export async function switchSessionMode(sessionId: string, nextType: SlotType) {
  const session = await prisma.deviceSession.findUnique({
    where: { id: sessionId },
    include: {
      slots: true,
      device: true,
    },
  });

  if (!session) {
    throw new Error("الجلسة غير موجودة");
  }

  const activeSlot = getActiveSlot(session);

  if (activeSlot) {
    const slotCost = calculateSlotCost(activeSlot.startTime, new Date(), activeSlot.hourlyRate);

    await prisma.timeSlot.update({
      where: { id: activeSlot.id },
      data: {
        endTime: new Date(),
        totalCost: Number(slotCost.toFixed(2)),
      },
    });

    await prisma.deviceSession.update({
      where: { id: sessionId },
      data: {
        timeCost: Number((session.timeCost + slotCost).toFixed(2)),
        totalCost: Number((session.totalCost + slotCost).toFixed(2)),
      },
    });
  }

  const hourlyRate = nextType === "MULTI" ? session.device.multiHourlyRate : session.device.singleHourlyRate;

  const newSlot = await prisma.timeSlot.create({
    data: {
      sessionId,
      type: nextType,
      hourlyRate,
      startTime: new Date(),
      endTime: null,
      totalCost: 0,
    },
  });

  const updatedSession = await prisma.deviceSession.update({
    where: { id: sessionId },
    data: {
      status: "ACTIVE",
      endTime: null,
    },
    include: {
      slots: true,
      device: true,
    },
  });

  revalidatePath("/");
  return { session: updatedSession, newSlot };
}

export async function closeDeviceSession(sessionId: string) {
  const session = await prisma.deviceSession.findUnique({
    where: { id: sessionId },
    include: {
      slots: true,
      device: true,
    },
  });

  if (!session) {
    throw new Error("الجلسة غير موجودة");
  }

  const now = new Date();
  let accumulated = Number(session.timeCost ?? 0);

  for (const slot of session.slots) {
    const slotEnd = slot.endTime ?? now;
    if (!slot.endTime) {
      await prisma.timeSlot.update({
        where: { id: slot.id },
        data: {
          endTime: now,
          totalCost: Number(calculateSlotCost(slot.startTime, now, slot.hourlyRate).toFixed(2)),
        },
      });
    }

    const finalValue = Number(
      calculateSlotCost(slot.startTime, slot.endTime ?? now, slot.hourlyRate).toFixed(2),
    );

    accumulated = Number((accumulated + finalValue).toFixed(2));
  }

  const finalSession = await prisma.deviceSession.update({
    where: { id: sessionId },
    data: {
      status: "COMPLETED",
      endTime: now,
      timeCost: Number(accumulated.toFixed(2)),
      totalCost: Number(accumulated.toFixed(2)),
    },
    include: {
      slots: true,
      device: true,
    },
  });

  await prisma.device.update({
    where: { id: session.deviceId },
    data: { status: "AVAILABLE" },
  });

  revalidatePath("/");
  return finalSession;
}

export async function getActiveSessions() {
  return prisma.deviceSession.findMany({
    where: {
      status: { in: ["ACTIVE", "PAUSED"] },
    },
    include: {
      device: true,
      slots: true,
      customer: true,
      shift: true,
    },
    orderBy: {
      startTime: "desc",
    },
  });
}
