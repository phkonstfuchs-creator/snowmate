import type { NextConfig } from "next";
import path from "path";
import { createSecurityHeaders } from "./features/security/headers";

const ANALYTICS_ENABLED =
  process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";

const SECURITY_HEADERS = createSecurityHeaders({
  nodeEnv: process.env.NODE_ENV,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  posthogKey: ANALYTICS_ENABLED
    ? process.env.NEXT_PUBLIC_POSTHOG_KEY
    : undefined,
  posthogHost: ANALYTICS_ENABLED
    ? process.env.NEXT_PUBLIC_POSTHOG_HOST
    : undefined,
  posthogAssetHost: ANALYTICS_ENABLED
    ? process.env.NEXT_PUBLIC_POSTHOG_ASSET_HOST
    : undefined,
});

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
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
