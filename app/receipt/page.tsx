import { ReceiptPrintButton } from "@/components/receipt-print-button";
import { SiteShell } from "@/components/site-shell";

export default function ReceiptPage() {
  const items = [
    { name: "كوكاكولا 500ml", qty: 1, total: "24 ج.م" },
    { name: "بيتزا صغيرة", qty: 1, total: "58 ج.م" },
    { name: "جلسة PS5 - 01", qty: 1, total: "180 ج.م" },
  ];

  return (
    <SiteShell title="فاتورة الكاشير">
      <div className="flex justify-center">
        <div className="w-full max-w-md rounded-[28px] border border-slate-800 bg-slate-900 p-6 text-slate-50 shadow-2xl shadow-slate-950/30" style={{ fontFamily: "Tahoma, sans-serif" }}>
          <div className="text-center">
            <p className="text-xl font-black">PlayStation Lounge</p>
            <p className="mt-2 text-xs text-slate-400">966-500-000-000</p>
          </div>

          <div className="mt-5 border-t border-b border-slate-700 py-3 text-xs text-slate-300">
            <div className="flex items-center justify-between"><span>التاريخ</span><span>2026/09/23</span></div>
            <div className="mt-2 flex items-center justify-between"><span>الوقت</span><span>18:45</span></div>
            <div className="mt-2 flex items-center justify-between"><span>الكاشير</span><span>أحمد علي</span></div>
          </div>

          <div className="mt-5 space-y-3 text-sm">
            {items.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold">{item.name}</p>
                  <p className="text-xs text-slate-400">الكمية: {item.qty}</p>
                </div>
                <span className="font-bold text-sky-300">{item.total}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-slate-700 pt-4 space-y-2 text-sm text-slate-300">
            <div className="flex items-center justify-between"><span>الإجمالي</span><span>262 ج.م</span></div>
            <div className="flex items-center justify-between"><span>الدفع</span><span>300 ج.م</span></div>
            <div className="flex items-center justify-between"><span>الباقي</span><span className="font-black text-emerald-300">38 ج.م</span></div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-400">
            شكراً لزيارتكم
            <div className="mt-2 border-t border-dashed border-slate-700 pt-3">
              رقم الفاتورة: INV-1024
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <ReceiptPrintButton />
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          button {
            display: none !important;
          }
          aside,
          header,
          nav {
            display: none !important;
          }
          main {
            padding: 0 !important;
          }
        }
      `}</style>
    </SiteShell>
  );
}
