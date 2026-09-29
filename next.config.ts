import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // للسماح لصفحات التطوير
  allowedDevOrigins: [
    "localhost:3000",
    "*.app.github.dev",
  ],
  // هذا هو الجزء المسؤول عن حل مشكلة Server Actions فوراً
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "*.app.github.dev",
        "*.github.dev",
      ],
    },
  },
};

export default nextConfig;