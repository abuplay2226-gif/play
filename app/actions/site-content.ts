"use server";

import { prisma } from "@/lib/prisma";

export type LandingPageService = {
  id: string;
  title: string;
  description: string;
  price: string;
  icon: string | null;
  active: boolean;
  order: number;
};

export type LandingPagePackage = {
  id: string;
  name: string;
  price: number;
  feature: string;
  hours: number;
  validityDays: number;
  drinksCount: number;
  deviceType: string;
  highlight: boolean;
  active: boolean;
  order: number;
};

export type LandingPageReview = {
  id: string;
  name: string;
  text: string;
  rating: number;
  active: boolean;
  order: number;
};

function parsePackageMeta(rawFeature?: string | null) {
  if (!rawFeature) {
    return { hours: 5, validityDays: 30, drinksCount: 0, deviceType: "ALL", description: "باقة مميزة" };
  }
  try {
    const parsed = JSON.parse(rawFeature);
    return {
      hours: Number(parsed.hours || 5),
      validityDays: Number(parsed.validityDays || 30),
      drinksCount: Number(parsed.drinksCount || 0),
      deviceType: parsed.deviceType || "ALL",
      description: parsed.description || `${parsed.hours || 5} ساعات لعب صالحة لمدة ${parsed.validityDays || 30} يوم`,
    };
  } catch {
    return { hours: 5, validityDays: 30, drinksCount: 0, deviceType: "ALL", description: rawFeature };
  }
}

export async function getLandingPageContent(): Promise<{
  services: LandingPageService[];
  packages: LandingPagePackage[];
  reviews: LandingPageReview[];
}> {
  const prismaClient = prisma as any;

  const [services, rawPackages, reviews] = await Promise.all([
    prismaClient.serviceOffer.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
    }),
    prismaClient.packagePlan.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
    }),
    prismaClient.customerReview.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
    }),
  ]);

  const packages: LandingPagePackage[] = rawPackages.map((p: any) => {
    const meta = parsePackageMeta(p.feature);
    return {
      id: p.id,
      name: p.name,
      price: Number(p.price),
      feature: meta.description,
      hours: meta.hours,
      validityDays: meta.validityDays,
      drinksCount: meta.drinksCount,
      deviceType: meta.deviceType,
      highlight: Boolean(p.highlight),
      active: Boolean(p.active),
      order: p.order,
    };
  });

  return {
    services,
    packages,
    reviews,
  };
}