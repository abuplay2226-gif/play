"use client";

export function ReceiptPrintButton() {
  return (
    <button
      type="button"
      className="rounded-full bg-sky-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-sky-400"
      onClick={() => window.print()}
    >
      طباعة الفاتورة
    </button>
  );
}
