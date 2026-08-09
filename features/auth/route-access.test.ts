import { describe, expect, it } from "vitest";
import { getAuthRedirect } from "./route-access";

describe("getAuthRedirect", () => {
  it.each([
    "/feed",
    "/profile",
    "/map",
    "/crew",
    "/carpool",
    "/events",
    "/people",
  ])("protects %s from signed-out visitors", (pathname) => {
    expect(getAuthRedirect(pathname, false)).toBe("/login");
  });

  /* The clickable prototype deliberately sits outside the login and
     must not get caught by it. */
  it.each(["/demo", "/demo/events", "/demo/people"])(
    "keeps the prototype route %s public",
    (pathname) => {
      expect(getAuthRedirect(pathname, false)).toBeNull();
    },
  );

  it("protects nested product routes without matching similar public names", () => {
    expect(getAuthRedirect("/feed/ride/123", false)).toBe("/login");
    expect(getAuthRedirect("/feedback", false)).toBeNull();
  });

  it.each(["/", "/onboarding", "/login", "/signup", "/auth/confirm"])(
    "keeps public route %s available while signed out",
    (pathname) => {
      expect(getAuthRedirect(pathname, false)).toBeNull();
    },
  );

  it.each(["/login", "/signup"])(
    "keeps signed-in users out of %s",
    (pathname) => {
      expect(getAuthRedirect(pathname, true)).toBe("/feed");
    },
  );

  it("allows signed-in users to continue onboarding", () => {
    expect(getAuthRedirect("/onboarding", true)).toBeNull();
  });
});
