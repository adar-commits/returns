import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "מרכז החלפות והחזרות | Carpetshop",
    short_name: "החזרות",
    description: "פורטל החלפות והחזרות — השטיח האדום",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f4f0",
    theme_color: "#9b2d30",
    lang: "he",
    dir: "rtl",
    icons: [
      {
        src: "/img/HoM_logo.webp",
        sizes: "192x192",
        type: "image/webp",
        purpose: "any",
      },
      {
        src: "/img/HoM_logo.webp",
        sizes: "512x512",
        type: "image/webp",
        purpose: "any",
      },
    ],
    categories: ["shopping", "business"],
  };
}
