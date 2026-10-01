"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setSignedSessionCookie } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export type CustomerBookingRow = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "NO_SHOW";
  startTime: Date;
  device: {
    name: string;
  };
};

export async function getCustomerBookings(phone?: string): Promise<CustomerBookingRow[]> {
  const bookings = await prisma.booking.findMany({
    where: phone ? { customer: { phone } } : undefined,
    orderBy: { startTime: "asc" },
    include: {
      device: true,
      customer: true,
    },
  });

  return bookings.map((b) => ({
    id: b.id,
    status: b.status as CustomerBookingRow["status"],
    startTime: b.startTime,
    device: {
      name: b.device.name,
    },
  }));
}

export async function createCustomerBooking(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const serviceType = String(formData.get("serviceType") ?? "PS5").trim();
  const bookingDate = String(formData.get("bookingDate") ?? "").trim();
  const bookingTime = String(formData.get("bookingTime") ?? "09:00").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name || !phone || !bookingDate) {
    throw new Error("الاسم ورقم الهاتف وتاريخ الحجز مطلوبان");
  }

  const deviceTypeMap: Record<string, "PS4" | "PS5" | "PC" | "VIP_ROOM"> = {
    PS5: "PS5",
    VIP: "VIP_ROOM",
    PC: "PC",
    PS4: "PS4",
  };

  const deviceType = deviceTypeMap[serviceType] ?? "PS5";

  // 1. إنشاء أو جلب العميل
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

  const startDate = new Date(`${bookingDate}T${bookingTime || "09:00"}:00`);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  // 2. البحث عن جهاز متاح
  let device = await prisma.device.findFirst({
    where: { type: deviceType },
    orderBy: { name: "asc" },
  });

  if (!device) {
    device = await prisma.device.findFirst({
      orderBy: { name: "asc" },
    });
  }

  if (!device) {
    throw new Error("لا توجد أجهزة مسجلة بالصالة حالياً");
  }

  // 3. إنشاء الحجز
  await prisma.booking.create({
    data: {
      customerId: customer.id,
      deviceId: device.id,
      startTime: startDate,
      endTime: endDate,
      status: "PENDING",
      notes: notes || `حجز عبر البوابة الإلكترونية: ${serviceType}`,
    },
  });

  // 4. تسجيل دخول العميل تلقائياً وإنشاء Session Cookie
  await setSignedSessionCookie({
    userId: customer.id,
    phone: customer.phone,
    name: customer.name ?? customer.phone,
    role: "CUSTOMER",
  });

  revalidatePath("/customer");
  revalidatePath("/bookings");
  redirect("/customer");
}