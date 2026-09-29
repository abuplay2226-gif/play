"use server";

import { revalidatePath } from "next/cache";

import { assertAuthorized } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

// ============================================================================
// 1. دوال إدارة العملاء (تدعم الاستدعاء بمعامل واحد أو معاملين لمنع خطأ TS2554)
// ============================================================================

export async function getCustomers() {
  return prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      sessions: true,
      bookings: true,
    },
  });
}

// دالة إنشاء العميل (تدعم كائناً أو معاملات منفصلة)
export async function createCustomer(
  inputOrName:
    | string
    | { name: string; phone: string; loyaltyPts?: number; debt?: number },
  optionalPhone?: string,
  optionalLoyaltyPts?: number,
  optionalDebt?: number
) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  let name: string;
  let phone: string;
  let loyaltyPts = 0;
  let debt = 0;

  if (typeof inputOrName === "string") {
    name = inputOrName.trim();
    phone = (optionalPhone ?? "").trim();
    loyaltyPts = optionalLoyaltyPts !== undefined ? Number(optionalLoyaltyPts) : 0;
    debt = optionalDebt !== undefined ? Number(optionalDebt) : 0;
  } else {
    name = inputOrName.name.trim();
    phone = inputOrName.phone.trim();
    loyaltyPts = inputOrName.loyaltyPts !== undefined ? Number(inputOrName.loyaltyPts) : 0;
    debt = inputOrName.debt !== undefined ? Number(inputOrName.debt) : 0;
  }

  if (!name || !phone) {
    throw new Error("اسم العميل ورقم الهاتف مطلوبان");
  }

  const customer = await prisma.customer.upsert({
    where: { phone },
    update: {
      name,
      loyaltyPts,
      debt,
    },
    create: {
      name,
      phone,
      loyaltyPts,
      debt,
    },
  });

  revalidatePath("/customers");
  revalidatePath("/bookings");
  revalidatePath("/");
  return customer;
}

// دالة تعديل العميل (تدعم updateCustomer(id, data) وتدعم updateCustomer({ id, ...data }))
export async function updateCustomer(
  idOrInput:
    | string
    | { id: string; name?: string; phone?: string; loyaltyPts?: number; debt?: number },
  dataOrNothing?: { name?: string; phone?: string; loyaltyPts?: number; debt?: number }
) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  let id: string;
  let name: string | undefined;
  let phone: string | undefined;
  let loyaltyPts: number | undefined;
  let debt: number | undefined;

  if (typeof idOrInput === "string") {
    id = idOrInput;
    name = dataOrNothing?.name;
    phone = dataOrNothing?.phone;
    loyaltyPts = dataOrNothing?.loyaltyPts;
    debt = dataOrNothing?.debt;
  } else {
    id = idOrInput.id;
    name = idOrInput.name;
    phone = idOrInput.phone;
    loyaltyPts = idOrInput.loyaltyPts;
    debt = idOrInput.debt;
  }

  if (!id) throw new Error("معرف العميل مطلوب");

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      name: name ? name.trim() : undefined,
      phone: phone ? phone.trim() : undefined,
      loyaltyPts: loyaltyPts !== undefined ? Number(loyaltyPts) : undefined,
      debt: debt !== undefined ? Number(debt) : undefined,
    },
  });

  revalidatePath("/customers");
  revalidatePath("/bookings");
  revalidatePath("/");
  return customer;
}

export async function deleteCustomer(id: string) {
  await assertAuthorized(["ADMIN"]);
  if (!id) throw new Error("معرف العميل مطلوب");

  const customer = await prisma.customer.delete({
    where: { id },
  });

  revalidatePath("/customers");
  revalidatePath("/bookings");
  revalidatePath("/");
  return customer;
}

// ============================================================================
// 2. دوال إدارة الحجوزات
// ============================================================================

export async function getBookings() {
  return prisma.booking.findMany({
    include: {
      device: true,
      customer: true,
    },
    orderBy: { startTime: "desc" },
  });
}

// إنشاء حجز جديد
export async function createBooking(input: {
  deviceId: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  startTime: Date | string;
  endTime: Date | string;
  notes?: string | null;
}) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  const start = new Date(input.startTime);
  const end = new Date(input.endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    throw new Error("تاريخ ووقت الحجز غير صحيح (يجب أن يكون وقت النهاية بعد البداية)");
  }

  // لا يجوز حجز موعد في الماضي
  if (start < new Date()) {
    throw new Error("لا يمكن إنشاء حجز في وقت أو تاريخ قد فات بالفعل");
  }

  return await prisma.$transaction(async (tx) => {
    let targetCustomerId = input.customerId;

    if (!targetCustomerId && input.customerPhone?.trim()) {
      const phone = input.customerPhone.trim();
      const name = input.customerName?.trim() || `عميل ${phone.slice(-4)}`;
      const customer = await tx.customer.upsert({
        where: { phone },
        update: { name },
        create: { name, phone, loyaltyPts: 0, debt: 0 },
      });
      targetCustomerId = customer.id;
    }

    if (!targetCustomerId) {
      throw new Error("يرجى تحديد العميل أو إدخال اسمه ورقم هاتفه");
    }

    const booking = await tx.booking.create({
      data: {
        deviceId: input.deviceId,
        customerId: targetCustomerId,
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

    revalidatePath("/bookings");
    return booking;
  });
}

// تعديل حجز قائم
export async function updateBooking(input: {
  bookingId: string;
  deviceId?: string;
  startTime?: Date | string;
  endTime?: Date | string;
  notes?: string | null;
}) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  const existing = await prisma.booking.findUnique({
    where: { id: input.bookingId },
  });

  if (!existing) throw new Error("الحجز غير موجود");
  if (existing.status === "CANCELLED") throw new Error("لا يمكن تعديل حجز ملغي");

  const start = input.startTime ? new Date(input.startTime) : existing.startTime;
  const end = input.endTime ? new Date(input.endTime) : existing.endTime;

  if (end <= start) {
    throw new Error("تاريخ ووقت الحجز غير صحيح");
  }

  const updated = await prisma.booking.update({
    where: { id: input.bookingId },
    data: {
      deviceId: input.deviceId ?? existing.deviceId,
      startTime: start,
      endTime: end,
      notes: input.notes !== undefined ? input.notes : existing.notes,
    },
    include: {
      device: true,
      customer: true,
    },
  });

  revalidatePath("/bookings");
  return updated;
}

// تأكيد الحجز (مع المنع الصارم إذا فات موعده وتاريخه)
export async function confirmBooking(bookingId: string) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) throw new Error("الحجز غير موجود");

  const now = new Date();
  if (new Date(booking.startTime) < now) {
    throw new Error("⚠️ عفواً، لا يمكن تأكيد هذا الحجز لأن موعده وتاريخه قد فات بالفعل!");
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CONFIRMED" },
    include: {
      device: true,
      customer: true,
    },
  });

  revalidatePath("/bookings");
  return updated;
}

// إلغاء الحجز
export async function cancelBooking(bookingId: string) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF"]);

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
    include: {
      device: true,
      customer: true,
    },
  });

  revalidatePath("/bookings");
  return updated;
}