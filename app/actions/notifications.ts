"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export async function getCustomerNotifications(phone?: string) {
  if (!phone) return [];

  return prisma.notification.findMany({
    where: { customer: { phone } },
    orderBy: { createdAt: "desc" },
    include: { booking: true },
  });
}

export async function getAdminNotifications() {
  return prisma.notification.findMany({
    where: { userId: { not: null } },
    orderBy: { createdAt: "desc" },
    include: { booking: true },
  });
}

export async function createNotification(input: {
  title: string;
  message: string;
  type?: string;
  customerPhone?: string;
  bookingId?: string;
  userEmail?: string;
}) {
  const customer = input.customerPhone
    ? await prisma.customer.findUnique({ where: { phone: input.customerPhone } })
    : null;

  const user = input.userEmail
    ? await prisma.user.findUnique({ where: { email: input.userEmail } })
    : null;

  const notification = await prisma.notification.create({
    data: {
      title: input.title,
      message: input.message,
      type: input.type ?? "INFO",
      customerId: customer?.id ?? null,
      userId: user?.id ?? null,
      bookingId: input.bookingId ?? null,
    },
  });

  revalidatePath("/");
  return notification;
}

export async function markNotificationRead(notificationId: string) {
  await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });

  revalidatePath("/");
}
