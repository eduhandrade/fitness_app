import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Trivo — Triathlon Training",
    short_name: "Trivo",
    description:
      "Swim, bike, run, strength and body tracking with generated training plans.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0c0b",
    theme_color: "#0a0c0b",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
