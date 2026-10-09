import { describe, expect, it } from "vitest";
import { createSecurityHeaders } from "./headers";

function headerValue(
  headers: ReturnType<typeof createSecurityHeaders>,
  key: string,
): string {
  return headers.find((header) => header.key === key)?.value ?? "";
}

describe("security headers", () => {
  it("allows only the configured Supabase and consent-gated EU analytics origins", () => {
    const headers = createSecurityHeaders({
      nodeEnv: "production",
      supabaseUrl: "https://example.supabase.co",
      posthogKey: "phc_public-project-key",
      posthogHost: "https://eu.i.posthog.com",
      posthogAssetHost: "https://eu-assets.i.posthog.com",
    });
    const policy = headerValue(headers, "Content-Security-Policy");

    expect(policy).toContain(
      "connect-src 'self' https://example.supabase.co wss://example.supabase.co https://eu.i.posthog.com https://eu-assets.i.posthog.com",
    );
    expect(policy).toContain(
      "script-src 'self' 'unsafe-inline' https://eu-assets.i.posthog.com",
    );
    expect(policy).toContain("upgrade-insecure-requests");
    expect(headerValue(headers, "Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=(self)",
    );
  });

  it("fails closed for malformed external origins", () => {
    const policy = headerValue(
      createSecurityHeaders({
        nodeEnv: "production",
        supabaseUrl: "javascript:alert(1)",
        posthogKey: "phc_public-project-key",
        posthogHost: "https://attacker.example",
        posthogAssetHost: "https://eu-assets.i.posthog.com/path",
      }),
      "Content-Security-Policy",
    );

    expect(policy).not.toContain("attacker.example");
    expect(policy).not.toContain("eu.i.posthog.com");
    expect(policy).not.toContain("eu-assets.i.posthog.com");
    expect(policy).not.toContain("javascript:");
  });

  it("permits loopback Supabase only in development", () => {
    const development = headerValue(
      createSecurityHeaders({
        nodeEnv: "development",
        supabaseUrl: "http://127.0.0.1:54321",
      }),
      "Content-Security-Policy",
    );
    const production = headerValue(
      createSecurityHeaders({
        nodeEnv: "production",
        supabaseUrl: "http://127.0.0.1:54321",
      }),
      "Content-Security-Policy",
    );

    expect(development).toContain(
      "http://127.0.0.1:54321 ws://127.0.0.1:54321",
    );
    expect(development).toContain("'unsafe-eval'");
    expect(production).not.toContain("127.0.0.1");
    expect(production).not.toContain("'unsafe-eval'");
  });
});
