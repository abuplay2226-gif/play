import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "نظام إدارة صالة البلايستيشن والكافيه",
    short_name: "PlayLounge",
    description: "نظام متكامل لإدارة أجهزة البلايستيشن، نقاط البيع، المخزون، والبطولات",
    start_url: "/",
    display: "standalone",
    background_color: "#020817",
    theme_color: "#020817",
    orientation: "portrait",
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}