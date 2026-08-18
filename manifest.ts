import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FarmFinder CNY",
    short_name: "FarmFinder",
    description: "Find farm stands and local food throughout Central New York.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f0e4",
    theme_color: "#183d2c",
    orientation: "portrait-primary",
    categories: ["food", "navigation", "lifestyle"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
