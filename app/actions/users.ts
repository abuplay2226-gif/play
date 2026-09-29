"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";

import { assertAuthorized } from "@/lib/auth-guard";
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
  await assertAuthorized(["ADMIN"]);

  const users = await prisma.user.findMany({
    include: { shifts: true },
    orderBy: { createdAt: "desc" },
  });

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role as "ADMIN" | "CASHIER" | "STAFF",
    createdAt: u.createdAt,
    shifts: u.shifts.map((s) => ({ id: s.id })),
  }));
}

export async function createUser(formData: FormData): Promise<void> {
  await assertAuthorized(["ADMIN"]);

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

  const hashedPassword = createHash("sha256").update(password).digest("hex");

  await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role,
      password: hashedPassword,
    },
    create: {
      email,
      name,
      role,
      password: hashedPassword,
    },
  });

  revalidatePath("/users");
  revalidatePath("/admin");
}

export async function updateUserRole(userId: string, role: "ADMIN" | "CASHIER" | "STAFF") {
  await assertAuthorized(["ADMIN"]);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  revalidatePath("/users");
  revalidatePath("/admin");
  return user;
}