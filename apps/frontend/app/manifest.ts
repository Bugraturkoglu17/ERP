import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sismik Mekanik ERP",
    short_name: "Sismik ERP",
    description: "Sismik Mekanik operasyon merkezi — iş emirleri, mağaza projeleri ve saha raporları.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6f8",
    theme_color: "#ff3131",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
