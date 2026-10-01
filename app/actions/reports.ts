"use server";

import { assertAuthorized } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function getDashboardSummary() {
  const lowStockThreshold = 5;

  const [devicesCount, activeSessions, openShifts, ordersCount, totalSales, lowStock] = await Promise.all([
    prisma.device.count(),
    prisma.deviceSession.count({ where: { status: { in: ["ACTIVE", "PAUSED"] } } }),
    prisma.shift.count({ where: { status: "OPEN" } }),
    prisma.order.count(),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
    }),
    prisma.product.count({
      where: {
        stockQuantity: {
          lte: lowStockThreshold,
        },
      },
    }),
  ]);

  const ordersToday = await prisma.order.count({
    where: {
      createdAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
  });

  const totalValue = Number(totalSales._sum.totalAmount ?? 0);

  return {
    devicesCount,
    activeSessions,
    openShifts,
    ordersCount,
    ordersToday,
    totalSales: totalValue,
    lowStock,
  };
}

// دالة تقرير الأرباح وقائمة الدخل التفصيلية (P&L Report)
export async function getDetailedProfitReport(startDate?: string, endDate?: string) {
  await assertAuthorized(["ADMIN"]);

  const dateFilter: any = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      dateFilter.createdAt.gte = s;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      dateFilter.createdAt.lte = e;
    }
  } else {
    // افتراضي: من بداية اليوم
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateFilter.createdAt = { gte: today };
  }

  const sessionDateFilter: any = {};
  if (dateFilter.createdAt) {
    sessionDateFilter.endTime = dateFilter.createdAt;
  }

  const [completedSessions, paidOrders, transactions, allDevices] = await Promise.all([
    prisma.deviceSession.findMany({
      where: {
        status: "COMPLETED",
        ...sessionDateFilter,
      },
      include: { device: true },
    }),
    prisma.order.findMany({
      where: {
        status: { not: "CANCELLED" },
        ...dateFilter,
      },
      include: {
        items: { include: { product: true } },
      },
    }),
    prisma.financialTransaction.findMany({
      where: dateFilter,
    }),
    prisma.device.findMany({ select: { id: true, name: true, type: true } }),
  ]);

  // 1. حساب إيرادات البلايستيشن والوقت
  const playstationRevenue = completedSessions.reduce((sum, s) => sum + (s.timeCost || 0), 0);

  // 2. حساب إيرادات الكافيه
  const cafeRevenue = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // إجمالي الإيرادات الكلية
  const totalGrossRevenue = Number((playstationRevenue + cafeRevenue).toFixed(2));

  // 3. المصروفات التشغيلية (فواتير، صيانة، نثريات - بدون مسحوبات المالك)
  const operatingExpenses = transactions
    .filter((t: any) => t.type === "EXPENSE" && t.counterpartyType !== "MANAGEMENT")
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  // 4. مسحوبات وتوريدات الإدارة والمالك
  const managementWithdrawals = transactions
    .filter((t: any) => t.type === "EXPENSE" && t.counterpartyType === "MANAGEMENT")
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  // 5. سلف الموظفين المسحوبة في الفترة
  const staffAdvances = transactions
    .filter((t: any) => t.type === "EXPENSE" && t.counterpartyType === "EMPLOYEE")
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  // 6. صافي الربح التشغيلي الحقيقي (الإيراد - المصروفات التشغيلية)
  const netOperatingProfit = Number((totalGrossRevenue - operatingExpenses).toFixed(2));

  // 7. تحليلات الأجهزة الأكثر تحقيقاً للإيراد
  const deviceRevenueMap: Record<string, { name: string; type: string; revenue: number; sessionsCount: number }> = {};
  for (const d of allDevices) {
    deviceRevenueMap[d.id] = { name: d.name, type: d.type, revenue: 0, sessionsCount: 0 };
  }
  for (const s of completedSessions) {
    if (deviceRevenueMap[s.deviceId]) {
      deviceRevenueMap[s.deviceId].revenue += s.timeCost;
      deviceRevenueMap[s.deviceId].sessionsCount += 1;
    }
  }
  const topDevices = Object.values(deviceRevenueMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // 8. تحليلات الأصناف الأكثر مبيعاً في الكافيه
  const productSalesMap: Record<string, { name: string; quantity: number; totalRevenue: number }> = {};
  for (const o of paidOrders) {
    for (const item of o.items) {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = { name: item.product.name, quantity: 0, totalRevenue: 0 };
      }
      productSalesMap[item.productId].quantity += item.quantity;
      productSalesMap[item.productId].totalRevenue += item.subTotal;
    }
  }
  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return {
    playstationRevenue: Number(playstationRevenue.toFixed(2)),
    cafeRevenue: Number(cafeRevenue.toFixed(2)),
    totalGrossRevenue,
    operatingExpenses: Number(operatingExpenses.toFixed(2)),
    managementWithdrawals: Number(managementWithdrawals.toFixed(2)),
    staffAdvances: Number(staffAdvances.toFixed(2)),
    netOperatingProfit,
    sessionsCount: completedSessions.length,
    ordersCount: paidOrders.length,
    topDevices,
    topProducts,
  };
}