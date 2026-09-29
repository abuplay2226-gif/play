"use server";

import { createHash } from "crypto";
import { redirect } from "next/navigation";

import {
  clearSessionCookie,
  getCurrentUser as getGuardUser,
  getCurrentUserOrRedirect as getGuardUserOrRedirect,
  setSignedSessionCookie,
  type UserRole,
} from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  return await getGuardUser();
}

export async function getCurrentUserOrRedirect() {
  return await getGuardUserOrRedirect();
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await getGuardUserOrRedirect();

  if (!allowedRoles.includes(user.role)) {
    redirect("/");
  }

  return user;
}

function hashPassword(password: string): string {
  return createHash("sha256").update(password.trim()).digest("hex");
}

const DEMO_ACCOUNTS = {
  ADMIN: {
    email: "admin@play.local",
    passwordHash: hashPassword("admin123"),
    name: "مدير النظام",
    role: "ADMIN" as UserRole,
  },
  CASHIER: {
    email: "cashier@play.local",
    passwordHash: hashPassword("cashier123"),
    name: "الكاشير",
    role: "CASHIER" as UserRole,
  },
  STAFF: {
    email: "staff@play.local",
    passwordHash: hashPassword("staff123"),
    name: "موظف الصالة",
    role: "STAFF" as UserRole,
  },
};

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const requestedRole = String(formData.get("role") ?? "ADMIN").toUpperCase() as UserRole;

  if (!email || !password) {
    throw new Error("البريد الإلكتروني وكلمة المرور مطلوبان.");
  }

  const inputHash = hashPassword(password);

  const dbUser = await prisma.user.findUnique({
    where: { email },
  });

  if (dbUser) {
    const isMatched =
      dbUser.password === inputHash || dbUser.password === password;

    if (isMatched && dbUser.role === requestedRole) {
      await setSignedSessionCookie({
        userId: dbUser.id,
        email: dbUser.email,
        name: dbUser.name ?? dbUser.email,
        role: dbUser.role as UserRole,
      });

      if (dbUser.role === "ADMIN") redirect("/admin");
      redirect("/staff");
    }
  }

  const demoAccount = Object.values(DEMO_ACCOUNTS).find(
    (acc) =>
      acc.email === email &&
      acc.passwordHash === inputHash &&
      acc.role === requestedRole
  );

  if (!demoAccount) {
    throw new Error("بيانات الدخول غير صحيحة.");
  }

  await setSignedSessionCookie({
    email: demoAccount.email,
    name: demoAccount.name,
    role: demoAccount.role,
  });

  if (demoAccount.role === "ADMIN") redirect("/admin");
  redirect("/staff");
}

export async function signInCustomer(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name || !phone) {
    throw new Error("الاسم ورقم الهاتف مطلوبان.");
  }

  const customer = await prisma.customer.findUnique({
    where: { phone },
  });

  if (!customer || (customer.name ?? "").trim() !== name) {
    throw new Error("بيانات العميل غير موجودة. الرجاء إنشاء حساب جديد أولاً.");
  }

  await setSignedSessionCookie({
    userId: customer.id,
    phone: customer.phone,
    name: customer.name ?? customer.phone,
    role: "CUSTOMER",
  });

  redirect("/customer");
}

export async function createCustomerAccount(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name || !phone) {
    throw new Error("الاسم ورقم الهاتف مطلوبان.");
  }

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

  await setSignedSessionCookie({
    userId: customer.id,
    phone: customer.phone,
    name: customer.name ?? customer.phone,
    role: "CUSTOMER",
  });

  redirect("/customer");
}

export async function signOut() {
  await clearSessionCookie();
  redirect("/login");
}