import type { MetadataRoute } from "next";
import type { StaticImageData } from "next/image";
import icon192 from "@/features/privacy/assets/pistl-pwa-192.png";
import icon512 from "@/features/privacy/assets/pistl-pwa-512.png";

function assetSource(asset: StaticImageData | string): string {
  return typeof asset === "string" ? asset : asset.src;
}

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Pistl",
    short_name: "Pistl",
    description: "Gemeinsam auf den Berg, sicher mit deiner Crew.",
    lang: "de-DE",
    start_url: "/feed",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f2eadb",
    theme_color: "#a83f1b",
    categories: ["social", "sports", "travel"],
    icons: [
      {
        src: assetSource(icon192),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: assetSource(icon512),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
