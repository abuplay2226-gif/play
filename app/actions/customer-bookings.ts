"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export type CustomerBookingRow = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "NO_SHOW";
  startTime: Date | string;
  device: {
    name: string;
  };
};

export async function getCustomerBookings(): Promise<CustomerBookingRow[]> {
  const rows = (await (prisma as any).booking.findMany({
    orderBy: { startTime: "asc" },
    include: {
      device: true,
      customer: true,
    },
  })) as CustomerBookingRow[];

  return rows;
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

  const existingCustomer = await prisma.customer.upsert({
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

  const device = await prisma.device.findFirst({
    where: { type: deviceType },
    orderBy: { name: "asc" },
  });

  if (!device) {
    throw new Error("لا توجد أجهزة متاحة حاليا لنوع الخدمة المختار");
  }

  await prisma.booking.create({
    data: {
      customerId: existingCustomer.id,
      deviceId: device.id,
      startTime: startDate,
      endTime: endDate,
      status: "PENDING",
      notes: notes || `حجز عميل ${serviceType}`,
    },
  });

  revalidatePath("/customer");
  redirect("/customer");
}
