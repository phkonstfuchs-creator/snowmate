import type { MetadataRoute } from "next";

/* Makes Pistl installable: "Add to Home Screen" on iPhone, "Install
   app" on Android. It then opens full screen, without browser bars. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pistl",
    short_name: "Pistl",
    description: "Find your crew. Who rides where today, live.",
    id: "/",
    start_url: "/feed",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F6F7F4",
    theme_color: "#F6F7F4",
    lang: "de",
    categories: ["sports", "social", "travel"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
