import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateSession } from "./proxy";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUser: vi.fn(),
  getAuthenticatorAssuranceLevel: vi.fn(),
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
        return { auth: { getUser: mocks.getUser, mfa: { getAuthenticatorAssuranceLevel: mocks.getAuthenticatorAssuranceLevel } } };
      },
    );
    mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null });
  });

  it("keeps server-managed session cookies unavailable to browser JavaScript", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await updateSession(new NextRequest("http://localhost:3000/feed"));
    expect(mocks.createServerClient.mock.calls[0]?.[2].cookieOptions).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
  });

  it("redirects signed-out users away from product routes", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    const response = await updateSession(
      new NextRequest("http://localhost:3000/feed"),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login",
    );
  });

  it("preserves refreshed cookies and no-cache headers on redirects", async () => {
    mocks.getUser.mockImplementation(async () => {
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

      return { data: { user: { id: "user-id", email_confirmed_at: "2026-10-01" } } };
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
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    const response = await updateSession(
      new NextRequest("http://localhost:3000/feedback"),
    );

    expect(response.headers.get("location")).toBeNull();
  });

  it("fails closed when claim verification is unavailable", async () => {
    mocks.getUser.mockRejectedValue(new Error("Auth unavailable"));

    const response = await updateSession(
      new NextRequest("http://localhost:3000/feed"),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login",
    );
  });
  it("redirects an expired Server Action through the action protocol without forwarding its POST", async () => {
    mocks.getUser.mockImplementation(async () => {
      cookieMethods.setAll(
        [{ name: "sb-session", value: "", options: { httpOnly: true, path: "/", sameSite: "lax" } }],
        { "Cache-Control": "private, no-store" },
      );
      return { data: { user: null } };
    });
    const response = await updateSession(new NextRequest("http://localhost:3000/feed?draft=private", {
      method: "POST", headers: { "Next-Action": "action-id" },
    }));
    expect(response.status).toBe(303);
    expect(response.headers.get("x-action-redirect")).toBe("http://localhost:3000/login;replace");
    expect(response.headers.get("location")).toBeNull();
    expect(response.cookies.get("sb-session")?.value).toBe("");
    expect(response.cookies.get("sb-session")?.httpOnly).toBe(true);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("still requires the second factor for Server Actions", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-id", email_confirmed_at: "2026-10-01" } } });
    mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal2" }, error: null });
    const response = await updateSession(new NextRequest("http://localhost:3000/feed", {
      method: "POST", headers: { "Next-Action": "action-id" },
    }));
    expect(response.status).toBe(303);
    expect(response.headers.get("x-action-redirect")).toBe("http://localhost:3000/login/verify;replace");
  });

  it("uses a regular redirect for GET even with an action header", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    const response = await updateSession(new NextRequest("http://localhost:3000/feed", {
      headers: { "Next-Action": "action-id" },
    }));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    expect(response.headers.get("x-action-redirect")).toBeNull();
  });

});
