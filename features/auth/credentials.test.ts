import { describe, expect, it } from "vitest";
import {
  parseEmailCode,
  validateLoginCredentials,
  validateSignupCredentials,
} from "./credentials";

describe("validateLoginCredentials", () => {
  it("normalizes a valid email address", () => {
    const result = validateLoginCredentials({
      email: "  RIDER@Example.COM ",
      password: "existing-password",
    });

    expect(result).toEqual({
      success: true,
      data: {
        email: "rider@example.com",
        password: "existing-password",
      },
    });
  });

  it("rejects malformed and oversized credentials", () => {
    const result = validateLoginCredentials({
      email: "not-an-email",
      password: "x".repeat(129),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.email).toContain("v.emailInvalid");
      expect(result.fieldErrors.password).toContain("v.passwordTooLong");
    }
  });
});

describe("validateSignupCredentials", () => {
  it("accepts a strong password that is confirmed", () => {
    const result = validateSignupCredentials({
      email: "new.rider@example.com",
      password: "Pistl2026Pass",
      confirmPassword: "Pistl2026Pass",
    });

    expect(result.success).toBe(true);
  });

  it.each([
    ["too short", "Snow2026", "Snow2026"],
    ["no uppercase letter", "pistl2026pass", "pistl2026pass"],
    ["no lowercase letter", "PISTL2026PASS", "PISTL2026PASS"],
    ["no number", "PistlPassOnly", "PistlPassOnly"],
    ["different confirmation", "Pistl2026Pass", "Pistl2026Other"],
  ])("rejects %s", (_case, password, confirmPassword) => {
    const result = validateSignupCredentials({
      email: "new.rider@example.com",
      password,
      confirmPassword,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.fieldErrors.password ?? result.fieldErrors.confirmPassword,
      ).toBeDefined();
    }
  });

  it("returns guidance for a weak password", () => {
    const result = validateSignupCredentials({
      email: "new.rider@example.com",
      password: "short",
      confirmPassword: "short",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      /* Rule modules return message keys; the action translates them. */
      expect(result.fieldErrors.password).toContain("v.min|12");
      expect(result.fieldErrors.password).toContain("v.passwordUpper");
      expect(result.fieldErrors.password).toContain("v.passwordNumber");
    }
  });
});

describe("parseEmailCode", () => {
  it.each([["123456", "123456"], ["12 34 56", "123456"], ["1234567890", "1234567890"]])("accepts %s", (input, code) => {
    expect(parseEmailCode(input)).toBe(code);
  });
  it.each(["12345", "12345678901", "12a456", ""])("refuses %s", (input) => {
    expect(parseEmailCode(input)).toBeNull();
  });
});
