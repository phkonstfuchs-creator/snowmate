import type { NextConfig } from "next";
import path from "path";

import { SECURITY_HEADERS } from "./lib/security-headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  /* Resort photos from Wikimedia are resized and served by Pistl, so
     browsers never contact Wikimedia (no IP addresses leave). */
  images: {
    maximumRedirects: 0,
    maximumResponseBody: 5_000_000,
    dangerouslyAllowLocalIP: false,
    remotePatterns: [{ protocol: "https", hostname: "upload.wikimedia.org", port: "", pathname: "/wikipedia/**", search: "" }],
  },
  experimental: {
    /* Keep a visited tab's server render for 30 s, so switching back and
       forth between tabs is instant. Every write in the app ends in
       router.refresh() or revalidatePath(), which clear this cache, so
       nobody sees their own change late. */
    staleTimes: { dynamic: 30 },
    /* Ski-day post photos are re-encoded in the browser to at most 1.5 MB;
       the default 1 MB would refuse some of them. */
    serverActions: { bodySizeLimit: "2mb" },
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...SECURITY_HEADERS],
      },
      {
        /* The push service worker must update as soon as it changes. */
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
