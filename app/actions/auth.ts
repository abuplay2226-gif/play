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

export async function signIn(formData: FormData) {
  const username = String(formData.get("username") ?? formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const requestedRole = String(formData.get("role") ?? "ADMIN").toUpperCase() as UserRole;
  const rememberMe = String(formData.get("rememberMe") ?? "false") === "true";

  if (!username || !password) {
    throw new Error("اسم المستخدم وكلمة المرور مطلوبان.");
  }

  const inputHash = hashPassword(password);
  const normalizedEmail = `${username.toLowerCase().replace(/\s+/g, "_")}@play.local`;

  let dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { equals: username, mode: "insensitive" } },
        { email: { equals: username.toLowerCase(), mode: "insensitive" } },
        { email: { equals: normalizedEmail, mode: "insensitive" } },
      ],
    },
  });

  // إنشاء حساب المدير الافتراضي مرة واحدة فقط إذا كانت قاعدة البيانات فارغة تماماً
  if (!dbUser && username.toLowerCase() === "admin") {
    const totalUsers = await prisma.user.count();
    if (totalUsers === 0) {
      dbUser = await prisma.user.create({
        data: {
          name: "مدير النظام",
          email: "admin@play.local",
          password: hashPassword("admin123"),
          role: "ADMIN",
        },
      });
    }
  }

  if (!dbUser) {
    throw new Error("بيانات الدخول غير صحيحة. اسم المستخدم غير موجود.");
  }

  const isPasswordMatched =
    dbUser.password === inputHash || dbUser.password === password;

  if (!isPasswordMatched) {
    throw new Error("كلمة المرور غير صحيحة.");
  }

  if (requestedRole === "ADMIN" && dbUser.role !== "ADMIN") {
    throw new Error("هذا الحساب ليس لديه صلاحية مدير النظام.");
  }

  await setSignedSessionCookie(
    {
      userId: dbUser.id,
      email: dbUser.email,
      name: dbUser.name ?? username,
      role: dbUser.role as UserRole,
    },
    rememberMe
  );

  if (dbUser.role === "ADMIN") {
    redirect("/admin");
  } else {
    redirect("/staff");
  }
}

export async function signInCustomer(formData: FormData) {
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

  await setSignedSessionCookie(
    {
      userId: customer.id,
      phone: customer.phone,
      name: customer.name ?? customer.phone,
      role: "CUSTOMER",
    },
    true
  );

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

  await setSignedSessionCookie(
    {
      userId: customer.id,
      phone: customer.phone,
      name: customer.name ?? customer.phone,
      role: "CUSTOMER",
    },
    true
  );

  redirect("/customer");
}

export async function signOut() {
  await clearSessionCookie();
  redirect("/login");
}