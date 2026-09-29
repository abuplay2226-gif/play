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

const fallbackContent: {
  services: LandingPageService[];
  packages: LandingPagePackage[];
  reviews: LandingPageReview[];
} = {
  services: [],
  packages: [],
  reviews: [],
};

export async function getLandingPageContent(): Promise<{
  services: LandingPageService[];
  packages: LandingPagePackage[];
  reviews: LandingPageReview[];
}> {
  const prismaClient = prisma as any;

  if (!prismaClient.serviceOffer || !prismaClient.packagePlan || !prismaClient.customerReview) {
    return fallbackContent;
  }

  const [services, packages, reviews] = await Promise.all([
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

  return {
    services,
    packages,
    reviews,
  };
}
