import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-cairo",
});

export const viewport: Viewport = {
  themeColor: "#020817",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // لمنح شعور التطبيق الأصلي على الموبايل
};

export const metadata: Metadata = {
  title: "نظام إدارة صالة البلايستيشن والكافيه",
  description: "نظام متكامل لإدارة الأجهزة، نقاط البيع، المخزون، والورديات والبطولات",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PlayLounge",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased selection:bg-amber-400 selection:text-slate-950">
        {children}
        {/* شريط ومودال تثبيت التطبيق التلقائي */}
        <PwaInstallPrompt />
      </body>
    </html>
  );
}