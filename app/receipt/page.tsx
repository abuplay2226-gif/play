import { ReceiptPrintButton } from "@/components/receipt-print-button";
import { SiteShell } from "@/components/site-shell";
import { isBilliardDevice } from "@/lib/device-utils";
import { prisma } from "@/lib/prisma";

export default async function ReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string; orderId?: string }>;
}) {
  const { sessionId, orderId } = await searchParams;

  let invoiceNumber = "INV-0001";
  let invoiceDate = new Date();
  let cashierName = "كاشير الصالة";
  let customerName = "عميل صالة عابر";
  let customerPhone = "";
  let currentDebt = 0;
  let deviceName = "";
  let durationText = "";
  let timeCost = 0;
  let timeBreakdown: Array<{ label: string; duration: string; cost: string }> = [];
  let ordersList: Array<{ name: string; qty: number; total: string }> = [];
  let subTotal = 0;
  let finalTotal = 0;

  if (sessionId) {
    const session = await prisma.deviceSession.findUnique({
      where: { id: sessionId },
      include: {
        device: true,
        customer: true,
        slots: { orderBy: { startTime: "asc" } },
        shift: { include: { user: true } },
        orders: {
          where: { status: { not: "CANCELLED" } },
          include: { items: { include: { product: true } } },
        },
      },
    });

    if (session) {
      invoiceNumber = `SES-${session.id.slice(-6).toUpperCase()}`;
      invoiceDate = session.endTime ?? new Date();
      cashierName = session.shift?.user?.name ?? "الكاشير";
      deviceName = session.device.name;
      timeCost = session.timeCost;
      finalTotal = session.totalCost;

      const isBilliard = isBilliardDevice(session.device.type);

      if (session.customer) {
        customerName = session.customer.name;
        customerPhone = session.customer.phone;
        currentDebt = session.customer.debt;
      }

      const diffMs = (session.endTime ?? new Date()).getTime() - session.startTime.getTime();
      const mins = Math.max(0, Math.floor(diffMs / 60000));
      durationText = `${Math.floor(mins / 60)} س و ${mins % 60} د`;

      let singleMins = 0;
      let singleCost = 0;
      let multiMins = 0;
      let multiCost = 0;
      const now = session.endTime ?? new Date();

      for (const slot of session.slots) {
        const end = slot.endTime ?? now;
        const slotDuration = Math.max(0, Math.floor((end.getTime() - slot.startTime.getTime()) / 60000));
        const cost = slot.totalCost > 0 ? slot.totalCost : Number(((slotDuration / 60) * slot.hourlyRate).toFixed(2));

        if (slot.type === "MULTI") {
          multiMins += slotDuration;
          multiCost += cost;
        } else {
          singleMins += slotDuration;
          singleCost += cost;
        }
      }

      if (singleMins > 0 && multiMins > 0) {
        timeBreakdown = [
          {
            label: isBilliard ? "لعب بالساعة" : "لعب فردي",
            duration: `${Math.floor(singleMins / 60)} س و ${singleMins % 60} د`,
            cost: singleCost.toFixed(2),
          },
          {
            label: isBilliard ? "لعب بالجيم" : "لعب جماعي (زوجي)",
            duration: `${Math.floor(multiMins / 60)} س و ${multiMins % 60} د`,
            cost: multiCost.toFixed(2),
          },
        ];
      }

      let cafeSum = 0;
      session.orders.forEach((ord) => {
        ord.items.forEach((item) => {
          cafeSum += item.subTotal;
          ordersList.push({
            name: item.product.name,
            qty: item.quantity,
            total: `${item.subTotal.toFixed(2)}`,
          });
        });
      });

      subTotal = timeCost + cafeSum;
    }
  } else if (orderId) {
    const order = await (prisma as any).order.findUnique({
      where: { id: orderId },
      include: {
        shift: { include: { user: true } },
        items: { include: { product: true } },
        customer: true,
      },
    });

    if (order) {
      invoiceNumber = `ORD-${order.id.slice(-6).toUpperCase()}`;
      invoiceDate = order.createdAt;
      cashierName = order.shift?.user?.name ?? "الكاشير";
      finalTotal = order.totalAmount;
      subTotal = order.totalAmount;

      if (order.customer) {
        customerName = order.customer.name;
        customerPhone = order.customer.phone;
        currentDebt = order.customer.debt;
      } else if (order.notes) {
        customerName = order.notes;
      }

      ordersList = order.items.map((i: any) => ({
        name: i.product.name,
        qty: i.quantity,
        total: `${i.subTotal.toFixed(2)}`,
      }));
    }
  }

  return (
    <SiteShell title="فاتورة الحساب والريسيت الحراري">
      <div className="flex flex-col items-center">
        <div className="mb-6 flex gap-3 print:hidden">
          <ReceiptPrintButton />
        </div>

        <div
          id="printable-receipt"
          className="receipt-box bg-white text-black shadow-xl"
          dir="rtl"
        >
          <div className="receipt-header">
            <h2 className="title">PlayStation Lounge</h2>
            <p className="subtitle">كافيه وألعاب إلكترونية وبلياردو</p>
            <p className="inv-no">فاتورة #{invoiceNumber}</p>
          </div>

          <div className="meta-section">
            <div className="row">
              <span className="lbl">التاريخ:</span>
              <span className="val font-mono">{new Date(invoiceDate).toLocaleString("ar-EG")}</span>
            </div>
            {deviceName && (
              <div className="row">
                <span className="lbl">الجهاز / الطاولة:</span>
                <span className="val font-bold">{deviceName}</span>
              </div>
            )}
            <div className="row">
              <span className="lbl">العميل:</span>
              <span className="val font-bold">{customerName}</span>
            </div>
            {customerPhone && (
              <div className="row">
                <span className="lbl">الهاتف:</span>
                <span className="val font-mono">{customerPhone}</span>
              </div>
            )}
            <div className="row">
              <span className="lbl">الكاشير:</span>
              <span className="val">{cashierName}</span>
            </div>
          </div>

          <div className="items-section">
            <div className="items-header">
              <span>البند</span>
              <span>الإجمالي (ج.م)</span>
            </div>

            {timeBreakdown.length > 0 ? (
              timeBreakdown.map((t, idx) => (
                <div key={idx} className="item-row">
                  <span>{t.label} ({t.duration})</span>
                  <span className="price font-mono">{t.cost}</span>
                </div>
              ))
            ) : timeCost > 0 ? (
              <div className="item-row">
                <span>وقت اللعب ({durationText})</span>
                <span className="price font-mono">{timeCost.toFixed(2)}</span>
              </div>
            ) : null}

            {ordersList.map((item, idx) => (
              <div key={idx} className="item-row">
                <span>{item.name} × {item.qty}</span>
                <span className="price font-mono">{item.total}</span>
              </div>
            ))}
          </div>

          <div className="totals-section">
            <div className="total-row">
              <span>المجموع قبل الخصم:</span>
              <span className="font-mono">{subTotal.toFixed(2)} ج.م</span>
            </div>

            <div className="grand-total-row">
              <span>المبلغ الإجمالي الصافي:</span>
              <span className="font-mono">{finalTotal.toFixed(2)} ج.م</span>
            </div>

            {currentDebt > 0 && (
              <div className="debt-row">
                <span>ديون سابقة مسجلة:</span>
                <span className="font-mono">{currentDebt.toFixed(2)} ج.م</span>
              </div>
            )}
          </div>

          <div className="footer-note">
            شكراً لزيارتكم! نتشرف بحضوركم دائماً.
          </div>
        </div>
      </div>

      <style>{`
        .receipt-box {
          width: 70mm;
          max-width: 70mm;
          padding: 3mm 4mm;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-family: "Tahoma", "Arial", sans-serif;
          box-sizing: border-box;
          color: #000;
        }

        .receipt-header {
          text-align: center;
          border-bottom: 1px dashed #666;
          padding-bottom: 5px;
        }
        .receipt-header .title {
          font-size: 15px;
          font-weight: 900;
          margin: 0;
        }
        .receipt-header .subtitle {
          font-size: 10px;
          color: #444;
          margin: 2px 0 0 0;
        }
        .receipt-header .inv-no {
          font-size: 10px;
          font-family: monospace;
          margin: 2px 0 0 0;
        }

        .meta-section {
          padding: 6px 0;
          border-bottom: 1px dashed #666;
          font-size: 10.5px;
          line-height: 1.4;
        }
        .row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .lbl { color: #333; }
        .val { color: #000; }

        .items-section {
          padding: 6px 0;
          border-bottom: 1px dashed #666;
          font-size: 11px;
        }
        .items-header {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          border-bottom: 1px solid #999;
          padding-bottom: 3px;
          margin-bottom: 4px;
        }
        .item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3px;
        }
        .price {
          font-weight: bold;
        }

        .totals-section {
          padding: 6px 0;
          border-bottom: 1px dashed #666;
          font-size: 11px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          color: #333;
        }
        .grand-total-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 900;
          border-top: 1px solid #000;
          padding-top: 4px;
          margin-top: 4px;
        }
        .debt-row {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          color: #b91c1c;
          margin-top: 3px;
        }

        .footer-note {
          text-align: center;
          font-size: 10px;
          color: #555;
          margin-top: 8px;
        }

        @page {
          size: 80mm auto;
          margin: 0mm !important;
        }

        @media print {
          html, body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
          }

          body * {
            visibility: hidden !important;
          }

          #printable-receipt,
          #printable-receipt * {
            visibility: visible !important;
          }

          #printable-receipt {
            position: absolute !important;
            right: 0 !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 auto !important;
            width: 70mm !important;
            max-width: 70mm !important;
            padding: 2mm 3mm !important;
            border: none !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
            background: #fff !important;
            color: #000 !important;
          }

          .receipt-header .subtitle,
          .lbl,
          .total-row,
          .footer-note {
            color: #000 !important;
          }
        }
      `}</style>
    </SiteShell>
  );
}