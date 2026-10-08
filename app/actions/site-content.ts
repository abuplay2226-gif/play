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

export type LoungeSettings = {
  heroImage: string;
  heroMobileImage?: string;
  heroTitle: string;
  heroSubtitle: string;
  address: string;
  mapUrl: string;
  phone: string;
  whatsapp: string;
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

export async function getLoungeSettings(): Promise<LoungeSettings> {
  const defaults: LoungeSettings = {
    heroImage: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1600&auto=format&fit=crop",
    heroMobileImage: "",
    heroTitle: "أهلاً بك في أفضل صالة بلايستيشن وبلياردو",
    heroSubtitle: "أجواء شبابية راقية، شاشات 4K فائقة، طاولات بلياردو احترافية، ومشروبات باردة وساخنة 🎮🎱",
    address: "شارع النزهة - الحي الرابع - أمام سيتي سنتر",
    mapUrl: "https://maps.google.com/maps?q=Cairo&t=&z=13&ie=UTF8&iwloc=&output=embed",
    phone: "01000000000",
    whatsapp: "201000000000",
  };

  // 1. القراءة من جدول LoungeSetting عبر استعلام مباشر
  try {
    const rows: any = await prisma.$queryRawUnsafe(
      `SELECT * FROM "LoungeSetting" WHERE "id" = 'default' LIMIT 1`
    );

    if (Array.isArray(rows) && rows.length > 0) {
      const r = rows[0];
      return {
        heroImage: r.heroImage || defaults.heroImage,
        heroMobileImage: r.heroMobileImage || defaults.heroMobileImage || "",
        heroTitle: r.heroTitle || defaults.heroTitle,
        heroSubtitle: r.heroSubtitle || defaults.heroSubtitle,
        address: r.address || defaults.address,
        mapUrl: r.mapUrl || defaults.mapUrl,
        phone: r.phone || defaults.phone,
        whatsapp: r.whatsapp || defaults.whatsapp,
      };
    }
  } catch {
    // استمرار للقراءة الاحتياطية
  }

  // 2. القراءة الاحتياطية من ServiceOffer
  try {
    const settingRecord = await prisma.serviceOffer.findFirst({
      where: { title: "__LOUNGE_SETTINGS__" },
    });

    if (settingRecord && settingRecord.description) {
      const parsed = JSON.parse(settingRecord.description);
      return {
        heroImage: parsed.heroImage || defaults.heroImage,
        heroMobileImage: parsed.heroMobileImage || defaults.heroMobileImage || "",
        heroTitle: parsed.heroTitle || defaults.heroTitle,
        heroSubtitle: parsed.heroSubtitle || defaults.heroSubtitle,
        address: parsed.address || defaults.address,
        mapUrl: parsed.mapUrl || defaults.mapUrl,
        phone: parsed.phone || defaults.phone,
        whatsapp: parsed.whatsapp || defaults.whatsapp,
      };
    }
  } catch {
    // في حال عدم وجود سجلات يتم إرجاع القيم الافتراضية
  }

  return defaults;
}

export async function getLandingPageContent(): Promise<{
  services: LandingPageService[];
  packages: LandingPagePackage[];
  reviews: LandingPageReview[];
}> {
  const prismaClient = prisma as any;

  const [services, rawPackages, reviews] = await Promise.all([
    prismaClient.serviceOffer.findMany({
      where: { active: true, title: { not: "__LOUNGE_SETTINGS__" } },
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