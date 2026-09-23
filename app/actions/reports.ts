"use server";

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

export async function getFinancialReport() {
  const [today, week, month] = await Promise.all([
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ]);

  return {
    today: Number(today._sum.totalAmount ?? 0),
    week: Number(week._sum.totalAmount ?? 0),
    month: Number(month._sum.totalAmount ?? 0),
  };
}
