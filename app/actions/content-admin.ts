"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export async function getServiceOffers() {
  return prisma.serviceOffer.findMany({
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

export async function createServiceOffer(formData: FormData) {
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
  revalidatePath("/admin");
  revalidatePath("/admin/content");
}

export async function createPackagePlan(formData: FormData) {
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
  revalidatePath("/admin");
  revalidatePath("/admin/content");
}

export async function createCustomerReview(formData: FormData) {
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
  revalidatePath("/admin");
  revalidatePath("/admin/content");
}

export async function toggleServiceOffer(serviceId: string, active: boolean) {
  await prisma.serviceOffer.update({
    where: { id: serviceId },
    data: { active },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/content");
}

export async function togglePackagePlan(packageId: string, active: boolean) {
  await prisma.packagePlan.update({
    where: { id: packageId },
    data: { active },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/content");
}

export async function toggleCustomerReview(reviewId: string, active: boolean) {
  await prisma.customerReview.update({
    where: { id: reviewId },
    data: { active },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/content");
}
