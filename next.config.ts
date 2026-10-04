import type { NextConfig } from "next";
import path from "path";

const scriptPolicy =
  process.env.NODE_ENV === "development"
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";

const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      scriptPolicy,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      /* Map style, vector tiles, fonts and sprites; CARTO raster tiles
         are the fallback when the vector style cannot load. */
      "connect-src 'self' https://tiles.openfreemap.org https://*.basemaps.cartocdn.com",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ].join("; "),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    /* The live map asks for the position; nothing else may. */
    value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=()",
  },
] as const;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    /* Keep a visited tab's server render for 30 s, so switching back and
       forth between tabs is instant. Every write in the app ends in
       router.refresh() or revalidatePath(), which clear this cache, so
       nobody sees their own change late. */
    staleTimes: { dynamic: 30 },
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
    ];
  },
};

export default nextConfig;
