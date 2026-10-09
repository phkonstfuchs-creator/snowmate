export type SecurityHeaderEnvironment = Readonly<{
  nodeEnv?: string;
  supabaseUrl?: string;
  posthogKey?: string;
  posthogHost?: string;
  posthogAssetHost?: string;
}>;

export type SecurityHeader = Readonly<{
  key: string;
  value: string;
}>;

function safeOrigin(value: string | undefined, allowLoopback: boolean) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const isLoopback = url.hostname === "127.0.0.1" || url.hostname === "localhost";
    const allowedProtocol =
      url.protocol === "https:" ||
      (allowLoopback && isLoopback && url.protocol === "http:");

    if (
      !allowedProtocol ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function websocketOrigin(origin: string): string {
  return origin.replace(/^http/, "ws");
}

function validPostHogOrigins(environment: SecurityHeaderEnvironment) {
  const key = environment.posthogKey?.trim();
  const host = safeOrigin(environment.posthogHost, false);
  const assetHost = safeOrigin(environment.posthogAssetHost, false);

  if (
    !key?.startsWith("phc_") ||
    host !== "https://eu.i.posthog.com" ||
    assetHost !== "https://eu-assets.i.posthog.com"
  ) {
    return null;
  }

  return { host, assetHost } as const;
}

export function createSecurityHeaders(
  environment: SecurityHeaderEnvironment,
): readonly SecurityHeader[] {
  const isDevelopment = environment.nodeEnv === "development";
  const supabaseOrigin = safeOrigin(environment.supabaseUrl, isDevelopment);
  const posthog = validPostHogOrigins(environment);
  const scriptSources = ["'self'", "'unsafe-inline'"];
  const connectSources = ["'self'"];
  const imageSources = [
    "'self'",
    "data:",
    "blob:",
    "https://*.basemaps.cartocdn.com",
  ];

  if (isDevelopment) scriptSources.push("'unsafe-eval'");
  if (supabaseOrigin) {
    connectSources.push(supabaseOrigin, websocketOrigin(supabaseOrigin));
    imageSources.push(supabaseOrigin);
  }
  if (posthog) {
    scriptSources.push(posthog.assetHost);
    connectSources.push(posthog.host, posthog.assetHost);
  }

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imageSources.join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${connectSources.join(" ")}`,
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'none'",
  ];
  if (!isDevelopment) directives.push("upgrade-insecure-requests");

  return [
    { key: "Content-Security-Policy", value: directives.join("; ") },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    {
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(self)",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
  ];
}
