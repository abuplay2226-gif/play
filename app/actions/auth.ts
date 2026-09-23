"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

const DEMO_ACCOUNTS = {
  ADMIN: {
    email: "admin@play.local",
    password: "admin123",
    name: "مدير النظام",
    role: "ADMIN",
  },
  CASHIER: {
    email: "cashier@play.local",
    password: "cashier123",
    name: "الكاشير",
    role: "CASHIER",
  },
  STAFF: {
    email: "staff@play.local",
    password: "staff123",
    name: "موظف الصالة",
    role: "STAFF",
  },
} as const;

export type UserRole = "ADMIN" | "CASHIER" | "STAFF" | "CUSTOMER";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const value = cookieStore.get("play_session")?.value;

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as {
      email?: string;
      phone?: string;
      name: string;
      role: UserRole;
    };
  } catch {
    return null;
  }
}

export async function getCurrentUserOrRedirect() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await getCurrentUserOrRedirect();

  if (!allowedRoles.includes(user.role)) {
    redirect("/");
  }

  return user;
}

export async function setSessionCookie(payload: { email?: string; phone?: string; name: string; role: UserRole }) {
  const cookieStore = await cookies();
  cookieStore.set("play_session", JSON.stringify(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const requestedRole = String(formData.get("role") ?? "ADMIN").toUpperCase();

  const user = (await (prisma as any).user.findUnique({ where: { email } })) as
    | {
        email: string;
        name: string | null;
        role?: UserRole;
        password?: string | null;
      }
    | null;

  if (user && user.role === requestedRole && user.password === password) {
    await setSessionCookie({
      email: user.email,
      name: user.name ?? user.email,
      role: user.role ?? "STAFF",
    });

    if (user.role === "ADMIN") {
      redirect("/admin");
    }

    redirect("/staff");
  }

  const account = Object.values(DEMO_ACCOUNTS).find(
    (item) => item.email === email && item.password === password && item.role === requestedRole,
  );

  if (!account) {
    throw new Error("بيانات الدخول غير صحيحة.");
  }

  await setSessionCookie({
    email: account.email,
    name: account.name,
    role: account.role,
  });

  if (account.role === "ADMIN") {
    redirect("/admin");
  }

  if (account.role === "CASHIER" || account.role === "STAFF") {
    redirect("/staff");
  }

  redirect("/customer");
}

export async function signInCustomer(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name || !phone) {
    throw new Error("الاسم ورقم الهاتف مطلوبان");
  }

  const customer = (await (prisma as any).customer.findUnique({ where: { phone } })) as
    | {
        phone: string;
        name: string | null;
      }
    | null;

  if (!customer || (customer.name ?? "").trim() !== name) {
    throw new Error("بيانات العميل غير موجودة. الرجاء إنشاء حساب جديد أولاً.");
  }

  await setSessionCookie({
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
    throw new Error("الاسم ورقم الهاتف مطلوبان");
  }

  const customer = (await (prisma as any).customer.upsert({
    where: { phone },
    update: { name },
    create: {
      name,
      phone,
      loyaltyPts: 0,
      debt: 0,
    },
  })) as {
    phone: string;
    name: string | null;
  };

  await setSessionCookie({
    phone: customer.phone,
    name: customer.name ?? customer.phone,
    role: "CUSTOMER",
  });

  redirect("/customer");
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("play_session");
  redirect("/login");
}
