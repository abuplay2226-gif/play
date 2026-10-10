import Link from "next/link";
import { requireRole } from "@/app/actions/auth";
import { PosWorkspace } from "@/components/pos-workspace";
import { SiteShell } from "@/components/site-shell";
import { prisma } from "@/lib/prisma";

export default async function PosPage() {
  await requireRole(["ADMIN", "CASHIER", "STAFF"]);

  const [categories, products, activeSessions, openShift, cashDrawers, customers] = await Promise.all([
    prisma.category.findMany({
      include: { products: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { isRawMaterial: false },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    prisma.deviceSession.findMany({
      where: { status: { in: ["ACTIVE", "PAUSED"] } },
      include: { device: true, customer: true },
      orderBy: { startTime: "desc" },
    }),
    prisma.shift.findFirst({
      where: { status: "OPEN" },
      include: { cashDrawer: true },
    }),
    prisma.cashDrawer.findMany({ orderBy: { name: "asc" } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
  ]);

  // جلب الطلبات المعلقة للكافيه والطلبات المنزلة على الأجهزة
  let openCafeOrders: any[] = [];
  let sessionOrders: any[] = [];
  let recentOrders: any[] = [];

  if (openShift) {
    [openCafeOrders, sessionOrders, recentOrders] = await Promise.all([
      // تابات الكافيه المفتوحة (بدون جهاز ومعلقة)
      (prisma as any).order.findMany({
        where: {
          shiftId: openShift.id,
          status: "PENDING",
          sessionId: null,
        },
        include: {
          items: { include: { product: true } },
          customer: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      // طلبات منزلة على جلسات الأجهزة النشطة
      (prisma as any).order.findMany({
        where: {
          shiftId: openShift.id,
          status: "PENDING",
          sessionId: { not: null },
        },
        include: {
          items: { include: { product: true } },
          session: { include: { device: true, customer: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      // آخر الطلبات المدفوعة في الوردية الحالية
      (prisma as any).order.findMany({
        where: {
          shiftId: openShift.id,
          status: "PAID",
        },
        include: {
          items: { include: { product: true } },
          customer: true,
        },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
    ]);
  }

  return (
    <SiteShell title="نقطة البيع وإدارة طلبات الكافيه (POS)">
      {!openShift ? (
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200 text-center space-y-3">
          <p className="text-base font-black">⚠️ لا يمكن تسجيل أو محاسبة طلبات الكافيه بدون وردية مفتوحة</p>
          <p className="text-xs text-rose-300">
            يرجى فتح وردية وتعيين رصيد الدرج النقدي أولاً للبدء في تشغيل الكافيه والعدادات.
          </p>
          <Link
            href="/shifts"
            className="inline-block rounded-full bg-rose-500 px-6 py-2.5 text-xs font-black text-slate-950 hover:bg-rose-400 transition"
          >
            الانتقال لفتح وردية جديدة ←
          </Link>
        </div>
      ) : (
        <PosWorkspace
          categories={categories}
          products={products}
          activeSessions={activeSessions}
          openShift={openShift}
          cashDrawers={cashDrawers}
          customers={customers}
          openCafeOrders={openCafeOrders}
          sessionOrders={sessionOrders}
          recentOrders={recentOrders}
        />
      )}
    </SiteShell>
  );
}