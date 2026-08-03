import { describe, expect, it } from "vitest";
import { parseSupabasePublicConfig } from "./config";

const validConfig = {
  url: "https://project-ref.supabase.co",
  publishableKey: "sb_publishable_browser-safe-key",
  siteUrl: "http://localhost:3000",
};

describe("parseSupabasePublicConfig", () => {
  it("accepts hosted Supabase and local application URLs", () => {
    expect(parseSupabasePublicConfig(validConfig)).toEqual(validConfig);
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
