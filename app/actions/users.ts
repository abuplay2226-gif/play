"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { assertAuthorized } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export type StaffUser = {
  id: string;
  name: string | null;
  username: string;
  email: string;
  role: "ADMIN" | "CASHIER" | "STAFF";
  defaultCashDrawerId?: string | null;
  defaultCashDrawerName?: string | null;
  createdAt: Date;
  shifts: Array<{ id: string }>;
};

function hashPassword(password: string): string {
  return createHash("sha256").update(password.trim()).digest("hex");
}

function extractUsername(email: string, name?: string | null): string {
  if (email.endsWith("@play.local")) {
    return email.replace("@play.local", "");
  }
  return name?.trim() || email.split("@")[0] || "user";
}

// 1. جلب الموظفين مع الخزينة الافتراضية المربوطة
export async function getUsers(): Promise<StaffUser[]> {
  await assertAuthorized(["ADMIN"]);

  const users = await prisma.user.findMany({
    include: {
      shifts: true,
      defaultCashDrawer: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    username: extractUsername(u.email, u.name),
    email: u.email,
    role: u.role as "ADMIN" | "CASHIER" | "STAFF",
    defaultCashDrawerId: u.defaultCashDrawerId,
    defaultCashDrawerName: u.defaultCashDrawer?.name ?? null,
    createdAt: u.createdAt,
    shifts: u.shifts.map((s) => ({ id: s.id })),
  }));
}

// 2. إنشاء موظف جديد وتعيين خزينته
export async function createUser(formData: FormData): Promise<void> {
  await assertAuthorized(["ADMIN"]);

  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  const password = String(formData.get("password") ?? "").trim();
  const rawRole = String(formData.get("role") ?? "STAFF");
  const defaultCashDrawerId = String(formData.get("defaultCashDrawerId") ?? "").trim() || null;

  const role = ["ADMIN", "CASHIER", "STAFF"].includes(rawRole)
    ? (rawRole as "ADMIN" | "CASHIER" | "STAFF")
    : "STAFF";

  if (!name || !username || !password) {
    throw new Error("الاسم الكامل، اسم الدخول وكلمة المرور جميعها حقول مطلوبة");
  }

  const generatedEmail = `${username}@play.local`;

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: generatedEmail, mode: "insensitive" } },
        { email: { equals: username, mode: "insensitive" } },
      ],
    },
  });

  if (existing) {
    throw new Error(`اسم الدخول (${username}) مستخدم بالفعل، يرجى اختيار اسم دخول آخر`);
  }

  await prisma.user.create({
    data: {
      name,
      email: generatedEmail,
      password: hashPassword(password),
      role,
      defaultCashDrawerId,
    },
  });

  revalidatePath("/users");
  revalidatePath("/admin");
}

// 3. تعديل الموظف وتحديث الخزينة المربوطة به
export async function updateUser(input: {
  userId: string;
  name: string;
  username: string;
  password?: string;
  role: "ADMIN" | "CASHIER" | "STAFF";
  defaultCashDrawerId?: string | null;
}) {
  await assertAuthorized(["ADMIN"]);

  const userId = input.userId;
  const name = input.name.trim();
  const username = input.username.trim().toLowerCase().replace(/\s+/g, "_");

  if (!userId || !name || !username) {
    throw new Error("الاسم الكامل واسم الدخول مطلوبان");
  }

  const generatedEmail = `${username}@play.local`;

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: generatedEmail, mode: "insensitive" } },
        { email: { equals: username, mode: "insensitive" } },
      ],
      NOT: { id: userId },
    },
  });

  if (existing) {
    throw new Error(`اسم الدخول (${username}) مسجل لموظف آخر بالفعل`);
  }

  const dataToUpdate: any = {
    name,
    email: generatedEmail,
    role: input.role,
    defaultCashDrawerId: input.defaultCashDrawerId || null,
  };

  if (input.password && input.password.trim()) {
    dataToUpdate.password = hashPassword(input.password.trim());
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: dataToUpdate,
  });

  revalidatePath("/users");
  revalidatePath("/admin");
  return updated;
}

// 4. حذف موظف
export async function deleteUser(userId: string) {
  const currentUser = await assertAuthorized(["ADMIN"]);

  if (currentUser.userId === userId) {
    throw new Error("لا يمكنك حذف الحساب الخاص بك وأنت مسجل الدخول به");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { shifts: { where: { status: "OPEN" } } },
  });

  if (!user) throw new Error("المستخدم غير موجود");
  if (user.shifts.length > 0) {
    throw new Error("لا يمكن حذف الموظف ولديه وردية مفتوحة حالياً");
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  revalidatePath("/users");
  revalidatePath("/admin");
  return true;
}

// 5. كشف مسحوبات وسلف الموظف
export async function getEmployeeLedger(input: {
  userId: string;
  startDate?: string;
  endDate?: string;
}) {
  await assertAuthorized(["ADMIN", "CASHIER"]);

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    include: { shifts: true },
  });

  if (!user) throw new Error("الموظف غير موجود");

  const userName = (user.name ?? "").trim();
  const userEmail = user.email.trim();
  const username = extractUsername(user.email, user.name);

  const whereClause: any = {
    counterpartyType: "EMPLOYEE",
    OR: [
      { counterpartyName: { equals: userName, mode: "insensitive" } },
      { counterpartyName: { equals: userEmail, mode: "insensitive" } },
      { counterpartyName: { equals: username, mode: "insensitive" } },
      ...(userName ? [{ description: { contains: userName, mode: "insensitive" } }] : []),
    ],
  };

  if (input.startDate || input.endDate) {
    whereClause.createdAt = {};
    if (input.startDate) {
      const s = new Date(input.startDate);
      s.setHours(0, 0, 0, 0);
      whereClause.createdAt.gte = s;
    }
    if (input.endDate) {
      const e = new Date(input.endDate);
      e.setHours(23, 59, 59, 999);
      whereClause.createdAt.lte = e;
    }
  }

  const [transactions, allDrawers] = await Promise.all([
    prisma.financialTransaction.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    }),
    prisma.cashDrawer.findMany({ select: { id: true, name: true } }),
  ]);

  const totalAdvances = transactions.reduce((sum, t) => sum + t.amount, 0);

  return {
    user: {
      id: user.id,
      name: user.name,
      username,
      email: user.email,
      role: user.role,
      shiftsCount: user.shifts.length,
    },
    transactions: transactions.map((t) => ({
      id: t.id,
      date: t.createdAt,
      drawerName: allDrawers.find((d) => d.id === t.cashDrawerId)?.name || "الخزينة",
      amount: t.amount,
      description: t.description,
      counterpartyName: t.counterpartyName,
    })),
    totalAdvances: Number(totalAdvances.toFixed(2)),
    transactionsCount: transactions.length,
  };
}