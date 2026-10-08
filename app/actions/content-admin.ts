"use server";

import { revalidatePath } from "next/cache";
import { assertAuthorized } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function getServiceOffers() {
  return prisma.serviceOffer.findMany({
    where: { title: { not: "__LOUNGE_SETTINGS__" } },
    orderBy: { order: "asc" },
  });
}

export async function getPackagePlans() {
  return prisma.packagePlan.findMany({
    orderBy: { order: "asc" },
  });
}

export async function getCustomerReviews() {
  return prisma.customerReview.findMany({
    orderBy: { order: "asc" },
  });
}

export async function updateLoungeSettings(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    await assertAuthorized(["ADMIN"]);

    const heroImage = String(formData.get("heroImage") ?? "").trim();
    const heroMobileImage = String(formData.get("heroMobileImage") ?? "").trim();
    const heroTitle = String(formData.get("heroTitle") ?? "").trim();
    const heroSubtitle = String(formData.get("heroSubtitle") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const mapUrl = String(formData.get("mapUrl") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const whatsapp = String(formData.get("whatsapp") ?? "").trim();

    const settingsPayload = {
      heroImage: heroImage || null,
      heroMobileImage: heroMobileImage || null,
      heroTitle: heroTitle || null,
      heroSubtitle: heroSubtitle || null,
      address: address || null,
      mapUrl: mapUrl || null,
      phone: phone || null,
      whatsapp: whatsapp || null,
    };

    // 1. تحديث جدول LoungeSetting في قاعدة البيانات تلقائياً مع دعم عمود الموبايل
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "LoungeSetting" (
          "id" TEXT PRIMARY KEY DEFAULT 'default',
          "heroImage" TEXT,
          "heroMobileImage" TEXT,
          "heroTitle" TEXT,
          "heroSubtitle" TEXT,
          "address" TEXT,
          "mapUrl" TEXT,
          "phone" TEXT,
          "whatsapp" TEXT,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // إضافة العمود في حال كان الجدول منشأ سابقاً بدونه
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "LoungeSetting" ADD COLUMN IF NOT EXISTS "heroMobileImage" TEXT;
      `);

      await prisma.$executeRawUnsafe(
        `
        INSERT INTO "LoungeSetting" ("id", "heroImage", "heroMobileImage", "heroTitle", "heroSubtitle", "address", "mapUrl", "phone", "whatsapp", "updatedAt")
        VALUES ('default', $1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT ("id") DO UPDATE SET
          "heroImage" = EXCLUDED."heroImage",
          "heroMobileImage" = EXCLUDED."heroMobileImage",
          "heroTitle" = EXCLUDED."heroTitle",
          "heroSubtitle" = EXCLUDED."heroSubtitle",
          "address" = EXCLUDED."address",
          "mapUrl" = EXCLUDED."mapUrl",
          "phone" = EXCLUDED."phone",
          "whatsapp" = EXCLUDED."whatsapp",
          "updatedAt" = NOW();
      `,
        settingsPayload.heroImage,
        settingsPayload.heroMobileImage,
        settingsPayload.heroTitle,
        settingsPayload.heroSubtitle,
        settingsPayload.address,
        settingsPayload.mapUrl,
        settingsPayload.phone,
        settingsPayload.whatsapp
      );
    } catch (dbErr) {
      console.warn("SQL table save fallback:", dbErr);
    }

    // 2. حفظ نسخة احتياطية إضافية في ServiceOffer لضمان استرجاع البيانات تحت أي ظرف
    try {
      const jsonPayload = JSON.stringify(settingsPayload);
      const existing = await prisma.serviceOffer.findFirst({
        where: { title: "__LOUNGE_SETTINGS__" },
      });

      if (existing) {
        await prisma.serviceOffer.update({
          where: { id: existing.id },
          data: {
            description: jsonPayload,
            price: "0",
            icon: "SETTINGS",
            active: false,
          },
        });
      } else {
        await prisma.serviceOffer.create({
          data: {
            title: "__LOUNGE_SETTINGS__",
            description: jsonPayload,
            price: "0",
            icon: "SETTINGS",
            active: false,
            order: 999999,
          },
        });
      }
    } catch (fallbackErr) {
      console.warn("ServiceOffer save fallback:", fallbackErr);
    }

    revalidatePath("/");
    revalidatePath("/customer");
    revalidatePath("/admin");
    revalidatePath("/admin/content");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "حدث خطأ أثناء حفظ الإعدادات" };
  }
}

export async function createServiceOffer(formData: FormData) {
  await assertAuthorized(["ADMIN"]);

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = String(formData.get("price") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim();

  if (!title || !description || !price) {
    throw new Error("العنوان والوصف والسعر مطلوبان");
  }

  await prisma.serviceOffer.create({
    data: {
      title,
      description,
      price,
      icon: icon || title[0] || "P",
      order: Date.now() % 100000,
      active: true,
    },
  });

  revalidatePath("/");
  revalidatePath("/customer");
  revalidatePath("/admin");
  revalidatePath("/admin/content");
}

export async function createPackagePlan(formData: FormData) {
  await assertAuthorized(["ADMIN"]);

  const name = String(formData.get("name") ?? "").trim();
  const feature = String(formData.get("feature") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const highlight = String(formData.get("highlight") ?? "false") === "true";

  if (!name || !feature || !price) {
    throw new Error("اسم الباقة، الميزة والسعر مطلوبان");
  }

  await prisma.packagePlan.create({
    data: {
      name,
      feature,
      price,
      highlight,
      order: Date.now() % 100000,
      active: true,
    },
  });

  revalidatePath("/");
  revalidatePath("/customer");
  revalidatePath("/packages");
  revalidatePath("/admin");
  revalidatePath("/admin/content");
}

export async function createCustomerReview(formData: FormData) {
  await assertAuthorized(["ADMIN"]);

  const name = String(formData.get("name") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const rating = Number(formData.get("rating") ?? 5);

  if (!name || !text) {
    throw new Error("اسم العميل والنص مطلوبان");
  }

  await prisma.customerReview.create({
    data: {
      name,
      text,
      rating: Number.isFinite(rating) ? Math.min(5, Math.max(1, rating)) : 5,
      order: Date.now() % 100000,
      active: true,
    },
  });

  revalidatePath("/");
  revalidatePath("/customer");
  revalidatePath("/admin");
  revalidatePath("/admin/content");
}

export async function toggleServiceOffer(serviceId: string, active: boolean) {
  await assertAuthorized(["ADMIN"]);

  await prisma.serviceOffer.update({
    where: { id: serviceId },
    data: { active },
  });

  revalidatePath("/");
  revalidatePath("/customer");
  revalidatePath("/admin");
  revalidatePath("/admin/content");
}

export async function togglePackagePlan(packageId: string, active: boolean) {
  await assertAuthorized(["ADMIN"]);

  await prisma.packagePlan.update({
    where: { id: packageId },
    data: { active },
  });

  revalidatePath("/");
  revalidatePath("/customer");
  revalidatePath("/packages");
  revalidatePath("/admin");
  revalidatePath("/admin/content");
}

export async function toggleCustomerReview(reviewId: string, active: boolean) {
  await assertAuthorized(["ADMIN"]);

  await prisma.customerReview.update({
    where: { id: reviewId },
    data: { active },
  });

  revalidatePath("/");
  revalidatePath("/customer");
  revalidatePath("/admin");
  revalidatePath("/admin/content");
}