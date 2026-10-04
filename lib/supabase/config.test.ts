import { describe, expect, it } from "vitest";
import { parseSupabasePublicConfig, resolveSiteUrl } from "./config";

const validConfig = {
  url: "https://project-ref.supabase.co",
  publishableKey: "sb_publishable_browser-safe-key",
  siteUrl: "http://localhost:3000",
};

describe("parseSupabasePublicConfig", () => {
  it("accepts hosted Supabase and local application URLs", () => {
    expect(parseSupabasePublicConfig(validConfig)).toEqual(validConfig);
  });

  it("names the broken variable instead of throwing a bare Invalid URL", () => {
    for (const url of ["", "not a url", '"https://project-ref.supabase.co"']) {
      expect(() => parseSupabasePublicConfig({ ...validConfig, url })).toThrow(
        /Supabase public configuration is invalid: url: .*\.env\.local/,
      );
    }
  });

  it("rejects missing values", () => {
    expect(() =>
      parseSupabasePublicConfig({
        ...validConfig,
        publishableKey: undefined,
      }),
    ).toThrow("Supabase public configuration is invalid");
  });

  it("rejects a secret key at the browser boundary", () => {
    expect(() =>
      parseSupabasePublicConfig({
        ...validConfig,
        publishableKey: "sb_secret_never-expose-this",
      }),
    ).toThrow("Supabase public configuration is invalid");
  });

  it("rejects insecure non-local URLs", () => {
    expect(() =>
      parseSupabasePublicConfig({
        ...validConfig,
        url: "http://example.com",
      }),
    ).toThrow("Supabase public configuration is invalid");
  });
});

describe("resolveSiteUrl", () => {
  it("keeps a real configured address", () => {
    expect(resolveSiteUrl("https://snowmate.app", { VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" }))
      .toBe("https://snowmate.app");
  });

  it("replaces a copied localhost with the production domain on Vercel", () => {
    expect(resolveSiteUrl("http://localhost:3000", { VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "snowmate-info.vercel.app" }))
      .toBe("https://snowmate-info.vercel.app");
    expect(resolveSiteUrl("http://localhost:3000", { VERCEL_ENV: "preview", VERCEL_URL: "snowmate-abc.vercel.app" }))
      .toBe("https://snowmate-abc.vercel.app");
  });

  it("stays on localhost in local development and ignores odd host values", () => {
    expect(resolveSiteUrl("http://localhost:3000", {})).toBe("http://localhost:3000");
    expect(resolveSiteUrl("http://localhost:3000", { VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "evil.example/path?x" }))
      .toBe("http://localhost:3000");
  });
});
