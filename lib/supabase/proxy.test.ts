import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateSession } from "./proxy";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getClaims: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

vi.mock("./config", () => ({
  getSupabasePublicConfig: () => ({
    url: "https://project-ref.supabase.co",
    publishableKey: "sb_publishable_test",
    siteUrl: "http://localhost:3000",
  }),
}));

interface CookieMethods {
  setAll: (
    cookies: Array<{
      name: string;
      value: string;
      options: { httpOnly?: boolean; path?: string; sameSite?: "lax" };
    }>,
    headers: Record<string, string>,
  ) => void;
}

let cookieMethods: CookieMethods;

describe("updateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createServerClient.mockImplementation(
      (_url, _key, options: { cookies: CookieMethods }) => {
        cookieMethods = options.cookies;
        return { auth: { getClaims: mocks.getClaims } };
      },
    );
  });

  it("redirects signed-out users away from product routes", async () => {
    mocks.getClaims.mockResolvedValue({ data: null });

    const response = await updateSession(
      new NextRequest("http://localhost:3000/feed"),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login",
    );
  });

  it("preserves refreshed cookies and no-cache headers on redirects", async () => {
    mocks.getClaims.mockImplementation(async () => {
      cookieMethods.setAll(
        [
          {
            name: "sb-session",
            value: "refreshed",
            options: { httpOnly: true, path: "/", sameSite: "lax" },
          },
        ],
        {
          "Cache-Control":
            "private, no-cache, no-store, must-revalidate, max-age=0",
          Expires: "0",
          Pragma: "no-cache",
        },
      );

      return { data: { claims: { sub: "user-id" } } };
    });

    const response = await updateSession(
      new NextRequest("http://localhost:3000/login"),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/feed",
    );
    expect(response.cookies.get("sb-session")?.value).toBe("refreshed");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });

  it("does not protect similarly named public routes", async () => {
    mocks.getClaims.mockResolvedValue({ data: null });

    const response = await updateSession(
      new NextRequest("http://localhost:3000/feedback"),
    );

    expect(response.headers.get("location")).toBeNull();
  });

  it("fails closed when claim verification is unavailable", async () => {
    mocks.getClaims.mockRejectedValue(new Error("JWKS unavailable"));

    const response = await updateSession(
      new NextRequest("http://localhost:3000/feed"),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login",
    );
  });
});
