import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

/* Everything is served from the site itself: no third-party scripts,
   fonts, images or API calls from the browser. Next.js needs inline
   scripts for hydration, and eval only in development. */
const contentSecurityPolicy = [
  "default-src 'self'",
  process.env.NODE_ENV === "development" ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
].join("; ");

/* Before the split, the app ran on pistl.app. Links from that time
   (confirmation and invite emails, home-screen icons, bookmarks) keep
   working by forwarding app paths to the app's own subdomain. Temporary
   redirects, so they can change later without being cached forever. */
const appUrl = (process.env.PISTL_APP_URL || "https://app.pistl.app").replace(/\/$/, "");
const APP_PATHS = [
  "feed", "events", "map", "carpool", "crew", "people", "profile",
  "login", "signup", "forgot-password", "reset-password", "onboarding",
  "auth", "invite", "demo",
];

const nextConfig = {
  async redirects() {
    return APP_PATHS.map((segment) => ({
      source: `/${segment}/:path*`,
      destination: `${appUrl}/${segment}/:path*`,
      permanent: false,
    }));
  },
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  outputFileTracingRoot: root,
  turbopack: { root },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "Content-Security-Policy", value: contentSecurityPolicy },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
    ] }];
  },
};
export default nextConfig;
