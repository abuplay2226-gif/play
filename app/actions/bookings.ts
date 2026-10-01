"use server";

import { revalidatePath } from "next/cache";
import { assertAuthorized } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

// ============================================================================
// 1. دوال إدارة العملاء
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

// دالة إنشاء العميل
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

// دالة تعديل العميل
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

// تأكيد الحجز
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

// ============================================================================
// 3. كشف الحساب التفصيلي للعميل (سجل الباقات والجلسات والمشاريب والديون)
// ============================================================================

export async function getCustomerLedger(customerId: string) {
  await assertAuthorized(["ADMIN", "CASHIER", "STAFF", "CUSTOMER"]);

  const [customer, sessions, transactions] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.deviceSession.findMany({
      where: { customerId },
      include: {
        device: true,
        slots: true,
        orders: {
          where: { status: { not: "CANCELLED" } },
          include: { items: { include: { product: true } } },
        },
      },
      orderBy: { startTime: "desc" },
    }),
    prisma.financialTransaction.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!customer) throw new Error("العميل غير موجود");

  const entries: Array<{
    id: string;
    date: Date;
    type: "SESSION" | "PACKAGE_BUY" | "DEBT_PAYMENT";
    title: string;
    details: string;
    amount: number;
    badge: string;
    badgeColor: string;
  }> = [];

  // 1. معالجة جلسات اللعب ومشاريب الكافيه واستهلاك الباقات
  for (const s of sessions) {
    const isPackage = s.fixedDuration === -999 || s.slots.some((slot) => slot.hourlyRate === 0);
    const diffMs = (s.endTime ?? new Date()).getTime() - s.startTime.getTime();
    const mins = Math.max(0, Math.floor(diffMs / 60000));
    const durationText = `${Math.floor(mins / 60)} س و ${mins % 60} د`;

    const cafeItems = s.orders.flatMap((o) =>
      o.items.map((i) => `${i.product.name} (${i.quantity})`)
    );
    const cafeTotal = s.orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    let detailsText = `وقت اللعب: ${durationText}`;
    if (isPackage) {
      detailsText += ` · (مخصوم من رصيد الباقة ✨)`;
    } else {
      detailsText += ` · (تكلفة الوقت: ${s.timeCost} ج.م)`;
    }

    if (cafeItems.length > 0) {
      detailsText += ` · مشاريب: ${cafeItems.join(" + ")} (${cafeTotal} ج.م)`;
    }

    entries.push({
      id: s.id,
      date: s.startTime,
      type: "SESSION",
      title: `جلسة لعب (${s.device.name})`,
      details: detailsText,
      amount: s.totalCost,
      badge: isPackage ? "🎮 استهلاك باقة" : "🎮 جلسة عادية",
      badgeColor: isPackage
        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
        : "bg-sky-500/20 text-sky-300 border-sky-500/30",
    });
  }

  // 2. معالجة عمليات شراء الباقات وسداد الديون
  for (const t of transactions) {
    if (t.counterpartyName?.startsWith("PACKAGE_SUB:")) {
      try {
        const pkg = JSON.parse(t.counterpartyName.replace("PACKAGE_SUB:", ""));
        entries.push({
          id: t.id,
          date: t.createdAt,
          type: "PACKAGE_BUY",
          title: `شراء باقة (${pkg.planName})`,
          details: `تم شحن رصيد ${pkg.totalMinutes / 60} ساعة لعب · صالحة حتى ${new Date(pkg.expiryDate).toLocaleDateString("ar-EG")}`,
          amount: t.amount,
          badge: "🎁 شحن باقة",
          badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        });
      } catch {}
    } else {
      const isIncome = t.type === "INCOME";
      entries.push({
        id: t.id,
        date: t.createdAt,
        type: "DEBT_PAYMENT",
        title: isIncome ? "سداد دين نقدياً بالخزينة" : "سند نقدية",
        details: t.description,
        amount: t.amount,
        badge: isIncome ? "💵 سداد دين" : "💸 سند صرف",
        badgeColor: isIncome
          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
          : "bg-rose-500/20 text-rose-300 border-rose-500/30",
      });
    }
  }

  // ترتيب الحركات تنازلياً من الأحدث للأقدم
  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      debt: customer.debt,
      loyaltyPts: customer.loyaltyPts,
    },
    entries,
    totalSessions: sessions.length,
    currentDebt: customer.debt,
    loyaltyPts: customer.loyaltyPts,
  };
}