import { requireRole } from "@/app/actions/auth";
import {
  createCustomerReview,
  createPackagePlan,
  createServiceOffer,
  getCustomerReviews,
  getPackagePlans,
  getServiceOffers,
  toggleCustomerReview,
  togglePackagePlan,
  toggleServiceOffer,
} from "@/app/actions/content-admin";
import { getLoungeSettings } from "@/app/actions/site-content";
import { LoungeSettingsForm } from "@/components/lounge-settings-form";
import { SiteShell } from "@/components/site-shell";

async function createServiceAction(formData: FormData) {
  "use server";
  await createServiceOffer(formData);
}

async function createPackageAction(formData: FormData) {
  "use server";
  await createPackagePlan(formData);
}

async function createReviewAction(formData: FormData) {
  "use server";
  await createCustomerReview(formData);
}

async function toggleServiceAction(formData: FormData) {
  "use server";
  const serviceId = String(formData.get("serviceId") ?? "");
  const active = String(formData.get("active") ?? "false") === "true";

  if (serviceId) {
    await toggleServiceOffer(serviceId, active);
  }
}

async function togglePackageAction(formData: FormData) {
  "use server";
  const packageId = String(formData.get("packageId") ?? "");
  const active = String(formData.get("active") ?? "false") === "true";

  if (packageId) {
    await togglePackagePlan(packageId, active);
  }
}

async function toggleReviewAction(formData: FormData) {
  "use server";
  const reviewId = String(formData.get("reviewId") ?? "");
  const active = String(formData.get("active") ?? "false") === "true";

  if (reviewId) {
    await toggleCustomerReview(reviewId, active);
  }
}

export default async function AdminContentPage() {
  await requireRole(["ADMIN"]);

  const [services, packages, reviews, settings] = await Promise.all([
    getServiceOffers(),
    getPackagePlans(),
    getCustomerReviews(),
    getLoungeSettings(),
  ]);

  return (
    <SiteShell title="إدارة محتوى الموقع وصفحة العميل">
      <div className="space-y-8">
        {/* قسم إعدادات الهيرو، صورة الغلاف، العنوان والخريطة التفاعلي */}
        <section className="rounded-[30px] border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-2xl font-black text-slate-950">
              🖼️
            </span>
            <div>
              <h2 className="text-2xl font-black text-white">إعدادات الهيرو والخريطة لصفحة العميل</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تخصيص صورة الغلاف الكاجوال، نصوص الترحيب، العنوان الجغرافي، ورابط Google Maps مع الحفظ الفوري.
              </p>
            </div>
          </div>

          <LoungeSettingsForm initialSettings={settings} />
        </section>

        {/* قسم الخدمات */}
        <section className="rounded-[28px] border border-slate-800 bg-slate-900/90 p-5">
          <h2 className="text-2xl font-black text-white">إضافة خدمة</h2>
          <form action={createServiceAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <input name="title" placeholder="عنوان الخدمة" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400 text-xs" required />
            <input name="price" placeholder="السعر" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400 text-xs" required />
            <input name="icon" placeholder="رمز الخدمة (🎮 أو 🎱)" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400 text-xs" />
            <div className="md:col-span-2 xl:col-span-3">
              <input name="description" placeholder="وصف الخدمة" className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400 text-xs" required />
            </div>
            <div className="md:col-span-2 xl:col-span-5">
              <button type="submit" className="rounded-full bg-gradient-to-r from-sky-400 to-cyan-500 px-5 py-3 text-sm font-black text-slate-950">
                حفظ الخدمة
              </button>
            </div>
          </form>

          <div className="mt-6 space-y-3">
            {services.map((service) => (
              <div key={service.id} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                <div>
                  <p className="font-bold text-white">{service.title}</p>
                  <p className="text-xs text-slate-400">{service.description}</p>
                </div>
                <form action={toggleServiceAction} className="flex items-center gap-2">
                  <input type="hidden" name="serviceId" value={service.id} />
                  <input type="hidden" name="active" value={String(!service.active)} />
                  <button type="submit" className={`rounded-full px-3 py-1 text-xs font-bold ${service.active ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-700 text-slate-300"}`}>
                    {service.active ? "مفعّل" : "معطل"}
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>

        {/* قسم الباقات */}
        <section className="rounded-[28px] border border-slate-800 bg-slate-900/90 p-5">
          <h2 className="text-2xl font-black text-white">إضافة باقة</h2>
          <form action={createPackageAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input name="name" placeholder="اسم الباقة" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400 text-xs" required />
            <input name="price" type="number" min="0" placeholder="السعر" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400 text-xs" required />
            <input name="feature" placeholder="الميزة" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400 text-xs" required />
            <label className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white text-xs">
              <input name="highlight" type="checkbox" value="true" className="h-4 w-4" />
              باقة مميزة
            </label>
            <div className="md:col-span-2 xl:col-span-4">
              <button type="submit" className="rounded-full bg-gradient-to-r from-sky-400 to-cyan-500 px-5 py-3 text-sm font-black text-slate-950">
                حفظ الباقة
              </button>
            </div>
          </form>

          <div className="mt-6 space-y-3">
            {packages.map((pack) => (
              <div key={pack.id} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                <div>
                  <p className="font-bold text-white">{pack.name}</p>
                  <p className="text-xs text-slate-400">{pack.feature} • {pack.price} ج.م</p>
                </div>
                <form action={togglePackageAction} className="flex items-center gap-2">
                  <input type="hidden" name="packageId" value={pack.id} />
                  <input type="hidden" name="active" value={String(!pack.active)} />
                  <button type="submit" className={`rounded-full px-3 py-1 text-xs font-bold ${pack.active ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-700 text-slate-300"}`}>
                    {pack.active ? "مفعّل" : "معطل"}
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>

        {/* قسم التقييمات */}
        <section className="rounded-[28px] border border-slate-800 bg-slate-900/90 p-5">
          <h2 className="text-2xl font-black text-white">إضافة تقييم</h2>
          <form action={createReviewAction} className="mt-5 grid gap-4 md:grid-cols-3">
            <input name="name" placeholder="اسم العميل" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400 text-xs" required />
            <input name="rating" type="number" min="1" max="5" defaultValue="5" placeholder="التقييم" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400 text-xs" required />
            <button type="submit" className="rounded-full bg-gradient-to-r from-sky-400 to-cyan-500 px-5 py-3 text-sm font-black text-slate-950">
              حفظ التقييم
            </button>
            <div className="md:col-span-3">
              <textarea name="text" rows={3} placeholder="نص التقييم" className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400 text-xs" required />
            </div>
          </form>

          <div className="mt-6 space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                <div>
                  <p className="font-bold text-white">{review.name}</p>
                  <p className="text-xs text-slate-400">{review.text}</p>
                </div>
                <form action={toggleReviewAction} className="flex items-center gap-2">
                  <input type="hidden" name="reviewId" value={review.id} />
                  <input type="hidden" name="active" value={String(!review.active)} />
                  <button type="submit" className={`rounded-full px-3 py-1 text-xs font-bold ${review.active ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-700 text-slate-300"}`}>
                    {review.active ? "مفعّل" : "معطل"}
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      </div>
    </SiteShell>
  );
}