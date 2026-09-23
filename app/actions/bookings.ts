"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

const toDate = (value: Date | string | null | undefined) => {
  if (!value) return null;
  return new Date(value);
};

export async function getCustomers() {
  return prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      sessions: true,
      bookings: true,
    },
  });
}

export async function createCustomer(input: { name: string; phone: string; loyaltyPts?: number; debt?: number }) {
  const name = input.name.trim();
  const phone = input.phone.trim();

  if (!name) {
    throw new Error("اسم العميل مطلوب");
  }

  if (!phone) {
    throw new Error("رقم الهاتف مطلوب");
  }

  const customer = await prisma.customer.create({
    data: {
      name,
      phone,
      loyaltyPts: input.loyaltyPts ?? 0,
      debt: input.debt ?? 0,
    },
  });

  revalidatePath("/");
  return customer;
}

export async function getBookings() {
  return prisma.booking.findMany({
    include: {
      device: true,
      customer: true,
    },
    orderBy: { startTime: "asc" },
  });
}

export async function createBooking(input: {
  deviceId: string;
  customerId: string;
  startTime: Date | string;
  endTime: Date | string;
  notes?: string | null;
}) {
  if (!input.deviceId || !input.customerId) {
    throw new Error("الجهاز والعميل مطلوبان");
  }

  const device = await prisma.device.findUnique({ where: { id: input.deviceId } });
  if (!device) {
    throw new Error("الجهاز غير موجود");
  }

  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) {
    throw new Error("العميل غير موجود");
  }

  const start = toDate(input.startTime);
  const end = toDate(input.endTime);

  if (!start || !end || end <= start) {
    throw new Error("تاريخ ووقت الحجز غير صحيح");
  }

  const booking = await prisma.booking.create({
    data: {
      deviceId: input.deviceId,
      customerId: input.customerId,
      startTime: start,
      endTime: end,
      status: "PENDING",
      notes: input.notes?.trim() || null,
    },
    include: {
      device: true,
      customer: true,
    },
  });

  revalidatePath("/");
  return booking;
}

export async function confirmBooking(bookingId: string) {
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CONFIRMED" },
    include: {
      device: true,
      customer: true,
    },
  });

  revalidatePath("/");
  return booking;
}

export async function cancelBooking(bookingId: string) {
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
    include: {
      device: true,
      customer: true,
    },
  });

  revalidatePath("/");
  return booking;
}
