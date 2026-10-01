const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log("⏳ جاري تنظيف وتصفير قاعدة البيانات لبدء الدورة المحاسبية...");

  try {
    // 1. حذف البطولات والمباريات بالكامل
    if (prisma.tournamentMatch) await prisma.tournamentMatch.deleteMany();
    if (prisma.tournamentParticipant) await prisma.tournamentParticipant.deleteMany();
    if (prisma.tournamentGroup) await prisma.tournamentGroup.deleteMany();
    if (prisma.tournament) await prisma.tournament.deleteMany();

    // 2. حذف طلبات الكافيه ومبيعات الصالة
    if (prisma.orderItem) await prisma.orderItem.deleteMany();
    if (prisma.order) await prisma.order.deleteMany();

    // 3. حذف الجلسات وعدادات الأجهزة السابقة
    if (prisma.timeSlot) await prisma.timeSlot.deleteMany();
    if (prisma.deviceSession) await prisma.deviceSession.deleteMany();

    // 4. حذف الحجوزات والإشعارات
    if (prisma.booking) await prisma.booking.deleteMany();
    if (prisma.notification) await prisma.notification.deleteMany();

    // 5. حذف المعاملات المالية، سندات الصرف والقبض، والورديات
    if (prisma.financialTransaction) await prisma.financialTransaction.deleteMany();
    if (prisma.shift) await prisma.shift.deleteMany();

    // 6. حذف فواتير الشراء وحسابات الموردين
    if (prisma.purchaseInvoiceItem) await prisma.purchaseInvoiceItem.deleteMany();
    if (prisma.purchaseInvoice) await prisma.purchaseInvoice.deleteMany();
    if (prisma.supplier) await prisma.supplier.deleteMany();

    // 7. حذف بيانات العملاء والمديونيات
    if (prisma.customer) await prisma.customer.deleteMany();

    // 8. حذف وصفات البوفيه، المواد الخام، والمنتجات المباعة
    if (prisma.recipeItem) await prisma.recipeItem.deleteMany();
    if (prisma.product) await prisma.product.deleteMany();
    if (prisma.category) await prisma.category.deleteMany();

    // 9. تصفير رصيد الخزائن النقدية إلى (0.00 ج.م)
    if (prisma.cashDrawer) {
      await prisma.cashDrawer.updateMany({
        data: { balance: 0 },
      });
    }

    // 10. إعادة تعيين حالة جميع الأجهزة إلى "متاح للعب" (AVAILABLE)
    if (prisma.device) {
      await prisma.device.updateMany({
        data: { status: "AVAILABLE" },
      });
    }

    // 11. حذف الموظفين الفرعيين والإبقاء على حساب الأدمن (ADMIN) فقط
    if (prisma.user) {
      const deletedStaff = await prisma.user.deleteMany({
        where: {
          role: { not: "ADMIN" },
        },
      });
      console.log(`👤 تم الإبقاء على حساب الأدمن بنجاح وحذف (${deletedStaff.count}) حسابات موظفين فرعيين.`);
    }

    console.log("--------------------------------------------------");
    console.log("✅ تم تنظيف وتصفير قاعدة البيانات بنجاح تام!");
    console.log("🚀 يمكنك الآن فتح وردية جديدة وتجربة الدورة المحاسبية من الصفر.");
    console.log("--------------------------------------------------");
  } catch (error) {
    console.error("❌ حدث خطأ أثناء تنظيف البيانات:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();