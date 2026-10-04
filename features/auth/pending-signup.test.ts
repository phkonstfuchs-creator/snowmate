import { describe, expect, it } from "vitest";
import { maskEmail, parsePendingSignup, pendingSignupCookieOptions } from "./pending-signup";

describe("pending sign-up", () => {
  it("accepts only something shaped like an address", () => {
    expect(parsePendingSignup("lena@example.com")).toBe("lena@example.com");
    expect(parsePendingSignup(undefined)).toBeNull();
    expect(parsePendingSignup("no-at-sign")).toBeNull();
    expect(parsePendingSignup("a b@example.com")).toBeNull();
    expect(parsePendingSignup(`${"a".repeat(250)}@x.at`)).toBeNull();
  });

  it("keeps the cookie away from scripts and short-lived", () => {
    expect(pendingSignupCookieOptions(true)).toEqual({ httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 3600 });
    expect(pendingSignupCookieOptions(false).secure).toBe(false);
  });

  it("shows only the first letter of the address", () => {
    expect(maskEmail("lena@example.com")).toBe("l•••@example.com");
  });
});
