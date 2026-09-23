"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export type StaffUser = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "CASHIER" | "STAFF";
  createdAt: Date;
  shifts: Array<{ id: string }>;
};

export async function getUsers(): Promise<StaffUser[]> {
  const rows = (await (prisma as any).user.findMany({
    include: { shifts: true },
    orderBy: { createdAt: "desc" },
  })) as StaffUser[];

  return rows;
}

export async function createUser(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const rawRole = String(formData.get("role") ?? "CASHIER");
  const role = ["ADMIN", "CASHIER", "STAFF"].includes(rawRole)
    ? (rawRole as "ADMIN" | "CASHIER" | "STAFF")
    : "CASHIER";

  if (!email || !name || !password) {
    throw new Error("البريد الإلكتروني، اسم الموظف وكلمة المرور مطلوبة");
  }

  await (prisma as any).user.upsert({
    where: { email },
    update: {
      name,
      role,
      password,
    },
    create: {
      email,
      name,
      role,
      password,
    },
  });

  revalidatePath("/users");
  revalidatePath("/admin");
}

export async function updateUserRole(userId: string, role: "ADMIN" | "CASHIER" | "STAFF") {
  const user = await (prisma as any).user.update({
    where: { id: userId },
    data: { role },
  });

  revalidatePath("/");
  return user;
}
