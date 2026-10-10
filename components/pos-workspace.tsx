"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelOrder,
  createOrder,
  settleCafeOrder,
  transferOrder,
  updateOrderItems,
} from "@/app/actions/pos";
import { SearchableSelect } from "@/components/searchable-select";

interface PosWorkspaceProps {
  categories: Array<{ id: string; name: string }>;
  products: Array<{
    id: string;
    name: string;
    categoryId: string;
    sellPrice: number;
    stockQuantity: number;
    minStockAlert: number;
    category: { name: string };
  }>;
  activeSessions: Array<{
    id: string;
    deviceId: string;
    startTime: Date | string;
    device: { name: string; type: string };
    customer: { name: string; phone: string } | null;
  }>;
  openShift: {
    id: string;
    cashDrawerId: string;
    cashDrawer: { name: string; balance: number };
  };
  cashDrawers: Array<{ id: string; name: string; balance: number }>;
  customers: Array<{ id: string; name: string; phone: string; debt: number }>;
  openCafeOrders: Array<any>;
  sessionOrders: Array<any>;
  recentOrders: Array<any>;
}

interface CartItem {
  productId: string;
  name: string;
  sellPrice: number;
  quantity: number;
  stockQuantity: number;
}

export function PosWorkspace({
  categories,
  products,
  activeSessions,
  openShift,
  cashDrawers,
  customers,
  openCafeOrders,
  sessionOrders,
  recentOrders,
}: PosWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // الفلاتر والبحث
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchProductQuery, setSearchProductQuery] = useState("");

  // السلة الحالية
  const [cart, setCart] = useState<CartItem[]>([]);

  // جهة الطلب: كاش فوري، حساب عميل كافيه، أو جهاز نشط
  const [destinationType, setDestinationType] = useState<"INSTANT_CASH" | "CAFE_TAB" | "DEVICE_SESSION">("CAFE_TAB");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customCustomerName, setCustomCustomerName] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedDrawerId, setSelectedDrawerId] = useState(openShift.cashDrawerId);

  // نوافذ التأكيد والتعديل والمحاسبة
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [settleModalOrder, setSettleModalOrder] = useState<any | null>(null);
  const [editModalOrder, setEditModalOrder] = useState<any | null>(null);
  const [transferModalOrder, setTransferModalOrder] = useState<any | null>(null);

  // بيانات المحاسبة لطلب الكافيه
  const [settlePaymentMethod, setSettlePaymentMethod] = useState<"CASH" | "CARD" | "DEBT">("CASH");
  const [settleDiscount, setSettleDiscount] = useState<number>(0);
  const [settlePaidAmount, setSettlePaidAmount] = useState<number>(0);
  const [settleDrawerId, setSettleDrawerId] = useState(openShift.cashDrawerId);

  // رسائل التنبيه والخطأ
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // تجهيز خيارات العملاء للبحث الحي
  const customerOptions = useMemo(() => {
    return customers.map((c) => ({
      value: c.id,
      label: c.name,
      subLabel: `${c.phone} ${c.debt > 0 ? `· عليه: ${c.debt} ج.م` : ""}`,
    }));
  }, [customers]);

  // تجهيز خيارات الأجهزة النشطة
  const sessionOptions = useMemo(() => {
    return activeSessions.map((s) => ({
      value: s.id,
      label: `🎮 ${s.device.name}`,
      subLabel: `عميل: ${s.customer?.name ?? "عابر"} · ${s.device.type}`,
    }));
  }, [activeSessions]);

  // فلترة المنتجات
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === "ALL" || p.categoryId === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(searchProductQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchProductQuery]);

  // إضافة منتج للسلة
  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          alert(`الكمية المتاحة في المخزن (${product.stockQuantity}) فقط`);
          return prev;
        }
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sellPrice: product.sellPrice,
          quantity: 1,
          stockQuantity: product.stockQuantity,
        },
      ];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i;
          const next = i.quantity + delta;
          if (next > i.stockQuantity) {
            alert(`المخزون المتوفر: ${i.stockQuantity}`);
            return i;
          }
          return { ...i, quantity: next };
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const cartTotal = useMemo(() => {
    return Number(cart.reduce((sum, i) => sum + i.quantity * i.sellPrice, 0).toFixed(2));
  }, [cart]);

  // التحقق قبل فتح نافذة التأكيد
  const handleProceedToConfirm = () => {
    setNotification(null);
    if (cart.length === 0) {
      alert("السلة فارغة؛ اختر منتجاً واحداً على الأقل");
      return;
    }

    if (destinationType === "DEVICE_SESSION" && !selectedSessionId) {
      alert("يرجى اختيار الجهاز المطلوب تنزيل الطلب عليه");
      return;
    }

    if (destinationType === "CAFE_TAB" && !selectedCustomerId && !customCustomerName.trim()) {
      alert("يرجى اختيار عميل من القائمة أو كتابة اسمه لفتح حسابه");
      return;
    }

    setConfirmModalOpen(true);
  };

  // تنفيذ تأكيد إنشاء الطلب
  const handleExecuteOrder = () => {
    startTransition(async () => {
      try {
        const custName = selectedCustomerId
          ? customers.find((c) => c.id === selectedCustomerId)?.name
          : customCustomerName.trim();

        await createOrder({
          shiftId: openShift.id,
          sessionId: destinationType === "DEVICE_SESSION" ? selectedSessionId : null,
          customerId: destinationType === "CAFE_TAB" ? selectedCustomerId || null : null,
          customerName: destinationType === "CAFE_TAB" ? custName || null : null,
          paymentMethod: destinationType === "INSTANT_CASH" ? "CASH" : undefined,
          targetCashDrawerId: selectedDrawerId,
          items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.sellPrice })),
        });

        setCart([]);
        setConfirmModalOpen(false);
        setCustomCustomerName("");
        setNotification({ type: "success", message: "✓ تم تأكيد وحفظ الطلب بنجاح وتحديث المخزن" });
      } catch (err: any) {
        setNotification({ type: "error", message: err.message || "فشل تنفيذ الطلب" });
        setConfirmModalOpen(false);
      }
    });
  };

  // فتح نافذة المحاسبة لحساب كافيه مفتوح
  const handleOpenSettleModal = (order: any) => {
    setSettleModalOrder(order);
    setSettleDiscount(0);
    setSettlePaidAmount(order.totalAmount);
    setSettlePaymentMethod("CASH");
    setSettleDrawerId(openShift.cashDrawerId);
  };

  const handleExecuteSettle = (printReceipt: boolean) => {
    if (!settleModalOrder) return;

    startTransition(async () => {
      try {
        const res = await settleCafeOrder({
          orderId: settleModalOrder.id,
          discountAmount: settleDiscount,
          paidAmount: settlePaidAmount,
          paymentMethod: settlePaymentMethod,
          targetCashDrawerId: settleDrawerId,
        });

        setSettleModalOrder(null);
        setNotification({ type: "success", message: "✓ تم تحصيل الحساب بنجاح وإغلاق الطلب" });
        if (printReceipt) {
          router.push(`/receipt?orderId=${res.orderId}`);
        }
      } catch (err: any) {
        alert(err.message || "فشلت المحاسبة");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* رسالة إشعار علوية سريعة */}
      {notification && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold border flex items-center justify-between ${
            notification.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/15 border-rose-500/30 text-rose-300"
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* تخطيط الصفحة: الكتالوج في اليمين، السلة والخيارات في اليسار */}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {/* العمود الأيمن: كتالوج المنتجات مع الفلاتر السريعة */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-lg font-black text-white">قائمة المشروبات والمنتجات</h2>
              <p className="text-xs text-slate-400">انقر على الصنف لإضافته فوراً لسلة الطلب</p>
            </div>
            <input
              type="text"
              value={searchProductQuery}
              onChange={(e) => setSearchProductQuery(e.target.value)}
              placeholder="ابحث عن صنف (شاي، قهوة، كانز)..."
              className="rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white outline-none focus:border-sky-400 w-full sm:w-64"
            />
          </div>

          {/* فلاتر التصنيفات */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedCategory === "ALL"
                  ? "bg-sky-500 text-slate-950"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              الكل ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? "bg-sky-500 text-slate-950"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* كروت المنتجات */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[580px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const inCart = cart.find((i) => i.productId === p.id);
              const isLowStock = p.stockQuantity <= p.minStockAlert;

              return (
                <div
                  key={p.id}
                  onClick={() => p.stockQuantity > 0 && addToCart(p)}
                  className={`p-3.5 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between relative group ${
                    p.stockQuantity <= 0
                      ? "border-slate-800 bg-slate-950/40 opacity-50 cursor-not-allowed"
                      : inCart
                      ? "border-sky-400 bg-sky-500/10 shadow-md shadow-sky-500/10"
                      : "border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900"
                  }`}
                >
                  {inCart && (
                    <span className="absolute top-2 left-2 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[10px] font-black text-slate-950">
                      {inCart.quantity}
                    </span>
                  )}

                  <div>
                    <span className="text-[10px] text-sky-400 font-bold block">{p.category.name}</span>
                    <h3 className="font-bold text-white text-xs sm:text-sm mt-0.5">{p.name}</h3>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="font-mono font-black text-emerald-400">{p.sellPrice} ج.م</span>
                    <span className={`text-[10px] font-mono ${isLowStock ? "text-amber-400 font-bold" : "text-slate-400"}`}>
                      {p.stockQuantity > 0 ? `${p.stockQuantity} متاح` : "نفذ"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* العمود الأيسر: سلة الطلب وتحديد الوجهة (كاش / عميل / جهاز) مع زر التأكيد */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 shadow-xl flex flex-col justify-between h-fit">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-black text-white flex items-center gap-1.5">
                <span>🛒</span>
                <span>سلة الطلب الحالية ({cart.length})</span>
              </h2>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-rose-400 hover:underline">
                  إفراغ السلة
                </button>
              )}
            </div>

            {/* بنود السلة */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-white">{item.name}</p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {item.sellPrice} × {item.quantity} = {(item.sellPrice * item.quantity).toFixed(2)} ج.م
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateCartQty(item.productId, -1)}
                      className="h-6 w-6 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-700 flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold w-5 text-center text-white">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQty(item.productId, 1)}
                      className="h-6 w-6 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-700 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-500">
                  السلة فارغة؛ اضغط على أي مشروب أو صنف لإضافته هنا.
                </div>
              )}
            </div>

            {/* اختيار وجهة الطلب (3 خيارات واضحة) */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-3">
              <label className="text-xs font-bold text-sky-300 block">حدد وجهة تنزيل الطلب:</label>

              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setDestinationType("CAFE_TAB")}
                  className={`py-2 px-1 rounded-xl border font-bold text-center transition ${
                    destinationType === "CAFE_TAB"
                      ? "border-amber-400 bg-amber-400/20 text-amber-300 shadow-sm"
                      : "border-slate-800 bg-slate-900 text-slate-400"
                  }`}
                >
                  👤 حساب عميل (معلق)
                </button>

                <button
                  type="button"
                  onClick={() => setDestinationType("DEVICE_SESSION")}
                  className={`py-2 px-1 rounded-xl border font-bold text-center transition ${
                    destinationType === "DEVICE_SESSION"
                      ? "border-sky-400 bg-sky-500/20 text-sky-300 shadow-sm"
                      : "border-slate-800 bg-slate-900 text-slate-400"
                  }`}
                >
                  🎮 لحساب جهاز نشط
                </button>

                <button
                  type="button"
                  onClick={() => setDestinationType("INSTANT_CASH")}
                  className={`py-2 px-1 rounded-xl border font-bold text-center transition ${
                    destinationType === "INSTANT_CASH"
                      ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-sm"
                      : "border-slate-800 bg-slate-900 text-slate-400"
                  }`}
                >
                  💵 دفع كاش فوري
                </button>
              </div>

              {/* 1. في حال حساب كافيه مفتوح لعميل */}
              {destinationType === "CAFE_TAB" && (
                <div className="space-y-2 pt-1 animate-in fade-in">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">اختر عميل مسجل (بحث حي):</label>
                    <SearchableSelect
                      options={customerOptions}
                      value={selectedCustomerId}
                      onChange={(val) => {
                        setSelectedCustomerId(val);
                        setCustomCustomerName("");
                      }}
                      placeholder="-- ابحث بالاسم أو الهاتف --"
                      searchPlaceholder="اكتب اسم العميل..."
                      emptyText="لا يوجد عميل بهذا الاسم"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">أو اكتب اسم العميل / الطاولة مباشرة:</label>
                    <input
                      type="text"
                      value={customCustomerName}
                      onChange={(e) => {
                        setCustomCustomerName(e.target.value);
                        setSelectedCustomerId("");
                      }}
                      placeholder="مثال: محمد صلاح / طاولة 3 كافيه"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              )}

              {/* 2. في حال تنزيل لحساب جهاز */}
              {destinationType === "DEVICE_SESSION" && (
                <div className="space-y-2 pt-1 animate-in fade-in">
                  <label className="text-[11px] text-slate-300 block">اختر الجهاز الشغال حالياً:</label>
                  <SearchableSelect
                    options={sessionOptions}
                    value={selectedSessionId}
                    onChange={(val) => setSelectedSessionId(val)}
                    placeholder="-- اختر جهاز اللعب --"
                    searchPlaceholder="ابحث باسم الجهاز..."
                    emptyText="لا توجد أجهزة نشطة مطابقة"
                    required
                  />
                </div>
              )}

              {/* 3. في حال بيع كاش فوري */}
              {destinationType === "INSTANT_CASH" && (
                <div className="space-y-2 pt-1 animate-in fade-in">
                  <label className="text-[11px] text-slate-300 block">الخزينة المودع بها الكاش:</label>
                  <select
                    value={selectedDrawerId}
                    onChange={(e) => setSelectedDrawerId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-emerald-300 font-bold outline-none"
                  >
                    {cashDrawers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.balance} ج.م) {d.id === openShift.cashDrawerId ? "⭐ (خزينة الوردية)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* إجمالي السلة وزر المتابعة للتأكيد */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">إجمالي الطلب المطلوب:</span>
              <span className="font-mono text-xl font-black text-emerald-400">{cartTotal} ج.م</span>
            </div>

            <button
              type="button"
              disabled={cart.length === 0 || isPending}
              onClick={handleProceedToConfirm}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-xs font-black text-slate-950 hover:brightness-110 transition shadow-lg shadow-emerald-950/20 disabled:opacity-40"
            >
              {destinationType === "INSTANT_CASH"
                ? "تأكيد واستلام كاش فوري 💵"
                : destinationType === "CAFE_TAB"
                ? "تأكيد وفتح حساب عميل كافيه 👤"
                : "تأكيد تنزيل الطلب على الجهاز 🎮"}
            </button>
          </div>
        </div>
      </div>

      {/* قسم إدارة الطلبات: الحسابات المفتوحة للكافيه + طلبات الأجهزة النشطة + طلبات الكاش السابقة */}
      <div className="space-y-6 pt-4 border-t border-slate-800">
        {/* 1. حسابات الكافيه المفتوحة (Open Tabs) بانتظار المحاسبة عند المغادرة */}
        <div className="rounded-3xl border border-amber-500/30 bg-slate-900/90 p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
                <span>☕</span>
                <span>حسابات الكافيه المفتوحة والمعلقة ({openCafeOrders.length})</span>
              </h3>
              <p className="text-xs text-slate-400">
                عملاء جالسون بالكافيه بدون جهاز؛ حاسبهم واستخرج الريسيت عند مغادرتهم.
              </p>
            </div>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {openCafeOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl border border-slate-800 bg-slate-950/80 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-white text-sm">
                        👤 {order.notes || order.customer?.name || "عميل كافيه"}
                      </h4>
                      {order.customer?.phone && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{order.customer.phone}</p>
                      )}
                    </div>
                    <span className="font-mono text-base font-black text-amber-300">
                      {order.totalAmount} ج.م
                    </span>
                  </div>

                  <div className="mt-2.5 space-y-1 text-xs text-slate-300 max-h-24 overflow-y-auto border-t border-slate-800/80 pt-2">
                    {order.items.map((i: any) => (
                      <div key={i.id} className="flex justify-between text-[11px]">
                        <span>{i.product.name} × {i.quantity}</span>
                        <span className="font-mono text-slate-400">{i.subTotal} ج.م</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => handleOpenSettleModal(order)}
                    className="flex-1 rounded-xl bg-emerald-500 py-2 text-xs font-black text-slate-950 hover:bg-emerald-400 transition"
                  >
                    🧾 محاسبة وخروج
                  </button>

                  <button
                    onClick={() => setEditModalOrder(order)}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-2 text-xs text-slate-300 hover:text-white"
                    title="تعديل الأصناف"
                  >
                    ✏️
                  </button>

                  <button
                    onClick={() => setTransferModalOrder(order)}
                    className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-2.5 py-2 text-xs text-sky-300 hover:bg-sky-500/20"
                    title="نقل الطلب لجهاز أو عميل آخر"
                  >
                    🔀
                  </button>

                  <button
                    onClick={() => {
                      if (confirm("هل أنت متأكد من إلغاء هذا الطلب وإرجاع المخزون؟")) {
                        startTransition(async () => {
                          await cancelOrder(order.id);
                        });
                      }
                    }}
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-2 text-xs text-rose-300 hover:bg-rose-500/20"
                    title="إلغاء الطلب"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}

            {openCafeOrders.length === 0 && (
              <div className="col-span-full py-8 text-center text-xs text-slate-500">
                لا توجد حسابات كافيه معلقة حالياً؛ كل الطلبات مدفوعة أو على الأجهزة.
              </div>
            )}
          </div>
        </div>

        {/* 2. طلبات الأجهزة النشطة (المحاسبة عليها تتم مع تصفية الجهاز) */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-black text-white">🎮 طلبات الأجهزة النشطة الحالية ({sessionOrders.length})</h3>
              <p className="text-xs text-slate-400">تُحاسب مجمعة مع وقت اللعب عند خروج الجهاز، ويمكنك تعديلها هنا إن أخطأت.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sessionOrders.map((order) => (
              <div key={order.id} className="p-3.5 rounded-2xl border border-slate-800 bg-slate-950/70 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-sky-400 text-xs">🎮 {order.session?.device?.name}</span>
                    <p className="text-[11px] text-slate-400">عميل: {order.session?.customer?.name || "عابر"}</p>
                  </div>
                  <span className="font-mono text-sm font-black text-white">{order.totalAmount} ج.م</span>
                </div>

                <div className="space-y-1 text-[11px] text-slate-300 border-t border-slate-800/80 pt-1.5">
                  {order.items.map((i: any) => (
                    <div key={i.id} className="flex justify-between">
                      <span>{i.product.name} × {i.quantity}</span>
                      <span className="font-mono text-slate-400">{i.subTotal} ج.م</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => setEditModalOrder(order)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-[10px] text-slate-300 hover:text-white"
                  >
                    ✏️ تعديل
                  </button>
                  <button
                    onClick={() => setTransferModalOrder(order)}
                    className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-300 text-[10px] border border-sky-500/30"
                  >
                    🔀 نقل
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("هل تريد إلغاء هذا الطلب وإرجاع المخزون؟")) {
                        startTransition(async () => {
                          await cancelOrder(order.id);
                        });
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 text-[10px] border border-rose-500/30"
                  >
                    🗑️ حذف
                  </button>
                </div>
              </div>
            ))}

            {sessionOrders.length === 0 && (
              <div className="col-span-full py-6 text-center text-xs text-slate-500">
                لا توجد طلبات كافيه منزلة على الأجهزة النشطة حالياً.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🛑 مودال التأكيد الصارم قبل إنشاء الطلب لتفادي الخطأ البشري */}
      {/* ========================================================================= */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 text-right space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <span className="rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold px-3 py-0.5 border border-amber-500/30">
                ⚠️ تأكيد تسجيل الطلب
              </span>
              <h3 className="text-lg font-black text-white mt-2">يرجى مراجعة تفاصيل الطلب بدقة</h3>
            </div>

            <div className="space-y-3 text-xs bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
              <div className="flex justify-between items-center text-slate-300">
                <span>الوجهة المستهدفة:</span>
                <strong className="text-white text-sm">
                  {destinationType === "INSTANT_CASH"
                    ? "💵 بيع كاش فوري (زبون عابر)"
                    : destinationType === "CAFE_TAB"
                    ? `👤 حساب عميل: ${selectedCustomerId ? customers.find((c) => c.id === selectedCustomerId)?.name : customCustomerName}`
                    : `🎮 جهاز: ${activeSessions.find((s) => s.id === selectedSessionId)?.device.name}`}
                </strong>
              </div>

              <div className="border-t border-slate-800/80 pt-2 space-y-1">
                <span className="text-slate-400 font-bold block mb-1">الأصناف المطلوبة:</span>
                {cart.map((i) => (
                  <div key={i.productId} className="flex justify-between text-slate-300">
                    <span>{i.name} × {i.quantity}</span>
                    <span className="font-mono">{(i.sellPrice * i.quantity).toFixed(2)} ج.م</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-800/80 pt-2 flex justify-between items-center text-emerald-400 font-bold text-sm">
                <span>المبلغ الإجمالي:</span>
                <span className="font-mono text-base">{cartTotal} ج.م</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isPending}
                onClick={handleExecuteOrder}
                className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-xs font-black text-slate-950 hover:bg-emerald-400 transition"
              >
                {isPending ? "جاري الحفظ والتوريد..." : "✓ نعم، تأكيد وتنزيل الطلب"}
              </button>

              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs text-slate-300 hover:text-white"
              >
                إلغاء وتعديل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🧾 مودال محاسبة حساب الكافيه المفتوح (Settle Open Tab Modal) */}
      {/* ========================================================================= */}
      {settleModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 text-right space-y-4">
            <div className="border-b border-slate-800 pb-3 flex justify-between items-start">
              <div>
                <span className="rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-0.5 border border-emerald-500/30">
                  محاسبة وخروج
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  حساب: {settleModalOrder.notes || settleModalOrder.customer?.name || "عميل كافيه"}
                </h3>
              </div>
              <button onClick={() => setSettleModalOrder(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
              <div className="space-y-1">
                {settleModalOrder.items.map((i: any) => (
                  <div key={i.id} className="flex justify-between text-slate-300">
                    <span>{i.product.name} × {i.quantity}</span>
                    <span className="font-mono">{i.subTotal} ج.م</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-800/80 pt-2 flex justify-between items-center text-slate-300">
                <span>المجموع قبل الخصم:</span>
                <span className="font-mono font-bold text-white">{settleModalOrder.totalAmount} ج.م</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span>خصم نقدي (إن وجد):</span>
                <input
                  type="number"
                  min={0}
                  value={settleDiscount || ""}
                  onChange={(e) => {
                    const d = Math.max(0, Number(e.target.value));
                    setSettleDiscount(d);
                    setSettlePaidAmount(Math.max(0, settleModalOrder.totalAmount - d));
                  }}
                  className="w-24 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-center font-mono text-white outline-none"
                  placeholder="0"
                />
              </div>

              <div className="border-t border-slate-800/80 pt-2 flex justify-between items-center text-emerald-400 font-bold text-sm">
                <span>المبلغ الصافي المطلوب:</span>
                <span className="font-mono text-base">{Math.max(0, settleModalOrder.totalAmount - settleDiscount)} ج.م</span>
              </div>
            </div>

            {/* طريقة الدفع */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-300 block">طريقة السداد:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "CASH", label: "💵 كاش" },
                  { id: "CARD", label: "💳 فيزا" },
                  { id: "DEBT", label: "⏳ دين آجل" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSettlePaymentMethod(m.id as any)}
                    className={`py-2 rounded-xl font-bold border transition ${
                      settlePaymentMethod === m.id
                        ? "border-emerald-400 bg-emerald-500/20 text-white"
                        : "border-slate-800 bg-slate-950 text-slate-400"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* اختيار الخزينة */}
            {settlePaymentMethod !== "DEBT" && (
              <div className="space-y-1 text-xs">
                <label className="text-slate-300 font-bold block">الخزينة المودع بها الكاش:</label>
                <select
                  value={settleDrawerId}
                  onChange={(e) => setSettleDrawerId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-emerald-300 font-bold outline-none"
                >
                  {cashDrawers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.balance} ج.م) {d.id === openShift.cashDrawerId ? "⭐ (الوردية)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleExecuteSettle(true)}
                className="rounded-xl bg-emerald-500 py-2.5 text-xs font-black text-slate-950 hover:bg-emerald-400 transition"
              >
                🖨️ تحصيل وطباعة ريسيت
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() => handleExecuteSettle(false)}
                className="rounded-xl bg-slate-800 py-2.5 text-xs font-black text-white hover:bg-slate-700 transition"
              >
                تحصيل بدون طباعة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ✏️ مودال تعديل كميات أصناف الطلب عند الخطأ */}
      {/* ========================================================================= */}
      {editModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 text-right space-y-4">
            <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
              <h3 className="text-base font-black text-white">✏️ تعديل أصناف الطلب</h3>
              <button onClick={() => setEditModalOrder(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1 text-xs">
              {editModalOrder.items.map((i: any) => (
                <div key={i.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white">{i.product.name}</p>
                    <span className="text-[10px] text-slate-400 font-mono">{i.unitPrice} ج.م</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditModalOrder((prev: any) => ({
                          ...prev,
                          items: prev.items
                            .map((x: any) => (x.id === i.id ? { ...x, quantity: Math.max(0, x.quantity - 1) } : x))
                            .filter((x: any) => x.quantity > 0),
                        }));
                      }}
                      className="h-7 w-7 rounded-lg bg-slate-800 text-white font-bold flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold w-6 text-center text-white">{i.quantity}</span>
                    <button
                      onClick={() => {
                        setEditModalOrder((prev: any) => ({
                          ...prev,
                          items: prev.items.map((x: any) =>
                            x.id === i.id ? { ...x, quantity: x.quantity + 1 } : x
                          ),
                        }));
                      }}
                      className="h-7 w-7 rounded-lg bg-slate-800 text-white font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await updateOrderItems({
                        orderId: editModalOrder.id,
                        updatedItems: editModalOrder.items.map((x: any) => ({
                          productId: x.productId,
                          quantity: x.quantity,
                        })),
                      });
                      setEditModalOrder(null);
                      setNotification({ type: "success", message: "✓ تم تعديل أصناف الطلب وضبط المخزن بنجاح" });
                    } catch (err: any) {
                      alert(err.message || "فشل التعديل");
                    }
                  });
                }}
                className="flex-1 rounded-xl bg-amber-500 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-400 transition"
              >
                {isPending ? "جاري التحديث..." : "حفظ التعديلات"}
              </button>
              <button
                type="button"
                onClick={() => setEditModalOrder(null)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🔀 مودال نقل الطلب لوجهة أخرى (جهاز أو عميل كافيه) */}
      {/* ========================================================================= */}
      {transferModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 text-right space-y-4">
            <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
              <h3 className="text-base font-black text-white">🔀 نقل الطلب لوجهة جديدة</h3>
              <button onClick={() => setTransferModalOrder(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              اختر الوجهة الصحيحة التي تريد ترحيل هذا الطلب إليها إذا تم تنزيله بالخطأ:
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">نقل إلى جهاز نشط:</label>
                <select
                  id="target-session-select"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-sky-300 outline-none"
                >
                  <option value="">-- اختر جهاز نشط --</option>
                  {activeSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.device.name} ({s.customer?.name || "عابر"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">أو نقل إلى حساب عميل كافيه:</label>
                <select
                  id="target-customer-select"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-amber-300 outline-none"
                >
                  <option value="">-- اختر عميل كافيه --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  const sSelect = document.getElementById("target-session-select") as HTMLSelectElement;
                  const cSelect = document.getElementById("target-customer-select") as HTMLSelectElement;
                  const sVal = sSelect?.value;
                  const cVal = cSelect?.value;

                  if (!sVal && !cVal) {
                    alert("يرجى اختيار جهاز أو عميل للنقل إليه");
                    return;
                  }

                  startTransition(async () => {
                    try {
                      if (sVal) {
                        await transferOrder({
                          orderId: transferModalOrder.id,
                          targetType: "SESSION",
                          targetSessionId: sVal,
                        });
                      } else {
                        const cust = customers.find((c) => c.id === cVal);
                        await transferOrder({
                          orderId: transferModalOrder.id,
                          targetType: "CUSTOMER",
                          targetCustomerId: cVal,
                          targetCustomerName: cust?.name,
                        });
                      }
                      setTransferModalOrder(null);
                      setNotification({ type: "success", message: "✓ تم نقل الطلب إلى الوجهة الجديدة بنجاح" });
                    } catch (err: any) {
                      alert(err.message || "فشل النقل");
                    }
                  });
                }}
                className="flex-1 rounded-xl bg-sky-500 py-2.5 text-xs font-black text-slate-950 hover:bg-sky-400 transition"
              >
                تأكيد النقل الآن
              </button>
              <button
                type="button"
                onClick={() => setTransferModalOrder(null)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}