import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Atomic English",
    short_name: "Atomic",
    description:
      "A calm, science-backed English-learning habit: active recall, spaced repetition, and a streak you won't want to break.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#2f6f5e",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
