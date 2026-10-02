import Link from "next/link";
import { requireRole } from "@/app/actions/auth";
import { getDevices } from "@/app/actions/devices";
import { getDashboardSummary } from "@/app/actions/reports";
import { SiteShell } from "@/components/site-shell";
import { prisma } from "@/lib/prisma";

export default async function StaffPage() {
  const user = await requireRole(["STAFF", "CASHIER", "ADMIN"]);

  const [summary, devices, openShift, recentOrders, upcomingBookings] = await Promise.all([
    getDashboardSummary(),
    getDevices(),
    prisma.shift.findFirst({
      where: { status: "OPEN" },
      include: { user: true, cashDrawer: true },
    }),
    prisma.order.findMany({
      take: 4,
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { product: true } },
        session: { include: { device: true } },
      },
    }),
    prisma.booking.findMany({
      where: {
        status: { in: ["PENDING", "CONFIRMED"] },
        startTime: { gte: new Date() },
      },
      take: 3,
      orderBy: { startTime: "asc" },
      include: { customer: true, device: true },
    }),
  ]);

  const availableDevices = devices.filter((d) => d.status === "AVAILABLE").length;
  const occupiedDevices = devices.filter((d) => d.status === "OCCUPIED").length;

  const staffQuickLinks = [
    { label: "الأجهزة والعدادات", href: "/devices", icon: "🎮" },
    { label: "نقاط البيع (الكافيه)", href: "/pos", icon: "☕" },
    { label: "الورديات والشيفت", href: "/shifts", icon: "⏱️" },
    { label: "الحجوزات القادمة", href: "/bookings", icon: "📅" },
    { label: "البطولات الجارية", href: "/tournaments", icon: "🏆" },
    { label: "إدارة المخزن", href: "/inventory", icon: "📦" },
    { label: "سجل العملاء", href: "/customers", icon: "👤" },
  ];

  return (
    <SiteShell title="لوحة تشغيل الصالة" userRole={user.role} userName={user.name}>
      {/* بانر الترحيب والروابط التشغيلية المعتمدة */}
      <div className="rounded-[32px] border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-slate-900 to-slate-950 p-5 shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-sky-300">
                Staff Control Hub
              </p>
            </div>
            <h2 className="mt-3 text-2xl sm:text-3xl font-black text-white">
              مرحباً {user.name} — شاشة العمليات
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              {openShift ? (
                <span>
                  الوردية الحالية مفتوحة برقم (#{openShift.id.slice(-4)}) بواسطة الكاشير:{" "}
                  <strong className="text-emerald-300">{openShift.user.name}</strong> على (
                  {openShift.cashDrawer.name})
                </span>
              ) : (
                <span className="text-amber-300 font-bold">
                  ⚠️ تنبيه: لا توجد وردية مفتوحة حالياً، يرجى فتح الوردية لتشغيل العدادات والطلبات.
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {staffQuickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3.5 py-2 text-xs font-bold text-sky-200 hover:border-sky-400 hover:bg-sky-500/20 transition"
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* بطاقات المؤشرات اللحظية الأربعة */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
          <p className="text-xs text-slate-400 font-bold">الأجهزة الشغالة حالياً</p>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-rose-400 font-mono">{occupiedDevices}</p>
            <span className="text-xs text-slate-500 font-bold">من أصل {devices.length}</span>
          </div>
        </article>

        <article className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
          <p className="text-xs text-slate-400 font-bold">الأجهزة المتاحة للعب</p>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-emerald-300 font-mono">{availableDevices}</p>
            <span className="text-xs text-emerald-400/80 font-bold">جاهزة الآن</span>
          </div>
        </article>

        <article className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
          <p className="text-xs text-slate-400 font-bold">طلبات الكافيه اليوم</p>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-amber-300 font-mono">{summary.ordersToday}</p>
            <Link href="/pos" className="text-xs text-sky-400 hover:underline">
              فتح الكافيه ←
            </Link>
          </div>
        </article>

        <article className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
          <p className="text-xs text-slate-400 font-bold">الحجوزات القادمة</p>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-violet-300 font-mono">{upcomingBookings.length}</p>
            <Link href="/bookings" className="text-xs text-sky-400 hover:underline">
              الجدول ←
            </Link>
          </div>
        </article>
      </div>

      {/* القسم السفلي: شبكة توزيع العمليات */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* حالة أجهزة الصالة المباشرة */}
        <div className="rounded-[28px] border border-slate-800 bg-slate-900/90 p-5">
          <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-lg font-black text-white">حالة الأجهزة بالصالة</h2>
              <p className="text-xs text-slate-400">متابعة الأجهزة المشغولة والمتاحة فورياً</p>
            </div>
            <Link
              href="/devices"
              className="text-xs font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 rounded-xl hover:bg-sky-500/20 transition"
            >
              شاشة الأجهزة والعدادات ←
            </Link>
          </div>

          <div className="space-y-3">
            {devices.slice(0, 6).map((device) => {
              const activeSession = device.sessions[0];
              const isOccupied = device.status === "OCCUPIED" && Boolean(activeSession);
              const isPaused = activeSession?.status === "PAUSED";

              return (
                <div
                  key={device.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        isOccupied
                          ? isPaused
                            ? "bg-amber-400"
                            : "bg-rose-500 animate-pulse"
                          : "bg-emerald-400"
                      }`}
                    />
                    <div>
                      <p className="font-bold text-white text-sm">{device.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {device.type} · {isOccupied ? `العميل: ${activeSession?.customer?.name || "عابر"}` : "متاح للعب"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      isOccupied
                        ? isPaused
                          ? "bg-amber-500/15 text-amber-300"
                          : "bg-rose-500/15 text-rose-300"
                        : "bg-emerald-500/15 text-emerald-300"
                    }`}
                  >
                    {isOccupied ? (isPaused ? "مؤقت ⏸" : "يلعب الآن 🎮") : "متاح ✓"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* آخر طلبات الكافيه والحجوزات المعلقة */}
        <div className="space-y-6">
          {/* الحجوزات القادمة اليوم */}
          <div className="rounded-[28px] border border-slate-800 bg-slate-900/90 p-5">
            <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-black text-white">الحجوزات القادمة</h2>
              <Link href="/bookings" className="text-xs font-bold text-sky-400 hover:underline">
                عرض الجدول
              </Link>
            </div>

            <div className="space-y-2.5 text-xs">
              {upcomingBookings.map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-white">{b.customer.name}</p>
                    <p className="text-[10px] text-sky-300 font-mono mt-0.5">
                      الجهاز: {b.device.name} · موعد:{" "}
                      {new Date(b.startTime).toLocaleTimeString("ar-EG", { timeStyle: "short" })}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-500/15 text-amber-300 px-2 py-0.5 text-[10px] font-bold">
                    {b.status}
                  </span>
                </div>
              ))}

              {upcomingBookings.length === 0 && (
                <p className="text-center text-xs text-slate-500 py-3">لا توجد حجوزات جديدة لليوم.</p>
              )}
            </div>
          </div>

          {/* آخر طلبات الكافيه السريعة */}
          <div className="rounded-[28px] border border-slate-800 bg-slate-900/90 p-5">
            <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-black text-white">آخر طلبات الكافيه</h2>
              <Link href="/pos" className="text-xs font-bold text-sky-400 hover:underline">
                طلب جديد
              </Link>
            </div>

            <div className="space-y-2.5 text-xs">
              {recentOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-white">
                      {ord.session?.device?.name ? `طلب لجهاز (${ord.session.device.name})` : "طلب خارجي (كاش)"}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {ord.items.map((i) => `${i.product.name} (${i.quantity})`).join(", ")}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {ord.totalAmount.toFixed(2)} ج.م
                  </span>
                </div>
              ))}

              {recentOrders.length === 0 && (
                <p className="text-center text-xs text-slate-500 py-3">لم يتم تسجيل طلبات كافيه بعد.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}